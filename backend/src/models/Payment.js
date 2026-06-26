const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_PROVIDERS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    sessionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'GdSession',
      required: true,
    },
    participantId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'SessionParticipant',
      default: null,
    },

    // ── Provider-agnostic fields ─────────────────────────────────────────────
    provider: {
      type:    String,
      enum:    Object.values(PAYMENT_PROVIDERS),
      default: PAYMENT_PROVIDERS.RAZORPAY,
    },
    status: {
      type:    String,
      enum:    Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
    },
    amount:   { type: Number, required: true },    // in smallest currency unit (paise for INR)
    currency: { type: String, default: 'INR' },

    // ── Razorpay fields ──────────────────────────────────────────────────────
    razorpay: {
      orderId:      String, // rzp order id
      paymentId:    String, // rzp payment id (populated after success)
      signature:    String, // hmac signature for verification
    },

    // ── Stripe fields (stub for future) ─────────────────────────────────────
    stripe: {
      paymentIntentId: String,
      clientSecret:    String,
      chargeId:        String,
    },

    // ── Webhook tracking ─────────────────────────────────────────────────────
    webhookEvents: [{
      eventId:     String,
      eventType:   String,
      receivedAt:  { type: Date, default: Date.now },
      processed:   { type: Boolean, default: false },
    }],

    failureReason:  { type: String },
    refundId:       { type: String },   // provider refund id if refunded
    refundedAt:     { type: Date },
    paidAt:         { type: Date },

    // Raw provider response — useful for debugging
    providerResponse: { type: mongoose.Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ sessionId: 1 });
paymentSchema.index({ 'razorpay.orderId': 1 });
paymentSchema.index({ 'stripe.paymentIntentId': 1 });

module.exports = mongoose.model('Payment', paymentSchema);
