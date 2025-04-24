import User from '../models/user.js';
import { normalizeDate } from '../utils/util.js';

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
    // Log the raw request body for debugging
    console.log('Received request body:', req.body);
    
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'No events provided or invalid format' });
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
    
    console.log(`Found ${existingGoogleEvents.size} existing Google events in database`);
    
    // Track Google IDs we process in this sync
    const processedGoogleIds = new Set();
    const addedEvents = [];
    const updatedEvents = [];
    
    // Process each Google Calendar event
    for (const event of events) {
      try {
        // Skip invalid events
        if (!event.title || !event.date) {
          console.log('Skipping invalid event:', event);
          continue;
        }
        
        // Skip events we don't want to include
        if (shouldSkipEvent(event)) {
          continue;
        }
        
        // Format date properly - add detailed logging
        console.log('Processing Google event:', event.title);
        console.log('Original event date string:', event.date);
        
        // Parse date string to a Date object
        const eventDate = new Date(event.date);
        console.log('Parsed event date object:', eventDate);
        console.log('Event date in local timezone:', eventDate.toLocaleString());
        
        if (isNaN(eventDate.getTime())) {
          console.log('Skipping event with invalid date:', event);
          continue;
        }
        
        // Check if we already have this event
        const existingReminder = existingGoogleEvents.get(event.id);
        processedGoogleIds.add(event.id);
        
        if (existingReminder) {
          // Update existing event if needed
          let hasChanges = false;
          
          if (existingReminder.title !== event.title) {
            existingReminder.title = event.title;
            hasChanges = true;
          }
          
          // Use the improved normalizeDate function
          const normalizedDate = normalizeDate(eventDate);
          
          // Log detailed date information for debugging
          console.log('Existing reminder date:', existingReminder.date.toISOString());
          console.log('Normalized date for comparison:', normalizedDate.toISOString());
          
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
          
          console.log('Dates represent same day?', datesRepresentSameDay);
          
          if (!datesRepresentSameDay) {
            console.log('Updating date for event:', event.title);
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
          
          if (hasChanges) {
            existingReminder.syncStatus = 'synced';
            updatedEvents.push(existingReminder);
          }
        } else {
          // Create a new reminder from the Google event
          const normalizedDate = normalizeDate(eventDate);
          console.log('Creating new event with normalized date:', normalizedDate.toISOString());
          
          const reminder = {
            title: event.title,
            description: event.description || '',
            date: normalizedDate,
            time: event.time || '00:00',
            flagged: false,
            googleId: event.id,
            isLocallyCreated: false,
            syncStatus: 'synced'
          };
          
          // Add to user's reminders
          user.reminders.push(reminder);
          addedEvents.push(reminder);
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
      }
    }
    
    //Handle deletions, events that exist in our DB but weren't in this sync
    // Commenting out while I test pushing/pulling from Google Calendaer
    /*
    const deletedReminders = [];
    for (const [googleId, reminder] of existingGoogleEvents) {
      if (!processedGoogleIds.has(googleId)) {
        // This event exists in our DB but wasn't in the sync
        // We need to check if it was actually deleted from Google
        try {
          // We would normally verify with Google Calendar API
          // But for this implementation, we'll consider it deleted if:
          // 1. It has a googleId (meaning it came from Google originally)
          // 2. It's not in the current sync batch

          // Mark the reminder for deletion
          deletedReminders.push(reminder._id);
        } catch (error) {
          console.error(`Error checking if event ${googleId} was deleted:`, error);
          // Skip this reminder if there's an error
          continue;
        }
      }
    }

    // Now actually remove the deleted reminders
    if (deletedReminders.length > 0) {
      // Remove reminders by ID rather than by googleId to be more precise
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
    */
    
    // Save the user with updated reminders
    await user.save();
    
    return res.status(200).json({
      message: `Successfully synced Google Calendar events (${addedEvents.length} added, ${updatedEvents.length} updated)`,
      added: addedEvents.length,
      updated: updatedEvents.length
    });
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return res.status(500).json({ error: 'Server error syncing events' });
  }
};


const pushRemindersToGoogle = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find reminders that need to be pushed to Google
    const remindersToPush = user.reminders.filter(reminder => 
      (reminder.isLocallyCreated === true || reminder.syncStatus === 'needs_push') &&
      (reminder.googleId === null || reminder.syncStatus === 'needs_push')
    );
    
    console.log(`Found ${remindersToPush.length} reminders to push to Google Calendar`);
    
    if (remindersToPush.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders need syncing to Google Calendar',
        pushed: 0 
      });
    }
    
    // Get Google auth token from client
    const authToken = req.body.googleAuthToken;
    if (!authToken) {
      return res.status(400).json({ error: 'Google auth token not provided' });
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
          }
        };
        
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
};

function resolveConflict(localReminder, googleEvent) {
  // Compare last modified timestamps
  const localModified = new Date(localReminder.updatedAt);
  const googleModified = new Date(googleEvent.updated);
  
  // If Google event is newer, use it as source of truth
  if (googleModified > localModified) {
    return {
      title: googleEvent.summary,
      description: googleEvent.description || '',
      date: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      time: extractTimeFromDateTime(googleEvent.start.dateTime),
      googleId: googleEvent.id,
      syncStatus: 'synced',
      isLocallyCreated: false
    };
  } 
  
  // If local reminder is newer or same time, use it
  return {
    ...localReminder,
    syncStatus: 'needs_push' // Mark for push back to Google
  };
}

// Helper function to format date and time for Google Calendar
function formatDateTimeForGoogle(date, time, addMinutes = 0) {
  const dateObj = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  
  dateObj.setHours(hours, minutes, 0, 0);
  
  if (addMinutes) {
    dateObj.setMinutes(dateObj.getMinutes() + addMinutes);
  }
  
  return dateObj.toISOString();
}

export { syncGoogleEvents, pushRemindersToGoogle };