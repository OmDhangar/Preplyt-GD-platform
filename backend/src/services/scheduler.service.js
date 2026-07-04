const cron    = require('node-cron');
const logger  = require('../config/logger');

/**
 * Cron-based reminder service.
 *
 * Runs every 5 minutes and sends reminder emails to all registered participants
 * of sessions scheduled to start within the next 30–35 minutes.
 *
 * How it works:
 *   1. Query for sessions where scheduledAt is 30–35 mins from now,
 *      status is 'scheduled', and reminderSent is false.
 *   2. For each matching session, send reminder emails to all
 *      registered / invited participants.
 *   3. Mark the session as reminderSent = true to prevent duplicates.
 *
 * The 5-minute window (30–35 mins) is wide enough that the cron job
 * (which runs every 5 mins) will always catch sessions exactly once.
 */

let isRunning = false;

const runReminderJob = async () => {
  // Prevent overlapping runs
  if (isRunning) return;
  isRunning = true;

  try {
    // Lazy-require to avoid circular dependency issues at startup
    const GdSession          = require('../models/GdSession');
    const SessionParticipant = require('../models/SessionParticipant');
    const User               = require('../models/User');
    const emailService       = require('./email.service');
    const { SESSION_STATUS, PARTICIPANT_STATUS } = require('../config/constants');

    const now = new Date();
    const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins from now
    const windowEnd   = new Date(now.getTime() + 35 * 60 * 1000); // 35 mins from now

    // Find sessions in the reminder window that haven't been reminded yet
    const sessions = await GdSession.find({
      status:       SESSION_STATUS.SCHEDULED,
      reminderSent: { $ne: true },
      scheduledAt:  { $gte: windowStart, $lte: windowEnd },
    }).populate('instructorId', 'name email');

    if (sessions.length === 0) {
      isRunning = false;
      return;
    }

    logger.info(`[Scheduler] Found ${sessions.length} session(s) needing reminders`);

    for (const session of sessions) {
      try {
        // Get all registered/invited participants
        const participants = await SessionParticipant.find({
          sessionId: session._id,
          status:    { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.INVITED] },
        }).populate('studentId', 'name email');

        const instructor = session.instructorId;
        let sentCount = 0;

        for (const p of participants) {
          if (p.studentId?.email) {
            emailService.sendGdReminder(p.studentId, session, instructor).catch((err) => {
              logger.warn(`[Scheduler] Failed to send reminder to ${p.studentId.email}: ${err.message}`);
            });
            sentCount++;
          }
        }

        // Mark as reminded so we don't send again
        session.reminderSent = true;
        await session.save();

        logger.info(
          `[Scheduler] Sent ${sentCount} reminder(s) for session "${session.title}" (${session._id})`
        );
      } catch (err) {
        logger.error(`[Scheduler] Error processing session ${session._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[Scheduler] Reminder job error: ${err.message}`);
  } finally {
    isRunning = false;
  }
};

/**
 * Start the cron scheduler.
 * Should be called once after DB connection is established.
 */
const startScheduler = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('[Scheduler] Running 30-minute reminder check...');
    runReminderJob();
  });

  logger.info('[Scheduler] 30-minute reminder cron started (runs every 5 minutes)');

  // ── Reservation cleanup — runs every minute ────────────────────────────────
  const { cleanupAllExpiredReservations } = require('./reservation.service');
  cron.schedule('* * * * *', async () => {
    try {
      await cleanupAllExpiredReservations();
    } catch (err) {
      logger.error(`[Scheduler] Reservation cleanup error: ${err.message}`);
    }
  });

  logger.info('[Scheduler] Expired reservation cleanup cron started (runs every minute)');
};

module.exports = { startScheduler, runReminderJob };
