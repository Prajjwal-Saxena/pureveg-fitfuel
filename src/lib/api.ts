import type {
  AccountPayload,
  CartItem,
  CatalogPayload,
  CheckoutState,
  DashboardPayload,
  GuestSession,
  PersonalizedCatalogPayload,
  PlannerInputState,
  PlannerResult,
  ProfilePayload,
  QuotePayload,
  UserProfileResponse
} from "../types";

async function asJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload as T;
}

function authHeaders(sessionToken: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`
  };
}

export async function fetchCatalog(): Promise<CatalogPayload> {
  const response = await fetch("/api/menu");
  return asJson<CatalogPayload>(response);
}

export async function createGuestSession(): Promise<GuestSession> {
  const response = await fetch("/api/auth/guest-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  return asJson<GuestSession>(response);
}

export async function fetchProfile(sessionToken: string): Promise<UserProfileResponse> {
  const response = await fetch("/api/me/profile", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  return asJson<UserProfileResponse>(response);
}

export async function saveProfile(sessionToken: string, profile: ProfilePayload) {
  const response = await fetch("/api/me/profile", {
    method: "PUT",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(profile)
  });
  return asJson<{ ok: true; profile: ProfilePayload }>(response);
}

export async function fetchDashboard(sessionToken: string): Promise<DashboardPayload> {
  const response = await fetch("/api/me/dashboard", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  return asJson<DashboardPayload>(response);
}

export async function fetchPersonalizedCatalog(sessionToken: string): Promise<PersonalizedCatalogPayload> {
  const response = await fetch("/api/menu/personalized", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  return asJson<PersonalizedCatalogPayload>(response);
}

export async function saveAccount(sessionToken: string, account: AccountPayload) {
  const response = await fetch("/api/me/account", {
    method: "PUT",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(account)
  });
  return asJson<{ ok: true; account: DashboardPayload["account"] }>(response);
}

export async function trackAnalytics(sessionToken: string, event: string, properties: Record<string, string | number | boolean | null> = {}) {
  const response = await fetch("/api/analytics/track", {
    method: "POST",
    headers: authHeaders(sessionToken),
    body: JSON.stringify({ event, properties })
  });
  return asJson<{ tracked: boolean; reason?: string }>(response);
}

export async function fetchQuote(items: CartItem[], couponCode: string): Promise<QuotePayload> {
  const response = await fetch("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, couponCode })
  });
  return asJson<QuotePayload>(response);
}

export async function generatePlan(input: PlannerInputState): Promise<PlannerResult> {
  const height = Math.round((input.heightFeet * 12 + input.heightInches) * 2.54);
  const response = await fetch("/api/ai/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal: input.goal,
      activity: input.activity,
      age: input.age,
      weight: input.weight,
      height,
      preference: input.preference,
      allergies: input.allergies,
      gender: input.gender
    })
  });
  return asJson<PlannerResult>(response);
}

export async function createCheckoutOrder(items: CartItem[], checkout: CheckoutState) {
  const response = await fetch("/api/checkout/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(checkout.sessionToken ? { Authorization: `Bearer ${checkout.sessionToken}` } : {})
    },
    body: JSON.stringify({
      couponCode: checkout.couponCode,
      notes: checkout.notes,
      paymentMethod: checkout.paymentMethod,
      items: items.map(({ id, price, quantity }) => ({ id, price, quantity })),
      customer: {
        name: checkout.name,
        phone: checkout.phone,
        address: checkout.address
      }
    })
  });
  return asJson<any>(response);
}

export async function verifyPayment(payload: Record<string, unknown>) {
  const response = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return asJson<any>(response);
}
