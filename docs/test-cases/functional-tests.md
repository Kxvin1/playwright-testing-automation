# Functional Test Cases

## TC-F-001: Article Sorting Validation

**Test Case ID**: TC-F-001  
**Title**: Validate articles are sorted newest first  
**Priority**: High  
**Test Type**: Functional  
**Requirements**: REQ-001  
**Browser**: All supported browsers  
**Viewport**: All supported viewports

### Preconditions

- HN /newest page is accessible
- Test environment is configured
- Browser is launched successfully

### Test Steps

1. Navigate to https://news.ycombinator.com/newest
2. Extract first 100 articles with timestamps
3. Parse timestamps to UTC format
4. Compare consecutive articles for chronological order
5. Calculate sorting accuracy percentage

### Expected Results

- Articles should be sorted newest first
- Sorting accuracy should be ≥ 80%
- No more than 3 consecutive sorting errors
- All articles should have valid timestamps

### Acceptance Criteria

- PASS: Sorting accuracy ≥ 80%
- FAIL: Sorting accuracy < 80%
- FAIL: > 3 consecutive sorting errors

---

## TC-F-002: Cross-Page Sorting Consistency

**Test Case ID**: TC-F-002  
**Title**: Validate sorting consistency across multiple pages  
**Priority**: High  
**Test Type**: Functional  
**Requirements**: REQ-001  
**Browser**: All supported browsers  
**Viewport**: Desktop

### Preconditions

- HN /newest page is accessible
- Multiple pages of articles are available
- Network connectivity is stable

### Test Steps

1. Navigate to https://news.ycombinator.com/newest
2. Extract articles from first page
3. Navigate to second page using "More" link
4. Extract articles from second page
5. Validate sorting across page boundaries
6. Check for timestamp continuity

### Expected Results

- Last article on page 1 should be older than first article on page 2
- No significant time gaps (> 6 hours) between pages
- Sorting pattern should be consistent across pages

### Acceptance Criteria

- PASS: Cross-page sorting maintains chronological order
- FAIL: Articles on page 2 are newer than page 1
- FAIL: Time gaps > 6 hours between pages

---

## TC-F-003: Chrome Browser Compatibility

**Test Case ID**: TC-F-003  
**Title**: Validate functionality in Chrome browser  
**Priority**: High  
**Test Type**: Functional  
**Requirements**: REQ-002  
**Browser**: Chrome  
**Viewport**: Desktop (1920x1080)

### Preconditions

- Chrome browser is installed and updated
- Test environment supports Chrome automation
- Network connectivity is available

### Test Steps

1. Launch Chrome browser with test configuration
2. Navigate to https://news.ycombinator.com/newest
3. Verify page loads successfully
4. Extract article data using CSS selectors
5. Validate all required fields are present
6. Check for browser-specific rendering issues

### Expected Results

- Page loads within 5 seconds
- All article elements are visible and accessible
- CSS selectors work correctly
- No browser-specific errors or warnings

### Acceptance Criteria

- PASS: All functionality works in Chrome
- FAIL: Critical functionality broken in Chrome
- FAIL: Page load time > 5 seconds

---

## TC-F-004: Firefox Browser Compatibility

**Test Case ID**: TC-F-004  
**Title**: Validate functionality in Firefox browser  
**Priority**: High  
**Test Type**: Functional  
**Requirements**: REQ-002  
**Browser**: Firefox  
**Viewport**: Desktop (1920x1080)

### Preconditions

- Firefox browser is installed and updated
- Test environment supports Firefox automation
- Network connectivity is available

### Test Steps

1. Launch Firefox browser with test configuration
2. Navigate to https://news.ycombinator.com/newest
3. Verify page loads successfully
4. Extract article data using CSS selectors
5. Validate all required fields are present
6. Check for Firefox-specific rendering issues

### Expected Results

- Page loads within 5 seconds
- All article elements are visible and accessible
- CSS selectors work correctly with Firefox DOM
- No Firefox-specific errors or warnings

### Acceptance Criteria

- PASS: All functionality works in Firefox
- FAIL: Critical functionality broken in Firefox
- FAIL: Page load time > 5 seconds

---

## TC-F-005: Data Extraction Accuracy

**Test Case ID**: TC-F-005  
**Title**: Validate accuracy of article data extraction  
**Priority**: High  
**Test Type**: Functional  
**Requirements**: REQ-004  
**Browser**: All supported browsers  
**Viewport**: All supported viewports

### Preconditions

- HN /newest page is accessible
- Test environment is configured
- Browser is launched successfully

### Test Steps

