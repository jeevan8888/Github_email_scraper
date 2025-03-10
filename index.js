const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Import the Upwork scraper
const upworkScraper = require('./upwork-scraper');

// Initialize Octokit with GitHub token (if available)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Regular expression to match email addresses
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Store unique email addresses
const emailSet = new Set();

/**
 * Search for JavaScript repositories
 * @param {number} page - Page number for pagination
 */
async function searchJavaScriptRepos(page = 1) {
  try {
    console.log(`Searching for JavaScript repositories - Page ${page}`);
    
    const response = await octokit.search.repos({
      q: 'Full-stack',
      sort: 'stars',
      order: 'desc',
      per_page: 100, // Limit to 100 repos per page to avoid rate limiting
      page,
    });
    
    console.log(`Found ${response.data.items.length} repositories`);
    
    // Process each repository
    for (const repo of response.data.items) {
      console.log(`Processing repository: ${repo.full_name}`);
      await processRepository(repo.owner.login, repo.name);
    }
    
    // If there are more pages and we haven't hit our limit
    if (response.data.items.length > 0 && page < 100) { // Limit to 100 pages for demonstration
      await searchJavaScriptRepos(page + 1);
    } else {
      // Save all found emails to a file
      saveEmails();
    }
  } catch (error) {
    console.error('Error searching repositories:', error.message);
    
    // If we hit rate limit, save what we have so far
    if (error.status === 403) {
      console.log('Rate limit exceeded. Saving current results...');
      saveEmails();
    }
  }
}

/**
 * Process a single repository to find emails
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function processRepository(owner, repo) {
  try {
    // Check README for emails
    await checkReadmeForEmails(owner, repo);
    
    // Get contributors
    await getContributors(owner, repo);
    
    // Check commit messages and author information
    await checkCommits(owner, repo);
  } catch (error) {
    console.error(`Error processing repository ${owner}/${repo}:`, error.message);
  }
}

/**
 * Check repository README for email addresses
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function checkReadmeForEmails(owner, repo) {
  try {
    const { data } = await octokit.repos.getReadme({
      owner,
      repo,
    });
    
    // Decode content from base64
    const content = Buffer.from(data.content, 'base64').toString();
    
    // Extract emails from README
    const emails = content.match(emailRegex) || [];
    emails.forEach(email => {
      emailSet.add(email);
      console.log(`Found email in README: ${email}`);
    });
  } catch (error) {
    // README might not exist
    console.log(`No README found for ${owner}/${repo} or error: ${error.message}`);
  }
}

/**
 * Get repository contributors
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function getContributors(owner, repo) {
  try {
    const { data: contributors } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 5, // Limit to top 5 contributors
    });
    
    console.log(`Found ${contributors.length} contributors for ${owner}/${repo}`);
    
    // Process each contributor
    for (const contributor of contributors) {
      await getContributorEmails(contributor.login);
    }
  } catch (error) {
    console.error(`Error getting contributors for ${owner}/${repo}:`, error.message);
  }
}

/**
 * Get emails from a contributor's profile and events
 * @param {string} username - GitHub username
 */
async function getContributorEmails(username) {
  try {
    // Get user profile
    const { data: user } = await octokit.users.getByUsername({
      username,
    });
    
    // Check if email is public in profile
    if (user.email) {
      emailSet.add(user.email);
      console.log(`Found email in profile: ${user.email}`);
    }
    
    // Check user's events for commit emails
    await getUserEvents(username);
  } catch (error) {
    console.error(`Error getting information for user ${username}:`, error.message);
  }
}

/**
 * Get user's public events to find commit emails
 * @param {string} username - GitHub username
 */
