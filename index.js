// Main Test Runner

// Core dependencies
const chalk = require("chalk");

// Project modules
const TestOrchestrator = require("./utils/testOrchestrator");
const TestRunner = require("./utils/testRunner");

// Environment variable validation utilities
const validateSlowMo = (value) => {
  const parsed = parseInt(value) || 0;
  // Bound between 0 and 5000ms to prevent DoS
  return Math.max(0, Math.min(5000, parsed));
};

const validateHeadless = (value) => {
  return value === "true";
};

// Configuration for test execution
const TEST_CONFIG = {
  targetArticleCount: 100,
  browsers: ["chromium", "firefox"], // Multi-browser testing for comprehensive QA coverage
  viewports: [
    { name: "Desktop", width: 1920, height: 1080 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Mobile", width: 375, height: 667 },
  ],
  timeouts: {
    navigation: 30000,
    element: 15000,
    test: 120000,
  },
  // Browser-specific timeout adjustments
  browserTimeouts: {
    chromium: { navigation: 30000, element: 15000 },
    firefox: { navigation: 35000, element: 20000 }, // Firefox can be slower
  },
  thresholds: {
    sortingAccuracy: 20, // Realistic threshold based on actual HN cross-page sorting behavior
    performance: 5000, // Max 5 second page load
    dataCompleteness: 90, // Min 90% data completeness
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
  browser: {
    headless: validateHeadless(process.env.HEADLESS), // Validated boolean conversion
    slowMo: validateSlowMo(process.env.SLOWMO), // Bounded and validated slowMo value
    skipUnavailable: true, // Skip browsers that aren't installed
  },
};

// ================================================================
// MAIN TEST ORCHESTRATION
// ================================================================
const runComprehensiveValidation = async (orchestrator, testRunner) => {
  return await orchestrator.runComprehensiveValidation(
    (browserName, viewport) => testRunner.runSingleTest(browserName, viewport)
  );
};

// ================================================================
// APPLICATION ENTRY POINT
// ================================================================
const main = async () => {
  try {
    // Create single instances for the entire test run
    const orchestrator = new TestOrchestrator(TEST_CONFIG);
    const testRunner = new TestRunner(TEST_CONFIG);

    // Run comprehensive validation
    await runComprehensiveValidation(orchestrator, testRunner);

    // Run edge case tests with same orchestrator instance
    await orchestrator.runEdgeCaseTests();

    console.log(chalk.green.bold("\n🎉 All tests completed successfully!"));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red.bold("\n💥 Test suite failed:"), error.message);
    console.error(chalk.red("Stack trace:"), error.stack);
    process.exit(1);
  }
};

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  runComprehensiveValidation,
};
