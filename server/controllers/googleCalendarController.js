/* global fetch */
import User from '../models/user.js';
import { normalizeDate, formatDateTimeForGoogle } from '../utils/util.js';

// Creates extended properties for Google Calendar events
function createExtendedProperties(isAudioReminderOrigin, version) {
  return {
    private: {
      audioReminderOrigin: isAudioReminderOrigin ? 'true' : 'false',
      audioReminderVersion: version || new Date().toISOString()
    }
  };
}

// Extracts extended properties from Google Calendar event
function extractExtendedProperties(event) {
  const props = event.extendedProperties?.private || {};
  
  return {
    isAudioReminderOrigin: props.audioReminderOrigin === 'true',
    version: props.audioReminderVersion || null
  };
}

// Helper function to identify events that should be skipped
function shouldSkipEvent(event) {
  // 1. Skip Birthday events
  if (isBirthdayEvent(event)) {
    console.log(`Skipping birthday event: ${event.title}`);
    return true;
  }
  
  // 2. Skip Holiday events
  if (isHolidayEvent(event)) {
    console.log(`Skipping holiday event: ${event.title}`);
    return true;
  }
  
  // 3. Skip Calendar Subscriptions (sports, TV shows, etc.)
  if (isSubscriptionEvent(event)) {
    console.log(`Skipping subscription event: ${event.title}`);
    return true;
  }
  
  // 4. Skip Focus Time and Out of Office events
  if (isWorkspaceSpecialEvent(event)) {
    console.log(`Skipping workspace special event: ${event.title}`);
    return true;
  }
  
  // Include all other events
  return false;
}

// Check if event is a birthday
function isBirthdayEvent(event) {
  // Title-based detection
  if (event.title && typeof event.title === 'string') {
    const titleLower = event.title.toLowerCase();
    if (
      titleLower.includes('birthday') || 
      titleLower.includes('birth day') ||
      titleLower.includes('b-day') ||
      (titleLower.includes('born') && titleLower.includes('day'))
    ) {
      return true;
    }
  }
  
  // Calendar-based detection
  if (event.calendarId && event.calendarId.includes('birthday')) {
    return true;
  }
  
  // Creator-based detection (Google adds birthdays with this email)
  if (event.creator && event.creator.email === 'birthday@google.com') {
    return true;
  }
  
  return false;
}

// Check if event is a holiday
function isHolidayEvent(event) {
  // Calendar-based detection
  if (event.calendarId && (
      event.calendarId.includes('holiday') ||
      event.calendarId.includes('#holiday') ||
      event.calendarId.includes('holidays')
    )) {
    return true;
  }
  
  // Title-based detection
  if (event.title && typeof event.title === 'string') {
    const titleLower = event.title.toLowerCase();
    // Common holiday names
    const holidayKeywords = [
      'christmas', 'new year', 'easter', 'thanksgiving', 
      'holiday', 'memorial day', 'labor day', 'independence day',
      'veterans day', 'halloween', 'mlk', 'martin luther king',
      'presidents day', 'columbus day', 'juneteenth'
    ];
    
    if (holidayKeywords.some(keyword => titleLower.includes(keyword))) {
      return true;
    }
  }
  
  return false;
}

// Check if event is from a subscription calendar
function isSubscriptionEvent(event) {
  // Check calendar ID for common subscription patterns
  if (event.calendarId && (
      event.calendarId.includes('sports') ||
      event.calendarId.includes('tv') ||
      event.calendarId.includes('shows') ||
      event.calendarId.includes('movies') ||
      event.calendarId.includes('schedule') ||
      event.calendarId.includes('weather')
    )) {
    return true;
  }
  
  // Check for read-only events from external sources
  if (event.organizer && 
      event.organizer.self === false && 
      event.creator && 
      event.creator.self === false) {
    return true;
  }
  
  // Check for typical subscription event patterns
  if (event.title && typeof event.title === 'string') {
    const titleLower = event.title.toLowerCase();
    // Common subscription event patterns
    if (
      (titleLower.includes('vs') && (titleLower.includes('game') || titleLower.includes('match'))) ||
      (titleLower.includes('episode') && titleLower.includes('season')) ||
      (titleLower.includes('tv:') || titleLower.startsWith('tv ')) ||
      titleLower.includes('premiere') ||
      titleLower.includes('finale')
    ) {
      return true;
    }
  }
  
  return false;
}

