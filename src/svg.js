/**
 * Dynamic SVG Generator for VastoWorm Cyber-Virus Tamagotchi
 * Generates a cyberpunk-themed dashboard showing system stats and an infection map.
 */

export function generateSVG(state) {
  const {
    infectionRate = 0.0,
    integrity = 100,
    cpuLoad = 10,
    defense = 10,
    stage = "DORMANT",
    history = []
  } = state;

  // Determine node infection status based on rate
  // Coordinates are local to the topology panel, which is translated to x=340.
  const nodes = [
    { id: "NA", label: "US-NY", x: 65, y: 105, threshold: 14 },
    { id: "EU", label: "UK-LDN", x: 165, y: 75, threshold: 28 },
    { id: "SA", label: "BR-RJO", x: 115, y: 175, threshold: 42 },
    { id: "AF", label: "ZA-JNB", x: 205, y: 175, threshold: 56 },
    { id: "IN", label: "IN-BOM", x: 260, y: 115, threshold: 70 },
    { id: "JP", label: "JP-TKY", x: 335, y: 95, threshold: 84 },
    { id: "AU", label: "AU-SYD", x: 365, y: 185, threshold: 98 }
  ];

  const activeNodes = nodes.map(n => ({
    ...n,
    infected: infectionRate >= n.threshold
  }));

  // Connections between nodes
  const links = [
    { from: "NA", to: "EU" },
    { from: "EU", to: "IN" },
    { from: "IN", to: "JP" },
    { from: "JP", to: "AU" },
    { from: "NA", to: "SA" },
    { from: "SA", to: "AF" },
    { from: "AF", to: "IN" },
    { from: "NA", to: "JP" }, // Pacific
    { from: "SA", to: "AU" }
  ];

  // Visual status indicators
  const statusColor = stage === "DORMANT" ? "#00ff66" : stage === "MUTATING" ? "#ffaa00" : "#ff0055";
  const integrityColor = integrity > 75 ? "#00ff66" : integrity > 40 ? "#ffaa00" : "#ff0055";

  // Build segmented progress bars
  const drawSegmentedBar = (val, max = 100, segments = 10, color = "#00f0ff") => {
    const filledSegments = Math.round((val / max) * segments);
    let bar = "";
    for (let i = 0; i < segments; i++) {
      const isFilled = i < filledSegments;
      bar += `<rect x="${30 + i * 15}" y="0" width="10" height="15" fill="${isFilled ? color : "#1a1c24"}" rx="2" />`;
    }
    return bar;
  };

  // Build map links SVG
  const linksSVG = links.map(link => {
    const fromNode = activeNodes.find(n => n.id === link.from);
    const toNode = activeNodes.find(n => n.id === link.to);
    if (!fromNode || !toNode) return "";
    
    // If both nodes are infected, the link pulses red; otherwise standard dark cyan
    const isInfectedPath = fromNode.infected && toNode.infected;
    const color = isInfectedPath ? "rgba(255,0,85,0.7)" : "rgba(0,240,255,0.15)";
    const strokeWidth = isInfectedPath ? "1.5" : "1";
    const dashArray = isInfectedPath ? "4 4" : "none";

    // Animated packet flow
    const packet = isInfectedPath 
      ? `<circle r="2" fill="#ff0055">
           <animateMotion dur="3s" repeatCount="indefinite" path="M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}" />
         </circle>`
      : "";

    return `
      <line x1="${fromNode.x}" y1="${fromNode.y}" x2="${toNode.x}" y2="${toNode.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" />
      ${packet}
    `;
  }).join("");

  // Build map nodes SVG
  const nodesSVG = activeNodes.map(node => {
    const color = node.infected ? "#ff0055" : "#00f0ff";
    const pulseRadius = node.infected ? "12" : "8";
    const coreRadius = node.infected ? "5" : "3";
    
    const pulseAnim = node.infected
      ? `<circle cx="${node.x}" cy="${node.y}" r="${coreRadius}" fill="none" stroke="${color}" stroke-width="1.5">
           <animate attributeName="r" values="${coreRadius};${pulseRadius};${coreRadius}" dur="2s" repeatCount="indefinite" />
           <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
         </circle>`
      : "";

    return `
      <g>
        ${pulseAnim}
        <circle cx="${node.x}" cy="${node.y}" r="${coreRadius}" fill="${color}" filter="url(#glow-${node.id})" />
        <text x="${node.x}" y="${node.y - 12}" fill="${color}" font-family="'Share Tech Mono', monospace" font-size="9" text-anchor="middle" letter-spacing="1">
          ${node.label}
        </text>
        <filter id="glow-${node.id}">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </g>
    `;
  }).join("");

  // Render recent logs in terminal block
  const terminalLines = history.slice(-3).map((log, index) => {
    return `<text x="35" y="${335 + index * 18}" fill="#00ff66" font-family="'Share Tech Mono', monospace" font-size="11" opacity="0.9">
      &gt; ${log}
    </text>`;
  }).join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" style="background-color: #0b0c10; border-radius: 6px;">
  <defs>
    <!-- Fonts -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&amp;display=swap');
      .neon-text {
        text-shadow: 0 0 5px rgba(0, 240, 255, 0.6);
      }
      .glitch-text {
        animation: glitch 4s infinite;
      }
      @keyframes glitch {
        0%, 95%, 100% { transform: translate(0); }
        96% { transform: translate(-2px, 1px); color: #ff0055; }
        97% { transform: translate(2px, -1px); color: #00ff66; }
        98% { transform: translate(-1px, -2px); color: #00f0ff; }
        99% { transform: translate(1px, 2px); }
      }
      .scanline {
        background: linear-gradient(
          to bottom,
          rgba(255,255,255,0),
          rgba(255,255,255,0) 50%,
          rgba(0, 240, 255, 0.04) 50%,
          rgba(0, 240, 255, 0.04)
        );
        background-size: 100% 4px;
      }
    </style>

    <!-- Glowing Filters -->
    <filter id="glow-cyan">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-red">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Cyberpunk Background Grid -->
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 240, 255, 0.02)" stroke-width="1"/>
  </pattern>
  <rect width="800" height="400" fill="url(#grid)" />

  <!-- Terminal Bezel Frame -->
  <rect x="10" y="10" width="780" height="380" fill="none" stroke="#1d2030" stroke-width="1.5" rx="4" />
  <path d="M 10 30 L 790 30" stroke="#1d2030" stroke-width="1.5" />
  <path d="M 10 300 L 790 300" stroke="#1d2030" stroke-width="1.5" />
  
  <!-- Corner Tech Accents -->
  <path d="M 10 40 L 10 10 L 40 10" fill="none" stroke="#ff0055" stroke-width="2" />
  <path d="M 790 40 L 790 10 L 760 10" fill="none" stroke="#ff0055" stroke-width="2" />
  <path d="M 10 360 L 10 390 L 40 390" fill="none" stroke="#ff0055" stroke-width="2" />
  <path d="M 790 360 L 790 390 L 760 390" fill="none" stroke="#ff0055" stroke-width="2" />

  <!-- HEADER -->
  <text x="25" y="24" fill="#ff0055" font-family="'Share Tech Mono', monospace" font-size="14" font-weight="bold" class="glitch-text" letter-spacing="1">
    ☠ VASTOWORM.SYS :: INFILTRATION_PROTOCOL_ACTIVE
  </text>
  
  <!-- Running indicator -->
  <g transform="translate(720, 15)">
    <circle cx="10" cy="5" r="4" fill="${statusColor}">
      <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
    </circle>
    <text x="22" y="9" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="10" letter-spacing="1">
      SYS_STAGE: <tspan fill="${statusColor}">${stage}</tspan>
    </text>
  </g>

  <!-- LEFT COLUMN: SYSTEM VITALS -->
  <g transform="translate(15, 45)">
    <!-- Section Border -->
    <rect x="10" y="10" width="310" height="235" fill="rgba(10, 11, 16, 0.7)" stroke="#1d2030" stroke-width="1" rx="3" />
    <text x="25" y="30" fill="#00f0ff" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" letter-spacing="1">
      [ SYSTEM VITALS ]
    </text>

    <!-- Vital 1: Global Infection Rate -->
    <g transform="translate(25, 45)">
      <text x="0" y="10" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="11" letter-spacing="1">
        GLOBAL INFECTION RATE
      </text>
      <text x="260" y="10" fill="#ff0055" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" text-anchor="end" class="neon-text">
        ${infectionRate.toFixed(1)}%
      </text>
      <g transform="translate(0, 18)">
        <!-- Background track -->
        <rect x="0" y="0" width="260" height="6" fill="#1a1c24" rx="3" />
        <!-- Filled bar -->
        <rect x="0" y="0" width="${2.6 * infectionRate}" height="6" fill="#ff0055" rx="3" filter="url(#glow-red)" />
      </g>
    </g>

    <!-- Vital 2: Data Integrity -->
    <g transform="translate(25, 95)">
      <text x="0" y="10" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="11" letter-spacing="1">
        VIRUS DATA INTEGRITY
      </text>
      <text x="260" y="10" fill="${integrityColor}" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" text-anchor="end">
        ${integrity}%
      </text>
      <g transform="translate(0, 18)">
        ${drawSegmentedBar(integrity, 100, 17, integrityColor)}
      </g>
    </g>

    <!-- Vital 3: Processor Load -->
    <g transform="translate(25, 145)">
      <text x="0" y="10" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="11" letter-spacing="1">
        HOST CPU UTILIZATION
      </text>
      <text x="260" y="10" fill="#00f0ff" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" text-anchor="end">
        ${cpuLoad}%
      </text>
      <g transform="translate(0, 18)">
        <!-- Pulse graph line simulation -->
        <rect x="0" y="0" width="260" height="25" fill="#16171f" rx="3" />
        <path d="M 5 15 L 40 15 L 50 5 L 60 20 L 70 12 L 100 12 L 110 2 L 120 23 L 130 10 L 160 10 L 170 20 L 180 5 L 190 15 L 255 15" 
              fill="none" stroke="#00f0ff" stroke-width="1.5">
          <animate attributeName="stroke-dasharray" values="300;0;300" dur="${Math.max(1, 6 - (cpuLoad/20))}s" repeatCount="indefinite" />
        </path>
      </g>
    </g>

    <!-- Vital 4: Network Security Shield Resistance -->
    <g transform="translate(25, 205)">
      <text x="0" y="10" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="11" letter-spacing="1">
        FIREWALL PENETRATION RESISTANCE
      </text>
      <text x="260" y="10" fill="#00f0ff" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" text-anchor="end">
        SHD_LVL: ${defense}
      </text>
    </g>
  </g>

  <!-- RIGHT COLUMN: WORLD INFECTION MAP -->
  <g transform="translate(340, 45)">
    <rect x="10" y="10" width="420" height="235" fill="rgba(10, 11, 16, 0.7)" stroke="#1d2030" stroke-width="1" rx="3" />
    <text x="25" y="30" fill="#00f0ff" font-family="'Share Tech Mono', monospace" font-size="12" font-weight="bold" letter-spacing="1">
      [ GLOBAL INFECTION TOPOLOGY ]
    </text>

    <!-- Stylized Dotted World Map Outline (Backdrop) -->
    <!-- Major continents outlines simplified into neon hex dots -->
    <g opacity="0.1" fill="#00f0ff">
      <!-- Faint geographic texture, positioned in the panel's local coordinates -->
      <circle cx="45" cy="85" r="1.5" /><circle cx="55" cy="75" r="1.5" /><circle cx="65" cy="95" r="1.5" /><circle cx="80" cy="105" r="1.5" /><circle cx="90" cy="95" r="1.5" />
      <circle cx="105" cy="155" r="1.5" /><circle cx="115" cy="170" r="1.5" /><circle cx="125" cy="185" r="1.5" /><circle cx="135" cy="165" r="1.5" />
      <circle cx="150" cy="75" r="1.5" /><circle cx="160" cy="85" r="1.5" /><circle cx="170" cy="70" r="1.5" /><circle cx="180" cy="90" r="1.5" />
      <circle cx="195" cy="140" r="1.5" /><circle cx="205" cy="160" r="1.5" /><circle cx="215" cy="180" r="1.5" /><circle cx="225" cy="155" r="1.5" />
      <circle cx="245" cy="90" r="1.5" /><circle cx="260" cy="100" r="1.5" /><circle cx="280" cy="80" r="1.5" /><circle cx="300" cy="100" r="1.5" /><circle cx="325" cy="90" r="1.5" /><circle cx="345" cy="110" r="1.5" />
      <circle cx="345" cy="175" r="1.5" /><circle cx="360" cy="185" r="1.5" /><circle cx="375" cy="195" r="1.5" />
    </g>

    <!-- Map Connections and Infection Nodes -->
    ${linksSVG}
    ${nodesSVG}
  </g>

  <!-- BOTTOM PANEL: TERMINAL DECODING LOG -->
  <g>
    <!-- Section Border -->
    <rect x="25" y="310" width="750" height="65" fill="rgba(10, 11, 16, 0.9)" stroke="#1d2030" stroke-width="1" rx="3" />
    
    <!-- Pulse scan line simulated inside log window -->
    <line x1="25" y1="310" x2="775" y2="310" stroke="#00f0ff" stroke-width="0.5" opacity="0.8">
      <animate attributeName="y1" values="310;375;310" dur="4s" repeatCount="indefinite" />
      <animate attributeName="y2" values="310;375;310" dur="4s" repeatCount="indefinite" />
    </line>

    <text x="35" y="325" fill="#8892b0" font-family="'Share Tech Mono', monospace" font-size="9" letter-spacing="1">
      TERMINAL FEEDOUT::ACTIVE_LOGS
    </text>
    
    <!-- Blinking command cursor -->
    <rect x="760" y="350" width="8" height="12" fill="#00ff66">
      <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
    </rect>

    ${terminalLines}
  </g>
</svg>
`;
}
