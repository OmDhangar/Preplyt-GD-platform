const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

// Human-readable format for development console
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

// File transports — rotate daily, keep 14 days
const fileTransports = [
  new DailyRotateFile({
    filename:     path.join('logs', 'error-%DATE%.log'),
    datePattern:  'YYYY-MM-DD',
    level:        'error',
    maxSize:      '20m',
    maxFiles:     '14d',
    zippedArchive: true,
  }),
  new DailyRotateFile({
    filename:     path.join('logs', 'combined-%DATE%.log'),
    datePattern:  'YYYY-MM-DD',
    maxSize:      '20m',
    maxFiles:     '14d',
    zippedArchive: true,
  }),
];

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
  ),
  transports: [
    ...fileTransports,
    // Always console in dev; in prod keep it for container stdout
    new winston.transports.Console({
      format: isDev
        ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat)
        : combine(timestamp(), json()),
    }),
  ],
  exitOnError: false,
});

// Add http level for morgan
logger.http = (msg) => logger.info(msg, { source: 'http' });

module.exports = logger;
