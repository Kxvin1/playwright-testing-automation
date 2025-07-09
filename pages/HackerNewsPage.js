const moment = require('moment');

class HackerNewsPage {
  constructor(page, browserName = 'chromium') {
    this.page = page;
    this.browserName = browserName;
    
    // Selectors with browser-specific fallbacks
    this.selectors = {
      articleRows: '.athing',
      articleTitle: '.storylink',
      articleMeta: '.subtext',
      timestamp: '.age',
      score: '.score',
      author: '.hnuser',
      commentsLink: 'a[href*="item?id"]',
      moreLink: '.morelink',
      loadingIndicator: '.loading',
    };
    
    // Browser-specific selector strategies
    this.browserSelectors = {
      firefox: {
        // Firefox sometimes needs more specific selectors
        articleRows: '.athing, tr[id^="thing"]',
        articleTitle: '.storylink, .titlelink',
      }
    };
    
    this.url = 'https://news.ycombinator.com/newest';
  }

  // Get browser-specific selector
  getSelector(selectorName) {
    const browserSpecific = this.browserSelectors[this.browserName];
    return browserSpecific?.[selectorName] || this.selectors[selectorName];
  }

  // Get browser-specific timeouts
  getBrowserTimeout(operation = 'default') {
    const timeouts = {
      chromium: { default: 15000, navigation: 30000, element: 15000 },
      firefox: { default: 20000, navigation: 35000, element: 20000 },
    };
    return timeouts[this.browserName]?.[operation] || timeouts.chromium[operation];
  }

  // Navigate to the newest page with performance monitoring and retry logic
  async navigateToNewest() {
    const startTime = Date.now();
    
    // Enhanced navigation with retry logic
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(this.url, {
          waitUntil: 'networkidle',
          timeout: this.getBrowserTimeout('navigation')
        });
        
        // Wait for articles to load with robust selector strategy
        await this.waitForArticles();
        
        const loadTime = Date.now() - startTime;
        console.log(`Page loaded in ${loadTime}ms (attempt ${attempt})`);
        
        return loadTime;
      } catch (error) {
        lastError = error;
        console.log(`Navigation attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to navigate after ${maxRetries} attempts: ${lastError.message}`);
  }
  
  // Robust waiting for articles with browser-specific strategies
  async waitForArticles() {
    const primarySelector = this.getSelector('articleRows');
    const fallbackSelectors = ['.athing', 'tr[id^="thing"]', '[id*="thing"]'];
    const allSelectors = [primarySelector, ...fallbackSelectors];
    
    for (const selector of allSelectors) {
      try {
        await this.page.waitForSelector(selector, { 
          timeout: this.getBrowserTimeout('element'),
          state: 'attached'
        });
        
        // Firefox-specific: Wait for title elements to be available as well
        if (this.browserName === 'firefox') {
          try {
            // Wait a bit longer for Firefox to fully render the DOM structure
            await this.page.waitForTimeout(500);
            // Ensure that title elements are also available
            await this.page.waitForFunction(
              () => {
                const articles = document.querySelectorAll('.athing');
                if (articles.length === 0) return false;
                // Check if at least some articles have associated title rows
                let titlesFound = 0;
                for (let i = 0; i < Math.min(3, articles.length); i++) {
                  const articleId = articles[i].id;
                  const nextRow = document.querySelector(`tr[id="${articleId}"] + tr`);
                  if (nextRow && nextRow.querySelector('.storylink, .titlelink')) {
                    titlesFound++;
                  }
                }
                return titlesFound > 0;
              },
              { timeout: 5000 }
            );
          } catch (e) {
            console.log(`    Firefox DOM structure check failed, but articles found with ${selector}`);
          }
        }
        
        console.log(`Articles loaded using selector: ${selector} (${this.browserName})`);
        return;
      } catch (error) {
        console.log(`Selector ${selector} failed on ${this.browserName}, trying next...`);
      }
    }
    
    throw new Error(`Could not find articles with any known selector on ${this.browserName}`);
  }

