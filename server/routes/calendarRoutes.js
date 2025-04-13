import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
//import { getEventsByDate } from '../controllers/calendarController.js'; for future use
import authMiddleware from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Calendar page route
router.get('/', authMiddleware.isAuthenticated, (req, res) => {
    return res.sendFile('calendar.html', { root: path.join(__dirname, '../../views') });
});

// Add more calendar routes example:
// router.get('/events/:date', authMiddleware.isAuthenticated, calendarController.getEventsByDate);

export default router;