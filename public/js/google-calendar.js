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
        
        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          date: new Date(start),
          time: this.extractTimeFromDateTime(start),
          source: 'google',
          calendarId: event.organizer?.email || null,
          creator: event.creator || null,
          organizer: event.organizer || null,
          eventType: event.eventType || null,
          self: event.organizer?.self || false
        };
      });
      
      console.log(`Fetched ${events.length} Google Calendar events`);
      this.events = events;
      
      // Sync with backend
      await this.syncEventsWithBackend(events);
      
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

  // Sync events with backend
  syncEventsWithBackend: async function(events) {
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
        time: event.time || '00:00'
      }));
      
      console.log('Sample event being sent:', formattedEvents[0]);
      
      const response = await fetch('/api/sync-google-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events: formattedEvents })  // Make sure events is wrapped in an object
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

  // Helper function to extract time from date-time string
  extractTimeFromDateTime: function(dateTimeStr) {
    if (!dateTimeStr) return '';
    if (!dateTimeStr.includes('T')) return ''; // All-day event

    const date = new Date(dateTimeStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  },
  
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