const crypto = require("crypto");

const APP_SECRET = "SPARDEX-CONTRACTOR-DESK-OFFLINE-LICENSE-V1";

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }

  if (!args.plan && positional[0]) {
    args.plan = positional[0];
  }
  if (!args.customer && positional[1]) {
    args.customer = positional[1];
  }
  if (!args.device && positional[2]) {
    args.device = positional[2];
  }

  return args;
}

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

function buildPayload(args) {
  const today = new Date();
  const plan = (args.plan || "demo").toLowerCase();
  let expiresAt = null;

  if (plan === "demo") {
    expiresAt = toDateOnly(addMonths(today, 0));
    expiresAt = args.expires || toDateOnly(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  } else if (plan === "monthly") {
    expiresAt = args.expires || toDateOnly(addMonths(today, 1));
  } else if (plan === "yearly") {
    expiresAt = args.expires || toDateOnly(addYears(today, 1));
  } else if (plan === "lifetime") {
    expiresAt = null;
  } else {
    throw new Error("الخطة غير مدعومة. استخدم: demo, monthly, yearly, lifetime");
  }

  return {
    plan,
    customerName: args.customer || "عميل",
    customerCode: args.customerCode || "",
    deviceFingerprint: args.device || "",
    issuedAt: toDateOnly(today),
    expiresAt,
    notes: args.notes || "",
  };
}

function main() {
  const args = parseArgs(process.argv);
  const payload = buildPayload(args);
  const payloadEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadEncoded);
  const licenseKey = `${payloadEncoded}.${signature}`;

  console.log("Plan:", payload.plan);
  console.log("Customer:", payload.customerName);
  console.log("Device:", payload.deviceFingerprint || "ANY");
  console.log("Expires:", payload.expiresAt || "LIFETIME");
  console.log("");
  console.log(licenseKey);
}

main();
