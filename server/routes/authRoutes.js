import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { signIn, createUser, logout } from '../controllers/authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Route for login page
router.get('/login', (req, res) => {
    return res.sendFile('login.html', { root: path.join(__dirname, '../../views') });
});

// Process login form
router.post('/signin', signIn);

// Route for signup page
router.get('/signup', (req, res) => {
    return res.sendFile('signup.html', { root: path.join(__dirname, '../../views') });
});

// Process signup form
router.post('/newuser', createUser);

// Logout route
router.get('/logout', logout);

export default router;