/**
 * VastoWorm.sys Orchestrator
 * entrypoint to process automated cycles and visitor interactions.
 */

import { loadState, saveState, updateStateHourly, processInteraction } from './state.js';
import { fetchGitHubData } from './github.js';
import { generateSVG } from './svg.js';
import { updateReadme } from './readme.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("☠️ VASTOWORM.SYS :: INITIALIZING ENGINE...");

  // 1. Parse Command Line Arguments
  const args = {};
  process.argv.slice(2).forEach(val => {
    const [key, value] = val.split('=');
    if (key && value) {
      args[key.replace(/^--/, '')] = value;
    }
  });

  const action = args.action; // e.g. "INJECT_PAYLOAD"
  const user = args.user;     // e.g. "hacker123"

  // Get current repo name from environment
  const repoName = process.env.GITHUB_REPOSITORY || "richard/VastoWorm.sys";

  // 2. Load current state
  const state = loadState();
  console.log(`Current Infection Rate: ${state.infectionRate}% | Stage: ${state.stage}`);

  // 3. Fetch latest GitHub data
  console.log("Fetching telemetry from GitHub API...");
  const githubData = await fetchGitHubData(args);
  console.log(`Telemetry retrieved: Commits last hour: ${githubData.commitsCount}, Stars: ${githubData.starsCount}, Issues: ${githubData.openIssuesCount}`);

  // 4. Process updates
  if (action && user) {
    console.log(`⚡ Processing interactive dispatch action: ${action} from @${user}`);
    const interactionResult = processInteraction(state, action, user);
    
    // Sync defense and CPU load even during interactive updates
    state.defense = Math.min(100, 10 + githubData.starsCount * 4);
    state.cpuLoad = Math.min(100, 10 + (githubData.openIssuesCount * 15) + (Math.random() * 8));
    state.cpuLoad = Math.round(state.cpuLoad);

    // Create the issue response comment file
    const commentBody = `### ☠️ VASTOWORM.SYS :: DECODING REPORT

\`\`\`text
> CONNECTING TO HOST BACKBONE... [OK]
> ACTION REGISTERED : ${action}
> TRANSMITTED BY    : @${user}
> 
> [SYSTEM DECODING SUCCESS]
> ${interactionResult}
> 
> CURRENT VIRUS CONFIGURATION:
> - Global Infection Rate: ${state.infectionRate.toFixed(1)}%
> - Core Code Integrity  : ${state.integrity.toFixed(1)}%
> - Firewall Resistance  : ${state.defense}
> - Host CPU Utilization : ${state.cpuLoad}%
> 
> INFILTRATION SPREADING... STANDBY.
\`\`\`

*This action was processed and executed automatically by the VastoWorm.sys workflow engines. Target host has been updated.*`;

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'issue_comment.md'), commentBody, 'utf-8');
    console.log("Written issue comment to data/issue_comment.md");
  } else {
    console.log("🕒 Processing standard cycle update...");
    updateStateHourly(state, githubData);
  }

  // 5. Save state
  console.log("Saving new state configuration...");
  saveState(state);

  // 6. Generate SVG
  console.log("Compiling visual payload (SVG)...");
  const svgContent = generateSVG(state);
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(assetsDir, 'virus.svg'), svgContent, 'utf-8');

  // 7. Update README
  console.log("Injecting payload into README.md...");
  updateReadme(state, repoName);

  console.log("☠️ VASTOWORM.SYS :: PROCESS COMPLETE.");
}

main().catch(err => {
  console.error("❌ CRITICAL EXCEPTION IN VASTOWORM ENGINE:", err);
  process.exit(1);
});
