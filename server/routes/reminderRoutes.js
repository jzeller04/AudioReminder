import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {getUpcomingReminder,getAllReminders,createReminder,completeReminder} from '../controllers/reminderController.js';
import authMiddleware from '../middleware/auth.js';

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
router.post('/submit', authMiddleware.isAuthenticated, createReminder);

// Mark reminder as complete
router.post('/complete-reminder', authMiddleware.isAuthenticated, completeReminder);

export default router;