/**
 * GitHub API Helper for VastoWorm
 * Retrieves repository stats and commit history across ALL user repositories.
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
    console.log("Analyzing commits in the last hour on current repo...");
    const output = execSync(
      'git log --since="1 hour ago" --grep="\\[VastoWorm\\]" --invert-grep --oneline',
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const lines = output.trim().split('\n').filter(line => line.length > 0);
    return lines.length;
  } catch (err) {
    console.warn("⚠️ Local git log failed:", err.message);
    return 0;
  }
}

/**
 * Fetches user push events across ALL repositories on their GitHub account.
 */
async function fetchUserPushEvents(owner, token, lastEventTimestamp, lastEventId) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "VastoWorm-Virus-Tamagotchi"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let events = [];
  try {
    // 1. Try authenticated events (captures private repos if token has repo scope)
    const url = `https://api.github.com/users/${owner}/events?per_page=100`;
    console.log(`📡 Checking user-wide activity for @${owner}...`);
    const res = await fetch(url, { headers });
    if (res.ok) {
      events = await res.json();
    } else {
      // 2. Fallback to public events
      console.log(`Status ${res.status} on /events, falling back to /events/public...`);
      const pubRes = await fetch(`https://api.github.com/users/${owner}/events/public?per_page=100`, {
        headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "VastoWorm-Virus-Tamagotchi" }
      });
      if (pubRes.ok) {
        events = await pubRes.json();
      } else {
        console.warn(`⚠️ Failed to fetch public events: ${pubRes.status}`);
      }
    }
  } catch (err) {
    console.warn("⚠️ Network error while fetching user events:", err.message);
  }

  if (!Array.isArray(events)) {
    return { commitsCount: 0, activeRepos: [], newestEventId: null, newestEventTimestamp: null };
  }

  const pushEvents = events.filter(e => e.type === 'PushEvent');
  if (pushEvents.length === 0) {
    return { commitsCount: 0, activeRepos: [], newestEventId: null, newestEventTimestamp: null };
  }

  const newestEvent = pushEvents[0];
  const newestEventId = String(newestEvent.id);
  const newestEventTimestamp = newestEvent.created_at;

  const cutoffTime = lastEventTimestamp ? new Date(lastEventTimestamp).getTime() : 0;
  let totalCommits = 0;
  const activeRepos = new Set();

  for (const ev of pushEvents) {
    // Stop if we hit an event ID we already processed
    if (lastEventId && String(ev.id) === String(lastEventId)) {
      break;
    }

    const eventTime = new Date(ev.created_at).getTime();
    // Stop if we reached events older than our last check
    if (cutoffTime > 0 && eventTime <= cutoffTime) {
      break;
    }

    // Skip bot auto-updates on the VastoWorm repo
    const commits = ev.payload?.commits || [];
    const isBotPush = commits.length > 0 && commits.every(c => c.message && c.message.includes('[VastoWorm]'));
    if (isBotPush) {
      continue;
    }

    const count = ev.payload?.size || ev.payload?.distinct_size || commits.length || 1;
    totalCommits += count;
    if (ev.repo?.name) {
      activeRepos.add(ev.repo.name);
    }
  }

  return {
    commitsCount: totalCommits,
    activeRepos: Array.from(activeRepos),
    newestEventId,
    newestEventTimestamp
  };
}

export async function fetchGitHubData(args = {}, state = {}) {
  const { before, after, event } = args;
  const repo = process.env.GITHUB_REPOSITORY || "tobianakondra/tobianakondra";
  const owner = process.env.VIRUS_OWNER || process.env.GITHUB_ACTOR || repo.split('/')[0];
  const token = process.env.USER_TOKEN || process.env.GH_PAT || process.env.GITHUB_TOKEN;

  let starsCount = 12;
  let openIssuesCount = 3;

  // 1. Fetch Repository Details (stars and open issues on profile repo)
  if (token || process.env.GITHUB_REPOSITORY) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "VastoWorm-Virus-Tamagotchi"
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, { headers });
      if (repoResponse.ok) {
        const repoData = await repoResponse.json();
        starsCount = repoData.stargazers_count ?? starsCount;
        openIssuesCount = repoData.open_issues_count ?? openIssuesCount;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch repo details, using fallback:", err.message);
    }
  }

  // 2. Fetch User-wide commits across ALL repositories
  const lastCheckTimestamp = state.lastEventTimestamp || state.lastUpdated;
  const lastCheckId = state.lastEventId || null;

  const userActivity = await fetchUserPushEvents(owner, token, lastCheckTimestamp, lastCheckId);
  console.log(`📊 Global Activity for @${owner}: ${userActivity.commitsCount} commits across [${userActivity.activeRepos.join(', ')}]`);

  // 3. If it was a push to the local repo directly, verify with local git in case GitHub Events API has index lag
  const localCommits = getLocalCommitsCount(before, after, event);
  const totalCommitsCount = Math.max(userActivity.commitsCount, localCommits);
  
  // If local push detected extra commits not yet indexed in Events API, add current repo to activeRepos
  if (localCommits > 0 && !userActivity.activeRepos.includes(repo)) {
    userActivity.activeRepos.push(repo);
  }

  return {
    commitsCount: totalCommitsCount,
    activeRepos: userActivity.activeRepos,
    newestEventId: userActivity.newestEventId || state.lastEventId,
    newestEventTimestamp: userActivity.newestEventTimestamp || state.lastEventTimestamp || new Date().toISOString(),
    starsCount,
    openIssuesCount
  };
}
