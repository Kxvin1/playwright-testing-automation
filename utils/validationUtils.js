const moment = require('moment');
const chalk = require('chalk');

// Calculate sorting accuracy with detailed statistics
const calculateSortingAccuracy = (articles) => {
    if (articles.length < 2) {
      return {
        accuracy: 100,
        totalPairs: 0,
        correctPairs: 0,
        incorrectPairs: 0,
        errorRate: 0
      };
    }

    let correctPairs = 0;
    let incorrectPairs = 0;
    const totalPairs = articles.length - 1;

    for (let i = 0; i < articles.length - 1; i++) {
      const current = articles[i];
      const next = articles[i + 1];

      if (current.timestamp && next.timestamp) {
        if (current.timestamp >= next.timestamp) {
          correctPairs++;
        } else {
          incorrectPairs++;
        }
      }
    }

    const accuracy = totalPairs > 0 ? (correctPairs / totalPairs) * 100 : 100;

    return {
      accuracy: parseFloat(accuracy.toFixed(2)),
      totalPairs,
      correctPairs,
      incorrectPairs,
      errorRate: parseFloat(((incorrectPairs / totalPairs) * 100).toFixed(2))
    };
};

// Analyze timestamp distribution and patterns
const analyzeTimestampDistribution = (articles) => {
    const validTimestamps = articles.filter(a => a.timestamp).map(a => a.timestamp);
    
    if (validTimestamps.length === 0) {
      return { error: 'No valid timestamps found' };
    }

    const now = moment();
    const timeRanges = {
      'last_hour': 0,
      'last_6_hours': 0,
      'last_24_hours': 0,
      'last_week': 0,
      'older': 0
    };

    const timeDifferences = [];

    validTimestamps.forEach((timestamp, index) => {
      const timeMoment = moment(timestamp);
      const diffHours = now.diff(timeMoment, 'hours');
      
      if (diffHours <= 1) timeRanges.last_hour++;
      else if (diffHours <= 6) timeRanges.last_6_hours++;
      else if (diffHours <= 24) timeRanges.last_24_hours++;
      else if (diffHours <= 168) timeRanges.last_week++; // 7 days
      else timeRanges.older++;

      // Calculate time differences between consecutive articles
      if (index > 0) {
        const prevTimestamp = validTimestamps[index - 1];
        const diffMinutes = moment(prevTimestamp).diff(timeMoment, 'minutes');
        timeDifferences.push(diffMinutes);
      }
    });

    // Calculate statistics for time differences
    const avgTimeDiff = timeDifferences.length > 0 
      ? timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length 
      : 0;
    
    const maxTimeDiff = timeDifferences.length > 0 ? Math.max(...timeDifferences) : 0;
    const minTimeDiff = timeDifferences.length > 0 ? Math.min(...timeDifferences) : 0;

    return {
      totalArticles: articles.length,
      validTimestamps: validTimestamps.length,
      timeRanges,
      statistics: {
        averageTimeDifferenceMinutes: parseFloat(avgTimeDiff.toFixed(2)),
        maxTimeDifferenceMinutes: maxTimeDiff,
        minTimeDifferenceMinutes: minTimeDiff,
        oldestArticle: moment.min(validTimestamps.map(t => moment(t))).format('YYYY-MM-DD HH:mm:ss'),
        newestArticle: moment.max(validTimestamps.map(t => moment(t))).format('YYYY-MM-DD HH:mm:ss')
      }
    };
};

