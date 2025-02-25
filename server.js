// To connect to server from local machine, type "localhost:3000" in your browser.

const http = require('http');
const fs = require('fs')


// This piece of code listens to the requests made by the browser, and sends a response every time someone connects to the website
const server = http.createServer((request, response) => {
    fs.readFile('index.html', (err, data) => {
        if(err)
        {
            response.writeHead(404, {'Content-Type': 'text/plain'}); // if there is an error, displays 404 error
            response.end('Page not found (404)');
        }
        else
        {
            response.writeHead(404, {'Content-Type': 'text/html'}); // displays our html file (index.html)
            response.end(data);
        }
    })
    console.log(request.url, request.method); // logs on backend when trying to connect to website
    
    // SENDS RESPONSE  
});

server.listen(3000, 'localhost', () => {
    console.log('listening for reqs on port 3000')
}); // will change localhost later when server is online, 3000 port is for local web dev