import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
        getUpcomingReminder, 
        getAllReminders,
        createReminder,
        completeReminder,
        flagReminder,
        updateReminderGoogleId,
        getRemindersForGoogleSync
} from '../controllers/reminderController.js';
import { syncGoogleEvents, pushRemindersToGoogle, removeGoogleReminders } from '../controllers/googleCalendarController.js';
import authMiddleware from '../middleware/auth.js';
import reminderMiddleware from '../middleware/reminderMiddleware.js'; // Import new middleware

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Home route with upcoming reminder
router.get('/', authMiddleware.isAuthenticated, getUpcomingReminder);

// Tasks list route
router.get('/tasks', authMiddleware.isAuthenticated, getAllReminders);

// New task form route
router.get('/newtask', authMiddleware.isAuthenticated, (req, res) => {
    return res.sendFile('newtask.html', { root: path.join(__dirname, '../../views') });
});

// Submit new reminder
router.post('/submit', express.json(), authMiddleware.isAuthenticated, createReminder);

// Mark reminder as complete
router.post('/complete-reminder', express.json(), authMiddleware.isAuthenticated, reminderMiddleware.updateSyncStatus, completeReminder);

// Flag reminder - apply sync status middleware
router.post('/markflagged', authMiddleware.isAuthenticated, reminderMiddleware.updateSyncStatus, flagReminder);

// Google Calendar sync endpoint
router.post('/api/sync-google-events', authMiddleware.isAuthenticated, syncGoogleEvents);

// Google Calendar sync endpoit
router.post('/api/push-to-google', authMiddleware.isAuthenticated, pushRemindersToGoogle);

// Remove all Google Calendar reminders when disconnecting
router.post('/api/remove-google-reminders', authMiddleware.isAuthenticated, removeGoogleReminders);

// Update reminder with Google ID endpoint
router.post('/api/update-reminder-google-id', authMiddleware.isAuthenticated, express.json(), updateReminderGoogleId);

// Get reminders to push to Google
router.get('/api/get-reminders-to-push', authMiddleware.isAuthenticated, getRemindersForGoogleSync);

export default router;