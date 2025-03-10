/**
 * Example of how to use the GitHub email scraper programmatically
 * 
 * This script demonstrates how to import and use the scraper functions
 * in your own Node.js applications.
 */

// Import the main functions from index.js
const { 
  findEmailsFromUpworkDevelopers, 
  searchJavaScriptDevelopers,
  processGitHubUser
} = require('./index');

// Import the Upwork scraper functions
const upworkScraper = require('./upwork-scraper');

/**
 * Run examples of different ways to use the scraper
 */
async function runExamples() {
  console.log('=== GitHub Email Scraper Examples ===\n');
  
  // Example 1: Process a specific GitHub user
  console.log('Example 1: Process a specific GitHub user');
  console.log('---------------------------------------');
  await processSpecificUser('octocat');
  console.log('\n');
  
  // Example 2: Search JavaScript repositories (uncomment to run)
  console.log('Example 2: Search JavaScript repositories with custom parameters');
  console.log('--------------------------------------------------------------');
  console.log('// Uncomment the code in runExamples() to run this example');
  // await searchJavaScriptWithCustomParams();
  console.log('\n');
  
  // Example 3: Find GitHub accounts from Upwork (uncomment to run)
  console.log('Example 3: Find GitHub accounts from Upwork');
  console.log('------------------------------------------');
  console.log('// Uncomment the code in runExamples() to run this example');
  // await findUpworkDevelopers();
  console.log('\n');
  
  // Example 4: Custom integration
  console.log('Example 4: Custom integration example');
  console.log('------------------------------------');
  console.log('// See the code comments for integration examples');
}

/**
 * Example 1: Process a specific GitHub user
 * @param {string} username - GitHub username to process
 */
async function processSpecificUser(username) {
  console.log(`Processing GitHub user: ${username}`);
  await processGitHubUser(username);
  console.log('Processing complete. Check the console output for any found emails.');
}

/**
 * Example 2: Search JavaScript repositories with custom parameters
 */
async function searchJavaScriptWithCustomParams() {
  console.log('Searching for JavaScript repositories with custom parameters');
  
  // Custom options for the search
  const options = {
    mode: 'javascript',
    searchQuery: 'language:javascript topic:react stars:>1000',
    reposPerPage: 3,
    pageLimit: 1
  };
  
  // Run the search
  const emails = await searchJavaScriptDevelopers(options);
  console.log(`Found ${emails.length} unique email addresses`);
}

/**
 * Example 3: Find GitHub accounts from Upwork
 */
async function findUpworkDevelopers() {
  console.log('Finding GitHub accounts from Upwork profiles');
  
  // Custom options for the Upwork search
  const maxPages = 2; // Set to 0 for unlimited pages
  
  // Run the search
  const emails = await findEmailsFromUpworkDevelopers(maxPages);
  console.log(`Found ${emails.length} unique email addresses`);
}

// Run the examples
runExamples().catch(console.error);

/**
 * How to use this in your own project:
 * 
 * 1. Import the functions you need from index.js
 * 2. Customize the parameters and processing logic
 * 3. Integrate with your application's workflow
 * 
 * Example integration with Express:
 * 
 * const express = require('express');
 * const { processGitHubUser, findEmailsFromUpworkDevelopers } = require('./github-email-scraper');
 * 
 * const app = express();
 * 
 * // Endpoint to find emails for a specific GitHub user
 * app.get('/github-user/:username', async (req, res) => {
 *   try {
 *     const { username } = req.params;
 *     await processGitHubUser(username);
 *     res.json({ success: true, message: 'User processed successfully' });
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * 
 * // Endpoint to find emails from Upwork developers
 * app.get('/upwork-developers', async (req, res) => {
 *   try {
 *     const { maxPages = 0 } = req.query;
 *     const emails = await findEmailsFromUpworkDevelopers(parseInt(maxPages));
 *     res.json({ emails });
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * 
 * app.listen(3000, () => console.log('Server running on port 3000'));
 */
