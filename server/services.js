import crypto from "node:crypto";
import { db } from "./db.js";

const loadPayloads = (table) =>
  db
    .prepare(`SELECT payload FROM ${table}`)
    .all()
    .map((row) => JSON.parse(row.payload));

function calculateTargets(profile) {
  const weight = Number(profile.weight);
  const height = Number(profile.height);
  const age = Number(profile.age);
  const goal = String(profile.goal);
  const activity = String(profile.activity);
  const gender = String(profile.gender);

  const baseBmr =
    gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.35,
    moderate: 1.5,
    active: 1.7,
    athlete: 1.9
  };

  const goalAdjustments = {
    "lose-fat": -350,
    maintain: 0,
    "build-muscle": 250,
    athlete: 300,
    kids: 150,
    seniors: -100,
    health: -150
  };

  const calories = Math.max(1200, Math.round(baseBmr * (activityMultipliers[activity] || 1.5) + (goalAdjustments[goal] || 0)));
  const proteinPerKg =
    goal === "build-muscle" || goal === "athlete" ? 2 : goal === "lose-fat" ? 1.8 : goal === "seniors" ? 1.4 : 1.6;
  const fats = Math.round((calories * (goal === "lose-fat" ? 0.28 : 0.25)) / 9);
  const protein = Math.round(weight * proteinPerKg);
  const carbs = Math.round((calories - protein * 4 - fats * 9) / 4);

  return {
    calories,
    protein,
    carbs,
    fats,
    fiber: goal === "lose-fat" ? 30 : 35,
    water: `${(weight * 0.04).toFixed(1)}L`,
    timing: goal === "athlete" ? "Pre-workout meal 90 minutes before training" : "Protein spread across 4-5 meals"
  };
}

function scoreMeal(item, profile, targets, excludedAllergens) {
  if (excludedAllergens.length && item.allergens.some((entry) => excludedAllergens.includes(entry.toLowerCase()))) {
    return -1000;
  }

  const preference = String(profile.preference || "any").toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  if (preference === "veg" && !tags.includes("vegetarian") && !item.name.toLowerCase().includes("paneer") && !item.name.toLowerCase().includes("rajma")) return -400;
  if (preference === "vegan" && !tags.includes("vegan")) return -400;
  if (preference === "pescatarian" && !tags.includes("pescatarian") && item.allergens.length && !item.allergens.includes("Fish")) return -220;

  let score = Math.min(item.macros.protein, targets.protein / 3) * 4;
  score -= Math.abs(item.macros.calories - targets.calories / 4) * 0.3;

  if (profile.goal === "lose-fat") {
    score += item.macros.protein * 2.8 - item.macros.fats;
  } else if (profile.goal === "build-muscle" || profile.goal === "athlete") {
    score += item.macros.protein * 2.1 + item.macros.carbs;
  }

  if (profile.goal === "kids" && item.mealWindow === "Kids") score += 180;
  if (profile.goal === "seniors" && item.mealWindow === "Seniors") score += 180;
  return score;
}

export function getCatalogPayload() {
  return {
    brand: {
      name: "FitFuel Kitchen",
      tagline: "Delhi NCR's First AI-Powered Macro Kitchen",
      subtitle: "Every gram counted. Every goal supported.",
      deliveryZones: ["Gurgaon", "South Delhi", "Noida"],
      supportHours: "8 AM - 10 PM",
      whatsapp: "+91-XXXXX-XXXXX",
      qualityPromises: [
        "Monthly macro testing with a ±5% tolerance goal",
        "4-hour freshness windows",
        "Compostable packaging",
        "Live support with AI-first assistance"
      ]
    },
    menuItems: loadPayloads("menu_items"),
    subscriptions: loadPayloads("subscriptions"),
    fitnessPlans: loadPayloads("fitness_plans"),
    offers: loadPayloads("offers")
  };
}

