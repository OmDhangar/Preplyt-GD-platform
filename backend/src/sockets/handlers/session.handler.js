const GdSession          = require('../../models/GdSession');
const SessionParticipant = require('../../models/SessionParticipant');
const logger             = require('../../config/logger');
const { SESSION_STATUS, SOCKET_EVENTS, ROLES } = require('../../config/constants');

/**
 * Tracks which sockets are in each session room.
 * Map<sessionId, Map<userId, Set<socketId>>>
 * Handles the multi-tab / multi-device scenario gracefully.
 */
const sessionPresence = new Map();

const addPresence = (sessionId, userId, socketId) => {
  if (!sessionPresence.has(sessionId)) {
    sessionPresence.set(sessionId, new Map());
  }
  const room = sessionPresence.get(sessionId);
  if (!room.has(userId)) room.set(userId, new Set());
  room.get(userId).add(socketId);
};

const removePresence = (sessionId, userId, socketId) => {
  const room = sessionPresence.get(sessionId);
  if (!room) return;
  room.get(userId)?.delete(socketId);
  if (room.get(userId)?.size === 0) room.delete(userId);
  if (room.size === 0) sessionPresence.delete(sessionId);
};

const getPresence = (sessionId) => {
  const room = sessionPresence.get(sessionId);
  if (!room) return [];
  return Array.from(room.entries()).map(([userId, sockets]) => ({
    userId,
    deviceCount: sockets.size,
  }));
};

/**
 * Registers session room handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server}  io
 */
const registerSessionHandlers = (socket, io) => {

  /**
   * session:join — join the Socket.IO room for a GD session.
   *
   * Payload: { sessionId }
   *
   * Authorization rules:
   *   - Instructors: must be instructorId or coInstructor
   *   - Students: must be a registered/invited participant
   *   - Admins: always allowed
   */
  socket.on(SOCKET_EVENTS.JOIN_SESSION, async ({ sessionId } = {}) => {
    try {
      if (!sessionId) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'sessionId is required' });
      }

      const session = await GdSession.findById(sessionId);
      if (!session) {
        return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not found' });
      }

      const userId = String(socket.user._id);
      const role   = socket.user.role;

      // ── Authorization ───────────────────────────────────────────────────────
      if (role === ROLES.INSTRUCTOR) {
        const owns = String(session.instructorId) === userId;
        const co   = session.coInstructors?.some((id) => String(id) === userId);
        if (!owns && !co) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Access denied to this session' });
        }
      } else if (role === ROLES.STUDENT) {
        const participant = await SessionParticipant.findOne({
          sessionId, studentId: socket.user._id,
        });
        if (!participant) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'You are not a participant of this session' });
        }
      }
      // admin falls through — always allowed

      const roomName = `session:${sessionId}`;
      await socket.join(roomName);

      // Track presence
      addPresence(sessionId, userId, socket.id);

      // Tell the rest of the room that someone joined
      socket.to(roomName).emit(SOCKET_EVENTS.PARTICIPANT_JOINED, {
        userId,
        name:        socket.user.name,
        role,
        deviceLabel: socket.deviceLabel,
        sessionId,
      });

      // Confirm join to the sender with current presence list
      socket.emit('session:joinAck', {
        sessionId,
        sessionStatus: session.status,
        presence:      getPresence(sessionId),
      });

      logger.info(
        `[Socket] ${role} ${socket.user.name} (${socket.id}) joined session:${sessionId}`
      );
    } catch (err) {
      logger.error('[Socket:join] Error:', err.message);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join session' });
    }
  });

  /**
   * session:leave — explicit leave (tab close sends this via beforeunload).
   * The disconnect handler also calls cleanup automatically.
   */
  socket.on(SOCKET_EVENTS.LEAVE_SESSION, ({ sessionId } = {}) => {
    if (!sessionId) return;
    const roomName = `session:${sessionId}`;
    socket.leave(roomName);
    removePresence(sessionId, String(socket.user._id), socket.id);
    logger.info(`[Socket] ${socket.user.name} left session:${sessionId}`);
  });

  /**
   * On disconnect — clean up all rooms this socket was in.
   */
  socket.on('disconnect', () => {
    // socket.rooms is empty by the time disconnect fires, so we iterate
    // our own presence map to find which sessions this socket was in
    for (const [sessionId, room] of sessionPresence.entries()) {
      const userId = String(socket.user._id);
      if (room.has(userId)) {
        removePresence(sessionId, userId, socket.id);
      }
    }
    logger.info(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
  });
};

module.exports = { registerSessionHandlers, getPresence };
