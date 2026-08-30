import fs from 'fs';
import path from 'path';

const GITHUB_USER = process.env.GITHUB_REPOSITORY_OWNER || process.env.GITHUB_ACTOR || 'Mr-Process';
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed&direction=desc`;

const README_PATH = path.join(process.cwd(), 'README.md');
const START_MARKER = '<!-- PROJECTS_START -->';
const END_MARKER = '<!-- PROJECTS_END -->';

async function fetchRepos() {
    console.log(`Fetching repositories for ${GITHUB_USER}...`);
    try {
        const headers = {
            'User-Agent': 'Node.js',
            'Accept': 'application/vnd.github.v3+json'
        };

        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const response = await fetch(API_URL, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
        }

        const repos = await response.json();

        if (!Array.isArray(repos)) {
             throw new Error(`GitHub API returned a non-array response: ${JSON.stringify(repos)}`);
        }

        // Filter out forks or empty repos if needed, but for now we'll take mostly everything
        return repos.filter(repo => !repo.fork && repo.name !== GITHUB_USER);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        process.exit(1);
    }
}

function generateMarkdown(repos) {
    console.log('Generating markdown for projects...');

    let md = '\n### 🚀 My Projects & Current Focus\n\n';
    md += 'Here is a living overview of my current projects, experiments, and tools, automatically updated to reflect my latest work:\n\n';

    // Grouping or just listing them beautifully
    const topRepos = repos.slice(0, 10); // Show top 10 most recently updated

    for (const repo of topRepos) {
        const name = repo.name;
        const description = repo.description || 'A work in progress or experimental project without a description yet.';
        const language = repo.language ? `**${repo.language}**` : 'Mixed / Undetected';
        const stars = repo.stargazers_count > 0 ? ` ⭐ ${repo.stargazers_count}` : '';
        const url = repo.html_url;

        // Format the date to be more human readable
        const date = new Date(repo.pushed_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        md += `*   **[${name}](${url})**${stars}\n`;
        md += `    *${description}*\n`;
        md += `    *Built with ${language} • Last active: ${formattedDate}*\n\n`;
    }

    if (repos.length > 10) {
         md += `\n*...and ${repos.length - 10} more projects that I'm building! Check out my [repositories page](https://github.com/${GITHUB_USER}?tab=repositories) for the full list.*\n`;
    }

    md += '\n';
    return md;
}

function updateReadme(newContent) {
    console.log('Updating README.md...');
    try {
        let readme = fs.readFileSync(README_PATH, 'utf8');

        const startIndex = readme.indexOf(START_MARKER);
        const endIndex = readme.indexOf(END_MARKER);

        if (startIndex === -1 || endIndex === -1) {
            console.error('Could not find START_MARKER or END_MARKER in README.md');
            process.exit(1);
        }

        const before = readme.substring(0, startIndex + START_MARKER.length);
        const after = readme.substring(endIndex);

        const updatedReadme = `${before}\n${newContent}${after}`;

        fs.writeFileSync(README_PATH, updatedReadme);
        console.log('README.md successfully updated!');
    } catch (error) {
         console.error('Error updating README.md:', error);
         process.exit(1);
    }
}

async function main() {
    const repos = await fetchRepos();
    if (repos && repos.length > 0) {
        const markdown = generateMarkdown(repos);
        updateReadme(markdown);
    } else {
        console.log('No repositories found or error fetching them.');
    }
}

main();
