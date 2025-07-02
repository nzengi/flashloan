const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");
const crypto = require("crypto");

// Initialize secure storage
const store = new Store({
  encryptionKey: crypto.randomBytes(32).toString("hex"),
  name: "flashloan-config",
});

let mainWindow;
let isQuitting = false;

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
    titleBarStyle: "default",
    show: false,
    frame: true,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/build/index.html"));
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Prevent window close on X button
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow.webContents.send("open-settings");
          },
        },
        { type: "separator" },
        {
          label: "Export Configuration",
          click: () => {
            exportConfiguration();
          },
        },
        {
          label: "Import Configuration",
          click: () => {
            importConfiguration();
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://github.com/nzengi/flashloan");
          },
        },
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About FlashLoan Bot",
              message: "FlashLoan Arbitrage Bot v1.0.0",
              detail:
                "A professional arbitrage bot for Ethereum DeFi protocols",
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for secure communication
ipcMain.handle("get-config", async () => {
  try {
    const config = store.get("config", {});
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-config", async (event, config) => {
  try {
    // Validate configuration
    if (!config.ethereum?.rpcUrl || !config.wallet?.privateKey) {
      throw new Error("Invalid configuration: Missing required fields");
    }

    store.set("config", config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-bot", async (event, config) => {
  try {
    // Save configuration first
    await store.set("config", config);

    // Start the arbitrage bot
    const { startArbitrageBot } = require("../services/botService");
    const result = await startArbitrageBot(config);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("stop-bot", async () => {
  try {
    const { stopArbitrageBot } = require("../services/botService");
    await stopArbitrageBot();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-bot-status", async () => {
  try {
    const { getBotStatus } = require("../services/botService");
    const status = await getBotStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-logs", async (event, options = {}) => {
  try {
    const { getLogs } = require("../services/logService");
    const logs = await getLogs(options);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Configuration import/export
async function exportConfiguration() {
  try {
    const config = store.get("config", {});
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Export Configuration",
      defaultPath: "flashloan-config.json",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (filePath) {
      const fs = require("fs");
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Success",
        message: "Configuration exported successfully!",
      });
    }
  } catch (error) {
    dialog.showErrorBox("Export Error", error.message);
  }
}

async function importConfiguration() {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Import Configuration",
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (filePaths.length > 0) {
      const fs = require("fs");
      const configData = fs.readFileSync(filePaths[0], "utf8");
      const config = JSON.parse(configData);

      // Validate imported configuration
      if (!config.ethereum?.rpcUrl || !config.wallet?.privateKey) {
        throw new Error("Invalid configuration file");
      }

      store.set("config", config);
      mainWindow.webContents.send("config-imported", config);

      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Success",
        message: "Configuration imported successfully!",
      });
    }
  } catch (error) {
    dialog.showErrorBox("Import Error", error.message);
  }
}

// Auto-updater
function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-available", () => {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message:
        "A new version is available. The app will restart to install the update.",
    });
  });

  autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    setupAutoUpdater();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

// Security: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
