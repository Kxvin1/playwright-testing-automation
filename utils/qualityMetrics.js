// Quality Metrics Tracking and Analysis Module
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const chalk = require('chalk');

// Quality Metrics Configuration
const METRICS_CONFIG = {
  historyFile: "./reports/quality-metrics-history.json",
  retentionDays: 30,
  thresholds: {
    sortingAccuracy: 80,
    dataCompleteness: 90,
    performanceScore: 75,
    securityScore: 95,
    overallQuality: 85
  }
};

class QualityMetricsTracker {
  constructor() {
    this.metricsHistory = [];
    this.currentMetrics = null;
    this.trends = null;
  }

  // Initialize metrics tracking
  async initialize() {
    try {
      await this.loadMetricsHistory();
      console.log(chalk.gray('Quality metrics tracker initialized'));
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not load metrics history, starting fresh'));
      this.metricsHistory = [];
    }
  }

  // Load historical metrics data
  async loadMetricsHistory() {
    const historyPath = path.resolve(METRICS_CONFIG.historyFile);
    if (await fs.pathExists(historyPath)) {
      this.metricsHistory = await fs.readJson(historyPath);
      
      // Clean old data based on retention policy
      const cutoffDate = moment().subtract(METRICS_CONFIG.retentionDays, 'days');
      this.metricsHistory = this.metricsHistory.filter(entry => 
        moment(entry.timestamp).isAfter(cutoffDate)
      );
    }
  }

  // Save metrics history to file
  async saveMetricsHistory() {
    const historyPath = path.resolve(METRICS_CONFIG.historyFile);
    await fs.ensureDir(path.dirname(historyPath));
    await fs.writeJson(historyPath, this.metricsHistory, { spaces: 2 });
  }

  // Calculate quality metrics from test results
  calculateQualityMetrics(testResults) {
    const metrics = {
      timestamp: new Date().toISOString(),
      testRun: {
        id: `run_${Date.now()}`,
        browser: testResults.browser,
        viewport: testResults.viewport,
        executionTime: testResults.executionTime
      },
      functional: this.calculateFunctionalMetrics(testResults),
      performance: this.calculatePerformanceMetrics(testResults),
      security: this.calculateSecurityMetrics(testResults),
      dataQuality: this.calculateDataQualityMetrics(testResults),
      apiQuality: this.calculateApiQualityMetrics(testResults),
      overall: null // Will be calculated after all individual metrics
    };

    // Calculate overall quality score
    metrics.overall = this.calculateOverallQualityScore(metrics);
    
    this.currentMetrics = metrics;
    return metrics;
  }

  // Calculate functional quality metrics
  calculateFunctionalMetrics(testResults) {
    const { sortingAccuracy, anomalies, articles } = testResults;
    
    return {
      sortingAccuracy: {
        value: sortingAccuracy.accuracy,
        threshold: METRICS_CONFIG.thresholds.sortingAccuracy,
        status: sortingAccuracy.accuracy >= METRICS_CONFIG.thresholds.sortingAccuracy ? 'PASS' : 'FAIL',
        trend: this.calculateTrend('sortingAccuracy', sortingAccuracy.accuracy)
      },
      dataExtraction: {
        value: articles.length,
        expectedValue: 100,
        completeness: articles.length >= 90 ? 100 : (articles.length / 100) * 100,
        status: articles.length >= 90 ? 'PASS' : 'WARN'
      },
      errorRate: {
        value: anomalies.summary.criticalIssues,
        threshold: 5,
        status: anomalies.summary.criticalIssues <= 5 ? 'PASS' : 'FAIL',
        trend: this.calculateTrend('errorRate', anomalies.summary.criticalIssues)
      },
      consistencyScore: {
        value: 100 - (anomalies.patterns.consecutiveErrors * 10),
        threshold: 80,
        status: (100 - (anomalies.patterns.consecutiveErrors * 10)) >= 80 ? 'PASS' : 'FAIL'
      }
    };
  }

