const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

async function getJson(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function run() {
  const health = await getJson("/api/health");
  const menu = await getJson("/api/menu");

  const session = await getJson("/api/auth/guest-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Smoke User" })
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.sessionToken}`
  };

  await getJson("/api/me/account", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      displayName: "Smoke User",
      email: "smoke@example.com",
      phone: "9999999999"
    })
  });

  const profile = await getJson("/api/me/profile", {
    headers: {
      Authorization: `Bearer ${session.sessionToken}`
    }
  });

  await getJson("/api/me/profile", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      age: 28,
      weight: 75,
      heightFeet: 5,
      heightInches: 9,
      gender: "male",
      goal: "build-muscle",
      activity: "moderate",
      allergies: "",
      dietaryPreference: "any",
      budgetLevel: "balanced",
      medicalConditions: ["thyroid"],
      userSegment: "employees",
      onboardingCompleted: true
    })
  });

  const personalized = await getJson("/api/menu/personalized", {
    headers: {
      Authorization: `Bearer ${session.sessionToken}`
    }
  });

  const planner = await getJson("/api/ai/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal: "build-muscle",
      activity: "moderate",
      age: 28,
      weight: 75,
      height: 175,
      preference: "any",
      allergies: "",
      gender: "male"
    })
  });

  const quote = await getJson("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: "grilled-chicken-quinoa-power-bowl", price: 399, quantity: 1 }],
      couponCode: "FITFUEL40"
    })
  });

  const order = await getJson("/api/checkout/create-order", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      couponCode: "",
      notes: "smoke-test",
      paymentMethod: "cod",
      items: [{ id: "grilled-chicken-quinoa-power-bowl", price: 399, quantity: 1 }],
      customer: {
        name: "Smoke User",
        phone: "9999999999",
        address: "Smoke Test Address, Gurgaon"
      }
    })
  });

  const dashboard = await getJson("/api/me/dashboard", {
    headers: {
      Authorization: `Bearer ${session.sessionToken}`
    }
  });

  console.log("Smoke test passed");
  console.log(
    JSON.stringify(
      {
        health,
        menuItems: menu.menuItems?.length || 0,
        subscriptions: menu.subscriptions?.length || 0,
        initialProfile: profile.profile,
        personalizedSections: {
          forYou: personalized.sections?.forYou?.length || 0,
          conditionSupport: personalized.sections?.conditionSupport?.length || 0
        },
        plannerMeals: planner.schedule?.length || 0,
        quotedTotal: quote.total,
        createdOrder: order.order?.orderNumber,
        dashboardOrders: dashboard.recentOrders?.length || 0
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error("Smoke test failed");
  console.error(error.message);
  process.exit(1);
});
