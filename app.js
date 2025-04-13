import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import authRoutes from './server/routes/authRoutes.js';
import reminderRoutes from './server/routes/reminderRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import calendarRoutes from './server/routes/calendarRoutes.js';
import authMiddleware from './server/middleware/auth.js';

import connectDB from './server/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes - update the URL prefixes to match route organization
app.use('/auth', authRoutes); // All auth routes will be prefixed with /auth
app.use('/', reminderRoutes);  // Main reminder routes
app.use('/user', authMiddleware.isAuthenticated, userRoutes);  // User and settings routes
app.use('/calendar', authMiddleware.isAuthenticated, calendarRoutes); // Calendar routes

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Connect to database and start server
connectDB().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
  
  export default app;