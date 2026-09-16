const { Router } = require('express');
const controller = require('../controllers/report.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { rangeQuerySchema, topProductsQuerySchema } = require('../validation/report.schemas');

const router = Router();

// Store-wide reports are a MANAGER/ADMIN concern — this is the "owner dashboard" data.
router.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

router.get('/summary', validate(rangeQuerySchema, 'query'), controller.summary);
router.get('/trend', validate(rangeQuerySchema, 'query'), controller.trend);
router.get('/top-products', validate(topProductsQuerySchema, 'query'), controller.topProducts);
router.get('/by-category', validate(rangeQuerySchema, 'query'), controller.byCategory);
router.get('/by-cashier', validate(rangeQuerySchema, 'query'), controller.byCashier);
router.get('/reorder', controller.reorder);

module.exports = router;
