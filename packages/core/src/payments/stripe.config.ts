/**
 * Stripe Configuration
 * Payment processing configuration for Apex Platform
 */

import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
});

export const STRIPE_CONFIG = {
    currency: 'egp',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
};

/**
 * Get Stripe instance
 */
export function getStripeClient(): Stripe {
    return stripe;
}
