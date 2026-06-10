const path = require("path");
const { BrowserWindow, app, ipcMain, globalShortcut } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0f1115",
    icon: path.join(__dirname, "assets", "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  globalShortcut.register("Escape", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      return;
    }
    win.webContents.send("global-escape");
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("set-fullscreen", (event, shouldBeFullscreen) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }

  win.setFullScreen(Boolean(shouldBeFullscreen));
});

ipcMain.on("set-chrome-bg", (event, hex) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }

  win.setBackgroundColor(typeof hex === "string" ? hex : "#0f1115");
});
