const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { success }  = require('../utils/apiResponse');

// ── GET /api/notifications ────────────────────────────────────────────────────
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip  = (page - 1) * limit;
  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

  const notifications = await Notification
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  success(res, { notifications, total, unreadCount, page: Number(page) });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
exports.markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true, readAt: new Date() } }
  );
  success(res, null, 'Marked as read');
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  success(res, { updated: result.modifiedCount }, 'All notifications marked as read');
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  success(res, null, 'Notification deleted');
});
