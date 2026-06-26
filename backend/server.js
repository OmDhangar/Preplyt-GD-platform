require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');
const { initSocketServer } = require('./src/sockets');
const { startScheduler }   = require('./src/services/scheduler.service');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to MongoDB before accepting requests
  await connectDB();

  const server = http.createServer(app);

  // Boot up Socket.IO — passes the http server so WS and HTTP share one port
  initSocketServer(server);

  // Start cron-based email reminder scheduler
  startScheduler();

  server.listen(PORT, () => {
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(` GD Eval Platform  •  ${process.env.NODE_ENV}`);
    logger.info(` HTTP  → http://localhost:${PORT}`);
    logger.info(` WS    → ws://localhost:${PORT}`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force-kill if close takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    gracefulShutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
