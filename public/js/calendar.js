function formatTimeClient(timeStr) {
    // Simple client-side implementation - complex logic is on server
    try {
        // If timeStr is like "13:45" format
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch (error) {
        console.warn("Failed to format time:", error);
        return timeStr;
    }
}

const Calendar = {
    // Stores calendar state and tasks 
    tasks: [],
    isLoading: false,
    selectedDate: new Date(),

    // Initializes the calendar
    init: function() {
        console.log('Calendar module initialized');
    
        // Check if we need to refresh the calendar after Google disconnection
        const needsRefresh = localStorage.getItem('refreshCalendarOnNextLoad') === 'true';
        if (needsRefresh) {
            // Clear the flag
            localStorage.removeItem('refreshCalendarOnNextLoad');
            
            // Reload the page to get fresh data from the server
            window.location.reload();
            return;
        }
        
        // Load from server
        this.loadCalendarEvents();
    
        // Initialize calendar UI elements
        this.initCalendarUI();
        
        // Initialize Google Calendar if available
        if (window.GoogleCalendar) {
            // Listen for Google Calendar events updates
            window.addEventListener('googleCalendarEventsUpdated', (event) => {
                this.mergeGoogleCalendarEvents(event.detail.events);
            });
        }
    },
    
    // Initializes calendar UI and attach task listeners
    initCalendarUI: function() {
        // Create calendar container if it doesn't exist
        if (!document.getElementById('calendar-container')){
            const container = document.createElement('div');
            container.id = 'calendar-container';
            container.className = 'calendar-container';

            // Find place to insert calendar
            const content = document.querySelector('nav').nextElementSibling || document.body;
            document.body.insertBefore(container,content);

            // Create basic calendar
            container.innerHTML = `
                <div class="calendar-header">
                    <button id="prev-month" class="calendar-nav-btn">Previous</button>
                    <h2 id="current-month">Loading...</h2>
                    <button id="next-month" class="calendar-nav-btn">Next</button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-days-header">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>
                    <div id="calendar-days" class="calendar-days">
                        <!-- Days will be generated here -->
                    </div>
                </div>
                <div id="sync-status" class="sync-status"></div>
                <div id="tasks-container" class="tasks-container">
                    <h3>Tasks for <span id="selected-date">today</span></h3>
                    <div id="tasks-list" class="tasks-list">
                        <!-- Tasks will be listed here -->
                    </div>
                    <button id="add-task-btn" class="add-task-btn">New Task</button>
                </div>
                
            `;

            // Add task listeners
            document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
            document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
            document.getElementById('add-task-btn').addEventListener('click', () => this.showTaskForm());
        }

        // Initial calendar render
        this.renderCalendar();
    },

    loadCalendarEvents: function() {
        console.log("Loading calendar events from server data");
        
        if (window.calendarReminders && Array.isArray(window.calendarReminders)) {
            console.log("Found reminders:", window.calendarReminders.length);
        
            // Process the reminders with consistent date handling
            this.tasks = window.calendarReminders.map(reminder => {
                console.log(`Processing reminder "${reminder.title || 'Untitled'}":`, reminder);
                
                let localDate;
                
                if (reminder.date) {
                    // Parse the ISO date string
                    const reminderDate = new Date(reminder.date);
                    
                    // Log date debugging information
                    console.log(`- Original date:`, reminderDate);
                    console.log(`- ISO string:`, reminderDate.toISOString());
                    console.log(`- Local string:`, reminderDate.toLocaleDateString());
                    
                    // Create a local date using only the date components to avoid timezone issues
                    localDate = new Date(
                        reminderDate.getFullYear(),
                        reminderDate.getMonth(),
                        reminderDate.getDate(),
                        12, 0, 0 // Set to noon to avoid day boundary issues
                    );
                    
                    console.log(`- Processed local date:`, localDate);
                    console.log(`- Local date ISO:`, localDate.toISOString());
                    console.log(`- Local date string:`, localDate.toLocaleDateString());
                } else {
                    console.warn(`Reminder "${reminder.title || 'Untitled'}" has no date!`);
                    localDate = new Date(); // Fallback to today if no date
                }
                
                return {
                    id: reminder._id,
                    title: reminder.title || '',
                    description: reminder.description || '',
                    date: localDate,
                    time: reminder.time || '',
                    googleId: reminder.googleId || null,
                    isGoogleEvent: !!reminder.googleId,
                    syncStatus: reminder.syncStatus || 'synced',
                    location: reminder.location || ''
                };
            });
            
            // No filtering is needed here - we want to see all reminders in the calendar
            // including past ones for reference
        } else {
            console.log("No reminders found or invalid data format");
            this.tasks = [];
        }
        
        // Render the calendar with the loaded tasks
        this.renderCalendar();
    },

    // Change month and update calendar
    changeMonth: function(delta) {
        this.selectedDate = new Date(
            this.selectedDate.getFullYear(),
            this.selectedDate.getMonth() + delta,
            1
        );
        this.renderCalendar();
    },

    // Render the calendar UI
    renderCalendar: function() {
        // Update month /year display
        const monthNames = ['January','February','March','April','May','June','July',
                            'August','September','October','November','December'];

        const currentMonthEl = document.getElementById('current-month');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${monthNames[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
        }
        
        // Get calendar info for the month
        const year = this.selectedDate.getFullYear();
        const month = this.selectedDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        // Last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Day of the week for the first day
        const firstDayIndex = firstDay.getDay();
        // Total number of days in month
        const daysInMonth = lastDay.getDate();

        // Clear existing calendar days
        const calendarDays = document.getElementById('calendar-days');
        // Exit if element doesn't exist yet
        if (!calendarDays) return;

        calendarDays.innerHTML = '';

        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDay);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;

            // Check if day has tasks
            const date = new Date(year, month, i);

            // Add click event listener to each day
            dayElement.addEventListener('click', () => this.selectDate(date));

            // Check if day has tasks
            const hasTasks = this.tasks.some(task => {
                // Make sure task.date is a Date object
                const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
                
                // Only compare if taskDate is valid
                if (!isNaN(taskDate.getTime())) {
                    // Compare just the date portions (year, month, day), ignoring time
                    return taskDate.getFullYear() === year && 
                            taskDate.getMonth() === month && 
                            taskDate.getDate() === i;
                }
                return false;
            });

            if (hasTasks) {
                dayElement.classList.add('has-tasks');
            }

            //Check if this is today
            const today = new Date();
            if (i === today.getDate() &&
                month === date.getMonth() &&
                year === today.getFullYear()) {
                dayElement.classList.add('today');
            }

            // Check if this is the selected date
            if (i === this.selectedDate.getDate() &&
                month === this.selectedDate.getMonth() &&
                year === this.selectedDate.getFullYear()) {
                dayElement.classList.add('selected');
            }

            calendarDays.appendChild(dayElement);
        }  

        // Render tasks list for selected date
        this.renderTasksList();
    },

    // Render tasks list for the selected date
    renderTasksList: function() {
        const tasksList = document.getElementById('tasks-list');
        const selectedDateSpan = document.getElementById('selected-date');
        
        // Exit if elements don't exist yet
        if (!tasksList || !selectedDateSpan) return;

        // Format the selected date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateSpan.textContent = this.selectedDate.toLocaleDateString(undefined, options);

        // Clear tasks list
        tasksList.innerHTML = '';

        // Show loading state if needed
        if (this.isLoading) {
            tasksList.innerHTML = '<div class="loading">Loading tasks...</div>';
            return;
        }

        // Filter tasks for the selected date - using a more reliable date comparison
        const tasksForDay = this.tasks.filter(task => {
            // Make sure task.date is a Date object
            const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
            
            // Only compare if taskDate is valid
            if (!isNaN(taskDate.getTime())) {
            // Compare just the date portions (year, month, day), ignoring time
            return taskDate.getFullYear() === this.selectedDate.getFullYear() && 
                    taskDate.getMonth() === this.selectedDate.getMonth() && 
                    taskDate.getDate() === this.selectedDate.getDate();
            }
            return false;
        });

        // Display tasks or "no tasks" message
        if (tasksForDay.length === 0) {
            tasksList.innerHTML = '<div class="no-tasks">No tasks for this day</div>';
        } else {
            tasksForDay.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'task-item';
                
                // Add Google Calendar class if it's a Google event
                if (task.isGoogleEvent || task.googleId) {
                    taskElement.classList.add('google-calendar-event');
                }
                
                // Format time
                let timeStr = 'All day';
                if (task.time && task.time !== 'No reminder found') {
                    timeStr = formatTimeClient(task.time);
                }
                
                // Build the task HTML
                let taskHtml = `
                    <div class="task-time">${timeStr}</div>
                    <div class="task-title">${task.title}</div>
                `;
                
                // Add Google indicator based on whether it's from Google or synced to Google
                if (task.isGoogleEvent || task.googleId) {
                        taskHtml += `
                            <div class="google-indicator">
                                <span class="google-icon">Synced with Google</span>
                            </div>
                        `;
                }
                
                taskElement.innerHTML = taskHtml;
                
                // Add click handler to show task details
                taskElement.addEventListener('click', () => {
                    console.log('Task clicked:', task); // Add debug logging
                    this.showTaskDetails(task);
                });
                
                tasksList.appendChild(taskElement);
            });
        }
    },

    // Show form to add a new task
    showTaskForm: function() {
        // Get the selected date in proper format for URL parameter
        const year = this.selectedDate.getFullYear();
        const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(this.selectedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
    
        // Redirect to newtask page with the date parameter
        window.location.href = `newtask?date=${formattedDate}`;
    },
    
    // Handle task form submission
    handleTaskSubmit: function(e) {
        // No longer needed - leaving empty to avoid breaking existing code
        if (e) e.preventDefault();
    },
    
    // Show details for a task
    showTaskDetails: function(task) {
        console.log('showTaskDetails called with task:', task);
        // Create a details message
        let details = `Task: ${task.title}\n`;
        
        // Add time information
        if (task.time) {
            details += `Time: ${this.formatTime(task.time)}\n`;
        }
        
        // Add description if available
        if (task.description) {
            details += `Description: ${task.description}\n`;
        }
        
        // Add Google Calendar information if applicable
        if (task.isGoogleEvent || task.googleId) {
            details += `Source: Google Calendar\n`;
        }
        
        console.log('Showing alert with details:', details);
        
        // Display details in an alert
        alert(details);
    },

    // Function to select dates
    selectDate: function(date) {
        // Update selected date
        this.selectedDate = date;
        
        // Refresh the calendar to show the newly selected date
        this.renderCalendar();
        
        // Check if the task form is currently open
        const taskFormContainer = document.getElementById('task-form-container');

        // Only update the date in the form if the form is visible
        if (taskFormContainer && taskFormContainer.style.display === 'block') {
            const taskDateInput = document.getElementById('date');
        
            if (taskDateInput) {
                // Format the date as YYYY-MM-DD
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                const day = String(date.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                
                // Update the date input value
                taskDateInput.value = formattedDate;
            }
        }
    },

    mergeGoogleCalendarEvents: function(googleEvents) {
        if (!googleEvents || !Array.isArray(googleEvents)) return;
        
        console.log("Merging Google Calendar events:", googleEvents.length);
        
        // Create a helper function to check if two events are duplicates based on title and date
        const _areDuplicate = (event1, event2) => {
            // Convert dates to string format for comparison (YYYY-MM-DD)
            const date1 = event1.date instanceof Date ? 
                event1.date.toISOString().split('T')[0] : 
                new Date(event1.date).toISOString().split('T')[0];
            
            const date2 = event2.date instanceof Date ? 
                event2.date.toISOString().split('T')[0] : 
                new Date(event2.date).toISOString().split('T')[0];
            
            // Check if title and date match
            return event1.title.toLowerCase() === event2.title.toLowerCase() && date1 === date2;
        };
        
        // Filter out Google events that already exist in our tasks by matching ID
        const _existingGoogleIds = new Set(this.tasks
            .filter(task => task.googleId)
            .map(task => task.googleId));
        
        // Also track events by title+date to avoid duplicates
        const existingTitleDatePairs = new Map();
        this.tasks.forEach(task => {
            if (task.title && task.date) {
                const dateStr = task.date instanceof Date ? 
                    task.date.toISOString().split('T')[0] : 
                    new Date(task.date).toISOString().split('T')[0];
                
                existingTitleDatePairs.set(`${task.title.toLowerCase()}_${dateStr}`, task);
            }
        });
        
        // Remove existing Google events that match the new ones by ID
        this.tasks = this.tasks.filter(task => {
            // Keep all non-Google events
            if (!task.googleId && !task.isGoogleEvent) {
                return true;
            }
            
            // For Google events, keep them if they're not in the new set
            // This will be updated with new data
            return !googleEvents.some(ge => ge.id === task.googleId || ge.googleId === task.googleId);
        });
        
        // Process Google events to add proper markers and filter out duplicates
        const processedGoogleEvents = [];
        
        for (const event of googleEvents) {
            // Skip events that already exist by title+date
            if (event.title && event.date) {
                const dateStr = event.date instanceof Date ? 
                    event.date.toISOString().split('T')[0] : 
                    new Date(event.date).toISOString().split('T')[0];
                
                const key = `${event.title.toLowerCase()}_${dateStr}`;
                
                if (existingTitleDatePairs.has(key)) {
                    const existingTask = existingTitleDatePairs.get(key);
                    
                    // If the existing task doesn't have a Google ID but this one does,
                    // update the existing task with the Google ID
                    if (!existingTask.googleId && (event.id || event.googleId)) {
                        existingTask.googleId = event.id || event.googleId;
                        existingTask.isGoogleEvent = true;
                        existingTask.syncStatus = 'synced';
                    }
                    
                    // Skip adding this event since it already exists
                    continue;
                }
            }
            
            // Process the event
            processedGoogleEvents.push({
                ...event,
                isGoogleEvent: true,
                googleId: event.id || event.googleId,
                source: 'google'
            });
            
            // Add to the title+date map to prevent future duplicates
            if (event.title && event.date) {
                const dateStr = event.date instanceof Date ? 
                    event.date.toISOString().split('T')[0] : 
                    new Date(event.date).toISOString().split('T')[0];
                
                existingTitleDatePairs.set(`${event.title.toLowerCase()}_${dateStr}`, event);
            }
        }
        
        // Add the processed Google events to our tasks
        this.tasks = [...this.tasks, ...processedGoogleEvents];
        
        // Re-render the calendar
        this.renderCalendar();
    }
}

// Initialize the calendar when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking if calendar should initialize");
    // Initialize calendar if on the calendar page
    if (window.location.pathname.includes('/calendar')) {
        console.log("On calendar page, initializing calendar");
        Calendar.init();
    }
});

// Export the Calendar object so it can be used in other files
window.Calendar = Calendar;