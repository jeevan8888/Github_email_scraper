/**
 * Puppeteer-based Upwork and GitHub Scraper
 * 
 * This script uses Puppeteer to:
 * 1. Search for full-stack developers on Upwork
 * 2. Extract GitHub links from their profiles
 * 3. Visit those GitHub profiles to extract email addresses
 * 4. Save the results to a JSON file
 * 
 * This approach is more reliable than using axios because it uses a real browser.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Store unique email addresses and their sources
const emailData = [];
const processedGithubUrls = new Set();

/**
 * Extract GitHub URLs from text
 * @param {string} text - Text to search for GitHub URLs
 * @returns {Array<string>} - Array of GitHub URLs
 */
function extractGitHubUrls(text) {
  const githubUrlRegex = /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)(?:\/[a-zA-Z0-9_-]+)*/gi;
  const urls = [];
  let match;
  
  while ((match = githubUrlRegex.exec(text)) !== null) {
    urls.push(match[0]);
  }
  
  return urls;
}

/**
 * Extract email addresses from text
 * @param {string} text - Text to search for email addresses
 * @returns {Array<string>} - Array of email addresses
 */
function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

/**
 * Get GitHub profile URL from repository URL
 * @param {string} url - GitHub URL
 * @returns {string} - GitHub profile URL
 */
function getGitHubProfileUrl(url) {
  // Extract username from GitHub URL
  const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return `https://github.com/${match[1]}`;
  }
  return url;
}

/**
 * Scrape Upwork profiles for GitHub links
 * @param {number} maxPages - Maximum number of Upwork search pages to scrape
 * @returns {Promise<Array<string>>} - Array of GitHub URLs
 */
async function scrapeUpworkProfiles(browser, maxPages = 2) {
  console.log('Starting to scrape Upwork profiles for GitHub links...');
  
  const githubUrls = new Set();
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to Upwork search page for full-stack developers
    console.log('Navigating to Upwork search page...');
    await page.goto('https://www.upwork.com/search/profiles/?q=full-stack%20developer', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for search results to load
    await page.waitForSelector('.freelancer-tile', { timeout: 30000 }).catch(() => {
      console.log('Could not find freelancer tiles, but continuing...');
    });
    
    // Process search results pages
    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      console.log(`Processing Upwork search page ${currentPage}...`);
      
      // Get all profile links on the current page
      const profileLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('.freelancer-tile-name a').forEach(el => {
          if (el.href) links.push(el.href);
        });
        return links;
      });
      
      console.log(`Found ${profileLinks.length} profiles on page ${currentPage}`);
      
      // Visit each profile and extract GitHub links
      for (const profileUrl of profileLinks) {
        try {
          console.log(`Visiting profile: ${profileUrl}`);
          
          // Navigate to the profile
          await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Wait for profile content to load
          await page.waitForSelector('.profile-layout', { timeout: 20000 }).catch(() => {
            console.log('Could not find profile layout, but continuing...');
          });
          
          // Extract page content
          const pageContent = await page.content();
          
          // Extract GitHub URLs from the page content
          const urls = extractGitHubUrls(pageContent);
          
          if (urls.length > 0) {
            console.log(`Found ${urls.length} GitHub URLs in profile`);
            urls.forEach(url => {
              const profileUrl = getGitHubProfileUrl(url);
              githubUrls.add(profileUrl);
            });
          } else {
            console.log('No GitHub URLs found in this profile');
          }
          
          // Add a small delay between profile visits
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
          
        } catch (error) {
          console.error(`Error processing profile ${profileUrl}:`, error.message);
        }
      }
      
      // Check if there's a next page and we haven't reached the max pages
      if (currentPage < maxPages) {
        const hasNextPage = await page.evaluate(() => {
          const nextButton = document.querySelector('button[aria-label="Next"]');
          return nextButton && !nextButton.disabled;
        });
        
        if (hasNextPage) {
          console.log('Navigating to next page...');
          await Promise.all([
            page.click('button[aria-label="Next"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          ]);
          
          // Wait for search results to load
          await page.waitForSelector('.freelancer-tile', { timeout: 30000 }).catch(() => {
            console.log('Could not find freelancer tiles, but continuing...');
          });
          
          // Add a delay between page navigations
          await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        } else {
          console.log('No more pages available');
          break;
        }
      }
    }
    
    // Close the page
    await page.close();
    
    console.log(`Found ${githubUrls.size} unique GitHub URLs from Upwork profiles`);
    return Array.from(githubUrls);
    
  } catch (error) {
    console.error('Error scraping Upwork profiles:', error.message);
    return Array.from(githubUrls);
  }
}

