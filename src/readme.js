/**
 * README.md Updater for VastoWorm
 * Reads the existing README.md, parses placeholder tags, and updates the dynamic content.
 */

import fs from 'fs';
import path from 'path';

const README_PATH = path.join(process.cwd(), 'README.md');

const TAG_START = "<!-- VASTOWORM:START -->";
const TAG_END = "<!-- VASTOWORM:END -->";

export function generateReadmeContent(state, repoName) {
  const {
    infectionRate = 0.0,
    integrity = 100,
    cpuLoad = 10,
    defense = 10,
    stage = "DORMANT",
    history = [],
    lastUpdated = new Date().toISOString()
  } = state;

  const targetRepo = repoName || "your-username/your-repo";

  // Construct clickable issue URLs
  const payloadUrl = `https://github.com/${targetRepo}/issues/new?title=VASTO-WORM%3A+INJECT_PAYLOAD&body=Clicking+%27Submit+new+issue%27+will+transmit+a+malicious+viral+payload+to+VastoWorm.sys+and+accelerate+the+global+infection+rate.%0A%0A%5BDO+NOT+MODIFY+THE+ISSUE+TITLE%5D`;
  const antivirusUrl = `https://github.com/${targetRepo}/issues/new?title=VASTO-WORM%3A+DEPLOY_ANTIVIRUS&body=Clicking+%27Submit+new+issue%27+will+deploy+an+antivirus+cyber-patch+to+quarantine+VastoWorm.sys.+The+effectiveness+of+this+patch+depends+on+the+virus%27s+current+Shield+Resistance.%0A%0A%5BDO+NOT+MODIFY+THE+ISSUE+TITLE%5D`;
  const mutationUrl = `https://github.com/${targetRepo}/issues/new?title=VASTO-WORM%3A+TRIGGER_MUTATION&body=Clicking+%27Submit+new+issue%27+will+initiate+a+radiation+mutation+sequence+in+the+virus%27s+genetic+code.+The+outcome+is+highly+unpredictable.%0A%0A%5BDO+NOT+MODIFY+THE+ISSUE+TITLE%5D`;

  const logsText = history.map(log => `> ${log}`).join("\n");
  const formattedDate = new Date(lastUpdated).toUTCString();

  return `
<p align="center">
  <img src="assets/dashboard.gif" width="100%" alt="VastoWorm dashboard with a rotating dotted globe showing continents and nodes in Dakar, New York, London, Tokyo, and Johannesburg" />
</p>

\`\`\`text
========================================================================
[VASTOWORM.SYS RECON TERMINAL] - LAST UPDATE: ${formattedDate}
========================================================================
▶ EVOLUTION STAGE         : ${stage}
▶ GLOBAL INFECTION RATE   : ${infectionRate.toFixed(1)}%
▶ CORE CODE INTEGRITY     : ${integrity.toFixed(1)}%
▶ HOST CPU LOAD           : ${cpuLoad}%
▶ SHIELD STRENGTH         : ${defense} (increases with repo stars ⭐️)

[LOG STREAM]
${logsText}
========================================================================
\`\`\`

<p align="center">
  <a href="${payloadUrl}">
    <img src="https://img.shields.io/badge/☣_INJECT_PAYLOAD-FF0055?style=for-the-badge&logoColor=white" alt="Inject Payload" />
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="${antivirusUrl}">
    <img src="https://img.shields.io/badge/🛡_DEPLOY_ANTIVIRUS-00F0FF?style=for-the-badge&logoColor=white" alt="Deploy Antivirus" />
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="${mutationUrl}">
    <img src="https://img.shields.io/badge/🧬_TRIGGER_MUTATION-FFAA00?style=for-the-badge&logoColor=white" alt="Trigger Mutation" />
  </a>
</p>
<p align="center">
  <sub>Clicking the actions above will redirect you to open a pre-formatted GitHub issue. The VastoWorm automation will parse your ticket, evolve the state, and close the issue automatically.</sub>
</p>
`;
}

export function updateReadme(state, repoName) {
  const dynamicContent = generateReadmeContent(state, repoName);
  
  let currentContent = "";
  if (fs.existsSync(README_PATH)) {
    currentContent = fs.readFileSync(README_PATH, 'utf-8');
  }

  // If tags do not exist, create a baseline readme template
  if (!currentContent.includes(TAG_START) || !currentContent.includes(TAG_END)) {
    console.log("📝 README.md does not contain placeholders. Generating a complete new file.");
    const fullReadme = `# VastoWorm.sys ☠️

Welcome to my profile. The system has been compromised. An autonomous cyber-virus Tamagotchi is replicating in the background.

${TAG_START}
${dynamicContent}
${TAG_END}

---
Created and evolved autonomously via GitHub Actions.
`;
    fs.writeFileSync(README_PATH, fullReadme, 'utf-8');
    return;
  }

  // Tags exist, inject the updated block
  console.log("📝 README.md placeholders found. Updating dynamic section...");
  const startIndex = currentContent.indexOf(TAG_START) + TAG_START.length;
  const endIndex = currentContent.indexOf(TAG_END);

  const updatedContent = 
    currentContent.substring(0, startIndex) + 
    "\n" + dynamicContent + "\n" + 
    currentContent.substring(endIndex);

  fs.writeFileSync(README_PATH, updatedContent, 'utf-8');
}
