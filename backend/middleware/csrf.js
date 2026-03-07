import crypto from 'crypto';

const csrfTokens = new Map(); // Store tokens with expiry (in production use Redis)

export const generateCSRFToken = (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiryTime = Date.now() + 3600000; // 1 hour
  
  csrfTokens.set(token, expiryTime);
  res.locals.csrfToken = token;
  
  next();
};

export const validateCSRFToken = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body.csrfToken;
  
  if (!token) {
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  const expiryTime = csrfTokens.get(token);
  
  if (!expiryTime || expiryTime < Date.now()) {
    return res.status(403).json({ error: 'Invalid or expired CSRF token' });
  }

  // Keep token valid until expiry to support client-side caching
  
  next();
};

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiryTime] of csrfTokens.entries()) {
    if (expiryTime < now) {
      csrfTokens.delete(token);
    }
  }
}, 600000);
