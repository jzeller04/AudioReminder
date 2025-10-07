# AudioReminder

## Project Description:

This project is designed to assist visually impaired students with keeping track of tasks and reminders.
Students can use voice commands to navigate the app as well as use text-to-speech features to read out 
information that is currently on the screen. With a working calendar, students can select certain days 
to view what reminders are assigned to that day as well as add a reminder to that selected day.


## Building instructions:

To build this program you,

1. Download the project as a zip
![Downloading Zip](/public/images/zip.png "Downloading Zip file")

2. In a linux terminal, navigate to the location of the project using the 'cd' command

3. Type 'npm install' into the terminal

4. Type 'node app' into the terminal

5. On a browser, navigate to http://localhost:3000

6. Log in / sign up using an email address

# Features
## Navigate using voice commands
- Voice commands can be used to change pages and use all features, including reading out reminders for the week
- Push-to-talk mode allows for control of using voice commands by using the space bar to indicate when speaking
- Voice commands can be turned off entirely for use in quiet settings, such as lectures or meetings
- Control speed and volume of voice instructions
## Connect with Google Calendar
- Add and delete events to/from Google Calendar
- Handle conflicts and duplicate events
- Disconnect Google to delete all events imported from Google Calendar
## Creating & deleting events and priority
- Create events with a title, date & time, location, and description
- Events are able to be created directly from the calendar page, choose a day to schedule an event on that day
- Flag events as important to show them first in your tasks list
- The nearest important event is shown on home page
- Easily delete or complete events from tasks list

# Credits

Justin Zeller 
- Scrum Master
- Backend
- Database

Riley Keene
- Backend
- UI/UX
- Frontend

Cristian Hernandez
- Frontend
- TTS/STT
- Voice Command UX

Austin Wilson
- Frontend
- HTML Elements

Macie Maranto
- Frontend
- CSS/Stylizing

Mario Onofrio
- CI/CD
- Database


# Troubleshooting:

If terminal is not letting you run the commands type 'Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass' into terminal