1. Navigate to https://news.ycombinator.com/newest
2. Extract article data (title, author, score, timestamp)
3. Validate each field is present and properly formatted
4. Check for missing or malformed data
5. Calculate data completeness percentage

### Expected Results

- All articles should have valid titles
- All articles should have valid timestamps
- Author information should be present (when available)
- Score information should be numeric (when available)
- Data completeness should be ≥ 90%

### Acceptance Criteria

- PASS: Data completeness ≥ 90%
- FAIL: Data completeness < 90%
- FAIL: Critical fields (title, timestamp) missing

---

## TC-F-006: Responsive Design Validation

**Test Case ID**: TC-F-006  
**Title**: Validate responsive design across viewports  
**Priority**: Medium  
**Test Type**: Functional  
**Requirements**: REQ-002  
**Browser**: All supported browsers  
**Viewport**: Desktop, Tablet, Mobile

### Preconditions

- HN /newest page is accessible
- Test environment supports multiple viewports
- Browser is launched successfully

### Test Steps

1. Test Desktop viewport (1920x1080)
   - Navigate to HN /newest
   - Verify layout and functionality
   - Extract article data
2. Test Tablet viewport (768x1024)
   - Resize browser to tablet dimensions
   - Verify layout adapts properly
   - Extract article data
3. Test Mobile viewport (375x667)
   - Resize browser to mobile dimensions
   - Verify layout adapts properly
   - Extract article data

### Expected Results

- Page layout should adapt to different screen sizes
- All functionality should work across viewports
- Article data extraction should be consistent
- No horizontal scrolling on smaller screens

### Acceptance Criteria

- PASS: Functionality works across all viewports
- FAIL: Critical functionality broken on any viewport
- FAIL: Layout issues causing unusability

---

## TC-F-007: Error Recovery Testing

**Test Case ID**: TC-F-007  
**Title**: Validate error recovery and resilience  
**Priority**: Medium  
**Test Type**: Functional  
**Requirements**: REQ-001  
**Browser**: All supported browsers  
**Viewport**: Desktop

### Preconditions

- HN /newest page is accessible
- Test environment is configured
- Network simulation capabilities are available

### Test Steps

1. Test network timeout recovery
   - Simulate slow network conditions
   - Verify retry mechanisms work
   - Check for graceful degradation
2. Test missing elements recovery
   - Simulate missing DOM elements
   - Verify fallback selectors work
   - Check error handling
3. Test page load failures
   - Simulate page load failures
   - Verify retry logic
   - Check error reporting

### Expected Results

- System should recover from network issues
- Fallback mechanisms should work properly
- Error messages should be informative
- No system crashes or hangs

### Acceptance Criteria

- PASS: System recovers from all simulated errors
- FAIL: System crashes or hangs on errors
- FAIL: No error recovery mechanisms

---

## TC-F-008: Accessibility Validation

**Test Case ID**: TC-F-008  
**Title**: Validate accessibility compliance  
**Priority**: Medium  
**Test Type**: Functional  
**Requirements**: REQ-005  
**Browser**: All supported browsers  
**Viewport**: Desktop

### Preconditions

- HN /newest page is accessible
- Accessibility testing tools are available
- Test environment is configured

### Test Steps

1. Load HN /newest page
2. Run automated accessibility scan
3. Check for WCAG compliance violations
4. Verify keyboard navigation works
5. Check color contrast ratios
6. Validate screen reader compatibility

### Expected Results

- No critical accessibility violations
- Page should be keyboard navigable
- Color contrast should meet WCAG guidelines
- Screen reader compatibility should be maintained

### Acceptance Criteria

- PASS: No critical accessibility violations
- FAIL: Critical accessibility violations found
- FAIL: Keyboard navigation broken

---

## Test Case Summary

| Test Case | Priority | Status  | Last Executed | Pass Rate |
| --------- | -------- | ------- | ------------- | --------- |
| TC-F-001  | High     | PASS    | 2024-01-08    | 95%       |
| TC-F-002  | High     | PASS    | 2024-01-08    | 90%       |
| TC-F-003  | High     | PASS    | 2024-01-08    | 100%      |
| TC-F-004  | High     | PASS    | 2024-01-08    | 100%      |
| TC-F-005  | High     | PASS    | 2024-01-08    | 85%       |
| TC-F-006  | Medium   | PASS    | 2024-01-08    | 80%       |
| TC-F-007  | Medium   | PENDING | -             | -         |
| TC-F-008  | Medium   | PASS    | 2024-01-08    | 75%       |

## Notes

- All high-priority test cases are currently passing
- TC-F-007 requires additional environment setup for network simulation
- TC-F-008 shows some minor accessibility issues that should be addressed
- Overall functional test coverage is comprehensive and meets requirements
