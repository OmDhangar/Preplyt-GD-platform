const Razorpay = require('razorpay');
const crypto   = require('crypto');
const logger   = require('../../config/logger');

let instance;
const getInstance = () => {
  if (!instance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

/**
 * Create a Razorpay order.
 * @param {Object} opts
 * @param {number} opts.amount  - Amount in PAISE (INR × 100)
 * @param {string} opts.receipt - Internal receipt ID (e.g. paymentId)
 * @param {Object} opts.notes   - Key-value metadata stored on Razorpay
 */
const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const rz = getInstance();
  const order = await rz.orders.create({
    amount,       // paise
    currency,
    receipt,
    notes,
    payment_capture: 1,
  });
  logger.info(`[Razorpay] Order created: ${order.id}`);
  return {
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    key:      process.env.RAZORPAY_KEY_ID, // sent to frontend for checkout
  };
};

/**
 * Verify the payment signature returned by Razorpay checkout.
 * This is CRITICAL — never skip this step.
 */
const verifySignature = ({ orderId, paymentId, signature }) => {
  const body      = `${orderId}|${paymentId}`;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

/**
 * Validate a webhook request from Razorpay.
 * Returns the event object if valid, throws otherwise.
 */
const validateWebhook = (rawBody, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET not configured');
  }
  
  // Debug: Check what type we're getting
  logger.debug(`[Webhook] rawBody type: ${typeof rawBody}, isBuffer: ${Buffer.isBuffer(rawBody)}`);
  
  // Convert Buffer to string for HMAC calculation
  const bodyStr = Buffer.isBuffer(rawBody) 
    ? rawBody.toString('utf8')
    : typeof rawBody === 'string'
    ? rawBody
    : JSON.stringify(rawBody);
  
  logger.debug(`[Webhook] bodyStr length: ${bodyStr.length}`);
  logger.debug(`[Webhook] bodyStr (first 100 chars): ${bodyStr.substring(0, 100)}`);
  logger.debug(`[Webhook] signature from header: ${signature}`);
  
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(bodyStr)
    .digest('hex');

  logger.debug(`[Webhook] computed signature: ${expected}`);
  logger.debug(`[Webhook] signatures match: ${expected === signature}`);

  if (expected !== signature) {
    throw new Error('Invalid webhook signature');
  }

  return JSON.parse(bodyStr);
};

/**
 * Fetch a payment record from Razorpay (for server-side status verification).
 */
const fetchPayment = async (paymentId) => {
  const rz = getInstance();
  return rz.payments.fetch(paymentId);
};

/**
 * Initiate a refund.
 */
const refund = async (paymentId, amount) => {
  const rz = getInstance();
  const ref = await rz.payments.refund(paymentId, { amount });
  logger.info(`[Razorpay] Refund initiated: ${ref.id} for payment ${paymentId}`);
  return ref;
};

module.exports = { createOrder, verifySignature, validateWebhook, fetchPayment, refund };
