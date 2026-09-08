const rateLimit = require('express-rate-limit');

// General-purpose limiter for all /chat/* traffic (public, unauthenticated).
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.', data: null, error: { code: 'RATE_LIMITED', details: [] } },
});

// Tighter limiter specifically on OTP verification, per blueprint §E (abuse prevention).
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please wait a few minutes.', data: null, error: { code: 'RATE_LIMITED', details: [] } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait before trying again.', data: null, error: { code: 'RATE_LIMITED', details: [] } },
});

module.exports = { chatLimiter, otpLimiter, authLimiter };
