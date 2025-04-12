require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Reminder = require('./backend/models/reminder');
const fetchReminder = require('./backend/fetchReminder');
const bodyParser = require('body-parser');
const { error } = require('console');
const { title } = require('process');
const fs = require('fs');
const {signInSuccess} = require('./backend/signIn.js');
const {createUserWithSignUp} = require('./backend/signUp.js');
const session = require('express-session');
const { request } = require('http');
const User = require('./backend/models/user.js');
const {saveReminderToUser, saveUserSettings} = require('./backend/saveReminderToUser.js');
const {dateToReadable, timeToTwelveSystem} = require('./backend/util/util.js');

// TDL: All of this needs to be refactored. It's hard to read for literally no reason. There isnt anything complicated happening in this file.

// connect to mongodb
const dbURI = process.env.MONGO_URI;

const app = express();

app.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
}));
// no idea why, but this code is required for the logging in to work. :shrug:
const isAuthentic = (request, response, next) =>
{
    if(request.session.userId)
    {
        return next();
    }else{
        return response.redirect('/login');
    }
}

// listen for requests
// send html pages back
app.get('/', async (request, response) => {
    if(!request.session.userId)
    {
        return response.redirect('/login');
    }
    try {
        console.log(await fetchReminder.updateUserReminders(request.session.userId));
        const template = await fs.promises.readFile(__dirname + '/index.html', 'utf8');
        const userReminders = await fetchReminder.fetch(request.session.userId);
        //console.log(userReminders);

        let reminderHTML;
        if(userReminders.length > 0) {
            const reminder = userReminders[0];
            reminderHTML =
                `<div class="reminder-item"> 
                    <div class="reminder-content">
                        <p class="reminder-title">${reminder.title || 'No reminder found'}</p>
                        <p class="reminder-description">${reminder.description || 'No reminder found'}</p>
                        <p class="reminder-date">${dateToReadable(reminder.date) || 'No reminder found'}</p>
                        <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'No reminder found'}</p>
                    </div>
                </div>`;
            } else {
                reminderHTML = 
                    `<hr> 
                    <div class="reminder-item">          
                        <p>${'Nothing to do!'}</p>
                        <p>${''}</p>
                        <p>${''}</p>
                        <p>${''}</p>
                    </div>`;
        }

        let finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        const user = await User.findById(request.session.userId);

        if (user?.preferences?.highContrast) {
            const theme = user.preferences.highContrast;
            const themeScript = `<script>
                localStorage.setItem('theme', '${theme}');
                document.body.classList.add('${theme}');
            </script>`;
            finalHTML = finalHTML.replace('</body>', `${themeScript}</body>`);
        } else {
            console.log('No theme preference found for user.');
        }

        return response.send(finalHTML);
    } catch (err) {
        console.log(err);
        return response.sendFile('./404.html', { root: __dirname });
    }
});

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({extended: true}));


app.get('/settings', (request, response) => 
    {
    if(!request.session.userId)
    {
        return response.redirect('/login');
    }
        return response.sendFile('./settings.html', { root: __dirname });
    }
);

// POST req for settings
app.post('/updateSettings', async (request, response) => 
{
    console.log(request.body.setting);
    saveUserSettings(request.body.setting, request.session.userId);
    return response.redirect('/settings');
});

// Does the same thing as the home page (Maybe we can combine these later)
app.get('/tasks', async (request, response) => {
    if(!request.session.userId)
    {
        return response.redirect('/login');
    }
    try {
        const template = await fs.promises.readFile(__dirname + '/tasks.html', 'utf8');
        const reminders = await fetchReminder.fetch(request.session.userId);

        let reminderHTML = reminders.map(reminder =>
            `<div class="reminder-item"> 
                <div class="reminder-content">
                    <p class="reminder-title">${reminder.title || 'No reminder found'}</p>
                    <p class="reminder-description">${reminder.description || 'No reminder found'}</p>
                    <p class="reminder-date">${dateToReadable(reminder.date) || 'No reminder found'}</p>
                    <p class="reminder-time">${timeToTwelveSystem(reminder.time) || 'No reminder found'}</p>
                </div>
                <button class="complete-btn" data-id="${reminder._id}">Mark Complete</button>
            </div>`
        ).join('');

        const finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        return response.send(finalHTML);
    } catch (err) {
        console.log(err);
        return response.sendFile('./tasks.html', { root: __dirname });
    }
});

