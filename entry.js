const fs = require('fs');
const readline = require('readline');
const colors = require('colors');
const spinners = require('cli-spinners');

// Check if the app.js files exist
fs.access('src/app.js', fs.constants.F_OK, (errSrc) => {
  fs.access('dev/app.js', fs.constants.F_OK, (errDev) => {
    if (errSrc && errDev) {
      console.error('Error: app.js file not found. Please make sure it exists.'.red);
      process.exit(1);
    }

    console.log('app.js files found.');

    // Create readline interface for getting user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Function to start the application based on the chosen mode
    const startApplication = (mode) => {
      let appPath = '';

      if (mode === 'main') {
        console.log('\nRunning in main mode...\n'.green);
        appPath = 'src/app.js';
      } else if (mode === 'dev') {
        console.log('\nRunning in development mode...\n'.green);
        appPath = 'dev/app.js';
      } else {
        console.log('Invalid mode selected.'.red);
        process.exit(1);
      }

      // Require the app.js file based on the chosen mode
      const app = require(`./${appPath}`);

    };

    // Prompt the user to choose a mode
    const promptMode = () => {
      rl.question('Choose a mode (main/dev): ', (mode) => {
        startApplication(mode);
      });
    };

    promptMode(); // Start the application
  });
});

function createSpinner(spinnerName) {
  const spinner = spinners[spinnerName];
  const frames = spinner.frames.map((frame) => frame.green);
  let currentFrame = 0;

  return {
    start: (message) => {
      process.stdout.write('\n');
      process.stdout.write(frames[currentFrame] + ' ' + message);
      currentFrame = (currentFrame + 1) % frames.length;
    },
    succeed: (message) => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(message.green + '\n');
    },
  };
}