  // Get exactly the requested number of articles with enhanced error handling and retry logic
  async getArticleElements(count = 100) {
    console.log(`    Loading ${count} articles from multiple pages...`);
    
    let allArticleData = [];
    let currentUrl = this.url;
    let pageNum = 1;
    const maxPages = 5; // Should be enough to get 100+ articles
    const maxRetries = 2;
    
    while (allArticleData.length < count && pageNum <= maxPages) {
      console.log(`    📄 Loading page ${pageNum}...`);
      
      let pageSuccess = false;
      let lastError;
      
      for (let retry = 1; retry <= maxRetries; retry++) {
        try {
          // Navigate to the current page with browser-specific settings
          if (pageNum > 1) {
            await this.page.goto(currentUrl, { 
              waitUntil: 'networkidle',
              timeout: this.getBrowserTimeout('navigation')
            });
            await this.waitForArticles();
            // Wait for page to fully load
            await this.page.waitForTimeout(1000);
          } else {
            // First page is already loaded
            await this.waitForArticles();
          }
          
          const pageArticles = await this.page.$$(this.getSelector('articleRows'));
          console.log(`    📄 Page ${pageNum}: Found ${pageArticles.length} articles`);
          
          // Extract data from articles on this page with parallel processing
          const articlePromises = [];
          for (let i = 0; i < pageArticles.length && allArticleData.length < count; i++) {
            articlePromises.push(this.extractArticleData(pageArticles[i]));
          }
          
          const pageArticleData = await Promise.all(articlePromises);
          const validArticles = pageArticleData.filter(article => article && article.timestamp);
          
          allArticleData.push(...validArticles.slice(0, count - allArticleData.length));
          
          console.log(`    📄 Page ${pageNum}: Total collected: ${allArticleData.length}/${count}`);
          
          pageSuccess = true;
          break;
        } catch (error) {
          lastError = error;
          console.log(`    Page ${pageNum} attempt ${retry} failed: ${error.message}`);
          
          if (retry < maxRetries) {
            await this.page.waitForTimeout(1000 * retry);
          }
        }
      }
      
      if (!pageSuccess) {
        console.warn(`    Skipping page ${pageNum} after ${maxRetries} failed attempts: ${lastError.message}`);
        break;
      }
      
      // Get the More link for next page using browser-specific selector
      if (allArticleData.length < count) {
        const moreLinkSelector = this.getSelector('moreLink');
        const moreLink = await this.page.$(moreLinkSelector);
        if (moreLink) {
          const moreHref = await moreLink.getAttribute('href');
          if (moreHref) {
            currentUrl = `https://news.ycombinator.com/${moreHref}`;
            pageNum++;
          } else {
            console.log(`    No more pages available (no href) - ${this.browserName}`);
            break;
          }
        } else {
          console.log(`    No more pages available (no More link) - ${this.browserName}`);
          break;
        }
      }
    }
    
    console.log(`    ✅ Collected ${allArticleData.length} articles from ${pageNum} pages`);
    
    if (allArticleData.length < count) {
      console.warn(`Warning: Only found ${allArticleData.length} articles, but ${count} were requested`);
    }
    
    return allArticleData.slice(0, count);
  }

  // Ensure the specified number of articles are loaded by clicking More links
  async ensureArticlesLoaded(targetCount) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const currentCount = await this.page.$$eval(this.selectors.articleRows, els => els.length);
      console.log(`    Currently loaded: ${currentCount} articles (target: ${targetCount})`);
      
      if (currentCount >= targetCount) {
        break;
      }
      
      // Look for the More link to load additional articles
      const moreLink = await this.page.$('.morelink');
      if (moreLink) {
        console.log(`    Clicking "More" to load additional articles...`);
        
        // Click the More link
        await moreLink.click();
        
        // Wait for new articles to load
        await this.page.waitForTimeout(2000);
        
        // Wait for new articles to appear
        try {
          await this.page.waitForFunction(
            (prevCount) => document.querySelectorAll('.athing').length > prevCount,
            { timeout: 10000 },
            currentCount
          );
        } catch (error) {
          console.log(`    No new articles loaded after clicking More`);
          break;
        }
      } else {
        console.log(`    No "More" link found, stopping at ${currentCount} articles`);
        break;
      }
      