async function getUserEvents(username) {
  try {
    const { data: events } = await octokit.activity.listPublicEventsForUser({
      username,
      per_page: 10, // Limit to 10 recent events
    });
    
    // Look for PushEvent which might contain commit information
    for (const event of events) {
      if (event.type === 'PushEvent') {
        // Extract email from payload if available
        const email = event.payload?.commits?.[0]?.author?.email;
        if (email && !email.includes('noreply.github.com')) {
          emailSet.add(email);
          console.log(`Found email in commit: ${email}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error getting events for user ${username}:`, error.message);
  }
}

/**
 * Check repository commits for email addresses
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function checkCommits(owner, repo) {
  try {
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 10, // Limit to 10 recent commits
    });
    
    console.log(`Checking ${commits.length} commits for ${owner}/${repo}`);
    
    for (const commit of commits) {
      // Get detailed commit info
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: commit.sha,
      });
      
      // Extract author and committer emails
      const authorEmail = commitData.author?.email;
      const committerEmail = commitData.committer?.email;
      
      if (authorEmail && !authorEmail.includes('noreply.github.com')) {
        emailSet.add(authorEmail);
        console.log(`Found author email in commit: ${authorEmail}`);
      }
      
      if (committerEmail && !committerEmail.includes('noreply.github.com')) {
        emailSet.add(committerEmail);
        console.log(`Found committer email in commit: ${committerEmail}`);
      }
    }
  } catch (error) {
    console.error(`Error checking commits for ${owner}/${repo}:`, error.message);
  }
}

/**
 * Process a GitHub username to find emails
 * @param {string} username - GitHub username
 */
async function processGitHubUser(username) {
  try {
    console.log(`Processing GitHub user: ${username}`);
    
    // Get user's email from profile
    await getContributorEmails(username);
    
    // Get user's repositories
    await getUserRepositories(username);
    
    return true;
  } catch (error) {
    console.error(`Error processing GitHub user ${username}:`, error.message);
    return false;
  }
}

/**
 * Get repositories owned by a GitHub user
 * @param {string} username - GitHub username
 */
async function getUserRepositories(username) {
  try {
    console.log(`Getting repositories for user: ${username}`);
    
    const { data: repos } = await octokit.repos.listForUser({
      username,
      sort: 'updated',
      direction: 'desc',
      per_page: 5, // Limit to 5 most recently updated repos
    });
    
    console.log(`Found ${repos.length} repositories for ${username}`);
    
    // Process each repository
    for (const repo of repos) {
      await processRepository(repo.owner.login, repo.name);
    }
  } catch (error) {
    console.error(`Error getting repositories for user ${username}:`, error.message);
  }
}

/**
 * Save collected emails to a file
 * @param {string} filename - Output filename
 */
function saveEmails(filename = 'javascript-developer-emails.json') {
  const emails = Array.from(emailSet);
  const outputPath = path.join(__dirname, filename);
  
  fs.writeFileSync(outputPath, JSON.stringify(emails, null, 2));
  console.log(`Saved ${emails.length} unique email addresses to ${outputPath}`);
  
  return emails;
}

/**
 * Find emails from Upwork full-stack developers
 * @param {number} maxPages - Maximum number of Upwork pages to scrape (0 for unlimited)
 */
async function findEmailsFromUpworkDevelopers(maxPages = 0) {
  console.log('Starting Upwork to GitHub email scraper');
  
  // Clear email set for a fresh start
  emailSet.clear();
  
  // Find GitHub accounts from Upwork profiles
  console.log(`Searching for GitHub accounts from Upwork full-stack developer profiles...`);
  const githubUsernames = await upworkScraper.findGitHubAccountsFromUpwork(maxPages);
  
  console.log(`Found ${githubUsernames.length} GitHub usernames from Upwork profiles`);
  
  // Process each GitHub username
  let successCount = 0;
  for (const username of githubUsernames) {
    const success = await processGitHubUser(username);
    if (success) successCount++;
  }
  
  console.log(`Successfully processed ${successCount} out of ${githubUsernames.length} GitHub users`);
  
  // Save results to a file
  return saveEmails('fullstack-developer-emails.json');
}

/**
 * Original main function for JavaScript repositories
 */
async function searchJavaScriptDevelopers() {
  console.log('Starting GitHub JavaScript developer email scraper');
  
  // Clear email set for a fresh start
  emailSet.clear();
  
  await searchJavaScriptRepos();
  
  return Array.from(emailSet);
}

// Main function with options
async function main(options = {}) {
  if (!process.env.GITHUB_TOKEN) {
    console.warn('No GITHUB_TOKEN found in .env file. API requests will be rate-limited.');
  }
  
  const { mode = 'javascript', maxPages = 0 } = options;
  
  if (mode === 'upwork') {
    return findEmailsFromUpworkDevelopers(maxPages);
  } else {
    return searchJavaScriptDevelopers();
  }
}

// Export functions for use in other files
module.exports = {
  findEmailsFromUpworkDevelopers,
  searchJavaScriptDevelopers,
  processGitHubUser,
  main
};

// If this file is run directly, execute the main function
if (require.main === module) {
  // Default to JavaScript mode when run directly
  main().catch(error => {
    console.error('Error in main function:', error);
    // Save any emails we've found so far
    if (emailSet.size > 0) {
      saveEmails();
    }
  });
}
