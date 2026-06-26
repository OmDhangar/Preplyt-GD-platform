const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Socket.IO middleware — verifies JWT on every new connection.
 * Attaches `socket.user` so downstream handlers can access it.
 *
 * The client must send: { auth: { token: '<JWT>' } }
 */
const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    logger.warn(`[Socket] Rejected unauthenticated connection from ${socket.id}`);
    return next(new Error('Authentication error: no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('name email role isActive');

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: user not found or inactive'));
    }

    socket.user      = user;
    socket.deviceLabel = socket.handshake.auth?.deviceLabel || 'Unknown device';
    next();
  } catch (err) {
    logger.warn(`[Socket] Auth failed for ${socket.id}: ${err.message}`);
    next(new Error('Authentication error: invalid token'));
  }
};

module.exports = socketAuth;
