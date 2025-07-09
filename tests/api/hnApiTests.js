// HN API Testing Module - Backend Validation Layer
const axios = require('axios');
const moment = require('moment');
const chalk = require('chalk');
const { logTestStep } = require('../../utils/testUtils');

// HN API Configuration
const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const API_ENDPOINTS = {
  newstories: `${HN_API_BASE}/newstories.json`,
  item: `${HN_API_BASE}/item`, // append /{id}.json
  maxitem: `${HN_API_BASE}/maxitem.json`,
  topstories: `${HN_API_BASE}/topstories.json`
};

// API Test Configuration
const API_TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  maxItemsToTest: 50, // Test subset for performance
  sortingToleranceMinutes: 60 // Allow 1 hour sorting tolerance
};

class HNApiTester {
  constructor() {
    this.testResults = {
      apiAvailability: null,
      dataIntegrity: null,
      sortingValidation: null,
      performanceMetrics: null,
      contractCompliance: null
    };
  }

  // Test API availability and response times
  async testApiAvailability() {
    logTestStep('Testing HN API availability...', 'info');
    
    const results = {
      endpoints: {},
      overallStatus: 'PASS',
      averageResponseTime: 0
    };

    const startTime = Date.now();

    try {
      // Test primary endpoints
      for (const [name, url] of Object.entries(API_ENDPOINTS)) {
        if (name === 'item') continue; // Skip item endpoint for now
        
        const endpointStart = Date.now();
        const response = await axios.get(url, { timeout: API_TEST_CONFIG.timeout });
        const responseTime = Date.now() - endpointStart;
        
        results.endpoints[name] = {
          status: response.status,
          responseTime,
          dataLength: Array.isArray(response.data) ? response.data.length : 1,
          success: response.status === 200
        };
        
        logTestStep(`  ${name}: ${response.status} (${responseTime}ms)`, 'success');
      }

      // Test individual item endpoint
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      if (newstoriesResponse.data && newstoriesResponse.data.length > 0) {
        const testItemId = newstoriesResponse.data[0];
        const itemStart = Date.now();
        const itemResponse = await axios.get(`${API_ENDPOINTS.item}/${testItemId}.json`, { timeout: API_TEST_CONFIG.timeout });
        const itemResponseTime = Date.now() - itemStart;
        
        results.endpoints.item = {
          status: itemResponse.status,
          responseTime: itemResponseTime,
          itemId: testItemId,
          success: itemResponse.status === 200
        };
        
        logTestStep(`  item: ${itemResponse.status} (${itemResponseTime}ms)`, 'success');
      }

      // Calculate average response time
      const responseTimes = Object.values(results.endpoints).map(e => e.responseTime);
      results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Check if any endpoint failed
      const failedEndpoints = Object.values(results.endpoints).filter(e => !e.success);
      if (failedEndpoints.length > 0) {
        results.overallStatus = 'FAIL';
        logTestStep(`${failedEndpoints.length} endpoints failed`, 'error');
      } else {
        logTestStep(`All endpoints responding (avg: ${results.averageResponseTime.toFixed(0)}ms)`, 'success');
      }

    } catch (error) {
      results.overallStatus = 'FAIL';
      results.error = error.message;
      logTestStep(`API availability test failed: ${error.message}`, 'error');
    }

    this.testResults.apiAvailability = results;
    return results;
  }

