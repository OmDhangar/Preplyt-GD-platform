const GdSession          = require('../../models/GdSession');
const SessionParticipant = require('../../models/SessionParticipant');
const EvaluationRecord   = require('../../models/EvaluationRecord');
const logger             = require('../../config/logger');
const { SESSION_STATUS, SOCKET_EVENTS, ROLES } = require('../../config/constants');

/**
 * Registers evaluation socket handlers on a connected socket.
 *
 * Architecture: Socket events are BROADCAST-ONLY.
 * DB writes happen exclusively through REST PATCH /evaluations/batch.
 * This follows the architecture plan's "decouple socket sync from DB persistence" pattern.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server}  io
 */
const registerEvaluationHandlers = (socket, io) => {

  /**
   * eval:fieldUpdate — an instructor updated a single field.
   *
   * Payload: { sessionId, studentId, fieldId, value, scoredAt, deviceLabel }
   *
   * Server:
   *   1. Validates the instructor has access to this session.
   *   2. Broadcasts to the session room (excluding sender).
   *   No DB write here — the client flushes via REST every 5 seconds.
   */
  socket.on(SOCKET_EVENTS.FIELD_UPDATE, async (payload) => {
    try {
      const { sessionId, studentId, fieldId, value, scoredAt, deviceLabel } = payload;

      if (!sessionId || !studentId || !fieldId) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid fieldUpdate payload' });
      }

      // Confirm socket is in the right room (joined via session:join)
      const roomName = `session:${sessionId}`;
      if (!socket.rooms.has(roomName)) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not in session room' });
      }

      // Broadcast to everyone else in the room — no DB write
      socket.to(roomName).emit(SOCKET_EVENTS.FIELD_UPDATED, {
        sessionId,
        studentId,
        fieldId,
        value,
        scoredAt:    scoredAt || new Date().toISOString(),
        deviceLabel: deviceLabel || socket.deviceLabel,
        instructorId: String(socket.user._id),
      });
    } catch (err) {
      logger.error('[Socket:fieldUpdate] Error:', err.message);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Internal error processing field update' });
    }
  });

  /**
   * eval:syncDirty — sent on reconnect.
   * The client pushes all dirty fields accumulated while offline.
   * We write them to DB (special case: offline recovery) then broadcast.
   *
   * Payload: {
   *   sessionId,
   *   updates: [{ studentId, fieldValues: [{fieldId, value, scoredAt}] }]
   * }
   */
  socket.on(SOCKET_EVENTS.SYNC_DIRTY, async (payload) => {
    try {
      if (socket.user.role !== ROLES.INSTRUCTOR && socket.user.role !== 'admin') {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
      }

      const { sessionId, updates = [] } = payload;
      if (!sessionId || !updates.length) {
        return socket.emit(SOCKET_EVENTS.SYNC_DIRTY_ACK, { synced: 0 });
      }

      const session = await GdSession.findById(sessionId);
      if (!session || session.status !== SESSION_STATUS.ACTIVE) {
        return socket.emit(SOCKET_EVENTS.SYNC_DIRTY_ACK, { synced: 0, error: 'Session not active' });
      }

      // Validate instructor has access
      const owns = String(session.instructorId) === String(socket.user._id);
      const co   = session.coInstructors?.some((id) => String(id) === String(socket.user._id));
      if (!owns && !co) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Access denied' });
      }

      let synced = 0;

      // Write to DB (reconnect recovery — the only socket-triggered DB write)
      for (const { studentId, fieldValues = [] } of updates) {
        let record = await EvaluationRecord.findOne({
          sessionId,
          studentId,
          instructorId: socket.user._id,
        });

        if (!record) {
          record = new EvaluationRecord({
            sessionId,
            studentId,
            instructorId:    socket.user._id,
            templateId:      session.templateId,
            templateVersion: session.templateVersion,
          });
        }

        fieldValues.forEach((fv) => record.applyFieldUpdate(fv));
        record.version += 1;
        await record.save();
        synced++;

        // Broadcast synced fields to room
        const roomName = `session:${sessionId}`;
        socket.to(roomName).emit(SOCKET_EVENTS.FIELD_UPDATED, {
          sessionId,
          studentId,
          fieldValues,
          instructorId: String(socket.user._id),
          deviceLabel:  socket.deviceLabel,
          source:       'syncDirty',
        });
      }

      socket.emit(SOCKET_EVENTS.SYNC_DIRTY_ACK, { synced });
      logger.info(`[Socket:syncDirty] Instructor ${socket.user._id} synced ${synced} records for session ${sessionId}`);
    } catch (err) {
      logger.error('[Socket:syncDirty] Error:', err.message);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Sync failed' });
    }
  });
};

module.exports = { registerEvaluationHandlers };
