import User from '../models/user.js';
import { normalizeDate, dateToReadable, timeToTwelveSystem } from '../utils/util.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';

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
                        <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                        <p class="reminder-description">${reminder.description || ''}</p>
                        <p class="reminder-flagged">${reminder.flagged || ''}</p>
                        <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                        <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
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
        const importantReminders = await fetchImportant(req.session.userId);
        const reminders = await fetch(req.session.userId);

        let reminderHTML = importantReminders.map(reminder => {
          // Add Google Calendar specific class and data attribute if applicable
            const googleClass = reminder.googleId ? ' google-calendar-event' : '';
            const googleIdAttr = reminder.googleId ? ` data-google-id="${reminder.googleId}"` : '';
            
            return `<div class="reminder-item${googleClass}"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                    <p class="reminder-title">${reminder.location || ''}</p>
                    <p class="reminder-description">${reminder.description || ''}</p>
                    <p class="reminder-flagged" data-flagged="${reminder.flagged}"></p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                    ${reminder.googleId ? '<p class="reminder-source">From Google Calendar</p>' : ''}
                </div>
                <button class="flag-btn" data-id="${reminder._id}"${googleIdAttr}>Flag as Important</button>
                <button class="complete-btn" data-id="${reminder._id}"${googleIdAttr}>Mark Complete</button>
            </div>`;
        }).join('') + reminders.map(reminder => {
            // Add Google Calendar specific class and data attribute if applicable
            const googleClass = reminder.googleId ? ' google-calendar-event' : '';
            const googleIdAttr = reminder.googleId ? ` data-google-id="${reminder.googleId}"` : '';
            
            return `<div class="reminder-item${googleClass}"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                    <p class="reminder-title">${reminder.location || ''}</p>
                    <p class="reminder-description">${reminder.description || ''}</p>
                    <p class="reminder-flagged" data-flagged="${reminder.flagged}"></p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                    ${reminder.googleId ? '<p class="reminder-source">From Google Calendar</p>' : ''}
                </div>
                <button class="flag-btn" data-id="${reminder._id}"${googleIdAttr}>Flag as Important</button>
                <button class="complete-btn" data-id="${reminder._id}"${googleIdAttr}>Mark Complete</button>
            </div>`;
            }).join('');

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
    const flag = false;
    const location = req.body.location;

    if(title.length <= 30 && description.length <= 300)
    {
        if (title) {
            try {
                await saveReminderToUser(title, description, time, date, req.session.userId, flag, location);
                return res.redirect('/newtask');
            } catch (error) {
                console.log(error);
                return res.status(500).send("Error saving reminder");
            }
        } else {
            return res.status(400).send("No title received");
        }
    }
    else
    {
        return res.redirect('newtask');
    }
    
    
};

// Mark reminder as complete
// Mark reminder as complete
const completeReminder = async (req, res) => {
    const reminderId = req.body.reminderId;
    const deleteFromGoogle = req.body.deleteFromGoogle === 'true'; // Flag to indicate if we should try to delete from Google
    const isAjaxRequest = req.xhr || req.headers.accept?.includes('application/json');
    
    try {
        // First, check if the reminder has a Google ID (if we need to delete it from Google later)
        let googleId = null;
        if (deleteFromGoogle) {
            const user = await User.findById(req.session.userId);
            if (user) {
                const reminder = user.reminders.id(reminderId);
                if (reminder && reminder.googleId) {
                    googleId = reminder.googleId;
                }
            }
        }
        
        // Now remove the reminder from our database
        await User.findOneAndUpdate(
            { _id: req.session.userId },
            { $pull: { reminders: { _id: reminderId } } }
        );
        
        // If it's an AJAX request, return JSON
        if (isAjaxRequest) {
            return res.json({
                success: true, 
                message: 'Reminder marked as complete',
                googleId: googleId
            });
        } else {
            // For regular form submits, redirect back to tasks page
            return res.redirect('/tasks');
        }
    } catch (error) {
        console.log('Error removing reminder:', error);
        
        // Handle error based on request type
        if (isAjaxRequest) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error removing reminder' 
            });
        } else {
            // For regular form submits, redirect back to tasks page with error
            return res.redirect('/tasks?error=failed-to-complete');
        }
    }
};

