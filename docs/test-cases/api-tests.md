# API Testing Documentation

## Overview

This document describes our API testing approach for validating the Hacker News Firebase API. We test the API independently to ensure data integrity and consistency with the UI.

## API Tests

### 1. HN API Availability

**What it tests:** Verifies that HN API endpoints are accessible and responsive
**Why it matters:** Ensures the backend service is available for data validation

**Test details:**

- Checks `https://hacker-news.firebaseio.com/v0/newstories.json` endpoint
- Validates response status (should be 200)
- Verifies response contains array of story IDs
- Measures response time (should be under 2 seconds)
- Tests individual story endpoint with sample ID

**Pass criteria:** All endpoints return 200 status with valid data within 2 seconds

### 2. API Data Integrity

**What it tests:** Validates that API data is complete and properly formatted
**Why it matters:** Ensures we can trust the API data for comparison with UI

**Test details:**

- Fetches first 50 newest stories from API
- Checks for required fields (id, type, time, by)
- Validates data types match expected format
- Verifies timestamps are valid Unix timestamps
- Calculates data integrity percentage

**Pass criteria:** Data integrity ≥ 95% with all required fields present

### 3. API Sorting Validation

**What it tests:** Confirms API returns stories in correct chronological order
**Why it matters:** Validates that the API sorting matches our UI expectations

**Test details:**

- Gets newest story IDs from API
- Fetches story details for first 50 stories
- Extracts and compares timestamps
- Calculates sorting accuracy percentage
- Identifies sorting anomalies

**Pass criteria:** Sorting accuracy ≥ 80% with no more than 5 consecutive errors

### 4. API Performance Testing

**What it tests:** Measures API performance under normal load
**Why it matters:** Ensures API can handle concurrent requests reliably

**Test details:**

- Sends 20 concurrent requests to newstories endpoint
- Measures response times (average, min, max)
- Calculates throughput (requests per second)
- Monitors for rate limiting or errors
- Verifies data quality isn't affected by load

**Pass criteria:** Average response time < 1 second, throughput > 10 requests/second

### 5. API-UI Data Consistency

**What it tests:** Compares API data against UI data for consistency
**Why it matters:** Ensures UI accurately represents backend data

**Test details:**

- Fetches newest stories from both API and UI
- Matches stories by ID
- Compares title, author, score, and timestamp
- Calculates consistency percentage
- Documents any discrepancies found

**Pass criteria:** Consistency ≥ 95% with core fields always matching

### 6. API Error Handling

**What it tests:** Validates API error responses and recovery behavior
**Why it matters:** Ensures graceful handling of error conditions

**Test details:**

- Tests invalid endpoint URLs
- Tests malformed item IDs
- Simulates network timeout scenarios
- Checks error response formats
- Validates retry mechanisms

**Pass criteria:** All error scenarios handled gracefully with proper error responses

### 7. API Contract Compliance

**What it tests:** Ensures API responses match documented contract
**Why it matters:** Validates API consistency and reliability

**Test details:**

- Validates response schemas against documentation
- Checks required fields are present
- Verifies field data types match specification
- Tests edge cases and optional fields
- Calculates contract compliance percentage

**Pass criteria:** 100% contract compliance with no schema violations

### 8. API Security Testing

**What it tests:** Basic security validation of API endpoints
**Why it matters:** Ensures API follows security best practices

**Test details:**

- Tests for SQL injection vulnerabilities
- Checks for XSS vulnerabilities in responses
- Verifies HTTPS usage and certificate validity
- Checks for sensitive data exposure
- Tests rate limiting and throttling

**Pass criteria:** No security vulnerabilities detected, HTTPS properly configured

## Test Implementation

### Running API Tests

```bash
# Run all API tests
npm run test:api

# Run as part of full test suite
npm test
```

### Test Framework

- **HTTP Client:** Axios for API requests
- **Validation:** Custom assertion framework
- **Timing:** Performance measurement utilities
- **Integration:** Results integrated into main reporting system

### Test Data

- **Live Data:** Uses actual HN API endpoints
- **Sample Size:** First 50 stories for most tests
- **Concurrency:** 20 concurrent requests for performance testing
- **Timeouts:** 2 second timeout for availability, 1 second for performance

### Expected Results

Based on actual testing:

- **Availability:** 100% uptime for HN API
- **Performance:** 200-500ms average response time
- **Data Quality:** 95%+ integrity across all fields
- **Consistency:** 95%+ match between API and UI data

### Common Issues

- **Rate Limiting:** HN API may throttle excessive requests
- **Data Freshness:** Small delays between API updates and UI display
- **Network Variability:** Response times vary based on network conditions
- **Missing Fields:** Some stories may have incomplete data

### Integration Notes

- API tests run in parallel with UI tests
- Results are combined in the main test report
- Failed API tests don't block UI testing
- Quality metrics include API validation scores

### Future Enhancements

- Add more comprehensive performance testing
- Implement API contract testing with OpenAPI specs
- Add automated security scanning
- Include API monitoring and alerting
- Add API versioning tests

---

**Implementation:** `tests/api/hnApiTests.js`
**Dependencies:** axios, moment
**Last Updated:** 2024-01-08
