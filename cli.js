#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { main } = require('./index');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print a colored message to the console
 * @param {string} message - The message to print
 * @param {string} color - The color to use
 */
function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Ask a question and get user input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - The user's answer
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Check if GitHub token exists in .env file
 * @returns {boolean} - Whether the token exists
 */
function checkGitHubToken() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      return false;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const tokenMatch = envContent.match(/GITHUB_TOKEN=(.+)/);
    
    return tokenMatch && tokenMatch[1] && tokenMatch[1].trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Save GitHub token to .env file
 * @param {string} token - The GitHub token
 */
function saveGitHubToken(token) {
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace existing token or add new one
    if (envContent.includes('GITHUB_TOKEN=')) {
      envContent = envContent.replace(/GITHUB_TOKEN=.*/, `GITHUB_TOKEN=${token}`);
    } else {
      envContent += `\nGITHUB_TOKEN=${token}`;
    }
  } else {
    envContent = `# GitHub Personal Access Token\n# Create one at https://github.com/settings/tokens\n# Required scopes: public_repo, read:user, user:email\nGITHUB_TOKEN=${token}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  colorLog('GitHub token saved to .env file', 'green');
}

/**
 * Update the index.js file with user-specified parameters
 * @param {Object} options - The options to update
 */
function updateScraperOptions(options) {
  const indexPath = path.join(__dirname, 'index.js');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Update search query
  if (options.searchQuery) {
    indexContent = indexContent.replace(
      /q: ['"]language:javascript['"],/,
      `q: '${options.searchQuery}',`
    );
  }
  
  // Update repositories per page
  if (options.reposPerPage) {
    indexContent = indexContent.replace(
      /per_page: \d+, \/\/ Limit to \d+ repos per page/,
      `per_page: ${options.reposPerPage}, // Limit to ${options.reposPerPage} repos per page`
    );
  }
  
  // Update page limit
  if (options.pageLimit) {
    indexContent = indexContent.replace(
      /page < \d+\) { \/\/ Limit to \d+ pages/,
      `page < ${options.pageLimit}) { // Limit to ${options.pageLimit} pages`
    );
  }
  
  // Update contributors per repo
  if (options.contributorsPerRepo) {
    indexContent = indexContent.replace(
      /per_page: \d+, \/\/ Limit to \d+ contributors/,
      `per_page: ${options.contributorsPerRepo}, // Limit to ${options.contributorsPerRepo} contributors`
    );
  }
  
  fs.writeFileSync(indexPath, indexContent);
  colorLog('Scraper options updated successfully', 'green');
}

/**
 * Main CLI function
 */
async function cliMain() {
  colorLog('\n=== GitHub Email Scraper ===', 'bright');
  colorLog('This tool helps you find email addresses of developers on GitHub\n', 'cyan');
  
  // Check for GitHub token
  const hasToken = checkGitHubToken();
  if (!hasToken) {
    colorLog('⚠️  No GitHub token found in .env file', 'yellow');
    colorLog('Without a token, API requests will be rate-limited to 60 per hour', 'yellow');
    
    const addToken = await askQuestion('Would you like to add a GitHub token now? (y/n): ');
    if (addToken.toLowerCase() === 'y') {
      colorLog('\nTo create a GitHub token:', 'cyan');
      colorLog('1. Go to https://github.com/settings/tokens', 'cyan');
      colorLog('2. Click "Generate new token"', 'cyan');
      colorLog('3. Select scopes: public_repo, read:user, user:email', 'cyan');
      colorLog('4. Copy the generated token\n', 'cyan');
      
      const token = await askQuestion('Enter your GitHub token: ');
      if (token.trim()) {
        saveGitHubToken(token.trim());
      }
    }
  } else {
    colorLog('✅ GitHub token found in .env file', 'green');
  }
  
  // Choose scraping mode
  colorLog('\nChoose scraping mode:', 'bright');
  colorLog('1. Search JavaScript repositories on GitHub', 'cyan');
  colorLog('2. Find full-stack developers on Upwork and get their GitHub emails', 'cyan');
  
  const modeChoice = await askQuestion('\nEnter your choice (1 or 2): ');
  const mode = modeChoice === '2' ? 'upwork' : 'javascript';
  
  let options = {};
  
  if (mode === 'javascript') {
    // Configure JavaScript scraper options
    colorLog('\nConfigure JavaScript scraper options (press Enter to use defaults):', 'bright');
    
    const searchQuery = await askQuestion('Search query (default: "language:javascript"): ');
    const reposPerPage = await askQuestion('Repositories per page (default: 10): ');
    const pageLimit = await askQuestion('Number of pages to scrape (default: 3): ');
    const contributorsPerRepo = await askQuestion('Contributors per repository (default: 5): ');
    
    options = {
      mode,
      searchQuery: searchQuery.trim() || 'language:javascript',
      reposPerPage: parseInt(reposPerPage) || 10,
      pageLimit: parseInt(pageLimit) || 3,
      contributorsPerRepo: parseInt(contributorsPerRepo) || 5
    };
    
    updateScraperOptions(options);
    
    // Confirm and run
    colorLog('\nScraper configured with the following options:', 'bright');
    colorLog(`- Mode: JavaScript repositories`, 'cyan');
    colorLog(`- Search query: ${options.searchQuery}`, 'cyan');
    colorLog(`- Repositories per page: ${options.reposPerPage}`, 'cyan');
    colorLog(`- Pages to scrape: ${options.pageLimit}`, 'cyan');
    colorLog(`- Contributors per repository: ${options.contributorsPerRepo}`, 'cyan');
  } else {
    // Configure Upwork scraper options
    colorLog('\nConfigure Upwork scraper options (press Enter to use defaults):', 'bright');
    
    const maxPages = await askQuestion('Maximum number of Upwork pages to scrape (0 for unlimited, default: 0): ');
    
    options = {
      mode,
      maxPages: parseInt(maxPages) || 0
    };
    
    // Confirm and run
    colorLog('\nScraper configured with the following options:', 'bright');
    colorLog(`- Mode: Upwork full-stack developers`, 'cyan');
    colorLog(`- Maximum Upwork pages to scrape: ${options.maxPages === 0 ? 'Unlimited' : options.maxPages}`, 'cyan');
  }
  
  const runNow = await askQuestion('\nRun the scraper now? (y/n): ');
  if (runNow.toLowerCase() === 'y') {
    colorLog('\nRunning scraper...', 'green');
    
    try {
      // Run the scraper with the selected options
      await main(options);
      colorLog('\nScraping completed successfully!', 'green');
    } catch (error) {
      colorLog('\nAn error occurred while running the scraper:', 'red');
      console.error(error);
    }
  } else {
    if (mode === 'javascript') {
      colorLog('\nTo run the JavaScript scraper later, use: node index.js', 'cyan');
    } else {
      colorLog('\nTo run the Upwork scraper later, use: node index.js --mode=upwork', 'cyan');
    }
  }
  
  rl.close();
}

// Run the CLI main function
cliMain().catch(error => {
  colorLog('An error occurred:', 'red');
  console.error(error);
  rl.close();
});
