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
        const reminders = await fetch(req.session.userId);

        let reminderHTML = reminders.map(reminder =>
            `<div class="reminder-item"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                    <p class="reminder-description">${reminder.description || ''}</p>
                    <p class="reminder-flagged">${reminder.flagged || ''}</p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                </div>
                <button class="flag-btn" data-id="${reminder._id}">Flag as Important</button>
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
    const flag = true;

    if(title.length <= 30 && description.length <= 300)
    {
        if (title) {
            try {
                await saveReminderToUser(title, description, time, date, req.session.userId, flag);
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

const flagReminder = async (req, res) => {
    console.log('reminderID:', req.body.reminderId);
    console.log("valid?: ", mongoose.Types.ObjectId.isValid(req.body.reminderId));
    const reminderId = req.body.reminderId; // tdl for frontend (or Justin)
    try {
        await User.findOneAndUpdate(
            {
                _id: req.session.userId,
                "reminders._id": reminderId
            },
            {
                $set: {
                    "reminders.$.flagged": true
                }
            }
        );
        return res.redirect('/tasks');
    } catch (error) {
        console.log('Error flagging reminder:', error);
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
        return reminderDate >= today && reminderDate <= nextWeek;
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
async function saveReminderToUser(title, description, time, date, userId, flag) {
    try {
      // Store date in UTC to avoid timezone issues
      const normalizedDate = normalizeDate(date);
      
      console.log("Saving reminder with normalized date:", normalizedDate.toISOString());
      
      // Create reminder
      const reminder = {
        title: title,
        flagged: flag,
        description: description || "",
        date: normalizedDate,
        time: time
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
    flagReminder
};