  // Calculate performance quality metrics
  calculatePerformanceMetrics(testResults) {
    const { performance } = testResults;
    
    const loadTimeScore = Math.max(0, 100 - (performance.loadTime / 50)); // 5000ms = 0 score
    const performanceScore = Math.min(100, loadTimeScore);
    
    return {
      loadTime: {
        value: performance.loadTime,
        threshold: 5000,
        status: performance.loadTime <= 5000 ? 'PASS' : 'FAIL',
        trend: this.calculateTrend('loadTime', performance.loadTime)
      },
      performanceScore: {
        value: performanceScore,
        threshold: METRICS_CONFIG.thresholds.performanceScore,
        status: performanceScore >= METRICS_CONFIG.thresholds.performanceScore ? 'PASS' : 'WARN',
        trend: this.calculateTrend('performanceScore', performanceScore)
      },
      resourceUsage: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        status: process.memoryUsage().heapUsed / 1024 / 1024 < 500 ? 'PASS' : 'WARN'
      }
    };
  }

  // Calculate security quality metrics
  calculateSecurityMetrics(testResults) {
    const securityResults = testResults.security;
    const securityScore = this.calculateSecurityScore(securityResults);
    
    // Safe extraction of vulnerabilities with null checks
    const vulnerabilities = securityResults?.vulnerabilities || [];
    const overallSecurityScore = securityResults?.overallSecurityScore?.overall || securityScore;
    
    return {
      securityScore: {
        value: securityScore,
        threshold: METRICS_CONFIG.thresholds.securityScore,
        status: securityScore >= METRICS_CONFIG.thresholds.securityScore ? 'PASS' : 'FAIL',
        trend: this.calculateTrend('securityScore', securityScore)
      },
      vulnerabilities: {
        count: vulnerabilities.length,
        severity: this.categorizeSeverity(vulnerabilities),
        status: vulnerabilities.filter(v => v.severity === 'high').length === 0 ? 'PASS' : 'FAIL'
      },
      complianceScore: {
        value: overallSecurityScore,
        threshold: 95,
        status: overallSecurityScore >= 95 ? 'PASS' : 'FAIL'
      }
    };
  }

  // Calculate data quality metrics
  calculateDataQualityMetrics(testResults) {
    const { dataValidation } = testResults;
    
    return {
      completeness: {
        value: dataValidation.completenessRatio,
        threshold: METRICS_CONFIG.thresholds.dataCompleteness,
        status: dataValidation.completenessRatio >= METRICS_CONFIG.thresholds.dataCompleteness ? 'PASS' : 'FAIL',
        trend: this.calculateTrend('dataCompleteness', dataValidation.completenessRatio)
      },
      accuracy: {
        value: 100 - (dataValidation.issues.length / dataValidation.statistics.total * 100),
        threshold: 95,
        status: (100 - (dataValidation.issues.length / dataValidation.statistics.total * 100)) >= 95 ? 'PASS' : 'WARN'
      },
      consistency: {
        value: dataValidation.statistics.complete / dataValidation.statistics.total * 100,
        threshold: 90,
        status: (dataValidation.statistics.complete / dataValidation.statistics.total * 100) >= 90 ? 'PASS' : 'WARN'
      }
    };
  }

  // Calculate API quality metrics
  calculateApiQualityMetrics(testResults) {
    // Placeholder for API metrics - will be populated when API tests are implemented
    const apiResults = testResults.api;
    
    if (!apiResults) {
      return {
        availability: { value: 100, status: 'PASS' },
        performance: { value: 100, status: 'PASS' },
        dataIntegrity: { value: 100, status: 'PASS' },
        contractCompliance: { value: 100, status: 'PASS' }
      };
    }

    return {
      availability: {
        value: apiResults.availability ? apiResults.availability.overallStatus === 'PASS' ? 100 : 0 : 100,
        threshold: 99,
        status: apiResults.availability ? apiResults.availability.overallStatus : 'PASS'
      },
      performance: {
        value: apiResults.performance ? Math.max(0, 100 - apiResults.performance.averageResponseTime / 20) : 100,
        threshold: 80,
        status: apiResults.performance ? 
          (apiResults.performance.averageResponseTime <= 2000 ? 'PASS' : 'WARN') : 'PASS'
      },
      dataIntegrity: {
        value: apiResults.dataIntegrity ? apiResults.dataIntegrity.dataQualityScore : 100,
        threshold: 95,
        status: apiResults.dataIntegrity ? 
          (apiResults.dataIntegrity.dataQualityScore >= 95 ? 'PASS' : 'FAIL') : 'PASS'
      },
      contractCompliance: {
        value: apiResults.contractCompliance ? apiResults.contractCompliance.complianceScore : 100,
        threshold: 95,
        status: apiResults.contractCompliance ? 
          (apiResults.contractCompliance.complianceScore >= 95 ? 'PASS' : 'FAIL') : 'PASS'
      }
    };
  }

  // Calculate overall quality score
  calculateOverallQualityScore(metrics) {
    const weights = {
      functional: 0.35,
      performance: 0.20,
      security: 0.15,
      dataQuality: 0.20,
      apiQuality: 0.10
    };

    const functionalScore = (
      metrics.functional.sortingAccuracy.value * 0.4 +
      metrics.functional.dataExtraction.completeness * 0.3 +
      metrics.functional.consistencyScore.value * 0.3
    );

    const performanceScore = metrics.performance.performanceScore.value;
    const securityScore = metrics.security.securityScore.value;
    const dataQualityScore = (
      metrics.dataQuality.completeness.value * 0.5 +
      metrics.dataQuality.accuracy.value * 0.3 +
      metrics.dataQuality.consistency.value * 0.2
    );

    const apiQualityScore = (
      metrics.apiQuality.availability.value * 0.3 +
      metrics.apiQuality.performance.value * 0.3 +
      metrics.apiQuality.dataIntegrity.value * 0.2 +
      metrics.apiQuality.contractCompliance.value * 0.2
    );

    const overallScore = (
      functionalScore * weights.functional +
      performanceScore * weights.performance +
      securityScore * weights.security +
      dataQualityScore * weights.dataQuality +
      apiQualityScore * weights.apiQuality
    );

    return {
      value: Math.round(overallScore),
      threshold: METRICS_CONFIG.thresholds.overallQuality,
      status: overallScore >= METRICS_CONFIG.thresholds.overallQuality ? 'PASS' : 'FAIL',
      grade: this.calculateQualityGrade(overallScore),
      components: {
        functional: Math.round(functionalScore),
        performance: Math.round(performanceScore),
        security: Math.round(securityScore),
        dataQuality: Math.round(dataQualityScore),
        apiQuality: Math.round(apiQualityScore)
      }
    };
  }

  // Calculate quality grade
  calculateQualityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Calculate trend for a specific metric
  calculateTrend(metricName, currentValue) {
    const recentHistory = this.metricsHistory.slice(-5); // Last 5 runs
    if (recentHistory.length < 2) return 'stable';

    const values = recentHistory.map(entry => this.extractMetricValue(entry, metricName));
    values.push(currentValue);

    const trend = this.calculateTrendDirection(values);
    return trend;
  }

  // Extract metric value from history entry
  extractMetricValue(entry, metricName) {
    // Navigate through the metrics structure to find the specific metric
    switch (metricName) {
      case 'sortingAccuracy':
        return entry.functional?.sortingAccuracy?.value || 0;
      case 'loadTime':
        return entry.performance?.loadTime?.value || 0;
      case 'performanceScore':
        return entry.performance?.performanceScore?.value || 0;
      case 'dataCompleteness':
        return entry.dataQuality?.completeness?.value || 0;
      case 'securityScore':
        return entry.security?.securityScore?.value || 0;
      case 'errorRate':
        return entry.functional?.errorRate?.value || 0;
      default:
        return 0;
    }
  }

  // Calculate trend direction from array of values
  calculateTrendDirection(values) {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-3); // Last 3 values
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = values[values.length - 4] || values[0];

    const changePercent = ((avg - previous) / previous) * 100;

    if (changePercent > 5) return 'improving';
    if (changePercent < -5) return 'declining';
    return 'stable';
  }

  // Categorize security vulnerabilities by severity
  categorizeSeverity(vulnerabilities) {
    if (!vulnerabilities || !Array.isArray(vulnerabilities)) {
      return { high: 0, medium: 0, low: 0 };
    }
    
    return vulnerabilities.reduce((acc, vuln) => {
      const severity = vuln?.severity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });
  }

  // Calculate security score from security test results
  calculateSecurityScore(securityResults) {
    if (!securityResults) {
      return 95; // Default score when no security data available
    }

    const vulnerabilities = securityResults.vulnerabilities || [];
    const severityWeights = { high: 20, medium: 5, low: 1 };
    
    const totalDeductions = vulnerabilities.reduce((total, vuln) => {
      return total + (severityWeights[vuln.severity] || 0);
    }, 0);

    return Math.max(0, 100 - totalDeductions);
  }

  // Record quality metrics
  async recordMetrics(testResults) {
    const metrics = this.calculateQualityMetrics(testResults);
    
    this.metricsHistory.push(metrics);
    await this.saveMetricsHistory();
    
    console.log(chalk.cyan(`📊 Quality Score: ${metrics.overall.value} (${metrics.overall.grade})`));
    
    return metrics;
  }

  // Generate quality trends analysis
  generateTrendsAnalysis() {
    if (this.metricsHistory.length < 2) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 runs
    
    return {
      overallTrend: this.analyzeTrend(recentMetrics, 'overall'),
      functionalTrend: this.analyzeTrend(recentMetrics, 'functional'),
      performanceTrend: this.analyzeTrend(recentMetrics, 'performance'),
      securityTrend: this.analyzeTrend(recentMetrics, 'security'),
      dataQualityTrend: this.analyzeTrend(recentMetrics, 'dataQuality'),
      recommendations: this.generateRecommendations(recentMetrics)
    };
  }

  // Analyze trend for a specific category
  analyzeTrend(metrics, category) {
    const values = metrics.map(m => m[category]?.value || 0);
    const trend = this.calculateTrendDirection(values);
    
    return {
      current: values[values.length - 1],
      previous: values[values.length - 2],
      trend,
      change: values[values.length - 1] - values[values.length - 2],
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  // Generate recommendations based on trends
  generateRecommendations(metrics) {
    const recommendations = [];
    const latest = metrics[metrics.length - 1];

    // Check overall quality
    if (latest.overall.value < METRICS_CONFIG.thresholds.overallQuality) {
      recommendations.push({
        type: 'critical',
        category: 'overall',
        message: `Overall quality score (${latest.overall.value}) is below threshold (${METRICS_CONFIG.thresholds.overallQuality})`,
        priority: 'high'
      });
    }

    // Check functional quality
    if (latest.functional.sortingAccuracy.value < METRICS_CONFIG.thresholds.sortingAccuracy) {
      recommendations.push({
        type: 'functional',
        category: 'sorting',
        message: `Sorting accuracy (${latest.functional.sortingAccuracy.value}%) needs improvement`,
        priority: 'high'
      });
    }

    // Check performance
    if (latest.performance.performanceScore.value < METRICS_CONFIG.thresholds.performanceScore) {
      recommendations.push({
        type: 'performance',
        category: 'speed',
        message: `Performance score (${latest.performance.performanceScore.value}) is below threshold`,
        priority: 'medium'
      });
    }

    // Check security
    if (latest.security.securityScore.value < METRICS_CONFIG.thresholds.securityScore) {
      recommendations.push({
        type: 'security',
        category: 'vulnerabilities',
        message: `Security score (${latest.security.securityScore.value}) needs attention`,
        priority: 'high'
      });
    }

    // Check data quality
    if (latest.dataQuality.completeness.value < METRICS_CONFIG.thresholds.dataCompleteness) {
      recommendations.push({
        type: 'dataQuality',
        category: 'completeness',
        message: `Data completeness (${latest.dataQuality.completeness.value}%) is below threshold`,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Get quality summary for reporting
  getQualitySummary() {
    if (!this.currentMetrics) return null;

    return {
      overallScore: this.currentMetrics.overall.value,
      grade: this.currentMetrics.overall.grade,
      status: this.currentMetrics.overall.status,
      components: this.currentMetrics.overall.components,
      trends: this.generateTrendsAnalysis(),
      timestamp: this.currentMetrics.timestamp
    };
  }
}

module.exports = QualityMetricsTracker;