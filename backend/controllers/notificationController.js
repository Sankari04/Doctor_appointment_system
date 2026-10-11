const pool = require('../config/db');

// Helper to create an in-app notification
const createNotification = async (userId, title, message, type = 'appointment') => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, title, message, type]
    );
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    await pool.query(
      'DELETE FROM notifications WHERE user_id = ? AND created_at < ?',
      [userId, retentionCutoff]
    );

    const [notifications] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = false`,
      [userId]
    );

    res.json({
      notifications,
      unreadCount: unreadRows[0].unreadCount || 0
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error updating notification' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = ?`,
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
};

// @desc    Delete a user's notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
};
