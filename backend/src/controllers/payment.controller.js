const Payment            = require('../models/Payment');
const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const Notification       = require('../models/Notification');
const User               = require('../models/User');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { success, created } = require('../utils/apiResponse');
const { getProvider }    = require('../services/payment');
const auditService       = require('../services/audit.service');
const emailService       = require('../services/email.service');
const logger             = require('../config/logger');
const {
  PAYMENT_STATUS, PARTICIPANT_STATUS,
  AUDIT_ACTIONS, NOTIFICATION_TYPES,
} = require('../config/constants');

// ── POST /api/payments/order ──────────────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.body;

  const session = await GdSession.findById(sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  if (!session.requiresPayment) {
    return next(new AppError('This session does not require payment.', 400));
  }

  // Check if already paid
  const existing = await Payment.findOne({
    userId:    req.user._id,
    sessionId: session._id,
    status:    PAYMENT_STATUS.PAID,
  });
  if (existing) {
    return next(new AppError('You have already paid for this session.', 409));
  }

  const provider = getProvider();
  const amount   = session.sessionFee.amount * 100; // convert to paise

  // Create order in payment gateway
  // Receipt must be <= 40 chars per Razorpay API
  const receipt = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const orderData = await provider.createOrder({
    amount,
    currency: session.sessionFee.currency || 'INR',
    receipt:  receipt,
    notes: {
      sessionId:   String(sessionId),
      sessionTitle: session.title,
      userId:      String(req.user._id),
    },
  });

  // Save payment record in DB
  const payment = await Payment.create({
    userId:    req.user._id,
    sessionId: session._id,
    provider:  process.env.PAYMENT_PROVIDER || 'razorpay',
    amount,
    currency:  session.sessionFee.currency || 'INR',
    status:    PAYMENT_STATUS.CREATED,
    razorpay: { orderId: orderData.orderId },
  });

  auditService.fromReq(req, {
    action:     AUDIT_ACTIONS.PAYMENT_ORDER,
    resource:   'Payment',
    resourceId: payment._id,
    metadata:   { sessionId, amount },
  });

  created(res, {
    paymentId:  payment._id,
    orderId:    orderData.orderId,
    amount:     orderData.amount,
    currency:   orderData.currency,
    key:        orderData.key,
    sessionTitle: session.title,
  }, 'Payment order created');
});

