function extractTimeFromDateTime(dateTimeStr) {
  if (!dateTimeStr || !dateTimeStr.includes('T')) return '';
  try {
    const date = new Date(dateTimeStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
}

/* global GoogleAuth, gapi, setTimeout, clearTimeout */
const GoogleCalendar = {
  // State
  isInitialized: false,
  events: [],

  // Initialize Google Calendar functionality
  init: async function() {
    console.log('Initializing Google Calendar...');

    // Check if Google Auth is available
    if (!window.GoogleAuth) {
      console.error('Google Auth not available');
      return false;
    }

    try {
      // Ensure Google Auth is fully initialized
      console.log('Waiting for Google Auth to initialize...');
      await GoogleAuth.init();
      console.log('Google Auth is now ready');

      // Initialize Calendar API
      try {
        await this.initCalendarAPI();
      } catch (error) {
        console.error('Error initializing Calendar API:', error);
      }

      // Listen for auth events
      window.addEventListener('userLoggedIn', () => {
        console.log('User logged in, fetching calendar events...');
        setTimeout(() => this.fetchEvents(), 1000); // Slight delay to ensure token is set
      });

      this.isInitialized = true;
      console.log('Google Calendar initialized');

      // Auto-fetch if user is already authenticated
      if (GoogleAuth.isAuthenticated) {
        console.log('User already authenticated, fetching events...');
        setTimeout(() => this.fetchEvents(), 1000);
      }

      return true;
    } catch (error) {
      console.error('Error during Google Calendar initialization:', error);
      return false;
    }
  },

  // Initialize Calendar API
  initCalendarAPI: async function() {
    if (!gapi.client.calendar) {
      return new Promise((resolve, reject) => {
        let isResolved = false;
  
        // Set a timeout to reject if loading takes too long
        const timeout = setTimeout(() => {
          if (!isResolved) {
            console.error('Calendar API load timed out');
            reject(new Error('Calendar API load timed out'));
          }
        }, 5000); // 5 seconds timeout
  
        gapi.client.load('calendar', 'v3', () => {
          clearTimeout(timeout);
          isResolved = true;
          console.log('Calendar API loaded');
          resolve();
        });
      });
    }
  
    return Promise.resolve();
  },
  
  // Fetch events from Google Calendar
  fetchEvents: async function() {
    console.log('Fetching events from Google Calendar...');
    
    // Make sure we're authenticated
    if (!GoogleAuth.isAuthenticated) {
      console.log('User not authenticated, cannot fetch events');
      return [];
    }
    
    try {
      // Initialize Calendar API if needed
      if (!gapi.client.calendar) {
        await this.initCalendarAPI();
      }
      
      // Call Google Calendar API
      const response = await gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 100,
        'orderBy': 'startTime'
      });
      
      // Process events
      const events = response.result.items.map(event => {
        const start = event.start.dateTime || event.start.date;
        
        // Extract extended properties if they exist
        const extendedProps = event.extendedProperties?.private || {};
        const isFromAudioReminder = extendedProps.audioReminderOrigin === 'true';
        const audioReminderId = extendedProps.audioReminderId || null;
        const audioReminderVersion = extendedProps.audioReminderVersion || null;
        const audioReminderFlagged = extendedProps.audioReminderFlagged === 'true';
        
        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          date: new Date(start),
          time: extractTimeFromDateTime(start),
          source: 'google',
          calendarId: event.organizer?.email || null,
          creator: event.creator || null,
          organizer: event.organizer || null,
          eventType: event.eventType || null,
          self: event.organizer?.self || false,
          // Extended properties for sync
          isFromAudioReminder: isFromAudioReminder,
          audioReminderId: audioReminderId,
          audioReminderVersion: audioReminderVersion,
          flagged: audioReminderFlagged,
          // Keep the raw extended properties for reference
          extendedProperties: event.extendedProperties || null,
          location: event.location || null
        };
      });
      
      console.log(`Fetched ${events.length} Google Calendar events`);
      this.events = events;
      
      // Get the current auth token
      const token = gapi.client.getToken();
      
      // Sync with backend
      if (token && token.access_token) {
        await this.syncEventsWithBackend(events, token.access_token);
      } else {
        console.warn('No auth token available for backend sync');
      }
      
      // Notify that events have been synced
      window.dispatchEvent(new CustomEvent('googleCalendarEventsUpdated', {
        detail: { events }
      }));
      
      return events;
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  },

  // Delete a Google Calendar event
  deleteEvent: async function(eventId) {
    console.log(`Attempting to delete Google Calendar event: ${eventId}`);
    
    // Check if user is authenticated
    if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated) {
      console.error('User not authenticated with Google');
      return { success: false, error: 'Not authenticated with Google' };
    }
    
    try {
      // Make sure Calendar API is initialized
      if (!gapi.client.calendar) {
        await this.initCalendarAPI();
      }
      
      // Call Google Calendar API to delete the event
      const response = await gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });
      
      console.log('Successfully deleted event from Google Calendar', response);
      return { success: true };
    } catch (error) {
      console.error('Error deleting event from Google Calendar:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || 'Failed to delete event from Google Calendar'
      };
    }
  },

  // Create a new event in Google Calendar
  createEvent: async function(reminder) {
    console.log(`Attempting to create Google Calendar event for reminder:`, reminder);
    
    // Check if user is authenticated
    if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated) {
      console.error('User not authenticated with Google');
      return { success: false, error: 'Not authenticated with Google' };
    }
    
    try {
      // Make sure Calendar API is initialized
      if (!gapi.client.calendar) {
        await this.initCalendarAPI();
      }
      
      // Format date and time for Google Calendar
      const reminderDate = new Date(reminder.date);
      let startDateTime, endDateTime;
      let isAllDay = false;
      
      if (reminder.time) {
        // Time is provided → combine date + time correctly
        const reminderDateTime = new Date(`${reminder.date}T${reminder.time}:00`);
        
        startDateTime = reminderDateTime.toISOString();
    
        const endDateTimeObj = new Date(reminderDateTime.getTime() + (60 * 60 * 1000)); // 1 hour later
        endDateTime = endDateTimeObj.toISOString();
      } else {
        // No time → all-day event
        isAllDay = true;
        const reminderDateObj = new Date(reminder.date + "T00:00:00"); // force local midnight
        startDateTime = reminderDateObj.toISOString().split('T')[0];
    
        const endDate = new Date(reminderDateObj);
        endDate.setDate(endDate.getDate() + 1);
        endDateTime = endDate.toISOString().split('T')[0];
      }
      
      // Current timestamp for version tracking
      const currentTimestamp = new Date().toISOString();
      
      // Create event resource with extended properties to track origin
      const event = {
        summary: reminder.title,
        description: reminder.description || '',
        start: isAllDay ? { date: startDateTime } : { dateTime: startDateTime },
        end: isAllDay ? { date: endDateTime } : { dateTime: endDateTime },
        reminders: {
          useDefault: true
        },
        // Add extended properties to track that this came from AudioReminder
        extendedProperties: {
          private: {
            audioReminderOrigin: "true",
            audioReminderVersion: currentTimestamp,
            audioReminderId: reminder._id || "",
            audioReminderFlagged: reminder.flagged ? "true" : "false"
          }
        }
      };
      
      // Add location if available
      if (reminder.location) {
        event.location = reminder.location;
      }
      
      // Call Google Calendar API to create the event
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });
      
      console.log('Successfully created event in Google Calendar', response);
      return { 
        success: true, 
        eventId: response.result.id,
        event: response.result,
        lastSyncedVersion: currentTimestamp
      };
    } catch (error) {
      console.error('Error creating event in Google Calendar:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || 'Failed to create event in Google Calendar'
      };
    }
  },

  // Update an existing event in Google Calendar
  updateEvent: async function(reminder) {
    console.log(`Attempting to update Google Calendar event for reminder:`, reminder);
    
    if (!reminder.googleId) {
      console.error('Cannot update event: no Google ID provided');
      return { success: false, error: 'No Google ID provided' };
    }
    
    // Check if user is authenticated
    if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated) {
      console.error('User not authenticated with Google');
      return { success: false, error: 'Not authenticated with Google' };
    }
    
    try {
      // Make sure Calendar API is initialized
      if (!gapi.client.calendar) {
        await this.initCalendarAPI();
      }
      
      // First, get the existing event to preserve any settings we don't want to change
      const existingEvent = await gapi.client.calendar.events.get({
        calendarId: 'primary',
        eventId: reminder.googleId
      });
      
      if (!existingEvent || !existingEvent.result) {
        throw new Error(`Event ${reminder.googleId} not found in Google Calendar`);
      }
      
      const event = existingEvent.result;
      
      // Format date and time for Google Calendar
      const reminderDate = new Date(reminder.date);
      let startDateTime, endDateTime;
      let isAllDay = false;
      
      if (reminder.time) {
        // Time is provided → combine date + time correctly
        const reminderDateTime = new Date(`${reminder.date}T${reminder.time}:00`);
        
        startDateTime = reminderDateTime.toISOString();
    
        const endDateTimeObj = new Date(reminderDateTime.getTime() + (60 * 60 * 1000)); // 1 hour later
        endDateTime = endDateTimeObj.toISOString();
      } else {
        // No time → all-day event
        isAllDay = true;
        const reminderDateObj = new Date(reminder.date + "T00:00:00"); // force local midnight
        startDateTime = reminderDateObj.toISOString().split('T')[0];
    
        const endDate = new Date(reminderDateObj);
        endDate.setDate(endDate.getDate() + 1);
        endDateTime = endDate.toISOString().split('T')[0];
      }
      
      // Current timestamp for version tracking
      const currentTimestamp = new Date().toISOString();
      
      // Update event with new values
      event.summary = reminder.title;
      event.description = reminder.description || '';
      
      if (isAllDay) {
        event.start = { date: startDateTime };
        event.end = { date: endDateTime };
      } else {
        event.start = { dateTime: startDateTime };
        event.end = { dateTime: endDateTime };
      }
      
      if (reminder.location) {
        event.location = reminder.location;
      }
      
      // Ensure extended properties exist
      if (!event.extendedProperties) {
        event.extendedProperties = { private: {} };
      } else if (!event.extendedProperties.private) {
        event.extendedProperties.private = {};
      }
      
      // Update extended properties
      event.extendedProperties.private.audioReminderOrigin = "true";
      event.extendedProperties.private.audioReminderVersion = currentTimestamp;
      event.extendedProperties.private.audioReminderId = reminder._id || "";
      event.extendedProperties.private.audioReminderFlagged = reminder.flagged ? "true" : "false";
      
      // Call Google Calendar API to update the event
      const response = await gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: reminder.googleId,
        resource: event
      });
      
      console.log('Successfully updated event in Google Calendar', response);
      return { 
        success: true, 
        eventId: response.result.id,
        event: response.result,
        lastSyncedVersion: currentTimestamp
      };
    } catch (error) {
      console.error('Error updating event in Google Calendar:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || 'Failed to update event in Google Calendar'
      };
    }
  },

  // Sync events with backend
  syncEventsWithBackend: async function(events, authToken) {
    if (!events || events.length === 0) {
      console.log('No events to sync with backend');
      return;
    }
    
    try {
      console.log(`Syncing ${events.length} Google Calendar events with backend...`);
      
      // Format events for the API
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        // Convert Date objects to ISO strings
        date: event.date instanceof Date ? event.date.toISOString() : event.date,
        time: event.time || '00:00',
        // Pass extended properties too
        extendedProperties: event.extendedProperties,
        // Include additional sync info
        isFromAudioReminder: event.isFromAudioReminder,
        audioReminderId: event.audioReminderId,
        audioReminderVersion: event.audioReminderVersion,
        flagged: event.flagged,
        location: event.location
      }));
      
      console.log('Sample event being sent:', formattedEvents[0]);
      
      const response = await fetch('/api/sync-google-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          events: formattedEvents,
          googleAuthToken: authToken
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sync error response:', response.status, errorText);
        throw new Error(`Failed to sync events: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Events synced successfully:', result);
      return result;
    } catch (error) {
      console.error('Error syncing events with backend:', error);
      // Don't throw the error further, just report it
      return { error: error.message };
    }
  },

  // Complete two-way sync between local DB and Google Calendar
  syncCalendar: async function() {
    console.log('Performing two-way sync with Google Calendar...');
    
    try {
      // Step 1: Get the Google auth token
      const token = gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('No valid Google auth token available');
      }
      
      // Step 2: Pull events from Google Calendar first
      await this.fetchEvents();
      
      // Step 3: Push local reminders to Google
      const pushResponse = await fetch('/api/push-to-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleAuthToken: token.access_token
        })
      });
      
      if (!pushResponse.ok) {
        throw new Error(`Push request failed: ${pushResponse.status}`);
      }
      
      const pushResult = await pushResponse.json();
      console.log('Push result:', pushResult);
      
      // Step 4: Handle conflicts if needed
      if (pushResult.conflicts && pushResult.conflicts.length > 0) {
        console.log(`${pushResult.conflicts.length} conflicts detected, preparing resolution...`);
        
        // In a real app, you'd show UI for conflicts
        if (typeof speak === 'function') {
          speak(`${pushResult.conflicts.length} calendar conflicts were detected. Please check your reminders.`);
        }
      }
      
      // Step 5: Refresh the calendar display
      if (window.Calendar) {
        window.Calendar.renderCalendar();
      }
      
      return {
        success: true,
        pulled: this.events.length,
        pushed: pushResult.pushed,
        conflicts: pushResult.conflicts?.length || 0
      };
    } catch (error) {
      console.error('Error during two-way sync:', error);
      throw error;
    }
  },

  // Push existing reminders to Google Calendar
  pushExistingReminders: async function() {
    console.log('Pushing existing reminders to Google Calendar');
    
    if (!window.GoogleAuth?.isAuthenticated) {
      console.error('User not authenticated with Google');
      return { success: false, error: 'Not authenticated with Google' };
    }
    
    try {
      // Fetch all reminders that need to be pushed to Google
      const response = await fetch('/api/get-reminders-to-push');
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      }
      
      const data = await response.json();
      const reminders = data.reminders || [];
      
      console.log(`Found ${reminders.length} reminders to push to Google`);
      
      if (reminders.length === 0) {
        return { success: true, pushed: 0, failed: 0 };
      }
      
      // Push each reminder to Google Calendar
      const results = { pushed: 0, failed: 0, details: [] };
      
      for (const reminder of reminders) {
        try {
          // Determine if this is a create or update operation
          let actionResult;
          
          if (reminder.googleId) {
            // Update existing event
            actionResult = await this.updateEvent(reminder);
          } else {
            // Create new event
            actionResult = await this.createEvent(reminder);
          }
          
          if (actionResult.success) {
            // Update the reminder with the Google ID and sync status
            await fetch('/api/update-reminder-google-id', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                reminderId: reminder._id,
                googleId: actionResult.eventId,
                syncStatus: 'synced',
                lastSyncedVersion: actionResult.lastSyncedVersion
              })
            });
            
            results.pushed++;
            results.details.push({
              reminder: reminder.title,
              status: 'success',
              googleId: actionResult.eventId,
              operation: reminder.googleId ? 'updated' : 'created'
            });
          } else {
            results.failed++;
            results.details.push({
              reminder: reminder.title,
              status: 'failed',
              error: actionResult.error
            });
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            reminder: reminder.title,
            status: 'error',
            error: error.message
          });
        }
      }
      
      results.success = true;
      return results;
    } catch (error) {
      console.error('Error pushing reminders to Google Calendar:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to push reminders to Google Calendar'
      };
    }
  },

  // Handle disconnection from Google Calendar
  disconnectCalendar: async function() {
    console.log('Disconnecting from Google Calendar...');
    
    if (!window.GoogleAuth?.isAuthenticated) {
      console.error('User not authenticated with Google');
      return { success: false, error: 'Not authenticated with Google' };
    }
    
    try {
      // Step 1: Get the auth token
      const token = gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('No valid auth token available');
      }
      
      // Step 2: Call API to remove Google reminders
      const response = await fetch('/api/remove-google-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleAuthToken: token.access_token
        })
      });
      
      if (!response.ok) {
        throw new Error(`Remove reminders request failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Removed Google Calendar reminders:', result);
      
      // Step 3: Sign out of Google
      await GoogleAuth.signOut();
      
      // Step 4: Set flag to refresh calendar on next load
      localStorage.setItem('refreshCalendarOnNextLoad', 'true');
      
      return {
        success: true,
        removed: result.removed || 0,
        updated: result.updated || 0
      };
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      
      // Still try to sign out if there was an error
      try {
        await GoogleAuth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to disconnect from Google Calendar'
      };
    }
  },
  
  // Push local reminders to Google Calendar (main push function)
  pushRemindersToGoogle: async function() {
    if (!GoogleAuth.isAuthenticated) {
      console.error('User not authenticated');
      return { error: 'Not authenticated' };
    }
    
    try {
      const token = gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('No valid token available');
      }
      
      const response = await fetch('/api/push-to-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleAuthToken: token.access_token
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to push reminders: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Push complete:', result);
      
      // Refresh calendar display after successful push
      if (window.Calendar) {
        window.Calendar.renderCalendar();
      }
      
      return result;
    } catch (error) {
      console.error('Error pushing reminders to Google:', error);
      return { error: error.message };
    }
  },
  
  // Resolve a conflict between local and Google Calendar versions
  resolveConflict: async function(reminderId, resolution) {
    console.log(`Resolving conflict for reminder ${reminderId} with resolution: ${resolution}`);
    
    if (!GoogleAuth.isAuthenticated) {
      console.error('User not authenticated');
      return { success: false, error: 'Not authenticated' };
    }
    
    try {
      const token = gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('No valid token available');
      }
      
      const response = await fetch('/api/resolve-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reminderId: reminderId,
          resolution: resolution, // 'local' or 'google'
          googleAuthToken: token.access_token
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to resolve conflict: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Conflict resolution complete:', result);
      
      // Refresh calendar display after conflict resolution
      if (window.Calendar) {
        window.Calendar.renderCalendar();
      }
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('/calendar')) {
    // Initialize Google Calendar
    GoogleCalendar.init();
  }
});

// Export to window
window.GoogleCalendar = GoogleCalendar;