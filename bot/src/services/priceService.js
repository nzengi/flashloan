const { ethers } = require("ethers");
const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");

class PriceService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      config.ethereum.rpcUrl
    );

    // Uniswap V2 Router ABI (simplified)
    this.uniswapRouterABI = [
      "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
      "function WETH() external pure returns (address)",
    ];

    // Sushiswap Router ABI (same as Uniswap V2)
    this.sushiswapRouterABI = [
      "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
      "function WETH() external pure returns (address)",
    ];

    this.uniswapRouter = new ethers.Contract(
      config.contracts.uniswapRouter,
      this.uniswapRouterABI,
      this.provider
    );

    this.sushiswapRouter = new ethers.Contract(
      config.contracts.sushiswapRouter,
      this.sushiswapRouterABI,
      this.provider
    );

    // Token decimals cache
    this.tokenDecimals = new Map();

    // Price cache with TTL - optimized for block time
    this.priceCache = new Map();
    this.cacheTTL = config.monitoring.priceCacheTTL || 12000; // 12 seconds (block time)

    // Rate limiting - optimized for API limits
    this.lastRequestTime = 0;
    this.minRequestInterval =
      60000 / (config.monitoring.maxApiRequestsPerMinute || 100); // Dynamic rate limiting
    this.requestCount = 0;
    this.requestResetTime = Date.now();
  }

  async getUniswapPrice(tokenIn, tokenOut, amountIn = null) {
    try {
      // Validate tokens
      if (!tokenIn || !tokenOut) {
        throw new Error("Token addresses cannot be undefined");
      }

      if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
        throw new Error("Cannot get price for identical tokens");
      }

      await this.rateLimit();

      const cacheKey = `uni_${tokenIn}_${tokenOut}_${amountIn || "default"}`;
      const cached = this.getCachedPrice(cacheKey);
      if (cached) return cached;

      const amount = amountIn || ethers.utils.parseEther("1");
      const path = [tokenIn, tokenOut];

      const amounts = await this.uniswapRouter.getAmountsOut(amount, path);
      const price = amounts[1];

      this.cachePrice(cacheKey, price);

      logger.debug(
        `Uniswap price for ${tokenIn} -> ${tokenOut}: ${ethers.utils.formatEther(
          price
        )}`
      );

      return price;
    } catch (error) {
      logger.error(
        `Error getting Uniswap price for ${tokenIn} -> ${tokenOut}`,
        error
      );
      throw error;
    }
  }

  async getSushiswapPrice(tokenIn, tokenOut, amountIn = null) {
    try {
      // Validate tokens
      if (!tokenIn || !tokenOut) {
        throw new Error("Token addresses cannot be undefined");
      }

      if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
        throw new Error("Cannot get price for identical tokens");
      }

      await this.rateLimit();

      const cacheKey = `sushi_${tokenIn}_${tokenOut}_${amountIn || "default"}`;
      const cached = this.getCachedPrice(cacheKey);
      if (cached) return cached;

      const amount = amountIn || ethers.utils.parseEther("1");
      const path = [tokenIn, tokenOut];

      const amounts = await this.sushiswapRouter.getAmountsOut(amount, path);
      const price = amounts[1];

      this.cachePrice(cacheKey, price);

      logger.debug(
        `Sushiswap price for ${tokenIn} -> ${tokenOut}: ${ethers.utils.formatEther(
          price
        )}`
      );

      return price;
    } catch (error) {
      logger.error(
        `Error getting Sushiswap price for ${tokenIn} -> ${tokenOut}`,
        error
      );
      throw error;
    }
  }

  async getPriceDifference(tokenIn, tokenOut) {
    try {
      const [uniPrice, sushiPrice] = await Promise.all([
        this.getUniswapPrice(tokenIn, tokenOut),
        this.getSushiswapPrice(tokenIn, tokenOut),
      ]);

      const difference = uniPrice.gt(sushiPrice)
        ? uniPrice.sub(sushiPrice)
        : sushiPrice.sub(uniPrice);

      const percentage = difference
        .mul(10000)
        .div(uniPrice.gt(sushiPrice) ? uniPrice : sushiPrice);

      return {
        uniswapPrice: uniPrice,
        sushiswapPrice: sushiPrice,
        difference,
        percentage: percentage.toNumber() / 100, // Convert to percentage
        betterDEX: uniPrice.gt(sushiPrice) ? "uniswap" : "sushiswap",
      };
    } catch (error) {
      logger.error(
        `Error getting price difference for ${tokenIn} -> ${tokenOut}`,
        error
      );
      throw error;
    }
  }

  async getTokenDecimals(tokenAddress) {
    if (this.tokenDecimals.has(tokenAddress)) {
      return this.tokenDecimals.get(tokenAddress);
    }

    try {
      const tokenABI = ["function decimals() view returns (uint8)"];
      const token = new ethers.Contract(tokenAddress, tokenABI, this.provider);
      const decimals = await token.decimals();
      this.tokenDecimals.set(tokenAddress, decimals);
      return decimals;
    } catch (error) {
      logger.error(`Error getting decimals for token ${tokenAddress}`, error);
      return 18; // Default to 18 decimals
    }
  }

  async getTokenSymbol(tokenAddress) {
    try {
      const tokenABI = ["function symbol() view returns (string)"];
      const token = new ethers.Contract(tokenAddress, tokenABI, this.provider);
      return await token.symbol();
    } catch (error) {
      logger.error(`Error getting symbol for token ${tokenAddress}`, error);
      return "UNKNOWN";
    }
  }

  async getTokenName(tokenAddress) {
    try {
      const tokenABI = ["function name() view returns (string)"];
      const token = new ethers.Contract(tokenAddress, tokenABI, this.provider);
      return await token.name();
    } catch (error) {
      logger.error(`Error getting name for token ${tokenAddress}`, error);
      return "Unknown Token";
    }
  }

  // Cache management
  getCachedPrice(key) {
    const cached = this.priceCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }
    return null;
  }

  cachePrice(key, price) {
    this.priceCache.set(key, {
      price,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.priceCache.clear();
  }

  // Rate limiting - optimized for API limits
  async rateLimit() {
    const now = Date.now();

    // Reset counter every minute
    if (now - this.requestResetTime > 60000) {
      this.requestCount = 0;
      this.requestResetTime = now;
    }

    // Check if we've exceeded the rate limit
    if (
      this.requestCount >= (config.monitoring.maxApiRequestsPerMinute || 100)
    ) {
      const waitTime = 60000 - (now - this.requestResetTime);
      logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.requestResetTime = Date.now();
    }

    // Basic interval limiting
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = now;
    this.requestCount++;
  }

  // Get all token prices for monitoring
  async getAllTokenPrices() {
    const prices = {};

    for (const [symbol, address] of Object.entries(config.tokens)) {
      try {
        // Skip WETH/WETH comparison
        if (symbol === "WETH") {
          continue;
        }

        const [uniPrice, sushiPrice] = await Promise.all([
          this.getUniswapPrice(config.tokens.WETH, address),
          this.getSushiswapPrice(config.tokens.WETH, address),
        ]);

        prices[symbol] = {
          uniswap: ethers.utils.formatEther(uniPrice),
          sushiswap: ethers.utils.formatEther(sushiPrice),
          difference: ethers.utils.formatEther(
            uniPrice.gt(sushiPrice)
              ? uniPrice.sub(sushiPrice)
              : sushiPrice.sub(uniPrice)
          ),
          percentage: uniPrice.gt(sushiPrice)
            ? uniPrice.sub(sushiPrice).mul(10000).div(uniPrice).toNumber() / 100
            : sushiPrice.sub(uniPrice).mul(10000).div(sushiPrice).toNumber() /
              100,
        };
      } catch (error) {
        logger.error(`Error getting prices for ${symbol}`, error);
        prices[symbol] = { error: error.message };
      }
    }

    return prices;
  }

  // Health check
  async healthCheck() {
    try {
      await this.getUniswapPrice(config.tokens.WETH, config.tokens.DAI);
      await this.getSushiswapPrice(config.tokens.WETH, config.tokens.DAI);
      return {
        status: "healthy",
        message: "Price service is working correctly",
      };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }
}

module.exports = new PriceService();
