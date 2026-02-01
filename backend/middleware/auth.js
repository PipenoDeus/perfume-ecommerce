import jwt from 'jsonwebtoken';

export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify token format (JWT from Supabase)
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.user_metadata?.role || 'cliente'
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
