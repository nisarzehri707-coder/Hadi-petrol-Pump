const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

export function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const username = req.body?.username || 'anonymous';
  const key = `${ip}_${username}`;

  const now = Date.now();
  const record = loginAttempts.get(key);

  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Too many failed login attempts. Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Reset if lockout window has passed
    if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(key);
    }
  }

  next();
}

export function recordFailedAttempt(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const username = req.body?.username || 'anonymous';
  const key = `${ip}_${username}`;

  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, firstAttempt: now };

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_PERIOD_MS;
  }
  loginAttempts.set(key, record);
}

export function resetAttempts(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const username = req.body?.username || 'anonymous';
  loginAttempts.delete(`${ip}_${username}`);
}
