const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;
const openBrowser = process.argv.includes('--open');

// Serve static files
app.use(express.static(__dirname));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  
  // Open browser if --open flag is provided
  if (openBrowser) {
    const url = `http://localhost:${port}`;
    const start = process.platform === 'darwin' ? 'open' : 
                 process.platform === 'win32' ? 'start' : 'xdg-open';
    require('child_process').exec(`${start} ${url}`);
  }
});