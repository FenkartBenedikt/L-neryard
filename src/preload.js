const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  setChromeBackground(hex) {
    ipcRenderer.send("set-chrome-bg", hex);
  },
  setFullscreen(isFullscreen) {
    ipcRenderer.send("set-fullscreen", isFullscreen);
  },
  onGlobalEscape(callback) {
    ipcRenderer.on("global-escape", () => {
      if (typeof callback === "function") {
        callback();
      }
    });
  }
});