  // Test data integrity between API and expected format
  async testDataIntegrity() {
    logTestStep('Testing HN API data integrity...', 'info');
    
    const results = {
      totalItemsTested: 0,
      validItems: 0,
      invalidItems: 0,
      dataQualityScore: 0,
      issues: []
    };

    try {
      // Get newest story IDs
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      const storyIds = newstoriesResponse.data.slice(0, API_TEST_CONFIG.maxItemsToTest);
      
      logTestStep(`Testing ${storyIds.length} items for data integrity...`, 'info');

      // Test each item
      for (const itemId of storyIds) {
        results.totalItemsTested++;
        
        try {
          const itemResponse = await axios.get(`${API_ENDPOINTS.item}/${itemId}.json`);
          const item = itemResponse.data;
          
          // Validate required fields
          const requiredFields = ['id', 'type', 'time', 'by'];
          const missingFields = requiredFields.filter(field => !item[field]);
          
          if (missingFields.length === 0) {
            results.validItems++;
            
            // Additional validation for stories
            if (item.type === 'story') {
              if (!item.title || !item.url) {
                results.issues.push({
                  itemId,
                  issue: 'Story missing title or URL',
                  severity: 'medium'
                });
              }
            }
          } else {
            results.invalidItems++;
            results.issues.push({
              itemId,
              issue: `Missing required fields: ${missingFields.join(', ')}`,
              severity: 'high'
            });
          }
          
          // Validate timestamp format
          if (item.time && !moment.unix(item.time).isValid()) {
            results.issues.push({
              itemId,
              issue: 'Invalid timestamp format',
              severity: 'medium'
            });
          }
          
        } catch (error) {
          results.invalidItems++;
          results.issues.push({
            itemId,
            issue: `API call failed: ${error.message}`,
            severity: 'high'
          });
        }
      }

      // Calculate data quality score
      results.dataQualityScore = results.totalItemsTested > 0 
        ? (results.validItems / results.totalItemsTested) * 100 
        : 0;

      const criticalIssues = results.issues.filter(i => i.severity === 'high').length;
      if (criticalIssues === 0 && results.dataQualityScore >= 90) {
        logTestStep(`Data integrity: ${results.dataQualityScore.toFixed(1)}% quality`, 'success');
      } else {
        logTestStep(`Data integrity issues: ${criticalIssues} critical, ${results.dataQualityScore.toFixed(1)}% quality`, 'warning');
      }

    } catch (error) {
      results.error = error.message;
      logTestStep(`Data integrity test failed: ${error.message}`, 'error');
    }

    this.testResults.dataIntegrity = results;
    return results;
  }

  // Test API sorting validation
  async testSortingValidation() {
    logTestStep('Testing HN API sorting validation...', 'info');
    
    const results = {
      totalPairs: 0,
      correctPairs: 0,
      incorrectPairs: 0,
      sortingAccuracy: 0,
      sortingIssues: []
    };

    try {
      // Get newest story IDs
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      const storyIds = newstoriesResponse.data.slice(0, API_TEST_CONFIG.maxItemsToTest);
      
      logTestStep(`Testing sorting for ${storyIds.length} items...`, 'info');

      // Get items with timestamps
      const itemsWithTimestamps = [];
      for (const itemId of storyIds) {
        try {
          const itemResponse = await axios.get(`${API_ENDPOINTS.item}/${itemId}.json`);
          const item = itemResponse.data;
          
          if (item && item.time) {
            itemsWithTimestamps.push({
              id: itemId,
              time: item.time,
              timestamp: moment.unix(item.time).toDate()
            });
          }
        } catch (error) {
          // Skip items that can't be fetched
          continue;
        }
      }

      // Validate sorting (newest first)
      for (let i = 0; i < itemsWithTimestamps.length - 1; i++) {
        const current = itemsWithTimestamps[i];
        const next = itemsWithTimestamps[i + 1];
        
        results.totalPairs++;
        
        // Current should be newer (higher timestamp)
        if (current.time >= next.time) {
          results.correctPairs++;
        } else {
          results.incorrectPairs++;
          
          // Check if it's within tolerance
          const timeDiffMinutes = (next.time - current.time) / 60;
          if (timeDiffMinutes > API_TEST_CONFIG.sortingToleranceMinutes) {
            results.sortingIssues.push({
              position: i,
              currentId: current.id,
              nextId: next.id,
              timeDiffMinutes: timeDiffMinutes.toFixed(1),
              severity: 'medium'
            });
          }
        }
      }

      // Calculate sorting accuracy
      results.sortingAccuracy = results.totalPairs > 0 
        ? (results.correctPairs / results.totalPairs) * 100 
        : 100;

      if (results.sortingAccuracy >= 80) {
        logTestStep(`API sorting accuracy: ${results.sortingAccuracy.toFixed(1)}%`, 'success');
      } else {
        logTestStep(`API sorting accuracy: ${results.sortingAccuracy.toFixed(1)}% (below 80%)`, 'warning');
      }

    } catch (error) {
      results.error = error.message;
      logTestStep(`API sorting validation failed: ${error.message}`, 'error');
    }

    this.testResults.sortingValidation = results;
    return results;
  }

