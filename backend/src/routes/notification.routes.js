const router = require('express').Router();
const ctrl   = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',                 ctrl.getNotifications);
router.patch('/read-all',       ctrl.markAllAsRead);
router.patch('/:id/read',       ctrl.markAsRead);
router.delete('/:id',           ctrl.deleteNotification);

module.exports = router;
