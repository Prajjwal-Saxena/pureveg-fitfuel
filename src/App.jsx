import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgePercent,
  Brain,
  Flame,
  HeartPulse,
  Leaf,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck
} from "lucide-react";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const plannerDefaults = {
  goal: "build-muscle",
  activity: "moderate",
  age: 28,
  weight: 75,
  height: 175,
  preference: "any",
  allergies: "",
  gender: "male"
};

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [planner, setPlanner] = useState(null);
  const [plannerInput, setPlannerInput] = useState(plannerDefaults);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState({
    couponCode: "",
    name: "",
    phone: "",
    address: "",
    notes: "",
    paymentMethod: "upi"
  });
  const [quote, setQuote] = useState(null);
  const [message, setMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetch("/api/menu")
      .then((response) => response.json())
      .then(setCatalog)
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      return;
    }
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, couponCode: checkout.couponCode })
    })
      .then((response) => response.json())
      .then(setQuote)
      .catch((error) => setMessage(error.message));
  }, [cart, checkout.couponCode]);

  const menuItems = catalog?.menuItems || [];

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.category}`.toLowerCase();
      const matchesFilter = filter === "All" || item.mealWindow === filter;
      return matchesFilter && haystack.includes(query.toLowerCase());
    });
  }, [menuItems, filter, query]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function toast(text) {
    setMessage(text);
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => setMessage(""), 2400);
  }

  function addToCart(item, size) {
    const key = `${item.id}:${size.label}`;
    setCart((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) => (entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...current, { key, id: item.id, price: size.price, quantity: 1, name: `${item.name} (${size.label})` }];
    });
    toast(`${item.name} added to cart`);
  }

  function removeFromCart(key) {
    setCart((current) => current.filter((entry) => entry.key !== key));
  }

  async function submitPlanner(event) {
    event.preventDefault();
    const response = await fetch("/api/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plannerInput)
    });
    const payload = await response.json();
    if (!response.ok) {
      toast(payload.error || "Unable to generate plan");
      return;
    }
    setPlanner(payload);
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (!cart.length) {
      toast("Add meals before checkout");
      return;
    }

    setPlacingOrder(true);
    try {
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: checkout.couponCode,
          notes: checkout.notes,
          paymentMethod: checkout.paymentMethod,
          items: cart.map(({ id, price, quantity }) => ({ id, price, quantity })),
          customer: {
            name: checkout.name,
            phone: checkout.phone,
            address: checkout.address
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create order");

      if (payload.payment.mode === "razorpay") {
        await loadRazorpayScript();
        const razorpay = new window.Razorpay({
          key: payload.razorpayKeyId,
          amount: payload.payment.amount,
          currency: payload.payment.currency,
          name: "FitFuel Kitchen",
          description: "AI-powered macro meals",
          order_id: payload.payment.orderId,
          theme: { color: "#ef6c2f" },
          handler: async (paymentResponse) => {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fitfuelOrderId: payload.order.id,
                ...paymentResponse
              })
            });
            const verifyPayload = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyPayload.error || "Payment verification failed");
            setCart([]);
            setDrawerOpen(false);
            toast(`Payment confirmed. Order ${payload.order.orderNumber} is live.`);
          },
          prefill: {
            name: checkout.name,
            contact: checkout.phone
          },
          notes: {
            fitfuelOrderNumber: payload.order.orderNumber
          }
        });
        razorpay.open();
      } else {
        setCart([]);
        setDrawerOpen(false);
        toast(`${payload.payment.displayMessage} Order ${payload.order.orderNumber} created.`);
      }
    } catch (error) {
      toast(error.message);
    } finally {
      setPlacingOrder(false);
    }
  }

  if (!catalog) {
    return <div className="loading-screen">Loading FitFuel Kitchen...</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="pill">Delhi NCR's first AI macro kitchen</span>
          <div>
            <h1>FitFuel Kitchen</h1>
            <p>{catalog.brand.subtitle}</p>
          </div>
        </div>
        <nav className="nav">
          <a href="#planner">AI planner</a>
          <a href="#menu">Menu</a>
          <a href="#plans">Plans</a>
          <button className="cart-trigger" type="button" onClick={() => setDrawerOpen(true)}>
            <ShoppingBag size={18} />
            <span>{cartCount}</span>
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Conversion-first nutrition commerce</span>
            <h2>Performance meals that look indulgent, travel beautifully, and check out securely.</h2>
            <p>
              FitFuel Kitchen combines macro-aware recommendations, family-ready menu planning, and production-grade
              payments into one polished ordering flow.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#menu">
                Start ordering
              </a>
              <a className="secondary" href="#planner">
                Generate my macros
              </a>
            </div>
            <div className="stats">
              <div>
                <strong>36+</strong>
                <span>menu items</span>
              </div>
              <div>
                <strong>60 min</strong>
                <span>delivery promise</span>
              </div>
              <div>
                <strong>Razorpay</strong>
                <span>secure payments</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/assets/hero-platter.svg" alt="FitFuel Kitchen premium platter illustration" />
            <div className="floating left">
              <Sparkles size={18} />
              <div>
                <strong>Smart meal matching</strong>
                <span>Goals, allergies, lifestyle, and budget in one recommendation engine.</span>
              </div>
            </div>
            <div className="floating right">
              <Lock size={18} />
              <div>
                <strong>Secure checkout</strong>
                <span>UPI, card, and webhook-backed payment verification.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits">
          <article>
            <Brain size={20} />
            <h3>AI that sells</h3>
            <p>Recommendations are personalized enough to feel coached, not filtered.</p>
          </article>
          <article>
            <ShieldCheck size={20} />
            <h3>Production backend</h3>
            <p>Structured validation, hardened routes, WAL-mode persistence, and payment verification.</p>
          </article>
          <article>
            <Truck size={20} />
            <h3>Operational trust</h3>
            <p>Freshness windows, delivery coverage, and policy promises are visible in the experience.</p>
          </article>
        </section>

        <section className="planner-panel" id="planner">
          <div className="section-copy">
            <span className="pill">AI planner</span>
            <h3>Your nutrition concierge</h3>
            <p>Build a daily plan around your body, training intensity, food preference, and real-world constraints.</p>
          </div>
          <div className="planner-grid">
            <form className="planner-form" onSubmit={submitPlanner}>
              {[
                ["Goal", "goal", "select", ["build-muscle", "lose-fat", "maintain", "athlete", "kids", "seniors", "health"]],
                ["Activity", "activity", "select", ["sedentary", "light", "moderate", "active", "athlete"]],
                ["Age", "age", "number"],
                ["Weight (kg)", "weight", "number"],
                ["Height (cm)", "height", "number"],
                ["Preference", "preference", "select", ["any", "veg", "vegan", "pescatarian"]],
                ["Allergies", "allergies", "text"],
                ["Gender", "gender", "select", ["male", "female"]]
              ].map(([label, key, kind, options]) => (
                <label key={key}>
                  <span>{label}</span>
                  {kind === "select" ? (
                    <select value={plannerInput[key]} onChange={(event) => setPlannerInput({ ...plannerInput, [key]: event.target.value })}>
                      {options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={kind}
                      value={plannerInput[key]}
                      onChange={(event) => setPlannerInput({ ...plannerInput, [key]: kind === "number" ? Number(event.target.value) : event.target.value })}
                    />
                  )}
                </label>
              ))}
              <button className="primary" type="submit">
                Generate meal plan
              </button>
            </form>
            <div className="planner-output">
              {planner ? (
                <>
                  <div className="target-grid">
                    <MetricCard icon={<Flame size={18} />} label="Calories" value={planner.targets.calories} />
                    <MetricCard icon={<Activity size={18} />} label="Protein" value={`${planner.targets.protein}g`} />
                    <MetricCard icon={<Leaf size={18} />} label="Carbs" value={`${planner.targets.carbs}g`} />
                    <MetricCard icon={<HeartPulse size={18} />} label="Fats" value={`${planner.targets.fats}g`} />
                  </div>
                  <div className="schedule">
                    {planner.schedule.map((entry) => (
                      <article key={`${entry.time}-${entry.label}`} className="schedule-card">
                        <span>
                          {entry.time} • {entry.label}
                        </span>
                        <strong>{entry.meal.name}</strong>
                        <p>
                          {entry.meal.macros.protein}g protein • {entry.meal.macros.calories} kcal • {money.format(entry.meal.price)}
                        </p>
                      </article>
                    ))}
                  </div>
                  <div className="coach-note">
                    <strong>Smart swap</strong>
                    <p>{planner.smartSwap}</p>
                    <p>
                      Estimated day total: {planner.totals.protein}g protein • {planner.totals.calories} kcal •{" "}
                      {money.format(planner.totals.cost)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="placeholder-card">
                  <h4>Targets appear here</h4>
                  <p>Submit the profile and the app will generate macros, meals, and a cleaner eating schedule.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="menu-panel" id="menu">
          <div className="menu-header">
            <div>
              <span className="pill">Menu browser</span>
              <h3>Food-first browsing with macro transparency</h3>
            </div>
            <div className="filters">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bowls, wraps, kids meals..." />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                {["All", "Breakfast", "Lunch", "Dinner", "Snacks", "Kids", "Seniors"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="menu-grid">
            {filteredMenu.map((item) => (
              <MealCard key={item.id} item={item} addToCart={addToCart} />
            ))}
          </div>
        </section>

        <section className="infographics">
          <InfoCard image="/assets/macro-engine.svg" title="AI meal engine" text="Profile inputs become macro targets, then meals are ranked by protein density, fit, and practicality." />
          <InfoCard image="/assets/freshness-flow.svg" title="Freshness pipeline" text="Batch cooking windows, insulated dispatch, and visible service promises reassure the buyer before checkout." />
          <InfoCard image="/assets/family-grid.svg" title="One kitchen, many lifestyles" text="The same system supports gym meals, family packs, child-friendly plates, and senior wellness." />
        </section>

        <section className="plans" id="plans">
          <div className="section-copy">
            <span className="pill">Subscriptions</span>
            <h3>Consistency plans built to stick</h3>
          </div>
          <div className="plan-grid">
            {catalog.subscriptions.map((plan) => (
              <article className={`plan-card ${plan.highlight ? "highlight" : ""}`} key={plan.id}>
                <span className="offer-tag">
                  <BadgePercent size={16} />
                  {plan.save}
                </span>
                <h4>{plan.name}</h4>
                <strong>{money.format(plan.price)}</strong>
                <p>{plan.meals}</p>
                <ul>
                  {plan.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h3>Your order</h3>
          <button className="secondary small" type="button" onClick={() => setDrawerOpen(false)}>
            Close
          </button>
        </div>
        <div className="drawer-body">
          {cart.length ? (
            cart.map((entry) => (
              <div className="cart-line" key={entry.key}>
                <div>
                  <strong>{entry.name}</strong>
                  <p>
                    {money.format(entry.price)} × {entry.quantity}
                  </p>
                </div>
                <button type="button" onClick={() => removeFromCart(entry.key)}>
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="placeholder-card compact">
              <p>Your cart is empty.</p>
            </div>
          )}

          <form className="checkout-form" onSubmit={placeOrder}>
            <label>
              <span>Promo code</span>
              <input value={checkout.couponCode} onChange={(event) => setCheckout({ ...checkout, couponCode: event.target.value })} />
            </label>
            <label>
              <span>Name</span>
              <input value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} required />
            </label>
            <label>
              <span>Phone</span>
              <input value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} required />
            </label>
            <label>
              <span>Address</span>
              <textarea value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} required />
            </label>
            <label>
              <span>Payment method</span>
              <select value={checkout.paymentMethod} onChange={(event) => setCheckout({ ...checkout, paymentMethod: event.target.value })}>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cod">Cash on delivery</option>
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea value={checkout.notes} onChange={(event) => setCheckout({ ...checkout, notes: event.target.value })} />
            </label>
            {quote && (
              <div className="quote">
                <div>
                  <span>Subtotal</span>
                  <strong>{money.format(quote.subtotal)}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{quote.deliveryFee ? money.format(quote.deliveryFee) : "Free"}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>-{money.format(quote.discount)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>{money.format(quote.total)}</strong>
                </div>
              </div>
            )}
            <button className="primary" disabled={placingOrder} type="submit">
              {placingOrder ? "Creating order..." : "Proceed to payment"}
            </button>
          </form>
        </div>
      </aside>

      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="metric-card">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function MealCard({ item, addToCart }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const size = item.sizes[selectedIndex];

  return (
    <article className="meal-card">
      <div className="meal-image">
        <img src={item.image} alt={item.name} />
      </div>
      <div className="meal-content">
        <div className="meal-meta">
          <span>{item.mealWindow}</span>
          <span>{item.category}</span>
        </div>
        <h4>{item.name}</h4>
        <p>{item.description}</p>
        <div className="macro-tags">
          <span>{item.macros.protein}g protein</span>
          <span>{item.macros.calories} kcal</span>
          <span>{item.macros.carbs}g carbs</span>
        </div>
        <div className="size-row">
          {item.sizes.map((entry, index) => (
            <button
              key={`${item.id}-${entry.label}`}
              className={selectedIndex === index ? "active" : ""}
              type="button"
              onClick={() => setSelectedIndex(index)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="meal-footer">
          <div>
            <strong>{money.format(size.price)}</strong>
            <span>
              {size.grams}g • {size.protein}g protein
            </span>
          </div>
          <button className="primary small" type="button" onClick={() => addToCart(item, size)}>
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ image, title, text }) {
  return (
    <article className="info-card">
      <img src={image} alt={title} />
      <h4>{title}</h4>
      <p>{text}</p>
    </article>
  );
}
