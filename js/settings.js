// Theme Toggle Handler
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check if user preference is stored in localStorage
    const currentTheme = localStorage.getItem('theme') || 'low-contrast';
    themeToggle.checked = currentTheme === 'high-contrast';

    document.body.setAttribute('data-theme', currentTheme);

    // Add event listener to toggle switch
    themeToggle.addEventListener('change', function() {
        const newTheme = this.checked ? 'high-contrast' : 'low-contrast';
        document.body.setAttribute('data-theme', newTheme);
        
        // Save theme preference to localStorage and server
        localStorage.setItem('theme', newTheme);
        saveThemePreference(newTheme);
    });
    
    // Function to save theme preference to server
    function saveThemePreference(theme) {
        // Create a form to post the data
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/updateSettings';
        form.style.display = 'none';
        
        // Create input for the setting
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'setting';
        input.value = 'highContrastHandle';
        
        // Add input to form and submit
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }
});

// Initialize theme on page load for all pages
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'low-contrast';
    document.body.setAttribute('data-theme', currentTheme);
}

// Run initialization on every page
window.addEventListener('DOMContentLoaded', initializeTheme);