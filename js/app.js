const http = require('http');
const fs = require('fs')
const mongoose = require('mongoose');
const Reminder = require('./models/reminder')

// connect to mongodb
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
// This piece of code listens to the requests made by the browser, and sends a response every time someone connects to the website
const server = http.createServer((request, response) => {
    // SENDS RESPONSE
    let path = '../';
    switch(request.url)
    {
        case '/':
            path += 'index.html';
            response.statusCode = 200;
            break;
        default:
            path += '404.html';
            response.statusCode = 404;
            console.log(request.url);
            break;
    }
    fs.readFile(path, (err, data) => {
        if(err)
        {
            console.log(err);
            response.end();
        }
        else
        {
            response.write(data);
            response.end(data);
        }
    })
    console.log(request.url, request.method); // logs on backend when trying to connect to website
    
 
});

mongoose.connect(dbURI)
    .then((result) => server.listen(3000), 'localhost', () => console.log('listening on port 3000')) // will change localhost later when server is online, 3000 port is for local web dev)
    .catch((err) => console.log(err));

// Mongoose and mongo sandbox routes
let path = 'localhost/'
/*
server.getConnections('/add-reminder',
    (req, res) => {
        const reminder = new Reminder(
            { // example saving to DB
                title: 'new reminder',
                description: 'about reminder',
                time: 123,
                date: 456
            }
        );
        reminder.save()
            .then((result) => {
                response.send(result);
            })
            .catch((err) => console.log(err))
    }
) 
*/




