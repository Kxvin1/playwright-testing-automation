const { chromium, firefox } = require("playwright");
const chalk = require('chalk');

// Default browser configuration
const DEFAULT_BROWSER_CONFIG = {
  timeouts: {
    navigation: 30000,
  },
};

// Browser-specific launch arguments for optimal performance
const getBrowserArgs = (browserName) => {
  const commonArgs = [
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
  ];

  const browserSpecificArgs = {
    chromium: [
      ...commonArgs,
      "--disable-web-security", // Chromium-specific
      "--disable-dev-shm-usage",
      "--no-sandbox"
    ],
    firefox: [
      ...commonArgs,
      // Firefox doesn't support --disable-web-security
      "--no-remote",
      "--new-instance"
    ]
  };

  return browserSpecificArgs[browserName] || commonArgs;
};

// Check if browser is available and installed
const isBrowserAvailable = async (browserName) => {
  try {
    const browserMap = { chromium, firefox };
    const browserType = browserMap[browserName];
    
    if (!browserType) return false;
    
    // Try to get browser executable path to verify installation
    const executablePath = browserType.executablePath();
    return !!executablePath;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️ ${browserName} not available: ${error.message}`));
    return false;
  }
};

// Get available browsers from the configured list
const getAvailableBrowsers = async (configuredBrowsers) => {
  const availableBrowsers = [];
  
  for (const browserName of configuredBrowsers) {
    if (await isBrowserAvailable(browserName)) {
      availableBrowsers.push(browserName);
      console.log(chalk.green(`  ✅ ${browserName} available`));
    } else {
      console.log(chalk.yellow(`  ⚠️ ${browserName} not installed - skipping`));
    }
  }
  
  if (availableBrowsers.length === 0) {
    throw new Error('No browsers available for testing. Please install Playwright browsers: npx playwright install');
  }
  
  return availableBrowsers;
};

// Launch browser with optimized settings for QA testing
const launchBrowser = async (browserName, config = DEFAULT_BROWSER_CONFIG) => {
  // Check if browser is available first
  if (config.browser?.skipUnavailable && !(await isBrowserAvailable(browserName))) {
    throw new Error(`Browser ${browserName} is not available`);
  }

  // Get browser-specific timeouts
  const browserTimeouts = config.browserTimeouts?.[browserName] || config.timeouts;
  
  const browserOptions = {
    headless: config.browser?.headless ?? false,
    slowMo: config.browser?.slowMo || 0,
    args: getBrowserArgs(browserName),
    timeout: browserTimeouts?.navigation || DEFAULT_BROWSER_CONFIG.timeouts.navigation,
  };

  // Add browser-specific optimizations
  if (browserName === 'firefox') {
    // Firefox-specific settings
    browserOptions.firefoxUserPrefs = {
      'media.navigator.streams.fake': true,
      'media.navigator.permission.disabled': true,
    };
  }

  try {
    switch (browserName) {
      case "chromium":
        return await chromium.launch(browserOptions);
      case "firefox":
        return await firefox.launch(browserOptions);
      default:
        throw new Error(`Unsupported browser: ${browserName}`);
    }
  } catch (error) {
    console.log(chalk.red(`  ❌ Failed to launch ${browserName}: ${error.message}`));
    throw error;
  }
};

// Get appropriate user agent string for different viewport types and browsers
const getUserAgent = (viewportName, browserName = 'chromium') => {
  const userAgents = {
    chromium: {
      Desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Tablet: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      Mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    },
    firefox: {
      Desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      Tablet: "Mozilla/5.0 (Android 10; Tablet; rv:121.0) Gecko/121.0 Firefox/121.0",
      Mobile: "Mozilla/5.0 (Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
    }
  };
  
  const browserUserAgents = userAgents[browserName] || userAgents.chromium;
  return browserUserAgents[viewportName] || browserUserAgents.Desktop;
};

module.exports = {
  launchBrowser,
  getUserAgent,
  isBrowserAvailable,
  getAvailableBrowsers,
  getBrowserArgs,
};
