# FlashLoan Arbitrage Bot - Desktop Application

A professional desktop application for managing and monitoring flash loan arbitrage bots on Ethereum mainnet. Built with Electron and React.

## 🚀 Features

### Core Functionality

- **Real-time Bot Control**: Start, stop, and monitor arbitrage bot operations
- **Configuration Management**: Secure storage and validation of bot settings
- **Live Monitoring**: Real-time statistics, profit tracking, and health checks
- **Log Management**: Advanced log viewing with filtering and export capabilities
- **Trading Analytics**: Performance charts and trade history analysis

### Security Features

- **Encrypted Storage**: All sensitive data (private keys, API keys) are encrypted
- **Secure Communication**: IPC-based communication between main and renderer processes
- **Input Validation**: Comprehensive validation for all configuration inputs
- **Error Handling**: Robust error handling and recovery mechanisms

### User Interface

- **Modern Dark Theme**: Professional dark UI optimized for trading environments
- **Responsive Design**: Works on different screen sizes and resolutions
- **Real-time Updates**: Live data updates without page refreshes
- **Keyboard Shortcuts**: Power user shortcuts for quick navigation

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For cloning the repository
- **Windows 10/11**: For Windows builds
- **macOS 10.15+**: For macOS builds
- **Linux**: For Linux builds

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nzengi/flashloan.git
cd flashloan/electron-app
```

### 2. Install Dependencies

```bash
# Install main dependencies
npm install

# Install renderer dependencies
cd src/renderer
npm install
cd ../..
```

### 3. Development Setup

```bash
# Start development server
npm run dev
```

### 4. Build for Production

```bash
# Build for current platform
npm run dist

# Build for specific platform
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## ⚙️ Configuration

### Initial Setup

1. Launch the application
2. Navigate to **Configuration** tab
3. Fill in the required fields:
   - **Ethereum RPC URL**: Your Alchemy/Infura endpoint
   - **Wallet Private Key**: Your wallet's private key
   - **Wallet Address**: Your wallet's public address
   - **Contract Address**: Deployed arbitrage contract address

### Configuration Validation

The application validates all inputs:

- ✅ Ethereum address format validation
- ✅ Private key format validation
- ✅ RPC endpoint connectivity
- ✅ Contract ownership verification
- ✅ Business logic validation (profit vs fees)

### Security Best Practices

- 🔒 Use environment-specific API keys
- 🔒 Never share your private keys
- 🔒 Regularly update the application
- 🔒 Monitor for suspicious activity
- 🔒 Backup your configuration securely

## 🎯 Usage

### Starting the Bot

1. **Configure Settings**: Ensure all required fields are filled
2. **Validate Configuration**: Check that validation passes
3. **Start Bot**: Click the "Start Bot" button
4. **Monitor Status**: Watch the dashboard for real-time updates

### Monitoring Performance

- **Dashboard**: Overview of bot status and key metrics
- **Analytics**: Detailed performance charts and analysis
- **Logs**: Real-time log viewing with filtering options
- **Trading**: Manual trade execution and monitoring

### Stopping the Bot

- **Graceful Stop**: Use the "Stop Bot" button for clean shutdown
- **Emergency Stop**: Use Ctrl+Q or close the application
- **Auto-restart**: Configure automatic restart on errors

## 📊 Dashboard Features

### Real-time Metrics

- **Bot Status**: Running/Stopped with health indicators
- **Uptime**: Current session duration
- **Total Executions**: Number of arbitrage attempts
- **Successful Trades**: Profitable arbitrage executions
- **Total Profit**: Cumulative profit in ETH
- **Error Rate**: Percentage of failed attempts

### Service Health

- **Price Service**: Market data connectivity
- **Gas Service**: Gas price monitoring
- **Network Status**: Ethereum network connectivity
- **Contract Status**: Smart contract accessibility

### Recent Activity

- **Latest Trades**: Recent arbitrage executions
- **Error Log**: Recent errors and warnings
- **Performance Trends**: Profit/loss over time

## 🔧 Advanced Features

### Log Management

- **Real-time Logs**: Live log streaming
- **Filtering**: Filter by level, time, and search terms
- **Export**: Export logs in JSON, CSV, or TXT format
- **Statistics**: Log file statistics and analysis

### Configuration Management

- **Import/Export**: Backup and restore configurations
- **Validation**: Real-time configuration validation
- **Templates**: Pre-configured templates for different strategies
- **Version Control**: Track configuration changes

### Analytics

- **Performance Charts**: Profit/loss over time
- **Trade Analysis**: Detailed trade breakdown
- **Risk Metrics**: Risk assessment and monitoring
- **Strategy Optimization**: Performance optimization suggestions

## 🚨 Troubleshooting

### Common Issues

#### Bot Won't Start

- ✅ Check configuration validation
- ✅ Verify RPC endpoint connectivity
- ✅ Ensure sufficient wallet balance
- ✅ Confirm contract ownership

#### High Error Rate

- ✅ Check network connectivity
- ✅ Verify gas price settings
- ✅ Review profit thresholds
- ✅ Monitor market conditions

#### Performance Issues

- ✅ Check system resources
- ✅ Optimize configuration settings
- ✅ Update to latest version
- ✅ Review log files for errors

### Error Codes

- **E001**: Configuration validation failed
- **E002**: RPC connection error
- **E003**: Insufficient wallet balance
- **E004**: Contract access denied
- **E005**: Gas estimation failed

### Support

- 📧 Email: support@flashloanbot.com
- 💬 Discord: [FlashLoan Bot Community](https://discord.gg/flashloan)
- 📖 Documentation: [Wiki](https://github.com/nzengi/flashloan/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/nzengi/flashloan/issues)

## 🔄 Updates

### Auto-updates

The application supports automatic updates:

- ✅ Check for updates on startup
- ✅ Download updates in background
- ✅ Install updates automatically
- ✅ Restart with new version

### Manual Updates

1. Download latest release
2. Run installer
3. Follow installation prompts
4. Restart application

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/flashloan.git
cd flashloan/electron-app

# Install dependencies
npm install
cd src/renderer && npm install && cd ../..

# Start development
npm run dev
```

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features

## 📈 Roadmap

### Upcoming Features

- 🔮 Multi-chain support (Polygon, BSC, Arbitrum)
- 🔮 Advanced trading strategies
- 🔮 Machine learning optimization
- 🔮 Mobile companion app
- 🔮 Cloud synchronization
- 🔮 Advanced analytics dashboard

### Version History

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Enhanced analytics and monitoring
- **v1.2.0**: Multi-strategy support
- **v2.0.0**: Complete UI redesign and performance improvements

---

**⚠️ Disclaimer**: This software is for educational and research purposes. Use at your own risk. The developers are not responsible for any financial losses incurred while using this software.

**🔒 Security**: Always test with small amounts first and never risk more than you can afford to lose.
