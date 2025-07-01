const { ethers } = require("hardhat");
require("dotenv").config({ path: "./deploy.env" });

async function main() {
  console.log("🚀 Deploying Flash Loan Arbitrage V3 Contract to MAINNET...");
  console.log(
    "⚠️  WARNING: This will deploy to Ethereum mainnet with real ETH!"
  );

  // Check environment variables
  if (!process.env.MAINNET_RPC_URL || !process.env.PRIVATE_KEY) {
    console.error("❌ Missing environment variables!");
    console.error("Please set MAINNET_RPC_URL and PRIVATE_KEY in deploy.env");
    process.exit(1);
  }

  // Contract addresses for mainnet - Aave V3
  const AAVE_V3_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

  console.log("📋 Contract addresses being used:");
  console.log(`  - Aave V3 Pool: ${AAVE_V3_POOL}`);
  console.log(`  - Uniswap Router: ${UNISWAP_ROUTER}`);
  console.log(`  - Sushiswap Router: ${SUSHISWAP_ROUTER}`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.utils.formatEther(await deployer.getBalance()),
    "ETH"
  );

  // Check account balance
  const balance = await deployer.getBalance();
  if (balance.lt(ethers.utils.parseEther("0.001"))) {
    console.error("❌ Insufficient balance for deployment!");
    console.error("Need at least 0.001 ETH for gas fees");
    process.exit(1);
  }

  console.log("🔧 Getting contract factory...");

  // Get the contract factory
  const ArbitragerV3 = await ethers.getContractFactory("ArbitragerV3");
  console.log("✅ Contract factory obtained");

  // 🚀 AUTO GAS CALCULATION
  console.log("⛽ Calculating optimal gas settings...");

  // Get current network gas price
  const provider = deployer.provider;
  const currentGasPrice = await provider.getGasPrice();

  // Add 10% buffer for faster confirmation but keep it minimal
  const optimalGasPrice = currentGasPrice.mul(110).div(100);

  console.log(
    `📊 Network gas price: ${ethers.utils.formatUnits(
      currentGasPrice,
      "gwei"
    )} gwei`
  );
  console.log(
    `🎯 Optimal gas price: ${ethers.utils.formatUnits(
      optimalGasPrice,
      "gwei"
    )} gwei`
  );

  // Estimate gas limit for the deployment
  const deploymentData = ArbitragerV3.interface.encodeDeploy([
    AAVE_V3_POOL,
    UNISWAP_ROUTER,
    SUSHISWAP_ROUTER,
  ]);

  let estimatedGasLimit;
  try {
    estimatedGasLimit = await provider.estimateGas({
      data: ArbitragerV3.bytecode + deploymentData.slice(2),
      from: deployer.address,
    });
    // Add 20% buffer for safety
    estimatedGasLimit = estimatedGasLimit.mul(120).div(100);
    console.log(`📊 Estimated gas limit: ${estimatedGasLimit.toString()}`);
  } catch (error) {
    console.log("⚠️ Gas estimation failed, using fallback limit");
    estimatedGasLimit = ethers.BigNumber.from("2500000");
  }

  // Calculate total cost
  const totalCost = optimalGasPrice.mul(estimatedGasLimit);
  console.log(
    `💸 Estimated deployment cost: ${ethers.utils.formatEther(totalCost)} ETH`
  );

  // 🚨 MAXIMUM FEE LIMIT CHECK
  const MAX_FEE_LIMIT = ethers.utils.parseEther("0.0025"); // 0.002 ETH limit

  if (totalCost.gt(MAX_FEE_LIMIT)) {
    console.error("❌ DEPLOYMENT CANCELLED - Fee too high!");
    console.error(
      `💸 Estimated cost: ${ethers.utils.formatEther(totalCost)} ETH`
    );
    console.error(
      `🚨 Maximum allowed: ${ethers.utils.formatEther(MAX_FEE_LIMIT)} ETH`
    );
    console.error(
      `📈 Current gas price: ${ethers.utils.formatUnits(
        currentGasPrice,
        "gwei"
      )} gwei`
    );
    console.error("💡 Suggestions:");
    console.error("   - Wait for lower gas prices");
    console.error("   - Try during off-peak hours (UTC 2-6 AM)");
    console.error("   - Monitor gas prices at https://etherscan.io/gastracker");
    process.exit(1);
  }

  console.log(
    `✅ Fee check passed! Cost: ${ethers.utils.formatEther(
      totalCost
    )} ETH (under ${ethers.utils.formatEther(MAX_FEE_LIMIT)} ETH limit)`
  );

  // Check if we have enough balance
  if (balance.lt(totalCost.mul(120).div(100))) {
    console.error("❌ Insufficient balance for deployment with buffer!");
    console.error(
      `Need at least ${ethers.utils.formatEther(
        totalCost.mul(120).div(100)
      )} ETH`
    );
    process.exit(1);
  }

  console.log("🚀 Deploying contract with optimal gas settings:");
  console.log(
    `  - Gas Price: ${ethers.utils.formatUnits(optimalGasPrice, "gwei")} gwei`
  );
  console.log(`  - Gas Limit: ${estimatedGasLimit.toString()}`);
  console.log(`  - Max Cost: ${ethers.utils.formatEther(totalCost)} ETH`);

  try {
    // Deploy the contract with auto-calculated gas settings
    console.log("🔧 Creating deployment transaction...");

    // Create deployment transaction data
    const deploymentData = ArbitragerV3.interface.encodeDeploy([
      AAVE_V3_POOL,
      UNISWAP_ROUTER,
      SUSHISWAP_ROUTER,
    ]);

    // Create transaction object
    const tx = {
      data: ArbitragerV3.bytecode + deploymentData.slice(2),
      gasLimit: estimatedGasLimit,
      gasPrice: optimalGasPrice,
    };

    console.log("📤 Sending deployment transaction...");

    // Send transaction manually
    const deploymentTx = await deployer.sendTransaction(tx);

    console.log("⏳ Waiting for deployment transaction to be mined...");
    console.log("🔗 Transaction hash:", deploymentTx.hash);

    // Wait for transaction to be mined
    const receipt = await deploymentTx.wait();

    // Get contract address from receipt
    const contractAddress = receipt.contractAddress;

    if (!contractAddress) {
      throw new Error("Contract address not found in transaction receipt");
    }

    console.log("✅ ArbitragerV3 deployed to:", contractAddress);
    console.log("🏭 Contract creation transaction:", deploymentTx.hash);

    // Get actual gas used
    const actualGasUsed = receipt.gasUsed;
    const actualCost = optimalGasPrice.mul(actualGasUsed);

    console.log("📊 Deployment Stats:");
    console.log(`  - Gas Used: ${actualGasUsed.toString()}`);
    console.log(
      `  - Gas Price: ${ethers.utils.formatUnits(optimalGasPrice, "gwei")} gwei`
    );
    console.log(`  - Actual Cost: ${ethers.utils.formatEther(actualCost)} ETH`);
    console.log(
      `  - Gas Efficiency: ${actualGasUsed
        .mul(100)
        .div(estimatedGasLimit)}% of estimate`
    );

    // Note: Manual verification can be done later on Etherscan
    console.log("📝 Manual verification info:");
    console.log("Constructor arguments:");
    console.log(`  - Aave V3 Pool: ${AAVE_V3_POOL}`);
    console.log(`  - Uniswap Router: ${UNISWAP_ROUTER}`);
    console.log(`  - Sushiswap Router: ${SUSHISWAP_ROUTER}`);

    console.log("🎉 Deployment completed successfully!");
    console.log("💡 Next steps:");
    console.log("   1. Verify the contract on Etherscan");
    console.log("   2. Test arbitrage with small amounts first");
    console.log("   3. Monitor for profitable opportunities");
    console.log("   4. Set up bot for automated execution");
  } catch (error) {
    console.error("❌ Deployment failed with error:", error.message);
    console.error("❌ Error code:", error.code);
    if (error.transactionHash) {
      console.error("❌ Transaction hash:", error.transactionHash);
    }

    // Additional debugging info
    console.error("🔍 Debugging info:");
    console.error(`  - AAVE_V3_POOL: ${AAVE_V3_POOL}`);
    console.error(`  - UNISWAP_ROUTER: ${UNISWAP_ROUTER}`);
    console.error(`  - SUSHISWAP_ROUTER: ${SUSHISWAP_ROUTER}`);
    console.error(`  - Deployer address: ${deployer.address}`);
    console.error(
      `  - Gas price: ${ethers.utils.formatUnits(optimalGasPrice, "gwei")} gwei`
    );
    console.error(`  - Gas limit: ${estimatedGasLimit.toString()}`);

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  });
