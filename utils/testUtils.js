const chalk = require('chalk');

// Default configuration for test utilities
const DEFAULT_CONFIG = {
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
};

// Enhanced retry mechanism with exponential backoff
const retry = async (fn, maxAttempts = DEFAULT_CONFIG.retry.maxAttempts, backoffMs = DEFAULT_CONFIG.retry.backoffMs) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.log(chalk.yellow(`  Retry ${attempt}/${maxAttempts} failed: ${error.message}`));
      await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
    }
  }
};

// Timeout wrapper for operations with time limits
const withTimeout = (fn, timeoutMs, errorMessage = 'Operation timed out') => {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// Enhanced logging with colored output for different message types
const logTestStep = (message, type = 'info') => {
  const colors = { info: 'gray', success: 'green', warning: 'yellow', error: 'red' };
  console.log(chalk[colors[type] || 'gray'](`    ${message}`));
};

module.exports = {
  retry,
  withTimeout,
  logTestStep
};