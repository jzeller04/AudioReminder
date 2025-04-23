// Simple Google Auth Button Component
const GoogleAuthButton = {
    // Create and add a Google sign-in button to the specified container
    create: function(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID "${containerId}" not found`);
        return false;
      }
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'google-auth-container';
      
      // Create sign-in button
      const signInButton = document.createElement('button');
      signInButton.id = 'google-signin-btn';
      signInButton.className = 'google-btn google-signin-btn';
      signInButton.textContent = 'Connect Google Calendar';
      signInButton.style.display = 'block';
      
      // Create sign-out button
      const signOutButton = document.createElement('button');
      signOutButton.id = 'google-signout-btn';
      signOutButton.className = 'google-btn google-signout-btn';
      signOutButton.textContent = 'Disconnect Google';
      signOutButton.style.display = 'none';
      
      // Create status element
      const statusElement = document.createElement('div');
      statusElement.id = 'google-auth-status';
      statusElement.className = 'google-auth-status';
      statusElement.textContent = 'Not connected to Google';
      
      // Add elements to container
      buttonContainer.appendChild(signInButton);
      buttonContainer.appendChild(signOutButton);
      buttonContainer.appendChild(statusElement);
      container.appendChild(buttonContainer);
      
      // Add event listeners
      signInButton.addEventListener('click', this.handleSignIn);
      signOutButton.addEventListener('click', this.handleSignOut);
      
      // Check initial auth state
      this.updateButtonState();
      
      // Listen for auth state changes
      window.addEventListener('userLoggedIn', this.updateButtonState.bind(this));
      window.addEventListener('userLoggedOut', this.updateButtonState.bind(this));
      
      return true;
    },
    
    // Update button state based on auth status
    updateButtonState: function() {
      const signInButton = document.getElementById('google-signin-btn');
      const signOutButton = document.getElementById('google-signout-btn');
      const statusElement = document.getElementById('google-auth-status');
      
      if (!signInButton || !signOutButton || !statusElement) return;
      
      // Check if user is authenticated
      const isAuthenticated = window.GoogleAuth && window.GoogleAuth.isAuthenticated;
      
      if (isAuthenticated) {
        // User is signed in
        signInButton.style.display = 'none';
        signOutButton.style.display = 'block';
        
        // Get user data
        const userData = window.GoogleAuth && window.GoogleAuth.getUserData();
        if (userData && userData.email) {
          statusElement.textContent = `Connected as: ${userData.email}`;
          statusElement.className = 'google-auth-status connected';
        } else {
          statusElement.textContent = 'Connected to Google';
          statusElement.className = 'google-auth-status connected';
        }
      } else {
        // User is signed out
        signInButton.style.display = 'block';
        signOutButton.style.display = 'none';
        statusElement.textContent = 'Not connected to Google';
        statusElement.className = 'google-auth-status disconnected';
      }
    },
    
    // Handle sign in button click
    handleSignIn: function() {
      if (window.GoogleAuth && typeof window.GoogleAuth.signIn === 'function') {
        window.GoogleAuth.signIn();
      } else {
        console.error('Google authentication not available');
        alert('Google authentication is not available. Please try refreshing the page.');
      }
    },
    
    // Handle sign out button click
    handleSignOut: function() {
      if (window.GoogleAuth && typeof window.GoogleAuth.signOut === 'function') {
        window.GoogleAuth.signOut();
      } else {
        console.error('Google authentication not available');
        alert('Google authentication is not available. Please try refreshing the page.');
      }
    }
  };
  
  // Export to window
  window.GoogleAuthButton = GoogleAuthButton;