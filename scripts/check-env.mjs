import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");

const required = [
  "PORT",
  "APP_BASE_URL",
  "FRONTEND_URL",
  "DB_PATH",
  "ADMIN_API_KEY"
];

const recommended = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET"
];

if (!fs.existsSync(envPath)) {
  console.error(".env file is missing");
  process.exit(1);
}

const contents = fs.readFileSync(envPath, "utf8");
const entries = new Map();

for (const rawLine of contents.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const index = line.indexOf("=");
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim();
  entries.set(key, value);
}

const missingRequired = required.filter((key) => !entries.get(key));
const missingRecommended = recommended.filter((key) => !entries.get(key));

if (missingRequired.length) {
  console.error(`Missing required env vars: ${missingRequired.join(", ")}`);
  process.exit(1);
}

console.log("Required env vars look good");
if (missingRecommended.length) {
  console.log(`Payment keys still missing: ${missingRecommended.join(", ")}`);
} else {
  console.log("Razorpay env vars are present");
}
