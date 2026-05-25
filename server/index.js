import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import helmet from "helmet";
import compression from "compression";
import crypto from "node:crypto";
import multer from "multer";
import { WebSocketServer } from "ws";
import {
  getCatalogPayload,
  buildMealPlan,
  buildOrderSummary,
  createOrderRecord,
  listOrders,
  updateOrderPayment,
  createGuestSession,
  getUserBySessionToken,
  getProfileByUserId,
  upsertProfile,
  getDashboardByUserId,
  updateUserAccount,
  getPersonalizedCatalog
} from "./services.js";
import {
  checkoutSchema,
  plannerSchema,
  verifySchema,
  guestSessionSchema,
  profileSchema,
  accountSchema,
  coachMessageSchema,
  analyticsEventSchema,
  stripeCheckoutSchema,
  whatsappSchema
} from "./schemas.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "./payments.js";
import {
  analyzeFoodImage,
  createStripeCheckoutSession,
  generateCoachResponse,
  getIntegrationStatus,
  getRealtimeConfig,
  sendWhatsAppAutomation,
  trackAnalyticsEvent,
  upsertUserMemory
} from "./platform-integrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicAssetsDir = path.join(rootDir, "public");
const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

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

function requireSession(req, res, next) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    res.status(401).json({ error: "Missing session token" });
    return;
  }
  const user = getUserBySessionToken(String(sessionToken));
  if (!user) {
    res.status(401).json({ error: "Invalid session token" });
    return;
  }
  req.user = user;
  next();
}

function getSessionToken(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  return bearer || req.headers["x-session-token"];
}

function getOptionalUser(req) {
  const sessionToken = getSessionToken(req);
  return sessionToken ? getUserBySessionToken(String(sessionToken)) : null;
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
      signature
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
  res.json({ ok: true, service: "fitfuel-kitchen-api", time: new Date().toISOString(), integrations: getIntegrationStatus() });
});

app.get("/api/integrations/status", (_req, res) => {
  res.json(getIntegrationStatus());
});

app.get("/api/menu", (_req, res) => {
  res.json(getCatalogPayload());
});

app.get("/api/menu/personalized", requireSession, (req, res) => {
  res.json(getPersonalizedCatalog(req.user.id));
});

app.post("/api/auth/guest-session", (req, res) => {
  const parsed = guestSessionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid guest session payload", details: parsed.error.flatten() });
    return;
  }
  res.json(createGuestSession(parsed.data));
});

app.post("/api/ai/recommend", (req, res) => {
  const parsed = plannerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid planner profile", details: parsed.error.flatten() });
    return;
  }
  res.json(buildMealPlan(parsed.data));
});

app.post("/api/ai/coach/chat", requireSession, async (req, res) => {
  const parsed = coachMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid coach payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const response = await generateCoachResponse({
      user: req.user,
      message: parsed.data.message,
      conversation: parsed.data.conversation
    });
    await upsertUserMemory({
      userId: req.user.id,
      memoryText: `User asked: ${parsed.data.message}\nCoach replied: ${response.reply}`,
      metadata: { source: "coach-chat" }
    });
    res.json(response);
  } catch (error) {
    res.status(503).json({ error: error.message || "AI coach unavailable" });
  }
});

app.post("/api/ai/food-analyzer", requireSession, upload.single("image"), async (req, res) => {
  const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl) : "";
  const notes = req.body?.notes ? String(req.body.notes) : "";
  const imageDataUrl = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` : "";

  try {
    const analysis = await analyzeFoodImage({
      user: req.user,
      imageDataUrl,
      imageUrl,
      notes
    });
    res.json(analysis);
  } catch (error) {
    res.status(503).json({ error: error.message || "Food analyzer unavailable" });
  }
});

app.get("/api/me/profile", requireSession, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      displayName: req.user.display_name,
      email: req.user.email,
      phone: req.user.phone
    },
    profile: getProfileByUserId(req.user.id)
  });
});

app.put("/api/me/profile", requireSession, (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile payload", details: parsed.error.flatten() });
    return;
  }
  res.json({
    ok: true,
    profile: upsertProfile(req.user.id, parsed.data)
  });
});

app.put("/api/me/account", requireSession, (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account payload", details: parsed.error.flatten() });
    return;
  }
  const account = updateUserAccount(req.user.id, parsed.data);
  res.json({
    ok: true,
    account: {
      displayName: account.display_name,
      email: account.email || "",
      phone: account.phone || "",
      authProvider: account.auth_provider
    }
  });
});

app.get("/api/me/dashboard", requireSession, (req, res) => {
  res.json(getDashboardByUserId(req.user.id));
});

app.post("/api/analytics/track", requireSession, async (req, res) => {
  const parsed = analyticsEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid analytics payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await trackAnalyticsEvent({
      user: req.user,
      event: parsed.data.event,
      properties: parsed.data.properties
    });
    res.json(result);
  } catch (error) {
    res.status(503).json({ error: error.message || "Analytics tracking unavailable" });
  }
});

app.post("/api/payments/stripe/create-session", requireSession, async (req, res) => {
  const parsed = stripeCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Stripe checkout payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const session = await createStripeCheckoutSession(parsed.data);
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(503).json({ error: error.message || "Stripe unavailable" });
  }
});

app.post("/api/automation/whatsapp/send", requireSession, async (req, res) => {
  const parsed = whatsappSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid WhatsApp payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await sendWhatsAppAutomation(parsed.data);
    res.json({ ok: true, sid: result.sid });
  } catch (error) {
    res.status(503).json({ error: error.message || "WhatsApp automation unavailable" });
  }
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
    const user = getOptionalUser(req);
    const order = createOrderRecord({
      userId: user?.id || null,
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

const server = app.listen(port, () => {
  console.log(`FitFuel Kitchen server listening on http://localhost:${port}`);
});

const websocketConfig = getRealtimeConfig();
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "connected", service: "fitfuel-realtime", heartbeatMs: websocketConfig.heartbeatMs }));
});

const heartbeat = setInterval(() => {
  const payload = JSON.stringify({ type: "heartbeat", at: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}, websocketConfig.heartbeatMs);

server.on("close", () => {
  clearInterval(heartbeat);
});
