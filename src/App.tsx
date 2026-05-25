import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Brain, Lock, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import {
  createCheckoutOrder,
  createGuestSession,
  fetchCatalog,
  fetchDashboard,
  fetchPersonalizedCatalog,
  fetchProfile,
  fetchQuote,
  generatePlan,
  saveAccount,
  saveProfile,
  trackAnalytics,
  verifyPayment
} from "./lib/api";
import { identifyMixpanel, initMixpanel, trackMixpanel, trackMixpanelPage } from "./lib/mixpanel";
import { useAppStore } from "./store/useAppStore";
import { MealCard } from "./components/MealCard";
import { PlannerSection } from "./components/PlannerSection";
import { InfoCard } from "./components/InfoCard";
import { CartDrawer } from "./components/CartDrawer";
import { DashboardSection } from "./components/DashboardSection";
import { PersonalizedSections } from "./components/PersonalizedSections";
import type { AccountPayload, CartItem, ProfilePayload } from "./types";
import "./styles.css";

const queryClient = new QueryClient();

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if ((window as Window & { Razorpay?: unknown }).Razorpay) {
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

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function AppShell() {
  const queryClientInstance = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [plannerResult, setPlannerResult] = useState<any>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  const { cart, plannerInput, checkout, drawerOpen, sessionToken, setDrawerOpen, setPlannerInput, setCheckout, setSessionToken, hydratePlannerFromProfile, addToCart, removeFromCart, clearCart } =
    useAppStore();

  useEffect(() => {
    initMixpanel();
    trackMixpanelPage("FitFuel Home");
  }, []);

  const guestSessionMutation = useMutation({
    mutationFn: createGuestSession,
    onSuccess: (session) => {
      setSessionToken(session.sessionToken);
      identifyMixpanel(session.sessionToken);
      trackMixpanel("Guest Session Created", { user_id: session.userId });
    },
    onError: (error: Error) => toast(error.message)
  });

  useEffect(() => {
    if (!sessionToken) {
      guestSessionMutation.mutate();
    } else {
      identifyMixpanel(sessionToken);
    }
  }, [sessionToken]);

  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog
  });

  const profileQuery = useQuery({
    queryKey: ["profile", sessionToken],
    queryFn: () => fetchProfile(sessionToken),
    enabled: Boolean(sessionToken)
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", sessionToken],
    queryFn: () => fetchDashboard(sessionToken),
    enabled: Boolean(sessionToken)
  });

  const personalizedQuery = useQuery({
    queryKey: ["personalized", sessionToken],
    queryFn: () => fetchPersonalizedCatalog(sessionToken),
    enabled: Boolean(sessionToken)
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      hydratePlannerFromProfile(profileQuery.data.profile);
    }
  }, [profileQuery.data?.profile, hydratePlannerFromProfile]);

  useEffect(() => {
    if (dashboardQuery.data?.account) {
      const nextName = checkout.name || dashboardQuery.data.account.displayName || "";
      const nextPhone = checkout.phone || dashboardQuery.data.account.phone || "";
      if (nextName !== checkout.name || nextPhone !== checkout.phone) {
        setCheckout({
          name: nextName,
          phone: nextPhone
        });
      }
    }
  }, [dashboardQuery.data?.account, checkout.name, checkout.phone, setCheckout]);

  const quoteQuery = useQuery({
    queryKey: ["quote", cart, checkout.couponCode],
    queryFn: () => fetchQuote(cart, checkout.couponCode),
    enabled: cart.length > 0
  });

  const plannerMutation = useMutation({
    mutationFn: generatePlan,
    onSuccess: async (result) => {
      setPlannerResult(result);
      trackMixpanel("AI Plan Generated", {
        goal: plannerInput.goal,
        activity: plannerInput.activity,
        budget_level: plannerInput.budgetLevel,
        meals: result.schedule.length,
        calories: result.targets.calories
      });
      if (sessionToken) {
        await trackAnalytics(sessionToken, "AI Plan Generated", {
          goal: plannerInput.goal,
          activity: plannerInput.activity,
          budget_level: plannerInput.budgetLevel,
          meals: result.schedule.length,
          calories: result.targets.calories
        }).catch(() => null);
      }
    },
    onError: (error: Error) => toast(error.message)
  });

  const saveProfileMutation = useMutation({
    mutationFn: (profile: ProfilePayload) => saveProfile(sessionToken, profile),
    onSuccess: async (result) => {
      hydratePlannerFromProfile(result.profile);
      await Promise.all([
        queryClientInstance.invalidateQueries({ queryKey: ["profile", sessionToken] }),
        queryClientInstance.invalidateQueries({ queryKey: ["dashboard", sessionToken] }),
        queryClientInstance.invalidateQueries({ queryKey: ["personalized", sessionToken] })
      ]);
      trackMixpanel("Profile Saved", {
        goal: result.profile.goal,
        segment: result.profile.userSegment,
        budget_level: result.profile.budgetLevel
      });
      if (sessionToken) {
        await trackAnalytics(sessionToken, "Profile Saved", {
          goal: result.profile.goal,
          segment: result.profile.userSegment,
          budget_level: result.profile.budgetLevel
        }).catch(() => null);
      }
      toast("Profile saved");
    },
    onError: (error: Error) => toast(error.message)
  });

  const saveAccountMutation = useMutation({
    mutationFn: (account: AccountPayload) => saveAccount(sessionToken, account),
    onSuccess: async (result) => {
      await queryClientInstance.invalidateQueries({ queryKey: ["dashboard", sessionToken] });
      trackMixpanel("Account Saved", {
        has_email: Boolean(result.account.email),
        has_phone: Boolean(result.account.phone)
      });
      if (sessionToken) {
        await trackAnalytics(sessionToken, "Account Saved", {
          has_email: Boolean(result.account.email),
          has_phone: Boolean(result.account.phone)
        }).catch(() => null);
      }
      toast("Account details saved");
    },
    onError: (error: Error) => toast(error.message)
  });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const menuItems = catalogQuery.data?.menuItems || [];

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.category} ${item.healthGoals.join(" ")} ${item.userSegments.join(" ")}`.toLowerCase();
      const matchesFilter = filter === "All" || item.mealWindow === filter;
      return matchesFilter && haystack.includes(query.toLowerCase());
    });
  }, [menuItems, filter, query]);

  function toast(text: string) {
    setMessage(text);
    window.clearTimeout((toast as unknown as { timer?: number }).timer);
    (toast as unknown as { timer?: number }).timer = window.setTimeout(() => setMessage(""), 2400);
  }

  function handleAddToCart(cartItem: CartItem, itemName: string) {
    addToCart(cartItem);
    trackMixpanel("Added To Cart", {
      item_name: itemName,
      price: cartItem.price,
      quantity: cartItem.quantity
    });
    if (sessionToken) {
      void trackAnalytics(sessionToken, "Added To Cart", {
        item_name: itemName,
        price: cartItem.price,
        quantity: cartItem.quantity
      }).catch(() => null);
    }
    toast(`${itemName} added to cart`);
  }

  async function submitPlanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    plannerMutation.mutate(plannerInput);
  }

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) {
      toast("Add meals before checkout");
      return;
    }

    setPlacingOrder(true);
    trackMixpanel("Checkout Started", {
      cart_items: cart.length,
      payment_method: checkout.paymentMethod
    });
    if (sessionToken) {
      await trackAnalytics(sessionToken, "Checkout Started", {
        cart_items: cart.length,
        payment_method: checkout.paymentMethod
      }).catch(() => null);
    }

    try {
      const payload = await createCheckoutOrder(cart, { ...checkout, sessionToken });
      if (payload.payment.mode === "razorpay") {
        await loadRazorpayScript();
        const RazorpayCtor = (window as Window & { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
        const razorpay = new RazorpayCtor({
          key: payload.razorpayKeyId,
          amount: payload.payment.amount,
          currency: payload.payment.currency,
          name: "FitFuel Kitchen",
          description: "AI-powered macro meals",
          order_id: payload.payment.orderId,
          theme: { color: "#ef6c2f" },
          handler: async (paymentResponse: Record<string, unknown>) => {
            await verifyPayment({
              fitfuelOrderId: payload.order.id,
              ...paymentResponse
            });
            clearCart();
            setDrawerOpen(false);
            await queryClientInstance.invalidateQueries({ queryKey: ["dashboard", sessionToken] });
            trackMixpanel("Payment Confirmed", {
              order_number: payload.order.orderNumber,
              total: payload.order.quote.total,
              payment_mode: payload.payment.mode
            });
            if (sessionToken) {
              await trackAnalytics(sessionToken, "Payment Confirmed", {
                order_number: payload.order.orderNumber,
                total: payload.order.quote.total,
                payment_mode: payload.payment.mode
              }).catch(() => null);
            }
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
        clearCart();
        setDrawerOpen(false);
        await queryClientInstance.invalidateQueries({ queryKey: ["dashboard", sessionToken] });
        trackMixpanel("COD Order Created", {
          order_number: payload.order.orderNumber,
          total: payload.order.quote.total
        });
        if (sessionToken) {
          await trackAnalytics(sessionToken, "COD Order Created", {
            order_number: payload.order.orderNumber,
            total: payload.order.quote.total
          }).catch(() => null);
        }
        toast(`${payload.payment.displayMessage} Order ${payload.order.orderNumber} created.`);
      }
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setPlacingOrder(false);
    }
  }

  if (catalogQuery.isLoading || !catalogQuery.data) {
    return <div className="loading-screen">Loading FitFuel Kitchen...</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="pill">Phase 3 intelligence layer</span>
          <div>
            <h1>FitFuel Kitchen</h1>
            <p>{catalogQuery.data.brand.subtitle}</p>
          </div>
        </div>
        <nav className="nav">
          <a href="#planner">AI planner</a>
          <a href="#discover">Discover</a>
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
            <span className="eyebrow">Behavior-linked nutrition identity</span>
            <h2>FitFuel is shifting from a menu app toward a profile-aware nutrition operating system.</h2>
            <p>User-linked orders, account memory, and personalized discovery rails now sit on top of the meal catalog, which is the groundwork for retention, subscriptions, and AI-driven nudges.</p>
            <div className="hero-actions">
              <a className="primary" href="#planner">
                Complete profile
              </a>
              <a className="secondary" href="#discover">
                Explore recommendations
              </a>
            </div>
            <div className="stats">
              <div>
                <strong>Identity-linked orders</strong>
                <span>dashboard history no longer depends only on phone matching</span>
              </div>
              <div>
                <strong>Discovery rails</strong>
                <span>budget, segment, and condition-aware meal ranking</span>
              </div>
              <div>
                <strong>Account layer</strong>
                <span>saved details now flow into future checkout and retention systems</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/assets/hero-platter.svg" alt="FitFuel Kitchen premium platter illustration" />
            <div className="floating left">
              <Sparkles size={18} />
              <div>
                <strong>Personalized discovery</strong>
                <span>Meals are now ranked around user segment, budget, and health context instead of a flat catalog.</span>
              </div>
            </div>
            <div className="floating right">
              <Lock size={18} />
              <div>
                <strong>Operational graph</strong>
                <span>Account, profile, and order history are becoming one identity graph that later AI systems can learn from.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits">
          <article>
            <Brain size={20} />
            <h3>Profile-aware discovery</h3>
            <p>Catalog rails are now derived from saved preferences, health conditions, and budget level.</p>
          </article>
          <article>
            <ShieldCheck size={20} />
            <h3>Stronger account model</h3>
            <p>Orders can now link to user identity, making history and retention logic more reliable.</p>
          </article>
          <article>
            <Truck size={20} />
            <h3>Checkout continuity</h3>
            <p>Saved account information now starts flowing into ordering, which sets up repeat purchase ease and CRM triggers.</p>
          </article>
        </section>

        <DashboardSection
          dashboard={dashboardQuery.data ?? null}
          onSaveAccount={(account) => saveAccountMutation.mutate(account)}
          savingAccount={saveAccountMutation.isPending}
        />

        <PlannerSection
          catalogMeta={catalogQuery.data.catalogMeta}
          plannerInput={plannerInput}
          onPlannerChange={setPlannerInput}
          onSubmit={submitPlanner}
          onSaveProfile={(profile) => saveProfileMutation.mutate(profile)}
          planner={plannerResult}
          profileSaved={Boolean(profileQuery.data?.profile || saveProfileMutation.isSuccess)}
        />

        <div id="discover">
          <PersonalizedSections
            personalized={personalizedQuery.data ?? null}
            onAdd={(cartItem, meal) => handleAddToCart(cartItem, meal.name)}
          />
        </div>

        <section className="menu-panel" id="menu">
          <div className="menu-header">
            <div>
              <span className="pill">Menu browser</span>
              <h3>Catalog with richer taxonomy and search</h3>
              <p>Health goals, segments, and dietary tags are now part of the browsing layer.</p>
            </div>
            <div className="filters">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bowls, wraps, kids meals, high protein..." />
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                {["All", ...catalogQuery.data.catalogMeta.mealWindows].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="menu-grid">
            {filteredMenu.map((item) => (
              <MealCard key={item.id} item={item} onAdd={(cartItem) => handleAddToCart(cartItem, item.name)} />
            ))}
          </div>
        </section>

        <section className="infographics">
          <InfoCard image="/assets/macro-engine.svg" title="Profile-ranked discovery" text="Recommendation rails now use saved goal, budget, segment, and medical-condition context from the user profile." />
          <InfoCard image="/assets/freshness-flow.svg" title="Identity-linked ordering" text="Checkout can now attach orders to the current user session, which makes the dashboard more reliable for repeat behavior." />
          <InfoCard image="/assets/family-grid.svg" title="Account continuity" text="Saved name, phone, and email can now become the spine for CRM, automation, and subscription lifecycle logic." />
        </section>

        <section className="plans" id="plans">
          <div className="section-copy">
            <span className="pill">Subscriptions</span>
            <h3>Existing plans preserved while the intelligence layer grows</h3>
          </div>
          <div className="plan-grid">
            {catalogQuery.data.subscriptions.map((plan) => (
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

      <CartDrawer
        open={drawerOpen}
        cart={cart}
        quote={quoteQuery.data ?? null}
        checkout={checkout}
        paymentLink={catalogQuery.data.brand.paymentLink}
        placingOrder={placingOrder}
        onClose={() => setDrawerOpen(false)}
        onRemove={removeFromCart}
        onCheckoutChange={setCheckout}
        onSubmit={placeOrder}
      />

      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
