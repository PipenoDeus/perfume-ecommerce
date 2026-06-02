import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const [name, ...rest] = pair.split('=');
    if (!name) return cookies;
    cookies[name.trim()] = decodeURIComponent((rest || []).join('=').trim());
    return cookies;
  }, {});
};

export const generateCSRFToken = (req, res, next) => {
  const existingCookies = parseCookies(req.headers.cookie || '');
  const existingToken = existingCookies.csrfToken;

  if (existingToken) {
    res.locals.csrfToken = existingToken;
    return next();
  }

  // Do not create a new CSRF token for state-changing requests.
  // If the cookie is missing, validation should fail instead of regenerating a token
  // and invalidating the incoming header value.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000,
    path: '/',
  });

  res.locals.csrfToken = token;
  next();
};

export const validateCSRFToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  const cookieToken = parseCookies(req.headers.cookie || '').csrfToken;

  if (!token) {
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  if (!cookieToken || token !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};
