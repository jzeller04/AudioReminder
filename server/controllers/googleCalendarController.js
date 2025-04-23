import User from '../models/user.js';
import { normalizeDate } from '../utils/util.js';

// Sync Google Calendar events
const syncGoogleEvents = async (req, res) => {
  try {
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
          isLocallyCreated: true, // Marks if it was created in AudioReminder and not Google
          syncStatus: 'needs_push' // Already synced with Google
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