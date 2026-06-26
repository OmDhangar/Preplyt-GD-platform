const mongoose = require('mongoose');
const logger = require('./logger');

const MONGO_OPTIONS = {
  // Mongoose 8+ has sensible defaults — we just add a few extras
  serverSelectionTimeoutMS: 5000,  // fail fast in dev if DB unreachable
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting to reconnect…');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    return conn;
  } catch (err) {
    logger.error('MongoDB initial connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;
