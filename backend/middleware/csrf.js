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

  // Debug logs to help trace CSRF failures. Controlled by global logging settings.
  try {
    console.log('[CSRF] validate:', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      hasCookie: Boolean(req.headers.cookie),
      tokenProvided: Boolean(token),
      tokenPreview: token ? `${String(token).slice(0,6)}...` : null,
      cookieTokenPreview: cookieToken ? `${String(cookieToken).slice(0,6)}...` : null,
    });
  } catch (e) {
    /* ignore logging errors */
  }

  if (!token) {
    console.warn('[CSRF] Missing token - request blocked', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        cookie: !!req.headers.cookie,
      }
    });
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  if (!cookieToken || token !== cookieToken) {
    console.warn('[CSRF] Invalid token - request blocked', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      tokenPreview: token ? `${String(token).slice(0,8)}...` : null,
      cookieTokenPreview: cookieToken ? `${String(cookieToken).slice(0,8)}...` : null,
    });
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};
