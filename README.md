# GitHub Developer Email Scraper

This Node.js application scrapes GitHub repositories to find email addresses of developers. It offers two modes of operation:

1. **JavaScript Repository Mode**: Searches for JavaScript repositories, examines their README files, contributor profiles, and commit history to extract email addresses.
2. **Upwork Developer Mode**: Scrapes Upwork profiles of full-stack developers to find their GitHub accounts, then extracts email addresses from those GitHub accounts.

## ⚠️ Ethical Considerations

Before using this tool, please consider the following ethical points:

1. **Privacy Concerns**: Collecting email addresses without explicit consent raises privacy concerns.
2. **Terms of Service**: This tool may violate GitHub's Terms of Service, which restricts scraping for personal information.
3. **Legal Implications**: Using collected email addresses for unsolicited contact may violate anti-spam laws in many jurisdictions.
4. **Rate Limiting**: Excessive requests to GitHub's API may result in your IP or API token being temporarily blocked.

This tool is provided for educational purposes only. Use responsibly and ethically.

## Features

### JavaScript Repository Mode
- Searches for popular JavaScript repositories on GitHub
- Extracts email addresses from:
  - Repository README files
  - Contributor profile information
  - Commit author and committer data
  - User events and activities
- Filters out noreply.github.com email addresses
- Saves unique email addresses to a JSON file

### Upwork Developer Mode
- Scrapes Upwork profiles of full-stack developers
- Extracts GitHub account URLs from:
  - Profile descriptions
  - Portfolio links
  - External links
- Processes each GitHub account to find email addresses
- Saves unique email addresses to a JSON file

## Prerequisites

- Node.js (v12 or higher)
- npm (v6 or higher)
- GitHub Personal Access Token (optional but recommended)

## Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

3. Create a GitHub Personal Access Token:
   - Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
   - Generate a new token with the following scopes: `public_repo`, `read:user`, `user:email`
   - Copy the token

4. Add your token to the `.env` file:

```
GITHUB_TOKEN=your_token_here
```

## Usage

### Basic Usage

Run the application in JavaScript mode (default):

```bash
npm start
```

The application will:
1. Search for popular JavaScript repositories
2. Process each repository to find email addresses
3. Save unique email addresses to `javascript-developer-emails.json`

To run in Upwork mode:

```bash
node index.js --mode=upwork
```

This will:
1. Scrape Upwork profiles of full-stack developers
2. Extract GitHub accounts from those profiles
3. Process each GitHub account to find email addresses
4. Save unique email addresses to `fullstack-developer-emails.json`

### Direct Browser-Based Scraping (Recommended)

For the most reliable results, use the Puppeteer-based scraper:

```bash
npm run puppeteer
```

This approach:
1. Opens a real browser to scrape Upwork profiles
2. Extracts GitHub links directly from the page content
3. Visits each GitHub profile to find email addresses
4. Saves detailed results (including source) to `fullstack-developer-emails.json`

You can specify the number of Upwork pages to scrape:

```bash
npm run puppeteer -- 5  # Scrape 5 pages of Upwork profiles
```

### Interactive CLI

For a more user-friendly experience, use the CLI:

```bash
npm run cli
```

This will guide you through:
- Setting up your GitHub token
- Choosing between JavaScript mode and Upwork mode
- Configuring search parameters
- Running the scraper with your custom settings

### Testing

To verify that everything is set up correctly:

```bash
npm test
```

This runs a series of tests to check:
- GitHub API connection
- Repository access
- Email extraction functionality
- File output capabilities

### Example Usage

To see how to use the scraper programmatically:

```bash
npm run example
```

This demonstrates how to:
- Customize search queries
- Process specific repositories
- Integrate the scraper into your own applications

## Customization

### JavaScript Mode Customization

You can modify the following parameters in `index.js`:

- Change the search query in `searchJavaScriptRepos()` to target specific types of repositories
- Adjust the number of pages to scrape by modifying the `page < 3` condition
- Change the number of repositories per page with the `per_page` parameter
- Modify the number of contributors to check per repository

### Upwork Mode Customization

You can modify the following parameters in `upwork-scraper.js`:

- Set the maximum number of Upwork pages to scrape in `findGitHubAccountsFromUpwork()` (0 for unlimited)
- Modify the CSS selectors used to extract information from Upwork profiles
- Update the GitHub URL regex pattern to refine matching
- Adjust the delay between page requests to avoid being rate-limited

### General Customization

- Adjust the email regex pattern in `index.js` to refine email matching
- Modify the output filenames in the `saveEmails()` function

## Limitations

### GitHub Limitations
- GitHub API has rate limits (60 requests/hour without authentication, 5000 requests/hour with authentication)
- Many developers use private emails or GitHub's noreply email addresses
- The tool only processes public repositories and information

### Upwork Limitations
- Upwork may block automated scraping attempts or implement CAPTCHA
- The CSS selectors may need updates if Upwork changes their website structure
- Not all Upwork profiles include GitHub links
- Some developers may use different names on Upwork and GitHub

### Anti-Blocking Measures
The Upwork scraper includes several measures to avoid being blocked:
- Random delays between requests to mimic human behavior
- Rotating user agents to appear as different browsers
- Realistic HTTP headers that match modern browsers
- Proper referrer headers for each request
- Configurable maximum pages to limit scraping activity

Despite these measures, Upwork may still block scraping attempts. For more reliable results:
1. Use a VPN or proxy service to rotate IP addresses
2. Add real browser cookies to the scraper (see below)
3. Reduce the scraping speed by increasing delays
4. Limit scraping to a few pages at a time with breaks between sessions

### Using Upwork Cookies for Authentication

If you're getting 403 Forbidden errors when scraping Upwork, you can use real browser cookies to authenticate:

1. Install puppeteer:
   ```bash
   npm install puppeteer
   ```

2. Run the cookie extraction tool:
   ```bash
   npm run cookies
   ```

3. Follow the instructions in the browser:
   - Log in to your Upwork account
   - Navigate to the freelancer search page
   - Press Enter in the terminal

4. The tool will save your cookies to `upwork-cookies.json`

5. Follow the instructions to update the scraper to use these cookies

This approach significantly improves success rates as it uses your authenticated session.

## License

This project is for educational purposes only. Use responsibly.
