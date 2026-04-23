const elements = {
  customerName: document.getElementById("customerName"),
  customerCode: document.getElementById("customerCode"),
  deviceFingerprint: document.getElementById("deviceFingerprint"),
  plan: document.getElementById("plan"),
  expiresAt: document.getElementById("expiresAt"),
  notes: document.getElementById("notes"),
  generateButton: document.getElementById("generateButton"),
  clearButton: document.getElementById("clearButton"),
  copyButton: document.getElementById("copyButton"),
  licenseKey: document.getElementById("licenseKey"),
  message: document.getElementById("message"),
  summaryPlan: document.getElementById("summaryPlan"),
  summaryCustomer: document.getElementById("summaryCustomer"),
  summaryDevice: document.getElementById("summaryDevice"),
  summaryExpires: document.getElementById("summaryExpires"),
};

function setMessage(text, type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;
}

function clearMessage() {
  elements.message.textContent = "";
  elements.message.className = "message hidden";
}

function collectPayload() {
  return {
    customerName: elements.customerName.value.trim(),
    customerCode: elements.customerCode.value.trim(),
    deviceFingerprint: elements.deviceFingerprint.value.trim().toUpperCase(),
    plan: elements.plan.value,
    expiresAt: elements.expiresAt.value || "",
    notes: elements.notes.value.trim(),
  };
}

function renderResult(payload, licenseKey) {
  elements.summaryPlan.textContent = payload.plan || "-";
  elements.summaryCustomer.textContent = payload.customerName || "-";
  elements.summaryDevice.textContent = payload.deviceFingerprint || "ANY";
  elements.summaryExpires.textContent = payload.expiresAt || "LIFETIME";
  elements.licenseKey.value = licenseKey || "";
}

function clearForm() {
  elements.customerName.value = "";
  elements.customerCode.value = "";
  elements.deviceFingerprint.value = "";
  elements.plan.value = "demo";
  elements.expiresAt.value = "";
  elements.notes.value = "";
  renderResult({}, "");
  clearMessage();
}

elements.plan.addEventListener("change", () => {
  if (elements.plan.value === "lifetime") {
    elements.expiresAt.value = "";
    elements.expiresAt.disabled = true;
  } else {
    elements.expiresAt.disabled = false;
  }
});

elements.generateButton.addEventListener("click", async () => {
  const payload = collectPayload();

  if (!payload.customerName) {
    setMessage("أدخل اسم العميل أولاً.", "error");
    return;
  }

  if (!payload.deviceFingerprint) {
    setMessage("أدخل بصمة الجهاز أولاً.", "error");
    return;
  }

  const result = await window.activationApi.generateLicense(payload);
  if (!result.ok) {
    setMessage(result.message || "تعذر توليد الكود.", "error");
    return;
  }

  renderResult(result.payload, result.licenseKey);
  setMessage("تم توليد كود التفعيل بنجاح.", "success");
});

elements.copyButton.addEventListener("click", async () => {
  if (!elements.licenseKey.value.trim()) {
    setMessage("لا يوجد كود لنسخه بعد.", "error");
    return;
  }

  await window.activationApi.copyText(elements.licenseKey.value.trim());
  setMessage("تم نسخ الكود.", "success");
});

elements.clearButton.addEventListener("click", () => {
  clearForm();
});

clearForm();
