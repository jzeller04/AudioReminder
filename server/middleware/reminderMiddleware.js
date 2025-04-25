import User from '../models/user.js';

const reminderMiddleware = {
  // Middleware to update syncStatus when a reminder is modified
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
          await user.save();
        }
      }
      
      next();
    } catch (error) {
      console.error('Error in updateSyncStatus middleware:', error);
      next();
    }
  },
  
  // Middleware to update syncStatus when a reminder is created or updated via form
  updateFormSyncStatus: async (req, res, next) => {
    try {
      // This middleware is used for form submissions, so no reminderID yet
      // We'll mark the reminder for sync in the controller after it's created
      
      // Set a flag in the request to indicate this should be synced
      req.shouldSyncToGoogle = true;
      
      next();
    } catch (error) {
      console.error('Error in updateFormSyncStatus middleware:', error);
      next();
    }
  },
  
  // Middleware to check Google Calendar reminders before completion
  checkGoogleReminder: async (req, res, next) => {
    try {
      // Get the reminder ID from the request
      const reminderId = req.body.reminderId;
      
      if (!reminderId || req.path !== '/complete-reminder') {
        return next(); // Only process for completed reminders
      }
      
      // Find the user and the reminder
      const user = await User.findById(req.session.userId);
      if (!user) {
        return next();
      }
      
      // Find the reminder
      const reminder = user.reminders.id(reminderId);
      if (!reminder) {
        return next();
      }
      
      // Store data in request object for controller use
      req.googleReminderInfo = {
        isGoogleReminder: !!reminder.googleId,
        googleId: reminder.googleId || null
      };
      
      next();
    } catch (error) {
      console.error('Error in checkGoogleReminder middleware:', error);
      next();
    }
  },
  
  // Middleware to track batch operations on reminders
  trackBatchOperations: async (req, res, next) => {
    try {
      // For batch operations like marking multiple reminders as complete
      const reminderIds = req.body.reminderIds;
      
      if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        return next(); // No reminder IDs, skip this middleware
      }
      
      // Find the user
      const user = await User.findById(req.session.userId);
      if (!user) {
        return next();
      }
      
      // Track reminders that need to be synced
      const googleReminders = [];
      
      // Process each reminder
      for (const reminderId of reminderIds) {
        const reminder = user.reminders.id(reminderId);
        if (reminder && reminder.googleId) {
          // Store Google reminder info
          googleReminders.push({
            id: reminder._id,
            googleId: reminder.googleId,
            title: reminder.title
          });
          
          // Update sync status if not being deleted
          if (req.path !== '/batch-complete') {
            reminder.syncStatus = 'needs_push';
          }
        }
      }
      
      // If we found Google reminders, save the changes and store info for the controller
      if (googleReminders.length > 0) {
        await user.save();
        req.googleReminders = googleReminders;
      }
      
      next();
    } catch (error) {
      console.error('Error in trackBatchOperations middleware:', error);
      next();
    }
  }
};

export default reminderMiddleware;