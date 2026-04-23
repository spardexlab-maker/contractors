/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useMemo, useRef, useState } from "react";

const FALLBACK_KEY = "contractor-desk-data-v2";
const PROGRAM_LOGO_URL = `${process.env.PUBLIC_URL || ""}/assets/program-logo.png`;
const SPARDEX_LOGO_URL = `${process.env.PUBLIC_URL || ""}/assets/spardex-logo.png`;
const APP_NAME = "إدارة ذرعات المقاولين";
const DEFAULT_UNITS = ["م", "م2", "م3", "عدد", "l.m", "قطعي"];
const DEMO_CONTRACTOR_LIMIT = 2;
const ACTIVATION_EMAIL = "spardexlab@gmail.com";

const initialData = {
  settings: {
    companyName: "الشركة العامة",
    projectName: "مشروع جديد",
    projectSequence: "1",
    projectCode: "PRJ-001",
    logoPath: "",
    databasePath: "",
    filesPath: "C:\\ContractorDesk\\Files",
    newCopiesPath: "C:\\ContractorDesk\\IssuedCopies",
    showContractQuantityInMeasurement: false,
    showRemainingQtyInMeasurement: true,
    unitOptions: DEFAULT_UNITS,
    previousDueMode: "auto",
    superPassword: "12345",
  },
  contractors: [],
  measurements: [],
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function parseNumericInput(value) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEditableNumber(value, options = {}) {
  const { blankZero = false } = options;
  const numeric = Number(value || 0);
  if (blankZero && numeric === 0) {
    return "";
  }
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function blankIfZero(value) {
  return Number(value || 0) === 0 ? "" : value;
}

function textareaRows(value, width = 34) {
  const text = String(value || "");
  const lines = text.split("\n").reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil((line.length || 1) / width));
  }, 0);
  return Math.min(Math.max(lines, 1), 6);
}

function dateInput(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-CA");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "untitled";
}

function joinWindowsPath(...parts) {
  return parts
    .filter(Boolean)
    .join("\\")
    .replace(/\\\\+/g, "\\");
}

function fileExtension(filePath) {
  const match = String(filePath || "").match(/(\.[a-zA-Z0-9]+)$/);
  return match ? match[1] : "";
}

function normalizeUnitOptions(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim());

  const unique = Array.from(new Set(source.filter(Boolean)));
  return unique.length ? unique : DEFAULT_UNITS;
}

function toFileUrl(filePath) {
  const value = String(filePath || "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:|file:)/i.test(value)) {
    return value;
  }
  if (/^[a-zA-Z]:\\/.test(value)) {
    return encodeURI(`file:///${value.replace(/\\/g, "/")}`);
  }
  if (value.startsWith("\\\\")) {
    return encodeURI(`file:${value.replace(/\\/g, "/")}`);
  }
  return encodeURI(value);
}

async function resolveDesktopFileAsset(targetPath) {
  const value = String(targetPath || "").trim();
  if (!value) {
    return "";
  }

  if (window.desktopApi?.getFileUrl) {
    const servedUrl = await window.desktopApi.getFileUrl(value);
    if (servedUrl) {
      return servedUrl;
    }
  }

  if (window.desktopApi?.getFileDataUrl) {
    const dataUrl = await window.desktopApi.getFileDataUrl(value);
    if (dataUrl) {
      return dataUrl;
    }
  }

  return toFileUrl(value);
}

function resolveAssetUrl(assetPath) {
  const value = String(assetPath || "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:|file:)/i.test(value)) {
    return value;
  }
  if (typeof window !== "undefined" && window.location) {
    return new URL(value, `${window.location.origin}/`).href;
  }
  return value;
}

function withDemoData(source) {
  const base = JSON.parse(JSON.stringify(source));
  const demoContractorIds = new Set(
    (base.contractors || []).filter((item) => String(item.id || "").includes("demo")).map((item) => item.id)
  );

  base.contractors = (base.contractors || []).filter(
    (item) => !String(item.id || "").includes("demo")
  );
  base.measurements = (base.measurements || []).filter(
    (item) =>
      !String(item.id || "").includes("demo") && !demoContractorIds.has(item.contractorId)
  );

  return base;
}

function repairArabicText(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!/[ØÙÛÃ]/.test(value)) {
    return value;
  }
  try {
    return decodeURIComponent(escape(value));
  } catch (_error) {
    return value;
  }
}

function normalizeStoredData(source) {
  if (Array.isArray(source)) {
    return source.map(normalizeStoredData);
  }
  if (source && typeof source === "object") {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, normalizeStoredData(value)])
    );
  }
  return repairArabicText(source);
}

function normalizeStoredSettings(settings) {
  const next = { ...settings };

  ["companyName", "projectName"].forEach((key) => {
    const value = String(next[key] || "").trim();
    if (!value || /^[?\s]+$/.test(value) || /\uFFFD/.test(value)) {
      next[key] = initialData.settings[key];
    }
  });

  next.unitOptions = normalizeUnitOptions(next.unitOptions);
  next.showContractQuantityInMeasurement = Boolean(next.showContractQuantityInMeasurement);
  next.showRemainingQtyInMeasurement = Boolean(
    next.showRemainingQtyInMeasurement ?? initialData.settings.showRemainingQtyInMeasurement
  );

  return next;
}

function normalizeContractor(contractor) {
  return {
    ...contractor,
    useItemRetention: Boolean(contractor.useItemRetention),
    showProgressPercent: Boolean(contractor.showProgressPercent),
    contractAddendums: Array.isArray(contractor.contractAddendums)
      ? contractor.contractAddendums.map((item, index) => ({
          id: item.id || makeId(`addendum-${index + 1}`),
          title: item.title || `ملحق عقد ${index + 1}`,
          path: item.path || "",
        }))
      : [],
    items: Array.isArray(contractor.items)
      ? contractor.items.map((item) => ({
          ...item,
          retentionPercent: Number(item.retentionPercent || 0),
          progressPercent: Number(item.progressPercent || 0),
        }))
      : [],
  };
}

async function loadStoredData() {
  if (window.desktopApi?.loadData) {
    const stored = normalizeStoredData(await window.desktopApi.loadData());
    if (stored && stored.settings) {
      return withDemoData({
        ...stored,
        contractors: (stored.contractors || []).map(normalizeContractor),
        settings: normalizeStoredSettings({
          ...initialData.settings,
          ...stored.settings,
          databasePath: stored.__meta?.databasePath || stored.settings.databasePath || "",
        }),
      });
    }
  }

  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    const parsed = raw ? normalizeStoredData(JSON.parse(raw)) : null;
    return parsed
      ? withDemoData({
          ...parsed,
          contractors: (parsed.contractors || []).map(normalizeContractor),
          settings: normalizeStoredSettings({
            ...initialData.settings,
            ...parsed.settings,
          }),
        })
      : withDemoData(initialData);
  } catch (error) {
    return withDemoData(initialData);
  }
}

async function persistData(data) {
  if (window.desktopApi?.saveData) {
    await window.desktopApi.saveData(data);
  }
  window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + Number(row || 0), 0);
}

function enrichRow(row) {
  const previousQty = Number(row.previousQty || 0);
  const currentQty = Number(row.currentQty || 0);
  const unitPrice = Number(row.unitPrice || 0);
  const contractQuantity = Number(row.contractQuantity || 0);
  const totalQty = previousQty + currentQty;
  const retentionPercent = Number(row.retentionPercent || 0);
  const progressPercent = Number(row.progressPercent || 0);
  const remainingQty =
    contractQuantity > 0 ? Math.max(contractQuantity - totalQty, 0) : 0;

  return {
    ...row,
    previousQty,
    currentQty,
    unitPrice,
    contractQuantity,
    retentionPercent,
    progressPercent,
    totalQty,
    remainingQty,
    previousAmount: previousQty * unitPrice,
    currentAmount: currentQty * unitPrice,
    totalAmount: totalQty * unitPrice,
  };
}

function measurementSummary(measurement, contractor, previousPayable, settings) {
  const rows = measurement.rows.map(enrichRow);
  const totalDue = sumRows(rows.map((row) => row.totalAmount));
  const currentAmount = sumRows(rows.map((row) => row.currentAmount));
  const previousDue =
    settings.previousDueMode === "manual"
      ? Number(measurement.previousDueManual || 0)
      : Number(previousPayable || 0);
  const retentionAmount =
    measurement.type === "clearance"
      ? 0
      : contractor.useItemRetention
        ? sumRows(
            rows.map((row) => row.totalAmount * (Number(row.retentionPercent || 0) / 100))
          )
        : totalDue * (Number(contractor.retentionPercent || 0) / 100);
  const payableThisMeasurement = Math.max(totalDue - previousDue - retentionAmount, 0);

  return {
    rows,
    totalDue,
    currentAmount,
    previousDue,
    retentionAmount,
    payableThisMeasurement,
  };
}

function getCumulativePaidBefore(measurement) {
  if (!measurement) {
    return 0;
  }
  return Number(measurement.previousDue || 0) + Number(measurement.payableThisMeasurement || 0);
}

function getContractorMeasurements(measurements, contractorId) {
  return measurements.filter((item) => item.contractorId === contractorId);
}

function getContractorById(contractors, contractorId) {
  return contractors.find((item) => item.id === contractorId) || null;
}

function getLastIssuedMeasurement(measurements, contractorId) {
  const items = getContractorMeasurements(measurements, contractorId).filter(
    (item) => item.status === "issued" || item.status === "closed"
  );
  return items.length ? items[items.length - 1] : null;
}

function hasFinalClearanceMeasurement(measurements, contractorId) {
  return getContractorMeasurements(measurements, contractorId).some(
    (item) =>
      item.type === "clearance" && (item.status === "issued" || item.status === "closed")
  );
}

function buildMeasurementDraft(contractor, measurements, settings) {
  const last = getLastIssuedMeasurement(measurements, contractor.id);
  const lastRows = last ? last.rows : [];
  const rows = contractor.items.map((item) => {
    const previous = lastRows.find((row) => row.itemId === item.id);
    return {
      id: makeId("mrow"),
      itemId: item.id,
      title: item.title,
      unit: item.unit,
      contractQuantity: item.contractQuantity,
      unitPrice: item.unitPrice,
      retentionPercent: item.retentionPercent || 0,
      progressPercent: item.progressPercent || 0,
      isCustom: false,
      previousQty: previous ? Number(previous.previousQty || 0) + Number(previous.currentQty || 0) : 0,
      currentQty: 0,
      notes: "",
    };
  });

    return {
      id: "draft",
      contractorId: contractor.id,
      issueNo: getNextIssueNo(contractor, last, settings),
      type: "regular",
      status: "draft",
      date: dateInput(),
      pdfPath: "",
      signedPdfPath: "",
      handoverPdfPath: "",
      generalNotes: "",
      handoverIssued: false,
      previousDueManual: last ? getCumulativePaidBefore(last) : 0,
      rows,
      auditLog: [],
    };
}

