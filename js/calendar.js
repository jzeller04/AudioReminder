// Google Calendar
const Calendar = {
    // Stores calendar state and tasks 
    tasks: [],
    isLoading: false,
    selectedDate: new Date(),

    // Initializes the calendar
    init: function() {
        console.log('Calendar module initialized');

        // Load tasks from MongoDB
        this.loadTasks();

        /*
        // Checks user authentication before loading
        if(window.GoogleAuth && window.GoogleAuth.isAuthenticated()){
            this.loadCalendarEvents();
        }

        // Listens for auth changes
        window.addEventListener('userLoggedIn', () => {this.loadCalendarEvents();});
        window.addEventListener('userLoggedOut', () => {this.loadCalendarEvents();});
        */

        // Initialize calendar UI elements
        this.initCalendarUI();
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
                <div id="tasks-container" class="tasks-container">
                    <h3>Tasks for <span id="selected-date">today</span></h3>
                    <div id="tasks-list" class="tasks-list">
                        <!-- Tasks will be listed here -->
                    </div>
                    <button id="add-task-btn" class="add-task-btn">New Task</button>
                </div>
                <div id="task-form-container" class="task-form-container" style="display: none;">
                    <h3>Add New task</h3>
                    <form id="Task-form">
                        <div class="form-group">
                            <label for="title">Title:</label>
                            <input type="text" id="title" name="title" required>
                        </div>
                        <div class="form-group">
                            <label for="date">Date:</label>
                            <input type="date" id="date" name="date" required>
                        </div>
                        <div class="form-group">
                            <label for="time">Time:</label>
                            <input type="time" id="time" name="time" required>
                        </div>
                        <div class="form-group">
                            <label for="memo">Description:</label>
                            <textarea id="memo" name="memo"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-Task-btn">Cancel</button>
                            <button type="submit">Save Task</button>
                        </div>
                    </form>
                </div>
            `;

            // Add task listeners
            document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
            document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
            document.getElementById('add-task-btn').addEventListener('click', () => this.showTaskForm());
            document.getElementById('cancel-task-btn').addEventListener('click', () => this.hideTaskForm());
            document.getElementById('task-form').addEventListener('submit', (e) => this.handleTaskSubmit(e));
        }

        // Initial calendar render
        this.renderCalendar();
    },

    // Load tasks from server using regular fetch
    loadTasks: function() {
        this.isLoading = true;
        this.renderCalendar();
        
        // Get tasks from the server
        fetch('/data')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(htmlText => {
                // Parse tasks from the HTML response
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlText;
                
                // Extract tasks
                const tasks = [];
                const taskElements = tempDiv.querySelectorAll('p');
                
                // Group elements by 4s (title, description, date, time)
                for (let i = 0; i < taskElements.length; i += 4) {
                    if (i + 3 < taskElements.length) {
                        tasks.push({
                            title: taskElements[i].textContent,
                            description: taskElements[i+1].textContent,
                            date: taskElements[i+2].textContent,
                            time: taskElements[i+3].textContent
                        });
                    }
                }
                // Store tasks
                this.tasks = tasks;
                
                this.isLoading = false;
                this.renderCalendar();
            }).catch(error => {
                console.error('Error loading tasks:', error);
                this.isLoading = false;
                this.renderCalendar();
            });
    },

    /*
    // Load calendar events from Google Calendar API
    loadCalendarEvents: function() {
        if (!window.gapi) {
            this.loadGoogleAPI(() => this.loadCalendarEvents());
            return;
        }

        this.isLoading = true;
        // Show loading state
        this.renderCalendar();

        // Verify user is authenticated before continuing
        if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated()) {
            console.error('User not authenticated. Cannot load calendar events.');
            this.isLoading = false;
            this.renderCalendar();
            return;
        }

        // Load the Google Calendar API
        gapi.load('client', () => {
            gapi.client.init({
                apiKey: 'AIzaSyCtL-BapQYQFN8kNz01qYUfSyiO9ElBwWc',
                clientId: '1009864072987-cmpm10gg8f73q21uteji2suo7eoklsml.apps.googleusercontent.com',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar'
            }).then(() => {
                // Get events from the primary calendar
                return gapi.client.calendar.events.list({
                    'calendarId': 'primary',
                    'timeMin': new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1).toISOString(),
                    'timeMax': new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 0).toISOString(),
                    'singleEvents': true,
                    'orderBy': 'startTime'
                });
            }).then(response => {
                this.events = response.result.items;
                this.isLoading = false;
                this.renderCalendar();
            }).catch(error => {
                console.error('Error loading calendar events:', error);
                this.isLoading = false;
                this.renderCalendar();
            });
        });
    },

    // Load Google API script
    loadGoogleAPI: function(callback) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = callback;
        document.head.appendChild(script);
    },
    */

    // Change month and update calendar
    changeMonth: function(delta) {
        this.selectedDate = new Date(
            this.selectedDate.getFullYear(),
            this.selectedDate.getMonth() + delta,
            1
        );
        this.loadTasks();
    },

    // Render the calendar UI
    renderCalendar: function() {
        // Update month /year display
        const monthNames = ['January','February','March','April','May','June','July',
                            'July','August','September','October','November','December'];

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

            const hasTasks = this.tasks.some(task => {
                try {
                    // Try to parse the date from the task
                    const taskDate = new Date(task.date);
                    return taskDate.getDate() === i &&
                           taskDate.getMonth() === month &&
                           taskDate.getFullYear() === year;
                } catch (error) {
                    console.error('Error parsing date:', error);
                    return false;
                }
            });

            if (hasTasks) {
                dayElement.classList.add('has-tasks');
                // Add an indicator dot or similar visual cue
                const taskIndicator = document.createElement('span');
                taskIndicator.className = 'task-indicator';
                taskIndicator.setAttribute('aria-hidden', 'true');
                dayElement.appendChild(taskIndicator);
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
        const options = { weekend: 'long', year: 'numeric', month: 'long', day: 'Numeric' };
        selectedDateSpan.textContent = this.selectedDate.toLocaleDateString(undefined, options);

        // Clear tasks list
        tasksList.innerHTML = '';

        // Show loading state if needed
        if (this.isLoading) {
            tasksList.innerHTML = '<div class="loading">Loading tasks...</div>';
            return;
        }

        // Filter tasks for the selected date
        const tasksForDay = this.tasks.filter(task => {
            try {
                // Try to parse the date from the task
                const taskDate = new Date(task.date);
                return taskDate.getDate() === this.selectedDate.getDate() &&
                       taskDate.getMonth() === this.selectedDate.getMonth() &&
                       taskDate.getFullYear() === this.selectedDate.getFullYear();
            } catch (error) {
                console.error('Error parsing date:', error);
                return false;
            }
        });

        // Display tasks or "no tasks" message
        if (tasksForDay.length === 0) {
            tasksList.innerHTML = '<div class="no-tasks">No tasks for this day</div>';
        } else {
            tasksForDay.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'task-item';
                
                // Format time
                let timeStr = 'All day';
                if (task.time) {
                    timeStr = this.formatTime(task.time);
                }
                
                taskElement.innerHTML = `
                    <div class="task-time">${timeStr}</div>
                    <div class="task-title">${task.title}</div>
                `;
                
                // Add click handler to show task details
                taskElement.addEventListener('click', () => {
                    this.showTaskDetails(task);
                });
                
                tasksList.appendChild(taskElement);
            });
        }
    },
    
    
    // Format time twelve hour format with AM/PM
    formatTime: function(timeStr) {
        // Check if timeStr is already a Date object
        if (timeStr instanceof Date) {
            const hours = timeStr.getHours();
            const minutes = timeStr.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            const displayHours = hours % 12 || 12; // Convert 0 to 12
            const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
            
            return `${displayHours}:${displayMinutes} ${ampm}`;
        }
        
        // Otherwise, parse the time string
        try {
            // If timeStr is like "13:45" format
            const [hours, minutes] = timeStr.split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            const displayHours = hours % 12 || 12; // Convert 0 to 12
            const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
            
            return `${displayHours}:${displayMinutes} ${ampm}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return timeStr; // Return original if can't parse
        }
    },

    // Show form to add a new task
    showTaskForm: function() {
        // Set default date to selected date
        document.getElementById('date').valueAsDate = this.selectedDate;
        
        // Set default time to next hour
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
        document.getElementById('time').value = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
        
        // Show the form
        document.getElementById('task-form-container').style.display = 'block';
    },
    
    // Hide the task form
    hideTaskForm: function() {
        document.getElementById('task-form-container').style.display = 'none';
    },
    
    // Handle task form submission
    handleTaskSubmit: function(e) {
        e.preventDefault();
        
        /*
        // Check if user is authenticated
        if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated()) {
            alert('Please sign in with Google to add events');
            return;
        }
        */

        const form = document.getElementById('task-form');
        const formData = new FormData(form);
        
        // Use fetch to submit the form
        fetch('/submit', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            // Hide the form
            this.hideTaskForm();
            
            // Add the new task to the tasks array
            const title = formData.get('title');
            const date = formData.get('date');
            const time = formData.get('time');
            const description = formData.get('memo');
            
            this.tasks.push({
                title: title,
                description: description,
                date: date,
                time: time
            });
            
            // Refresh the calendar display
            this.renderCalendar();
            
            // Show success message
            alert('Task added successfully!');
        }).catch(error => {
            console.error('Error adding task:', error);
            alert('Error adding task. Please try again.');
        });
    },
    
    // Show details for a task
    showTaskDetails: function(task) {
        // Create a details message
        let details = `Task: ${task.title}\n`;
        
        // Add time information
        if (task.time) {
            details += `Time: ${this.formatTime(task.time)}\n`;
        }
        
        // Add description if available
        if (task.description) {
            details += `Description: ${task.description}`;
        }
        
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
    }
};

// Initialize the calendar when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize calendar if on the calendar page
    if (window.location.pathname.includes('/calendar')) {
        Calendar.init();
    }
});

// Export the Calendar object so it can be used in other files
window.Calendar = Calendar;