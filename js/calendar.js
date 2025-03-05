// Google Calendar
const Calendar = {
    // Stores calendar state and events
    events: [],
    isLoading: false,
    selectedDate: new Date(),
    apiKey: 'API',

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
    initCalendarIU: function() {
        // Create calendar container if it doesn't exist
        if (!document.getElementById('calendar-container')){
            const container = document.createElement('div');
            container.id = 'calendar-container';
            container.className = 'calendar-container'

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
            // :::NOTE::: Might not be needed? Tasks should do this
            document.getElementById('event-form').addEventListener('submit', () => this.handleEventSubmit(e));
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
                apiKey
            }

            )
        })
        }

}