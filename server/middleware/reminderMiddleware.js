import User from '../models/user.js';

// Middleware functions for handling reminder operations
const reminderMiddleware = {
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
      
      // If this reminder has a Google ID, mark it for push to sync these changes
      if (reminder.googleId) {
        // Determine operation type based on request path
        const isDeleteOperation = req.path === '/complete-reminder';
        
        // Only set needs_push if it's not being deleted, deletion is handled in the controller
        if (!isDeleteOperation) {
          console.log(`Marking reminder ${reminder._id} (Google ID: ${reminder.googleId}) for push to Google`);
          reminder.syncStatus = 'needs_push';
          reminder.lastSyncedVersion = new Date().toISOString(); // Add version tracking
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