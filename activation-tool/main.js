const { app, BrowserWindow, clipboard, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");

const APP_SECRET = "SPARDEX-CONTRACTOR-DESK-OFFLINE-LICENSE-V1";
const TOOL_TITLE = "مولد تفعيل إدارة ذرعات المقاولين";

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function toDateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function signPayload(payloadEncoded) {
  return crypto.createHmac("sha256", APP_SECRET).update(payloadEncoded).digest("hex");
}

function buildLicensePayload(input) {
  const today = new Date();
  const plan = String(input.plan || "demo").toLowerCase();
  let expiresAt = null;

  if (plan === "demo") {
    expiresAt = input.expiresAt || toDateOnly(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  } else if (plan === "monthly") {
    expiresAt = input.expiresAt || toDateOnly(addMonths(today, 1));
  } else if (plan === "yearly") {
    expiresAt = input.expiresAt || toDateOnly(addYears(today, 1));
  } else if (plan === "lifetime") {
    expiresAt = null;
  } else {
    throw new Error("نوع الرخصة غير مدعوم.");
  }

  return {
    plan,
    customerName: String(input.customerName || "").trim(),
    customerCode: String(input.customerCode || "").trim(),
    deviceFingerprint: String(input.deviceFingerprint || "").trim().toUpperCase(),
    issuedAt: toDateOnly(today),
    expiresAt,
    notes: String(input.notes || "").trim(),
  };
}

function buildLicenseKey(input) {
  const payload = buildLicensePayload(input);
  const payloadEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadEncoded);
  return {
    payload,
    licenseKey: `${payloadEncoded}.${signature}`,
  };
}

function createWindow() {
  const win = new BrowserWindow({
    title: TOOL_TITLE,
    width: 860,
    height: 760,
    minWidth: 760,
    minHeight: 700,
    backgroundColor: "#f4f8ff",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadURL(`file://${path.join(__dirname, "index.html")}`);
  win.once("ready-to-show", () => {
    win.show();
    win.setTitle(TOOL_TITLE);
  });
  win.webContents.on("did-finish-load", () => {
    win.setTitle(TOOL_TITLE);
  });
}

ipcMain.handle("activation:generate", async (_event, input) => {
  try {
    const result = buildLicenseKey(input || {});
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, message: error.message || "تعذر توليد كود التفعيل." };
  }
});

ipcMain.handle("activation:copy-text", async (_event, text) => {
  clipboard.writeText(String(text || ""));
  return { ok: true };
});

app.whenReady().then(() => {
  app.setName(TOOL_TITLE);
  createWindow();
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
