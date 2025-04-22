// Google API Configuration
const GoogleAPIConfig = {
    CLIENT_ID: '1009864072987-cmpm10gg8f73q21uteji2suo7eoklsml.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.readonly',
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
      
      try {
        // Load GAPI and GIS scripts
        await this.loadGapiAndGis();
        this.isInitialized = true;
        console.log('Google Auth initialization complete');
        
        // Check if user was previously logged in
        this.checkLoginStatus();
        
        return true;
      } catch (error) {
        console.error('Error initializing Google Auth:', error);
        return false;
      }
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
    
    // Check if user was previously logged in
    checkLoginStatus: function() {
      const tokenData = localStorage.getItem('googleTokenData');
      
      if (tokenData) {
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
            const userPicture = localStorage.getItem('googleUserPicture');
            
            if (userName && userEmail) {
              this.userData = {
                name: userName,
                email: userEmail,
                picture: userPicture || null
              };
              
              console.log('User already logged in:', this.userData);
              
              // Dispatch login event
              window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                detail: this.userData 
              }));
            }
          }
        } catch (error) {
          console.error('Error parsing token data:', error);
          this.clearAuthData();
        }
      }
    },
    
    // Sign in with Google
    signIn: function() {
      console.log('Attempting to sign in...');
      
      if (!this.isInitialized) {
        console.error('Google Auth not initialized yet');
        return;
      }
      
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GoogleAPIConfig.CLIENT_ID,
        scope: GoogleAPIConfig.SCOPES,
        callback: this.handleAuthResponse.bind(this)
      });
      
      // Request token
      if (gapi.client.getToken() === null) {
        // Prompt the user to select an account and consent
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of consent dialog for an existing session
        tokenClient.requestAccessToken({ prompt: '' });
      }
    },
    
    // Handle the authentication response
    handleAuthResponse: async function(response) {
      if (response.error) {
        console.error('Error during authentication:', response.error);
        return;
      }
      
      // Store token in gapi client
      gapi.client.setToken(response);
      
      // Save token to localStorage
      localStorage.setItem('googleTokenData', JSON.stringify(response));
      
      // Set authentication state
      this.isAuthenticated = true;
      
      // Get user info
      await this.fetchUserInfo();
    },
    
    // Fetch user info
    fetchUserInfo: async function() {
      try {
        // Use the token to get user information
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            'Authorization': `Bearer ${gapi.client.getToken().access_token}`
          }
        });
        
        if (!response.ok) {
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