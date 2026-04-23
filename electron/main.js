const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const initSqlJs = require("sql.js");

const isDev = !app.isPackaged;
const APP_SECRET = "SPARDEX-CONTRACTOR-DESK-OFFLINE-LICENSE-V1";

let mainWindow;
let SQL;
let staticServer;
let staticServerPort = 0;

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function getConfigFile() {
  return path.join(app.getPath("userData"), "app-config.json");
}

function getDefaultDatabasePath() {
  return path.join(app.getPath("userData"), "contractor-desk.sqlite");
}

function getLicenseFile() {
  return path.join(app.getPath("userData"), "license.json");
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getMimeType(filePath) {
  const ext = String(path.extname(filePath || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function readConfig() {
  return readJson(getConfigFile(), {
    databasePath: getDefaultDatabasePath(),
  });
}

function writeConfig(nextConfig) {
  writeJson(getConfigFile(), nextConfig);
}

function getDatabasePath() {
  const config = readConfig();
  return config.databasePath || getDefaultDatabasePath();
}

async function ensureSql() {
  if (SQL) {
    return SQL;
  }

  SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  });
  return SQL;
}

function persistDatabase(db, dbPath) {
  ensureDir(path.dirname(dbPath));
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

async function openDatabase(dbPath = getDatabasePath()) {
  const SqlJs = await ensureSql();
  ensureDir(path.dirname(dbPath));

  let db;
  if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
    db = new SqlJs.Database(fs.readFileSync(dbPath));
  } else {
    db = new SqlJs.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  persistDatabase(db, dbPath);
  return { db, dbPath };
}

function readStateRow(db, key) {
  const stmt = db.prepare("SELECT value FROM app_state WHERE key = ?");
  stmt.bind([key]);
  let result = null;
  while (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result ? result.value : "";
}

function writeStateRow(db, key, value) {
  db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [key, value]);
}

function getDeviceFingerprint() {
  const raw = [
    app.getPath("userData"),
    process.env.COMPUTERNAME || "",
    process.env.USERNAME || "",
    process.platform,
    process.arch,
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16).toUpperCase();
}

function signPayload(payload) {
  return crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex");
}

function decodeLicenseKey(licenseKey) {
  const text = String(licenseKey || "").trim();
  if (!text.includes(".")) {
    return { valid: false, reason: "invalid_format" };
  }

  const [payloadEncoded, signature] = text.split(".");
  const expectedSignature = signPayload(payloadEncoded);
  if (signature !== expectedSignature) {
    return { valid: false, reason: "invalid_signature" };
  }

  try {
    const json = Buffer.from(payloadEncoded, "base64url").toString("utf8");
    const payload = JSON.parse(json);
    return { valid: true, payload };
  } catch (_error) {
    return { valid: false, reason: "invalid_payload" };
  }
}

function getLicenseStatus() {
  const stored = readJson(getLicenseFile(), null);
  if (!stored || !stored.licenseKey) {
    return {
      status: "demo",
      plan: "demo",
      isDemo: true,
      deviceFingerprint: getDeviceFingerprint(),
    };
  }

  const decoded = decodeLicenseKey(stored.licenseKey);
  if (!decoded.valid) {
    return {
      status: "invalid",
      reason: decoded.reason,
      plan: "demo",
      isDemo: true,
      deviceFingerprint: getDeviceFingerprint(),
    };
  }

  const payload = decoded.payload;
  const deviceFingerprint = getDeviceFingerprint();
  const today = new Date().toISOString().slice(0, 10);

  if (payload.deviceFingerprint && payload.deviceFingerprint !== deviceFingerprint) {
    return {
      status: "invalid",
      reason: "wrong_device",
      plan: "demo",
      isDemo: true,
      deviceFingerprint,
      payload,
    };
  }

  if (payload.expiresAt && payload.expiresAt < today) {
    return {
      status: "expired",
      reason: "expired",
      plan: "demo",
      isDemo: true,
      deviceFingerprint,
      payload,
    };
  }

  return {
    status: "active",
    plan: payload.plan || "demo",
    isDemo: (payload.plan || "demo") === "demo",
    deviceFingerprint,
    payload,
  };
}

function activateLicense(licenseKey) {
  const decoded = decodeLicenseKey(licenseKey);
  if (!decoded.valid) {
    return { ok: false, reason: decoded.reason };
  }

  const payload = decoded.payload;
  const deviceFingerprint = getDeviceFingerprint();
  const today = new Date().toISOString().slice(0, 10);

  if (payload.deviceFingerprint && payload.deviceFingerprint !== deviceFingerprint) {
    return { ok: false, reason: "wrong_device", deviceFingerprint };
  }

  if (payload.expiresAt && payload.expiresAt < today) {
    return { ok: false, reason: "expired" };
  }

  writeJson(getLicenseFile(), {
    licenseKey,
    activatedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    plan: payload.plan,
    expiresAt: payload.expiresAt || null,
    deviceFingerprint,
  };
}

async function ensureStaticServer() {
  if (staticServer && staticServerPort) {
    return staticServerPort;
  }

  const webApp = express();
  const buildDir = path.join(__dirname, "..", "build");
  webApp.get("/__local-file", (request, response) => {
    const rawPath = String(request.query.path || "");
    if (!rawPath) {
      response.status(400).end("missing_path");
      return;
    }

    const targetPath = path.normalize(rawPath);
    if (!fs.existsSync(targetPath)) {
      response.status(404).end("not_found");
      return;
    }

    response.type(getMimeType(targetPath));
    response.sendFile(targetPath);
  });
  webApp.use(express.static(buildDir));
  webApp.get("*", (_request, response) => {
    response.sendFile(path.join(buildDir, "index.html"));
  });

  await new Promise((resolve, reject) => {
    staticServer = webApp.listen(0, "127.0.0.1", () => {
      const address = staticServer.address();
      staticServerPort = typeof address === "object" && address ? address.port : 0;
      resolve();
    });
    staticServer.on("error", reject);
  });

  return staticServerPort;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: "إدارة ذرعات المقاولين",
    width: 1540,
    height: 960,
    minWidth: 1240,
    minHeight: 820,
    backgroundColor: "#eef4ff",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const targetUrl = isDev
    ? "http://localhost:3001"
    : `http://127.0.0.1:${await ensureStaticServer()}`;

  await mainWindow.loadURL(targetUrl);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();
  mainWindow.maximize();
  mainWindow.show();
  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle("إدارة ذرعات المقاولين");
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  await openDatabase();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
    staticServerPort = 0;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:load-data", async () => {
  const { db, dbPath } = await openDatabase();
  const raw = readStateRow(db, "app_data");
  db.close();
  return {
    ...(raw ? JSON.parse(raw) : {}),
    __meta: {
      databasePath: dbPath,
    },
  };
});

ipcMain.handle("app:save-data", async (_event, payload) => {
  const { __meta, ...cleanPayload } = payload || {};
  const { db, dbPath } = await openDatabase();
  writeStateRow(db, "app_data", JSON.stringify(cleanPayload));
  persistDatabase(db, dbPath);
  db.close();
  return { ok: true, databasePath: dbPath };
});

ipcMain.handle("app:get-info", async () => {
  return {
    userDataPath: app.getPath("userData"),
    databasePath: getDatabasePath(),
    configFile: getConfigFile(),
    licenseFile: getLicenseFile(),
    isDev,
    appName: "إدارة ذرعات المقاولين",
    productName: "Contractor Measurements",
    license: getLicenseStatus(),
  };
});

ipcMain.handle("app:pick-database-path", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "حدد مكان قاعدة البيانات",
    defaultPath: getDatabasePath(),
    filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }],
  });

  if (result.canceled || !result.filePath) {
    return "";
  }

  const nextConfig = readConfig();
  nextConfig.databasePath = result.filePath;
  writeConfig(nextConfig);
  await openDatabase(result.filePath);
  return result.filePath;
});

