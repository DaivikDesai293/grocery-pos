const { Router } = require('express');
const controller = require('../controllers/product.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  stockAdjustmentSchema,
} = require('../validation/product.schemas');

const router = Router();

router.use(requireAuth);

// Any logged-in role can look products up — cashiers need this at checkout.
router.get('/', validate(listProductsQuerySchema, 'query'), controller.list);
router.get('/barcode/:barcode', controller.getByBarcode);
router.get('/:id', controller.getById);
router.get('/:id/stock-history', requireRole('ADMIN', 'MANAGER'), controller.stockHistory);

// Managing the catalog and stock levels is ADMIN/MANAGER only.
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(createProductSchema), controller.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(updateProductSchema), controller.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), controller.remove);
router.post(
  '/:id/stock-adjustment',
  requireRole('ADMIN', 'MANAGER'),
  validate(stockAdjustmentSchema),
  controller.adjustStock
);

module.exports = router;
