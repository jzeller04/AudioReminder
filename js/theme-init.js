document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme on first load
    initializeTheme();
    
    // Function to fetch user preferences if logged in
    async function fetchUserPreferences() {
        try {
            const response = await fetch('/getUserPreferences');
            if (response.ok) {
                const data = await response.json();
                if (data?.preferences?.highContrast) {
                    localStorage.setItem('theme', data.preferences.highContrast);
                    applyTheme(data.preferences.highContrast);
                }
            }
        } catch (error) {
            console.error('Error fetching user preferences:', error);
        }
    }
    
    // Function to initialize theme
    function initializeTheme() {
        // First check localStorage
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            // If no theme in localStorage, try to fetch from server
            fetchUserPreferences();
        }
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    }
});
