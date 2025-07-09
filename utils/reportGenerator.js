const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const chalk = require("chalk");
const QualityMetricsTracker = require("./qualityMetrics");

// HTML report generation
const generateHTMLReport = async (
  testResults,
  outputPath = "./reports/test-report.html"
) => {
  const {
    sortingAccuracy,
    timestampAnalysis,
    anomalies,
    dataValidation,
    performance,
    browser,
    viewport,
    summary,
    qualityMetrics,
  } = testResults;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker News Sorting Validation Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #cccac2;
            background: #1f2430;
            font-size: 16px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #1f2430 0%, #2a3441 100%);
            color: #cccac2;
            padding: 40px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            border: 2px solid #fecc66;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
            margin: 5px;
        }
        
        .status-pass { background: #fecc66; color: #1f2430; }
        .status-fail { background: #ff6b6b; color: #cccac2; }
        .status-warn { background: #ffa759; color: #1f2430; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 25px;
            margin: 40px 0;
        }
        
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        
        .card {
            background: linear-gradient(135deg, #242b38 0%, #2a3441 100%);
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            border-left: 4px solid #fecc66;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        
        .card:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(254, 204, 102, 0.2), transparent);
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0,0,0,0.5);
        }
        
        .card h3 {
            color: #fecc66;
            margin-bottom: 15px;
            font-size: 1.6em;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 12px 16px;
            background: rgba(31, 36, 48, 0.4);
            border-radius: 8px;
            border-left: 2px solid rgba(254, 204, 102, 0.3);
        }
        
        .metric:last-child {
            margin-bottom: 0;
        }
        
        .metric-value {
            font-weight: bold;
            color: #fecc66;
        }
        
        .chart-container {
            margin: 20px 0;
            padding: 15px;
            background: #1f2430;
            border-radius: 8px;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #505867;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(45deg, #fecc66, #ffd89b);
            transition: width 0.3s ease;
        }
        
        .progress-fill.warning {
            background: linear-gradient(45deg, #ffa759, #ff8a65);
        }
        
        .progress-fill.danger {
            background: linear-gradient(45deg, #ff6b6b, #ff5252);
        }
        
        .anomaly-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid rgba(254, 204, 102, 0.2);
            border-radius: 8px;
            padding: 15px;
            background: rgba(31, 36, 48, 0.3);
        }
        
        .anomaly-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 3px solid #ff6b6b;
            background: #1f2430;
        }
        
        .anomaly-critical { border-left-color: #ff6b6b; }
        .anomaly-warning { border-left-color: #ffa759; }
        .anomaly-info { border-left-color: #4fd1c7; }
        
        .timestamp-distribution {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        
        .time-range {
            text-align: center;
            padding: 15px;
            background: #1f2430;
            border-radius: 8px;
            border: 2px solid #505867;
        }
        
        .time-range.active {
            border-color: #fecc66;
            background: #242b38;
        }
        
        .time-count {
            font-size: 2em;
            font-weight: bold;
            color: #fecc66;
        }
        
        .recommendations {
            background: linear-gradient(135deg, #242b38 0%, #2a3441 100%);
            border-radius: 12px;
            padding: 35px;
            margin: 40px 0;
            border-left: 4px solid #ffa759;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            position: relative;
        }
        
        .recommendations:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 167, 89, 0.3), transparent);
        }
        
        .recommendation {
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 8px;
            border-left: 3px solid #fecc66;
            background: rgba(31, 36, 48, 0.4);
        }
        
        .recommendation.critical { 
            background: rgba(255, 107, 107, 0.15); 
            border-left-color: #ff6b6b; 
        }
        
        .recommendation.warning { 
            background: rgba(255, 167, 89, 0.15); 
            border-left-color: #ffa759; 
        }
        
        .recommendation.success { 
            background: rgba(254, 204, 102, 0.15); 
            border-left-color: #fecc66; 
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #707a8c;
            border-top: 1px solid rgba(254, 204, 102, 0.3);
        }
        
        .details-section {
            background: linear-gradient(135deg, #242b38 0%, #2a3441 100%);
            border-radius: 12px;
            padding: 35px;
            margin: 40px 0;
            border-left: 4px solid #fecc66;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            position: relative;
        }
        
        .details-section:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(254, 204, 102, 0.3), transparent);
        }
        
        .collapsible {
            cursor: pointer;
            padding: 10px;
            background: #242b38;
            border: none;
            width: 100%;
            text-align: left;
            border-radius: 5px;
            margin-bottom: 10px;
            font-weight: bold;
            color: #cccac2;
        }
        
        .collapsible:hover {
            background: #2a3441;
        }
        
        .collapsible-content {
            display: none;
            padding: 15px;
            border: 1px solid #505867;
            border-radius: 5px;
            background: #242b38;
        }
        
        .article-preview {
            font-size: 0.9em;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #505867;
            border-radius: 5px;
            padding: 10px;
            background: #1f2430;
        }
        
        .article-item {
            padding: 5px 0;
            border-bottom: 1px solid #505867;
        }
        
        .article-item:last-child {
            border-bottom: none;
        }
        
        .articles-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 1.1em;
        }
        
        .articles-table th,
        .articles-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid rgba(254, 204, 102, 0.15);
        }
        
        .articles-table th {
            background-color: #1f2430;
            font-weight: 600;
            color: #cccac2;
        }
        
        .articles-table tr:hover {
            background-color: #242b38;
        }
        
        .articles-table .position {
            width: 60px;
            text-align: center;
            font-weight: 600;
            color: #fecc66;
        }
        
        .articles-table .title {
            max-width: 400px;
        }
        
        .articles-table .title a {
            color: #fecc66;
            text-decoration: none;
        }
        
        .articles-table .title a:hover {
            color: #ffd89b;
            text-decoration: underline;
        }
        
        .articles-table .author {
            color: #707a8c;
            font-size: 0.95em;
        }
        
        .articles-table .score {
            text-align: center;
            width: 60px;
            font-weight: 600;
        }
        
        .articles-table .timestamp {
            color: #707a8c;
            font-size: 0.95em;
            width: 140px;
        }
        
        .articles-section {
            margin: 40px 0;
        }
        
        .articles-count {
            color: #fecc66;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        @media (max-width: 768px) {
            .articles-table {
                font-size: 1em;
            }
            
            .articles-table .title {
                max-width: 250px;
            }
            
            .container {
                max-width: 100%;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Playwright Testing Report</h1>
            <div class="subtitle">Cross-Browser Testing & Quality Assurance Report</div>
            <div style="margin-top: 20px;">
                <span class="status-badge ${
                  summary.testSummary.testStatus === "PASS"
                    ? "status-pass"
                    : "status-fail"
                }">
                    ${summary.testSummary.testStatus || "UNKNOWN"}
                </span>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    Generated: ${moment().format("YYYY-MM-DD h:mm:ss A")} | 
                    ${
                      testResults.aggregatedData
                        ? `Browsers: ${testResults.aggregatedData.testedBrowsers.join(
                            ", "
                          )} | 
                       Viewports: ${
                         testResults.aggregatedData.testedViewports.length
                       } | 
                       Tests: ${testResults.aggregatedData.totalTestRuns}`
                        : `Browser: ${browser} | Articles: ${
                            summary.testSummary.totalArticles || 0
                          }`
                    }
                </div>
            </div>
        </div>

        ${
          qualityMetrics
            ? `
        <div class="card" style="grid-column: 1 / -1; margin-bottom: 30px;">
            <h3>🎯 Quality Score Dashboard</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 3em; font-weight: bold; color: ${
                      qualityMetrics.overall.value >= 90
                        ? "#fecc66"
                        : qualityMetrics.overall.value >= 80
                        ? "#ffa759"
                        : "#ff6b6b"
                    };">
                        ${qualityMetrics.overall.value}
                    </div>
                    <div style="font-size: 1.2em; color: #cccac2;">Overall Quality</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: ${
                      qualityMetrics.overall.value >= 90
                        ? "#fecc66"
                        : qualityMetrics.overall.value >= 80
                        ? "#ffa759"
                        : "#ff6b6b"
                    };">
                        Grade ${qualityMetrics.overall.grade}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; flex-grow: 1; max-width: 600px;">
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #fecc66;">${
                          qualityMetrics.overall.components.functional
                        }</div>
                        <div style="font-size: 1em; color: #cccac2;">Functional</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #fecc66;">${
                          qualityMetrics.overall.components.performance
                        }</div>
                        <div style="font-size: 1em; color: #cccac2;">Performance</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #fecc66;">${
                          qualityMetrics.overall.components.security
                        }</div>
                        <div style="font-size: 1em; color: #cccac2;">Security</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #fecc66;">${
                          qualityMetrics.overall.components.dataQuality
                        }</div>
                        <div style="font-size: 1em; color: #cccac2;">Data Quality</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #fecc66;">${
                          qualityMetrics.overall.components.apiQuality
                        }</div>
                        <div style="font-size: 1em; color: #cccac2;">API Quality</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #1f2430; border-radius: 8px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: ${
                          qualityMetrics.overall.status === "PASS"
                            ? "#fecc66"
                            : "#ff6b6b"
                        };">
                            ${qualityMetrics.overall.status}
                        </div>
                        <div style="font-size: 1em; color: #cccac2;">Status</div>
                    </div>
                </div>
            </div>
        </div>
        `
            : ""
        }

        ${
          testResults.aggregatedData?.browserPerformance &&
          Object.keys(testResults.aggregatedData.browserPerformance).length > 1
            ? `
        <div class="card" style="grid-column: 1 / -1; margin-bottom: 30px;">
            <h3>🌐 Cross-Browser Test Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                ${Object.entries(testResults.aggregatedData.browserPerformance)
                  .map(
                    ([browser, metrics]) => `
                    <div style="text-align: center; padding: 20px; background: #1f2430; border-radius: 8px; border: 2px solid ${
                      browser === "chromium"
                        ? "#4285f4"
                        : browser === "firefox"
                        ? "#ff9500"
                        : "#707a8c"
                    };">
                        <h4 style="color: ${
                          browser === "chromium"
                            ? "#4285f4"
                            : browser === "firefox"
                            ? "#ff9500"
                            : "#707a8c"
                        }; text-transform: uppercase; margin-bottom: 15px;">${browser}</h4>
                        <div style="font-size: 2em; font-weight: bold; color: ${
                          browser === "chromium"
                            ? "#4285f4"
                            : browser === "firefox"
                            ? "#ff9500"
                            : "#707a8c"
                        };">
                            ${metrics.avgLoadTime}ms
                        </div>
                        <div style="color: #cccac2; margin-bottom: 10px;">Average Load Time</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: ${
                          browser === "chromium"
                            ? "#4285f4"
                            : browser === "firefox"
                            ? "#ff9500"
                            : "#707a8c"
                        };">
                            ${metrics.avgAccuracy}%
                        </div>
                        <div style="color: #cccac2;">Sorting Accuracy</div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <div class="grid">
            <div class="card">
                <h3>📊 Sorting Analysis</h3>
                <div class="metric">
                    <span>Accuracy</span>
                    <span class="metric-value">${
                      sortingAccuracy.accuracy
                    }%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${
                      sortingAccuracy.accuracy >= 95
                        ? ""
                        : sortingAccuracy.accuracy >= 80
                        ? "warning"
                        : "danger"
                    }" 
                         style="width: ${sortingAccuracy.accuracy}%"></div>
                </div>
                <div class="metric">
                    <span>Correct Pairs</span>
                    <span class="metric-value">${
                      sortingAccuracy.correctPairs
                    }</span>
                </div>
                <div class="metric">
                    <span>Incorrect Pairs</span>
                    <span class="metric-value">${
                      sortingAccuracy.incorrectPairs
                    }</span>
                </div>
                <div class="metric">
                    <span>Error Rate</span>
                    <span class="metric-value">${
                      sortingAccuracy.errorRate
                    }%</span>
                </div>
            </div>

            <div class="card">
                <h3>🔍 Data Quality</h3>
                <div class="metric">
                    <span>Completeness</span>
                    <span class="metric-value">${dataValidation.completenessRatio.toFixed(
                      1
                    )}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${
                      dataValidation.completenessRatio >= 90 ? "" : "warning"
                    }" 
                         style="width: ${
                           dataValidation.completenessRatio
                         }%"></div>
                </div>
                <div class="metric">
                    <span>Missing Titles</span>
                    <span class="metric-value">${
                      dataValidation.statistics.missingTitle
                    }</span>
                </div>
                <div class="metric">
                    <span>Missing Timestamps</span>
                    <span class="metric-value">${
                      dataValidation.statistics.missingTimestamp
                    }</span>
                </div>
                <div class="metric">
                    <span>Total Issues</span>
                    <span class="metric-value">${
                      dataValidation.issues.length
                    }</span>
                </div>
            </div>

            <div class="card">
                <h3>⚡ Performance</h3>
                <div class="metric">
                    <span>Page Load Time</span>
                    <span class="metric-value">${performance.loadTime}ms</span>
                </div>
                <div class="metric">
                    <span>DOM Content Loaded</span>
                    <span class="metric-value">${
                      performance.domContentLoaded
                        ? Math.round(performance.domContentLoaded) + "ms"
                        : "N/A"
                    }</span>
                </div>
                <div class="metric">
                    <span>Total Size</span>
                    <span class="metric-value">${
                      performance.totalSize
                        ? Math.round(performance.totalSize / 1024) + "KB"
                        : "N/A"
                    }</span>
                </div>
                <div class="metric">
                    <span>Viewport</span>
                    <span class="metric-value">${viewport || "Desktop"}</span>
                </div>
            </div>

            <div class="card">
                <h3>⚠️ Anomalies</h3>
                <div class="metric">
                    <span>Total Found</span>
                    <span class="metric-value">${
                      anomalies.summary.totalAnomalies
                    }</span>
                </div>
                <div class="metric">
                    <span>Critical Issues</span>
                    <span class="metric-value">${
                      anomalies.summary.criticalIssues
                    }</span>
                </div>
                <div class="metric">
                    <span>Consecutive Errors</span>
                    <span class="metric-value">${
                      anomalies.patterns.consecutiveErrors
                    }</span>
                </div>
                <div class="metric">
                    <span>Large Time Jumps</span>
                    <span class="metric-value">${
                      anomalies.patterns.largeTimeJumps
                    }</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📅 Timestamp Distribution</h3>
            <div class="timestamp-distribution">
                <div class="time-range ${
                  timestampAnalysis.timeRanges.last_hour > 0 ? "active" : ""
                }">
                    <div class="time-count">${
                      timestampAnalysis.timeRanges.last_hour
                    }</div>
                    <div>Last Hour</div>
                </div>
                <div class="time-range ${
                  timestampAnalysis.timeRanges.last_6_hours > 0 ? "active" : ""
                }">
                    <div class="time-count">${
                      timestampAnalysis.timeRanges.last_6_hours
                    }</div>
                    <div>Last 6 Hours</div>
                </div>
                <div class="time-range ${
                  timestampAnalysis.timeRanges.last_24_hours > 0 ? "active" : ""
                }">
                    <div class="time-count">${
                      timestampAnalysis.timeRanges.last_24_hours
                    }</div>
                    <div>Last 24 Hours</div>
                </div>
                <div class="time-range ${
                  timestampAnalysis.timeRanges.last_week > 0 ? "active" : ""
                }">
                    <div class="time-count">${
                      timestampAnalysis.timeRanges.last_week
                    }</div>
                    <div>Last Week</div>
                </div>
                <div class="time-range ${
                  timestampAnalysis.timeRanges.older > 0 ? "active" : ""
                }">
                    <div class="time-count">${
                      timestampAnalysis.timeRanges.older
                    }</div>
                    <div>Older</div>
                </div>
            </div>
            <div class="metric">
                <span>Average Time Between Articles</span>
                <span class="metric-value">${
                  timestampAnalysis.statistics?.averageTimeDifferenceMinutes?.toFixed(
                    1
                  ) || "N/A"
                } minutes</span>
            </div>
        </div>

        <div class="articles-section">
            <div class="card">
                <h3>📰 Sorted Articles (by Timestamp)</h3>
                <div class="articles-count">
                    Showing ${
                      testResults.articles ? testResults.articles.length : 0
                    } articles sorted by newest first
                </div>
                ${
                  testResults.articles && testResults.articles.length > 0
                    ? `
                    <table class="articles-table">
                        <thead>
                            <tr>
                                <th class="position">#</th>
                                <th class="title">Title</th>
                                <th class="author">Author</th>
                                <th class="score">Score</th>
                                <th class="timestamp">Posted</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testResults.articles
                              .slice(0, 50)
                              .map(
                                (article, index) => `
                                <tr>
                                    <td class="position">${index + 1}</td>
                                    <td class="title">
                                        <a href="${
                                          article.url || "#"
                                        }" target="_blank" rel="noopener noreferrer">
                                            ${article.title || "Untitled"}
                                        </a>
                                    </td>
                                    <td class="author">${
                                      article.author || "Unknown"
                                    }</td>
                                    <td class="score">${article.score || 0}</td>
                                    <td class="timestamp">${
                                      article.timestampText || "N/A"
                                    }</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                    ${
                      testResults.articles.length > 50
                        ? `
                        <div style="margin-top: 15px; color: #707a8c; font-size: 0.9em; text-align: center;">
                            Showing first 50 of ${testResults.articles.length} articles
                        </div>
                    `
                        : ""
                    }
                `
                    : `
                    <div style="color: #707a8c; text-align: center; padding: 20px;">
                        No articles data available
                    </div>
                `
                }
            </div>
        </div>

        ${
          testResults.aggregatedData?.browserPerformance
            ? `
        <div class="details-section">
            <h3>🌐 Cross-Browser Performance Analysis</h3>
            <div class="grid" style="margin-bottom: 20px;">
                ${Object.entries(testResults.aggregatedData.browserPerformance)
                  .map(
                    ([browser, metrics]) => `
                    <div class="card" style="border-left-color: ${
                      browser === "chromium"
                        ? "#4285f4"
                        : browser === "firefox"
                        ? "#ff9500"
                        : "#707a8c"
                    };">
                        <h4 style="text-transform: uppercase; color: ${
                          browser === "chromium"
                            ? "#4285f4"
                            : browser === "firefox"
                            ? "#ff9500"
                            : "#707a8c"
                        };">${browser}</h4>
                        <div class="metric">
                            <span>Avg Load Time</span>
                            <span class="metric-value">${
                              metrics.avgLoadTime
                            }ms</span>
                        </div>
                        <div class="metric">
                            <span>Load Range</span>
                            <span class="metric-value">${metrics.minLoadTime}-${
                      metrics.maxLoadTime
                    }ms</span>
                        </div>
                        <div class="metric">
                            <span>Avg Accuracy</span>
                            <span class="metric-value">${
                              metrics.avgAccuracy
                            }%</span>
                        </div>
                        <div class="metric">
                            <span>Test Count</span>
                            <span class="metric-value">${metrics.count}</span>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            
            <div class="card">
                <h4>📊 Cross-Browser Compatibility Summary</h4>
                <div class="metric">
                    <span>Browsers Tested</span>
                    <span class="metric-value">${
                      testResults.aggregatedData.crossBrowserCompatibility
                        .totalBrowsers
                    }</span>
                </div>
                <div class="metric">
                    <span>Viewports Tested</span>
                    <span class="metric-value">${
                      testResults.aggregatedData.crossBrowserCompatibility
                        .totalViewports
                    }</span>
                </div>
                <div class="metric">
                    <span>Success Rate</span>
                    <span class="metric-value">${
                      testResults.aggregatedData.crossBrowserCompatibility
                        .successRate
                    }%</span>
                </div>
                <div class="metric">
                    <span>Total Test Scenarios</span>
                    <span class="metric-value">${
                      testResults.aggregatedData.totalTestRuns
                    }</span>
                </div>
            </div>
        </div>
        `
            : ""
        }
        

        ${
          anomalies.anomalies.length > 0
            ? `
        <div class="details-section">
            <h3>🔎 Detected Anomalies</h3>
            <div class="anomaly-list">
                ${anomalies.anomalies
                  .map(
                    (anomaly) => `
                    <div class="anomaly-item anomaly-${
                      anomaly.type === "sorting_error" ? "critical" : "warning"
                    }">
                        <strong>${anomaly.type
                          .replace("_", " ")
                          .toUpperCase()}</strong> at position ${
                      anomaly.position
                    }<br>
                        ${anomaly.description}
                        ${
                          anomaly.timeDifference
                            ? `<br><small>Time difference: ${anomaly.timeDifference} minutes</small>`
                            : ""
                        }
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            ${summary.recommendations
              .map(
                (rec) => `
                <div class="recommendation ${rec.type}">
                    <strong>${rec.priority.toUpperCase()}:</strong> ${
                  rec.message
                }
                </div>
            `
              )
              .join("")}
        </div>

        <div class="details-section">
            <h3>📋 Test Configuration</h3>
            <button class="collapsible" onclick="toggleCollapsible(this)">Show Technical Details</button>
            <div class="collapsible-content">
                <div class="metric">
                    <span>Test Execution Time</span>
                    <span class="metric-value">${moment().format(
                      "YYYY-MM-DD h:mm:ss A"
                    )}</span>
                </div>
                <div class="metric">
                    <span>Target URL</span>
                    <span class="metric-value">https://news.ycombinator.com/newest</span>
                </div>
                <div class="metric">
                    <span>Expected Articles</span>
                    <span class="metric-value">100</span>
                </div>
                <div class="metric">
                    <span>Browser Engine</span>
                    <span class="metric-value">${
                      testResults.aggregatedData?.testedBrowsers?.join(", ") ||
                      browser
                    }</span>
                </div>
                <div class="metric">
                    <span>Test Framework</span>
                    <span class="metric-value">Playwright + Custom Validation</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by Playwright Testing Suite</p>
            <p>Comprehensive validation for production-ready quality assurance</p>
        </div>
    </div>

    <script>
        function toggleCollapsible(element) {
            const content = element.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
                element.textContent = element.textContent.replace("Hide", "Show");
            } else {
                content.style.display = "block";
                element.textContent = element.textContent.replace("Show", "Hide");
            }
        }
        
        // Add smooth animations on page load
        document.addEventListener('DOMContentLoaded', function() {
            const progressBars = document.querySelectorAll('.progress-fill');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 500);
            });
        });
    </script>
