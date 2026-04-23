const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("activationApi", {
  generateLicense: (payload) => ipcRenderer.invoke("activation:generate", payload),
  copyText: (text) => ipcRenderer.invoke("activation:copy-text", text),
});