// ── POST /api/payments/verify ─────────────────────────────────────────────────
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { paymentId, orderId, razorpayPaymentId, razorpaySignature } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) return next(new AppError('Payment record not found.', 404));
  if (payment.status === PAYMENT_STATUS.PAID) {
    return success(res, { payment }, 'Payment already confirmed');
  }

  // Verify signature
  const provider = getProvider();
  const isValid  = provider.verifySignature({
    orderId:   orderId || payment.razorpay?.orderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValid) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = 'Signature verification failed';
    await payment.save();

    auditService.fromReq(req, {
      action:     AUDIT_ACTIONS.PAYMENT_VERIFIED,
      resource:   'Payment',
      resourceId: payment._id,
      success:    false,
      errorMsg:   'Invalid signature',
    });

    return next(new AppError('Payment verification failed. Invalid signature.', 400));
  }

  // Mark payment as paid
  payment.status              = PAYMENT_STATUS.PAID;
  payment.paidAt              = new Date();
  payment.razorpay.paymentId  = razorpayPaymentId;
  payment.razorpay.signature  = razorpaySignature;
  await payment.save();

  // Activate the session participant
  const participant = await SessionParticipant.findOneAndUpdate(
    { sessionId: payment.sessionId, studentId: payment.userId },
    {
      $set: {
        isPaid:       true,
        paymentId:    payment._id,
        status:       PARTICIPANT_STATUS.REGISTERED,
        registeredAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Add student to session students list
  await GdSession.findByIdAndUpdate(payment.sessionId, {
    $addToSet: { students: payment.userId }
  });

  // Notify student
  await Notification.create({
    userId:  payment.userId,
    type:    NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title:   'Payment Confirmed',
    message: `Your payment has been confirmed. You are registered for the session.`,
    data:    { sessionId: payment.sessionId, paymentId: payment._id },
  });

  // Send confirmation email + GD subscription email with all details and Meet link
  const session = await GdSession.findById(payment.sessionId)
    .populate('instructorId', 'name email');
  emailService.sendPaymentConfirmation(req.user, payment, session).catch(() => {});
  emailService.sendGdSubscription(req.user, session, session.instructorId).catch(() => {});

  auditService.fromReq(req, {
    action:     AUDIT_ACTIONS.PAYMENT_VERIFIED,
    resource:   'Payment',
    resourceId: payment._id,
    metadata:   { razorpayPaymentId },
  });

  success(res, { payment, participant }, 'Payment verified and registration confirmed');
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Raw body required — handled in app.js
exports.handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  let event;
  try {
    const provider = getProvider();
    // Use the raw body saved by app.js middleware (Buffer) for signature verification
    event = provider.validateWebhook(req.rawBody || req.body, signature);
  } catch (err) {
    logger.warn('[Webhook] Invalid signature:', err.message);
    return res.status(400).json({ received: false, error: 'Invalid webhook signature' });
  }

  const { event: eventType, payload } = event;
  logger.info(`[Webhook] Received: ${eventType}`);

  // Idempotency: check if we've already processed this event
  const eventId = event.account_id + '_' + (payload.payment?.entity?.id || event.created_at);
  const paymentEntity = payload.payment?.entity;

  if (!paymentEntity) {
    return res.status(200).json({ received: true });
  }

  // Find our payment by Razorpay order ID
  const payment = await Payment.findOne({ 'razorpay.orderId': paymentEntity.order_id });
  if (!payment) {
    logger.warn(`[Webhook] No payment found for order: ${paymentEntity.order_id}`);
    return res.status(200).json({ received: true });
  }

  // Track webhook events for debugging
  const alreadyProcessed = payment.webhookEvents?.some((e) => e.eventId === eventId);
  if (!alreadyProcessed) {
    payment.webhookEvents.push({ eventId, eventType, receivedAt: new Date() });
  }

  switch (eventType) {
    case 'payment.captured':
      if (payment.status !== PAYMENT_STATUS.PAID) {
        payment.status             = PAYMENT_STATUS.PAID;
        payment.paidAt             = new Date();
        payment.razorpay.paymentId = paymentEntity.id;
        payment.providerResponse   = paymentEntity;
        // Activate participant if not already done
        await SessionParticipant.findOneAndUpdate(
          { sessionId: payment.sessionId, studentId: payment.userId },
          {
            $set: {
              isPaid: true, paymentId: payment._id,
              status: PARTICIPANT_STATUS.REGISTERED, registeredAt: new Date(),
            },
          },
          { upsert: true }
        );
        // Add student to session students list
        await GdSession.findByIdAndUpdate(payment.sessionId, {
          $addToSet: { students: payment.userId }
        });

        // Send confirmation & subscription emails (non-blocking)
        const user = await User.findById(payment.userId);
        const session = await GdSession.findById(payment.sessionId)
          .populate('instructorId', 'name email');
        if (user && session) {
          emailService.sendPaymentConfirmation(user, payment, session).catch(() => {});
          emailService.sendGdSubscription(user, session, session.instructorId).catch(() => {});
        }
      }
      break;

    case 'payment.failed':
      payment.status        = PAYMENT_STATUS.FAILED;
      payment.failureReason = paymentEntity.error_description;
      await Notification.create({
        userId:  payment.userId,
        type:    NOTIFICATION_TYPES.PAYMENT_FAILED,
        title:   'Payment Failed',
        message: `Your payment for the session failed. Please try again.`,
        data:    { sessionId: payment.sessionId },
      });
      break;

    case 'refund.processed':
      payment.status    = PAYMENT_STATUS.REFUNDED;
      payment.refundId  = payload.refund?.entity?.id;
      payment.refundedAt = new Date();
      break;

    default:
      logger.info(`[Webhook] Unhandled event type: ${eventType}`);
  }

  if (!alreadyProcessed) {
    payment.webhookEvents[payment.webhookEvents.length - 1].processed = true;
  }

  await payment.save();

  auditService.log({
    action:   AUDIT_ACTIONS.PAYMENT_WEBHOOK,
    resource: 'Payment',
    resourceId: payment._id,
    metadata: { eventType },
  });

  res.status(200).json({ received: true });
});

// ── GET /api/payments/session/:sessionId ──────────────────────────────────────
exports.getSessionPaymentStatus = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findOne({
    userId:    req.user._id,
    sessionId: req.params.sessionId,
  }).sort({ createdAt: -1 });

  success(res, { payment });
});

// ── GET /api/payments/history ─────────────────────────────────────────────────
exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };
  const total  = await Payment.countDocuments(filter);
  const payments = await Payment
    .find(filter)
    .populate('sessionId', 'title scheduledAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  success(res, { payments, total, page: Number(page) });
});
