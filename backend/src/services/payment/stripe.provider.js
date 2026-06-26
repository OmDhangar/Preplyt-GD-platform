/**
 * Stripe payment provider — stub implementation.
 * Swap PAYMENT_PROVIDER=stripe in .env to activate.
 * Implement these methods following the same interface as razorpay.provider.js.
 */

const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  // TODO: implement with Stripe PaymentIntents
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const intent = await stripe.paymentIntents.create({ amount, currency, metadata: notes });
  throw new Error('Stripe provider not yet implemented. Set PAYMENT_PROVIDER=razorpay.');
};

const verifySignature = ({ orderId, paymentId, signature }) => {
  throw new Error('Stripe provider not yet implemented.');
};

const validateWebhook = (rawBody, signature) => {
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  throw new Error('Stripe provider not yet implemented.');
};

const fetchPayment = async (paymentId) => {
  throw new Error('Stripe provider not yet implemented.');
};

const refund = async (paymentId, amount) => {
  throw new Error('Stripe provider not yet implemented.');
};

module.exports = { createOrder, verifySignature, validateWebhook, fetchPayment, refund };
