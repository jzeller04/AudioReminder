// Google API Configuration
const GoogleAPIConfig = {
  CLIENT_ID: '1009864072987-cmpm10gg8f73q21uteji2suo7eoklsml.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
};

// Google Authentication Controller
const GoogleAuth = {
  // State variables
  isInitialized: false,
  isAuthenticated: false,
  userData: null,
  
  // Initialize the Google Auth system
  init: async function() {
    console.log('Initializing Google Auth...');
    
    // Set a flag to track initialization
    if (this._initializing) {
      console.log('Google Auth already initializing, waiting...');
      return this._initPromise;
    }
    
    this._initializing = true;
    this._initPromise = new Promise(async (resolve) => {
      try {
        // Load GAPI and GIS scripts
        await this.loadGapiAndGis();
        this.isInitialized = true;
        console.log('Google Auth initialization complete');
        
        // Check if user was previously logged in
        this.checkLoginStatus();
        
        resolve(true);
      } catch (error) {
        console.error('Error initializing Google Auth:', error);
        this._initializing = false;
        resolve(false);
      }
    });
    
    return this._initPromise;
  },
  
  // Load GAPI and GIS libraries
  loadGapiAndGis: async function() {
    // Load GAPI (Google API Client)
    if (!window.gapi) {
      await this.loadScript('https://apis.google.com/js/api.js');
      console.log('GAPI script loaded');
    }
    
    // Load GAPI client
    await new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [GoogleAPIConfig.DISCOVERY_DOC]
          });
          console.log('GAPI client initialized');
          resolve();
        } catch (error) {
          console.error('Error initializing GAPI client:', error);
          reject(error);
        }
      });
    });
    
    // Load GIS (Google Identity Services)
    if (!window.google || !window.google.accounts) {
      await this.loadScript('https://accounts.google.com/gsi/client');
      console.log('GIS script loaded');
    }
  },
  
  // Helper method to load a script
  loadScript: function(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  verifyScopes: function(token) {
    if (!token || !token.scope) {
      return false;
    }
    
    // Check if the token has any calendar-related scopes
    const calendarScopes = [
      'https://www.googleapis.com/auth/calendar', // Full access
      'https://www.googleapis.com/auth/calendar.events', // Events access
      'https://www.googleapis.com/auth/calendar.events.owned', // User's own events
      'https://www.googleapis.com/auth/calendar.events.readonly', // Read-only events
    ];

    // Check if any of the required scopes are present
    const hasCalendarScope = calendarScopes.some(scope => 
      token.scope.includes(scope)
    );
    
    console.log(`Token scope verification: Calendar access ${hasCalendarScope ? 'GRANTED' : 'DENIED'}`);
    
    return hasCalendarScope;
  },
  
  // Token storage with tokenExpiry
  checkLoginStatus: function() {
    const tokenData = localStorage.getItem('googleTokenData');
    const tokenExpiry = localStorage.getItem('googleTokenExpiry');
    
    // Check if we have token data and it's not expired
    if (tokenData && tokenExpiry) {
      const currentTime = new Date().getTime();
      // Add a 5-minute buffer before expiry
      if (currentTime < parseInt(tokenExpiry) - (5 * 60 * 1000)) {
        try {
          const parsedToken = JSON.parse(tokenData);
          if (parsedToken && parsedToken.access_token) {
            // Set the token in gapi client
            gapi.client.setToken(parsedToken);
            
            // Set authentication state
            this.isAuthenticated = true;
            
            // Restore user data
            const userName = localStorage.getItem('googleUserName');
            const userEmail = localStorage.getItem('googleUserEmail');
            
            if (userName && userEmail) {
              this.userData = {
                name: userName,
                email: userEmail,
                picture: localStorage.getItem('googleUserPicture') || null
              };
              
              console.log('User restored from localStorage:', this.userData);
              
              // Dispatch login event
              window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                detail: this.userData 
              }));
              
              return true;
            }
          }
        } catch (error) {
          console.error('Error parsing token data:', error);
          this.clearAuthData();
        }
      } else {
        console.log('Token expired, will need to re-authenticate');
        this.clearAuthData();
      }
    }
    
    return false;
  },

  validateToken: function() {
    const tokenData = localStorage.getItem('googleTokenData');
    const tokenExpiry = localStorage.getItem('googleTokenExpiry');
    
    if (!tokenData || !tokenExpiry) {
      console.log('No token data found');
      return false;
    }
    
    // Check if token is expired (with 5-minute buffer)
    const currentTime = new Date().getTime();
    const isExpired = currentTime > (parseInt(tokenExpiry) - (5 * 60 * 1000));
    
    if (isExpired) {
      console.log('Token is expired, needs refresh');
      return false;
    }
    
    try {
      const parsedToken = JSON.parse(tokenData);
      if (parsedToken && parsedToken.access_token) {
        // Set the token in gapi client
        gapi.client.setToken(parsedToken);
        return true;
      }
    } catch (error) {
      console.error('Error parsing token data:', error);
    }
    
    return false;
  },
  
  // Sign in with Google
  signIn: function() {
    console.log('Attempting to sign in...');
    
    if (!this.isInitialized) {
      console.error('Google Auth not initialized yet');
      // Try to initialize first
      this.init().then(() => {
        if (this.isInitialized) {
          this.signIn(); // Recursively call signIn once initialized
        }
      });
      return;
    }
    
    // Clear any existing tokens to force a fresh authorization
    if (gapi.client.getToken() !== null) {
      console.log('Clearing existing token to ensure fresh consent with required scopes');
      gapi.client.setToken(null);
      localStorage.removeItem('googleTokenData');
      localStorage.removeItem('googleTokenExpiry');
    }
    
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GoogleAPIConfig.CLIENT_ID,
      scope: GoogleAPIConfig.SCOPES,
      callback: this.handleAuthResponse.bind(this)
    });
    
    // Always prompt for consent to ensure all needed scopes are granted
    tokenClient.requestAccessToken({ prompt: 'consent' });
  },
  
  // Handle the authentication response
  handleAuthResponse: async function(response) {
    if (response.error) {
      console.error('Error during authentication:', response.error);
      return;
    }
    
    console.log('Authentication successful, saving token');
    console.log('Granted scopes:', response.scope);
    
    // Verify calendar scope
    const calendarScopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ];
    
    const hasCalendarScope = calendarScopes.some(scope => 
      response.scope.includes(scope)
    );
    
    console.log(`Calendar access ${hasCalendarScope ? 'GRANTED' : 'DENIED'}`);
    
    if (!hasCalendarScope) {
      console.warn('Calendar scope is missing! Calendar integration will not work.');
      // Optionally, you could show a message to the user here
    }
    
    // Store token in gapi client
    gapi.client.setToken(response);
    
    // Calculate expiry time (subtract 5 minutes for safety margin)
    const expiryTime = new Date().getTime() + ((response.expires_in - 300) * 1000);
    
    // Save token data to localStorage
    const tokenData = {
      access_token: response.access_token,
      expires_in: response.expires_in,
      scope: response.scope,
      token_type: response.token_type
    };
    
    localStorage.setItem('googleTokenData', JSON.stringify(tokenData));
    localStorage.setItem('googleTokenExpiry', expiryTime.toString());
    
    // Set authentication state
    this.isAuthenticated = true;
    
    // Get user info
    await this.fetchUserInfo();
  },
  
  // Fetch user info
  fetchUserInfo: async function() {
    try {
      // Make sure we have a valid token
      const token = gapi.client.getToken();
      if (!token || !token.access_token) {
        console.error('No valid token available');
        return null;
      }
  
      console.log('Fetching user info with token', token.access_token.substring(0, 5) + '...');
      
      // Use the token to get user information
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('User info request failed:', response.status, errorText);
        throw new Error('Failed to fetch user info');
      }
      
      const userInfo = await response.json();
      
      // Store user data
      this.userData = {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      };
      
      // Save user data to localStorage
      localStorage.setItem('googleUserName', userInfo.name);
      localStorage.setItem('googleUserEmail', userInfo.email);
      localStorage.setItem('googleUserPicture', userInfo.picture || '');
      
      console.log('User authenticated:', this.userData);
      
      // Dispatch login event
      window.dispatchEvent(new CustomEvent('userLoggedIn', { 
        detail: this.userData 
      }));
      
      return this.userData;
    } catch (error) {
      console.error('Error fetching user info:', error);
      
      // Clear any invalid token data
      this.clearAuthData();
      
      return null;
    }
  },
  
  // Sign out
  signOut: function() {
    console.log('Signing out...');
    
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        console.log('Token revoked');
      });
      gapi.client.setToken(null);
    }
    
    // Clear auth data
    this.clearAuthData();
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
  },
  
  // Clear authentication data
  clearAuthData: function() {
    // Reset auth state
    this.isAuthenticated = false;
    this.userData = null;
    
    // Clear localStorage
    localStorage.removeItem('googleTokenData');
    localStorage.removeItem('googleUserName');
    localStorage.removeItem('googleUserEmail');
    localStorage.removeItem('googleUserPicture');
    
    console.log('User signed out, auth data cleared');
  },
  
  // Get current user data
  getUserData: function() {
    return this.userData;
  }
};

// Initialize Google Auth on script load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Google Auth
  GoogleAuth.init().then(() => {
    console.log('Google Auth initialization complete');
  }).catch((error) => {
    console.error('Error initializing Google Auth:', error);
  });
});

// Export the GoogleAuth object to make it globally available
window.GoogleAuth = GoogleAuth;