import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not set - Stripe payments will not work");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-12-15.clover" })
  : null;

export const PREMIUM_PRICE_MONTHLY = 999; // $9.99/month in cents
export const PREMIUM_PRICE_YEARLY = 9999; // $99.99/year in cents

export interface SubscriptionConfig {
  priceId?: string;
  productName: string;
  amount: number;
  interval: "month" | "year";
}

export const SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  productName: "AccessiBooks Premium",
  amount: PREMIUM_PRICE_MONTHLY,
  interval: "month",
};
