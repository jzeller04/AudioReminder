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
        fetch('/')
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
                
                // Extract tasks from reminder_container
                const tasks = [];
                const reminderContainer = tempDiv.querySelector('#reminder_container');
                
                if (reminderContainer) {
                    // Each group of 4 paragraphs represents a single reminder
                    const paragraphs = reminderContainer.querySelectorAll('p');
                    
                    for (let i = 0; i < paragraphs.length; i += 4) {
                        if (i + 3 < paragraphs.length) {
                            const title = paragraphs[i].textContent.replace('No reminder found', '').trim();
                            const description = paragraphs[i+1].textContent.replace('No reminder found', '').trim();
                            const date = paragraphs[i+2].textContent.replace('No reminder found', '').trim();
                            const time = paragraphs[i+3].textContent.replace('No reminder found', '').trim();
                            
                            // Only add if we have at least a title and date
                            if (title && date) {
                                tasks.push({
                                    title: title,
                                    description: description,
                                    date: new Date(date), // Convert to Date object
                                    time: time
                                });
                            }
                        }
                    }
                }

                console.log("Parsed tasks:", tasks);
                
                this.isLoading = false;
                this.renderCalendar();
            }).catch(error => {
                console.error('Error loading tasks:', error);
                this.isLoading = false;
                this.renderCalendar();
            });
    },

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

            // Check if day has tasks - improved version with better date comparison
            const hasTasks = this.tasks.some(task => {
                // Make sure task.date is a Date object
                const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
                
                // Only compare if taskDate is valid
                if (!isNaN(taskDate.getTime())) {
                    return taskDate.getDate() === i &&
                        taskDate.getMonth() === month &&
                        taskDate.getFullYear() === year;
                }
                return false;
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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'Numeric' };
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
            // Make sure task.date is a Date object
            const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
        
            // Only compare if taskDate is valid
            if (!isNaN(taskDate.getTime())) {
                return taskDate.getDate() === this.selectedDate.getDate() &&
                    taskDate.getMonth() === this.selectedDate.getMonth() &&
                    taskDate.getFullYear() === this.selectedDate.getFullYear();
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
                
                // Format time
                let timeStr = 'All day';
                if (task.time && task.time !== 'No reminder found') {
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