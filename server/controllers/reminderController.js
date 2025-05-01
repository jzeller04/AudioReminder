import fetch from 'node-fetch';
import User from '../models/user.js';
import { normalizeDate, dateToReadable, timeToTwelveSystem, formatDateTimeForGoogle, isSameDay } from '../utils/util.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse date from natural language
export const parseDateString = async (req, res) => {
    const { dateString } = req.body;
    
    try {
        // Use the utility functions from util.js
        const parsedDate = normalizeDate(dateString);
        const formattedDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        return res.json({ 
        success: true, 
        parsedDate: formattedDate 
        });
    } catch (error) {
        console.error('Error parsing date:', error);
        return res.status(400).json({ 
            success: false, 
            error: 'Could not parse date string' 
        });
    }
}

// Get upcoming reminders for homepage
const getUpcomingReminder = async (req, res) => {
    try {
        // Update old reminders first
        await updateUserReminders(req.session.userId);
        
        const template = await fs.readFile(path.join(__dirname, '../../views/index.html'), 'utf8');
        
        // Get both flagged and unflagged reminders
        const userReminders = await fetchUserReminders(req.session.userId);
        const importantReminders = await fetchImportant(req.session.userId);
        
        // Combine and sort all reminders by date and time
        const allReminders = [...importantReminders, ...userReminders].sort((a, b) => {
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

        let reminderHTML;
        if (allReminders.length > 0) {
            const reminder = allReminders[0];
            
            reminderHTML =
                `<div class="reminder-item"> 
                    <div class="reminder-content">
                        <p class="reminder-title">${reminder.title || 'Missing title'}</p>
                        <p class="reminder-description">${reminder.description || ''}</p>
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
                document.documentElement.setAttribute('data-theme', '${theme}');
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
        const reminders = await fetchUserReminders(req.session.userId);

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
                    ${reminder.flagged ? '<p class="flag-indicator">🚩 Important</p>' : ''}
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

const createReminder = async (req, res) => {
    const isJson = req.is('application/json');
    
    // Create a unique identifier for this request to prevent duplicates
    const requestId = Date.now().toString() + Math.random().toString().substring(2, 8);
    
    // Grab data from request
    const title = isJson ? req.body.title : req.body.title;
    const description = isJson ? req.body.description : req.body.memo;
    const date = isJson ? req.body.date : req.body.date;
    const time = isJson ? req.body.time : req.body.time;
    const location = isJson ? req.body.location : req.body.location;
    const flag = req.body.flagged === true || false; // Default to false
    
    // Google connect info
    const isGoogleConnected = req.body.googleConnected === true;
    const googleAuthToken = req.body.googleAuthToken;
    // Validate input
    if (!title || title.length > 30) {
        const message = !title ? 'Title is required' : 'Title too long (max 30 characters)';
        return respondError(res, isJson, 400, message);
    }
    if (description && description.length > 300) {
        return respondError(res, isJson, 400, 'Description too long (max 300 characters)');
    }
    try {
        // Check if we have a very similar reminder created in the last 5 seconds
        // This prevents duplicate submissions
        const user = await User.findById(req.session.userId);
        if (user) {
            const recentReminders = user.reminders.filter(r => {
                // Check if this is a very similar reminder created recently
                const isSimilar = r.title === title && 
                                r.time === time && 
                                isSameDay(new Date(r.date), new Date(date));
                
                // Check if it was created in the last 5 seconds
                const isRecent = new Date() - new Date(r.createdAt) < 5000; // 5 seconds
                
                return isSimilar && isRecent;
            });
            
            if (recentReminders.length > 0) {
                console.log("Prevented duplicate reminder creation");
                
                // Return the existing reminder instead of creating a new one
                const existingReminder = recentReminders[0];
                
                if (isJson) {
                    return res.json({
                        success: true,
                        message: 'Reminder already exists',
                        reminderId: existingReminder._id,
                        googleSynced: existingReminder.syncStatus === 'synced',
                        googleId: existingReminder.googleId
                    });
                } else {
                    return res.redirect('/newtask');
                }
            }
        }
        console.log(`Creating new reminder with requestId: ${requestId}`);
        
        // Save reminder locally with requestId for tracking
        const reminder = await saveReminderToUser(
            title, 
            description || "", 
            time, 
            date, 
            req.session.userId, 
            flag, 
            location,
            requestId // Pass the requestId for logging
        );
        // Track Google sync status
        let googleSynced = false;
        let googleId = null;
        // Try syncing to Google if connected - ONLY do this once
        if (isGoogleConnected && googleAuthToken) {
            console.log(`Syncing reminder ${reminder._id} to Google Calendar`);
            try {
                // Only create this single event in Google - avoid full sync
                const googleEvent = await pushReminderToGoogle(reminder, googleAuthToken);
                
                if (googleEvent && googleEvent.id) {
                // Update just this reminder with Google ID
                const updatedUser = await User.findById(req.session.userId);
                if (updatedUser) {
                    const updatedReminder = updatedUser.reminders.id(reminder._id);
                    if (updatedReminder) {
                        updatedReminder.googleId = googleEvent.id;
                        updatedReminder.syncStatus = 'synced';
                        updatedReminder.lastSyncedVersion = new Date().toISOString();
                        await updatedUser.save();
                        
                        googleSynced = true;
                        googleId = googleEvent.id;
                    }
                }
            }
            } catch (syncError) {
                console.error(`Failed to sync reminder ${reminder._id} with Google Calendar:`, syncError);
                // Continue with reminder creation even if sync fails
            }
        }
        // Return response based on format
        if (isJson) {
            return res.json({
                success: true,
                message: 'Reminder created successfully',
                reminderId: reminder._id,
                googleSynced,
                googleId,
                requestId // Include the requestId in the response for tracking
            });
        } else {
            return res.redirect('/newtask');
        }
    } catch (error) {
        console.error(`Error creating reminder (requestId: ${requestId}):`, error);
        return respondError(res, isJson, 500, 'Server error creating reminder');
    }
}

async function syncReminderToGoogle(reminder, authToken) {
    try {
        // Push to Google Calendar
        const googleEvent = await pushReminderToGoogle(reminder, authToken);
        
        // Safety check - make sure we have the user ID
        const userId = reminder.userId || 
                    (reminder._doc && reminder._doc.userId) || 
                    reminder.owner || 
                    reminder.user;
                    
        if (!userId) {
            console.error("No user ID available for reminder:", reminder._id);
            return { success: false, error: "User ID not found" };
        }

        // Find the user and the reminder in the database
        const user = await User.findById(userId);
        
        if (!user) {
            console.error(`User not found with ID: ${userId}`);
            return { success: false, error: "User not found" };
        }
        
        // Find the reminder in the user's reminders array
        const embeddedReminder = user.reminders.id(reminder._id);
        
        if (!embeddedReminder) {
            console.error(`Reminder not found in user's reminders: ${reminder._id}`);
            return { success: false, error: "Reminder not found in user document" };
        }
        
        // Update the reminder with Google Calendar info
        if (googleEvent && googleEvent.id) {
            console.log(`Updating reminder ${reminder._id} with Google ID: ${googleEvent.id}`);
            embeddedReminder.googleId = googleEvent.id;
            embeddedReminder.syncStatus = 'synced';
            embeddedReminder.lastSyncedVersion = new Date().toISOString();
            
            // Save the changes
            await user.save();
            
            return {
                success: true,
                googleId: googleEvent.id
            };
        } else {
            console.error("No Google event ID returned");
            return { success: false, error: "No Google event ID received" };
        }
    } catch (error) {
        console.error('Failed to sync reminder to Google Calendar:', error);

        // Try to mark reminder as needing push
        try {
            // Get the user ID from the reminder
            const userId = reminder.userId || 
                        (reminder._doc && reminder._doc.userId) || 
                        reminder.owner || 
                        reminder.user;
            
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    const reminderToUpdate = user.reminders.id(reminder._id);
                    if (reminderToUpdate) {
                        reminderToUpdate.syncStatus = 'needs_push';
                        await user.save();
                    }
                }
            }
        } catch (saveError) {
            console.error("Failed to mark reminder as needs_push after error:", saveError);
        }

        return { success: false, error: error.message };
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
                audioReminderId: reminder._id.toString(),
                audioReminderFlagged: reminder.flagged ? "true" : "false"
            }
        }
    };
    
    // Add location if available
    if (reminder.location) {
        event.location = reminder.location;
    }
    
    try {
        // Use node-fetch or the global fetch in a way that won't conflict
        const globalFetch = fetch;
        
        // Create new event in Google Calendar - no eventId reference here
        const response = await globalFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });
        
        // Handle response
        if (!response.ok) {
            let errorText = `Status: ${response.status}`;
            try {
                const responseText = await response.text();
                if (responseText) {
                    errorText = responseText;
                }
            } catch (e) {
                // If text() isn't available
                console.log("Couldn't get response text:", e);
            }
            throw new Error(`API request failed: ${errorText}`);
        }
        
        const responseData = await response.json();
        return responseData;
    } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        throw error;
    }
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
    const googleAuthToken = req.body.googleAuthToken;
    const isAjaxRequest = req.xhr || req.headers.accept?.includes('application/json');
    
    try {
    // First, check if the reminder has a Google ID and delete from Google if needed
    const user = await User.findById(req.session.userId);
    
    if (!user) {
        throw new Error("User not found");
    }
    
    const reminder = user.reminders.id(reminderId);
    
    if (!reminder) {
        throw new Error("Reminder not found");
    }
    
    let googleId = null;
    
    // If this reminder has a Google ID, try to delete it from Google
    if (reminder.googleId && googleAuthToken) {
        googleId = reminder.googleId;
        
        try {
        // Call API to delete from Google
        await deleteEventFromGoogle(googleId, googleAuthToken);
        console.log(`Successfully deleted event ${googleId} from Google Calendar`);
        } catch (googleError) {
        console.error('Error deleting event from Google Calendar:', googleError);
        // Continue with deletion locally even if Google deletion fails
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
    console.error('Error removing reminder:', error);
    
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

// Helper function to delete from Google Calendar
async function deleteEventFromGoogle(eventId, authToken) {
    try {
    console.log(`Attempting to delete event ${eventId} from Google Calendar`);
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
        'Authorization': `Bearer ${authToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`);
    }
    
    return true;
    } catch (error) {
    console.error(`Error deleting event ${eventId} from Google:`, error);
    throw error;
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
async function fetchUserReminders(userId) {
    try {
        // Safety check to ensure userId is a valid MongoDB ObjectId
        if (!userId || typeof userId !== 'string' || userId.includes('http')) {
            console.error('Invalid userId provided to fetchUserReminders function:', userId);
            return [];
        }

        // Get current date and time
        const now = new Date();
        
        // Create next week boundary
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 6);
        nextWeek.setHours(23, 59, 59, 999);

        // Make sure we're using a valid ObjectId for the query
        const user = await User.findById(userId, {reminders: 1});

        if (!user || !user.reminders) {
            return [];
        }

        // Filter relevant reminders (not flagged, not overdue)
        const reminders = user.reminders.filter(reminder => {
            // First check that this is not a flagged reminder
            if (reminder.flagged === true) {
                return false;
            }
            
            // Get reminder date
            const reminderDate = new Date(reminder.date);
            
            // If the reminder has a time
            if (reminder.time) {
                // Create full datetime for the reminder
                const [hours, minutes] = reminder.time.split(':').map(Number);
                const reminderDateTime = new Date(reminderDate);
                reminderDateTime.setHours(hours, minutes, 0, 0);
                
                // If the reminder datetime is in the past, filter it out
                if (reminderDateTime < now) {
                    return false;
                }
            } else {
                // For all-day reminders with no specific time, keep only if the date is today or in the future
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                
                if (reminderDate < today) {
                    return false;
                }
            }
            
            // Keep reminders within the next week
            return reminderDate <= nextWeek;
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
            const [hoursA, minutesA] = a.time ? a.time.split(':').map(Number) : [0, 0];
            const [hoursB, minutesB] = b.time ? b.time.split(':').map(Number) : [0, 0];
            
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
        // Get current date and time
        const now = new Date();
        
        // Create next week boundary
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 6);
        nextWeek.setHours(23, 59, 59, 999);
        
        const user = await User.findById(userId, {reminders: 1});
        
        if (!user || !user.reminders) {
            return [];
        }
        
        // Filter important reminders that are not overdue
        const reminders = user.reminders.filter(reminder => {
            // First check that this is a flagged reminder
            if (reminder.flagged !== true) {
                return false;
            }
            
            // Get reminder date
            const reminderDate = new Date(reminder.date);
            
            // If the reminder has a time
            if (reminder.time) {
                // Create full datetime for the reminder
                const [hours, minutes] = reminder.time.split(':').map(Number);
                const reminderDateTime = new Date(reminderDate);
                reminderDateTime.setHours(hours, minutes, 0, 0);
                
                // If the reminder datetime is in the past, filter it out
                if (reminderDateTime < now) {
                    return false;
                }
            } else {
                // For all-day reminders with no specific time, keep only if the date is today or in the future
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                
                if (reminderDate < today) {
                    return false;
                }
            }
            
            // Keep reminders within the next week
            return reminderDate <= nextWeek;
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
            const [hoursA, minutesA] = a.time ? a.time.split(':').map(Number) : [0, 0];
            const [hoursB, minutesB] = b.time ? b.time.split(':').map(Number) : [0, 0];
            
            if (hoursA !== hoursB) {
                return hoursA - hoursB;
            }
            
            return minutesA - minutesB;
        });
        
        console.log("Fetched and sorted important reminders:", reminders.length);
        return reminders;
    } catch (error) {
        console.error('Error fetching important reminders:', error);
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
async function saveReminderToUser(title, description, time, date, userId, flag, location, requestId = null) {
    try {
        // Store date in UTC to avoid timezone issues
        const normalizedDate = normalizeDate(date);

        console.log(`Saving reminder with normalized date: ${normalizedDate.toISOString()} (requestId: ${requestId || 'none'})`);

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
            lastSyncedVersion: new Date().toISOString(),
            _requestId: requestId // Store the requestId for tracking
        };

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        user.reminders.push(reminder);
        await user.save();

        // Get the created reminder (last one added)
        const createdReminder = user.reminders[user.reminders.length - 1];
        
        console.log(`Successfully saved reminder: ${createdReminder._id} (requestId: ${requestId || 'none'})`);
        return createdReminder;
    } catch (error) {
        console.error(`Failed to save reminder (requestId: ${requestId || 'none'}):`, error);
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
        // Use global.fetch to avoid conflicts with other fetch functions
        const globalFetch = fetch;
        
        const response = await globalFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            let errorText = `Status: ${response.status}`;
            try {
                errorText = await response.text();
            } catch (e) {
                console.log("Couldn't get response text:", e);
            }
            throw new Error(`API request failed: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching Google event ${eventId}:`, error);
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
    resolveConflict,
    syncReminderToGoogle,
    createExtendedProperties,
    extractExtendedProperties
};