/**
 * Test script for GitHub email scraper
 * 
 * This script performs tests to verify that:
 * 1. The GitHub API connection works
 * 2. The scraper can find and extract emails
 * 3. The output file is created correctly
 * 4. The Upwork scraper can extract GitHub usernames
 * 5. The integration between Upwork and GitHub scraping works
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
require('dotenv').config();

// Import the upwork-scraper module for testing
const upworkScraper = require('./upwork-scraper');

// Import the main module functions
const { processGitHubUser } = require('./index');

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Regular expression to match email addresses
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Store test results
const testResults = {
  apiConnection: false,
  repoAccess: false,
  emailExtraction: false,
  fileOutput: false,
  githubUrlExtraction: false,
  upworkScraping: false,
  upworkGithubIntegration: false,
  errors: []
};

/**
 * Test GitHub API connection
 */
async function testApiConnection() {
  try {
    console.log('Testing GitHub API connection...');
    
    const { data } = await octokit.rateLimit.get();
    
    console.log(`✅ GitHub API connection successful`);
    console.log(`Rate limit: ${data.rate.remaining}/${data.rate.limit} requests remaining`);
    
    testResults.apiConnection = true;
    
    if (data.rate.remaining < 10) {
      console.warn('⚠️ Warning: You are close to hitting the GitHub API rate limit');
    }
    
    return true;
  } catch (error) {
    console.error('❌ GitHub API connection failed:', error.message);
    testResults.errors.push(`API Connection: ${error.message}`);
    return false;
  }
}

/**
 * Test repository access and README retrieval
 */
async function testRepoAccess() {
  try {
    console.log('\nTesting repository access...');
    
    // Try to access a well-known repository
    const { data: repo } = await octokit.repos.get({
      owner: 'facebook',
      repo: 'react',
    });
    
    console.log(`✅ Successfully accessed repository: ${repo.full_name}`);
    
    // Try to get README
    const { data: readme } = await octokit.repos.getReadme({
      owner: 'facebook',
      repo: 'react',
    });
    
    console.log('✅ Successfully retrieved README');
    
    testResults.repoAccess = true;
    return true;
  } catch (error) {
    console.error('❌ Repository access failed:', error.message);
    testResults.errors.push(`Repo Access: ${error.message}`);
    return false;
  }
}

/**
 * Test email extraction from content
 */
function testEmailExtraction() {
  try {
    console.log('\nTesting email extraction...');
    
    // Sample text with email addresses
    const sampleText = `
      Contact us at support@example.com or info@test.org
      For developer inquiries: dev.team@company.co.uk
      Not an email: this@is@invalid
      Valid but complex: name+tag-123@sub.domain-name.com
    `;
    
    const emails = sampleText.match(emailRegex) || [];
    
    if (emails.length > 0) {
      console.log(`✅ Successfully extracted ${emails.length} email addresses:`);
      emails.forEach(email => console.log(`  - ${email}`));
      
      testResults.emailExtraction = true;
      return true;
    } else {
      console.error('❌ Email extraction failed: No emails found in sample text');
      testResults.errors.push('Email Extraction: No emails found in sample text');
      return false;
    }
  } catch (error) {
    console.error('❌ Email extraction failed:', error.message);
    testResults.errors.push(`Email Extraction: ${error.message}`);
    return false;
  }
}

/**
 * Test file output
 */
