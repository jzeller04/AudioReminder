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
      
      // Wait for Google Auth to be initialized
      if (!GoogleAuth.isInitialized) {
        console.log('Waiting for Google Auth to initialize...');
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (GoogleAuth.isInitialized) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      
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
    },
    
    // Initialize Calendar API
    initCalendarAPI: async function() {
      // Load the Calendar API if it's not already loaded
      if (!gapi.client.calendar) {
        return new Promise((resolve, reject) => {
          gapi.client.load('calendar', 'v3', () => {
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
      
      // Check if we have a token
      const token = gapi.client.getToken();
      if (!token) {
        console.log('No authentication token available');
        return [];
      }
      
      try {
        // Make sure Calendar API is initialized
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
            source: 'google'
          };
        });
        
        console.log(`Fetched ${events.length} Google Calendar events`);
        this.events = events;
        
        // Sync with backend
        await this.syncEventsWithBackend(events);
        
        // Notify that events have been updated
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
        
        const response = await fetch('/api/sync-google-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to sync events: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Events synced successfully:', result);
        return result;
      } catch (error) {
        console.error('Error syncing events with backend:', error);
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