@echo off
echo ========================================
echo FlashLoan Bot Windows Setup
echo ========================================

echo.
echo 1. Installing dependencies...
call npm install

echo.
echo 2. Setting up configuration...
if not exist "config.js" (
    copy "config.example.js" "config.js"
    echo Created config.js from example
) else (
    echo config.js already exists
)

echo.
echo 3. Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data

echo.
echo 4. Setup complete!
echo.
echo Next steps:
echo 1. Edit config.js with your settings
echo 2. Run: node src/index.js
echo.
pause 