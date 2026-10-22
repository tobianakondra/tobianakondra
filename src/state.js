import fs from 'fs';
import path from 'path';

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'state.json');

const DEFAULT_STATE = {
  infectionRate: 0.0,
  integrity: 100,
  cpuLoad: 10,
  defense: 10,
  stage: "DORMANT",
  history: ["VIRUS PROTOCOL CONSTRUCTED. Awaiting execution."],
  lastUpdated: new Date().toISOString(),
  lastEventId: null,
  lastEventTimestamp: new Date().toISOString()
};

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(STATE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadState() {
  ensureDataDir();
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading state.json, reverting to default:", err);
  }
  return { ...DEFAULT_STATE };
}

export function saveState(state) {
  ensureDataDir();
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Updates stage name based on current infection rate
 */
function determineStage(infectionRate) {
  if (infectionRate >= 90) return "SENTIENT";
  if (infectionRate >= 50) return "OVERLORD";
  if (infectionRate >= 15) return "MUTATING";
  return "DORMANT";
}

/**
 * Adds log entry to state history (caps history to last 5 entries to save space)
 */
export function addHistoryLog(state, message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  state.history.push(`[${timestamp}] ${message}`);
  if (state.history.length > 5) {
    state.history.shift();
  }
}

/**
 * Hourly Cron update logic
 */
export function updateStateHourly(state, githubData) {
  const {
    commitsCount = 0,
    activeRepos = [],
    newestEventId,
    newestEventTimestamp,
    starsCount = 0,
    openIssuesCount = 0
  } = githubData;

  // Persist latest event tracking
  if (newestEventId) state.lastEventId = newestEventId;
  if (newestEventTimestamp) state.lastEventTimestamp = newestEventTimestamp;

  // 1. Time Decay: Virus integrity drops hourly by 1.5% due to firewall defenses
  const oldIntegrity = state.integrity;
  state.integrity = Math.max(10, state.integrity - 1.5);
  
  if (state.integrity < 40 && oldIntegrity >= 40) {
    addHistoryLog(state, "WARNING: Core integrity under 40%.");
  }

  // 2. Commit activity restores integrity & spreads infection across ANY repository
  if (commitsCount > 0) {
    const integrityGain = commitsCount * 12;
    state.integrity = Math.min(100, state.integrity + integrityGain);
    
    // Each commit spreads the virus by 2.5%
    const spreadGain = commitsCount * 2.5;
    state.infectionRate = Math.min(100, state.infectionRate + spreadGain);
    
    // Format repo names nicely
    const repoNames = activeRepos.map(r => r.includes('/') ? r.split('/')[1] : r);
    const repoSummary = repoNames.length > 0 ? ` [${repoNames.slice(0, 2).join(', ')}${repoNames.length > 2 ? '...' : ''}]` : '';
    addHistoryLog(state, `Replication: +${commitsCount} commit${commitsCount > 1 ? 's' : ''}${repoSummary} (+${spreadGain.toFixed(1)}% spread, +${integrityGain}% integrity).`);
  } else {
    // 3. Autonomous biological replication when virus is healthy (>= 50% integrity)
    if (state.integrity >= 50) {
      const passiveSpread = 0.3;
      state.infectionRate = Math.min(100, state.infectionRate + passiveSpread);
    }
  }

  // 4. Stars build the firewall defense shield (preserves fortress mutation buffs)
  const baseDefense = Math.min(100, 10 + starsCount * 4);
  state.defense = Math.max(state.defense || 10, baseDefense);

  // 5. CPU load scales with repository issues and pull requests
  state.cpuLoad = Math.min(100, 10 + (openIssuesCount * 15) + (Math.random() * 8));
  state.cpuLoad = Math.round(state.cpuLoad);

  // 6. Update mutation stage
  state.stage = determineStage(state.infectionRate);
}

/**
 * Processes interactive events triggered by visitor issues
 */
export function processInteraction(state, action, username) {
  // Clean input
  const act = action.toUpperCase();
  let message = "UNKNOWN PROTOCOL IDENTIFIED.";

  if (act === "INJECT_PAYLOAD") {
    // Injecting payload spreads the infection
    const spreadBonus = Math.min(100 - state.infectionRate, 6.0);
    state.infectionRate = Math.min(100, state.infectionRate + spreadBonus);
    
    // Minor repair due to new payload data
    state.integrity = Math.min(100, state.integrity + 4);
    
    const log = `Payload injected by @${username}. Spread +${spreadBonus.toFixed(1)}%`;
    addHistoryLog(state, log);
    message = `VIRAL PROPAGATION SUCCESS. Global infection level increased by +${spreadBonus.toFixed(1)}%. Core database integrity stabilized (+4.0%).`;
  } 
  else if (act === "DEPLOY_ANTIVIRUS") {
    // Antivirus attempts to clean the virus
    const mitigation = state.defense / 100; // 0 to 1
    const baseDamage = 12; // Base clean percentage
    const actualDamage = Math.max(1.5, baseDamage * (1 - mitigation * 0.9));
    
    state.infectionRate = Math.max(0, state.infectionRate - actualDamage);
    state.integrity = Math.max(10, state.integrity - 8); // Damaged by vaccine
    
    const log = `Antivirus deployed by @${username}. Mitigation: ${Math.round(mitigation*100)}% (Net: -${actualDamage.toFixed(1)}%)`;
    addHistoryLog(state, log);
    message = `ANTIVIRUS DEFENSE INITIATED. Repository shield absorbed ${Math.round(mitigation * 100)}% of the vaccine payload. Net quarantine reduction: -${actualDamage.toFixed(1)}% infection. Core structural damage: -8.0% integrity.`;
  } 
  else if (act === "TRIGGER_MUTATION") {
    // Dynamic random outcome
    const roll = Math.random();
    let outcome = "";
    let description = "";
    
    if (roll < 0.35) {
      // Net upgrade
      const defenseGain = 15;
      state.defense = Math.min(100, state.defense + defenseGain);
      state.integrity = Math.min(100, state.integrity + 10);
      outcome = `FORTRESS (+${defenseGain} defense)`;
      description = `CYBER SHIELD FORTIFIED. Penetration resistance shield capacity boosted by +${defenseGain} units. Core file integrity restored (+10.0%).`;
    } else if (roll < 0.70) {
      // Viral outbreak
      const spreadGain = 8.5;
      state.infectionRate = Math.min(100, state.infectionRate + spreadGain);
      state.cpuLoad = Math.min(100, state.cpuLoad + 20);
      outcome = `OUTBREAK (+${spreadGain.toFixed(1)}% infection)`;
      description = `OUTBREAK SEQUENCE UNLEASHED. Rapid replication detected. Global infection spread +${spreadGain.toFixed(1)}%. CPU workload spiked by +20% capacity.`;
    } else {
      // Glitch / self-damage
      const damage = 12;
      state.integrity = Math.max(15, state.integrity - damage);
      outcome = `INTEGRITY_FAULT (-${damage}% integrity)`;
      description = `MUTATION CORRUPTION FAULT. Recombination sequence glitched. Severe database structure decay (-${damage}.0% integrity).`;
    }

    addHistoryLog(state, `Mutation triggered by @${username}: ${outcome}`);
    message = `MUTATION SEQUENCE COMPLETE.\nOutcome: ${outcome}\nDetails: ${description}`;
  }

  // Update mutation stage after any changes (guaranteed execution)
  state.stage = determineStage(state.infectionRate);
  return message;
}