</body>
</html>
    `;

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, html);

  return outputPath;
};

// JSON report generation
const generateJSONReport = async (
  testResults,
  outputPath = "./reports/test-results.json"
) => {
  const jsonReport = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      testType: "hacker_news_sorting_validation",
    },
    ...testResults,
  };

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, jsonReport, { spaces: 2 });

  return outputPath;
};

// CSV report generation
const generateCSVReport = async (
  articles,
  outputPath = "./reports/articles-data.csv"
) => {
  const csvHeader = "Position,ID,Title,Author,Score,Timestamp,TimestampText\n";
  const csvRows = articles
    .map((article, index) => {
      const safeTitle = (article.title || "").replace(/"/g, '""');
      const safeAuthor = (article.author || "").replace(/"/g, '""');
      return `${index + 1},"${
        article.id || ""
      }","${safeTitle}","${safeAuthor}",${article.score || 0},"${
        article.timestamp || ""
      }","${article.timestampText || ""}"`;
    })
    .join("\n");

  const csvContent = csvHeader + csvRows;

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, csvContent);

  return outputPath;
};

// Display functions for console output
const displayTestSummary = (result) => {
  if (result.failed) {
    console.log(chalk.red(`    ❌ FAILED - ${result.error.message}`));
    return;
  }

  const { summary, sortingAccuracy, performance, dataValidation } = result;

  console.log(chalk.green(`    ✅ ${summary.testSummary.testStatus}`));
  console.log(
    chalk.gray(`       Articles: ${summary.testSummary.totalArticles}`)
  );
  console.log(chalk.gray(`       Accuracy: ${sortingAccuracy.accuracy}%`));
  console.log(chalk.gray(`       Load Time: ${performance.loadTime}ms`));
  console.log(
    chalk.gray(
      `       Data Quality: ${dataValidation.completenessRatio.toFixed(1)}%`
    )
  );

  if (summary.testSummary.criticalIssues > 0) {
    console.log(
      chalk.yellow(
        `       ⚠️  Critical Issues: ${summary.testSummary.criticalIssues}`
      )
    );
  }
};

