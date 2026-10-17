import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDbPool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { loginRateLimiter, recordFailedAttempt, resetAttempts } from '../middleware/rateLimit.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  const { username, pin, role } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN or password is required.' });
  }

  try {
    const pool = await getDbPool();

    // If username is provided, query by username; otherwise match role ('owner' or 'cashier')
    let query = 'SELECT * FROM users WHERE is_active = true AND ';
    let params = [];
    if (username) {
      query += 'username = $1;';
      params = [username.trim().toLowerCase()];
    } else if (role) {
      query += 'role = $1 LIMIT 1;';
      params = [role.trim().toLowerCase()];
    } else {
      // Try both owner and cashier
      query = 'SELECT * FROM users WHERE is_active = true;';
    }

    const userRes = await pool.query(query, params);
    let matchedUser = null;

    for (const u of userRes.rows) {
      const match = await bcrypt.compare(String(pin).trim(), u.password_hash);
      if (match) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      recordFailedAttempt(req);
      return res.status(401).json({ error: 'Invalid PIN or credentials. Access denied.' });
    }

    resetAttempts(req);

    // Generate JWT access token
    const secret = process.env.JWT_SECRET || 'super_secret_hadi_petrol_jwt_access_key_change_in_production_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const payload = {
      id: matchedUser.id,
      username: matchedUser.username,
      role: matchedUser.role,
      name: matchedUser.name,
    };

    const token = jwt.sign(payload, secret, { expiresIn });

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful.',
      token,
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal authentication server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