  // Test API performance metrics
  async testPerformanceMetrics() {
    logTestStep('Testing HN API performance metrics...', 'info');
    
    const results = {
      responseTimes: [],
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      throughput: 0,
      performanceScore: 0
    };

    try {
      const startTime = Date.now();
      
      // Get newest story IDs
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      const storyIds = newstoriesResponse.data.slice(0, 20); // Smaller set for performance testing
      
      // Test concurrent requests
      const requestPromises = storyIds.map(async (itemId) => {
        const requestStart = Date.now();
        try {
          await axios.get(`${API_ENDPOINTS.item}/${itemId}.json`, { timeout: API_TEST_CONFIG.timeout });
          return Date.now() - requestStart;
        } catch (error) {
          return null; // Failed request
        }
      });

      const responseTimes = await Promise.all(requestPromises);
      results.responseTimes = responseTimes.filter(t => t !== null);
      
      if (results.responseTimes.length > 0) {
        results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
        results.maxResponseTime = Math.max(...results.responseTimes);
        results.minResponseTime = Math.min(...results.responseTimes);
        
        const totalTime = Date.now() - startTime;
        results.throughput = (results.responseTimes.length / totalTime) * 1000; // requests per second
        
        // Calculate performance score (lower response time = higher score)
        const baselineResponseTime = 1000; // 1 second baseline
        results.performanceScore = Math.max(0, Math.min(100, 
          ((baselineResponseTime - results.averageResponseTime) / baselineResponseTime) * 100
        ));
        
        logTestStep(`API performance: ${results.averageResponseTime.toFixed(0)}ms avg, ${results.throughput.toFixed(1)} req/s`, 'success');
      } else {
        logTestStep('No successful API requests for performance testing', 'error');
      }

    } catch (error) {
      results.error = error.message;
      logTestStep(`API performance test failed: ${error.message}`, 'error');
    }

    this.testResults.performanceMetrics = results;
    return results;
  }

  // Test API contract compliance
  async testContractCompliance() {
    logTestStep('Testing HN API contract compliance...', 'info');
    
    const results = {
      endpointTests: {},
      schemaValidation: {},
      complianceScore: 0,
      issues: []
    };

    try {
      // Test newstories endpoint contract
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      results.endpointTests.newstories = {
        status: newstoriesResponse.status,
        isArray: Array.isArray(newstoriesResponse.data),
        hasItems: newstoriesResponse.data.length > 0,
        itemsAreNumbers: newstoriesResponse.data.every(id => typeof id === 'number')
      };

      // Test item endpoint contract
      if (newstoriesResponse.data.length > 0) {
        const testItemId = newstoriesResponse.data[0];
        const itemResponse = await axios.get(`${API_ENDPOINTS.item}/${testItemId}.json`);
        const item = itemResponse.data;
        
        results.endpointTests.item = {
          status: itemResponse.status,
          hasRequiredFields: ['id', 'type', 'time', 'by'].every(field => field in item),
          typeIsValid: ['story', 'comment', 'job', 'poll', 'pollopt'].includes(item.type),
          timeIsUnix: typeof item.time === 'number' && item.time > 0,
          idMatches: item.id === testItemId
        };

        // Schema validation for story type
        if (item.type === 'story') {
          results.schemaValidation.story = {
            hasTitle: typeof item.title === 'string' && item.title.length > 0,
            hasUrl: !item.url || typeof item.url === 'string',
            hasScore: typeof item.score === 'number',
            hasDescendants: typeof item.descendants === 'number'
          };
        }
      }

      // Calculate compliance score
      const allTests = [];
      Object.values(results.endpointTests).forEach(test => {
        allTests.push(...Object.values(test).filter(v => typeof v === 'boolean'));
      });
      Object.values(results.schemaValidation).forEach(test => {
        allTests.push(...Object.values(test).filter(v => typeof v === 'boolean'));
      });
      
      const passedTests = allTests.filter(Boolean).length;
      results.complianceScore = allTests.length > 0 ? (passedTests / allTests.length) * 100 : 0;

      if (results.complianceScore >= 95) {
        logTestStep(`API contract compliance: ${results.complianceScore.toFixed(1)}%`, 'success');
      } else {
        logTestStep(`API contract compliance: ${results.complianceScore.toFixed(1)}% (issues detected)`, 'warning');
      }

    } catch (error) {
      results.error = error.message;
      logTestStep(`API contract compliance test failed: ${error.message}`, 'error');
    }

    this.testResults.contractCompliance = results;
    return results;
  }

