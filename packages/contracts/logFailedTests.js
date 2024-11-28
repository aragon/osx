const fs = require('fs');
const path = require('path');

class LogFailedTests {
  constructor(runner) {
    const logFilePath = path.join(__dirname, 'failed-tests.log');
    const errorDetails = [];

    // Listen for failed tests
    runner.on('fail', (test, err) => {
      // Log only the title to the console
      console.log(`FAILED: ${test.fullTitle()}`);

      // Store full error details
      errorDetails.push(
        `FAILED: ${test.fullTitle()}\n` +
          `Error: ${err.message}\n` +
          `Stack:\n${err.stack}\n`
      );
    });

    // Write all error details to a file at the end
    runner.on('end', () => {
      if (errorDetails.length > 0) {
        fs.writeFileSync(logFilePath, errorDetails.join('\n\n'), 'utf-8');
        console.log(`Detailed errors saved to ${logFilePath}`);
      } else {
        console.log('No tests failed.');
      }
    });
  }
}

module.exports = LogFailedTests;
