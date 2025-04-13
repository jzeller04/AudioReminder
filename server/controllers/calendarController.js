// This is mostly a placeholder as the calendar functionality currently operates on the client side
// You can expand this controller as you add more server-side calendar features

import User from '../models/user.js';

// Get events for a specific date
const getEventsByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const userId = req.session.userId;
        
        // Parse the date parameter
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);
        
        // Create end of day date
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        // Find user and filter reminders for the specific date
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Filter reminders for the given date
        const events = user.reminders.filter(reminder => {
            const reminderDate = new Date(reminder.date);
            return reminderDate >= targetDate && reminderDate <= endOfDay;
        });
        
        return res.json({ events });
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

export { getEventsByDate };