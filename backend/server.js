import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generateCSRFToken, validateCSRFToken } from './middleware/csrf.js';
import { generalLimiter, orderLimiter } from './middleware/rateLimiter.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import regionsRouter from './routes/regions.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env only in non-production environments (Railway/production provide envs)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Global handlers to ensure errors are always logged (avoid silent crashes)
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION] Shutting down due to uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION] Shutting down due to unhandled promise rejection:', reason);
  process.exit(1);
});

// Validate required environment variables early and fail loudly if missing
const requiredEnvs = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnvs.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error('[ENV ERROR] Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

const enableLogs = process.env.ENABLE_LOGS === 'true' || !isProduction;

if (!enableLogs) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

const app = express();
const PORT = process.env.PORT || 3000;

// Required when running behind Railway / other proxies so Express trusts forwarded HTTPS
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.paypal.com", "https://api.sandbox.paypal.com"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const normalizeOrigin = (origin) => {
  if (!origin) return '';
  return origin.trim().replace(/\/+$/, '');
};

const normalizePath = (requestPath) => {
  if (!requestPath) return '/';
  if (requestPath === '/') return '/';
  return requestPath.replace(/\/+$/, '');
};

const rawFrontendOrigins = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174';
const allowedOrigins = new Set(
  rawFrontendOrigins
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
);

if (isProduction && allowedOrigins.size === 0) {
  console.error('ERROR: No allowed frontend origins configured. Set FRONTEND_ORIGINS or FRONTEND_URL.');
  process.exit(1);
}

const flowCallbackOrigins = new Set([
  'https://sandbox.flow.cl',
  'https://www.flow.cl',
]);

const flowCallbackPaths = new Set([
  '/api/payments/flow/confirmation',
  '/api/payments/flow/return',
]);

const CORS_DEBUG = process.env.CORS_DEBUG === 'true';

// Log CORS DEBUG status at startup
console.log(`[CORS] Debug mode: ${CORS_DEBUG ? 'ON' : 'OFF'} (CORS_DEBUG=${process.env.CORS_DEBUG})`);
console.log(`[CORS] Allowed Origins:`, Array.from(allowedOrigins));
console.log(`[CORS] Flow Callback Origins:`, Array.from(flowCallbackOrigins));
console.log(`[CORS] Flow Callback Paths:`, Array.from(flowCallbackPaths));

const isAllowedVercelOrigin = (origin) => {
  if (!origin) return false;
  const normalizedOrigin = normalizeOrigin(origin);

  // Prefer parsing the hostname for robust matching (handles protocol prefixes)
  try {
    const hostname = new URL(normalizedOrigin).hostname;
    if (hostname.endsWith('.vercel.app')) return true;
    if (hostname.endsWith('-pipedeus-projects.vercel.app')) return true;
    return false;
  } catch (e) {
    // Fallback to string-based checks if URL parsing fails
    if (normalizedOrigin.endsWith('.vercel.app')) return true;
    if (normalizedOrigin.endsWith('-pipedeus-projects.vercel.app')) return true;
    return false;
  }
};

const isAllowedCorsOrigin = (origin, requestPath) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedPath = normalizePath(requestPath);
  const isFlowCallbackPath = flowCallbackPaths.has(normalizedPath);

  if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin) || isAllowedVercelOrigin(normalizedOrigin)) {
    return true;
  }

  // Some browser/payment-provider POST redirects can arrive as Origin: "null".
  // Accept this only for Flow callback endpoints.
  if (normalizedOrigin === 'null') {
    return isFlowCallbackPath;
  }

  return isFlowCallbackPath && flowCallbackOrigins.has(normalizedOrigin);
};

// Pre-CORS request logger to catch requests before CORS middleware
app.use((req, res, next) => {
  if (CORS_DEBUG && (req.path.includes('/payments/flow') || req.method === 'POST')) {
    console.log('[CORS PRE] Request incoming:', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin || '[NO ORIGIN HEADER]',
      referer: req.headers.referer || null,
      host: req.headers.host || null,
      userAgent: req.headers['user-agent']?.substring(0, 50) || null,
    });
  }
  next();
});

