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
      
      // Get the current token
      const token = gapi.client.getToken();
      
      // Log the token info (for debugging)
      console.log('Using token:', JSON.stringify({
        token_exists: !!token,
        token_type: token?.token_type,
        token_partial: token?.access_token ? token.access_token.substring(0, 10) + '...' : 'null'
      }));
      
      // Verify token has the necessary scopes
      if (!token || !GoogleAuth.verifyScopes(token)) {
        console.log('Token missing or has insufficient scopes, requesting new consent');
        try {
          // Clear any existing tokens
          gapi.client.setToken(null);
          localStorage.removeItem('googleTokenData');
          localStorage.removeItem('googleTokenExpiry');
          
          // Request new authentication with explicit consent
          await GoogleAuth.signIn();
          
          // Verify the new token
          const newToken = gapi.client.getToken();
          if (!newToken || !GoogleAuth.verifyScopes(newToken)) {
            console.error('Failed to obtain token with required scopes');
            return [];
          }
        } catch (error) {
          console.error('Error refreshing authentication:', error);
          return [];
        }
      }
      
      try {
        // Print out the token being used (for debugging)
        console.log('Using token:', JSON.stringify({
          token_exists: !!gapi.client.getToken(),
          token_type: gapi.client.getToken()?.token_type,
          // Don't log the full token for security
          token_partial: gapi.client.getToken()?.access_token?.substring(0, 10) + '...'
        }));
        
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
        
        // Notify that events have been updated
        window.dispatchEvent(new CustomEvent('googleCalendarEventsUpdated', {
          detail: { events }
        }));
        
        return events;
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        
        // Check if it's an authorization error
        if (error.status === 401) {
          console.log('Authorization error, clearing token and retrying authentication');
          gapi.client.setToken(null);
          localStorage.removeItem('googleTokenData');
          localStorage.removeItem('googleTokenExpiry');
          
          // Suggest re-authentication to the user
          const authButton = document.getElementById('google-signin-btn');
          if (authButton) {
            console.log('Please click "Connect Google Calendar" to re-authenticate');
          }
        }
        
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