function blankContractor() {
  return {
    id: "",
    name: "",
    contractNumber: "",
    workNumber: "",
    workName: "",
    retentionPercent: 10,
    contractPdfPath: "",
    contractAddendums: [],
    useItemRetention: false,
    showProgressPercent: false,
    items: [
      {
        id: makeId("item"),
        title: "",
        unit: DEFAULT_UNITS[2],
        contractQuantity: 0,
        unitPrice: 0,
        retentionPercent: 0,
        progressPercent: 0,
      },
    ],
    updatedAt: "",
  };
}

function measurementTypeLabel(type) {
  return type === "clearance" ? "ذرعة تصفية" : "ذرعة اعتيادية";
}

function measurementStatusLabel(measurement) {
  if (!measurement) {
    return "";
  }
  if (measurement.status === "closed" && measurement.type === "clearance") {
    return "مغلقة - تصفية";
  }
  if (measurement.status === "closed") {
    return "مغلقة";
  }
  if (measurement.status === "issued" && measurement.type === "clearance") {
    return "صادرة - تصفية";
  }
  if (measurement.status === "issued") {
    return "صادرة";
  }
  return "مسودة";
}

function signatureStatusLabel(measurement) {
  return measurement && measurement.signedPdfPath ? "مرفقة" : "غير مرفقة";
}

function getNextIssueNo(contractor, lastIssuedMeasurement, settings) {
  const basePrefix =
    sanitizeSegment(contractor.workNumber || contractor.contractNumber || settings.projectSequence || "1");

  if (!lastIssuedMeasurement || !lastIssuedMeasurement.issueNo) {
    return `${basePrefix}-1`;
  }

  const lastValue = String(lastIssuedMeasurement.issueNo).trim();
  const hyphenMatch = lastValue.match(/^(.*?)-(\d+)$/);
  if (hyphenMatch) {
    const number = Number(hyphenMatch[2] || 0) + 1;
    return `${basePrefix}-${number}`;
  }

  const numericMatch = lastValue.match(/(\d+)$/);
  if (numericMatch) {
    const next = Number(numericMatch[1] || 0) + 1;
    return `${basePrefix}-${next}`;
  }

  return `${basePrefix}-1`;
}

