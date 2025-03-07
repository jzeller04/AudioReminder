// Google Calendar
const Calendar = {
    // Stores calendar state and events 
    events: [],
    isLoading: false,
    selectedDate: new Date(),
    apiKey: 'AIzaSyCtL-BapQYQFN8kNz01qYUfSyiO9ElBwWc',

    // Initializes the calendar
    init: function() {
        console.log('Calendar module initialized');

        // Checks user authentication before loading
        if(window.GoogleAuth && window.GoogleAuth.isAuthenticated()){
            this.loadCalendarEvents();
        }

        // Listens for auth changes
        window.addEventListener('userLoggedIn', () => {this.loadCalendarEvents();});
        window.addEventListener('userLoggedOut', () => {this.loadCalendarEvents();});
        
        // Initialize calendar UI elements
        this.initCalendarUI();
    },

    // Initializes calendar UI and attach event listeners
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
                <div id="events-container" class="events-container">
                    <h3>Events for <span id="selected-date">today</span></h3>
                    <div id="events-list" class="events-list">
                        <!-- Events will be listed here -->
                    </div>
                    <button id="add-event-btn" class="add-event-btn">Add Event</button>
                </div>
                <div id="event-form-container" class="event-form-container" style="display: none;">
                    <h3>Add New Event</h3>
                    <form id="event-form">
                        <div class="form-group">
                            <label for="event-title">Title:</label>
                            <input type="text" id="event-title" required>
                        </div>
                        <div class="form-group">
                            <label for="event-date">Date:</label>
                            <input type="date" id="event-date" required>
                        </div>
                        <div class="form-group">
                            <label for="event-time">Time:</label>
                            <input type="time" id="event-time" required>
                        </div>
                        <div class="form-group">
                            <label for="event-duration">Duration (minutes):</label>
                            <input type="number" id="event-duration" min="15" step="15" value="60">
                        </div>
                        <div class="form-group">
                            <label for="event-description">Description:</label>
                            <textarea id="event-description"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-event-btn">Cancel</button>
                            <button type="submit">Save Event</button>
                        </div>
                    </form>
                </div>
            `;

            // Add event listeners
            document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
            document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
            document.getElementById('add-event-btn').addEventListener('click', () => this.showEventForm());
            document.getElementById('cancel-event-btn').addEventListener('click', () => this.hideEventForm());
            document.getElementById('event-form').addEventListener('submit', (e) => this.handleEventSubmit(e));
        }

        // Initial calendar render
        this.renderCalendar();
    },

    // Load calendar events from Google Calendar API
    loadCalendarEvents: function() {
        if (!window.gapi) {
            this.loadGoogleAPI(() => this.loadCalendarEvents());
            return;
        }

        this.isLoading = true;
        // Show loading state
        this.renderCalendar();

        // Load the Google Calendar API
        gapi.load('client', () => {
            gapi.client.init({
                apiKey: 'AIzaSyCtL-BapQYQFN8kNz01qYUfSyiO9ElBwWc',
                clientId: window.GoogleAuth.CLIENT_ID,
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

    // Change month and update calendar
    changeMonth: function(delta) {
        this.selectedDate = new Date(
            this.selectedDate.getFullYear(),
            this.selectedDate.getMonth() + delta,
            1
        );
        this.loadCalendarEvents();
    },

    // Render the calendar UI
    renderCalendar: function() {
        // Update month /year display
        const monthNames = ['January','February','March','April','May','June','July',
                            'July','August','September','October','November','December'];
        document.getElementById('current-month').textContent = 
            `${monthNames[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
        
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

            // Check if day has events
            const date = new Date(year, month, i);
            const hasEvents = this.events.some(event => {
                const eventDate = new Date(event.start.dateTime || event.start.date);
                return eventDate.getDate() === i &&
                    eventDate.getMonth() === month &&
                    eventDate.getFullYear() === year;

            });

            if (hasEvents) {
                dayElement.classList.add('has-events');
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

        // Render events list for selected date
        this.renderEventsList();
    },

    // Render events list for the selected date
    renderEventsList: function() {
        const eventsList = document.getElementById('events-list');
        const selectedDateSpan = document.getElementById('selected-date');
        
        // Format the selected date
        const options = { weekend: 'long', year: 'numeric', month: 'long', day: 'Numeric' };
        selectedDateSpan.textContent = this.selectedDate.toLocaleDateString(undefined, options);

        // Clear events list
        eventsList.innerHTML = '';

        // Show loading state if needed
        if (this.isLoading) {
            eventsList.innerHTML = '<div class="loading">Loading events...</div>';
            return;
        }

        // Filter events for the selected date
        const eventsForDay = this.events.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            return eventDate.getDate() === this.selectedDate.getDate() &&
                   eventDate.getMonth() === this.selectedDate.getMonth() &&
                   eventDate.getFullYear() === this.selectedDate.getFullYear();
        });

        // Display events or "no events" message
        if (eventsForDay.length === 0) {
            eventsList.innerHTML = '<div class="no-events">No events for this day</div>';
        } else {
            eventsForDay.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item';
                
                // Format time
                let timeStr = 'All day';
                if (event.start.dateTime) {
                    const startTime = new Date(event.start.dateTime);
                    const endTime = new Date(event.end.dateTime);
                    timeStr = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
                }
                
                eventElement.innerHTML = `
                    <div class="event-time">${timeStr}</div>
                    <div class="event-title">${event.summary}</div>
                `;
                
                // Add click handler to show event details
                eventElement.addEventListener('click', () => {
                    this.showEventDetails(event);
                });
                
                eventsList.appendChild(eventElement);
            });
        }
    },
    
    // Format time twelve hour format with AM/PM
    formatTime: function(date) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // 12 for midnight instead of 0
        
        // Ensure two digit minutes
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        
        return `${hours}:${minutesStr} ${ampm}`;
    },
    // Show form to add a new event
    showEventForm: function() {
        // Set default date to selected date
        document.getElementById('event-date').valueAsDate = this.selectedDate;
        
        // Set default time to next hour
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
        document.getElementById('event-time').value = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
        
        // Show the form
        document.getElementById('event-form-container').style.display = 'block';
    },
    
    // Hide the event form
    hideEventForm: function() {
        document.getElementById('event-form-container').style.display = 'none';
    },
    
    // Handle event form submission
    handleEventSubmit: function(e) {
        e.preventDefault();
        
        // Check if user is authenticated
        if (!window.GoogleAuth || !window.GoogleAuth.isAuthenticated()) {
            alert('Please sign in with Google to add events');
            return;
        }
        
        // Get form values
        const title = document.getElementById('event-title').value;
        const dateStr = document.getElementById('event-date').value;
        const timeStr = document.getElementById('event-time').value;
        const duration = parseInt(document.getElementById('event-duration').value);
        const description = document.getElementById('event-description').value;
        
        // Create start and end times
        const startDateTime = new Date(`${dateStr}T${timeStr}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000); // Add minutes
        
        // Create event object
        const event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': startDateTime.toISOString(),
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'end': {
                'dateTime': endDateTime.toISOString(),
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
        
        // Call Google Calendar API to add event
        gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event
        }).then(response => {
            // Add the new event to our local array and refresh the calendar
            this.events.push(response.result);
            this.hideEventForm();
            this.renderCalendar();
            
            // Provide feedback to the user
            alert('Event created successfully!');
        }).catch(error => {
            console.error('Error creating event:', error);
            alert('Error creating event. Please try again.');
        });
    },
    
    // Show details for an event
    showEventDetails: function(event) {
        alert(`Event: ${event.summary}\n\nDescription: ${event.description || 'No description'}`);
        // :::NOTE::: May need modal?
    },
    
    // Function to speak event details
    speakEventDetails: function(event) {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            return;
        }
        
        let speech = new SpeechSynthesisUtterance();
        
        // Format time for speech
        let timeInfo = 'all day';
        if (event.start.dateTime) {
            const startTime = new Date(event.start.dateTime);
            timeInfo = `at ${this.formatTime(startTime)}`;
        }
        
        speech.text = `Event: ${event.summary}, ${timeInfo}. ${event.description || ''}`;
        speech.volume = 1;
        speech.rate = 1;
        speech.pitch = 1;
        
        window.speechSynthesis.speak(speech);
    }
};

// Initialize the calendar when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize calendar if on the calendar page
    if (window.location.pathname.includes('calendar.html')) {
        Calendar.init();
    }
});

// Export the Calendar object so it can be used in other files
window.Calendar = Calendar;