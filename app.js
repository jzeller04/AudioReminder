const express = require('express');
const mongoose = require('mongoose');
const Reminder = require('./js/models/reminder')


// connect to mongodb
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

const app = express();

// listen for requests
app.use(express.static(__dirname));

app.get('/', (request, response) => 
    {
        response.sendFile('./index.html', { root: __dirname });
    }
)

app.get('/index.html', (request, response) => 
    {
        response.redirect('/')
    }
)

app.get('/settings.html', (request, response) => 
    {
        response.sendFile('./settings.html', { root: __dirname });
    }
)

app.get('/tasks.html', (request, response) => 
    {
        response.sendFile('./tasks.html', { root: __dirname });
        Reminder.find()
            .then((result) => 
            {
                
            }).catch((err) => console.log(err));
    }
)

app.get('/calendar.html', (request, response) => 
    {
        response.sendFile('./calendar.html', { root: __dirname });
    }
)



mongoose.connect(dbURI)
    .then((result) => app.listen(3000), console.log('Successfully connected to DB ... listening on port 3000')) // will change localhost later when server is online, 3000 port is for local web dev)
    .catch((err) => console.log(err));

// mongoose/mongo sandbox routes
app.get('/add-task', (request,response) =>
    {
        const reminder = new Reminder(
            {
                title: 'new reminder',
                description: 'description here',
                date:13,
                time:12
            }
        );
        
        reminder.save()
            .then((result) => {
                response.send(result)
            }).catch((err) => console.log(err));
    }
);


// 404 page

app.use((request, response) => 
    {
        response.sendFile('./404.html', { root: __dirname });
    }
)