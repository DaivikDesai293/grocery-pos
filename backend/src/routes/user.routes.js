const { Router } = require('express');
const controller = require('../controllers/user.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validation/user.schemas');

const router = Router();

// User management is ADMIN-only: managers run the floor, admins run the roster.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', controller.list);
router.post('/', validate(createUserSchema), controller.create);
router.patch('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', controller.deactivate);

module.exports = router;