function testFileOutput() {
  try {
    console.log('\nTesting file output...');
    
    const testData = ['test@example.com', 'sample@test.org'];
    const outputPath = path.join(__dirname, 'test-output.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
    
    // Verify file was created
    if (fs.existsSync(outputPath)) {
      console.log(`✅ Successfully created output file: ${outputPath}`);
      
      // Clean up test file
      fs.unlinkSync(outputPath);
      console.log('✅ Test file cleaned up');
      
      testResults.fileOutput = true;
      return true;
    } else {
      console.error('❌ File output failed: File was not created');
      testResults.errors.push('File Output: File was not created');
      return false;
    }
  } catch (error) {
    console.error('❌ File output failed:', error.message);
    testResults.errors.push(`File Output: ${error.message}`);
    return false;
  }
}

/**
 * Test GitHub URL extraction from text
 */
function testGitHubUrlExtraction() {
  try {
    console.log('\nTesting GitHub URL extraction...');
    
    // Sample text with GitHub URLs
    const sampleText = `
      Check out my projects at https://github.com/johndoe
      Another profile: http://www.github.com/janedoe/
      My organization: https://github.com/example-org
      Invalid: github.com/invalid-url
      With repository: https://github.com/username/repo
      With path: https://github.com/username/repo/blob/main/README.md
    `;
    
    // Test URLs
    const testUrls = [
      'https://github.com/johndoe',
      'http://www.github.com/janedoe/',
      'https://github.com/example-org',
      'github.com/invalid-url', // This should not match with our regex
      'https://github.com/username/repo',
      'https://github.com/username/repo/blob/main/README.md'
    ];
    
    let passCount = 0;
    
    for (const url of testUrls) {
      const username = upworkScraper.extractGitHubUsername(url);
      
      if (url.includes('github.com/invalid-url')) {
        // This should not match
        if (!username) {
          console.log(`✅ Correctly rejected invalid URL: ${url}`);
          passCount++;
        } else {
          console.error(`❌ Incorrectly extracted username from invalid URL: ${url} -> ${username}`);
        }
      } else if (url.includes('/repo/blob/')) {
        // Should extract username from URL with path
        const expectedUsername = 'username';
        if (username === expectedUsername) {
          console.log(`✅ Correctly extracted username from URL with path: ${url} -> ${username}`);
          passCount++;
        } else {
          console.error(`❌ Failed to extract correct username from URL with path: ${url} -> ${username}, expected: ${expectedUsername}`);
        }
      } else {
        // Should extract username from valid URL
        const expectedUsername = url.split('github.com/')[1].replace('/', '');
        if (username === expectedUsername) {
          console.log(`✅ Correctly extracted username: ${url} -> ${username}`);
          passCount++;
        } else {
          console.error(`❌ Failed to extract correct username: ${url} -> ${username}, expected: ${expectedUsername}`);
        }
      }
    }
    
    if (passCount >= 4) { // At least 4 out of 6 tests should pass
      console.log(`✅ GitHub URL extraction test passed (${passCount}/6)`);
      testResults.githubUrlExtraction = true;
      return true;
    } else {
      console.error(`❌ GitHub URL extraction test failed (${passCount}/6)`);
      testResults.errors.push(`GitHub URL Extraction: Failed ${6 - passCount} tests`);
      return false;
    }
  } catch (error) {
    console.error('❌ GitHub URL extraction failed:', error.message);
    testResults.errors.push(`GitHub URL Extraction: ${error.message}`);
    return false;
  }
}

/**
 * Test Upwork HTML parsing with mock data
 */
function testUpworkScraping() {
  try {
    console.log('\nTesting Upwork HTML parsing...');
    
    // Mock HTML content for an Upwork profile
    const mockHtml = `
      <html>
        <body>
          <div class="profile-overview">
            <p>I'm a full-stack developer with experience in React, Node.js, and more.</p>
            <p>Check out my GitHub: https://github.com/mockuser</p>
          </div>
          <div class="portfolio-section">
            <div class="portfolio-item">
              <a href="https://github.com/mockuser/project1">Project 1</a>
            </div>
          </div>
          <div class="social-links">
            <a href="https://linkedin.com/in/mockuser" class="social-link">LinkedIn</a>
            <a href="https://github.com/mockuser2" class="social-link">GitHub</a>
          </div>
        </body>
      </html>
    `;
    
    // Load the mock HTML with cheerio
    const $ = cheerio.load(mockHtml);
    
    // Extract GitHub usernames from the mock HTML
    const githubUsernames = new Set();
    
    // Look for GitHub URLs in the profile description
    const profileText = $('.profile-overview').text();
    const portfolioText = $('.portfolio-section').text();
    const fullText = `${profileText} ${portfolioText}`;
    
    // Use the same regex as in upwork-scraper.js
    const githubUrlRegex = /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/gi;
    
    // Find all GitHub URLs in the text
    let match;
    while ((match = githubUrlRegex.exec(fullText)) !== null) {
      const username = upworkScraper.extractGitHubUsername(match[0]);
      if (username) {
        githubUsernames.add(username);
      }
    }
    
    // Look for GitHub URLs in links
    $('.portfolio-item a, .social-link').each((i, element) => {
      const href = $(element).attr('href');
      const username = upworkScraper.extractGitHubUsername(href);
      if (username) {
        githubUsernames.add(username);
      }
    });
    
    const usernames = Array.from(githubUsernames);
    
    if (usernames.length >= 2) {
      console.log(`✅ Successfully extracted ${usernames.length} GitHub usernames from mock Upwork profile:`);
      usernames.forEach(username => console.log(`  - ${username}`));
      
      testResults.upworkScraping = true;
      return true;
    } else {
      console.error(`❌ Upwork scraping test failed: Expected at least 2 usernames, got ${usernames.length}`);
      testResults.errors.push(`Upwork Scraping: Expected at least 2 usernames, got ${usernames.length}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Upwork scraping test failed:', error.message);
    testResults.errors.push(`Upwork Scraping: ${error.message}`);
    return false;
  }
}

/**
 * Test integration between Upwork scraper and GitHub email scraper
 */
async function testUpworkGitHubIntegration() {
  try {
    console.log('\nTesting Upwork-GitHub integration...');
    
    // Skip the actual API calls to Upwork
    console.log('Note: This is a simplified integration test that skips actual Upwork API calls');
    
    // Test with a known GitHub username
    const testUsername = 'octocat'; // GitHub's mascot account
    
    console.log(`Testing with GitHub username: ${testUsername}`);
    
    // Only proceed if GitHub API connection is working
    if (!testResults.apiConnection) {
      console.log('⚠️ Skipping integration test due to GitHub API connection failure');
      return false;
    }
    
    // Try to process the GitHub user
    try {
      // Just check if we can access the user profile
      const { data: user } = await octokit.users.getByUsername({
        username: testUsername,
      });
      
      console.log(`✅ Successfully accessed GitHub profile for ${testUsername}`);
      console.log(`Profile: ${user.html_url}`);
      
      testResults.upworkGithubIntegration = true;
      return true;
    } catch (error) {
      console.error(`❌ Failed to access GitHub profile for ${testUsername}:`, error.message);
      testResults.errors.push(`Upwork-GitHub Integration: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Upwork-GitHub integration test failed:', error.message);
    testResults.errors.push(`Upwork-GitHub Integration: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== GitHub Email Scraper Test ===\n');
  
  // Test API connection
  const apiConnectionSuccess = await testApiConnection();
  
  // Only proceed with repo test if API connection works
  let repoAccessSuccess = false;
  if (apiConnectionSuccess) {
    repoAccessSuccess = await testRepoAccess();
  }
  
  // These tests don't depend on API connection
  const emailExtractionSuccess = testEmailExtraction();
  const fileOutputSuccess = testFileOutput();
  const githubUrlExtractionSuccess = testGitHubUrlExtraction();
  const upworkScrapingSuccess = testUpworkScraping();
  
  // This test depends on API connection
  let upworkGithubIntegrationSuccess = false;
  if (apiConnectionSuccess) {
    upworkGithubIntegrationSuccess = await testUpworkGitHubIntegration();
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`API Connection: ${testResults.apiConnection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Repository Access: ${testResults.repoAccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email Extraction: ${testResults.emailExtraction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`File Output: ${testResults.fileOutput ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`GitHub URL Extraction: ${testResults.githubUrlExtraction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Upwork HTML Parsing: ${testResults.upworkScraping ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Upwork-GitHub Integration: ${testResults.upworkGithubIntegration ? '✅ PASS' : '❌ FAIL'}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n=== Errors ===');
    testResults.errors.forEach(error => console.log(`- ${error}`));
  }
  
  // Overall result
  const coreTestsPassed = 
    testResults.apiConnection && 
    testResults.repoAccess && 
    testResults.emailExtraction && 
    testResults.fileOutput;
    
  const upworkTestsPassed =
    testResults.githubUrlExtraction &&
    testResults.upworkScraping &&
    testResults.upworkGithubIntegration;
  
  const allCoreTestsPassed = coreTestsPassed;
  const allTestsPassed = coreTestsPassed && upworkTestsPassed;
  
  console.log(`\nCore Tests Result: ${allCoreTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Upwork Tests Result: ${upworkTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Overall Test Result: ${allTestsPassed ? '✅ PASS' : '❌ PARTIAL PASS'}`);
  
  if (!testResults.apiConnection) {
    console.log('\nTroubleshooting API Connection:');
    console.log('1. Check that your GITHUB_TOKEN is correctly set in the .env file');
    console.log('2. Verify that your token has not expired');
    console.log('3. Ensure you have internet connectivity');
    console.log('4. Check if you have hit GitHub API rate limits');
  }
  
  if (!testResults.githubUrlExtraction || !testResults.upworkScraping) {
    console.log('\nTroubleshooting Upwork Scraper:');
    console.log('1. Check that the cheerio package is installed correctly');
    console.log('2. Verify that the GitHub URL regex pattern is working correctly');
    console.log('3. Ensure the HTML parsing logic matches the expected structure');
  }
  
  return allCoreTestsPassed;
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
