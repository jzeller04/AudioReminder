import express from 'express';
import { getCalendarPage } from '../controllers/calendarController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware.isAuthenticated, getCalendarPage);

export default router;