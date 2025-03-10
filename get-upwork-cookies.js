/**
 * Upwork Cookie Extractor
 * 
 * This script helps you get cookies from Upwork to use with the scraper.
 * It launches a browser where you can log in to Upwork, then extracts
 * the cookies for use in the scraper.
 * 
 * Usage:
 * 1. Run this script: node get-upwork-cookies.js
 * 2. Log in to Upwork in the browser that opens
 * 3. After logging in, the cookies will be saved to upwork-cookies.json
 * 4. Update the upwork-scraper.js file to use these cookies
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getUpworkCookies() {
  console.log('Launching browser to get Upwork cookies...');
  
  // Launch a new browser instance
  const browser = await puppeteer.launch({
    headless: false, // Show the browser so user can log in
    defaultViewport: null, // Use default viewport
    args: ['--start-maximized'] // Start with maximized window
  });
  
  try {
    // Open a new page
    const page = await browser.newPage();
    
    // Navigate to Upwork
    console.log('Navigating to Upwork...');
    await page.goto('https://www.upwork.com/');
    
    // Wait for the user to log in
    console.log('\n=== INSTRUCTIONS ===');
    console.log('1. Log in to your Upwork account in the browser');
    console.log('2. After logging in, navigate to the freelancer search page');
    console.log('3. Once you are logged in and on the search page, press Enter in this terminal');
    console.log('=====================\n');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', data => {
        resolve();
      });
    });
    
    // Get all cookies
    const cookies = await page.cookies();
    
    // Save cookies to file
    const cookiesPath = path.join(__dirname, 'upwork-cookies.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    
    console.log(`\nCookies saved to ${cookiesPath}`);
    console.log(`Found ${cookies.length} cookies`);
    
    // Instructions for using the cookies
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Open upwork-scraper.js');
    console.log('2. Find the line with: const cookies = {}; // You would need to get real cookies from a browser session');
    console.log('3. Replace it with: const cookies = require(\'./upwork-cookies.json\').reduce((obj, cookie) => { obj[cookie.name] = cookie.value; return obj; }, {});');
    console.log('4. Uncomment the withCredentials and Cookie header lines');
    console.log('=====================\n');
    
    console.log('Press Enter to close the browser...');
    await new Promise(resolve => {
      process.stdin.once('data', data => {
        resolve();
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the browser
    await browser.close();
    console.log('Browser closed');
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  // Run the function
  getUpworkCookies().catch(console.error);
} catch (e) {
  console.error('Puppeteer is not installed. Please install it with:');
  console.error('npm install puppeteer');
  process.exit(1);
}
