@echo off
echo ========================================
echo Flash Loan Arbitrage Bot - Windows Setup
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo After installation, restart this script.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed!
    echo Please download and install Git from: https://git-scm.com/
    echo After installation, restart this script.
    pause
    exit /b 1
) else (
    echo ✅ Git is installed
    git --version
)

echo.
echo Installing dependencies...
echo.

REM Install main dependencies
echo Installing main dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install main dependencies
    pause
    exit /b 1
)

REM Install bot dependencies
echo Installing bot dependencies...
cd bot
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install bot dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Setting up configuration files...
echo.

REM Copy configuration files
if not exist "deploy.env" (
    if exist "deploy.env.example" (
        copy "deploy.env.example" "deploy.env"
        echo ✅ Created deploy.env from example
    ) else (
        echo ⚠️ deploy.env.example not found, creating empty deploy.env
        echo # Add your environment variables here > deploy.env
    )
) else (
    echo ✅ deploy.env already exists
)

if not exist "bot\src\config\config.js" (
    if exist "bot\config.example.js" (
        copy "bot\config.example.js" "bot\src\config\config.js"
        echo ✅ Created bot config from example
    ) else (
        echo ⚠️ bot\config.example.js not found, creating empty config.js
        echo // Add your bot configuration here > bot\src\config\config.js
    )
) else (
    echo ✅ Bot config already exists
)

echo.
echo Creating necessary directories...
echo.

REM Create logs directory
if not exist "bot\logs" (
    mkdir "bot\logs"
    echo ✅ Created bot\logs directory
)

REM Create data directory
if not exist "bot\data" (
    mkdir "bot\data"
    echo ✅ Created bot\data directory
)

echo.
echo ========================================
echo ✅ Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit deploy.env with your settings
echo 2. Edit bot\src\config\config.js with your settings
echo 3. Deploy the smart contract
echo 4. Start the bot with: cd bot ^&^& node src\index.js
echo.
echo For detailed instructions, see README.md
echo.
pause 