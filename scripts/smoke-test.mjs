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

  console.log("Smoke test passed");
  console.log(
    JSON.stringify(
      {
        health,
        menuItems: menu.menuItems?.length || 0,
        subscriptions: menu.subscriptions?.length || 0,
        plannerMeals: planner.schedule?.length || 0,
        quotedTotal: quote.total
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