const flagReminder = async (req, res) => {
    console.log('reminderID:', req.body.reminderId);
    console.log("valid?: ", mongoose.Types.ObjectId.isValid(req.body.reminderId));
    const reminderId = req.body.reminderId; // tdl for frontend (or Justin)
    try {
        const user = await User.findOne({ _id: req.session.userId });

        if (!user) throw new Error("User not found");

        const reminder = user.reminders.id(reminderId);
        if (!reminder) throw new Error("Reminder not found");

        // Toggle flagged
        reminder.flagged = !reminder.flagged;

        await user.save();

        return res.redirect('/tasks');
    } catch (error) {
        console.error('Error toggling reminder flag:', error);
        return res.redirect('/tasks');
    }
    
};

// Fetch user reminders
async function fetch(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 6);
        nextWeek.setHours(23, 59, 59, 999);

        const user = await User.findById(userId, {reminders: 1});

        if (!user || !user.reminders) {
        return [];
        }

        // Filter relevant reminders
        const reminders = user.reminders.filter(reminder => {
        const reminderDate = new Date(reminder.date);
        return reminderDate >= today && reminderDate <= nextWeek && reminder.flagged == false;
        });

        // Sort reminders by date and time
        reminders.sort((a, b) => {
        // First compare by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        
        // If same date, compare by time
        const [hoursA, minutesA] = a.time.split(':').map(Number);
        const [hoursB, minutesB] = b.time.split(':').map(Number);
        
        if (hoursA !== hoursB) {
            return hoursA - hoursB;
        }
        
        return minutesA - minutesB;
        });
        
        console.log("Fetched and sorted reminders:", reminders.length);
        return reminders;
    } catch (error) {
        console.error('Error fetching reminders:', error);
        return [];
    }
}

async function fetchImportant(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 6);
        nextWeek.setHours(23, 59, 59, 999);
        
        const user = await User.findById(userId, {reminders: 1});
        
        if (!user || !user.reminders) {
        return [];
        }
        
        // Filter relevant reminders
        const reminders = user.reminders.filter(reminder => {
        const reminderDate = new Date(reminder.date);
        return reminderDate >= today && reminderDate <= nextWeek && reminder.flagged == true;
        });
        
        // Sort reminders by date and time
        reminders.sort((a, b) => {
        // First compare by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        
        // If same date, compare by time
        const [hoursA, minutesA] = a.time.split(':').map(Number);
        const [hoursB, minutesB] = b.time.split(':').map(Number);
        
        if (hoursA !== hoursB) {
            return hoursA - hoursB;
        }
        
        return minutesA - minutesB;
        });
        console.log("Fetched and sorted reminders:", reminders.length);
        return reminders;
    } catch (error) {
        console.error('Error fetching reminders:', error);
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
async function saveReminderToUser(title, description, time, date, userId, flag, location) {
    try {
        console.log('Saving reminder with date input:', date);

        // Store date in UTC to avoid timezone issues
        const normalizedDate = normalizeDate(date);

        console.log("Saving reminder with normalized date:", normalizedDate.toISOString());
        console.log("Local date representation:", normalizedDate.toLocaleString());

        // Create reminder
        const reminder = {
            title: title,
            flagged: flag,
            description: description || "",
            date: normalizedDate,
            time: time,
            isLocallyCreated: true, // Marks if it was created in AudioReminder and not Google
            syncStatus: 'needs_push', // Shows it needs to be pushed to Google
            location: location
        };

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        user.reminders.push(reminder);
        await user.save();

        console.log("Successfully saved reminder:", reminder);
        return true;
    } catch (error) {
        console.error("Failed to save reminder:", error);
        throw error;
    }
}

export {
    getUpcomingReminder,
    getAllReminders,
    createReminder,
    completeReminder,
    flagReminder,
    fetchImportant
};