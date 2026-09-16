const { Router } = require('express');
const controller = require('../controllers/setting.controller');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { updateSettingSchema } = require('../validation/setting.schemas');

const router = Router();

router.use(requireAuth);

router.get('/', controller.get); // receipt printing needs this for any role
router.patch('/', requireRole('ADMIN'), validate(updateSettingSchema), controller.update);

module.exports = router;
