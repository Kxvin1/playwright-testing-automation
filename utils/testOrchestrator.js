// Test Orchestrator - Manages comprehensive test execution across browsers and test types

const chalk = require("chalk");
const moment = require("moment");
const { getAvailableBrowsers } = require("./browserUtils");
const {
  displayTestSummary,
  generateAllReports,
  displayFinalSummary,
} = require("./reportGenerator");
const runEdgeCaseTests = require("./edgeCaseTests");
const HNApiTester = require("../tests/api/hnApiTests");
const SecurityTester = require("../tests/security/securityTests");
const QualityMetricsTracker = require("./qualityMetrics");

class TestOrchestrator {
  constructor(config) {
    this.config = config;
    this.testResults = [];
    this.testStartTime = null;
    this.qualityMetricsTracker = null;
  }

  async runComprehensiveValidation(runSingleTestFn) {
    this.testStartTime = Date.now();
    console.log(chalk.cyan.bold("\n🔧 Enhanced Hacker News Validation Suite"));
    console.log(chalk.cyan("=".repeat(60)));
    console.log(
      chalk.yellow(`Started: ${moment().format("YYYY-MM-DD HH:mm:ss")}`)
    );
    console.log(
      chalk.yellow(
        `Target: Validate ${this.config.targetArticleCount} articles sorting\n`
      )
    );

    try {
      // Initialize quality metrics tracker
      this.qualityMetricsTracker = new QualityMetricsTracker();
      await this.qualityMetricsTracker.initialize();

      // Check available browsers and filter configured list
      console.log(chalk.blue.bold("🔍 Checking browser availability..."));
      const availableBrowsers = await getAvailableBrowsers(
        this.config.browsers
      );

      if (availableBrowsers.length < this.config.browsers.length) {
        console.log(
          chalk.yellow(
            `⚠️ Only ${availableBrowsers.length} of ${this.config.browsers.length} configured browsers are available`
          )
        );
      }

      // Run tests across available browsers and viewports
      await this.runBrowserTests(availableBrowsers, runSingleTestFn);

      // Run API tests
      const apiTestResults = await this.runApiTests();

      // Run security tests
      const securityTestResults = await this.runSecurityTests();

      // Process and integrate results
      await this.processTestResults(apiTestResults, securityTestResults);

      // Generate comprehensive reports
      await generateAllReports(this.testResults);

      // Final summary
      return displayFinalSummary(this.testResults, this.testStartTime);
    } catch (error) {
      console.error(
        chalk.red.bold("\n❌ Test execution failed:"),
        error.message
      );
      throw error;
    }
  }

  async runBrowserTests(availableBrowsers, runSingleTestFn) {
    for (const browserName of availableBrowsers) {
      console.log(
        chalk.blue.bold(`\n📱 Testing with ${browserName.toUpperCase()}`)
      );

      for (const viewport of this.config.viewports) {
        console.log(
          chalk.blue(
            `  Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`
          )
        );

        const result = await runSingleTestFn(browserName, viewport);
        this.testResults.push(result);

        // Show immediate results
        displayTestSummary(result);
      }
    }
  }

  async runApiTests() {
    console.log(chalk.magenta.bold("\n🔗 Running API Validation Tests..."));
    try {
      const apiTester = new HNApiTester();
      return await apiTester.runAllTests();
    } catch (error) {
      console.log(chalk.yellow(`⚠️ API tests failed: ${error.message}`));
      return null;
    }
  }

  async runSecurityTests() {
    console.log(chalk.red.bold("\n🔒 Running Security Tests..."));
    try {
      const securityTester = new SecurityTester();
      return await securityTester.runSecurityTests();
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Security tests failed: ${error.message}`));
      return null;
    }
  }

  async processTestResults(apiTestResults, securityTestResults) {
    if (!this.testResults || this.testResults.length === 0) return;

    // Safe navigation with null checks and fallback values
    const bestResult = this.testResults.reduce((best, current) => {
      const currentAccuracy = current?.sortingAccuracy?.accuracy ?? 0;
      const bestAccuracy = best?.sortingAccuracy?.accuracy ?? 0;
      return currentAccuracy > bestAccuracy ? current : best;
    });

    // Null safety check for bestResult
    if (!bestResult) {
      console.log(
        chalk.yellow(
          "⚠️ No valid test results found - skipping result processing"
        )
      );
      return;
    }

    // Validate and attach API results
    if (apiTestResults && apiTestResults.testResults) {
      bestResult.api = apiTestResults;
      console.log(chalk.green("✅ API test results integrated successfully"));
    } else if (apiTestResults) {
      bestResult.api = apiTestResults;
      console.log(chalk.yellow("⚠️ API test results have incomplete data"));
    } else {
      console.log(
        chalk.yellow("⚠️ API tests failed - proceeding without API metrics")
      );
    }

    // Validate and attach security results
    if (
      securityTestResults &&
      securityTestResults.testResults &&
      securityTestResults.testResults.vulnerabilities
    ) {
      bestResult.security = securityTestResults.testResults;
      console.log(
        chalk.green("✅ Security test results integrated successfully")
      );
    } else if (securityTestResults && securityTestResults.testResults) {
      bestResult.security = securityTestResults.testResults;
      console.log(
        chalk.yellow(
          "⚠️ Security test results have incomplete data - using available data"
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "⚠️ Security tests failed - proceeding without security metrics"
        )
      );
    }

    // Record quality metrics with error handling
    try {
      await this.qualityMetricsTracker.recordMetrics(bestResult);
      console.log(chalk.green("✅ Quality metrics recorded successfully"));
    } catch (metricsError) {
      console.log(
        chalk.red(
          `❌ Quality metrics recording failed: ${metricsError.message}`
        )
      );
      console.log(chalk.yellow("⚠️ Continuing without quality metrics..."));
    }
  }

  async runEdgeCaseTests() {
    return await runEdgeCaseTests(this.config);
  }

  getTestResults() {
    return this.testResults;
  }
}

module.exports = TestOrchestrator;
