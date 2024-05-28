const fs = require('fs');

const loadDevApp = true; // Set this to true or false based on your requirement

let app;

if (loadDevApp && fs.existsSync('./dev/app.js')) {
  app = require('./dev/app.js');
} else {
  app = require('./src/app.js');
}

// Use the 'app' module as needed
// ...
