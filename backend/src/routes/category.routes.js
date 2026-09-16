const { Router } = require('express');
const controller = require('../controllers/category.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { categorySchema } = require('../validation/category.schemas');

const router = Router();

router.use(requireAuth);

router.get('/', controller.list); // any logged-in role can read, for checkout filters
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(categorySchema), controller.create);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), validate(categorySchema), controller.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), controller.remove);

module.exports = router;
