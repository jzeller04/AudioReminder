// Available themes
const themes = ['low-contrast', 'high-contrast'];

// Create the toggle switch
function createToggleSwitch() {
    // Create container if it doesn't exist
    if (!document.querySelector('.theme-container')) {
        const container = document.createElement('div');
        container.className = 'theme-container';
        
        // Label element
        const switchLabel = document.createElement('label');
        switchLabel.className = 'theme-switch';
        switchLabel.setAttribute('for', 'theme-toggle');
        switchLabel.setAttribute('aria-label', 'Toggle theme');
        
        // Checkbox input
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'theme-toggle';
        
        // Create slider
        const slider = document.createElement('span');
        slider.className = 'slider';
        switchLabel.appendChild(input);
        switchLabel.appendChild(slider);
        
        // Optional add text label
        const textLabel = document.createElement('span');
        textLabel.className = 'switch-label';
        textLabel.textContent = 'Theme';
        
        // Add elements to container
        container.appendChild(switchLabel);
        container.appendChild(textLabel);
        
        // Add container to page
        const header = document.querySelector('header');
        if (header) {
            header.after(container);
        } else {
            document.body.prepend(container);
        }
        
        // Add event listener to the input
        input.addEventListener('change', toggleTheme);
        
        // Initialize the checkbox state based on current theme
        const currentTheme = document.body.dataset.theme || 'low-contrast';
        input.checked = currentTheme === 'high-contrast';
    }
}

// Toggle between themes
function toggleTheme(event) {
    let newTheme;
    if (event && event.target) {
        newTheme = event.target.checked ? 'high-contrast' : 'low-contrast';
    } else {
        // Just toggle if called programmatically
        const currentTheme = document.body.dataset.theme || 'low-contrast';
        newTheme = currentTheme === 'low-contrast' ? 'high-contrast' : 'low-contrast';
        
        // Update checkbox state
        const checkbox = document.getElementById('theme-toggle');
        if (checkbox) {
            checkbox.checked = newTheme === 'high-contrast';
        }
    }
    
    document.body.dataset.theme = newTheme;
    
    // Save to localStorage
    localStorage.setItem('audioreminder-theme', newTheme);
    
    // Save to server
    saveThemeToServer(newTheme);
}

// Save theme to server
function saveThemeToServer(theme) {
    fetch('/save-theme', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: theme })
    }).catch(error => {
        console.log('Error saving theme:', error);
    });
}

// Load saved theme
function loadSavedTheme() {
    // First try localStorage
    const savedTheme = localStorage.getItem('audioreminder-theme');
    
    if (savedTheme && themes.includes(savedTheme)) {
        // Apply theme from localStorage
        document.body.dataset.theme = savedTheme;
        
        // Update checkbox state
        setTimeout(() => {
            const checkbox = document.getElementById('theme-toggle');
            if (checkbox) {
                checkbox.checked = savedTheme === 'high-contrast';
            }
        }, 0);
    } else {
        // Try to get from server
        fetch('/get-theme')
            .then(response => response.json())
            .then(data => {
                if (data.theme && themes.includes(data.theme)) {
                    // Apply theme from server
                    document.body.dataset.theme = data.theme;
                    localStorage.setItem('audioreminder-theme', data.theme);
                    
                    // Update checkbox state
                    const checkbox = document.getElementById('theme-toggle');
                    if (checkbox) {
                        checkbox.checked = data.theme === 'high-contrast';
                    }
                }
            })
            .catch(error => {
                console.log('Error loading theme from server:', error);
            });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();
    createToggleSwitch();
});