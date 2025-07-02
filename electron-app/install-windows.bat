@echo off
echo ========================================
echo FlashLoan Bot - Electron App Installer
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed!
    echo Please install npm with Node.js
    echo.
    pause
    exit /b 1
)

echo Node.js and npm are installed.
echo.

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Current Node.js version: %NODE_VERSION%
echo.

REM Install main dependencies
echo Installing main dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install main dependencies!
    pause
    exit /b 1
)
echo.

REM Install renderer dependencies
echo Installing renderer dependencies...
cd src\renderer
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install renderer dependencies!
    pause
    exit /b 1
)
cd ..\..
echo.

REM Create necessary directories
echo Creating directories...
if not exist "assets" mkdir assets
if not exist "logs" mkdir logs
echo.

REM Copy configuration example
echo Setting up configuration...
if not exist "config.json" (
    echo Creating default configuration file...
    echo { > config.json
    echo   "ethereum": { >> config.json
    echo     "rpcUrl": "", >> config.json
    echo     "wsUrl": "", >> config.json
    echo     "chainId": 1 >> config.json
    echo   }, >> config.json
    echo   "wallet": { >> config.json
    echo     "privateKey": "", >> config.json
    echo     "address": "" >> config.json
    echo   }, >> config.json
    echo   "contracts": { >> config.json
    echo     "arbitrageContract": "", >> config.json
    echo     "uniswapRouter": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", >> config.json
    echo     "sushiswapRouter": "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", >> config.json
    echo     "aaveLendingPool": "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8" >> config.json
    echo   } >> config.json
    echo } >> config.json
)
echo.

echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your settings in the app
echo 2. Run 'npm run dev' to start development
echo 3. Run 'npm run dist:win' to build for Windows
echo.
echo Press any key to exit...
pause >nul 