function buildStoragePaths(settings, contractor, measurement) {
  const projectDir = sanitizeSegment(
    `${settings.projectCode || "PROJECT"}-${settings.projectName || "Project"}`
  );
  const contractorDir = sanitizeSegment(
    contractor?.name || contractor?.contractNumber || contractor?.workNumber || "Contractor"
  );
  const measurementDir = sanitizeSegment(measurement?.issueNo || "measurement");
  const root = joinWindowsPath(settings.filesPath, contractorDir);
  const copiesRoot = joinWindowsPath(settings.newCopiesPath || settings.filesPath, contractorDir);

  return {
    root,
    contractsDir: joinWindowsPath(root, "Contracts"),
    measurementsDir: copiesRoot,
    signedDir: joinWindowsPath(root, "Signed"),
    handoverDir: joinWindowsPath(root, "Handover"),
    logosDir: joinWindowsPath(settings.filesPath, projectDir, "Assets"),
    measurementDir,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function buildPrintHtml({ settings, contractor, measurement, summary, logoSrc }) {
  const showContractQuantity = Boolean(settings.showContractQuantityInMeasurement);
  const showRemainingQty = Boolean(settings.showRemainingQtyInMeasurement);
  const showItemRetention = Boolean(contractor.useItemRetention);
  const showProgressPercent = Boolean(contractor.showProgressPercent);
  const retentionLabel =
    measurement.type === "clearance"
      ? "0%"
      : contractor.useItemRetention
        ? "حسب الفقرة"
        : `${contractor.retentionPercent || 0}%`;
  const addendumCount = (contractor.contractAddendums || []).filter((item) => item.path).length;
  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="شعار المشروع" class="logo" />`
    : `<div class="logo placeholder">شعار المشروع</div>`;
  const programLogoHtml = `<img src="${escapeHtml(resolveAssetUrl(PROGRAM_LOGO_URL))}" alt="${escapeHtml(APP_NAME)}" class="logo app-logo" />`;
  const rowsHtml = summary.rows
    .map(
      (row, index) => `
        <tr>
          <td>${escapeHtml(index + 1)}</td>
          <td class="text-right item-title">${escapeHtml(row.title)}</td>
          <td>${escapeHtml(row.unit)}</td>
          <td>${escapeHtml(money(row.unitPrice))}</td>
          ${showContractQuantity ? `<td>${escapeHtml(blankIfZero(row.contractQuantity))}</td>` : ""}
          ${showItemRetention ? `<td>${escapeHtml(row.retentionPercent)}</td>` : ""}
          <td>${escapeHtml(row.previousQty)}</td>
          <td>${escapeHtml(row.currentQty)}</td>
          ${showProgressPercent ? `<td>${escapeHtml(row.progressPercent)}</td>` : ""}
          <td>${escapeHtml(row.totalQty)}</td>
          ${showRemainingQty ? `<td>${escapeHtml(row.remainingQty)}</td>` : ""}
          <td>${escapeHtml(money(row.previousAmount))}</td>
          <td>${escapeHtml(money(row.currentAmount))}</td>
          <td>${escapeHtml(money(row.totalAmount))}</td>
          <td class="notes-cell">${escapeHtml(row.notes)}</td>
        </tr>
      `
    )
    .join("");

  return `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(measurement.issueNo)}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: A4 landscape; margin: 8mm 8mm 20mm 8mm; }
        body { font-family: Tahoma, Arial, sans-serif; margin: 0; color: #111; direction: rtl; background: #fff; }
        .sheet { width: 100%; }
        .top-zone { display:grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: start; margin-bottom: 6px; }
        .logos-stack { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .logo { width: 66px; height: 58px; object-fit: contain; border: 1px solid #8da5bf; border-radius: 8px; background:#fff; }
        .logo.placeholder { display:flex; align-items:center; justify-content:center; font-size:11px; color:#54657a; background:#f7fbff; }
        .company { text-align: center; }
        .company h1 { margin:0; font-size: 15px; color:#0f3f6d; }
        .company h2 { margin: 2px 0 0; font-size: 11px; color:#33485c; }
        .company p { margin: 2px 0 0; font-size: 10px; color:#53657c; }
        table { width:100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border:1px solid #9dadbb; padding:4px; font-size:10px; text-align:center; vertical-align: top; }
        th { background:#dfe9f3; color:#123b62; font-weight:700; }
        .header-table td { background:#fbfcfe; }
        .label { font-size: 9px; font-weight:700; color:#38536b; margin-bottom: 2px; }
        .value { font-size: 11px; font-weight:700; }
        .small-value { font-size: 10px; }
        .section-title, .summary-title { margin-top: 8px; font-size: 13px; font-weight:700; color:#7a4e15; }
        .text-right { text-align:right; }
        .item-title, .notes-cell { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; text-align:right; line-height: 1.5; }
        .item-title { min-width: 260px; }
        .notes-cell { min-width: 120px; }
        .summary-grid { display:flex; width:100%; gap:8px; margin-top:8px; padding-inline:2px; }
        .summary-box { flex:1 1 0; min-width:0; overflow:hidden; border:1px solid #8ea3b5; background:#fbfcfe; min-height:60px; padding:8px; }
        .summary-box .value { font-size: 16px; }
        .accounting-grid { display:flex; width:100%; gap:8px; margin-top:8px; padding-inline:2px; }
        .accounting-box { flex:1 1 0; min-width:0; overflow:hidden; border:1px solid #8ea3b5; background:#fbfcfe; min-height:70px; padding:8px; }
        .fill-box { margin-top:6px; min-height:32px; border:1px dashed #8ea3b5; background:#fff; }
        .print-footer { position: fixed; left: 8mm; right: 8mm; bottom: 6mm; }
        .signatures { display:grid; grid-template-columns: repeat(6, 1fr); gap:10px; }
        .signature-box { border-top: 1px solid #777; padding-top: 7px; text-align:center; min-height: 28px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="top-zone">
          <div class="logos-stack">${logoHtml}${programLogoHtml}</div>
          <div class="company">
            <h1>${escapeHtml(settings.companyName)}</h1>
            <h2>${escapeHtml(APP_NAME)}</h2>
            <p>ذرعة أعمال المتعهد</p>
          </div>
        </div>

        <table class="header-table">
          <tr>
            <td><div class="label">رقم الذرعة</div><div class="value">${escapeHtml(measurement.issueNo)}</div></td>
            <td><div class="label">نوع الذرعة</div><div class="value small-value">${escapeHtml(measurementTypeLabel(measurement.type))}</div></td>
            <td><div class="label">التاريخ</div><div class="value small-value">${escapeHtml(measurement.date)}</div></td>
            <td><div class="label">رمز المشروع</div><div class="value">${escapeHtml(settings.projectCode)}</div></td>
          </tr>
          <tr>
            <td><div class="label">اسم المتعهد</div><div class="value small-value">${escapeHtml(contractor.name)}</div></td>
            <td><div class="label">رقم العقد</div><div class="value">${escapeHtml(contractor.contractNumber)}</div></td>
            <td><div class="label">رقم ملاحق العقود</div><div class="value">${escapeHtml(addendumCount)}</div></td>
            <td><div class="label">رقم العمل</div><div class="value">${escapeHtml(contractor.workNumber)}</div></td>
          </tr>
          <tr>
            <td colspan="2"><div class="label">العمل</div><div class="value small-value">${escapeHtml(contractor.workName)}</div></td>
            <td><div class="label">التأمينات</div><div class="value">${escapeHtml(retentionLabel)}</div></td>
            <td><div class="label">حالة الذرعة</div><div class="value small-value">${escapeHtml(measurementStatusLabel(measurement))}</div></td>
          </tr>
        </table>

        <div class="section-title">تفاصيل فقرات الأعمال</div>
        <table>
          <thead>
            <tr>
              <th>ت</th>
              <th>اسم الفقرة</th>
              <th>الوحدة</th>
              <th>سعر الفقرة</th>
              ${showContractQuantity ? '<th>الكمية التعاقدية</th>' : ''}
              ${showItemRetention ? '<th>تأمينات الفقرة %</th>' : ''}
              <th>الكمية السابقة</th>
              <th>الإنجاز الحالي</th>
              ${showProgressPercent ? '<th>نسبة الإنجاز %</th>' : ''}
              <th>التراكمي الكلي</th>
              ${showRemainingQty ? '<th>المتبقي</th>' : ''}
              <th>مبلغ السابق</th>
              <th>مبلغ الحالي</th>
              <th>المبلغ الكلي</th>
              <th>الملاحظات</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="summary-title">الخلاصة المالية (دينار)</div>
        <div class="summary-grid">
          <div class="summary-box"><div class="label">مبلغ الإنجاز التراكمي الكلي</div><div class="value">${escapeHtml(money(summary.totalDue))}</div></div>
          <div class="summary-box"><div class="label">المبلغ الواجب دفعه سابقاً</div><div class="value">${escapeHtml(money(summary.previousDue))}</div></div>
          <div class="summary-box"><div class="label">مبلغ الإنجاز الحالي</div><div class="value">${escapeHtml(money(summary.currentAmount))}</div></div>
          <div class="summary-box"><div class="label">مبلغ التأمينات</div><div class="value">${escapeHtml(money(summary.retentionAmount))}</div></div>
          <div class="summary-box"><div class="label">المبلغ الواجب دفعه لهذه الذرعة</div><div class="value">${escapeHtml(money(summary.payableThisMeasurement))}</div></div>
        </div>

        <div class="summary-title">الخلاصة الحسابية</div>
        <div class="accounting-grid">
          <div class="accounting-box"><div class="label">المبلغ المستلم من قبل المتعهد</div><div class="fill-box"></div></div>
          <div class="accounting-box"><div class="label">المبلغ المتبقي</div><div class="fill-box"></div></div>
          <div class="accounting-box"><div class="label">الملاحظات</div><div class="fill-box"></div></div>
        </div>
      </div>
      <div class="print-footer">
        <div class="signatures">
          <div class="signature-box">المتعهد</div>
          <div class="signature-box">قسم تخطيط المشروع</div>
          <div class="signature-box">محاسب المشروع</div>
          <div class="signature-box">مدير المشروع</div>
          <div class="signature-box">المدقق الفني</div>
          <div class="signature-box">قسم المشاريع</div>
        </div>
      </div>
    </body>
  </html>`;
}
function App() {

  const [data, setData] = useState(null);
  const [view, setView] = useState("measurements");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState("draft");
  const [contractorForm, setContractorForm] = useState(blankContractor());
  const [measurementForm, setMeasurementForm] = useState(null);
  const [measurementEditable, setMeasurementEditable] = useState(true);
  const [message, setMessage] = useState("");
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [measurementSearch, setMeasurementSearch] = useState("");
  const [draftSeed, setDraftSeed] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedArchiveContractorId, setSelectedArchiveContractorId] = useState("");
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [projectLogoSrc, setProjectLogoSrc] = useState("");
  const [pendingAddendumId, setPendingAddendumId] = useState("");
  const contractPdfInputRef = useRef(null);
  const addendumPdfInputRef = useRef(null);
  const signedPdfInputRef = useRef(null);
  const handoverPdfInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    loadStoredData().then((loaded) => {
      if (!mounted) {
        return;
      }
      const next = loaded && loaded.settings ? loaded : initialData;
      setData(next);
      setSelectedContractorId(next.contractors[0] ? next.contractors[0].id : "");
      setSelectedArchiveContractorId(
        next.measurements[0]?.contractorId || next.contractors[0]?.id || ""
      );
    });

    if (window.desktopApi?.getInfo) {
      window.desktopApi.getInfo().then((info) => {
        if (mounted) {
          setDesktopInfo(info);
          setLicenseInfo(info.license || null);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (data) {
      persistData(data);
    }
  }, [data]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!desktopInfo?.databasePath || !data) {
      return;
    }
    if (data.settings.databasePath === desktopInfo.databasePath) {
      return;
    }
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        databasePath: desktopInfo.databasePath,
      },
    }));
  }, [desktopInfo, data]);

  const projectLogoPath = data?.settings?.logoPath || "";
  const isDemoMode = Boolean(!licenseInfo || licenseInfo.isDemo || licenseInfo.plan === "demo");
  const contractorLimitReached =
    isDemoMode && (data?.contractors?.length || 0) >= DEMO_CONTRACTOR_LIMIT;

  useEffect(() => {
    let active = true;

    async function loadProjectLogo() {
      const logoPath = projectLogoPath;
      if (!logoPath) {
        if (active) {
          setProjectLogoSrc("");
        }
        return;
      }

      if (window.desktopApi?.getFileDataUrl) {
        const dataUrl = await resolveDesktopFileAsset(logoPath);
        if (active) {
          setProjectLogoSrc(dataUrl || "");
        }
        return;
      }

      if (active) {
        setProjectLogoSrc(toFileUrl(logoPath));
      }
    }

    loadProjectLogo();
    return () => {
      active = false;
    };
  }, [projectLogoPath]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const selectedContractor = useMemo(() => {
    if (!data) {
      return null;
    }
    return data.contractors.find((item) => item.id === selectedContractorId) || null;
  }, [data, selectedContractorId]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!selectedContractor) {
      setContractorForm(blankContractor());
      setMeasurementForm(null);
      setMeasurementEditable(true);
      return;
    }

    setContractorForm(deepClone(selectedContractor));

    const measurement =
      selectedMeasurementId === "draft"
        ? hasFinalClearanceMeasurement(data.measurements, selectedContractor.id)
          ? getLastIssuedMeasurement(data.measurements, selectedContractor.id)
          : buildMeasurementDraft(selectedContractor, data.measurements, data.settings)
        : data.measurements.find((item) => item.id === selectedMeasurementId);

    if (measurement) {
      setMeasurementForm(deepClone(measurement));
      setMeasurementEditable(
        selectedMeasurementId === "draft"
          ? true
          : measurement.status === "issued"
            ? false
            : measurement.status !== "closed"
      );
    } else {
      setMeasurementForm(null);
      setMeasurementEditable(true);
    }
  }, [data, selectedContractor, selectedMeasurementId, draftSeed]);

  function flash(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  if (!data) {
    return <div className="loading-screen">جاري تحميل النظام...</div>;
  }

  const allArchivedMeasurements = data.measurements
    .map((measurement) => ({
      measurement,
      contractor: getContractorById(data.contractors, measurement.contractorId),
    }))
    .filter(({ contractor }) => contractor);
  const globalArchiveResults = allArchivedMeasurements.filter(({ measurement, contractor }) => {
    const search = archiveSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }
    return (
      String(contractor.name || "").toLowerCase().includes(search) ||
      String(contractor.contractNumber || "").toLowerCase().includes(search) ||
      String(measurement.issueNo || "").toLowerCase().includes(search)
    );
  });
  const filteredMeasurementContractors = data.contractors.filter((contractor) => {
    const search = measurementSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }
    return (
      String(contractor.name || "").toLowerCase().includes(search) ||
      String(contractor.contractNumber || "").toLowerCase().includes(search) ||
      String(contractor.workNumber || "").toLowerCase().includes(search)
    );
  });
  const archiveGroups = data.contractors
    .map((contractor) => ({
      contractor,
      measurements: globalArchiveResults
        .filter((entry) => entry.contractor.id === contractor.id)
        .map((entry) => entry.measurement),
    }))
    .filter((entry) => entry.measurements.length > 0);
  const selectedArchiveGroup =
    archiveGroups.find((entry) => entry.contractor.id === selectedArchiveContractorId) ||
    archiveGroups[0] ||
    null;
  const selectedArchiveMeasurement =
    selectedArchiveGroup?.measurements.find((item) => item.id === selectedMeasurementId) ||
    selectedArchiveGroup?.measurements[0] ||
    null;
  const contractorMeasurementHistory = selectedContractor
    ? getContractorMeasurements(data.measurements, selectedContractor.id)
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    : [];
  const lastMeasurement = selectedContractor
    ? getLastIssuedMeasurement(data.measurements, selectedContractor.id)
    : null;
  const lastPayable = lastMeasurement ? getCumulativePaidBefore(lastMeasurement) : 0;
  const summaryPreviousDueBase = measurementForm
    ? selectedMeasurementId === "draft"
      ? lastPayable
      : Number(measurementForm.previousDue || 0)
    : 0;
  const currentSummary =
    measurementForm && selectedContractor
      ? measurementSummary(
          measurementForm,
          selectedContractor,
          summaryPreviousDueBase,
          data.settings
        )
      : null;
  const measurementReady = Boolean(measurementForm && currentSummary);
  const unitOptions = normalizeUnitOptions(data.settings.unitOptions);

  function licenseStatusLabel(info) {
    if (!info) {
      return "نسخة تجريبية";
    }
    if (info.status === "active" && info.plan !== "demo") {
      return "مفعلة";
    }
    if (info.status === "active" && info.plan === "demo") {
      return "نسخة تجريبية";
    }
    if (info.status === "expired") {
      return "منتهية وعادت إلى النسخة التجريبية";
    }
    if (info.status === "invalid") {
      return "كود غير صالح والبرنامج يعمل كتجريبي";
    }
    return "نسخة تجريبية";
  }

  function licensePlanLabel(plan) {
    switch (String(plan || "").toLowerCase()) {
      case "monthly":
        return "شهري";
      case "yearly":
        return "سنوي";
      case "lifetime":
        return "مدى الحياة";
      case "demo":
      default:
        return "تجريبي";
    }
  }

  function licenseExpiryLabel(info) {
    const expiresAt = info?.payload?.expiresAt;
    if (!expiresAt) {
      return info?.plan === "lifetime" ? "لا يوجد انتهاء" : "-";
    }
    return expiresAt;
  }

  function updateSettings(field, value) {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, [field]: value },
    }));
  }

  function updateUnitOptions(value) {
    updateSettings("unitOptions", normalizeUnitOptions(value));
  }

  function updateContractor(field, value) {
    const numericFields = new Set(["retentionPercent"]);
    setContractorForm((current) => ({
      ...current,
      [field]: numericFields.has(field) ? parseNumericInput(value) : value,
    }));
  }

  function updateItem(itemId, field, value) {
    const numericFields = new Set([
      "contractQuantity",
      "unitPrice",
      "retentionPercent",
      "progressPercent",
    ]);
    setContractorForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: numericFields.has(field) ? parseNumericInput(value) : value,
            }
          : item
      ),
    }));
  }

  function addContractItem() {
    setContractorForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: makeId("item"),
          title: "",
          unit: unitOptions[0] || DEFAULT_UNITS[0],
          contractQuantity: 0,
          unitPrice: 0,
          retentionPercent: 0,
          progressPercent: 0,
        },
      ],
    }));
  }

  function addContractAddendum() {
    setContractorForm((current) => ({
      ...current,
      contractAddendums: [
        ...(current.contractAddendums || []),
        {
          id: makeId("addendum"),
          title: `ملحق عقد ${(current.contractAddendums || []).length + 1}`,
          path: "",
        },
      ],
    }));
  }

  function updateContractAddendum(addendumId, field, value) {
    setContractorForm((current) => ({
      ...current,
      contractAddendums: (current.contractAddendums || []).map((item) =>
        item.id === addendumId ? { ...item, [field]: value } : item
      ),
    }));
  }

  async function pickContractPdf() {
    if (window.desktopApi?.pickPdf) {
      const file = await window.desktopApi.pickPdf();
      if (file) {
        const managedPath = await storeManagedFile(file, "contract");
        updateContractor("contractPdfPath", managedPath);
      }
      return;
    }

    if (contractPdfInputRef.current) {
      contractPdfInputRef.current.click();
    }
  }

  async function pickContractAddendum(addendumId, index) {
    if (window.desktopApi?.pickPdf) {
      const file = await window.desktopApi.pickPdf();
      if (file) {
        const managedPath = await storeManagedFile(
          file,
          "contract",
          `contract-addendum-${index + 1}${fileExtension(file) || ".pdf"}`
        );
        updateContractAddendum(addendumId, "path", managedPath);
      }
      return;
    }

    setPendingAddendumId(addendumId);
    if (addendumPdfInputRef.current) {
      addendumPdfInputRef.current.click();
    }
  }

  async function pickLogo() {
    if (window.desktopApi?.pickImage) {
      const file = await window.desktopApi.pickImage();
      if (!file) {
        return;
      }
      const managedPath = await storeManagedFile(
        file,
        "logo",
        `project-logo${fileExtension(file) || ".png"}`
      );
      updateSettings("logoPath", managedPath);
      flash("تم حفظ شعار المشروع.");
      return;
    }

    if (logoInputRef.current) {
      logoInputRef.current.click();
    }
  }

  async function pickDatabasePath() {
    if (!window.desktopApi?.pickDatabasePath) {
      flash("اختيار مسار قاعدة البيانات يعمل في نسخة سطح المكتب فقط.");
      return;
    }
    const pickedPath = await window.desktopApi.pickDatabasePath();
    if (!pickedPath) {
      return;
    }
    updateSettings("databasePath", pickedPath);
    const info = await window.desktopApi.getInfo?.();
    if (info) {
      setDesktopInfo(info);
      setLicenseInfo(info.license || null);
    }
    flash("تم تحديث مسار قاعدة البيانات.");
  }

  async function pickFilesPath() {
    if (!window.desktopApi?.pickFolder) {
      flash("اختيار مسار حفظ الملفات يعمل في نسخة سطح المكتب فقط.");
      return;
    }

    const pickedPath = await window.desktopApi.pickFolder({
      title: "حدد مسار حفظ الملفات",
      defaultPath: data.settings.filesPath || "C:\\ContractorDesk\\Files",
    });

    if (!pickedPath) {
      return;
    }

    updateSettings("filesPath", pickedPath);
    flash("تم تحديث مسار حفظ الملفات.");
  }

  async function pickNewCopiesPath() {
    if (!window.desktopApi?.pickFolder) {
      flash("اختيار مسار حفظ النسخ الجديدة يعمل في نسخة سطح المكتب فقط.");
      return;
    }

    const pickedPath = await window.desktopApi.pickFolder({
      title: "حدد مسار حفظ النسخ الجديدة",
      defaultPath:
        data.settings.newCopiesPath || data.settings.filesPath || "C:\\ContractorDesk\\IssuedCopies",
    });

    if (!pickedPath) {
      return;
    }

    updateSettings("newCopiesPath", pickedPath);
    flash("تم تحديث مسار حفظ النسخ الجديدة.");
  }

  async function activateOfflineLicense() {
    if (!window.desktopApi?.activateLicense) {
      flash("التفعيل الأوفلاين يعمل في نسخة سطح المكتب فقط.");
      return;
    }
    const result = await window.desktopApi.activateLicense(licenseKeyInput);
    if (!result?.ok) {
      flash("فشل التفعيل. تحقق من كود التفعيل أو ربطه بهذا الجهاز.");
      return;
    }
    const status = await window.desktopApi.getLicenseStatus?.();
    setLicenseInfo(status || null);
    setLicenseKeyInput("");
    flash(`تم التفعيل بنجاح. نوع الرخصة: ${result.plan}`);
  }

  async function storeManagedFile(sourcePath, category, fileNameOverride) {
    if (!window.desktopApi?.copyFile) {
      return sourcePath;
    }

    const paths = buildStoragePaths(
      data.settings,
      selectedContractor || contractorForm || null,
      measurementForm || {}
    );
    let targetDir = paths.root;

    if (category === "contract") {
      targetDir = paths.contractsDir;
    } else if (category === "signed") {
      targetDir = paths.signedDir;
    } else if (category === "handover") {
      targetDir = paths.handoverDir;
    } else if (category === "logo") {
      targetDir = paths.logosDir;
    } else if (category === "measurement") {
      targetDir = paths.measurementsDir;
    }

    const sourceParts = String(sourcePath).split(/[/\\]/);
    const sourceName = sourceParts[sourceParts.length - 1] || "file";
    const targetName = fileNameOverride || sourceName;
    const targetPath = joinWindowsPath(targetDir, targetName);

    const result = await window.desktopApi.copyFile({
      sourcePath,
      targetPath,
    });

    return result && result.targetPath ? result.targetPath : sourcePath;
  }

  function saveContractor() {
    if (!contractorForm.name || !contractorForm.contractNumber || !contractorForm.workName) {
      flash("أدخل اسم المتعهد ورقم العقد والعمل قبل الحفظ.");
      return;
    }

    const isNewContractor = !contractorForm.id;
    if (isDemoMode && isNewContractor && data.contractors.length >= DEMO_CONTRACTOR_LIMIT) {
      flash(
        `هذه النسخة تجريبية وتسمح بإضافة ${DEMO_CONTRACTOR_LIMIT} مقاولين فقط. للتفعيل يرجى التواصل عبر ${ACTIVATION_EMAIL}`
      );
      return;
    }

    const contractor = {
      ...normalizeContractor(contractorForm),
      id: contractorForm.id || makeId("ctr"),
      updatedAt: new Date().toLocaleString("en-CA"),
    };

    setData((current) => {
      const exists = current.contractors.some((item) => item.id === contractor.id);
      return {
        ...current,
        contractors: exists
          ? current.contractors.map((item) => (item.id === contractor.id ? contractor : item))
          : [...current.contractors, contractor],
      };
    });
    setSelectedContractorId(contractor.id);
    flash("تم حفظ بيانات المتعهد والعقد.");
  }

  function newContractor() {
    if (contractorLimitReached) {
      flash(
        `وصلت النسخة التجريبية إلى الحد الأقصى (${DEMO_CONTRACTOR_LIMIT} مقاولين). للتفعيل يرجى التواصل عبر ${ACTIVATION_EMAIL}`
      );
      return;
    }
    setSelectedContractorId("");
    setSelectedMeasurementId("draft");
    setContractorForm(blankContractor());
  }

  function startNewMeasurement(contractorId = selectedContractorId) {
    const nextContractorId = contractorId || selectedContractorId;
    if (!nextContractorId) {
      flash("اختر متعهداً أولاً لبدء ذرعة جديدة.");
      return;
    }
    if (hasFinalClearanceMeasurement(data.measurements, nextContractorId)) {
      flash("تم إصدار ذرعة تصفية لهذا العقد أو رقم العمل، ولا يمكن إنشاء ذرعة جديدة بعد التصفية.");
      return;
    }
    setSelectedContractorId(nextContractorId);
    setSelectedMeasurementId("draft");
    setDraftSeed(Date.now());
    setView("measurements");
  }

  function openMeasurementRecord(measurementId, contractorId = selectedContractorId) {
    if (!measurementId || !contractorId) {
      return;
    }
    setSelectedContractorId(contractorId);
    setSelectedMeasurementId(measurementId);
    setDraftSeed(Date.now());
    setView("measurements");
  }

  function updateMeasurement(field, value) {
    const numericFields = new Set(["previousDueManual"]);
    setMeasurementForm((current) => ({
      ...current,
      [field]: numericFields.has(field) ? parseNumericInput(value) : value,
    }));
  }

  function updateMeasurementRow(rowId, field, value) {
    const numericFields = new Set([
      "unitPrice",
      "contractQuantity",
      "currentQty",
      "retentionPercent",
      "progressPercent",
    ]);
    const parsedValue = numericFields.has(field) ? parseNumericInput(value) : value;
    setMeasurementForm((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]:
                field === "currentQty"
                  ? Math.max(
                      0,
                      Math.min(
                        Number(parsedValue || 0),
                        Number(row.contractQuantity || 0) > 0
                          ? Math.max(
                              Number(row.contractQuantity || 0) - Number(row.previousQty || 0),
                              0
                            )
                          : Number(parsedValue || 0)
                      )
                    )
                  : parsedValue,
            }
          : row
      ),
    }));
  }

  function addMeasurementRowFromContract() {
    if (!selectedContractor) {
      return;
    }

    setMeasurementForm((current) => ({
      ...current,
      rows: [
        ...current.rows,
        {
          id: makeId("mrow"),
          itemId: "",
          title: "",
          unit: unitOptions[0] || DEFAULT_UNITS[0],
          contractQuantity: 0,
          unitPrice: 0,
          retentionPercent: 0,
          progressPercent: 0,
          isCustom: true,
          previousQty: 0,
          currentQty: 0,
          notes: "",
        },
      ],
    }));
  }

  function chooseContractItemForRow(rowId, itemId) {
    const item = selectedContractor.items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    const previousRow =
      lastMeasurement &&
      lastMeasurement.rows.find((row) => row.itemId === itemId);

    setMeasurementForm((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              itemId,
              title: item.title,
              unit: item.unit,
              contractQuantity: item.contractQuantity,
              unitPrice: item.unitPrice,
              retentionPercent: item.retentionPercent || 0,
              progressPercent: item.progressPercent || 0,
              isCustom: false,
              previousQty: previousRow
                ? Number(previousRow.previousQty || 0) + Number(previousRow.currentQty || 0)
                : 0,
            }
          : row
      ),
    }));
  }

  function isLockedMeasurement() {
    return (
      measurementForm &&
      (measurementForm.status === "closed" ||
        (measurementForm.status === "issued" && !measurementEditable))
    );
  }

  function enableMeasurementEditing() {
    if (!measurementForm || measurementForm.status !== "issued") {
      return;
    }
    setMeasurementEditable(true);
    flash("تم فتح الذرعة الصادرة للتعديل.");
  }

  function closeMeasurement() {
    if (!measurementForm || measurementForm.status === "closed") {
      return;
    }
    const confirmed = window.confirm(
      "سيتم إغلاق الذرعة باعتبارها موقعة ومعتمدة، وبعد الإغلاق لن يمكن تعديلها. هل تريد المتابعة؟"
    );
    if (!confirmed) {
      return;
    }
    saveMeasurement("closed");
  }

  function deleteIssuedMeasurement(measurementId) {
    const target =
      data.measurements.find((item) => item.id === measurementId) ||
      (measurementForm && measurementForm.id === measurementId ? measurementForm : null);
    if (!target || target.status !== "issued") {
      flash("يمكن حذف الذرعات الصادرة فقط.");
      return;
    }

    setData((current) => ({
      ...current,
      measurements: current.measurements.filter((item) => item.id !== measurementId),
    }));
    setSelectedMeasurementId("draft");
    setDraftSeed(Date.now());
    flash("تم حذف الذرعة الصادرة.");
  }

  function saveMeasurement(status) {
    if (!measurementForm || !selectedContractor || !currentSummary) {
      return;
    }

    const hasOverflow = currentSummary.rows.some(
      (row) => Number(row.contractQuantity || 0) > 0 && Number(row.totalQty || 0) > Number(row.contractQuantity || 0)
    );
    if (hasOverflow) {
      flash("توجد فقرة تجاوزت الكمية العقدية، صحح الكميات قبل الحفظ.");
      return;
    }

    const hasNegative = currentSummary.rows.some((row) => Number(row.currentQty || 0) < 0);
    if (hasNegative) {
      flash("لا يمكن حفظ ذرعة تحتوي على كمية سالبة.");
      return;
    }

    if (measurementForm.type === "clearance" && !measurementForm.handoverIssued) {
      flash("ذرعة التصفية تحتاج إلى تأكيد إصدار محضر الاستلام.");
      return;
    }

    if (measurementForm.type === "clearance" && !measurementForm.handoverPdfPath) {
      flash("ذرعة التصفية تحتاج إلى إرفاق ملف محضر الاستلام.");
      return;
    }

    const rowsWithIds = measurementForm.rows.map((row) => {
      if (row.itemId) {
        return row;
      }
      return {
        ...row,
        itemId: makeId("item"),
        isCustom: true,
      };
    });

    const newContractItems = rowsWithIds
      .filter((row) => row.itemId && !selectedContractor.items.some((item) => item.id === row.itemId))
      .map((row) => ({
        id: row.itemId,
        title: row.title,
        unit: row.unit,
        contractQuantity: Number(row.contractQuantity || 0),
        unitPrice: Number(row.unitPrice || 0),
        retentionPercent: Number(row.retentionPercent || 0),
        progressPercent: Number(row.progressPercent || 0),
      }));

    const payload = {
      ...measurementForm,
      id: measurementForm.id === "draft" ? makeId("mea") : measurementForm.id,
      contractorId: selectedContractor.id,
      status,
      rows: rowsWithIds,
      totalDue: currentSummary.totalDue,
      currentAmount: currentSummary.currentAmount,
      previousDue: currentSummary.previousDue,
      retentionAmount: currentSummary.retentionAmount,
      payableThisMeasurement: currentSummary.payableThisMeasurement,
      auditLog: [
        ...(measurementForm.auditLog || []),
        {
          id: makeId("audit"),
          action:
            status === "issued"
              ? "إصدار الذرعة"
              : status === "closed"
                ? "إغلاق الذرعة"
                : "حفظ الذرعة",
          at: new Date().toLocaleString("en-CA"),
        },
      ],
    };

    setData((current) => {
      const exists = current.measurements.some((item) => item.id === payload.id);
      return {
        ...current,
        contractors: current.contractors.map((item) =>
          item.id === selectedContractor.id
            ? {
                ...item,
                items: [...item.items, ...newContractItems],
              }
            : item
        ),
        measurements: exists
          ? current.measurements.map((item) => (item.id === payload.id ? payload : item))
          : [...current.measurements, payload],
      };
    });
    setSelectedMeasurementId(payload.id);
    setMeasurementEditable(status === "issued" ? false : status !== "closed");
    flash(
      status === "issued"
        ? "تم إصدار الذرعة وأرشفتها."
        : status === "closed"
          ? "تم إغلاق الذرعة نهائياً."
          : "تم حفظ الذرعة."
    );
  }

  function handleBrowserPdfPicked(event, target) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (target === "contract") {
      updateContractor("contractPdfPath", objectUrl);
      flash("تم اختيار ملف العقد.");
    }

    if (target === "addendum" && pendingAddendumId) {
      updateContractAddendum(pendingAddendumId, "path", objectUrl);
      setPendingAddendumId("");
      flash("تم اختيار ملف ملحق العقد.");
    }

    if (target === "signed") {
      setMeasurementForm((current) => ({ ...current, signedPdfPath: objectUrl }));
      flash("تم اختيار النسخة الموقعة.");
    }

    if (target === "handover") {
      setMeasurementForm((current) => ({ ...current, handoverPdfPath: objectUrl }));
      flash("تم اختيار محضر الاستلام.");
    }

    if (target === "logo") {
      updateSettings("logoPath", objectUrl);
      flash("تم اختيار شعار المشروع.");
    }

    event.target.value = "";
  }

  async function attachSignedPdf() {
    if (window.desktopApi?.pickPdf) {
      const file = await window.desktopApi.pickPdf();
      if (!file) {
        return;
      }
      const managedPath = await storeManagedFile(file, "signed");
      setMeasurementForm((current) => ({ ...current, signedPdfPath: managedPath }));
      flash("تم ربط النسخة الموقعة.");
      return;
    }

    if (signedPdfInputRef.current) {
      signedPdfInputRef.current.click();
    }
  }

  async function attachHandoverPdf() {
    if (window.desktopApi?.pickPdf) {
      const file = await window.desktopApi.pickPdf();
      if (!file) {
        return;
      }
      const managedPath = await storeManagedFile(
        file,
        "handover",
        `${sanitizeSegment(measurementForm?.issueNo || "handover")}-handover${fileExtension(file) || ".pdf"}`
      );
      setMeasurementForm((current) => ({ ...current, handoverPdfPath: managedPath }));
      flash("تم ربط محضر الاستلام.");
      return;
    }

    if (handoverPdfInputRef.current) {
      handoverPdfInputRef.current.click();
    }
  }

  async function exportMeasurementPdf() {
    if (!measurementForm || !selectedContractor || !currentSummary) {
      return;
    }

    const fileName = `${measurementForm.issueNo || "measurement"}.pdf`;
    const paths = buildStoragePaths(data.settings, selectedContractor, measurementForm);
    const filePath = window.desktopApi?.exportPdf
      ? joinWindowsPath(paths.measurementsDir, fileName)
      : fileName;
    const logoSrc = data.settings.logoPath
      ? await resolveDesktopFileAsset(data.settings.logoPath)
      : projectLogoSrc;

    const printHtml = buildPrintHtml({
      settings: data.settings,
      contractor: selectedContractor,
      measurement: measurementForm,
      summary: currentSummary,
      logoSrc,
    });

    if (window.desktopApi?.exportPdf) {
      const result = await window.desktopApi.exportPdf({
        html: printHtml,
        filePath,
      });

      if (!result?.ok) {
        flash("تعذر تصدير ملف PDF لهذه الذرعة.");
        return;
      }

      setMeasurementForm((current) => ({
        ...current,
        pdfPath: result.filePath || filePath,
      }));
      flash("تم تصدير ملف PDF وحفظه في مسار النسخ الجديدة.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) {
      flash("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 350);

    setMeasurementForm((current) => ({
      ...current,
      pdfPath: `Save as PDF -> ${fileName}`,
    }));
    flash("تم فتح نموذج عربي جاهز لحفظ PDF.");
  }

  function openLinkedFile(pathValue) {
    if (!pathValue) {
      flash("لا يوجد ملف مرتبط لفتحه.");
      return;
    }

    if (window.desktopApi?.openPath) {
      window.desktopApi.openPath(pathValue);
      return;
    }

    if (String(pathValue).startsWith("Save as PDF ->")) {
      flash("هذا تذكير بالحفظ فقط. افتح ملف الـ PDF الذي حفظته يدوياً من المتصفح.");
      return;
    }

    if (/^[a-zA-Z]:\\/.test(String(pathValue))) {
      flash("فتح المسارات المحلية المباشرة يحتاج نسخة سطح المكتب أو EXE.");
      return;
    }

    window.open(pathValue, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`desktop-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <input
        ref={contractPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden-input"
        onChange={(event) => handleBrowserPdfPicked(event, "contract")}
      />
      <input
        ref={addendumPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden-input"
        onChange={(event) => handleBrowserPdfPicked(event, "addendum")}
      />
      <input
        ref={signedPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden-input"
        onChange={(event) => handleBrowserPdfPicked(event, "signed")}
      />
      <input
        ref={handoverPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden-input"
        onChange={(event) => handleBrowserPdfPicked(event, "handover")}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="hidden-input"
        onChange={(event) => handleBrowserPdfPicked(event, "logo")}
      />
      <aside className="side-panel">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          aria-label={sidebarCollapsed ? "إظهار القائمة" : "إخفاء القائمة"}
          title={sidebarCollapsed ? "إظهار القائمة" : "إخفاء القائمة"}
        >
          {sidebarCollapsed ? "☰" : "✕"}
        </button>

        <div className="nav-block">
          <button type="button" className={view === "measurements" ? "tab active" : "tab"} onClick={() => setView("measurements")}>
            إصدار الذرعات
          </button>
          <button type="button" className={view === "contractors" ? "tab active" : "tab"} onClick={() => setView("contractors")}>
            المتعهدون والعقود
          </button>
          <button type="button" className={view === "archive" ? "tab active" : "tab"} onClick={() => setView("archive")}>
            الأرشيف
          </button>
          <button type="button" className={view === "settings" ? "tab active" : "tab"} onClick={() => setView("settings")}>
            الإعدادات الأولية
          </button>
        </div>

        <div className="meta-card">
          <div>
            <span>المشروع:</span>
            <strong>{data.settings.projectName}</strong>
          </div>
          <div>
            <span>رمز المشروع:</span>
            <strong>{data.settings.projectCode}</strong>
          </div>
        </div>

        <div className="meta-card developer-card">
          <div className="developer-brand">
            <img src={SPARDEX_LOGO_URL} alt="Spardex Lab" className="developer-logo-image" />
            <div>
              <span>Developed by</span>
              <strong>Spardex Lab</strong>
            </div>
          </div>
        </div>

      </aside>

      <main className="workspace">
        <header className="top-strip">
          <div className="top-strip-brand">
            <div className="top-strip-logos">
              {projectLogoSrc ? (
                <img src={projectLogoSrc} alt="شعار المشروع" className="top-strip-logo" />
              ) : (
                <div className="top-strip-logo placeholder">شعار المشروع</div>
              )}
              <img src={PROGRAM_LOGO_URL} alt={APP_NAME} className="top-strip-logo program" />
            </div>
            <div className="top-strip-copy">
              <h2>{data.settings.companyName}</h2>
              <p>{APP_NAME}</p>
              <span>{data.settings.projectName}</span>
            </div>
          </div>
          {message ? <div className="notice">{message}</div> : null}
        </header>

        {view === "settings" ? (
          <section className="panel">
            <div className="panel-head">
                <h3>الإعدادات الأولية</h3>
                <span>هنا يتم تعريف بيانات المشروع الأساسية ومسارات الحفظ والتفعيل.</span>
            </div>

            <div className="form-grid three">
              <label>
                اسم الشركة
                <input
                  value={data.settings.companyName}
                  onChange={(event) => updateSettings("companyName", event.target.value)}
                />
              </label>
              <label>
                اسم المشروع
                <input
                  value={data.settings.projectName}
                  onChange={(event) => updateSettings("projectName", event.target.value)}
                />
              </label>
              <label>
                رمز المشروع
                <input
                  value={data.settings.projectCode}
                  onChange={(event) => updateSettings("projectCode", event.target.value)}
                />
              </label>
              <label>
                مسار قاعدة البيانات
                <div className="inline-field">
                  <input value={data.settings.databasePath || ""} readOnly />
                  <button type="button" className="ghost small" onClick={pickDatabasePath}>
                    اختيار
                  </button>
                </div>
              </label>
              <label>
                مسار حفظ الملفات
                <div className="inline-field">
                  <input
                    value={data.settings.filesPath}
                    onChange={(event) => updateSettings("filesPath", event.target.value)}
                  />
                  <button type="button" className="ghost small" onClick={pickFilesPath}>
                    اختيار
                  </button>
                </div>
              </label>
              <label>
                مسار حفظ النسخ الجديدة
                <div className="inline-field">
                  <input
                    value={data.settings.newCopiesPath || ""}
                    onChange={(event) => updateSettings("newCopiesPath", event.target.value)}
                  />
                  <button type="button" className="ghost small" onClick={pickNewCopiesPath}>
                    اختيار
                  </button>
                </div>
              </label>
              <label>
                شعار المشروع
                <div className="inline-field">
                  <input value={data.settings.logoPath || ""} readOnly />
                  <button type="button" className="ghost small" onClick={pickLogo}>
                    اختيار
                  </button>
                </div>
              </label>
              <label>
                طريقة المبلغ الواجب دفعه سابقاً
                <select
                  value={data.settings.previousDueMode}
                  onChange={(event) => updateSettings("previousDueMode", event.target.value)}
                >
                  <option value="auto">تلقائي من آخر ذرعة</option>
                  <option value="manual">يدوي داخل الذرعة</option>
                </select>
              </label>
              <label>
                كلمة مرور السوبر أدمن
                <input
                  type="password"
                  value={data.settings.superPassword}
                  onChange={(event) => updateSettings("superPassword", event.target.value)}
                />
              </label>
              <label>
                الوحدات المعتمدة
                <textarea
                  rows={4}
                  value={unitOptions.join("\n")}
                  onChange={(event) => updateUnitOptions(event.target.value)}
                  placeholder={"م\nم2\nم3\nعدد\nl.m\nقطعي"}
                />
              </label>
              <label className="checkbox-field">
                <span>إظهار الكمية التعاقدية في شاشة الذرعة</span>
                <input
                  type="checkbox"
                  checked={data.settings.showContractQuantityInMeasurement}
                  onChange={(event) =>
                    updateSettings("showContractQuantityInMeasurement", event.target.checked)
                  }
                />
              </label>
              <label className="checkbox-field">
                <span>إظهار عمود الكمية المتبقية</span>
                <input
                  type="checkbox"
                  checked={data.settings.showRemainingQtyInMeasurement}
                  onChange={(event) =>
                    updateSettings("showRemainingQtyInMeasurement", event.target.checked)
                  }
                />
              </label>
            </div>

            <div className="panel-head secondary">
                <h4>التفعيل الأوفلاين</h4>
              <span>
                {licenseInfo
                  ? `الحالة: ${licenseStatusLabel(licenseInfo)} / الخطة: ${licensePlanLabel(licenseInfo.plan)}`
                  : "البرنامج يعمل حالياً كنسخة تجريبية."}
              </span>
            </div>

            <div className="empty-note">
              النسخة الافتراضية تعمل كـ Demo وتسمح بإضافة {DEMO_CONTRACTOR_LIMIT} مقاولين فقط.
              للتفعيل والتوسعة يرجى التواصل عبر {ACTIVATION_EMAIL}
            </div>

            <div className="form-grid three">
              <label>
                بصمة الجهاز
                <input value={licenseInfo?.deviceFingerprint || ""} readOnly />
              </label>
              <label>
                نوع الرخصة
                <input value={licensePlanLabel(licenseInfo?.plan)} readOnly />
              </label>
              <label>
                انتهاء الرخصة
                <input value={licenseExpiryLabel(licenseInfo)} readOnly />
              </label>
            </div>

            <div className="form-grid three">
              <label>
                كود التفعيل
                <input
                  value={licenseKeyInput}
                  onChange={(event) => setLicenseKeyInput(event.target.value)}
                  placeholder="ألصق كود التفعيل هنا"
                />
              </label>
              <label>
                تفعيل أوفلاين
                <button type="button" className="primary" onClick={activateOfflineLicense}>
                  تفعيل الرخصة
                </button>
              </label>
            </div>
          </section>
        ) : null}

        {view === "contractors" ? (
          <div className="two-column">
            <section className="panel">
              <div className="panel-head">
                <h3>قائمة المتعهدين</h3>
                <button
                  type="button"
                  className="ghost"
                  onClick={newContractor}
                  disabled={contractorLimitReached}
                >
                  متعهد جديد
                </button>
              </div>

              {contractorLimitReached ? (
                <div className="warning-box">
                  النسخة التجريبية وصلت إلى الحد الأقصى للمقاولين ({DEMO_CONTRACTOR_LIMIT}).
                  للتفعيل يرجى التواصل عبر {ACTIVATION_EMAIL}
                </div>
              ) : null}

              <div className="list-stack names-only-list">
                {data.contractors.map((contractor) => (
                  <button
                    type="button"
                    key={contractor.id}
                    className={
                      contractor.id === selectedContractorId ? "list-card active" : "list-card"
                    }
                    onClick={() => {
                      setSelectedContractorId(contractor.id);
                      setSelectedMeasurementId("draft");
                    }}
                  >
                    <strong>{contractor.name}</strong>
                    <span>{contractor.contractNumber} / {contractor.workNumber}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>بيانات المتعهد والعقد</h3>
                <button type="button" className="primary" onClick={saveContractor}>
                  حفظ البيانات
                </button>
              </div>

              <div className="form-grid three">
                <label>
                  اسم المتعهد
                  <input
                    value={contractorForm.name}
                    onChange={(event) => updateContractor("name", event.target.value)}
                  />
                </label>
                <label>
                  رقم العقد
                  <input
                    value={contractorForm.contractNumber}
                    onChange={(event) =>
                      updateContractor("contractNumber", event.target.value)
                    }
                  />
                </label>
                <label>
                  رقم العمل
                  <input
                    value={contractorForm.workNumber}
                    onChange={(event) => updateContractor("workNumber", event.target.value)}
                  />
                </label>
                <label>
                  العمل
                  <input
                    value={contractorForm.workName}
                    onChange={(event) => updateContractor("workName", event.target.value)}
                  />
                </label>
                <label>
                  تأمينات العقد %
                  <input
                    type="text"
                    inputMode="decimal"
                    className="number-input"
                    value={formatEditableNumber(contractorForm.retentionPercent)}
                    onChange={(event) =>
                      updateContractor("retentionPercent", event.target.value)
                    }
                  />
                </label>
                <label>
                  عقد PDF اختياري
                  <div className="inline-field">
                    <input value={contractorForm.contractPdfPath} readOnly />
                    <div className="stack-inline">
                      <button type="button" className="ghost small" onClick={pickContractPdf}>
                        اختيار
                      </button>
                      <button
                        className="ghost small"
                        type="button"
                        onClick={() => openLinkedFile(contractorForm.contractPdfPath)}
                      >
                        فتح
                      </button>
                    </div>
                  </div>
                </label>
                <label className="checkbox-field">
                  <span>احتساب التأمينات لكل فقرة</span>
                  <input
                    type="checkbox"
                    checked={Boolean(contractorForm.useItemRetention)}
                    onChange={(event) =>
                      updateContractor("useItemRetention", event.target.checked)
                    }
                  />
                </label>
                <label className="checkbox-field">
                  <span>إظهار نسبة الإنجاز في الذرعة</span>
                  <input
                    type="checkbox"
                    checked={Boolean(contractorForm.showProgressPercent)}
                    onChange={(event) =>
                      updateContractor("showProgressPercent", event.target.checked)
                    }
                  />
                </label>
              </div>

              <div className="panel-head secondary">
                <h4>العقد وملحقاته</h4>
                <button type="button" className="ghost" onClick={addContractAddendum}>
                  + إضافة ملحق عقد
                </button>
              </div>

              <div className="form-grid two">
                {(contractorForm.contractAddendums || []).map((addendum, index) => (
                  <label key={addendum.id}>
                    {`ملحق عقد (اختياري) ${index + 1}`}
                    <div className="inline-field">
                      <input value={addendum.path} readOnly />
                      <div className="stack-inline">
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() => pickContractAddendum(addendum.id, index)}
                        >
                          اختيار
                        </button>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => openLinkedFile(addendum.path)}
                        >
                          فتح
                        </button>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="panel-head secondary">
                <h4>فقرات العمل</h4>
                <button type="button" className="ghost" onClick={addContractItem}>
                  إضافة فقرة
                </button>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>الفقرة</th>
                      <th>الوحدة</th>
                      <th>الكمية العقدية</th>
                      <th>سعر الفقرة</th>
                      {contractorForm.useItemRetention ? <th>تأمينات الفقرة %</th> : null}
                      {contractorForm.showProgressPercent ? <th>نسبة الإنجاز %</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {contractorForm.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <textarea
                            rows={textareaRows(item.title, 32)}
                            className="auto-textarea"
                            value={item.title}
                            onChange={(event) =>
                              updateItem(item.id, "title", event.target.value)
                            }
                            onInput={(event) => {
                              event.target.style.height = "auto";
                              event.target.style.height = `${event.target.scrollHeight}px`;
                            }}
                          />
                        </td>
                        <td>
                          <select
                            value={item.unit}
                            onChange={(event) =>
                              updateItem(item.id, "unit", event.target.value)
                            }
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="number-input"
                            value={formatEditableNumber(item.contractQuantity, { blankZero: true })}
                            onChange={(event) =>
                              updateItem(item.id, "contractQuantity", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="number-input"
                            value={formatEditableNumber(item.unitPrice)}
                            onChange={(event) =>
                              updateItem(item.id, "unitPrice", event.target.value)
                            }
                          />
                        </td>
                        {contractorForm.useItemRetention ? (
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="number-input"
                              value={formatEditableNumber(item.retentionPercent || 0)}
                              onChange={(event) =>
                                updateItem(item.id, "retentionPercent", event.target.value)
                              }
                            />
                          </td>
                        ) : null}
                        {contractorForm.showProgressPercent ? (
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="number-input"
                              value={formatEditableNumber(item.progressPercent || 0)}
                              onChange={(event) =>
                                updateItem(item.id, "progressPercent", event.target.value)
                              }
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {view === "archive" ? (
          <section className="panel archive-panel">
            <div className="panel-head">
              <div>
                  <h3>أرشيف الذرعات</h3>
                  <span>قائمة موحدة للذرعات الصادرة والمغلقة مع البحث السريع وفتح الملفات.</span>
              </div>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  if (selectedArchiveMeasurement) {
                    openMeasurementRecord(
                      selectedArchiveMeasurement.id,
                      selectedArchiveMeasurement.contractorId
                    );
                  }
                }}
              >
                فتح الذرعة في شاشة الذرعات
              </button>
            </div>

            <div className="form-grid archive-search-grid">
              <label>
                  ابحث في الأرشيف
                <input
                    placeholder="ابحث بالاسم أو رقم العقد أو رقم الذرعة"
                  value={archiveSearch}
                  onChange={(event) => setArchiveSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="archive-table-wrap excel-like">
              <table className="archive-table excel-like">
                <thead>
                  <tr>
                    <th>اسم المتعهد</th>
                    <th>رقم العقد</th>
                    <th>رقم العمل</th>
                    <th>رقم الذرعة</th>
                    <th>النوع</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>التوقيع</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {globalArchiveResults.map(({ measurement, contractor }) => (
                    <tr
                      key={measurement.id}
                      className={
                        selectedMeasurementId === measurement.id ? "archive-row active" : "archive-row"
                      }
                      onClick={() => {
                        setSelectedArchiveContractorId(contractor.id);
                        setSelectedContractorId(contractor.id);
                        setSelectedMeasurementId(measurement.id);
                      }}
                    >
                      <td>
                        <button
                          type="button"
                          className="archive-name-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedArchiveContractorId(contractor.id);
                            openMeasurementRecord(measurement.id, contractor.id);
                          }}
                        >
                          {contractor.name}
                        </button>
                      </td>
                      <td>{contractor.contractNumber}</td>
                      <td>{contractor.workNumber}</td>
                      <td>{measurement.issueNo}</td>
                      <td>{measurementTypeLabel(measurement.type)}</td>
                      <td>{measurementStatusLabel(measurement)}</td>
                      <td>{measurement.date || "-"}</td>
                      <td>{money(measurement.payableThisMeasurement || 0)}</td>
                      <td>{signatureStatusLabel(measurement)}</td>
                      <td>
                        <div className="archive-file-actions">
                          {measurement.pdfPath ? (
                            <button
                              type="button"
                              className="archive-file-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openLinkedFile(measurement.pdfPath);
                              }}
                            >
                                فتح المصدر
                            </button>
                          ) : (
                            <span>غير مصدر</span>
                          )}
                          {measurement.signedPdfPath ? (
                            <button
                              type="button"
                              className="archive-file-button secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openLinkedFile(measurement.signedPdfPath);
                              }}
                            >
                                فتح المرفق
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {globalArchiveResults.length === 0 ? (
              <div className="empty-note">لا توجد نتائج أرشيف مطابقة لبحثك الحالي.</div>
            ) : null}
          </section>
        ) : null}

        {view === "measurements" ? (
          <div className="measurement-layout">
            <section className="panel contractor-picker-panel">
              <div className="panel-head">
                <div>
                  <h3>اختيار المتعهد</h3>
                  <span>ابحث باسم المتعهد أو رقم العقد أو رقم العمل ثم اختر الصف المطلوب.</span>
                </div>
                <button
                  className="primary"
                  type="button"
                  onClick={() =>
                    startNewMeasurement(selectedContractorId || filteredMeasurementContractors[0]?.id)
                  }
                  disabled={!selectedContractorId && filteredMeasurementContractors.length === 0}
                >
                  إصدار سلفة جديدة
                </button>
              </div>

              <div className="contractor-search-grid">
                <label>
                  ابحث عن المتعهد
                  <input
                    value={measurementSearch}
                    onChange={(event) => setMeasurementSearch(event.target.value)}
                    placeholder="الاسم أو رقم العقد أو رقم العمل"
                  />
                </label>
              </div>

              <div className="contractor-picker-table-wrap">
                <table className="contractor-picker-table">
                  <thead>
                    <tr>
                      <th>اسم المتعهد</th>
                      <th>رقم العقد</th>
                      <th>رقم العمل</th>
                      <th>العمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeasurementContractors.map((contractor) => (
                      <tr
                        key={contractor.id}
                        className={
                          contractor.id === selectedContractorId
                            ? "contractor-picker-row active"
                            : "contractor-picker-row"
                        }
                        onClick={() => startNewMeasurement(contractor.id)}
                      >
                        <td className="wrap-cell">{contractor.name}</td>
                        <td>{contractor.contractNumber}</td>
                        <td>{contractor.workNumber}</td>
                        <td className="wrap-cell">{contractor.workName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMeasurementContractors.length === 0 ? (
                <div className="empty-note">لا توجد نتائج مطابقة لبحث المتعهد الحالي.</div>
              ) : null}
            </section>

            {selectedContractor ? (
              <section className="panel measurement-editor-panel">
                <div className="measurement-editor-head">
                  <div>
                    <h3>إصدار الذرعة</h3>
                    <div className="selected-contractor-strip">
                      <strong>{selectedContractor.name}</strong>
                      <span>{selectedContractor.contractNumber}</span>
                      <span>{selectedContractor.workNumber}</span>
                    </div>
                  </div>
                  <div className="action-line">
                    {measurementForm?.status === "issued" && !measurementEditable ? (
                      <>
                        <button className="ghost" type="button" onClick={enableMeasurementEditing}>
                          تعديل الذرعة
                        </button>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => deleteIssuedMeasurement(measurementForm.id)}
                        >
                          حذف الذرعة
                        </button>
                        <button className="ghost" type="button" onClick={closeMeasurement}>
                          إغلاق الذرعة
                        </button>
                      </>
                    ) : null}
                    {measurementForm?.status !== "closed" && measurementEditable ? (
                      <button className="primary" type="button" onClick={() => saveMeasurement("issued")}>
                        إصدار وأرشفة
                      </button>
                    ) : null}
                    {measurementForm?.status !== "closed" && measurementEditable ? (
                      <button className="ghost" type="button" onClick={closeMeasurement}>
                        إغلاق الذرعة
                      </button>
                    ) : null}
                  </div>
                </div>

                {measurementReady ? (
                  <>
                    <div className="summary-grid archive-summary measurement-summary-grid">
                      <div className="summary-box">
                        <span>نوع الذرعة</span>
                        <strong>{measurementTypeLabel(measurementForm.type)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>الحالة</span>
                        <strong>{measurementStatusLabel(measurementForm)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>حالة التوقيع</span>
                        <strong>{signatureStatusLabel(measurementForm)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>تاريخ الإصدار</span>
                        <strong>{measurementForm.date || "-"}</strong>
                      </div>
                      <div className="summary-box highlight">
                        <span>مبلغ الذرعة</span>
                        <strong>{money(currentSummary.payableThisMeasurement)}</strong>
                      </div>
                    </div>

                    <div className="form-grid three measurement-header-grid">
                      <label>
                        رقم الذرعة
                        <input
                          value={measurementForm.issueNo}
                          disabled={isLockedMeasurement()}
                          onChange={(event) => updateMeasurement("issueNo", event.target.value)}
                        />
                      </label>
                      <label>
                        التاريخ
                        <input
                          type="date"
                          value={measurementForm.date}
                          disabled={isLockedMeasurement()}
                          onChange={(event) => updateMeasurement("date", event.target.value)}
                        />
                      </label>
                      <label>
                        النوع
                        <select
                          value={measurementForm.type}
                          disabled={isLockedMeasurement()}
                          onChange={(event) => updateMeasurement("type", event.target.value)}
                        >
                          <option value="regular">ذرعة اعتيادية</option>
                          <option value="clearance">ذرعة تصفية</option>
                        </select>
                      </label>
                      <label>
                        المبلغ الواجب دفعه سابقاً
                        <input
                          type="text"
                          inputMode="decimal"
                          className="number-input"
                          value={formatEditableNumber(measurementForm.previousDueManual || 0)}
                          disabled={
                            isLockedMeasurement() || data.settings.previousDueMode === "auto"
                          }
                          onChange={(event) =>
                            updateMeasurement("previousDueManual", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        حالة الذرعة
                        <input value={measurementStatusLabel(measurementForm)} readOnly />
                      </label>
                      <label>
                        محضر الاستلام
                        <select
                          value={measurementForm.handoverIssued ? "yes" : "no"}
                          disabled={isLockedMeasurement()}
                          onChange={(event) =>
                            updateMeasurement("handoverIssued", event.target.value === "yes")
                          }
                        >
                          <option value="no">غير صادر</option>
                          <option value="yes">صادر</option>
                        </select>
                      </label>
                    </div>

                    <div className="form-grid measurement-notes-grid">
                      <label>
                        ملاحظات عامة للذرعة
                        <textarea
                          rows={textareaRows(measurementForm.generalNotes, 90)}
                          className="auto-textarea"
                          value={measurementForm.generalNotes || ""}
                          disabled={isLockedMeasurement()}
                          onChange={(event) =>
                            updateMeasurement("generalNotes", event.target.value)
                          }
                          onInput={(event) => {
                            event.target.style.height = "auto";
                            event.target.style.height = `${event.target.scrollHeight}px`;
                          }}
                        />
                      </label>
                    </div>

                    {measurementForm.type === "clearance" ? (
                      <>
                        <div className="warning-box">
                          ذرعة التصفية تكون بدون تأمينات، ويجب إصدار محضر استلام وإرفاقه قبل الاعتماد. ولا يمكن إصدار ذرعة جديدة بعد التصفية.
                        </div>
                        <div className="form-grid two">
                          <label>
                            ملف محضر الاستلام
                            <div className="inline-field">
                              <input value={measurementForm.handoverPdfPath || ""} readOnly />
                              <div className="stack-inline">
                                <button className="ghost small" type="button" onClick={attachHandoverPdf}>
                                  إرفاق المحضر
                                </button>
                                <button
                                  className="ghost small"
                                  type="button"
                                  onClick={() => openLinkedFile(measurementForm.handoverPdfPath)}
                                >
                                  فتح
                                </button>
                              </div>
                            </div>
                          </label>
                        </div>
                      </>
                    ) : null}

                    <div className="panel-head secondary">
                      <h4>تفاصيل الفقرات</h4>
                      <button
                        className="ghost"
                        type="button"
                        disabled={isLockedMeasurement()}
                        onClick={addMeasurementRowFromContract}
                      >
                          إضافة فقرة
                      </button>
                    </div>

                    <div className="table-scroll measurement-table-wrap">
                      <table className="measurement-table">
                        <thead>
                          <tr>
                            <th>الفقرة</th>
                            <th>الوحدة</th>
                            <th>سعر الفقرة</th>
                            {data.settings.showContractQuantityInMeasurement ? (
                              <th>الكمية العقدية</th>
                            ) : null}
                            {selectedContractor.useItemRetention ? <th>تأمينات الفقرة %</th> : null}
                            <th>الكمية السابقة</th>
                            <th>الإنجاز الحالي</th>
                            {selectedContractor.showProgressPercent ? <th>نسبة الإنجاز %</th> : null}
                            <th>التراكمي الكلي</th>
                            {data.settings.showRemainingQtyInMeasurement ? <th>المتبقي</th> : null}
                            <th>مبلغ السابق</th>
                            <th>مبلغ الحالي</th>
                            <th>المبلغ الكلي</th>
                            <th>الملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSummary.rows.map((row) => (
                            <tr key={row.id}>
                              <td className="wrap-cell">
                                {row.itemId && !row.isCustom ? (
                                  <textarea
                                    rows={textareaRows(row.title, 28)}
                                    className="auto-textarea"
                                    value={row.title}
                                    readOnly
                                  />
                                ) : (
                                  <div className="custom-item-cell">
                                    <select
                                      disabled={isLockedMeasurement()}
                                      value={row.itemId}
                                      onChange={(event) =>
                                        chooseContractItemForRow(row.id, event.target.value)
                                      }
                                    >
                                      <option value="">اختر فقرة من القائمة</option>
                                      {selectedContractor.items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.title}
                                        </option>
                                      ))}
                                    </select>
                                    <textarea
                                      rows={textareaRows(row.title, 28)}
                                      className="auto-textarea"
                                      placeholder="أو اكتب فقرة جديدة"
                                      value={row.title}
                                      disabled={isLockedMeasurement()}
                                      onChange={(event) =>
                                        updateMeasurementRow(row.id, "title", event.target.value)
                                      }
                                      onInput={(event) => {
                                        event.target.style.height = "auto";
                                        event.target.style.height = `${event.target.scrollHeight}px`;
                                      }}
                                    />
                                  </div>
                                )}
                              </td>
                              <td>
                                <select
                                  value={row.unit}
                                  disabled={isLockedMeasurement() || !row.isCustom}
                                  onChange={(event) =>
                                    updateMeasurementRow(row.id, "unit", event.target.value)
                                  }
                                >
                                  {unitOptions.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="number-input"
                                  value={formatEditableNumber(row.unitPrice)}
                                  readOnly={!row.isCustom}
                                  disabled={isLockedMeasurement()}
                                  onChange={(event) =>
                                    updateMeasurementRow(row.id, "unitPrice", event.target.value)
                                  }
                                />
                              </td>
                              {data.settings.showContractQuantityInMeasurement ? (
                                <td>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="number-input"
                                    value={formatEditableNumber(row.contractQuantity, { blankZero: true })}
                                    readOnly={!row.isCustom}
                                    disabled={isLockedMeasurement()}
                                    onChange={(event) =>
                                      updateMeasurementRow(row.id, "contractQuantity", event.target.value)
                                    }
                                  />
                                </td>
                              ) : null}
                              {selectedContractor.useItemRetention ? (
                                <td>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="number-input"
                                    value={formatEditableNumber(row.retentionPercent || 0)}
                                    readOnly={!row.isCustom}
                                    disabled={isLockedMeasurement()}
                                    onChange={(event) =>
                                      updateMeasurementRow(row.id, "retentionPercent", event.target.value)
                                    }
                                  />
                                </td>
                              ) : null}
                              <td><input className="number-input" value={formatEditableNumber(row.previousQty)} readOnly /></td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="number-input"
                                  value={formatEditableNumber(row.currentQty)}
                                  disabled={isLockedMeasurement()}
                                  onChange={(event) =>
                                    updateMeasurementRow(row.id, "currentQty", event.target.value)
                                  }
                                />
                              </td>
                              {selectedContractor.showProgressPercent ? (
                                <td>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="number-input"
                                    value={formatEditableNumber(row.progressPercent || 0)}
                                    disabled={isLockedMeasurement()}
                                    onChange={(event) =>
                                      updateMeasurementRow(row.id, "progressPercent", event.target.value)
                                    }
                                  />
                                </td>
                              ) : null}
                              <td><input className="number-input" value={formatEditableNumber(row.totalQty)} readOnly /></td>
                              {data.settings.showRemainingQtyInMeasurement ? (
                                <td><input className="number-input" value={formatEditableNumber(row.remainingQty)} readOnly /></td>
                              ) : null}
                              <td><input className="number-input" value={money(row.previousAmount)} readOnly /></td>
                              <td><input className="number-input" value={money(row.currentAmount)} readOnly /></td>
                              <td><input className="number-input" value={money(row.totalAmount)} readOnly /></td>
                              <td className="wrap-cell">
                                <textarea
                                  rows={textareaRows(row.notes, 18)}
                                  className="auto-textarea"
                                  value={row.notes}
                                  disabled={isLockedMeasurement()}
                                  onChange={(event) =>
                                    updateMeasurementRow(row.id, "notes", event.target.value)
                                  }
                                  onInput={(event) => {
                                    event.target.style.height = "auto";
                                    event.target.style.height = `${event.target.scrollHeight}px`;
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-grid measurement-summary-grid">
                      <div className="summary-box">
                        <span>مبلغ الإنجاز التراكمي الكلي</span>
                        <strong>{money(currentSummary.totalDue)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>المبلغ الواجب دفعه سابقاً</span>
                        <strong>{money(currentSummary.previousDue)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>مبلغ الإنجاز الحالي</span>
                        <strong>{money(currentSummary.currentAmount)}</strong>
                      </div>
                      <div className="summary-box">
                        <span>مبلغ التأمينات</span>
                        <strong>{money(currentSummary.retentionAmount)}</strong>
                      </div>
                      <div className="summary-box highlight">
                        <span>المبلغ الواجب دفعه لهذه الذرعة</span>
                        <strong>{money(currentSummary.payableThisMeasurement)}</strong>
                      </div>
                    </div>

                    <div className="panel-head secondary">
                      <h4>الطباعة والأرشفة</h4>
                    </div>

                    <div className="form-grid two">
                      <label>
                        ملف PDF المصدر
                        <div className="inline-field">
                          <input value={measurementForm.pdfPath || ""} readOnly />
                          <div className="stack-inline">
                            <button className="ghost small" type="button" onClick={exportMeasurementPdf}>
                              تصدير PDF
                            </button>
                            <button
                              className="ghost small"
                              type="button"
                              onClick={() => openLinkedFile(measurementForm.pdfPath)}
                            >
                              فتح
                            </button>
                          </div>
                        </div>
                      </label>
                      <label>
                        النسخة الموقعة PDF
                        <div className="inline-field">
                          <input value={measurementForm.signedPdfPath || ""} readOnly />
                          <div className="stack-inline">
                            <button className="ghost small" type="button" onClick={attachSignedPdf}>
                              إرفاق
                            </button>
                            <button
                              className="ghost small"
                              type="button"
                              onClick={() => openLinkedFile(measurementForm.signedPdfPath)}
                            >
                              فتح
                            </button>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="panel-head secondary">
                      <h4>سجل التدقيق</h4>
                    </div>
                    <div className="list-stack compact">
                      {(measurementForm.auditLog || []).length === 0 ? (
                        <div className="empty-note">لا يوجد سجل بعد.</div>
                      ) : (
                        measurementForm.auditLog
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <div key={entry.id} className="audit-row">
                              <strong>{entry.action}</strong>
                              <span>{entry.at}</span>
                            </div>
                        ))
                      )}
                    </div>

                    <div className="panel-head secondary">
                      <h4>الذرعات السابقة لهذا المتعهد</h4>
                    </div>

                    <div className="archive-table-wrap measurement-history-wrap">
                      <table className="archive-table excel-like measurement-history-table">
                        <thead>
                          <tr>
                            <th>رقم الذرعة</th>
                            <th>رقم العمل</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>PDF</th>
                            <th>فتح</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractorMeasurementHistory.map((item) => (
                            <tr
                              key={item.id}
                              className={
                                selectedMeasurementId === item.id ? "archive-row active" : "archive-row"
                              }
                            >
                              <td>{item.issueNo}</td>
                              <td>{selectedContractor.workNumber}</td>
                              <td>{measurementStatusLabel(item)}</td>
                              <td>{item.date || "-"}</td>
                              <td>{money(item.payableThisMeasurement || 0)}</td>
                              <td>
                                <div className="archive-file-actions">
                                  {item.pdfPath ? (
                                    <button
                                      type="button"
                                      className="archive-file-button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openLinkedFile(item.pdfPath);
                                      }}
                                    >
                                      فتح المصدر
                                    </button>
                                  ) : (
                                    <span>غير مصدر</span>
                                  )}
                                  {item.signedPdfPath ? (
                                    <button
                                      type="button"
                                      className="archive-file-button secondary"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openLinkedFile(item.signedPdfPath);
                                      }}
                                    >
                                      فتح المرفق
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <div className="archive-file-actions">
                                  <button
                                    type="button"
                                    className="archive-file-button secondary"
                                    onClick={() => openMeasurementRecord(item.id, selectedContractor.id)}
                                  >
                                    عرض الذرعة
                                  </button>
                                  {item.status === "issued" ? (
                                    <button
                                      type="button"
                                      className="archive-file-button"
                                      onClick={() => deleteIssuedMeasurement(item.id)}
                                    >
                                      حذف
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="empty-note">اختر متعهداً لعرض نموذج الذرعة الجديدة.</div>
                )}
              </section>
            ) : (
              <section className="panel">
                <div className="empty-note">
                  اختر متعهداً من الجدول أعلاه لبدء إصدار ذرعة جديدة أو متابعة ذرعة موجودة.
                </div>
              </section>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;



