import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import helmet from "helmet";
import compression from "compression";
import crypto from "node:crypto";
import {
  getCatalogPayload,
  buildMealPlan,
  buildOrderSummary,
  createOrderRecord,
  listOrders,
  updateOrderPayment
} from "./services.js";
import { checkoutSchema, plannerSchema, verifySchema } from "./schemas.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "./payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicAssetsDir = path.join(rootDir, "public");
const app = express();
const port = Number(process.env.PORT || 3000);

const rateWindowMs = 60_000;
const rateMax = 80;
const requests = new Map();

function rateLimiter(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = requests.get(key) || [];
  const fresh = current.filter((stamp) => now - stamp < rateWindowMs);
  fresh.push(now);
  requests.set(key, fresh);
  if (fresh.length > rateMax) {
    res.status(429).json({ error: "Too many requests. Please retry in a minute." });
    return;
  }
  next();
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(rateLimiter);
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    res.status(501).json({ error: "Webhook secret is not configured" });
    return;
  }
  const signature = req.headers["x-razorpay-signature"];
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  if (signature !== expected) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }
  const payload = JSON.parse(req.body.toString("utf8"));
  const entity = payload?.payload?.payment?.entity;
  if (entity?.notes?.fitfuelOrderId) {
    updateOrderPayment(entity.notes.fitfuelOrderId, {
      paymentStatus: entity.status === "captured" ? "paid" : entity.status,
      paymentId: entity.id,
      gatewayOrderId: entity.order_id,
      signature: signature
    });
  }
  res.json({ ok: true });
});
app.use(
  express.json({
    limit: "250kb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    }
  })
);
app.use("/assets", express.static(publicAssetsDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "fitfuel-kitchen-api", time: new Date().toISOString() });
});

app.get("/api/menu", (_req, res) => {
  res.json(getCatalogPayload());
});

app.post("/api/ai/recommend", (req, res) => {
  const parsed = plannerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid planner profile", details: parsed.error.flatten() });
    return;
  }
  res.json(buildMealPlan(parsed.data));
});

app.post("/api/cart/quote", (req, res) => {
  try {
    const quote = buildOrderSummary(req.body.items || [], String(req.body.couponCode || "").trim().toUpperCase());
    res.json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/checkout/create-order", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const payload = parsed.data;
    const quote = buildOrderSummary(payload.items, payload.couponCode?.trim().toUpperCase() || "");
    const order = createOrderRecord({
      customer: payload.customer,
      notes: payload.notes,
      paymentMethod: payload.paymentMethod,
      quote,
      items: payload.items
    });

    let payment = null;
    if (payload.paymentMethod === "card" || payload.paymentMethod === "upi") {
      payment = await createRazorpayOrder({
        orderId: order.orderNumber,
        amount: quote.total * 100,
        notes: {
          fitfuelOrderId: String(order.id),
          customerName: payload.customer.name
        }
      });
    } else {
      payment = {
        mode: "cod",
        amount: quote.total * 100,
        currency: "INR",
        displayMessage: "Cash on delivery selected. Pay upon arrival."
      };
    }

    res.json({
      order,
      payment,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to create order" });
  }
});

app.post("/api/payments/verify", (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid verification payload", details: parsed.error.flatten() });
    return;
  }

  const isValid = verifyRazorpaySignature(parsed.data);
  if (!isValid) {
    res.status(400).json({ error: "Payment signature verification failed" });
    return;
  }

  const order = updateOrderPayment(parsed.data.fitfuelOrderId, {
    paymentStatus: "paid",
    paymentId: parsed.data.razorpay_payment_id,
    gatewayOrderId: parsed.data.razorpay_order_id,
    signature: parsed.data.razorpay_signature
  });

  res.json({
    ok: true,
    order
  });
});

app.get("/api/orders", (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(listOrders());
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`FitFuel Kitchen server listening on http://localhost:${port}`);
});