const buildCorsOptions = (req) => ({
  origin: (origin, callback) => {
    if (CORS_DEBUG) {
      console.log('[CORS DEBUG] Incoming request:', {
        method: req.method,
        path: req.path,
        origin: origin || null,
        normalizedOrigin: normalizeOrigin(origin),
      });
    }

    if (isAllowedCorsOrigin(origin, req.path)) {
      if (CORS_DEBUG) {
        console.log('[CORS DEBUG] Allowed request');
      }
      callback(null, true);
      return;
    }

    if (CORS_DEBUG) {
      console.warn('[CORS DEBUG] Blocked request:', {
        origin: origin || null,
        normalizedOrigin: normalizeOrigin(origin),
        path: req.path,
        allowedOrigins: Array.from(allowedOrigins),
        flowCallbackOrigins: Array.from(flowCallbackOrigins),
      });
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  optionsSuccessStatus: 200,
});

const corsOptionsDelegate = (req, callback) => {
  callback(null, buildCorsOptions(req));
};

// Handle preflight requests for all routes
app.options('*', cors(corsOptionsDelegate));

// Apply CORS middleware to all routes
app.use(cors(corsOptionsDelegate));

// Force credential headers and origin variance for every CORS response
app.use((req, res, next) => {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  next();
});

// Rate limiting - general
app.use(generalLimiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF Token generation
app.use(generateCSRFToken);

// CSRF validation for state-changing operations
app.use((req, res, next) => {
  const csrfExemptPaths = new Set([
    '/api/payments/paypal-webhook',
    '/api/payments/flow/confirmation',
    '/api/payments/flow/return',
  ]);

  if (csrfExemptPaths.has(req.path)) {
    next();
    return;
  }

  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    validateCSRFToken(req, res, next);
  } else {
    next();
  }
});

// Initialize Supabase client (use service role for server-side operations)
let _supabase;
try {
  _supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (err) {
  console.error('[INIT ERROR] Failed to initialize Supabase client:', err);
  process.exit(1);
}

export const supabase = _supabase;

// Get CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  console.log('[CSRF] Token endpoint hit', {
    origin: req.headers.origin || null,
    cookieHeader: req.headers.cookie || null,
    hasCookie: Boolean(req.headers.cookie),
    requestPath: req.path,
    method: req.method,
    tokenBeingSent: Boolean(res.locals.csrfToken),
  });
  res.json({ csrfToken: res.locals.csrfToken });
});

// Debug endpoint for cookie diagnostics
app.get('/api/debug/cookies', (req, res) => {
  console.log('[DEBUG] Cookie diagnostics', {
    origin: req.headers.origin || null,
    rawCookieHeader: req.headers.cookie || null,
    parsedCookies: req.cookies,
    path: req.path,
    method: req.method,
  });
  res.json({
    cookies: req.cookies,
    rawCookieHeader: req.headers.cookie || null,
    origin: req.headers.origin || null,
  });
});

// Routes with rate limiting
app.use('/api/orders', orderLimiter, ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/regions', regionsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
  // Log error details (audit log)
  console.error(`[${new Date().toISOString()}] Error:`, {
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    error: err.message,
    status: err.status || 500
  });

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(status).json({ error: message });
});

// Start server with clear startup logs
try {
  console.log('🚀 Server starting...');
  console.log('[CONFIG] NODE_ENV=', process.env.NODE_ENV || 'not set');
  console.log('[CONFIG] PORT=', PORT);
  console.log('[CONFIG] FRONTEND_URLS=', process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'not set');
  console.log('[CONFIG] SUPABASE_URL=', process.env.SUPABASE_URL || 'not set');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on port ${PORT}`);
    console.log(`🔒 Security features enabled: Helmet, CORS, Rate Limiting, CSRF Protection, JWT Verification`);
  });
} catch (err) {
  console.error('[STARTUP ERROR] Failed to start server:', err);
  process.exit(1);
}
