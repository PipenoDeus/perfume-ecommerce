import express from 'express';
import cors from 'cors';
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

dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables before anything else so the process
// fails fast with a clear message instead of crashing silently.
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());
if (missingEnvVars.length > 0) {
  console.error(
    `[STARTUP ERROR] Missing required environment variable(s): ${missingEnvVars.join(', ')}. ` +
    'Set these values in your Railway service variables and redeploy.'
  );
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

const rawFrontendOrigins = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174';
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

const isAllowedCorsOrigin = (origin, requestPath) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedPath = normalizePath(requestPath);
  const isFlowCallbackPath = flowCallbackPaths.has(normalizedPath);

  if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin)) {
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

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (CORS_DEBUG) {
        console.log('[CORS DEBUG] Incoming request:', {
          method: req.method,
          path: req.path,
          origin: origin || null,
          normalizedOrigin: normalizeOrigin(origin),
          referer: req.headers.referer || null,
          host: req.headers.host || null,
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
          method: req.method,
          path: req.path,
          origin: origin || null,
          normalizedOrigin: normalizeOrigin(origin),
          allowedOrigins: Array.from(allowedOrigins),
          flowCallbackOrigins: Array.from(flowCallbackOrigins),
          flowCallbackPaths: Array.from(flowCallbackPaths),
        });
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  })(req, res, next);
});

// Rate limiting - general
app.use(generalLimiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (err) {
  console.error('[STARTUP ERROR] Failed to initialize Supabase client:', err.message);
  process.exit(1);
}
export { supabase };

// Get CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: res.locals.csrfToken });
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`🔒 Security features enabled: Helmet, CORS, Rate Limiting, CSRF Protection, JWT Verification`);
  console.log(`🗄️  Supabase client initialized for: ${process.env.SUPABASE_URL}`);
  console.log(`🚀 Server startup complete. Listening for requests.`);
});
