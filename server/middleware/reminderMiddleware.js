import User from '../models/user.js';

const reminderMiddleware = {
  // Middleware to update syncStatus when a reminder is completed or flagged
  updateSyncStatus: async (req, res, next) => {
    try {
      // Get the reminder ID from the request
      const reminderId = req.body.reminderId;
      
      if (!reminderId) {
        return next(); // No reminder ID, skip this middleware
      }
      
      // Find the user
      const user = await User.findById(req.session.userId);
      if (!user) {
        return next();
      }
      
      // Find the reminder
      const reminder = user.reminders.id(reminderId);
      if (!reminder) {
        return next();
      }
      
      // If this reminder has a Google ID and its being completed or flagged, makr it for push to sync these changes
      if (reminder.googleId) {
        // Only set needs_push if it's not being deleted, deletion is handled in the contoller
        if (req.path !== '/complete-reminder') {
          reminder.syncStatus = 'needs_push';
          await user.save();
        }
      }
      
      next();
    } catch (error) {
      console.error('Error in updateSyncStatus middleware:', error);
      next();
    }
  }
};

export default reminderMiddleware;