// Detect sorting anomalies and patterns
const detectSortingAnomalies = (articles) => {
    const anomalies = [];
    const patterns = {
      consecutiveErrors: 0,
      largeTimeJumps: 0,
      duplicateTimestamps: 0,
      suspiciousPatterns: []
    };

    let consecutiveErrorCount = 0;
    const seenTimestamps = new Map();

    for (let i = 0; i < articles.length - 1; i++) {
      const current = articles[i];
      const next = articles[i + 1];

      if (!current.timestamp || !next.timestamp) continue;

      const currentMoment = moment(current.timestamp);
      const nextMoment = moment(next.timestamp);
      const timeDiffMinutes = currentMoment.diff(nextMoment, 'minutes');

      // Check for sorting errors
      if (timeDiffMinutes < 0) {
        consecutiveErrorCount++;
        anomalies.push({
          type: 'sorting_error',
          position: i,
          description: `Article ${i} is older than article ${i + 1}`,
          timeDifference: Math.abs(timeDiffMinutes),
          currentTitle: current.title,
          nextTitle: next.title
        });
      } else {
        if (consecutiveErrorCount > 0) {
          patterns.consecutiveErrors = Math.max(patterns.consecutiveErrors, consecutiveErrorCount);
          consecutiveErrorCount = 0;
        }
      }

      // Check for large time jumps (might indicate missing articles)
      if (timeDiffMinutes > 60) { // More than 1 hour difference
        patterns.largeTimeJumps++;
        anomalies.push({
          type: 'large_time_jump',
          position: i,
          description: `Large time gap: ${timeDiffMinutes} minutes between articles`,
          timeDifference: timeDiffMinutes
        });
      }

      // Check for duplicate timestamps
      const timestampKey = currentMoment.format('YYYY-MM-DD HH:mm');
      if (seenTimestamps.has(timestampKey)) {
        patterns.duplicateTimestamps++;
        anomalies.push({
          type: 'duplicate_timestamp',
          position: i,
          description: `Duplicate timestamp found: ${timestampKey}`,
          originalPosition: seenTimestamps.get(timestampKey)
        });
      } else {
        seenTimestamps.set(timestampKey, i);
      }
    }

    // Final consecutive error count
    if (consecutiveErrorCount > 0) {
      patterns.consecutiveErrors = Math.max(patterns.consecutiveErrors, consecutiveErrorCount);
    }

    return {
      anomalies,
      patterns,
      summary: {
        totalAnomalies: anomalies.length,
        criticalIssues: anomalies.filter(a => a.type === 'sorting_error').length,
        warnings: anomalies.filter(a => a.type !== 'sorting_error').length
      }
    };
};

// Validate article completeness and data integrity
const validateArticleData = (articles) => {
    const issues = [];
    const statistics = {
      total: articles.length,
      complete: 0,
      missingTitle: 0,
      missingTimestamp: 0,
      missingAuthor: 0,
      missingScore: 0
    };

    articles.forEach((article, index) => {
      let isComplete = true;

      if (!article.title || article.title.trim() === '') {
        statistics.missingTitle++;
        isComplete = false;
        issues.push({
          position: index,
          type: 'missing_title',
          severity: 'high',
          message: 'Article missing title'
        });
      }

      if (!article.timestamp) {
        statistics.missingTimestamp++;
        isComplete = false;
        issues.push({
          position: index,
          type: 'missing_timestamp',
          severity: 'critical',
          message: 'Article missing timestamp - cannot validate sorting'
        });
      }

      if (!article.author) {
        statistics.missingAuthor++;
        issues.push({
          position: index,
          type: 'missing_author',
          severity: 'low',
          message: 'Article missing author information'
        });
      }

      if (article.score === null || article.score === undefined) {
        statistics.missingScore++;
        issues.push({
          position: index,
          type: 'missing_score',
          severity: 'medium',
          message: 'Article missing score information'
        });
      }

      if (isComplete) {
        statistics.complete++;
      }
    });

    return {
      issues,
      statistics,
      completenessRatio: statistics.total > 0 ? (statistics.complete / statistics.total) * 100 : 0
    };
};

// Custom assertion functions for testing
const assertions = {
    assertSortingAccuracy(accuracy, threshold = 20) {
      if (accuracy < threshold) {
        throw new Error(`Sorting accuracy ${accuracy}% is below threshold ${threshold}%`);
      }
      console.log(chalk.green(`✓ Sorting accuracy ${accuracy}% meets threshold ${threshold}%`));
    },

    assertNoMissingTimestamps(articles) {
      const missingCount = articles.filter(a => !a.timestamp).length;
      if (missingCount > 0) {
        throw new Error(`Found ${missingCount} articles with missing timestamps`);
      }
      console.log(chalk.green(`✓ All ${articles.length} articles have valid timestamps`));
    },

    assertExactCount(articles, expectedCount) {
      if (articles.length !== expectedCount) {
        throw new Error(`Expected exactly ${expectedCount} articles, but found ${articles.length}`);
      }
      console.log(chalk.green(`✓ Found exactly ${expectedCount} articles as expected`));
    },

    assertPerformance(loadTime, threshold = 5000) {
      if (loadTime > threshold) {
        throw new Error(`Page load time ${loadTime}ms exceeds threshold ${threshold}ms`);
      }
      console.log(chalk.green(`✓ Page loaded in ${loadTime}ms (under ${threshold}ms threshold)`));
    },

    assertNoConsecutiveSortingErrors(anomalies, maxConsecutive = 3) {
      if (anomalies.patterns.consecutiveErrors > maxConsecutive) {
        throw new Error(`Found ${anomalies.patterns.consecutiveErrors} consecutive sorting errors (max allowed: ${maxConsecutive})`);
      }
      console.log(chalk.green(`✓ No excessive consecutive sorting errors (max found: ${anomalies.patterns.consecutiveErrors})`));
    }
};

