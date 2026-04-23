const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  loadData: () => ipcRenderer.invoke("app:load-data"),
  saveData: (payload) => ipcRenderer.invoke("app:save-data", payload),
  getInfo: () => ipcRenderer.invoke("app:get-info"),
  pickDatabasePath: () => ipcRenderer.invoke("app:pick-database-path"),
  pickFolder: (payload) => ipcRenderer.invoke("app:pick-folder", payload),
  pickPdf: () => ipcRenderer.invoke("app:pick-pdf"),
  pickImage: () => ipcRenderer.invoke("app:pick-image"),
  exportPdf: (payload) => ipcRenderer.invoke("app:export-pdf", payload),
  savePdf: (payload) => ipcRenderer.invoke("app:save-pdf", payload),
  copyFile: (payload) => ipcRenderer.invoke("app:copy-file", payload),
  openPath: (targetPath) => ipcRenderer.invoke("app:open-path", targetPath),
  getFileDataUrl: (targetPath) => ipcRenderer.invoke("app:get-file-data-url", targetPath),
  getFileUrl: (targetPath) => ipcRenderer.invoke("app:get-file-url", targetPath),
  getLicenseStatus: () => ipcRenderer.invoke("app:get-license-status"),
  activateLicense: (licenseKey) => ipcRenderer.invoke("app:activate-license", licenseKey),
});