      attempts++;
    }
    
    const finalCount = await this.page.$$eval(this.selectors.articleRows, els => els.length);
    console.log(`    Final article count: ${finalCount}`);
    
    if (finalCount < targetCount) {
      console.warn(`Warning: Could only load ${finalCount} articles out of ${targetCount} requested`);
    }
  }

  // Extract comprehensive article data with enhanced error handling
  async extractArticleData(articleElement) {
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const articleId = await articleElement.getAttribute('id');
        
        // Get title and URL with HN-specific DOM structure understanding
        let titleElement, title = 'No title', url = null;
        
        // HN structure: .athing row contains just the ranking, title is in the next row
        // Try multiple strategies for Firefox compatibility
        const titleStrategies = [
          // Strategy 1: Look for title link directly in the article element - this is where titles actually are!
          () => articleElement.$('a[href^="http"]:not([href*="vote"]):not([href*="from?site"]), a[href^="//"]:not([href*="vote"]):not([href*="from?site"])'),
          // Strategy 2: Look for storylink in current article row
          () => articleElement.$('.storylink, .titlelink'),
          // Strategy 3: Look for external link in current row (exclude vote and site links)
          () => articleElement.$('a[href*="http"]:not([href*="vote"]):not([href*="from"])'),
          // Strategy 4: Look in the next sibling row (fallback for some layouts)
          () => this.page.$(`.athing[id="${articleId}"] + tr .storylink:not(.age)`),
          // Strategy 5: Firefox-specific fallback - look for title in next row if not found in current
          () => this.browserName === 'firefox' 
            ? this.page.$(`tr[id="${articleId}"] + tr .storylink:not(.age)`)
            : null
        ];
        
        for (const strategy of titleStrategies) {
          try {
            const element = await strategy();
            if (element) {
              const extractedTitle = await element.textContent();
              const extractedUrl = await element.getAttribute('href');
              
              // Validate this is actually a title, not a timestamp or other element
              const isValidTitle = extractedTitle && 
                                 extractedTitle.trim() && 
                                 extractedTitle !== 'Comments' &&
                                 !extractedTitle.includes('ago') && // Not a timestamp
                                 !extractedTitle.includes('minute') &&
                                 !extractedTitle.includes('hour') &&
                                 !extractedTitle.includes('day') &&
                                 extractedTitle.length > 5; // Reasonable title length
              
              if (isValidTitle) {
                titleElement = element;
                title = extractedTitle.trim();
                url = extractedUrl;
                break;
              }
            }
          } catch (e) {
            // Continue to next strategy
            continue;
          }
        }
        
        // Last resort: debug logging for Firefox
        if (title === 'No title' && this.browserName === 'firefox') {
          try {
            console.log(`    Firefox Debug - Article ${articleId}: No title found, checking DOM structure...`);
            const nextRow = await this.page.$(`[id="${articleId}"] + tr`);
            if (nextRow) {
              const allLinks = await nextRow.$$('a');
              console.log(`    Firefox Debug - Found ${allLinks.length} links in next row`);
              for (let i = 0; i < Math.min(allLinks.length, 3); i++) {
                const linkText = await allLinks[i].textContent();
                const linkHref = await allLinks[i].getAttribute('href');
                console.log(`    Firefox Debug - Link ${i}: "${linkText}" -> ${linkHref}`);
              }
            }
          } catch (debugError) {
            // Debug logging failed, continue
          }
        }
        
        // Enhanced metadata extraction with HN DOM-aware strategies
        const metaSelector = `#score_${articleId}`;
        const authorSelectors = [
          // Standard HN structure: author is in the next row after the article
          `tr[id="${articleId}"] + tr .hnuser`,
          `[id="${articleId}"] + tr .hnuser`,
          `.athing[id="${articleId}"] + tr .hnuser`,
          // Fallback selectors
          `.hnuser`,
          `a[href*="user?id"]`
        ];
        const timestampSelectors = [
          // Standard HN structure: timestamp is in the next row after the article
          `tr[id="${articleId}"] + tr .age`,
          `[id="${articleId}"] + tr .age`,
          `.athing[id="${articleId}"] + tr .age`,
          // Fallback selectors
          `.age`,
          `[title*="ago"]`
        ];
        
        // Extract score with HN DOM-aware retry
        let score = null;
        const scoreSelectors = [
          `#score_${articleId}`,
          `tr[id="${articleId}"] + tr .score`,
          `[id="${articleId}"] + tr .score`,
          `.athing[id="${articleId}"] + tr .score`
        ];
        
        for (const scoreSelector of scoreSelectors) {
          try {
            const scoreElement = await this.page.$(scoreSelector);
            if (scoreElement) {
              const scoreText = await scoreElement.textContent();
              score = parseInt(scoreText.replace(' points', '')) || 0;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (score === null) {
          score = 0; // Default for articles without scores
        }
        
        // Extract author with fallback selectors
        let author = null;
        for (const selector of authorSelectors) {
          try {
            const authorElement = await this.page.$(selector);
            if (authorElement) {
              author = await authorElement.textContent();
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        // Extract timestamp - critical for sorting validation
        let timestamp = null;
        let timestampText = '';
        for (const selector of timestampSelectors) {
          try {
            const timestampElement = await this.page.$(selector);
            if (timestampElement) {
              timestampText = await timestampElement.textContent();
              timestamp = this.parseHackerNewsTimestamp(timestampText);
              if (timestamp) break; // Use first valid timestamp
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        // Validate extracted data
        if (!timestamp) {
          throw new Error(`No valid timestamp found for article ${articleId}`);
        }
        
        return {
          id: articleId,
          title: title.trim(),
          url,
          score,
          author,
          timestampText,
          timestamp,
          rawTimestamp: timestampText,
          extractionAttempt: attempt
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`    Article extraction attempt ${attempt} failed, retrying...`);
          await this.page.waitForTimeout(500);
        }
      }
    }
    
    console.error(`Error extracting article data after ${maxRetries} attempts:`, lastError?.message);
    return null;
  }

  // Parse HN timestamp format (e.g., "2 hours ago", "1 day ago", "just now")
  parseHackerNewsTimestamp(timestampText) {
    if (!timestampText) return null;
    
    const text = timestampText.toLowerCase().trim();
    const now = moment();
    
    // Handle "just now" or "now"
    if (text.includes('just now') || text === 'now') {
      return now.toDate();
    }
    
    // Extract number and unit
    const match = text.match(/(\d+)\s*(minute|hour|day|month|year)s?\s*ago/);
    if (!match) {
      console.warn(`Could not parse timestamp: "${timestampText}"`);
      return null;
    }
    
    const [, amount, unit] = match;
    const value = parseInt(amount);
    
    switch (unit) {
      case 'minute':
        return now.subtract(value, 'minutes').toDate();
      case 'hour':
        return now.subtract(value, 'hours').toDate();
      case 'day':
        return now.subtract(value, 'days').toDate();
      case 'month':
        return now.subtract(value, 'months').toDate();
      case 'year':
        return now.subtract(value, 'years').toDate();
      default:
        console.warn(`Unknown time unit: ${unit}`);
        return null;
    }
  }

  // Validate that articles are sorted from newest to oldest
  async validateSorting(articles) {
    const results = {
      isValid: true,
      totalArticles: articles.length,
      invalidPairs: [],
      timestamps: [],
      errors: []
    };
    
    for (let i = 0; i < articles.length - 1; i++) {
      const current = articles[i];
      const next = articles[i + 1];
      
      if (!current.timestamp || !next.timestamp) {
        results.errors.push({
          position: i,
          error: 'Missing timestamp',
          current: current.timestampText,
          next: next.timestampText
        });
        continue;
      }
      
      results.timestamps.push({
        position: i,
        timestamp: current.timestamp,
        text: current.timestampText
      });
      
      // Current article should be newer (timestamp should be greater)
      if (current.timestamp < next.timestamp) {
        results.isValid = false;
        results.invalidPairs.push({
          position: i,
          currentTitle: current.title,
          currentTime: current.timestampText,
          nextTitle: next.title,
          nextTime: next.timestampText,
          timeDifference: moment(next.timestamp).diff(moment(current.timestamp), 'minutes')
        });
      }
    }
    
    // Add the last timestamp
    if (articles.length > 0 && articles[articles.length - 1].timestamp) {
      results.timestamps.push({
        position: articles.length - 1,
        timestamp: articles[articles.length - 1].timestamp,
        text: articles[articles.length - 1].timestampText
      });
    }
    
    return results;
  }

  // Take screenshot for debugging with retry logic
  async takeScreenshot(filename = 'hacker-news-debug.png') {
    const screenshotPath = `./reports/${filename}`;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.screenshot({ 
          path: screenshotPath, 
          fullPage: true,
          timeout: 10000
        });
        console.log(`Screenshot saved: ${screenshotPath}`);
        return screenshotPath;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`Failed to take screenshot after ${maxRetries} attempts:`, error.message);
          throw error;
        }
        console.log(`Screenshot attempt ${attempt} failed, retrying...`);
        await this.page.waitForTimeout(1000);
      }
    }
  }

  // Get page performance metrics
  async getPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        totalSize: performance.getEntriesByType('resource').reduce((total, resource) => {
          return total + (resource.transferSize || 0);
        }, 0)
      };
    });
    
    return metrics;
  }

  // Check for accessibility issues
  async checkAccessibility() {
    try {
      // Try different import methods for axe-playwright
      let AxeBuilder;
      try {
        AxeBuilder = require('@axe-core/playwright').default;
      } catch (e) {
        try {
          const axePlaywright = require('@axe-core/playwright');
          AxeBuilder = axePlaywright.AxeBuilder || axePlaywright.default;
        } catch (e2) {
          console.warn('Accessibility testing not available: axe-playwright import failed');
          return {
            violations: [],
            passes: [],
            incomplete: [],
            skipped: true,
            reason: 'Import failed'
          };
        }
      }
      
      const accessibilityScanResults = await new AxeBuilder({ page: this.page }).analyze();
      
      return {
        violations: accessibilityScanResults.violations || [],
        passes: accessibilityScanResults.passes || [],
        incomplete: accessibilityScanResults.incomplete || [],
        skipped: false
      };
    } catch (error) {
      console.warn('Accessibility check failed:', error.message);
      return {
        violations: [],
        passes: [],
        incomplete: [],
        skipped: true,
        reason: error.message
      };
    }
  }
}

module.exports = HackerNewsPage;