/**
 * Scrape GitHub profile for email addresses
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} githubUrl - GitHub profile URL
 * @returns {Promise<Array<Object>>} - Array of email data objects
 */
async function scrapeGitHubProfile(browser, githubUrl) {
  console.log(`Scraping GitHub profile: ${githubUrl}`);
  
  // Check if we've already processed this URL
  if (processedGithubUrls.has(githubUrl)) {
    console.log(`Already processed ${githubUrl}, skipping`);
    return [];
  }
  
  processedGithubUrls.add(githubUrl);
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to GitHub profile
    await page.goto(githubUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for profile content to load
    await page.waitForSelector('.js-profile-editable-area', { timeout: 20000 }).catch(() => {
      console.log('Could not find profile area, but continuing...');
    });
    
    // Extract email from profile
    const profileEmails = await page.evaluate(() => {
      const emails = [];
      
      // Check for email in profile
      const emailElements = document.querySelectorAll('.js-profile-editable-area a[href^="mailto:"]');
      emailElements.forEach(el => {
        const email = el.href.replace('mailto:', '');
        if (email) emails.push(email);
      });
      
      return emails;
    });
    
    // Get username from URL
    const username = githubUrl.split('/').pop();
    
    // Check repositories for emails
    console.log(`Checking repositories for ${username}...`);
    
    // Navigate to repositories tab
    await page.goto(`${githubUrl}?tab=repositories`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for repositories to load
    await page.waitForSelector('#user-repositories-list', { timeout: 20000 }).catch(() => {
      console.log('Could not find repositories list, but continuing...');
    });
    
    // Get repository links
    const repoLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('#user-repositories-list h3 a').forEach(el => {
        if (el.href) links.push(el.href);
      });
      return links.slice(0, 3); // Limit to first 3 repositories
    });
    
    console.log(`Found ${repoLinks.length} repositories`);
    
    // Process each repository
    const repoEmails = [];
    
    for (const repoUrl of repoLinks) {
      try {
        console.log(`Checking repository: ${repoUrl}`);
        
        // Navigate to repository
        await page.goto(repoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check README for emails
        // Navigate to README if it exists
        const readmeLink = await page.$('a[title="README.md"]');
        if (readmeLink) {
          await readmeLink.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
          
          // Extract README content
          const readmeContent = await page.evaluate(() => {
            return document.querySelector('#readme').innerText;
          });
          
          // Extract emails from README
          const emails = extractEmails(readmeContent);
          emails.forEach(email => {
            if (!email.includes('noreply.github.com')) {
              repoEmails.push({
                email,
                source: `${repoUrl} (README)`
              });
            }
          });
        }
        
        // Add a small delay between repository visits
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
      } catch (error) {
        console.error(`Error processing repository ${repoUrl}:`, error.message);
      }
    }
    
    // Close the page
    await page.close();
    
    // Combine all found emails
    const allEmails = [
      ...profileEmails.map(email => ({ email, source: `${githubUrl} (Profile)` })),
      ...repoEmails
    ];
    
    console.log(`Found ${allEmails.length} email addresses for ${username}`);
    return allEmails;
    
  } catch (error) {
    console.error(`Error scraping GitHub profile ${githubUrl}:`, error.message);
    return [];
  }
}

/**
 * Main function to scrape Upwork and GitHub
 * @param {number} maxPages - Maximum number of Upwork search pages to scrape
 */
async function main(maxPages = 2) {
  console.log('Starting Upwork and GitHub scraper...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    // Scrape Upwork profiles for GitHub links
    const githubUrls = await scrapeUpworkProfiles(browser, maxPages);
    
    console.log(`Processing ${githubUrls.length} GitHub profiles...`);
    
    // Scrape each GitHub profile for email addresses
    for (const githubUrl of githubUrls) {
      const emails = await scrapeGitHubProfile(browser, githubUrl);
      emailData.push(...emails);
    }
    
    // Save results to file
    const outputPath = path.join(__dirname, 'fullstack-developer-emails.json');
    fs.writeFileSync(outputPath, JSON.stringify(emailData, null, 2));
    
    console.log(`Saved ${emailData.length} email addresses to ${outputPath}`);
    
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Close browser
    await browser.close();
    console.log('Browser closed');
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const maxPages = args.length > 0 ? parseInt(args[0]) : 2;
  
  // Run the main function
  main(maxPages).catch(console.error);
} catch (e) {
  console.error('Puppeteer is not installed. Please install it with:');
  console.error('npm install puppeteer');
  process.exit(1);
}
