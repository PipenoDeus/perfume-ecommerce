import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase to get JWT verification
// Validate required env for this module
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('[ENV ERROR][auth] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  // Throw early to surface error in logs instead of failing inside createClient
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Log incoming auth header presence for debugging
    console.log('[AUTH] authenticateUser:', { path: req.path, hasAuthHeader: !!authHeader });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AUTH] Missing or invalid Authorization header', { path: req.path, authHeader: authHeader ? 'present' : 'missing' });
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase (validates signature and expiration)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('[AUTH] supabase.auth.getUser failed', { error: error || null });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify token is not tampered with by decoding and checking structure
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sub || decoded.sub !== user.id) {
      console.warn('[AUTH] Token verification failed', { decoded, userId: user.id });
      return res.status(401).json({ error: 'Token verification failed' });
    }

    // Check token is not expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn('[AUTH] Token expired', { userId: user.id });
      return res.status(401).json({ error: 'Token expired' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'cliente'
    };

    console.log('[AUTH] authenticated', { userId: req.user.id, role: req.user.role });

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