// Check if event is a Google Workspace special event type
function isWorkspaceSpecialEvent(event) {
  // Check event type
  if (event.eventType === 'outOfOffice' || 
      event.eventType === 'focusTime' ||
      event.eventType === 'workingLocation') {
    return true;
  }
  
  // Check title patterns
  if (event.title && typeof event.title === 'string') {
    const titleLower = event.title.toLowerCase();
    if (
      titleLower.includes('out of office') ||
      titleLower.includes('ooo') ||
      titleLower.includes('focus time') ||
      titleLower.includes('do not disturb') ||
      titleLower.includes('busy') ||
      titleLower.includes('working from')
    ) {
      return true;
    }
  }
  
  return false;
}

// Sync Google Calendar events
const syncGoogleEvents = async (req, res) => {
  try {
    const { events, googleAuthToken } = req.body;
    
    if (!events || !Array.isArray(events) || !googleAuthToken) {
      return res.status(400).json({ error: 'No events provided, invalid format, or missing auth token' });
    }
    
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Processing ${events.length} Google Calendar events for user ${userId}`);
    
    // Create a map of existing Google events for faster lookups
    const existingGoogleEvents = new Map();
    user.reminders
      .filter(reminder => reminder.googleId)
      .forEach(reminder => {
        existingGoogleEvents.set(reminder.googleId, reminder);
      });
    
    // Track all reminders by a combination of title+date+time for duplicate detection
    const reminderKeys = new Map();
    user.reminders.forEach(reminder => {
      // Create a unique key using title, date, and time
      const dateStr = reminder.date instanceof Date ? 
                      reminder.date.toISOString().split('T')[0] : 
                      new Date(reminder.date).toISOString().split('T')[0];
      const timeStr = reminder.time || '00:00';
      const key = `${reminder.title.toLowerCase()}_${dateStr}_${timeStr}`;
      reminderKeys.set(key, reminder);
    });
    
    console.log(`Found ${existingGoogleEvents.size} existing Google events in database`);
    
    // Track Google IDs we process in this sync
    const processedGoogleIds = new Set();
    const addedEvents = [];
    const updatedEvents = [];
    const conflicts = [];
    
    // Current date for checking past-due events
    const now = new Date();
    
    // Process each Google Calendar event
    for (const event of events) {
      try {
        // Skip invalid events
        if (!event.title || !event.date) {
          console.log('Skipping invalid event:', event);
          continue;
        }
        
        // Skip events we should ignore
        if (shouldSkipEvent(event)) {
          continue;
        }
        
        // Process date properly
        console.log('Processing Google event:', event.title);
        const eventDate = new Date(event.date);
        
        if (isNaN(eventDate.getTime())) {
          console.log('Skipping event with invalid date:', event);
          continue;
        }
        
        // Extract extended properties
        const extProps = event.extendedProperties?.private || {};
                
        // Check if this is an event that originated from AudioReminder
        const isAudioReminderOrigin = extProps.audioReminderOrigin === "true";
        const audioReminderId = extProps.audioReminderId;
        const audioReminderVersion = extProps.audioReminderVersion;
        const audioReminderFlagged = extProps.audioReminderFlagged === "true";
        
        // Critical fix: Check if this reminder is in the past and should be skipped for sync
        let isPastDue = false;
        if (eventDate < now) {
          // Check time if available
          if (event.time) {
            const [hours, minutes] = event.time.split(':').map(Number);
            const fullDateTime = new Date(eventDate);
            fullDateTime.setHours(hours, minutes, 0, 0);
            
            if (fullDateTime < now) {
              isPastDue = true;
              console.log(`Event "${event.title}" is past due, skipping for sync`);
              
              // If this is a Google-created event that we're seeing for the first time, 
              // still add it to the calendar for historical purposes but mark it specially
              const existingReminder = existingGoogleEvents.get(event.id);
              if (!existingReminder && !isAudioReminderOrigin) {
                console.log(`Adding past-due Google event "${event.title}" for historical purposes only`);
                // Will continue processing this event for historical purposes only
              } else if (existingReminder) {
                // Skip updating if it's already in our system
                if (event.id) {
                  processedGoogleIds.add(event.id);
                }
                continue;
              } else {
                // Skip processing if it's a past-due AudioReminder-originated event not in our system
                continue;
              }
            }
          } else {
            // All-day event in the past
            isPastDue = true;
            
            // Skip unless it's a Google-created event we're seeing for the first time
            const existingReminder = existingGoogleEvents.get(event.id);
            if (!existingReminder && !isAudioReminderOrigin) {
              console.log(`Adding past-due all-day Google event "${event.title}" for historical purposes only`);
              // Will continue processing this event for historical purposes only
            } else if (existingReminder) {
              // Skip updating if it's already in our system
              if (event.id) {
                processedGoogleIds.add(event.id);
              }
              continue;
            } else {
              // Skip processing if it's a past-due AudioReminder-originated event not in our system
              continue;
            }
          }
        }
        
        // Create a composite key to check for duplicates
        const dateStr = eventDate.toISOString().split('T')[0];
        const timeStr = event.time || '00:00';
        const eventKey = `${event.title.toLowerCase()}_${dateStr}_${timeStr}`;
        
        if (isAudioReminderOrigin && audioReminderId) {
          console.log(`Found event that originated from AudioReminder: ${event.title}`);
        }
        
        // Track this Google ID
        if (event.id) {
          processedGoogleIds.add(event.id);
        }
        
        // Check if we already have this event by Google ID
        const existingReminder = existingGoogleEvents.get(event.id);
        
        // Check for duplicate by title, date and time
        const duplicateReminder = reminderKeys.get(eventKey);
        
        // If it exists in our system, update it
        if (existingReminder) {
          if (isPastDue && !isAudioReminderOrigin) {
            // Do not update past-due reminders from Google unless they originated from AudioReminder
            continue;
          }
          // Check for conflicts
          if (existingReminder.lastSyncedVersion && 
              audioReminderVersion && 
              existingReminder.lastSyncedVersion !== audioReminderVersion) {
            
            // Add to conflicts list
            conflicts.push({
              id: existingReminder._id.toString(),
              title: existingReminder.title,
              googleId: event.id,
              localVersion: existingReminder.lastSyncedVersion,
              googleVersion: audioReminderVersion
            });
            
            // Skip this event for now
            continue;
          }
          
          // Update existing event if needed
          let hasChanges = false;
          
          if (existingReminder.title !== event.title) {
            existingReminder.title = event.title;
            hasChanges = true;
          }
          
          // Use the improved normalizeDate function
          const normalizedDate = normalizeDate(eventDate);
          
          // Compare dates by checking if they refer to the same day
          const existingDay = existingReminder.date.getDate();
          const existingMonth = existingReminder.date.getMonth();
          const existingYear = existingReminder.date.getFullYear();
          
          const normalizedDay = normalizedDate.getDate();
          const normalizedMonth = normalizedDate.getMonth();
          const normalizedYear = normalizedDate.getFullYear();
          
          const datesRepresentSameDay = 
            existingDay === normalizedDay &&
            existingMonth === normalizedMonth &&
            existingYear === normalizedYear;
          
          if (!datesRepresentSameDay) {
            existingReminder.date = normalizedDate;
            hasChanges = true;
          }
          
          if (existingReminder.time !== (event.time || '00:00')) {
            existingReminder.time = event.time || '00:00';
            hasChanges = true;
          }
          
          if (existingReminder.description !== (event.description || '')) {
            existingReminder.description = event.description || '';
            hasChanges = true;
          }
          
          if (existingReminder.flagged !== audioReminderFlagged) {
            existingReminder.flagged = audioReminderFlagged;
            hasChanges = true;
          }
          
          if (existingReminder.location !== (event.location || '')) {
            existingReminder.location = event.location || '';
            hasChanges = true;
          }
          
          if (hasChanges) {
            existingReminder.syncStatus = 'synced';
            existingReminder.lastSyncedVersion = audioReminderVersion || new Date().toISOString();
            updatedEvents.push(existingReminder);
          }
        } 
        // If this has an audioReminderId, try to find by that ID
        else if (audioReminderId) {
          // Look for reminder by audioReminderId
          const reminderByOriginalId = user.reminders.find(r => 
            r._id.toString() === audioReminderId
          );
          
          if (reminderByOriginalId) {
            // This is our reminder that lost its googleId somehow
            reminderByOriginalId.googleId = event.id;
            reminderByOriginalId.syncStatus = 'synced';
            reminderByOriginalId.lastSyncedVersion = audioReminderVersion || new Date().toISOString();
            
            updatedEvents.push(reminderByOriginalId);
          } else if (!duplicateReminder && !isPastDue) {
            // Create a new reminder from the Google event - it was deleted locally
            // But ONLY if it's not a duplicate and not past due
            createNewReminderFromGoogleEvent(user, event, addedEvents);
          }
        }
        else if (!duplicateReminder && !isPastDue) {
          // Create a new reminder from the Google event ONLY if:
          // 1. It's not a duplicate, AND
          // 2. Either it's not past due OR it's a Google-created event (for historical purposes)
          createNewReminderFromGoogleEvent(user, event, addedEvents);
        } else if (duplicateReminder && !duplicateReminder.googleId) {
          // It's a duplicate by title and date, but doesn't have a Google ID
          // Update the Google ID
          console.log(`Found duplicate event by title and date: ${event.title} on ${dateStr}`);
          duplicateReminder.googleId = event.id;
          duplicateReminder.syncStatus = 'synced';
          duplicateReminder.lastSyncedVersion = audioReminderVersion || new Date().toISOString();
          updatedEvents.push(duplicateReminder);
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
      }
    }
    
    // Helper function to create new reminder from Google event
    function createNewReminderFromGoogleEvent(user, event, addedEvents) {
      const extProps = event.extendedProperties?.private || {};
      const audioReminderFlagged = extProps.audioReminderFlagged === "true";
      const audioReminderVersion = extProps.audioReminderVersion;
      
      const normalizedDate = normalizeDate(new Date(event.date));
      
      const reminder = {
        title: event.title,
        description: event.description || '',
        date: normalizedDate,
        time: event.time || '00:00',
        flagged: audioReminderFlagged,
        googleId: event.id,
        isLocallyCreated: false, // This was created in Google and imported to AudioReminder
        syncStatus: 'synced',
        lastSyncedVersion: audioReminderVersion || new Date().toISOString(),
        location: event.location || ''
      };
      
      // Create a key for this new reminder
      const dateStr = normalizedDate.toISOString().split('T')[0];
      const timeStr = event.time || '00:00';
      const key = `${event.title.toLowerCase()}_${dateStr}_${timeStr}`;
      
      // Add to title+date map to prevent future duplicates
      reminderKeys.set(key, reminder);
      
      // Add to user's reminders
      user.reminders.push(reminder);
      addedEvents.push(reminder);
    }
    
    // Create a set of all Google event IDs from the current sync
    const currentGoogleEventIds = new Set();
    events.forEach(event => {
      if (event.id) {
        currentGoogleEventIds.add(event.id);
      }
    });
    
    // Check for locally stored events that were deleted from Google
    const deletedReminders = [];
    user.reminders.forEach(reminder => {
      // Only check reminders with Google IDs that we're tracking
      if (reminder.googleId && !currentGoogleEventIds.has(reminder.googleId) && reminder.syncStatus === 'synced') {
        console.log(`Found reminder with Google ID ${reminder.googleId} that was deleted from Google Calendar`);
        
        // If the reminder originated from AudioReminder, mark it for re-push
        if (reminder.isLocallyCreated) {
          reminder.googleId = null;
          reminder.syncStatus = 'needs_push';
          reminder.lastSyncedVersion = new Date().toISOString();
          updatedEvents.push(reminder);
        } else {
          // If the reminder originated from Google, delete it locally too
          deletedReminders.push(reminder._id);
        }
      }
    });
    
    // Remove the identified reminders
    if (deletedReminders.length > 0) {
      for (let reminderId of deletedReminders) {
        const reminderIndex = user.reminders.findIndex(r => 
          r._id.toString() === reminderId.toString()
        );
        
        if (reminderIndex !== -1) {
          user.reminders.splice(reminderIndex, 1);
        }
      }
      
      console.log(`Removed ${deletedReminders.length} events deleted from Google Calendar`);
    }
    
    // Save the user with updated reminders
    await user.save();
    
    return res.status(200).json({
      message: `Successfully synced Google Calendar events (${addedEvents.length} added, ${updatedEvents.length} updated, ${deletedReminders.length} deleted)`,
      added: addedEvents.length,
      updated: updatedEvents.length,
      deleted: deletedReminders.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts
    });
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return res.status(500).json({ error: 'Server error syncing events' });
  }
}

// Helper function to delete an event from Google Calendar
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
      const errorText = await response.text();
      console.error(`Failed to delete event ${eventId}: ${response.status}`, errorText);
      throw new Error(`Failed to delete event: ${response.status}`);
    }
    
    console.log(`Successfully deleted event ${eventId} from Google Calendar`);
    return true;
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    return false;
  }
}

const pushRemindersToGoogle = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get Google auth token from client
    const authToken = req.body.googleAuthToken;
    if (!authToken) {
      return res.status(400).json({ error: 'Google auth token not provided' });
    }

    // Check if reminders with googleId still exist on Google
    for (const reminder of user.reminders) {
      if (reminder.googleId) {
        const checkResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${reminder.googleId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (checkResponse.status === 404) {
          console.log(`Google event ${reminder.googleId} not found. Resetting reminder ${reminder._id}`);
          reminder.googleId = null;
          reminder.syncStatus = 'needs_push';
        }
      }
    }

    // Find reminders that need to be pushed to Google
    const remindersToPush = user.reminders.filter(reminder => 
      reminder.syncStatus === 'needs_push'
    );
    
    console.log(`Found ${remindersToPush.length} reminders to push to Google Calendar`);
    
    if (remindersToPush.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders need syncing to Google Calendar',
        pushed: 0 
      });
    }
    
    // For each reminder that needs pushing
    const successfulPushes = [];
    const failedPushes = [];
    
    for (const reminder of remindersToPush) {
      try {
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
        
        let response;
        
        if (reminder.googleId) {
          // Update existing event
          response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${reminder.googleId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });
        } else {
          // Create new event
          response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });
        }
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Update reminder with Google ID and sync status
        reminder.googleId = responseData.id;
        reminder.syncStatus = 'synced';
        reminder.lastSyncedAt = new Date();
        
        successfulPushes.push({
          id: reminder._id,
          title: reminder.title,
          googleId: reminder.googleId
        });
      } catch (pushError) {
        console.error('Error pushing reminder to Google:', pushError);
        failedPushes.push({
          id: reminder._id,
          title: reminder.title,
          error: pushError.message
        });
      }
    }
    
    // Save changes to the user object
    await user.save();
    
    return res.status(200).json({
      message: `Successfully pushed ${successfulPushes.length} reminders to Google Calendar`,
      pushed: successfulPushes.length,
      failed: failedPushes.length,
      successfulPushes,
      failedPushes
    });
  } catch (error) {
    console.error('Error pushing reminders to Google Calendar:', error);
    return res.status(500).json({ error: 'Server error pushing reminders' });
  }
}

const removeGoogleReminders = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get Google auth token from client
    const authToken = req.body.googleAuthToken;
    
    if (!authToken) {
      return res.status(400).json({ error: 'Google auth token not provided' });
    }

    // 1. Find locally created reminders with Google IDs
    const localRemindersWithGoogleId = user.reminders.filter(reminder => 
      reminder.isLocallyCreated === true && reminder.googleId
    );
    
    // 2. Find reminders from Google
    const googleReminders = user.reminders.filter(reminder => 
      reminder.isLocallyCreated === false && reminder.googleId
    );
      
    console.log(`Found ${localRemindersWithGoogleId.length} local reminders with Google IDs to update`);
    console.log(`Found ${googleReminders.length} Google-originated reminders to remove`);
    
    // 3. Delete AudioReminder-originated events from Google Calendar
    const googleIds = localRemindersWithGoogleId.map(r => r.googleId);
    
    try {
      for (const googleId of googleIds) {
        if (!googleId) continue;
        await deleteEventFromGoogle(googleId, authToken);
      }
      console.log(`Attempted to delete ${googleIds.length} events from Google Calendar`);
    } catch (error) {
      console.error('Error deleting events from Google Calendar:', error);
      // Continue even if deletion fails
    }
    
    // 4. Remove the Google reminders from the user's reminders array
    const googleReminderIds = googleReminders.map(r => r._id.toString());
    
    // Use filter to keep only the reminders that aren't from Google
    user.reminders = user.reminders.filter(reminder => 
      !googleReminderIds.includes(reminder._id.toString())
    );
    
    // 5. Update local reminders to clear their Google IDs
    user.reminders.forEach(reminder => {
      if (reminder.googleId) {
        reminder.googleId = null;
        reminder.syncStatus = 'needs_push';
      }
    });
    
    // 6. Save the updated user
    await user.save();
    
    return res.status(200).json({
      message: `Successfully removed ${googleReminders.length} Google Calendar reminders and cleaned up ${localRemindersWithGoogleId.length} local reminders`,
      removed: googleReminders.length,
      updated: localRemindersWithGoogleId.length
    });
  } catch (error) {
    console.error('Error removing Google Calendar reminders:', error);
    return res.status(500).json({ error: 'Server error removing reminders' });
  }
}

export { 
  syncGoogleEvents, 
  pushRemindersToGoogle, 
  removeGoogleReminders,
  createExtendedProperties,
  extractExtendedProperties,
  formatDateTimeForGoogle
};