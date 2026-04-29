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
