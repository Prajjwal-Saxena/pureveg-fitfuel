import crypto from "node:crypto";
import { db } from "./db.js";

const USER_SEGMENTS = [
  "employees",
  "work-from-home",
  "kids",
  "teens",
  "seniors",
  "gym-beginner",
  "gym-regular",
  "gym-advanced",
  "lactose-intolerant",
  "gluten-free",
  "womens-hormonal-support"
];

const MEDICAL_CONDITIONS = ["diabetes", "pcos", "thyroid", "heart-health"];
const BUDGET_BANDS = ["tight", "balanced", "premium"];

const loadPayloads = (table) =>
  db
    .prepare(`SELECT payload FROM ${table}`)
    .all()
    .map((row) => JSON.parse(row.payload));

function normalizeSlugList(values) {
  return values
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function inferUserSegments(item) {
  const segments = new Set();
  const haystack = `${item.name} ${item.category} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  const protein = Number(item.macros.protein || 0);
  const price = Number(item.price || 0);

  if (item.mealWindow === "Kids" || haystack.includes("kids")) segments.add("kids");
  if (item.mealWindow === "Seniors") segments.add("seniors");
  if (haystack.includes("workout") || haystack.includes("muscle") || protein >= 35) {
    segments.add("gym-beginner");
    segments.add("gym-regular");
  }
  if (protein >= 42) segments.add("gym-advanced");
  if (haystack.includes("quick") || haystack.includes("wrap") || haystack.includes("smoothie")) {
    segments.add("employees");
    segments.add("work-from-home");
    segments.add("teens");
  }
  if (haystack.includes("probiotic") || haystack.includes("berries") || haystack.includes("avocado")) {
    segments.add("womens-hormonal-support");
  }
  if (!item.allergens.includes("Dairy")) segments.add("lactose-intolerant");
  if (!item.allergens.includes("Gluten")) segments.add("gluten-free");
  if (price <= 220) {
    segments.add("employees");
    segments.add("teens");
  }

  return Array.from(segments);
}

function inferHealthGoals(item) {
  const goals = new Set();
  const haystack = `${item.name} ${item.category} ${item.description} ${item.tags.join(" ")} ${item.perfectFor.join(" ")}`.toLowerCase();
  const protein = Number(item.macros.protein || 0);
  const carbs = Number(item.macros.carbs || 0);
  const fiber = Number(item.macros.fiber || 0);

  if (protein >= 25) goals.add("high-protein");
  if (protein >= 35 && carbs <= 18) goals.add("low-carb");
  if (haystack.includes("weight loss") || haystack.includes("fat loss") || carbs <= 20) goals.add("weight-loss");
  if (haystack.includes("energy") || haystack.includes("pre-workout")) goals.add("energy-boosting");
  if (haystack.includes("heart") || item.allergens.includes("Fish")) goals.add("heart-health");
  if (fiber >= 8) goals.add("diabetes");
  if (haystack.includes("oats") || haystack.includes("millet") || haystack.includes("brown rice")) goals.add("thyroid");
  if (haystack.includes("probiotic") || haystack.includes("greek yogurt") || haystack.includes("paneer")) goals.add("pcos");

  return Array.from(goals);
}

function inferDietaryTags(item) {
  const tags = new Set(normalizeSlugList(item.tags));
  const haystack = `${item.name} ${item.category} ${item.description} ${item.tags.join(" ")}`.toLowerCase();

  if (haystack.includes("vegetarian") || haystack.includes("paneer") || haystack.includes("rajma")) tags.add("veg");
  if (haystack.includes("vegan") || (!item.allergens.includes("Dairy") && !item.allergens.includes("Eggs") && !haystack.includes("chicken") && !haystack.includes("fish"))) {
    tags.add("vegan");
  }
  if (item.allergens.includes("Fish")) tags.add("pescatarian");
  if (!item.allergens.includes("Gluten")) tags.add("gluten-free");
  if (!item.allergens.includes("Dairy")) tags.add("dairy-free");

  return Array.from(tags);
}

function enrichMenuItem(item) {
  return {
    ...item,
    userSegments: inferUserSegments(item),
    healthGoals: inferHealthGoals(item),
    dietaryTags: inferDietaryTags(item)
  };
}

function getMenuItems() {
  return loadPayloads("menu_items").map(enrichMenuItem);
}

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
        "Monthly macro testing with a +/-5% tolerance goal",
        "4-hour freshness windows",
        "Compostable packaging",
        "Live support with AI-first assistance"
      ]
    },
    catalogMeta: {
      userSegments: USER_SEGMENTS,
      medicalConditions: MEDICAL_CONDITIONS,
      budgetBands: BUDGET_BANDS,
      healthGoals: ["high-protein", "low-carb", "weight-loss", "energy-boosting", "diabetes", "pcos", "thyroid", "heart-health"],
      mealWindows: ["Breakfast", "Lunch", "Dinner", "Snacks", "Kids", "Seniors"]
    },
    menuItems: getMenuItems(),
    subscriptions: loadPayloads("subscriptions"),
    fitnessPlans: loadPayloads("fitness_plans"),
    offers: loadPayloads("offers")
  };
}

function budgetAllows(item, budgetLevel) {
  if (budgetLevel === "tight") return item.price <= 329;
  if (budgetLevel === "balanced") return item.price <= 449;
  return true;
}

function scoreCatalogItem(item, profile) {
  const dietaryPreference = String(profile?.dietaryPreference || profile?.preference || "any").toLowerCase();
  const medicalConditions = normalizeSlugList(profile?.medicalConditions || []);
  const userSegment = String(profile?.userSegment || "");
  let score = Number(item.macros.protein || 0);

  if (userSegment && item.userSegments.includes(userSegment)) score += 20;
  if (budgetAllows(item, profile?.budgetLevel || "balanced")) score += 10;

  if (dietaryPreference === "veg" && item.dietaryTags.includes("veg")) score += 18;
  if (dietaryPreference === "vegan" && item.dietaryTags.includes("vegan")) score += 18;
  if (dietaryPreference === "pescatarian" && item.dietaryTags.includes("pescatarian")) score += 18;
  if (dietaryPreference !== "any" && !item.dietaryTags.includes(dietaryPreference)) score -= 20;

  medicalConditions.forEach((condition) => {
    if (item.healthGoals.includes(condition)) score += 12;
  });

  if (profile?.goal === "lose-fat" && item.healthGoals.includes("weight-loss")) score += 14;
  if ((profile?.goal === "build-muscle" || profile?.goal === "athlete") && item.healthGoals.includes("high-protein")) score += 14;
  if (profile?.goal === "seniors" && item.userSegments.includes("seniors")) score += 16;
  if (profile?.goal === "kids" && item.userSegments.includes("kids")) score += 16;

  return score;
}

export function getPersonalizedCatalog(userId) {
  const profile = getProfileByUserId(userId);
  const menuItems = getMenuItems();
  const ranked = [...menuItems].sort((a, b) => scoreCatalogItem(b, profile) - scoreCatalogItem(a, profile));

  const sections = {
    forYou: ranked.slice(0, 6),
    budgetFriendly: ranked.filter((item) => item.price <= 329).slice(0, 6),
    highProtein: ranked.filter((item) => item.healthGoals.includes("high-protein")).slice(0, 6),
    conditionSupport: profile?.medicalConditions?.length
      ? ranked.filter((item) => profile.medicalConditions.some((condition) => item.healthGoals.includes(condition))).slice(0, 6)
      : [],
    quickMeals: ranked.filter((item) => item.userSegments.includes("employees") || item.userSegments.includes("work-from-home")).slice(0, 6)
  };

  return {
    profile,
    sections
  };
}

export function buildMealPlan(profile) {
  const targets = calculateTargets(profile);
  const menuItems = getMenuItems();
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

export function createOrderRecord({ userId, customer, notes, paymentMethod, quote, items }) {
  const orderNumber = `FFK-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `
      INSERT INTO orders (
        user_id, order_number, customer_name, customer_phone, customer_address, notes,
        payment_method, payment_status, subtotal, delivery_fee, discount, total,
        items_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      userId || null,
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

export function createGuestSession({ displayName, email, phone }) {
  const sessionToken = `ffk_${crypto.randomBytes(24).toString("hex")}`;
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `
        INSERT INTO users (
          session_token, auth_provider, auth_subject, display_name, email, phone, created_at, updated_at
        ) VALUES (?, 'guest', NULL, ?, ?, ?, ?, ?)
      `
    )
    .run(sessionToken, displayName || "Guest", email || null, phone || null, now, now);

  return {
    userId: row.lastInsertRowid,
    sessionToken,
    displayName: displayName || "Guest"
  };
}

export function getUserBySessionToken(sessionToken) {
  return db.prepare("SELECT * FROM users WHERE session_token = ?").get(sessionToken);
}

export function updateUserAccount(userId, account) {
  const now = new Date().toISOString();
  db.prepare(
    `
      UPDATE users
      SET display_name = ?, email = ?, phone = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(account.displayName, account.email || null, account.phone || null, now, userId);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

export function getProfileByUserId(userId) {
  const row = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
  if (!row) return null;
  return {
    age: row.age,
    weight: row.weight,
    heightFeet: row.height_feet,
    heightInches: row.height_inches,
    gender: row.gender,
    goal: row.goal,
    activity: row.activity,
    allergies: row.allergies || "",
    dietaryPreference: row.dietary_preference || "any",
    budgetLevel: row.budget_level || "balanced",
    medicalConditions: row.medical_conditions_json ? JSON.parse(row.medical_conditions_json) : [],
    userSegment: row.user_segment,
    onboardingCompleted: Boolean(row.onboarding_completed)
  };
}

export function upsertProfile(userId, profile) {
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO user_profiles (
        user_id, age, weight, height_feet, height_inches, gender, goal, activity, allergies,
        dietary_preference, budget_level, medical_conditions_json, user_segment, onboarding_completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        age=excluded.age,
        weight=excluded.weight,
        height_feet=excluded.height_feet,
        height_inches=excluded.height_inches,
        gender=excluded.gender,
        goal=excluded.goal,
        activity=excluded.activity,
        allergies=excluded.allergies,
        dietary_preference=excluded.dietary_preference,
        budget_level=excluded.budget_level,
        medical_conditions_json=excluded.medical_conditions_json,
        user_segment=excluded.user_segment,
        onboarding_completed=excluded.onboarding_completed,
        updated_at=excluded.updated_at
    `
  ).run(
    userId,
    profile.age,
    profile.weight,
    profile.heightFeet,
    profile.heightInches,
    profile.gender,
    profile.goal,
    profile.activity,
    profile.allergies || "",
    profile.dietaryPreference,
    profile.budgetLevel,
    JSON.stringify(profile.medicalConditions || []),
    profile.userSegment,
    profile.onboardingCompleted ? 1 : 0,
    now
  );

  return getProfileByUserId(userId);
}

export function getDashboardByUserId(userId) {
  const profile = getProfileByUserId(userId);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const orders = db
    .prepare(
      `
        SELECT *
        FROM orders
        WHERE user_id = ?
           OR (user_id IS NULL AND customer_phone IS NOT NULL AND customer_phone = ?)
        ORDER BY created_at DESC
        LIMIT 10
      `
    )
    .all(userId, user?.phone || "");

  const stats = orders.reduce(
    (acc, row) => {
      acc.ordersPlaced += 1;
      acc.totalSpend += row.total;
      return acc;
    },
    { ordersPlaced: 0, totalSpend: 0 }
  );

  return {
    account: {
      displayName: user?.display_name || "Guest",
      email: user?.email || "",
      phone: user?.phone || "",
      authProvider: user?.auth_provider || "guest"
    },
    profile,
    stats: {
      ...stats,
      activeSubscription: false,
      currentStreak: Math.min(stats.ordersPlaced, 7)
    },
    recentOrders: orders.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      total: row.total,
      paymentStatus: row.payment_status,
      createdAt: row.created_at
    }))
  };
}
