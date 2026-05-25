export type Goal = "build-muscle" | "lose-fat" | "maintain" | "athlete" | "kids" | "seniors" | "health";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Preference = "any" | "veg" | "vegan" | "pescatarian";
export type Gender = "male" | "female";
export type PaymentMethod = "upi" | "card" | "cod";
export type BudgetLevel = "tight" | "balanced" | "premium";
export type UserSegment =
  | "employees"
  | "work-from-home"
  | "kids"
  | "teens"
  | "seniors"
  | "gym-beginner"
  | "gym-regular"
  | "gym-advanced"
  | "lactose-intolerant"
  | "gluten-free"
  | "womens-hormonal-support";

export interface MealSize {
  label: string;
  grams: number;
  protein: number;
  price: number;
  badge?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  mealWindow: string;
  category: string;
  description: string;
  price: number;
  sizes: MealSize[];
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  tags: string[];
  perfectFor: string[];
  allergens: string[];
  image: string;
  userSegments: UserSegment[];
  healthGoals: string[];
  dietaryTags: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  meals: string;
  price: number;
  originalPrice: number;
  save: string;
  highlight: boolean;
  perks: string[];
}

export interface BrandPayload {
  name: string;
  tagline: string;
  subtitle: string;
  deliveryZones: string[];
  supportHours: string;
  whatsapp: string;
  qualityPromises: string[];
}

export interface CatalogPayload {
  brand: BrandPayload;
  catalogMeta: {
    userSegments: UserSegment[];
    medicalConditions: string[];
    budgetBands: BudgetLevel[];
    healthGoals: string[];
    mealWindows: string[];
  };
  menuItems: MenuItem[];
  subscriptions: SubscriptionPlan[];
  fitnessPlans: Array<Record<string, unknown>>;
  offers: Array<Record<string, unknown>>;
}

export interface CartItem {
  key: string;
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface PlannerInputState {
  goal: Goal;
  activity: Activity;
  age: number;
  weight: number;
  heightFeet: number;
  heightInches: number;
  preference: Preference;
  allergies: string;
  gender: Gender;
  budgetLevel: BudgetLevel;
  medicalConditions: string[];
  userSegment: UserSegment;
}

export interface ProfilePayload extends PlannerInputState {
  dietaryPreference: Preference;
  onboardingCompleted: boolean;
}

export interface PlannerResult {
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    water: string;
    timing: string;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    cost: number;
  };
  schedule: Array<{
    time: string;
    label: string;
    meal: MenuItem;
  }>;
  smartSwap: string;
  tips: string[];
}

export interface QuotePayload {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

export interface CheckoutState {
  couponCode: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  paymentMethod: PaymentMethod;
  sessionToken?: string;
}

export interface GuestSession {
  userId: number;
  sessionToken: string;
  displayName: string;
}

export interface UserProfileResponse {
  user: {
    id: number;
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  profile: ProfilePayload | null;
}

export interface AccountPayload {
  displayName: string;
  email: string;
  phone: string;
}

export interface DashboardPayload {
  account: {
    displayName: string;
    email: string;
    phone: string;
    authProvider: string;
  };
  profile: ProfilePayload | null;
  stats: {
    ordersPlaced: number;
    totalSpend: number;
    activeSubscription: boolean;
    currentStreak: number;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    total: number;
    paymentStatus: string;
    createdAt: string;
  }>;
}

export interface PersonalizedCatalogPayload {
  profile: ProfilePayload | null;
  sections: {
    forYou: MenuItem[];
    budgetFriendly: MenuItem[];
    highProtein: MenuItem[];
    conditionSupport: MenuItem[];
    quickMeals: MenuItem[];
  };
}
