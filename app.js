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

// TDL: All of this needs to be refactored. It's hard to read for literally no reason. There isnt anything complicated happening in this file.

// connect to mongodb
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/gomeangreendb?retryWrites=true&w=majority&appName=Cluster0' 

const app = express();

// listen for requests
// send html pages back
app.get('/', async (request, response) => {
    try {
        const template = await fs.promises.readFile(__dirname + '/index.html', 'utf8');
        const reminders = await fetchReminder.fetch();

        let reminderHTML = reminders.map(reminder => 
            `<p>${reminder.title || 'No reminder found'}</p>
            <p>${reminder.description || 'No reminder found'}</p>
            <p>${reminder.date || 'No reminder found'}</p>
            <p>${reminder.time || 'No reminder found'}</p><hr>`
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
        response.sendFile('./settings.html', { root: __dirname });
    }
);

app.get('/tasks', (request, response) => 
    {
        response.sendFile('./tasks.html', { root: __dirname });
    }
);

app.get('/newtask', (request, response) => 
    {
        const title = request.body.title;
        console.log(title);
        response.sendFile('./newtask.html', { root: __dirname });
    }
);


app.get('/calendar', (request, response) => 
    {

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
        if(await signInSuccess(request.body.email, request.body.password))
        {
            response.redirect('/');
        }
        else
        {
            response.redirect('/login');
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

app.post('/submit', (request, response) => {
    const title = request.body.title; // as of right now, when you enter a title in the tasks screen, it will send a 'reminder' to the DB with the title entered
    const description = request.body.memo;
    const date = request.body.date;
    const time = request.body.time;
    if (title) {
        response.redirect('/tasks');
        const reminder = new Reminder(
            {
                title: title,
                description: description,
                date: date,
                time: time
            }
        );
        
        reminder.save()
            .then((result) => {
                console.log(result);
            }).catch((err) => console.log(err));
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