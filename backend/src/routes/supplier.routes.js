const { Router } = require('express');
const controller = require('../controllers/supplier.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { supplierSchema } = require('../validation/supplier.schemas');

const router = Router();

router.use(requireAuth);

router.get('/', controller.list);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(supplierSchema), controller.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(supplierSchema.partial()), controller.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), controller.remove);

module.exports = router;
