import User from '../models/user.js';
import { dateToReadable, timeToTwelveSystem } from '../utils/util.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get upcoming reminders for homepage
const getUpcomingReminder = async (req, res) => {
    try {
        // Update old reminders first
        await updateUserReminders(req.session.userId);
        
        const template = await fs.readFile(path.join(__dirname, '../../views/index.html'), 'utf8');
        const userReminders = await fetch(req.session.userId);

        let reminderHTML;
        if (userReminders.length > 0) {
            const reminder = userReminders[0];
            reminderHTML =
                `<div class="reminder-item"> 
                    <div class="reminder-content">
                        <p class="reminder-title">${reminder.title || 'No reminder found'}</p>
                        <p class="reminder-description">${reminder.description || 'No reminder found'}</p>
                        <p class="reminder-date">${dateToReadable(reminder.date) || 'No reminder found'}</p>
                        <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'No reminder found'}</p>
                    </div>
                </div>`;
        } else {
            reminderHTML = 
                `<hr> 
                <div class="reminder-item">          
                    <p>${'Nothing to do!'}</p>
                    <p>${''}</p>
                    <p>${''}</p>
                    <p>${''}</p>
                </div>`;
        }

        let finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        const user = await User.findById(req.session.userId);

        if (user?.preferences?.highContrast) {
            const theme = user.preferences.highContrast;
            const themeScript = `<script>
                localStorage.setItem('theme', '${theme}');
                document.body.classList.add('${theme}');
            </script>`;
            finalHTML = finalHTML.replace('</body>', `${themeScript}</body>`);
        }

        return res.send(finalHTML);
    } catch (error) {
        console.log(error);
        return res.sendFile('404.html', { root: path.join(__dirname, '../../views') });
    }
};

// Get all reminders for tasks page
const getAllReminders = async (req, res) => {
    try {
        const template = await fs.readFile(path.join(__dirname, '../../views/tasks.html'), 'utf8');
        const reminders = await fetch(req.session.userId);

        let reminderHTML = reminders.map(reminder =>
            `<div class="reminder-item"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'No reminder found'}</p>
                    <p class="reminder-description">${reminder.description || 'No reminder found'}</p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'No reminder found'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'No reminder found'}</p>
                </div>
                <button class="complete-btn" data-id="${reminder._id}">Mark Complete</button>
            </div>`
        ).join('');

        const finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        return res.send(finalHTML);
    } catch (error) {
        console.log(error);
        return res.sendFile('404.html', { root: path.join(__dirname, '../../views') });
    }
};

// Create new reminder
const createReminder = async (req, res) => {
    const title = req.body.title;
    const description = req.body.memo;
    const date = req.body.date;
    const time = req.body.time;
    
    if (title) {
        try {
            await saveReminderToUser(title, description, time, date, req.session.userId);
            return res.redirect('/newtask');
        } catch (error) {
            console.log(error);
            return res.status(500).send("Error saving reminder");
        }
    } else {
        return res.status(400).send("No title received");
    }
};

// Mark reminder as complete
const completeReminder = async (req, res) => {
    const reminderId = req.body.reminderId;
    
    try {
        await User.findOneAndUpdate(
            { _id: req.session.userId },
            { $pull: { reminders: { _id: reminderId } } }
        );
        
        return res.redirect('/tasks');
    } catch (error) {
        console.log('Error removing reminder:', error);
        return res.redirect('/tasks');
    }
};

// Fetch user reminders
async function fetch(userId) {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setUTCHours(23, 59, 59, 999);
        nextWeek.setDate(today.getDate() + 6);
        
        const user = await User.findById(userId, {reminders: 1});
        
        if (!user) {
            return [];
        }
        
        const reminders = user.reminders.filter(reminder => {
            const reminderDate = new Date(reminder.date);
            return reminderDate >= today && reminder.date < nextWeek;
        });
        
        if (reminders) {
            return reminders;
        }
        
        return [];
    } catch (error) {
        console.log('Error fetching reminders:', error);
        return [];
    }
}

// Update user reminders (delete old ones)
async function updateUserReminders(userId) {
    try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const result = await User.updateOne(
            { _id: userId },
            { $pull: { reminders: { date: { $lt: twoDaysAgo } } } }
        );

        console.log('Deleted old reminders', result);
        return result;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Save reminder to user
async function saveReminderToUser(title, description, time, date, userId) {
    if (title) {
        const reminder = {
            title: title,
            description: description,
            date: date,
            time: time
        };

        const updateUser = await User.findOneAndUpdate(
            { _id: userId },
            { $push: { reminders: reminder } },
            { new: true }
        );
        
        if (updateUser) {
            console.log(reminder);
        }
    }
}

export {
    getUpcomingReminder,
    getAllReminders,
    createReminder,
    completeReminder
};