// Generate all reports in parallel
const generateAllReports = async (testResults) => {
  console.log(chalk.cyan.bold("\n📊 Generating Reports..."));

  const aggregatedResults = aggregateResults(testResults);

  try {
    // Generate all reports in parallel for better performance
    const [htmlPath, jsonPath, csvPath] = await Promise.all([
      generateHTMLReport(aggregatedResults),
      generateJSONReport(aggregatedResults),
      aggregatedResults.articles.length > 0
        ? generateCSVReport(aggregatedResults.articles)
        : Promise.resolve(null),
    ]);

    console.log(chalk.green(`✅ HTML Report: ${htmlPath}`));
    console.log(chalk.green(`✅ JSON Report: ${jsonPath}`));
    if (csvPath) {
      console.log(chalk.green(`✅ CSV Data: ${csvPath}`));
    }
  } catch (reportError) {
    console.error(
      chalk.red("❌ Report generation failed:"),
      reportError.message
    );
  }
};

// Aggregate results from all test runs with cross-browser analysis
const aggregateResults = (testResults) => {
  const successfulResults = testResults.filter((r) => !r.failed);

  if (successfulResults.length === 0) {
    throw new Error("No successful test results to aggregate");
  }

  // Use the most recent Chromium result as primary (if available), otherwise the best performing result
  let primaryResult = successfulResults.find(
    (result) => result.browser === "chromium"
  );
  if (!primaryResult) {
    primaryResult = successfulResults.reduce((best, current) => {
      return current.sortingAccuracy.accuracy > best.sortingAccuracy.accuracy
        ? current
        : best;
    });
  }

  // Generate quality metrics for aggregated results
  const qualityTracker = new QualityMetricsTracker();
  const qualityMetrics = qualityTracker.calculateQualityMetrics(primaryResult);

  // Cross-browser performance analysis
  const browserPerformance = {};
  const browserAccuracy = {};
  const viewportPerformance = {};

  successfulResults.forEach((result) => {
    const browser = result.browser;
    const viewport = result.viewport;

    // Browser-specific metrics
    if (!browserPerformance[browser]) {
      browserPerformance[browser] = { loadTimes: [], accuracy: [], count: 0 };
    }
    browserPerformance[browser].loadTimes.push(result.performance.loadTime);
    browserPerformance[browser].accuracy.push(result.sortingAccuracy.accuracy);
    browserPerformance[browser].count++;

    // Viewport-specific metrics
    if (!viewportPerformance[viewport]) {
      viewportPerformance[viewport] = {
        loadTimes: [],
        accuracy: [],
        browsers: new Set(),
      };
    }
    viewportPerformance[viewport].loadTimes.push(result.performance.loadTime);
    viewportPerformance[viewport].accuracy.push(
      result.sortingAccuracy.accuracy
    );
    viewportPerformance[viewport].browsers.add(browser);
  });

  // Calculate browser comparison metrics
  Object.keys(browserPerformance).forEach((browser) => {
    const data = browserPerformance[browser];
    browserPerformance[browser] = {
      ...data,
      avgLoadTime: Math.round(
        data.loadTimes.reduce((a, b) => a + b, 0) / data.loadTimes.length
      ),
      minLoadTime: Math.min(...data.loadTimes),
      maxLoadTime: Math.max(...data.loadTimes),
      avgAccuracy: (
        data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length
      ).toFixed(2),
      minAccuracy: Math.min(...data.accuracy),
      maxAccuracy: Math.max(...data.accuracy),
    };
  });

  // Calculate viewport comparison metrics
  Object.keys(viewportPerformance).forEach((viewport) => {
    const data = viewportPerformance[viewport];
    viewportPerformance[viewport] = {
      avgLoadTime: Math.round(
        data.loadTimes.reduce((a, b) => a + b, 0) / data.loadTimes.length
      ),
      avgAccuracy: (
        data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length
      ).toFixed(2),
      browserCount: data.browsers.size,
      browsers: Array.from(data.browsers),
    };
  });

  return {
    ...primaryResult,
    qualityMetrics,
    aggregatedData: {
      totalTestRuns: testResults.length,
      successfulRuns: successfulResults.length,
      failedRuns: testResults.length - successfulResults.length,
      averageLoadTime: Math.round(
        successfulResults.reduce((sum, r) => sum + r.performance.loadTime, 0) /
          successfulResults.length
      ),
      testedBrowsers: [...new Set(successfulResults.map((r) => r.browser))],
      testedViewports: [...new Set(successfulResults.map((r) => r.viewport))],
      browserPerformance,
      viewportPerformance,
      crossBrowserCompatibility: {
        totalBrowsers: Object.keys(browserPerformance).length,
        totalViewports: Object.keys(viewportPerformance).length,
        successRate: (
          (successfulResults.length / testResults.length) *
          100
        ).toFixed(1),
      },
    },
  };
};

