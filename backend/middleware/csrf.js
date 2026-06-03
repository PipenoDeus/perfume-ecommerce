import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const CSRF_TOKEN_TTL = 55 * 60 * 1000;

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const [name, ...rest] = pair.split('=');
    if (!name) return cookies;
    const value = (rest || []).join('=').trim();
    try {
      cookies[name.trim()] = decodeURIComponent(value);
    } catch {
      cookies[name.trim()] = value;
    }
    return cookies;
  }, {});
};

export const generateCSRFToken = (req, res, next) => {
  const existingCookies = parseCookies(req.headers.cookie || '');
  const existingToken = existingCookies.csrfToken;

  if (existingToken) {
    console.log('[CSRF] Existing CSRF cookie detected', {
      path: req.path,
      origin: req.headers.origin || null,
      tokenPreview: `${String(existingToken).slice(0, 8)}...`,
      hasCookieHeader: Boolean(req.headers.cookie),
    });
    res.locals.csrfToken = existingToken;
    return next();
  }

  // Do not create a new CSRF token for state-changing requests.
  // If the cookie is missing, validation should fail instead of regenerating a token
  // and invalidating the incoming header value.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    console.log('[CSRF] No existing CSRF cookie on unsafe request', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      hasCookieHeader: Boolean(req.headers.cookie),
    });
    return next();
  }

  const token = crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: CSRF_TOKEN_TTL,
    path: '/',
  });

  console.log('[CSRF] Generated token and set cookie', {
    path: req.path,
    origin: req.headers.origin || null,
    tokenPreview: `${token.slice(0, 8)}...`,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    setCookieHeader: res.getHeader('Set-Cookie'),
  });

  res.locals.csrfToken = token;
  next();
};

export const validateCSRFToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const authorizationHeader = String(req.headers.authorization || '');
  if (/^Bearer\s+\S+/i.test(authorizationHeader)) {
    console.log('[CSRF] Bearer-authenticated request skipped CSRF cookie validation', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      hasCookieHeader: Boolean(req.headers.cookie),
    });
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const cookieToken = parseCookies(req.headers.cookie || '').csrfToken;

  // Debug logs to help trace CSRF failures. Controlled by global logging settings.
  try {
    console.log('[CSRF] validate:', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      hasCookie: Boolean(req.headers.cookie),
      rawCookieHeaderPreview: req.headers.cookie ? `${req.headers.cookie.slice(0, 50)}...` : null,
      tokenProvided: Boolean(token),
      tokenPreview: token ? `${String(token).slice(0, 6)}...` : null,
      cookieTokenPreview: cookieToken ? `${String(cookieToken).slice(0, 6)}...` : null,
    });
  } catch (e) {
    /* ignore logging errors */
  }

  if (!token) {
    console.log('[CSRF FULL DEBUG]', {
      cookieToken: req.cookies?.csrfToken,
      headerToken: req.headers['x-csrf-token'],
      cookies: req.cookies,
      rawCookieHeader: req.headers.cookie,
    });
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

  if (!cookieToken) {
    console.log('[CSRF FULL DEBUG]', {
      cookieToken: req.cookies?.csrfToken,
      headerToken: req.headers['x-csrf-token'],
      cookies: req.cookies,
      rawCookieHeader: req.headers.cookie,
    });
    console.warn('[CSRF] Missing CSRF cookie - request blocked', {
      path: req.path,
      method: req.method,
      origin: req.headers.origin || null,
      tokenPreview: token ? `${String(token).slice(0,8)}...` : null,
      hasCookieHeader: Boolean(req.headers.cookie),
    });
    return res.status(403).json({ error: 'Missing CSRF cookie' });
  }

  if (token !== cookieToken) {
    console.log('[CSRF FULL DEBUG]', {
      cookieToken: req.cookies?.csrfToken,
      headerToken: req.headers['x-csrf-token'],
      cookies: req.cookies,
      rawCookieHeader: req.headers.cookie,
    });
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
