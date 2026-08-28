import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("dusDesktop", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  requestMicrophoneAccess: () => ipcRenderer.invoke("dus:microphone-access") as Promise<boolean>,
});
