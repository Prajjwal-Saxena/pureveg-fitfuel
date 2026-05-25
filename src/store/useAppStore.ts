import { create } from "zustand";
import type { CartItem, CheckoutState, PlannerInputState, ProfilePayload } from "../types";

const sessionTokenKey = "fitfuel_session_token";

export const plannerDefaults: PlannerInputState = {
  goal: "build-muscle",
  activity: "moderate",
  age: 28,
  weight: 75,
  heightFeet: 5,
  heightInches: 9,
  preference: "any",
  allergies: "",
  gender: "male",
  budgetLevel: "balanced",
  medicalConditions: [],
  userSegment: "employees"
};

export const checkoutDefaults: CheckoutState = {
  couponCode: "",
  name: "",
  phone: "",
  address: "",
  notes: "",
  paymentMethod: "upi"
};

interface AppStore {
  cart: CartItem[];
  plannerInput: PlannerInputState;
  checkout: CheckoutState;
  drawerOpen: boolean;
  sessionToken: string;
  profile: ProfilePayload | null;
  setDrawerOpen: (value: boolean) => void;
  setPlannerInput: (patch: Partial<PlannerInputState>) => void;
  setCheckout: (patch: Partial<CheckoutState>) => void;
  setSessionToken: (token: string) => void;
  setProfile: (profile: ProfilePayload | null) => void;
  hydratePlannerFromProfile: (profile: ProfilePayload | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  cart: [],
  plannerInput: plannerDefaults,
  checkout: checkoutDefaults,
  drawerOpen: false,
  sessionToken: typeof window === "undefined" ? "" : window.localStorage.getItem(sessionTokenKey) || "",
  profile: null,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setPlannerInput: (patch) => set((state) => ({ plannerInput: { ...state.plannerInput, ...patch } })),
  setCheckout: (patch) => set((state) => ({ checkout: { ...state.checkout, ...patch } })),
  setSessionToken: (sessionToken) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(sessionTokenKey, sessionToken);
    }
    set({ sessionToken });
  },
  setProfile: (profile) => set({ profile }),
  hydratePlannerFromProfile: (profile) =>
    set((state) => ({
      profile,
      plannerInput: profile
        ? {
            goal: profile.goal,
            activity: profile.activity,
            age: profile.age,
            weight: profile.weight,
            heightFeet: profile.heightFeet,
            heightInches: profile.heightInches,
            preference: profile.dietaryPreference,
            allergies: profile.allergies,
            gender: profile.gender,
            budgetLevel: profile.budgetLevel,
            medicalConditions: profile.medicalConditions,
            userSegment: profile.userSegment
          }
        : state.plannerInput
    })),
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((entry) => entry.key === item.key);
      return {
        cart: existing
          ? state.cart.map((entry) => (entry.key === item.key ? { ...entry, quantity: entry.quantity + 1 } : entry))
          : [...state.cart, item]
      };
    }),
  removeFromCart: (key) => set((state) => ({ cart: state.cart.filter((entry) => entry.key !== key) })),
  clearCart: () => set({ cart: [] })
}));
