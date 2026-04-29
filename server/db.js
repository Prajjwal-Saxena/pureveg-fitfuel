import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { menuItems, subscriptions, fitnessPlans, offers } from "../data/menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dbPath = path.resolve(rootDir, process.env.DB_PATH || "./data/fitfuel.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fitness_plans (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS offers (
    title TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    notes TEXT,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_id TEXT,
    gateway_order_id TEXT,
    gateway_signature TEXT,
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL,
    discount INTEGER NOT NULL,
    total INTEGER NOT NULL,
    items_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function seedTable(tableName, rows, keyField) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
  if (count > 0) return;
  const insert = db.prepare(`INSERT INTO ${tableName} (${keyField}, payload) VALUES (?, ?)`);
  const transaction = db.transaction((items) => {
    items.forEach((item) => insert.run(item[keyField], JSON.stringify(item)));
  });
  transaction(rows);
}

seedTable("menu_items", menuItems, "id");
seedTable("subscriptions", subscriptions, "id");
seedTable("fitness_plans", fitnessPlans, "id");
seedTable("offers", offers, "title");
