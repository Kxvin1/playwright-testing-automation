#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');

// Path to the HTML report
const reportPath = path.join(process.cwd(), 'reports', 'test-report.html');

// Check if the report file exists
if (!fs.existsSync(reportPath)) {
  console.log(chalk.red('❌ No reports found!'));
  console.log();
  console.log(chalk.yellow('📋 Reports have not been generated yet.'));
  console.log();
  console.log(chalk.green('🚀 To generate reports, run:'));
  console.log(chalk.cyan('   npm test'));
  console.log();
  console.log(chalk.green('📊 Then view the dashboard with:'));
  console.log(chalk.cyan('   npm run report'));
  console.log();
  process.exit(1);
}

// Report exists, try to open it
console.log(chalk.blue('📊 Opening test report dashboard...'));

// Determine the appropriate command based on the platform
let openCommand;
if (process.platform === 'darwin') {
  openCommand = `open "${reportPath}"`;
} else if (process.platform === 'linux') {
  openCommand = `xdg-open "${reportPath}"`;
} else if (process.platform === 'win32') {
  openCommand = `start "${reportPath}"`;
} else {
  console.log(chalk.yellow('⚠️  Unable to determine how to open files on this platform.'));
  console.log(chalk.cyan(`Please manually open: ${reportPath}`));
  process.exit(1);
}

// Execute the open command
exec(openCommand, { stdio: 'inherit' }, (error) => {
  if (error) {
    console.log(chalk.yellow('⚠️  Unable to open the report automatically.'));
    console.log(chalk.cyan(`Please manually open: ${reportPath}`));
    console.log(chalk.gray(`Error: ${error.message}`));
    process.exit(1);
  }
});