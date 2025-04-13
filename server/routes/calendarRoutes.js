import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getCalendarPage } from '../controllers/calendarController.js';
import authMiddleware from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);

const router = express.Router();

router.get('/', authMiddleware.isAuthenticated, getCalendarPage);

export default router;