app.get('/newtask', (request, response) => 
    {
    if(!request.session.userId)
    {
        return response.redirect('/login');
    }
        const title = request.body.title;
        console.log(title);
        return response.sendFile('./newtask.html', { root: __dirname });
    }
);

app.post('/complete-reminder', bodyParser.urlencoded({ extended: true }), async (request, response) => {
    if (!request.session.userId) {
        return response.redirect('/login');
    }
    
    const reminderId = request.body.reminderId;
    
    try {
        // Find the user and update their reminders array to remove the completed reminder
        await User.findOneAndUpdate(
            { _id: request.session.userId },
            { $pull: { reminders: { _id: reminderId } } }
        );
        
        // Redirect back to tasks page
        return response.redirect('/tasks');
    } catch (error) {
        console.log('Error removing reminder:', error);
        return response.redirect('/tasks');
    }
});

app.get('/calendar', (request, response) => 
    {
        if(!request.session.userId)
        {
            return response.redirect('/login');
        }
            return response.sendFile('./calendar.html', { root: __dirname });
    }
);
// login routes to signin link
app.get('/login', (request, response) => 
    {
        return response.sendFile('./login.html', { root: __dirname });
    }
);

app.post('/signin', async (request, response) => {
    const {email, password} = request.body;

    try {
        const isLoggedIn = await signInSuccess(email, password);
        
        if(isLoggedIn) {
            const user = await User.findOne({userEmail: email});
            request.session.userId = user._id; // store user ID in session
            console.log('session created: ' + request.session.userId);
            return response.redirect('/');
        } else {
            return response.redirect('/login');
        }
    } catch (error) {
        return response.redirect('404');
    }
});

app.get('/signup', (request, response) => 
    {
        return response.sendFile('./signup.html', { root: __dirname });
    }
);
app.post('/newuser', (request, response) => 
    {
        createUserWithSignUp(request.body.email, request.body.password);
        return response.redirect('/login');
    }
);

app.get('/logout', (request, response) => {
    request.session.destroy(err =>{
        if(err)
        {
            return response.redirect('404');
        }
        else
        {
            return response.redirect('/login');
        }
    })
})

app.post('/submit', (request, response) => {
    const title = request.body.title; // as of right now, when you enter a title in the tasks screen, it will send a 'reminder' to the DB with the title entered
    const description = request.body.memo;
    const date = request.body.date;
    const time = request.body.time;
    if (title) {
        saveReminderToUser(title,description,time,date, request.session.userId);
        return response.redirect('/newtask');
    } else {
        return response.status(400).send("No title received");
    }
});

app.get('/getUserPreferences', async (request, response) => {
    if (!request.session.userId) {
        return response.status(401).json({ error: 'Not logged in' });
    }
    
    try {
        const user = await User.findById(request.session.userId);
        if (!user) {
            return response.status(404).json({ error: 'User not found' });
        }
        
        return response.json({ preferences: user.preferences });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return response.status(500).json({ error: 'Server error' });
    }
});



mongoose.connect(dbURI)
    .then((result) => app.listen(3000), console.log('Successfully connected to DB ... listening on port 3000')) // will change localhost later when server is online, 3000 port is for local web dev)
    .catch((err) => console.log(err));


// 404 page

app.use((request, response) => 
    {
        
        return response.sendFile('./404.html', { root: __dirname });
    }
);