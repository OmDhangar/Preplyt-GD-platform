const { PAYMENT_PROVIDERS } = require('../../config/constants');

/**
 * Returns the active payment provider based on PAYMENT_PROVIDER env var.
 * All providers expose the same interface:
 *   createOrder, verifySignature, validateWebhook, fetchPayment, refund
 *
 * To add a new gateway: create a new provider file and add it to the map below.
 */
const getProvider = () => {
  const name = (process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDERS.RAZORPAY).toLowerCase();

  const providers = {
    [PAYMENT_PROVIDERS.RAZORPAY]: () => require('./razorpay.provider'),
    [PAYMENT_PROVIDERS.STRIPE]:   () => require('./stripe.provider'),
  };

  const load = providers[name];
  if (!load) {
    throw new Error(`Unknown payment provider: "${name}". Set PAYMENT_PROVIDER to razorpay or stripe.`);
  }
  return load();
};

module.exports = { getProvider };
