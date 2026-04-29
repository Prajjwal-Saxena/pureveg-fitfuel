import Razorpay from "razorpay";
import crypto from "node:crypto";

function getClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

export async function createRazorpayOrder({ orderId, amount, notes }) {
  const client = getClient();
  if (!client) {
    return {
      mode: "configuration_required",
      amount,
      currency: "INR",
      displayMessage: "Configure Razorpay keys in the environment to accept live UPI and card payments."
    };
  }

  const order = await client.orders.create({
    amount,
    currency: "INR",
    receipt: orderId,
    notes
  });

  return {
    mode: "razorpay",
    amount: order.amount,
    currency: order.currency,
    orderId: order.id,
    receipt: order.receipt
  };
}

export function verifyRazorpaySignature(payload) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${payload.razorpay_order_id}|${payload.razorpay_payment_id}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === payload.razorpay_signature;
}
