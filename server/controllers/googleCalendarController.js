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
    
    // First, remove existing Google Calendar events
    const initialCount = user.reminders.length;
    user.reminders = user.reminders.filter(reminder => !reminder.googleId);
    console.log(`Removed ${initialCount - user.reminders.length} existing Google events`);
    
    // Process each Google Calendar event
    const addedEvents = [];
    
    for (const event of events) {
      try {
        // Skip invalid events
        if (!event.title || !event.date) {
          console.log('Skipping invalid event:', event);
          continue;
        }
        
        // Skip events we don't want to include
        if (shouldSkipEvent(event)) {
          // The shouldSkipEvent function already logs which type it's skipping
          continue;
        }
        
        // Format date and time properly
        const eventDate = new Date(event.date);
        if (isNaN(eventDate.getTime())) {
          console.log('Skipping event with invalid date:', event);
          continue;
        }
        
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
      } catch (eventError) {
        console.error('Error processing event:', eventError);
      }
    }
    
    // Save the user with updated reminders
    await user.save();
    
    return res.status(200).json({
      message: `Successfully synced ${addedEvents.length} Google Calendar events`,
      added: addedEvents.length
    });
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return res.status(500).json({ error: 'Server error syncing events' });
  }
};

export { syncGoogleEvents };