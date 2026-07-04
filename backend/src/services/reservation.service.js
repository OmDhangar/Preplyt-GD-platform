const mongoose           = require('mongoose');
const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const logger             = require('../config/logger');
const { PARTICIPANT_STATUS } = require('../config/constants');

// ── Reservation time windows (ms) ──────────────────────────────────────────────
const PAID_RESERVATION_WINDOW_MS   = 15 * 60 * 1000; // 15 minutes for payment completion

/**
 * Remove expired reservations for a single session and decrement participantCount.
 * Called by both the cron cleanup job and on-demand before seat availability checks.
 *
 * @param {string} sessionId — ObjectId of the session
 * @returns {number} — number of expired reservations cleaned up
 */
const cleanupExpiredReservations = async (sessionId) => {
  const now = new Date();

  const expired = await SessionParticipant.find({
    sessionId,
    status:       PARTICIPANT_STATUS.RESERVED,
    reservedUntil: { $lte: now },
  });

  if (expired.length === 0) return 0;

  const expiredIds = expired.map((r) => r._id);

  // Remove the expired reservation documents
  await SessionParticipant.deleteMany({ _id: { $in: expiredIds } });

  // Recalculate participantCount from remaining active participants
  const activeCount = await SessionParticipant.countDocuments({
    sessionId,
    status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.ATTENDED, PARTICIPANT_STATUS.RESERVED] },
  });

  await GdSession.findByIdAndUpdate(sessionId, { participantCount: activeCount });

  logger.info(
    `[Reservation] Cleaned up ${expired.length} expired reservation(s) for session ${sessionId}`
  );

  return expired.length;
};

/**
 * Clean up all expired reservations across all sessions.
 * Called by the scheduler cron job.
 */
const cleanupAllExpiredReservations = async () => {
  const now = new Date();

  // Find all distinct sessions that have expired reservations
  const expiredDocs = await SessionParticipant.find({
    status:       PARTICIPANT_STATUS.RESERVED,
    reservedUntil: { $lte: now },
  }).distinct('sessionId');

  let totalCleaned = 0;
  for (const sessionId of expiredDocs) {
    totalCleaned += await cleanupExpiredReservations(sessionId);
  }

  if (totalCleaned > 0) {
    logger.info(`[Reservation] Global cleanup: removed ${totalCleaned} expired reservation(s)`);
  }

  return totalCleaned;
};

/**
 * Count the number of "booked" seats (registered + attended + active reservations).
 * Runs a cleanup first to discard expired reservations.
 *
 * @param {string} sessionId
 * @returns {number}
 */
const getBookedSeatsCount = async (sessionId) => {
  // Clean up expired reservations before counting
  await cleanupExpiredReservations(sessionId);

  return SessionParticipant.countDocuments({
    sessionId,
    status: { $in: [
      PARTICIPANT_STATUS.REGISTERED,
      PARTICIPANT_STATUS.ATTENDED,
      PARTICIPANT_STATUS.RESERVED,
    ] },
  });
};

/**
 * Atomically reserve a seat for a paid session.
 *
 * Uses MongoDB's findOneAndUpdate with a conditional filter on participantCount
 * to prevent overbooking in a race-condition-safe way.
 *
 * Flow:
 *   1. Clean up expired reservations for this session.
 *   2. Check if the student already has a reservation or registration.
 *   3. Use an atomic $inc on GdSession.participantCount with a guard
 *      (participantCount < maxParticipants) to claim the slot.
 *   4. Create a SessionParticipant with status='reserved' and a 15-min expiry.
 *
 * @param {string} sessionId
 * @param {string} studentId
 * @returns {{ participant: Object }} — the created/existing participant doc
 * @throws {Error} if the session is full or the student is already registered
 */
const reserveSeat = async (sessionId, studentId) => {
  // 1. Cleanup expired reservations first
  await cleanupExpiredReservations(sessionId);

  // 2. Check if student already has an active booking or reservation
  const existing = await SessionParticipant.findOne({
    sessionId,
    studentId,
    status: { $in: [
      PARTICIPANT_STATUS.REGISTERED,
      PARTICIPANT_STATUS.ATTENDED,
      PARTICIPANT_STATUS.RESERVED,
    ] },
  });

  if (existing) {
    if (existing.status === PARTICIPANT_STATUS.RESERVED) {
      // Extend the reservation window
      existing.reservedUntil = new Date(Date.now() + PAID_RESERVATION_WINDOW_MS);
      await existing.save();
      return { participant: existing };
    }
    // Already fully registered
    const err = new Error('You are already registered for this session.');
    err.statusCode = 409;
    throw err;
  }

  // 3. Atomically claim a slot: increment participantCount only if under the limit
  const session = await GdSession.findOneAndUpdate(
    {
      _id:              sessionId,
      $expr:            { $lt: ['$participantCount', '$maxParticipants'] },
    },
    { $inc: { participantCount: 1 } },
    { new: true }
  );

  if (!session) {
    const err = new Error('This session is full. No seats available.');
    err.statusCode = 409;
    throw err;
  }

  // 4. Create a reserved participant record
  const participant = await SessionParticipant.create({
    sessionId,
    studentId,
    status:       PARTICIPANT_STATUS.RESERVED,
    reservedUntil: new Date(Date.now() + PAID_RESERVATION_WINDOW_MS),
  });

  logger.info(
    `[Reservation] Seat reserved for student ${studentId} in session ${sessionId} ` +
    `(expires in ${PAID_RESERVATION_WINDOW_MS / 60000} min)`
  );

  return { participant };
};

/**
 * Check seat availability and join instantly (for unpaid/free sessions).
 *
 * Atomically increments participantCount only if under the limit,
 * then creates a fully registered participant.
 *
 * @param {string} sessionId
 * @param {string} studentId
 * @returns {{ participant: Object }}
 * @throws {Error} if the session is full
 */
const instantBook = async (sessionId, studentId) => {
  // Cleanup expired reservations first
  await cleanupExpiredReservations(sessionId);

  // Check if already registered
  const existing = await SessionParticipant.findOne({
    sessionId,
    studentId,
    status: { $in: [
      PARTICIPANT_STATUS.REGISTERED,
      PARTICIPANT_STATUS.ATTENDED,
    ] },
  });

  if (existing) {
    const err = new Error('You are already registered for this session.');
    err.statusCode = 409;
    throw err;
  }

  // Atomically claim a slot
  const session = await GdSession.findOneAndUpdate(
    {
      _id:   sessionId,
      $expr: { $lt: ['$participantCount', '$maxParticipants'] },
    },
    { $inc: { participantCount: 1 } },
    { new: true }
  );

  if (!session) {
    const err = new Error('This session is full. No seats available.');
    err.statusCode = 409;
    throw err;
  }

  // Create or update participant as registered
  const participant = await SessionParticipant.findOneAndUpdate(
    { sessionId, studentId },
    {
      $set: {
        isPaid:       true,
        status:       PARTICIPANT_STATUS.REGISTERED,
        registeredAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return { participant };
};

module.exports = {
  PAID_RESERVATION_WINDOW_MS,
  cleanupExpiredReservations,
  cleanupAllExpiredReservations,
  getBookedSeatsCount,
  reserveSeat,
  instantBook,
};
