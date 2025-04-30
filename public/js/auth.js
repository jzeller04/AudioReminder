/* global gapi, google */

const GOOGLE_CONFIG = {
    CLIENT_ID: '1009864072987-cmpm10gg8f73q21uteji2suo7eoklsml.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.readonly',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
  };
  
  // Stores authentication state and methods
  const GoogleAuth = {
    // Track state
    isLoggedIn: false,
    userData: null,
    gapiLoaded: false,
    gisLoaded: false,
    tokenClient: null,
    
    // Initialize the auth module
    init: function() {
      // Check if user is already logged in from localStorage
      this.checkLoginStatus();
      
      // Load required Google API scripts
      this.loadGapiScript();
      this.loadGisScript();
    },
    
    // Load Google API client script
    loadGapiScript: function() {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => this.handleGapiLoaded();
      document.head.appendChild(script);
    },
    
    // Load Google Identity Services script
    loadGisScript: function() {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => this.handleGisLoaded();
      document.head.appendChild(script);
    },
    
    // Handle GAPI loaded
    handleGapiLoaded: function() {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
          });
          this.gapiLoaded = true;
          this.maybeEnableButtons();
          console.log('GAPI client initialized');
        } catch (err) {
          console.error('Error initializing GAPI client:', err);
        }
      });
    },
    
    // Handle GIS loaded
    handleGisLoaded: function() {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (tokenResponse) => this.handleAuthResponse(tokenResponse),
      });
      this.gisLoaded = true;
      this.maybeEnableButtons();
      console.log('Google Identity Services initialized');
    },
    
    // Enable auth buttons if APIs are loaded
    maybeEnableButtons: function() {
      if (this.gapiLoaded && this.gisLoaded) {
        const buttons = document.querySelectorAll('.google-auth-btn');
        buttons.forEach(button => {
          button.disabled = false;
        });
      }
    },
    
    // Sign in with Google
    signIn: function() {
      if (!this.tokenClient) {
        console.error('Token client not initialized yet');
        return;
      }
      
      if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent
        this.tokenClient.requestAccessToken({prompt: 'consent'});
      } else {
        // Skip account chooser for an existing session
        this.tokenClient.requestAccessToken({prompt: ''});
      }
    },
    
    // Handle auth response from Google
    handleAuthResponse: function(response) {
      if (response.error !== undefined) {
        console.error(response);
        return;
      }
      
      // Access token was successfully obtained
      console.log('Google authentication successful');
      
      // Get user info
      this.fetchUserInfo();
    },
    
    // Fetch Google user info
    fetchUserInfo: async function() {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            'Authorization': `Bearer ${gapi.client.getToken().access_token}`
          }
        });
        
        const userInfo = await response.json();
        
        // Store user data
        this.userData = {
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture
        };
        this.isLoggedIn = true;
        
        // Update UI
        this.updateUI();
        
        // Store login status in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', userInfo.name);
        localStorage.setItem('userEmail', userInfo.email);
        localStorage.setItem('userPicture', userInfo.picture || '');
        
        // Dispatch login event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
          detail: this.userData 
        }));
        
        console.log('User info retrieved:', this.userData);
        
        // Initialize calendar if on calendar page
        if (window.location.pathname.includes('calendar') && window.Calendar) {
          window.Calendar.loadCalendarEvents();
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    },
    
    // Handle Sign Out
    signOut: function() {
      const token = gapi.client.getToken();
      if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('Token revoked');
        });
        gapi.client.setToken(null);
      }
      
      // Reset authentication state
      this.isLoggedIn = false;
      this.userData = null;
      
      // Update UI to reflect logged out state
      this.updateUI();
      
      // Clear localStorage
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPicture');
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
      
      console.log('User signed out');
    },
    
    // Update the UI based on authentication state
    updateUI: function() {
      const signInButtons = document.querySelectorAll('.google-signin-btn');
      const signOutButtons = document.querySelectorAll('.google-signout-btn');
      const userInfoElements = document.querySelectorAll('.user-info');
      
      if (this.isLoggedIn && this.userData) {
        // User is logged in - update UI
        signInButtons.forEach(btn => btn.style.display = 'none');
        signOutButtons.forEach(btn => btn.style.display = 'inline-block');
        
        userInfoElements.forEach(element => {
          element.style.display = 'block';
          const nameSpan = element.querySelector('.user-name');
          const emailSpan = element.querySelector('.user-email');
          
          if (nameSpan) nameSpan.textContent = this.userData.name;
          if (emailSpan) emailSpan.textContent = this.userData.email;
        });
      } else {
        // User is logged out - update UI
        signInButtons.forEach(btn => btn.style.display = 'inline-block');
        signOutButtons.forEach(btn => btn.style.display = 'none');
        userInfoElements.forEach(element => element.style.display = 'none');
      }
    },
    
    // Check if user is already logged in from localStorage
    checkLoginStatus: function() {
      if (localStorage.getItem('isLoggedIn') === 'true') {
        this.isLoggedIn = true;
        this.userData = {
          name: localStorage.getItem('userName'),
          email: localStorage.getItem('userEmail'),
          picture: localStorage.getItem('userPicture')
        };
        this.updateUI();
      }
    },
    
    // Get current user data
    getUserData: function() {
      return this.userData;
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
      return this.isLoggedIn;
    },
    
    // Fetch Google Calendar events
    fetchCalendarEvents: async function() {
      if (!this.isLoggedIn || !gapi.client.getToken()) {
        console.log('User not logged in or token not available');
        return [];
      }
      
      try {
        const response = await gapi.client.calendar.events.list({
          'calendarId': 'primary',
          'timeMin': (new Date()).toISOString(),
          'showDeleted': false,
          'singleEvents': true,
          'maxResults': 10,
          'orderBy': 'startTime'
        });
        
        const events = response.result.items;
        console.log('Google Calendar events:', events);
        
        // Format events to match AudioReminder's format
        return events.map(event => {
          const start = event.start.dateTime || event.start.date;
          const startDate = new Date(start);
          
          return {
            id: event.id,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            date: startDate,
            time: this.formatTime(startDate),
            source: 'google'
          };
        });
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        return [];
      }
    },
    
    // Format time for calendar events
    formatTime: function(date) {
      if (!date) return '';
      
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${hours}:${minutes}`;
    }
  };
  
  // Initialize the auth module when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize Google Auth
    GoogleAuth.init();
  });
  
  // Export the GoogleAuth object so it can be used in other files
  window.GoogleAuth = GoogleAuth;