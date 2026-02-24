import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

/**
 * Create and configure the Express application.
 * @returns {import('express').Application}
 */
export function createApp() {
  const app = express();

  // ── Trust proxy (Cloudflare → Nginx → Express) ──
  if (config.env === 'production') {
    app.set('trust proxy', true);
  }

  // ── Security ────────────────────────────────
  app.use(helmet());

  // CORS: allow frontend origin + API own origin
  const allowedOrigins = [config.frontendUrl, config.appUrl].filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Rate limiting ──────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Stricter limit for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many login attempts' } },
  });
  app.use('/api/v1/auth/login', authLimiter);

  // ── Body parsing ───────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Compression ────────────────────────────
  app.use(compression());

  // ── Request logging ────────────────────────
  if (config.env !== 'test') {
    app.use(morgan('short', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }));
  }

  // ── Request ID ─────────────────────────────
  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  // ── Routes ─────────────────────────────────
  app.use(routes);

  // ── 404 ────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
  });

  // ── Error handler ─────────────────────────
  app.use(errorHandler);

  return app;
}
