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
        
        // Format date properly
        const eventDate = new Date(event.date);
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
          
          const normalizedDate = normalizeDate(eventDate);
          if (existingReminder.date.getTime() !== normalizedDate.getTime()) {
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
          const reminder = {
            title: event.title,
            description: event.description || '',
            date: normalizeDate(eventDate),
            time: event.time || '00:00',
            flagged: false,
            googleId: event.id,
            isLocallyCreated: false,  // Mark as created from Google
            syncStatus: 'synced'      // Already synced with Google
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
        // This event exists in our DB but wasn't in the sync, so it was deleted from Google
        deletedReminders.push(reminder._id);
      }
    }
    
    if (deletedReminders.length > 0) {
      user.reminders = user.reminders.filter(reminder => 
        !reminder.googleId || processedGoogleIds.has(reminder.googleId)
      );
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
    
    // For each reminder that needs pushing
    const successfulPushes = [];
    const failedPushes = [];
    
    // This would normally involve Google Calendar API calls
    // For this version, we'll simulate successful pushes to test the flow
    for (const reminder of remindersToPush) {
      try {
        // In a real implementation, you would:
        // 1. Create/update the event in Google Calendar using their API
        // 2. Get back the Google event ID
        // 3. Store that ID in the reminder
        
        // Simulation for testing:
        if (!reminder.googleId) {
          // This would be the ID returned from Google
          reminder.googleId = 'google_' + Math.random().toString(36).substring(2, 15);
        }
        
        // Mark as synced
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

export { syncGoogleEvents, pushRemindersToGoogle };