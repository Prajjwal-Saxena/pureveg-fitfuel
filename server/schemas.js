import { z } from "zod";

export const plannerSchema = z.object({
  goal: z.enum(["build-muscle", "lose-fat", "maintain", "athlete", "kids", "seniors", "health"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "athlete"]),
  age: z.coerce.number().min(5).max(90),
  weight: z.coerce.number().min(20).max(250),
  height: z.coerce.number().min(90).max(240),
  preference: z.enum(["any", "veg", "vegan", "pescatarian"]).default("any"),
  allergies: z.string().max(200).optional().default(""),
  gender: z.enum(["male", "female"]).default("male")
});

export const guestSessionSchema = z.object({
  displayName: z.string().max(100).optional().default(""),
  email: z.string().email().max(160).optional().or(z.literal("")).default(""),
  phone: z.string().max(20).optional().default("")
});

export const accountSchema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email().max(160).optional().or(z.literal("")).default(""),
  phone: z.string().min(8).max(20).optional().or(z.literal("")).default("")
});

export const coachMessageSchema = z.object({
  message: z.string().min(2).max(1500),
  conversation: z.array(z.string().min(1).max(500)).max(12).optional().default([])
});

export const analyticsEventSchema = z.object({
  event: z.string().min(2).max(120),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({})
});

export const stripeCheckoutSchema = z.object({
  lineItems: z
    .array(
      z.object({
        price_data: z.object({
          currency: z.string().min(3).max(3),
          product_data: z.object({
            name: z.string().min(2).max(120)
          }),
          unit_amount: z.number().int().min(1)
        }),
        quantity: z.number().int().min(1).max(20)
      })
    )
    .min(1),
  customerEmail: z.string().email().optional().or(z.literal("")).default(""),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

export const whatsappSchema = z.object({
  to: z.string().min(8).max(40),
  body: z.string().min(2).max(1000)
});

export const profileSchema = z.object({
  age: z.coerce.number().min(5).max(90),
  weight: z.coerce.number().min(20).max(250),
  heightFeet: z.coerce.number().min(3).max(8),
  heightInches: z.coerce.number().min(0).max(11),
  gender: z.enum(["male", "female"]),
  goal: z.enum(["build-muscle", "lose-fat", "maintain", "athlete", "kids", "seniors", "health"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "athlete"]),
  allergies: z.string().max(200).optional().default(""),
  dietaryPreference: z.enum(["any", "veg", "vegan", "pescatarian"]).default("any"),
  budgetLevel: z.enum(["tight", "balanced", "premium"]).default("balanced"),
  medicalConditions: z.array(z.string().min(2).max(40)).max(8).default([]),
  userSegment: z.enum([
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
  ]),
  onboardingCompleted: z.boolean().default(true)
});

const lineItemSchema = z.object({
  id: z.string().min(2),
  price: z.number().min(1),
  quantity: z.number().int().min(1).max(20)
});

export const checkoutSchema = z.object({
  couponCode: z.string().max(32).optional(),
  notes: z.string().max(500).optional().default(""),
  paymentMethod: z.enum(["upi", "card", "cod"]),
  items: z.array(lineItemSchema).min(1),
  customer: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(8).max(20),
    address: z.string().min(10).max(300)
  })
});

export const verifySchema = z.object({
  fitfuelOrderId: z.coerce.number().int().positive(),
  razorpay_order_id: z.string().min(6),
  razorpay_payment_id: z.string().min(6),
  razorpay_signature: z.string().min(12)
});
