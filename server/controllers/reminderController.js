import User from '../models/user.js';
import { normalizeDate, dateToReadable, timeToTwelveSystem } from '../utils/util.js';
import { formatDateTimeForGoogle } from './googleCalendarController.js';
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
            const flaggedClass = reminder.flagged ? ' flagged-reminder' : '';
            
            reminderHTML =
                `<div class="reminder-item${flaggedClass}"> 
                    <div class="reminder-content">
                        <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                        <p class="reminder-description">${reminder.description || ''}</p>
                        <p class="reminder-flagged">${reminder.flagged || ''}</p>
                        <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                        <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                        ${reminder.flagged ? '<p class="flag-indicator">🚩 Important</p>' : ''}
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
}

// Get all reminders for tasks page
const getAllReminders = async (req, res) => {
    try {
        const template = await fs.readFile(path.join(__dirname, '../../views/tasks.html'), 'utf8');
        const importantReminders = await fetchImportant(req.session.userId);
        const reminders = await fetch(req.session.userId);

        let reminderHTML = importantReminders.map(reminder => {
            // Only show the "From Google Calendar" label for reminders not created locally
            const googleClass = reminder.googleId && reminder.isLocallyCreated !== true ? ' google-calendar-event' : '';
            const googleIdAttr = reminder.googleId ? ` data-google-id="${reminder.googleId}"` : '';
            const isLocallyCreatedAttr = ` data-is-locally-created="${reminder.isLocallyCreated === true}"`;
            // Add flagged class for styling
            const flaggedClass = reminder.flagged ? ' flagged-reminder' : '';
            
            return `<div class="reminder-item${googleClass}${flaggedClass}"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                    <p class="reminder-title">${reminder.location || ''}</p>
                    <p class="reminder-description">${reminder.description || ''}</p>
                    <p class="reminder-flagged" data-flagged="${reminder.flagged}"></p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                    ${reminder.googleId && reminder.isLocallyCreated !== true ? '<p class="reminder-source">From Google Calendar</p>' : ''}
                    ${reminder.flagged ? '<p class="flag-indicator">🚩 Important</p>' : ''}
                </div>
                <button class="flag-btn" data-id="${reminder._id}"${googleIdAttr}${isLocallyCreatedAttr}>${reminder.flagged ? 'Remove Flag' : 'Flag as Important'}</button>
                <button class="complete-btn" data-id="${reminder._id}"${googleIdAttr}${isLocallyCreatedAttr}>Mark Complete</button>
            </div>`;
        }).join('') + reminders.map(reminder => {
            // Same modifications for regular reminders
            const googleClass = reminder.googleId && reminder.isLocallyCreated !== true ? ' google-calendar-event' : '';
            const googleIdAttr = reminder.googleId ? ` data-google-id="${reminder.googleId}"` : '';
            const isLocallyCreatedAttr = ` data-is-locally-created="${reminder.isLocallyCreated === true}"`;
            // Add flagged class for styling
            const flaggedClass = reminder.flagged ? ' flagged-reminder' : '';
            
            return `<div class="reminder-item${googleClass}${flaggedClass}"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                    <p class="reminder-title">${reminder.location || ''}</p>
                    <p class="reminder-description">${reminder.description || ''}</p>
                    <p class="reminder-flagged" data-flagged="${reminder.flagged}"></p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'Missing date'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'Missing time'}</p>
                    ${reminder.googleId && reminder.isLocallyCreated !== true ? '<p class="reminder-source">From Google Calendar</p>' : ''}
                    ${reminder.flagged ? '<p class="flag-indicator">⭐ Important</p>' : ''}
                </div>
                <button class="flag-btn" data-id="${reminder._id}"${googleIdAttr}${isLocallyCreatedAttr}>${reminder.flagged ? 'Remove Flag' : 'Flag as Important'}</button>
                <button class="complete-btn" data-id="${reminder._id}"${googleIdAttr}${isLocallyCreatedAttr}>Mark Complete</button>
            </div>`;
        }).join('');

        const finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        return res.send(finalHTML);
    } catch (error) {
        console.log(error);
        return res.sendFile('404.html', { root: path.join(__dirname, '../../views') });
    }
}

async function syncReminderToGoogle(reminder, authToken) {
    try {
        const googleEvent = await pushReminderToGoogle(reminder, authToken);

        // Update reminder object fields
        if (googleEvent && googleEvent.id) {
            reminder.googleId = googleEvent.id;
            reminder.syncStatus = 'synced';
            reminder.lastSyncedVersion = googleEvent.extendedProperties?.private?.audioReminderVersion || new Date().toISOString();
        } else {
            console.warn('Google event did not return ID.');
            reminder.syncStatus = 'needs_push'; // fallback safety
        }

        await reminder.save(); // Save updated reminder

        return { success: true, googleId: reminder.googleId };
    } catch (error) {
        console.error('Failed to sync reminder to Google Calendar:', error);

        reminder.syncStatus = 'needs_push';
        await reminder.save();

        return { success: false, error };
    }
}


// Create new reminder
const createReminder = async (req, res) => {
    const isJson = req.is('application/json');
    
    // Grab data from request
    const title = isJson ? req.body.title : req.body.title;
    const description = isJson ? req.body.description : req.body.memo;
    const date = isJson ? req.body.date : req.body.date;
    const time = isJson ? req.body.time : req.body.time;
    const location = isJson ? req.body.location : req.body.location;
    const isGoogleConnected = req.body.googleConnected === true;
    const googleAuthToken = req.body.googleAuthToken;

    const flag = false; // Default flagged state

    // Validate input
    if (!title || title.length > 30) {
        const message = !title ? 'Title is required' : 'Title too long (max 30 characters)';
        return respondError(res, isJson, 400, message);
    }
    if (description && description.length > 300) {
        return respondError(res, isJson, 400, 'Description too long (max 300 characters)');
    }

    try {
        // Save reminder locally
        const reminder = await saveReminderToUser(
            title, 
            description || "", 
            time, 
            date, 
            req.session.userId, 
            flag, 
            location
        );

        // Try syncing to Google if connected
        if (isGoogleConnected && googleAuthToken) {
            await syncReminderToGoogle(reminder, googleAuthToken);
        }

        // Return response
        if (isJson) {
            return res.json({
                success: true,
                message: 'Reminder created successfully',
                reminderId: reminder._id,
                googleSynced: reminder.syncStatus === 'synced'
            });
        } else {
            return res.redirect('/newtask');
        }
    } catch (error) {
        console.error('Error saving reminder:', error);
        return respondError(res, isJson, 500, 'Server error creating reminder');
    }
}

// Helper function to push a reminder to Google
async function pushReminderToGoogle(reminder, authToken) {
    // Format event for Google Calendar
    const event = {
        summary: reminder.title,
        description: reminder.description || '',
        start: {
            dateTime: formatDateTimeForGoogle(reminder.date, reminder.time),
            timeZone: 'UTC'
        },
        end: {
            dateTime: formatDateTimeForGoogle(reminder.date, reminder.time, 60), // Add 60 minutes by default
            timeZone: 'UTC'
        },
        // Add extended properties to track origin
        extendedProperties: {
            private: {
                audioReminderOrigin: "true",
                audioReminderVersion: new Date().toISOString(),
                audioReminderId: reminder._id.toString()
            }
        }
    };
    
    // Add location if available
    if (reminder.location) {
        event.location = reminder.location;
    }
    
    // Create new event in Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });
    
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    
    const responseData = await response.json();
    
    return responseData;
}

// Extracts extended properties from Google Calendar event
function extractExtendedProperties(event) {
    const props = event.extendedProperties?.private || {};
    
    return {
        isAudioReminderOrigin: props.audioReminderOrigin === 'true',
        audioReminderId: props.audioReminderId || null,
        audioReminderVersion: props.audioReminderVersion || null,
        audioReminderFlagged: props.audioReminderFlagged === 'true'
    };
}

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
}

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
    
}

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
        // Store date in UTC to avoid timezone issues
        const normalizedDate = normalizeDate(date);

        console.log("Saving reminder with normalized date:", normalizedDate.toISOString());

        // Create reminder
        const reminder = {
            title: title,
            flagged: flag,
            description: description || "",
            date: normalizedDate,
            time: time,
            isLocallyCreated: true, // Marks if it was created in AudioReminder and not Google
            syncStatus: 'needs_push', // Shows it needs to be pushed to Google
            location: location,
            lastSyncedVersion: null // Will be updated after Google s
        };

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        user.reminders.push(reminder);
        await user.save();

        // Get the created reminder (last one added)
        const createdReminder = user.reminders[user.reminders.length - 1];

        console.log("Successfully saved reminder:", reminder);
        return createdReminder;
    } catch (error) {
        console.error("Failed to save reminder:", error);
        throw error;
    }
}

// Update reminder with Google ID
const updateReminderGoogleId = async (req, res) => {
    try {
        const { reminderId, googleId, syncStatus, lastSyncedVersion } = req.body;
        
        if (!reminderId || !googleId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Find the user and update the specific reminder
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Find the reminder by ID
        const reminder = user.reminders.id(reminderId);
        
        if (!reminder) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        // Update the Google ID and sync status
        reminder.googleId = googleId;
        reminder.syncStatus = syncStatus || 'synced';
        reminder.lastSyncedVersion = lastSyncedVersion || new Date().toISOString();

        // Save the user
        await user.save();

        return res.json({ success: true, message: 'Reminder updated with Google ID' });
    } catch (error) {
        console.error('Error updating reminder with Google ID:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Resolve conflict between local and Google Calendar versions
const resolveConflict = async (req, res) => {
    try {
        const { reminderId, resolution, googleAuthToken } = req.body;
        
        if (!reminderId || !resolution) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Find the user and get the reminder
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Find the reminder by ID
        const reminder = user.reminders.id(reminderId);
        
        if (!reminder) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        if (resolution === 'local') {
            // Keep local version and push to Google
            reminder.syncStatus = 'needs_push';
            reminder.lastSyncedVersion = new Date().toISOString();
        } else if (resolution === 'google' && googleAuthToken) {
            // Get the Google event and update local reminder
            const googleEvent = await fetchGoogleEvent(reminder.googleId, googleAuthToken);
            
            if (googleEvent) {
                // Update reminder with Google data
                reminder.title = googleEvent.summary;
                reminder.description = googleEvent.description || '';
                reminder.date = normalizeDate(googleEvent.start.dateTime || googleEvent.start.date);
                reminder.time = extractTimeFromDateTime(googleEvent.start.dateTime);
                reminder.flagged = googleEvent.extendedProperties?.private?.audioReminderFlagged === 'true';
                reminder.location = googleEvent.location || '';
                reminder.syncStatus = 'synced';
                reminder.lastSyncedVersion = googleEvent.extendedProperties?.private?.audioReminderVersion || new Date().toISOString();
            } else {
                // Google event not found, mark as deleted
                user.reminders.pull(reminder._id);
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid resolution option' });
        }
        
        // Save changes
        await user.save();
        
        return res.json({ 
            success: true, 
            message: 'Conflict resolved successfully',
            resolution
        });
    } catch (error) {
        console.error('Error resolving conflict:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Creates extended properties for Google Calendar events
function createExtendedProperties(isAudioReminderOrigin, audioReminderId, audioReminderFlagged, version) {
    return {
        private: {
            audioReminderOrigin: isAudioReminderOrigin ? 'true' : 'false',
            audioReminderId: audioReminderId || '',
            audioReminderFlagged: audioReminderFlagged ? 'true' : 'false',
            audioReminderVersion: version || new Date().toISOString()
        }
    };
}

// Get reminders that need to be pushed to Google
const getRemindersForGoogleSync = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Filter reminders that need to be pushed to Google
        const remindersToSync = user.reminders.filter(reminder => 
            (reminder.isLocallyCreated === true || reminder.syncStatus === 'needs_push') &&
            (!reminder.googleId || reminder.syncStatus === 'needs_push')
        );
        
        return res.json({
            success: true,
            count: remindersToSync.length,
            reminders: remindersToSync
        });
    } catch (error) {
        console.error('Error getting reminders for Google sync:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Helper function to fetch Google event
async function fetchGoogleEvent(eventId, authToken) {
    try {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching Google event:', error);
        return null;
    }
}

// Helper to extract time from datetime
function extractTimeFromDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    if (!dateTimeStr.includes('T')) return ''; // All-day event

    const date = new Date(dateTimeStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
}

function respondError(res, isJson, statusCode, message) {
    if (isJson) {
        return res.status(statusCode).json({
            success: false,
            message
        });
    } else {
        return res.redirect('/newtask'); // or send 500 error page if you want
    }
}

export {
    getUpcomingReminder,
    getAllReminders,
    createReminder,
    completeReminder,
    flagReminder,
    fetchImportant,
    updateReminderGoogleId,
    getRemindersForGoogleSync,
    resolveConflict
};