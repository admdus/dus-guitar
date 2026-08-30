import {
  app,
  BrowserWindow,
  Menu,
  nativeTheme,
  session,
  shell,
  systemPreferences,
  ipcMain,
} from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = path.join(__dirname, "..");
process.env.APP_ROOT = APP_ROOT;

const RENDERER_DIST = path.join(APP_ROOT, "dist");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isMac = process.platform === "darwin";

nativeTheme.themeSource = "dark";
app.setName("DUS Guitar");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
// Shared-mode WASAPI / Core Audio defaults to a large callback. 256 samples is
// ~5 ms at 48 kHz so the software guitar monitor stays playable.
app.commandLine.appendSwitch("audio-buffer-size", "256");
app.commandLine.appendSwitch("disable-features", "AudioServiceOutOfProcess");

let win: BrowserWindow | null = null;

function iconPath() {
  return path.join(APP_ROOT, VITE_DEV_SERVER_URL ? "public" : "dist", "icon.png");
}

async function ensureMicrophoneAccess(): Promise<boolean> {
  if (!isMac) return true;
  const status = systemPreferences.getMediaAccessStatus("microphone");
  if (status === "granted") return true;
  if (status === "denied" || status === "restricted") return false;
  try {
    return await systemPreferences.askForMediaAccess("microphone");
  } catch {
    return false;
  }
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    title: "DUS Guitar",
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b0d14",
    show: false,
    autoHideMenuBar: !isMac,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 18 } : undefined,
    acceptFirstMouse: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media" || permission === "mediaKeySystem" || permission === "fullscreen";
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media" || permission === "mediaKeySystem");
  });

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) void shell.openExternal(url);
    return { action: "deny" };
  });

  win.once("ready-to-show", () => {
    win?.show();
  });

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.handle("dus:microphone-access", () => ensureMicrophoneAccess());

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) {
      createWindow();
      return;
    }
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(() => {
    app.setAboutPanelOptions({
      applicationName: "DUS Guitar",
      applicationVersion: app.getVersion(),
      copyright: "Copyright © 2026 Adam Duś",
    });
    createMenu();
    createWindow();
  });

  app.on("window-all-closed", () => {
    if (!isMac) app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else win?.show();
  });
}
