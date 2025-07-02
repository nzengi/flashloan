const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Configuration management
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),

  // Bot control
  startBot: (config) => ipcRenderer.invoke("start-bot", config),
  stopBot: () => ipcRenderer.invoke("stop-bot"),
  getBotStatus: () => ipcRenderer.invoke("get-bot-status"),

  // Logs
  getLogs: (options) => ipcRenderer.invoke("get-logs", options),

  // Events
  onConfigImported: (callback) => {
    ipcRenderer.on("config-imported", (event, config) => callback(config));
  },

  onOpenSettings: (callback) => {
    ipcRenderer.on("open-settings", () => callback());
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Security: Prevent access to Node.js APIs
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
