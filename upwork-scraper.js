/**
 * Upwork Profile Scraper
 * 
 * This module scrapes Upwork profiles of full-stack developers
 * to extract their GitHub account URLs.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Regular expression to match GitHub URLs
const githubUrlRegex = /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/gi;

/**
 * Extract GitHub username from a GitHub URL
 * @param {string} url - GitHub URL
 * @returns {string|null} - GitHub username or null if invalid
 */
function extractGitHubUsername(url) {
  if (!url) return null;
  
  // Reset regex lastIndex to ensure it works correctly with multiple calls
  githubUrlRegex.lastIndex = 0;
  const match = githubUrlRegex.exec(url);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

// Array of user agents to rotate through
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
];

/**
 * Get a random user agent from the list
 * @returns {string} - Random user agent
 */
function getRandomUserAgent() {
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search for full-stack developer profiles on Upwork
 * @param {number} page - Page number for pagination
 * @returns {Promise<Array<string>>} - Array of GitHub usernames
 */
async function searchUpworkProfiles(page = 1) {
  try {
    console.log(`Searching Upwork for full-stack developer profiles - Page ${page}`);
    
    // Add a random delay between 3-7 seconds to mimic human behavior
    const delay = 3000 + Math.floor(Math.random() * 4000);
    console.log(`Waiting ${delay/1000} seconds before making the request...`);
    await sleep(delay);
    
    // Upwork search URL for full-stack developers
    const url = `https://www.upwork.com/search/profiles/?q=full-stack%20developer&page=${page}`;
    
    // Get a random user agent
    const userAgent = getRandomUserAgent();
    console.log(`Using user agent: ${userAgent}`);
    
    // Set up cookies (if available)
    const cookies = require('./upwork-cookies.json').reduce((obj, cookie) => { obj[cookie.name] = cookie.value; return obj; }, {}); // You would need to get real cookies from a browser session
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': page > 1 ? `https://www.upwork.com/search/profiles/?q=full-stack%20developer&page=${page-1}` : 'https://www.upwork.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Pragma': 'no-cache'
      },
      // Uncomment if you have cookies
      // withCredentials: true,
      // headers: {
      //   'Cookie': Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
      // },
      timeout: 30000, // 30 second timeout
      maxRedirects: 5
    });
    
    // Parse HTML
    const $ = cheerio.load(response.data);
    const profileLinks = [];
    
    // Extract profile links
    // Note: Selector may need to be updated if Upwork changes their HTML structure
    $('.freelancer-tile-name a').each((i, element) => {
      const profileUrl = $(element).attr('href');
      if (profileUrl) {
        profileLinks.push(`https://www.upwork.com${profileUrl}`);
      }
    });
    
    console.log(`Found ${profileLinks.length} profiles on page ${page}`);
    
    // Scrape each profile
    const githubUsernames = [];
    for (const profileUrl of profileLinks) {
      const usernames = await scrapeUpworkProfile(profileUrl);
      githubUsernames.push(...usernames);
    }
    
    return githubUsernames;
  } catch (error) {
    console.error('Error searching Upwork profiles:', error.message);
    return [];
  }
}

/**
 * Scrape a single Upwork profile for GitHub URLs
 * @param {string} profileUrl - Upwork profile URL
 * @returns {Promise<Array<string>>} - Array of GitHub usernames
 */
async function scrapeUpworkProfile(profileUrl) {
  try {
    console.log(`Scraping Upwork profile: ${profileUrl}`);
    
    // Add a random delay between 2-5 seconds to mimic human behavior
    const delay = 2000 + Math.floor(Math.random() * 3000);
    console.log(`Waiting ${delay/1000} seconds before making the request...`);
    await sleep(delay);
    
    // Get a random user agent
    const userAgent = getRandomUserAgent();
    console.log(`Using user agent: ${userAgent}`);
    
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.upwork.com/search/profiles/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Pragma': 'no-cache'
      },
      timeout: 30000, // 30 second timeout
      maxRedirects: 5
    });
    
    // Parse HTML
    const $ = cheerio.load(response.data);
    const githubUsernames = new Set();
    
    // Look for GitHub URLs in the profile description
    // Note: Selectors may need to be updated if Upwork changes their HTML structure
    const profileText = $('.profile-overview').text();
    const portfolioText = $('.portfolio-section').text();
    const experienceText = $('.experience-section').text();
    const fullText = `${profileText} ${portfolioText} ${experienceText}`;
    
    // Find all GitHub URLs in the text
    let match;
    while ((match = githubUrlRegex.exec(fullText)) !== null) {
      const username = extractGitHubUsername(match[0]);
      if (username) {
        githubUsernames.add(username);
        console.log(`Found GitHub username in profile: ${username}`);
      }
    }
    
    // Look for GitHub URLs in portfolio links
    $('.portfolio-item a, .social-link a, .external-link a').each((i, element) => {
      const href = $(element).attr('href');
      const username = extractGitHubUsername(href);
      if (username) {
        githubUsernames.add(username);
        console.log(`Found GitHub username in links: ${username}`);
      }
    });
    
    return Array.from(githubUsernames);
  } catch (error) {
    console.error(`Error scraping Upwork profile ${profileUrl}:`, error.message);
    return [];
  }
}

/**
 * Main function to search Upwork profiles and extract GitHub usernames
 * @param {number} maxPages - Maximum number of Upwork search pages to scrape (0 for unlimited)
 * @returns {Promise<Array<string>>} - Array of GitHub usernames
 */
async function findGitHubAccountsFromUpwork(maxPages = 0) {
  const allUsernames = new Set();
  let page = 1;
  let continueSearch = true;
  
  console.log(`Starting to scrape Upwork profiles of full-stack developers${maxPages > 0 ? ` (max ${maxPages} pages)` : ''}`);
  
  while (continueSearch) {
    // Check if we've reached the maximum number of pages
    if (maxPages > 0 && page > maxPages) {
      console.log(`Reached maximum number of pages (${maxPages}). Stopping search.`);
      break;
    }
    
    const usernames = await searchUpworkProfiles(page);
    
    // If we didn't find any profiles on this page, we've likely reached the end
    if (usernames.length === 0) {
      console.log(`No profiles found on page ${page}. Stopping search.`);
      break;
    }
    
    // Add usernames to the set
    usernames.forEach(username => allUsernames.add(username));
    
    console.log(`Total unique GitHub usernames found so far: ${allUsernames.size}`);
    
    // Move to the next page
    page++;
    
    // Add a small delay to avoid being blocked by Upwork
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`Finished scraping Upwork profiles. Found ${allUsernames.size} unique GitHub usernames.`);
  return Array.from(allUsernames);
}

module.exports = {
  findGitHubAccountsFromUpwork,
  searchUpworkProfiles,
  scrapeUpworkProfile,
  extractGitHubUsername
};
