# 🚀 Flash Loan Arbitrage Bot

A production-ready Ethereum flash loan arbitrage bot that automatically detects and executes profitable arbitrage opportunities between Uniswap V2 and Sushiswap using Aave V3 flash loans.

## 🎯 Features

- **Automated Arbitrage**: Detects price differences between DEXes and executes flash loans
- **Single Pair Focus**: Optimized for WETH/USDC pair (highest liquidity)
- **Gas Optimization**: Smart gas price monitoring and optimization
- **Risk Management**: Comprehensive validation and safety checks
- **Production Ready**: Robust error handling and monitoring
- **API Efficient**: Optimized for 24/7 operation within API limits

## 📊 Performance

- **API Usage**: ~60 requests/minute (optimized for 24/7 operation)
- **Monitoring**: 8-second intervals for maximum efficiency
- **Profit Threshold**: 0.003 ETH minimum profit
- **Flash Loan Amount**: 5 ETH (optimized for WETH/USDC)
- **Max Fee Limit**: 0.012 ETH

## 🏗️ Architecture

```
flashloan/
├── contracts/          # Smart contracts (Solidity)
├── bot/               # Node.js arbitrage bot
│   ├── src/
│   │   ├── services/  # Core services
│   │   ├── config/    # Configuration
│   │   └── utils/     # Utilities
│   └── logs/          # Bot logs
├── scripts/           # Deployment scripts
└── artifacts/         # Compiled contracts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Ethereum wallet with ETH for gas fees
- Alchemy API key

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd flashloan
```

### 2. Install Dependencies

```bash
# Install main dependencies
npm install

# Install bot dependencies
cd bot
npm install
cd ..
```

### 3. Environment Setup

```bash
# Copy environment files
cp deploy.env.example deploy.env
cp bot/config.example.js bot/src/config/config.js

# Edit configuration files with your settings
```

### 4. Configure Environment Variables

Edit `deploy.env`:

```env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ARBITRAGE_CONTRACT_ADDRESS=your_deployed_contract_address
```

Edit `bot/src/config/config.js`:

```javascript
// Update with your contract addresses and settings
```

### 5. Deploy Smart Contract

```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

### 6. Start Bot

```bash
cd bot
node src/index.js
```

## ⚙️ Configuration

### Bot Configuration (`bot/src/config/config.js`)

```javascript
// Arbitrage settings
arbitrage: {
  minProfit: "0.003",        // Minimum profit in ETH
  flashLoanAmount: "5",      // Flash loan amount in ETH
  maxFeeLimit: "0.012",      // Maximum fee limit in ETH
  maxSlippage: 0.3,          // Maximum slippage percentage
}

// Monitoring settings
monitoring: {
  checkInterval: 8000,       // Check interval in milliseconds
  gasCheckInterval: 60000,   // Gas price check interval
  maxApiRequestsPerMinute: 80, // API rate limit
}
```

### Environment Variables

| Variable                     | Description               | Required |
| ---------------------------- | ------------------------- | -------- |
| `MAINNET_RPC_URL`            | Alchemy RPC URL           | ✅       |
| `PRIVATE_KEY`                | Wallet private key        | ✅       |
| `ARBITRAGE_CONTRACT_ADDRESS` | Deployed contract address | ✅       |
| `MIN_PROFIT`                 | Minimum profit threshold  | ❌       |
| `FLASH_LOAN_AMOUNT`          | Flash loan amount         | ❌       |
| `MAX_GAS_PRICE`              | Maximum gas price         | ❌       |

## 🔧 Smart Contract

### Contract Addresses

- **Aave V3 Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- **Uniswap V2 Router**: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- **Sushiswap Router**: `0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F`

### Key Functions

- `arbitrage()`: Execute flash loan arbitrage
- `withdrawToken()`: Withdraw tokens from contract
- `withdrawETH()`: Withdraw ETH from contract

## 📈 Monitoring

### Logs

Bot logs are stored in `bot/logs/arbitrage-bot.log`:

```
[INFO] Starting Flash Loan Arbitrage Bot...
[INFO] ✅ Health checks completed!
[INFO] 📊 Monitoring pairs: ["WETH/USDC"]
[PERF] findArbitrageOpportunity took 1200ms
[ARBITRAGE] Executing arbitrage: WETH/USDC UNI_TO_SUSHI
```

### Statistics

Bot provides real-time statistics:

- Total executions
- Successful arbitrages
- Total profit
- Gas usage
- Error rates

## 🛡️ Security Features

- **Private Key Protection**: All sensitive data excluded from git
- **Gas Price Limits**: Prevents overpaying for gas
- **Slippage Protection**: Maximum slippage limits
- **Balance Validation**: Ensures sufficient funds
- **Error Recovery**: Automatic error handling and recovery

## 🔍 Troubleshooting

### Common Issues

1. **"ARBITRAGER_INSUFFICIENT_PROFIT"**

   - No profitable opportunities available
   - Normal behavior, bot will continue monitoring

2. **"Cannot get price for identical tokens"**

   - Fixed in latest version
   - WETH/WETH comparison removed

3. **High API usage**
   - Bot optimized for 60 requests/minute
   - Within Alchemy free tier limits

### Debug Mode

Enable debug logging:

```javascript
// In config.js
logging: {
  level: "debug";
}
```

## 📊 Performance Optimization

### API Efficiency

- **Single Pair**: WETH/USDC only (reduces API calls by 80%)
- **Smart Caching**: 8-second price cache
- **Rate Limiting**: 80 requests/minute limit
- **Block-Based**: Execute on new blocks only

### Gas Optimization

- **Dynamic Gas Pricing**: Real-time gas price monitoring
- **Gas Limits**: Maximum gas price protection
- **Fee Calculation**: Accurate fee estimation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred from using this bot.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs in `bot/logs/`
3. Open an issue on GitHub

---

**🚀 Happy Arbitraging!**
