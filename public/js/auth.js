// Google API Config
const GOOGLE_CONFIG = {
  CLIENT_ID: '1009864072987-cmpm10gg8f73q21uteji2suo7eoklsml.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar'
};

// Stores authentication state and methods
const GoogleAuth = {
  // Track state
  isLoggedIn: false,
  userData: null,
  // Set up the Google Sign-In elements
  setupGoogleSignIn: function() {
      // Load custom CSS for Google buttons if it's not already loaded
      if (!document.querySelector('link[href="css/google.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'css/google.css';
          document.head.appendChild(link);
      }

      // Check if Google API script is already loaded
      if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
          // Load the Google API script
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
      }

      // Find or create the container for Google Sign-In
      let container = document.querySelector('.login-container');

      if (!container) {
          // If no container exists yet, create one
          container = document.createElement('div');
          container.className = 'login-container';
          // Custom location of button depending on page.
          const pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
          container.classList.add(`login-container-${pageName}`);

          // Find a good place to insert button
          const nav = document.querySelector('nav');
          if (nav) {
              nav.parentNode.insertBefore(container, nav.nextSibling);
          } else {
              document.body.appendChild(container);
          }
      }
      
      // Check if the Google Sign-In elements already exist
      if (!document.getElementById('g_id_onload')) {
          // Create the initialization element
          const gIdOnload = document.createElement('div');
          gIdOnload.id = 'g_id_onload';
          gIdOnload.setAttribute('data-client_id', GOOGLE_CONFIG.CLIENT_ID);
          gIdOnload.setAttribute('data-callback', 'handleCredentialResponse');
          container.appendChild(gIdOnload);
          
          // Create the sign-in button element
          const gIdSignin = document.createElement('div');
          gIdSignin.className = 'g_id_signin';
          gIdSignin.setAttribute('data-type', 'standard');
          gIdSignin.setAttribute('data-shape', 'rectangular');
          gIdSignin.setAttribute('data-theme', 'filled_black');
          gIdSignin.setAttribute('data-text', 'signin_with');
          gIdSignin.setAttribute('data-size', 'large');
          gIdSignin.setAttribute('data-width', '240');
          gIdSignin.setAttribute('data-logo_alignment', 'left');
          container.appendChild(gIdSignin);
          
          // Create user info display
          const userInfo = document.createElement('div');
          userInfo.id = 'userInfo';
          userInfo.style.display = 'none';
                userInfo.innerHTML = 
              `<p>Welcome, <span id="userName"></span></p>
               <p>Email: <span id="userEmail"></span></p>`;
          container.appendChild(userInfo);
          
          // Create logout button
          const logoutButton = document.createElement('button');
          logoutButton.id = 'logoutButton';
          logoutButton.textContent = 'Sign Out';
          logoutButton.style.display = 'none';
          container.appendChild(logoutButton);
      }
  },
  
  // Initialize the auth module
  init: function() {
      // Check if user is already logged in on page load
      this.checkLoginStatus();
      
      // Set up event listeners
      if (document.getElementById('logoutButton')) {
          document.getElementById('logoutButton').addEventListener('click', this.signOut.bind(this));
      }
  },
  
  // Process the response from Google Sign-In
  handleCredentialResponse: function(response) {
      // Decode the JWT ID token from Google
      const responsePayload = this.parseJwt(response.credential);
      
      // Store user data
      this.userData = {
          name: responsePayload.name,
          email: responsePayload.email,
          picture: responsePayload.picture
      };
      this.isLoggedIn = true;
      
      // Update UI
      this.updateUI();
      
      // Store login status in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userName', responsePayload.name);
      localStorage.setItem('userEmail', responsePayload.email);
      localStorage.setItem('userPicture', responsePayload.picture || '');
      
      // Dispatch login event that other components can listen for
      window.dispatchEvent(new CustomEvent('userLoggedIn', { 
          detail: this.userData 
      }));

      // Initialize calendar if on calendar page
    if (window.location.pathname.includes('calendar.html') && window.Calendar) {
        window.Calendar.loadCalendarEvents();
    }
      
      console.log("User successfully logged in:", this.userData);
  },
  
  // Update the UI based on authentication state
  updateUI: function() {
      if (this.isLoggedIn && this.userData) {
          // Update user info display if elements exist
          if (document.getElementById('userName')) {
              document.getElementById('userName').textContent = this.userData.name;
          }
          if (document.getElementById('userEmail')) {
              document.getElementById('userEmail').textContent = this.userData.email;
          }
          if (document.getElementById('userInfo')) {
              document.getElementById('userInfo').style.display = 'block';
          }
          if (document.getElementById('logoutButton')) {
              document.getElementById('logoutButton').style.display = 'block';
          }
          
          // Hide the Google Sign-In button
          const signInButton = document.querySelector('.g_id_signin');
          if (signInButton) {
              signInButton.style.display = 'none';
          }
      } else {
          // Hide user info and logout button
          if (document.getElementById('userInfo')) {
              document.getElementById('userInfo').style.display = 'none';
          }
          if (document.getElementById('logoutButton')) {
              document.getElementById('logoutButton').style.display = 'none';
          }
          
          // Show the Google Sign-In button
          const signInButton = document.querySelector('.g_id_signin');
          if (signInButton) {
              signInButton.style.display = 'block';
          }
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
  
  // Handle Sign Out
  signOut: function() {
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
      
      console.log("User signed out");
  },
  
  // Helper function to parse JWT tokens
  parseJwt: function(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
  },
  
  // Get current user data
  getUserData: function() {
      return this.userData;
  },
  
  // Check if user is authenticated
  isAuthenticated: function() {
      return this.isLoggedIn;
  }
};

// Initialize the auth module when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Dynamically create the Google Sign-In elements
  GoogleAuth.setupGoogleSignIn();
  GoogleAuth.init();
  
  // Set up global callback for Google authentication
  window.handleCredentialResponse = function(response) {
      GoogleAuth.handleCredentialResponse(response);
  };
});

// Export the GoogleAuth object so it can be used in other files
window.GoogleAuth = GoogleAuth;