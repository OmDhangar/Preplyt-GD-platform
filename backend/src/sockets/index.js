const { Server }   = require('socket.io');
const socketAuth   = require('./socketAuth');
const { registerSessionHandlers }    = require('./handlers/session.handler');
const { registerEvaluationHandlers } = require('./handlers/evaluation.handler');
const logger = require('../config/logger');

/**
 * Bootstrap Socket.IO on the HTTP server.
 * Also attaches `io` to the Express app so controllers can emit events.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server} io
 */
const initSocketServer = (httpServer) => {
  const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());

  const io = new Server(httpServer, {
    cors: {
      origin:      allowedOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // Tune for real-time evaluation use-case:
    //  - ping every 10 s, disconnect after 25 s of silence
    pingInterval: 10_000,
    pingTimeout:  25_000,
    // Clients reconnect automatically with exponential back-off
    transports: ['websocket', 'polling'],
  });

  // ── Authentication middleware ─────────────────────────────────────────────
  io.use(socketAuth);

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(
      `[Socket] Connected: ${socket.user.name} (${socket.user.role}) — socket ${socket.id}`
    );

    // Register domain handlers
    registerSessionHandlers(socket, io);
    registerEvaluationHandlers(socket, io);

    socket.on('error', (err) => {
      logger.error(`[Socket] Error on ${socket.id}:`, err.message);
    });
  });

  // Make io available to Express controllers via req.app.get('io')
  // (set in app.js after server is created)
  logger.info(`[Socket] Server ready — allowed origins: ${allowedOrigins.join(', ')}`);

  return io;
};

module.exports = { initSocketServer };