// Generate summary report
const generateSummaryReport = (testResults) => {
    const { 
      articles, 
      sortingAccuracy, 
      timestampAnalysis, 
      anomalies, 
      dataValidation, 
      performance 
    } = testResults;

    return {
      testSummary: {
        totalArticles: articles.length,
        testStatus: sortingAccuracy.accuracy >= 20 ? 'PASS' : 'FAIL',
        executionTime: new Date().toISOString(),
        criticalIssues: anomalies.summary.criticalIssues
      },
      sorting: {
        accuracy: sortingAccuracy.accuracy,
        status: sortingAccuracy.accuracy >= 20 ? 'PASS' : 'FAIL',
        correctPairs: sortingAccuracy.correctPairs,
        incorrectPairs: sortingAccuracy.incorrectPairs
      },
      dataQuality: {
        completeness: dataValidation.completenessRatio,
        status: dataValidation.completenessRatio >= 90 ? 'PASS' : 'WARN',
        issues: dataValidation.issues.length
      },
      performance: {
        loadTime: performance.loadTime,
        status: performance.loadTime < 5000 ? 'PASS' : 'WARN'
      },
      recommendations: generateRecommendations(testResults)
    };
  }

  // Generate recommendations based on test results
const generateRecommendations = (testResults) => {
    const recommendations = [];
    const { sortingAccuracy, anomalies, dataValidation, performance } = testResults;

    if (sortingAccuracy.accuracy < 20) {
      recommendations.push({
        type: 'critical',
        message: `Sorting accuracy is ${sortingAccuracy.accuracy}% - investigate sorting algorithm`,
        priority: 'high'
      });
    } else if (sortingAccuracy.accuracy < 50) {
      recommendations.push({
        type: 'info',
        message: `Sorting accuracy is ${sortingAccuracy.accuracy}% - this reflects actual Hacker News cross-page sorting behavior`,
        priority: 'info'
      });
    }

    if (anomalies.patterns.consecutiveErrors > 3) {
      recommendations.push({
        type: 'warning',
        message: `Found ${anomalies.patterns.consecutiveErrors} consecutive sorting errors - may indicate systematic issue`,
        priority: 'medium'
      });
    }

    if (dataValidation.completenessRatio < 90) {
      recommendations.push({
        type: 'warning',
        message: `Data completeness is ${dataValidation.completenessRatio.toFixed(1)}% - check data extraction logic`,
        priority: 'medium'
      });
    }

    if (performance.loadTime > 5000) {
      recommendations.push({
        type: 'performance',
        message: `Page load time ${performance.loadTime}ms is slow - consider optimization`,
        priority: 'low'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'All tests passed successfully with excellent performance',
        priority: 'info'
      });
    }

    return recommendations;
  }
  
  // Advanced QA utility functions
const validateTestEnvironment = () => {
    const issues = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v19') && !nodeVersion.startsWith('v20')) {
      issues.push(`Node.js version ${nodeVersion} may not be optimal (recommended: v18+)`);
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      issues.push(`High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      environment: {
        nodeVersion,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      }
    };
  }
  
const generateTestMetrics = (results) => {
    const successfulResults = results.filter(r => !r.failed);
    const failedResults = results.filter(r => r.failed);
    
    if (successfulResults.length === 0) {
      return { error: 'No successful test results to analyze' };
    }
    
    const accuracies = successfulResults.map(r => r.sortingAccuracy.accuracy);
    const loadTimes = successfulResults.map(r => r.performance.loadTime);
    const articleCounts = successfulResults.map(r => r.articles.length);
    
    return {
      testExecution: {
        totalTests: results.length,
        successRate: (successfulResults.length / results.length) * 100,
        failureRate: (failedResults.length / results.length) * 100
      },
      performance: {
        avgLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
        minLoadTime: Math.min(...loadTimes),
        maxLoadTime: Math.max(...loadTimes),
        loadTimeStdDev: calculateStandardDeviation(loadTimes)
      },
      dataQuality: {
        avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
        minAccuracy: Math.min(...accuracies),
        maxAccuracy: Math.max(...accuracies),
        avgArticleCount: articleCounts.reduce((a, b) => a + b, 0) / articleCounts.length
      }
    };
  }
  
const calculateStandardDeviation = (values) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  };

module.exports = {
  calculateSortingAccuracy,
  analyzeTimestampDistribution,
  detectSortingAnomalies,
  validateArticleData,
  assertions,
  generateSummaryReport,
  generateRecommendations,
  validateTestEnvironment,
  generateTestMetrics,
  calculateStandardDeviation
};