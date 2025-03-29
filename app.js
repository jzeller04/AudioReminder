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
const {saveReminderToUser} = require('./backend/saveReminderToUser.js');

// TDL: All of this needs to be refactored. It's hard to read for literally no reason. There isnt anything complicated happening in this file.

// connect to mongodb
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/gomeangreendb?retryWrites=true&w=majority&appName=Cluster0' // TODO: MAKE THIS PRIVATE!!!!!!!!!

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
        response.redirect('/login');
    }
}

// listen for requests
// send html pages back
app.get('/', async (request, response) => {
    if(!request.session.userId)
    {
        response.redirect('/login');
    }
    try {
        const template = await fs.promises.readFile(__dirname + '/index.html', 'utf8');
        const userReminders = await fetchReminder.fetch(request.session.userId);

        let reminderHTML = userReminders.map(reminder => 
            `<hr> 
            <div class="reminder-item">          
                <p>${reminder.title || 'No reminder found'}</p>
                <p>${reminder.description || 'No reminder found'}</p>
                <p>${reminder.date || 'No reminder found'}</p>
                <p>${reminder.time || 'No reminder found'}</p>
            </div>`
        ).join('');

        const finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        response.send(finalHTML);
    } catch (err) {
        console.log(err);
        response.sendFile('./titleform.html', { root: __dirname });
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
        response.sendFile('./settings.html', { root: __dirname });
    }
);

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
            `<hr>
            <div class="reminder-item"> 
                <div class="reminder-content">
                    <p>${reminder.title || 'No reminder found'}</p>
                    <p>${reminder.description || 'No reminder found'}</p>
                    <p>${reminder.date || 'No reminder found'}</p>
                    <p>${reminder.time || 'No reminder found'}</p>
                </div>
            <button class="done-btn" data-id="${reminder._id}">Done</button>
            </div>`
        ).join('');

        const finalHTML = template.replace('{{REMINDERS}}', reminderHTML);

        response.send(finalHTML);
    } catch (err) {
        console.log(err);
        response.sendFile('./tasks.html', { root: __dirname });
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
        response.sendFile('./newtask.html', { root: __dirname });
    }
);


app.get('/calendar', (request, response) => 
    {
        if(!request.session.userId)
        {
            return response.redirect('/login');
        }
        response.sendFile('./calendar.html', { root: __dirname });
    }
);
// login routes to signin link
app.get('/login', (request, response) => 
    {
        response.sendFile('./login.html', { root: __dirname });
    }
);
app.post('/signin', async (request, response) => 
    {
        const {email, password} = request.body;

        try {

            const isLoggedIn = await signInSuccess(email, password);

            if(isLoggedIn)
            {
                const user = await User.findOne({userEmail: email});
                request.session.userId = user._id; // store user ID in session
                console.log('session created: ' + request.session.userId);
                return response.redirect('/');
            }
            else
            {
                return response.redirect('/login');
            }
        } catch (error) {
            response.redirect('404');
        }
    }
);
app.get('/signup', (request, response) => 
    {
        response.sendFile('./signup.html', { root: __dirname });
    }
);
app.post('/newuser', (request, response) => 
    {
        createUserWithSignUp(request.body.email, request.body.password);
        response.redirect('/login');
    }
);

app.get('/logout', (request, response) => {
    request.session.destroy(err =>{
        if(err)
        {
            response.redirect('404');
        }
        else
        {
            response.redirect('/login');
        }
    })
})

app.post('/submit', (request, response) => {
    const title = request.body.title; // as of right now, when you enter a title in the tasks screen, it will send a 'reminder' to the DB with the title entered
    const description = request.body.memo;
    const date = request.body.date;
    const time = request.body.time;
    if (title) {
        response.redirect('/tasks');
        saveReminderToUser(title,description,time,date, request.session.userId);
    } else {
        response.status(400).send("No title received");
    }
});



mongoose.connect(dbURI)
    .then((result) => app.listen(3000), console.log('Successfully connected to DB ... listening on port 3000')) // will change localhost later when server is online, 3000 port is for local web dev)
    .catch((err) => console.log(err));


// 404 page

app.use((request, response) => 
    {
        
        response.sendFile('./404.html', { root: __dirname });
    }
);