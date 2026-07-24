const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  message: { error: 'AI rate limit exceeded. Max 20 AI requests per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
