import OpenAI from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import Mixpanel from "mixpanel";
import twilio from "twilio";
import Stripe from "stripe";
import { getProfileByUserId, getDashboardByUserId } from "./services.js";

function required(value) {
  return Boolean(value && String(value).trim());
}

function getOpenAiClient() {
  if (!required(process.env.OPENAI_API_KEY)) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getLangchainModel() {
  if (!required(process.env.OPENAI_API_KEY)) return null;
  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
    temperature: 0.4
  });
}

function getPineconeClient() {
  if (!required(process.env.PINECONE_API_KEY)) return null;
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
}

function getMixpanelClient() {
  if (!required(process.env.MIXPANEL_TOKEN)) return null;
  return Mixpanel.init(process.env.MIXPANEL_TOKEN, { protocol: "https" });
}

function getTwilioClient() {
  if (!required(process.env.TWILIO_ACCOUNT_SID) || !required(process.env.TWILIO_AUTH_TOKEN)) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function getStripeClient() {
  if (!required(process.env.STRIPE_SECRET_KEY)) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function getIntegrationStatus() {
  return {
    openai: required(process.env.OPENAI_API_KEY),
    langchain: required(process.env.OPENAI_API_KEY),
    pinecone: required(process.env.PINECONE_API_KEY) && required(process.env.PINECONE_INDEX),
    mixpanel: required(process.env.MIXPANEL_TOKEN),
    twilio: required(process.env.TWILIO_ACCOUNT_SID) && required(process.env.TWILIO_AUTH_TOKEN) && required(process.env.TWILIO_WHATSAPP_FROM),
    stripe: required(process.env.STRIPE_SECRET_KEY),
    razorpay: required(process.env.RAZORPAY_KEY_ID) && required(process.env.RAZORPAY_KEY_SECRET),
    firebase: required(process.env.FIREBASE_PROJECT_ID) && required(process.env.FIREBASE_CLIENT_EMAIL) && required(process.env.FIREBASE_PRIVATE_KEY),
    n8n: required(process.env.N8N_WEBHOOK_BASE_URL),
    aws: required(process.env.AWS_REGION) && required(process.env.AWS_ACCESS_KEY_ID) && required(process.env.AWS_SECRET_ACCESS_KEY)
  };
}

function profileSummary(profile) {
  if (!profile) return "No saved profile yet.";
  return `Goal: ${profile.goal}; activity: ${profile.activity}; age: ${profile.age}; weight: ${profile.weight}kg; preference: ${profile.dietaryPreference}; budget: ${profile.budgetLevel}; conditions: ${profile.medicalConditions.join(", ") || "none"}; allergies: ${profile.allergies || "none"}.`;
}

function dashboardSummary(dashboard) {
  return `Orders: ${dashboard.stats.ordersPlaced}; total spend: ${dashboard.stats.totalSpend}; streak: ${dashboard.stats.currentStreak}; active subscription: ${dashboard.stats.activeSubscription}.`;
}

export async function generateCoachResponse({ user, message, conversation }) {
  const openai = getOpenAiClient();
  if (!openai) {
    throw new Error("OpenAI integration is not configured");
  }

  const profile = getProfileByUserId(user.id);
  const dashboard = getDashboardByUserId(user.id);
  const prompt = [
    "You are FitFuel Coach, an Indian nutrition and body transformation assistant.",
    "Be concise, practical, motivating, and explain the why behind meal suggestions.",
    "Focus on Indian food habits, gym timing, fasting, office routines, and adherence.",
    `User profile: ${profileSummary(profile)}`,
    `User dashboard: ${dashboardSummary(dashboard)}`,
    conversation?.length ? `Recent conversation summary: ${conversation.slice(-6).join(" | ")}` : "No prior conversation memory supplied.",
    `User message: ${message}`
  ].join("\n");

  const response = await openai.responses.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
    input: prompt
  });

  return {
    reply: response.output_text,
    profile,
    dashboard: {
      ordersPlaced: dashboard.stats.ordersPlaced,
      currentStreak: dashboard.stats.currentStreak
    }
  };
}

export async function analyzeFoodImage({ user, imageDataUrl, imageUrl, notes }) {
  const openai = getOpenAiClient();
  if (!openai) {
    throw new Error("OpenAI integration is not configured");
  }

  const profile = getProfileByUserId(user.id);
  const imageInput = imageUrl || imageDataUrl;
  if (!imageInput) {
    throw new Error("No image data supplied");
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Estimate the meal in this image for an Indian nutrition app.",
              "Return compact JSON with calories, protein, carbs, fats, sugar, confidence, likelyFoods, healthierAlternative, remainingMacroAdvice.",
              `User profile context: ${profileSummary(profile)}`,
              notes ? `User note: ${notes}` : ""
            ]
              .filter(Boolean)
              .join("\n")
          },
          {
            type: "input_image",
            image_url: imageInput
          }
        ]
      }
    ]
  });

  return {
    raw: response.output_text
  };
}

export async function trackAnalyticsEvent({ user, event, properties = {} }) {
  const mixpanel = getMixpanelClient();
  if (!mixpanel) {
    return { tracked: false, reason: "Mixpanel not configured" };
  }

  await new Promise((resolve, reject) => {
    mixpanel.track(event, { distinct_id: `fitfuel-user-${user.id}`, ...properties }, (error) => {
      if (error) reject(error);
      else resolve(null);
    });
  });

  return { tracked: true };
}

export async function createStripeCheckoutSession({ lineItems, customerEmail, successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: lineItems
  });
}

export async function sendWhatsAppAutomation({ to, body }) {
  const client = getTwilioClient();
  if (!client) {
    throw new Error("Twilio WhatsApp is not configured");
  }

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body
  });
}

export async function upsertUserMemory({ userId, memoryText, metadata = {} }) {
  const pinecone = getPineconeClient();
  if (!pinecone || !required(process.env.PINECONE_INDEX)) {
    return { stored: false, reason: "Pinecone not configured" };
  }

  const openai = getOpenAiClient();
  if (!openai) {
    return { stored: false, reason: "OpenAI embedding dependency not configured" };
  }

  const embedding = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: memoryText
  });

  const index = pinecone.index(process.env.PINECONE_INDEX);
  await index.namespace(`fitfuel-user-${userId}`).upsert([
    {
      id: `${Date.now()}`,
      values: embedding.data[0].embedding,
      metadata: {
        text: memoryText,
        ...metadata
      }
    }
  ]);

  return { stored: true };
}

export function getRealtimeConfig() {
  return {
    enabled: true,
    heartbeatMs: 15_000
  };
}