ipcMain.handle("app:pick-folder", async (_event, payload = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: payload.title || "اختر مجلداً",
    defaultPath: payload.defaultPath || app.getPath("documents"),
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || !result.filePaths[0]) {
    return "";
  }

  return result.filePaths[0];
});

ipcMain.handle("app:pick-pdf", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "اختر ملف PDF",
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (result.canceled || !result.filePaths[0]) {
    return "";
  }

  return result.filePaths[0];
});

ipcMain.handle("app:pick-image", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "اختر شعار المشروع",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });

  if (result.canceled || !result.filePaths[0]) {
    return "";
  }

  return result.filePaths[0];
});

ipcMain.handle("app:save-pdf", async (_event, { filePath, bytes }) => {
  if (!filePath || !bytes) {
    return { ok: false };
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return { ok: true, filePath };
});

ipcMain.handle("app:export-pdf", async (_event, { html, filePath }) => {
  if (!html || !filePath) {
    return { ok: false };
  }

  const pdfWindow = new BrowserWindow({
    show: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    });

    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, filePath };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  } finally {
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
});

ipcMain.handle("app:copy-file", async (_event, { sourcePath, targetPath }) => {
  if (!sourcePath || !targetPath) {
    return { ok: false };
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return { ok: true, targetPath };
});

ipcMain.handle("app:open-path", async (_event, targetPath) => {
  if (!targetPath) {
    return { ok: false };
  }

  await shell.openPath(targetPath);
  return { ok: true };
});

ipcMain.handle("app:get-file-data-url", async (_event, targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return "";
  }

  const bytes = fs.readFileSync(targetPath);
  const mimeType = getMimeType(targetPath);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
});

ipcMain.handle("app:get-file-url", async (_event, targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return "";
  }

  const port = await ensureStaticServer();
  return `http://127.0.0.1:${port}/__local-file?path=${encodeURIComponent(targetPath)}`;
});

ipcMain.handle("app:get-license-status", async () => getLicenseStatus());
ipcMain.handle("app:activate-license", async (_event, licenseKey) => activateLicense(licenseKey));
