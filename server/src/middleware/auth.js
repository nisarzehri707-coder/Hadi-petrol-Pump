import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  // Support both HTTP-only cookie and Authorization Bearer header
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const tokenFromCookie = req.cookies ? req.cookies.token : null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_hadi_petrol_jwt_access_key_change_in_production_2026';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, username, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Action restricted to: ${allowedRoles.join(', ')}. Your role is: ${req.user.role}.`,
      });
    }
    next();
  };
}

export const requireOwner = requireRole('owner');
export const requireStaff = requireRole('owner', 'cashier');
