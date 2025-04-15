// ===== Theme Management =====
const ThemeManager = {
  init: function() {
    // Get theme from localStorage
    const theme = localStorage.getItem('theme') || 'low-contrast';
    document.body.setAttribute('data-theme', theme);
  }
};

// ===== Push-to-Talk Management =====
const PushToTalk = {
  enabled: false,
  
  init: function() {
    // Load saved setting
    this.enabled = localStorage.getItem('pushToTalk') === 'true';
    
    // Set up key listeners
    this.setupKeyListeners();
  },
  
  setupKeyListeners: function() {
    // Space key press handler
    document.addEventListener('keydown', (event) => {
      if (this.enabled && event.code === 'Space' && 
          !event.target.matches('input, textarea')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('pttKeyDown'));
      }
    });
    
    // Space key release handler
    document.addEventListener('keyup', (event) => {
      if (this.enabled && event.code === 'Space' && 
          !event.target.matches('input, textarea')) {
        window.dispatchEvent(new CustomEvent('pttKeyUp'));
      }
    });
  },
  
  updateSetting: function(isEnabled) {
    const previousState = this.enabled;
    this.enabled = isEnabled;
    localStorage.setItem('pushToTalk', isEnabled);
    
    if (previousState !== this.enabled) {
      window.dispatchEvent(new CustomEvent('pushToTalkChanged', { 
        detail: { enabled: this.enabled } 
      }));
    }
  }
};

// ===== Settings Manager =====
const UserSettingsManager = {
  init: async function() {
    // Initialize submodules first (for immediate appearance)
    ThemeManager.init();
    PushToTalk.init();
    
    // Then fetch latest from server
    await this.fetchFromServer();
  },
  
  fetchFromServer: async function() {
    try {
      const response = await fetch('/preferences/getUserPreferences');
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data?.preferences) return;
      
      // Update theme if it exists
      if (data.preferences.highContrast) {
        localStorage.setItem('theme', data.preferences.highContrast);
        document.body.setAttribute('data-theme', data.preferences.highContrast);
      }
      
      // Update push-to-talk if it exists
      if (Object.prototype.hasOwnProperty.call(data.preferences, 'pushToTalk')) {
        PushToTalk.updateSetting(data.preferences.pushToTalk);
      }
      
      // Notify that settings are loaded
      window.dispatchEvent(new CustomEvent('userSettingsLoaded'));
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  }
};

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  UserSettingsManager.init();
});

// Export to global scope
window.ThemeManager = ThemeManager;
window.PushToTalk = PushToTalk;
window.UserSettingsManager = UserSettingsManager;