// Display final comprehensive summary
const displayFinalSummary = (testResults, testStartTime) => {
  const totalTime = Date.now() - testStartTime;
  const successfulTests = testResults.filter((r) => !r.failed).length;
  const failedTests = testResults.length - successfulTests;

  console.log(chalk.cyan.bold("\n🎯 FINAL TEST SUMMARY"));
  console.log(chalk.cyan("=".repeat(60)));
  console.log(
    chalk.white(
      `Total Execution Time: ${moment.duration(totalTime).humanize()}`
    )
  );
  console.log(chalk.white(`Test Scenarios: ${testResults.length}`));
  console.log(chalk.green(`✅ Successful: ${successfulTests}`));

  if (failedTests > 0) {
    console.log(chalk.red(`❌ Failed: ${failedTests}`));
  }

  if (successfulTests > 0) {
    const bestResult = testResults
      .filter((r) => !r.failed)
      .reduce((best, current) =>
        current.sortingAccuracy.accuracy > best.sortingAccuracy.accuracy
          ? current
          : best
      );

    console.log(chalk.white(`\nBest Performance:`));
    console.log(
      chalk.green(`  Sorting Accuracy: ${bestResult.sortingAccuracy.accuracy}%`)
    );
    console.log(
      chalk.green(`  Load Time: ${bestResult.performance.loadTime}ms`)
    );
    console.log(
      chalk.green(`  Browser: ${bestResult.browser} (${bestResult.viewport})`)
    );
  }

  console.log(chalk.cyan("\n📁 Reports generated in ./reports/ directory"));
  console.log(chalk.cyan.bold("✅ Playwright Testing Validation Complete!\n"));

  // Return overall test status
  return failedTests === 0 && successfulTests > 0;
};

module.exports = {
  generateHTMLReport,
  generateJSONReport,
  generateCSVReport,
  displayTestSummary,
  generateAllReports,
  aggregateResults,
  displayFinalSummary,
};
