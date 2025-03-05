const express = require('express');
const mongoose = require('mongoose');
const Reminder = require('./js/models/reminder');
const bodyParser = require('body-parser');
const { error } = require('console');


// connect to mongodb
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

const app = express();

// listen for requests
app.use(express.static(__dirname));

app.use(bodyParser.urlencoded({extended: true}));

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
        const title = request.body.title;
        console.log(title);
        response.sendFile('./tasks.html', { root: __dirname });
        
    }
)


app.get('/calendar.html', (request, response) => 
    {
        response.sendFile('./calendar.html', { root: __dirname });
    }
)

app.get('/titleform', (request, response) =>
{
    response.sendFile('./titleform.html', { root: __dirname });

})


app.post('/submit', (request, response) => {
    const title = request.body.title; // as of right now, when you enter a title in the tasks screen, it will send a 'reminder' to the DB with the title entered
    if (title) {
        response.redirect('/tasks.html');
        console.log(title);
        const reminder = new Reminder(
            {
                title: title,
                description: 'description here',
                date:13,
                time:12
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

// mongoose/mongo sandbox routes
app.get('/add-task', (request,response) =>
    {
        
    }
);


// 404 page

app.use((request, response) => 
    {
        response.sendFile('./404.html', { root: __dirname });
    }
)