const router = require('express').Router();
const ctrl = require('../controllers/template.controller');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createTemplateRules, updateTemplateRules } = require('../utils/validators/template.validator');
router.use(protect);
router.use(restrictTo('instructor', 'admin'));

router.post('/', createTemplateRules, validate, ctrl.createTemplate);
router.get('/', ctrl.getTemplates);
router.get('/:id', ctrl.getTemplate);
router.patch('/:id', updateTemplateRules, validate, ctrl.updateTemplate);
router.patch('/:id/publish', ctrl.publishTemplate);
router.patch('/:id/archive', ctrl.archiveTemplate);
router.post('/:id/duplicate', ctrl.duplicateTemplate);

module.exports = router;
