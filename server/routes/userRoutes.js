import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {updateSettings, getUserPreferences} from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Settings page route
router.get('/settings', authMiddleware.isAuthenticated, (req, res) => {
    return res.sendFile('settings.html', { root: path.join(__dirname, '../../views') });
});

// Update user settings
router.post('/updateSettings', authMiddleware.isAuthenticated, updateSettings);

// Get user preferences (for API requests)
router.get('/getUserPreferences', authMiddleware.isAuthenticated, getUserPreferences);

export default router;
