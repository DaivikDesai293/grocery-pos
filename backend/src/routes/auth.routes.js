const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema, refreshSchema } = require('../validation/auth.schemas');

const router = Router();

// Slow down brute-force password guessing without punishing normal use.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Try again later.' } },
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