export function buildMealPlan(profile) {
  const targets = calculateTargets(profile);
  const menuItems = loadPayloads("menu_items");
  const allergies = String(profile.allergies || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const windows = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  const schedule = windows
    .map((window, index) => {
      const item = menuItems
        .filter((entry) => entry.mealWindow === window)
        .map((entry) => ({ entry, score: scoreMeal(entry, profile, targets, allergies) }))
        .sort((a, b) => b.score - a.score)[0]?.entry;
      if (!item) return null;
      const times = ["7:30 AM", "1:00 PM", "4:30 PM", "8:00 PM"];
      return { time: times[index], label: window, meal: item };
    })
    .filter(Boolean);

  const totals = schedule.reduce(
    (acc, entry) => {
      acc.calories += entry.meal.macros.calories;
      acc.protein += entry.meal.macros.protein;
      acc.carbs += entry.meal.macros.carbs;
      acc.fats += entry.meal.macros.fats;
      acc.cost += entry.meal.price;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0, cost: 0 }
  );

  const tips = [];
  if (profile.goal === "lose-fat") tips.push("Bias lunch and dinner toward leaner protein choices to stay full with fewer calories.");
  if (profile.goal === "build-muscle") tips.push("Hit at least 25g protein every meal window and put your biggest carb load after training.");
  if (profile.goal === "athlete") tips.push("Keep pre-workout meals lighter in fat and use faster carbs close to your session.");
  if (profile.goal === "seniors") tips.push("Use softer textures with steady protein to support appetite and recovery.");
  if (profile.goal === "kids") tips.push("Use repeatable favorites and add variety gradually through snacks and sides.");

  return {
    targets,
    totals,
    schedule,
    smartSwap:
      schedule[schedule.length - 1]?.meal?.allergens?.includes("Fish")
        ? "Switch dinner to Chicken Tikka Wrap if you want to save cost without losing much protein."
        : "Add Boiled Eggs or Greek Yogurt if you want an easy extra protein boost.",
    tips
  };
}

export function buildOrderSummary(items, couponCode) {
  const catalog = loadPayloads("menu_items");
  const enriched = items
    .map((entry) => {
      const item = catalog.find((candidate) => candidate.id === entry.id);
      if (!item) throw new Error(`Unknown menu item: ${entry.id}`);
      return {
        id: item.id,
        name: item.name,
        price: Number(entry.price || item.price),
        quantity: Number(entry.quantity || 1),
        image: item.image
      };
    })
    .filter(Boolean);

  const subtotal = enriched.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 699 ? 0 : 49;
  let discount = 0;
  if (couponCode === "FITFUEL40") discount = Math.round(subtotal * 0.4);
  if (couponCode === "REFER100") discount = 100;
  if (couponCode === "GYM15") discount = Math.round(subtotal * 0.15);
  discount = Math.min(discount, subtotal);

  return {
    items: enriched,
    subtotal,
    deliveryFee,
    discount,
    total: subtotal + deliveryFee - discount
  };
}

export function createOrderRecord({ customer, notes, paymentMethod, quote, items }) {
  const orderNumber = `FFK-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `
      INSERT INTO orders (
        order_number, customer_name, customer_phone, customer_address, notes,
        payment_method, payment_status, subtotal, delivery_fee, discount, total,
        items_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      orderNumber,
      customer.name,
      customer.phone,
      customer.address,
      notes || "",
      paymentMethod,
      paymentMethod === "cod" ? "cod_pending" : "created",
      quote.subtotal,
      quote.deliveryFee,
      quote.discount,
      quote.total,
      JSON.stringify(items),
      now,
      now
    );

  return {
    id: row.lastInsertRowid,
    orderNumber,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "cod_pending" : "created",
    customer,
    quote
  };
}

export function updateOrderPayment(orderId, payment) {
  const now = new Date().toISOString();
  db.prepare(
    `
      UPDATE orders
      SET payment_status = ?, payment_id = ?, gateway_order_id = ?, gateway_signature = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(payment.paymentStatus, payment.paymentId || null, payment.gatewayOrderId || null, payment.signature || null, now, orderId);

  return db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
}

export function listOrders() {
  return db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all()
    .map((row) => ({
      ...row,
      items: JSON.parse(row.items_json)
    }));
}
