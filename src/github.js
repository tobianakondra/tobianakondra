/**
 * GitHub API Helper for VastoWorm
 * Retrieves repository stats and commit history.
 */

import { execSync } from 'child_process';

function getLocalCommitsCount(before, after, event) {
  try {
    // 1. If it's a push event and we have valid SHAs, count the exact commits pushed
    if (
      event === 'push' && 
      before && 
      after && 
      before !== '0000000000000000000000000000000000000000' &&
      after !== '0000000000000000000000000000000000000000'
    ) {
      console.log(`Analyzing push delta: ${before.substring(0, 7)}...${after.substring(0, 7)}`);
      const output = execSync(
        `git log ${before}..${after} --grep="\\[VastoWorm\\]" --invert-grep --oneline`,
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
      );
      const lines = output.trim().split('\n').filter(line => line.length > 0);
      return lines.length;
    }

    // 2. Default fallback: Count commits in the last hour
    console.log("Analyzing commits in the last hour...");
    const output = execSync(
      'git log --since="1 hour ago" --grep="\\[VastoWorm\\]" --invert-grep --oneline',
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const lines = output.trim().split('\n').filter(line => line.length > 0);
    return lines.length;
  } catch (err) {
    console.warn("⚠️ Local git log failed, falling back to API:", err.message);
    return null;
  }
}

export async function fetchGitHubData(args = {}) {
  const { before, after, event } = args;
  const repo = process.env.GITHUB_REPOSITORY; // format: "owner/repo"
  const token = process.env.GITHUB_TOKEN;

  // Local fallback mock data
  if (!repo || !token) {
    console.log("⚠️ No GITHUB_REPOSITORY or GITHUB_TOKEN environment variables found. Using mock GitHub data.");
    return {
      commitsCount: Math.random() > 0.5 ? 1 : 0,
      starsCount: 12,
      openIssuesCount: 3
    };
  }

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "VastoWorm-Virus-Tamagotchi"
  };

  try {
    // 1. Fetch Repository Details (stars, forks, open issues)
    const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!repoResponse.ok) {
      throw new Error(`Repo fetch failed with status: ${repoResponse.status}`);
    }
    const repoData = await repoResponse.json();

    // 2. Fetch Commits - try local git first, fallback to API
    let commitsCount = getLocalCommitsCount(before, after, event);
    
    if (commitsCount === null) {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const sinceDate = oneHourAgo.toISOString();

      const commitsResponse = await fetch(`https://api.github.com/repos/${repo}/commits?since=${sinceDate}`, { headers });
      commitsCount = 0;
      
      if (commitsResponse.ok) {
        const commitsData = await commitsResponse.json();
        if (Array.isArray(commitsData)) {
          // Filter out bot commits manually
          const userCommits = commitsData.filter(c => !c.commit.message.includes('[VastoWorm]'));
          commitsCount = userCommits.length;
        }
      } else {
        console.warn(`Commits fetch failed: ${commitsResponse.status}`);
      }
    }

    return {
      commitsCount,
      starsCount: repoData.stargazers_count || 0,
      openIssuesCount: repoData.open_issues_count || 0
    };

  } catch (error) {
    console.error("❌ Error fetching GitHub API data:", error);
    return {
      commitsCount: 0,
      starsCount: 0,
      openIssuesCount: 0
    };
  }
}