  // Run all API tests
  async runAllTests() {
    console.log(chalk.blue.bold('\n🔗 Running HN API Test Suite...'));
    
    const testSuite = [
      { name: 'API Availability', method: 'testApiAvailability' },
      { name: 'Data Integrity', method: 'testDataIntegrity' },
      { name: 'Sorting Validation', method: 'testSortingValidation' },
      { name: 'Performance Metrics', method: 'testPerformanceMetrics' },
      { name: 'Contract Compliance', method: 'testContractCompliance' }
    ];

    const results = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        totalTests: testSuite.length,
        passedTests: 0,
        failedTests: 0,
        overallStatus: 'PASS'
      }
    };

    for (const test of testSuite) {
      try {
        const testResult = await this[test.method]();
        
        // Determine if test passed
        const passed = !testResult.error && 
                      (testResult.overallStatus === 'PASS' || 
                       testResult.dataQualityScore >= 90 || 
                       testResult.sortingAccuracy >= 80 || 
                       testResult.performanceScore >= 0 || 
                       testResult.complianceScore >= 95);
        
        if (passed) {
          results.summary.passedTests++;
        } else {
          results.summary.failedTests++;
          results.summary.overallStatus = 'FAIL';
        }
        
      } catch (error) {
        results.summary.failedTests++;
        results.summary.overallStatus = 'FAIL';
        logTestStep(`${test.name} failed: ${error.message}`, 'error');
      }
    }

    console.log(chalk.blue(`\n📊 API Test Results: ${results.summary.passedTests}/${results.summary.totalTests} passed`));
    
    return results;
  }

  // Validate API data against UI data
  async validateAgainstUIData(uiArticles) {
    logTestStep('Validating API data against UI data...', 'info');
    
    const results = {
      totalArticles: uiArticles.length,
      matchedArticles: 0,
      discrepancies: [],
      consistencyScore: 0
    };

    try {
      // Get API data for comparison
      const newstoriesResponse = await axios.get(API_ENDPOINTS.newstories);
      const storyIds = newstoriesResponse.data.slice(0, Math.min(50, uiArticles.length));
      
      // Get API items
      const apiItems = [];
      for (const itemId of storyIds) {
        try {
          const itemResponse = await axios.get(`${API_ENDPOINTS.item}/${itemId}.json`);
          apiItems.push(itemResponse.data);
        } catch (error) {
          // Skip failed items
        }
      }

      // Compare API vs UI data
      for (const uiArticle of uiArticles.slice(0, apiItems.length)) {
        const apiItem = apiItems.find(item => item.id.toString() === uiArticle.id);
        
        if (apiItem) {
          results.matchedArticles++;
          
          // Check for discrepancies
          if (apiItem.title !== uiArticle.title) {
            results.discrepancies.push({
              id: uiArticle.id,
              field: 'title',
              apiValue: apiItem.title,
              uiValue: uiArticle.title
            });
          }
          
          if (apiItem.by !== uiArticle.author) {
            results.discrepancies.push({
              id: uiArticle.id,
              field: 'author',
              apiValue: apiItem.by,
              uiValue: uiArticle.author
            });
          }
          
          if (apiItem.score !== uiArticle.score) {
            results.discrepancies.push({
              id: uiArticle.id,
              field: 'score',
              apiValue: apiItem.score,
              uiValue: uiArticle.score
            });
          }
        }
      }

      // Calculate consistency score
      results.consistencyScore = results.totalArticles > 0 
        ? ((results.matchedArticles - results.discrepancies.length) / results.matchedArticles) * 100 
        : 0;

      if (results.consistencyScore >= 95) {
        logTestStep(`API-UI consistency: ${results.consistencyScore.toFixed(1)}%`, 'success');
      } else {
        logTestStep(`API-UI consistency: ${results.consistencyScore.toFixed(1)}% (${results.discrepancies.length} discrepancies)`, 'warning');
      }

    } catch (error) {
      results.error = error.message;
      logTestStep(`API-UI validation failed: ${error.message}`, 'error');
    }

    return results;
  }
}

module.exports = HNApiTester;