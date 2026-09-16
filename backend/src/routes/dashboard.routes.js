const { Router } = require('express');
const controller = require('../controllers/dashboard.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN', 'MANAGER'), controller.overview);

module.exports = router;
