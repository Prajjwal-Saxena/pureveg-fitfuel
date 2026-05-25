import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");

const required = ["PORT", "APP_BASE_URL", "FRONTEND_URL", "DB_PATH", "ADMIN_API_KEY"];

const integrationGroups = {
  razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  stripe: ["STRIPE_SECRET_KEY"],
  openai: ["OPENAI_API_KEY"],
  pinecone: ["PINECONE_API_KEY", "PINECONE_INDEX"],
  mixpanel: ["MIXPANEL_TOKEN"],
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"],
  firebase: ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"],
  n8n: ["N8N_WEBHOOK_BASE_URL"],
  aws: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"]
};

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
if (missingRequired.length) {
  console.error(`Missing required env vars: ${missingRequired.join(", ")}`);
  process.exit(1);
}

console.log("Required env vars look good");

for (const [group, keys] of Object.entries(integrationGroups)) {
  const present = keys.filter((key) => Boolean(entries.get(key)));
  const complete = present.length === keys.length;
  const label = complete ? "configured" : present.length ? "partially configured" : "not configured";
  console.log(`${group}: ${label}`);
  if (!complete) {
    const missing = keys.filter((key) => !entries.get(key));
    console.log(`  missing -> ${missing.join(", ")}`);
  }
}
