const { Router } = require('express');
const controller = require('../controllers/sale.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createSaleSchema, voidSaleSchema, listSalesQuerySchema } = require('../validation/sale.schemas');

const router = Router();

router.use(requireAuth);

// Any logged-in role can ring up a sale — that's the whole point of a POS.
router.post('/', validate(createSaleSchema), controller.create);
router.get('/', validate(listSalesQuerySchema, 'query'), controller.list);
router.get('/:id', controller.getById);

// Voiding is a manager-level control, deliberately separate from creating sales.
router.post('/:id/void', requireRole('ADMIN', 'MANAGER'), validate(voidSaleSchema), controller.voidSale);

module.exports = router;
