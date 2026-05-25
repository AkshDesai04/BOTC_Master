// ══════════════════════════════════════════════════════════════════════════
// BOTC STORYTELLER ENGINE — REDESIGN
// ══════════════════════════════════════════════════════════════════════════

// Shared visual configuration
const TYPE_CLR = {
  townsfolk: { bg: "rgba(45, 90, 39, 0.08)", bdr: "#2D5A27", txt: "#a3e498" },
  outsider:  { bg: "rgba(41, 128, 185, 0.08)", bdr: "#2980b9", txt: "#5dade2" },
  minion:    { bg: "rgba(142, 68, 173, 0.08)", bdr: "#8e44ad", txt: "#bb8fce" },
  demon:     { bg: "rgba(149, 27, 30, 0.08)", bdr: "#951B1E", txt: "#e74c3c" },
  traveller: { bg: "rgba(243, 156, 18, 0.08)", bdr: "#f39c12", txt: "#f5b041" }
};
const TEMOJI = { townsfolk: "🏘️", outsider: "🌿", minion: "🗡️", demon: "👹", traveller: "🤹" };

// Access the active script object
function S() {
  if (state.scriptId === "tb") return TB;
  if (state.scriptId === "bmr") return BMR;
  if (state.scriptId === "sv") return SV;
  return TB;
}

// ══════════════════════════════════════════════════════════════════════════
// CORE UTILITIES
// ══════════════════════════════════════════════════════════════════════════
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Render fallback character emojis or loaded images gracefully
function renderRoleImage(roleId, type, size = 32, style = "") {
  if (!roleId || !type) return "";
  const typeMap = { townsfolk: "townsfolk", outsider: "outsiders", minion: "minions", demon: "demons", traveller: "travellers" };
  const dir = typeMap[type] || "townsfolk";
  const basePath = `assets/images/${dir}/${roleId}`;
  return `<img src="${basePath}.png" alt="${roleId}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:50%;background:rgba(0,0,0,0.1);padding:2px;${style}" onerror="this.outerHTML='<span style=\\'font-size:${size * 0.75}px;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px\\'>${TEMOJI[type]||'❓'}</span>'">`;
}

// ══════════════════════════════════════════════════════════════════════════
// GLOBAL GAME STATE
// ══════════════════════════════════════════════════════════════════════════
const SAVE_KEY = "botc_storyteller_v2";

let state = {
  screen: "select",       // select | count | names | roles | reveal | game | victory
  scriptId: null,         // tb | bmr | sv
  playerCount: 8,
  names: [],
  nameInput: "",

  // Role setup
  dist: { t: 0, o: 0, m: 0, d: 0 }, // Modified distribution
  rolePool: [],           // List of role IDs selected in the game pool
  assignments: {},        // playerIndex -> roleId
  revealIndex: 0,         // Index of player during hand-off role reveal

  // Active game variables
  dayNum: 1,
  phase: "night",         // night | day
  activeWakeIdx: 0,       // current woken role in night sequence
  nightLog: [],           // current night choices/actions
  alive: {},              // playerIndex -> boolean
  nominations: [],        // list of nominations today
  votes: {},              // playerIndex -> number of vote tokens (default 1)
  ghostVotes: {},         // playerIndex -> boolean (used ghost vote)
  deathsLastNight: [],    // tracking deaths
  chronicle: [],          // chronological logs of events: { type, nightNum, dayNum, title, details, badgeColor }
  drawerOpen: false,      // storyteller sidebar menu drawer state
  winTeam: null,          // good | evil

  // Timers
  timerSeconds: 300,
  timerTotal: 300,
  timerRunning: false,
  timerIntervalId: null,

  // UI helpers
  tab: "grimoire",        // grimoire | night | day | chronicle
  confirm: null,          // confirm dialog modal state
  showCard: null,         // popup dismissible card modal state
};

// Auto save state
function autoSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      _saved: Date.now(),
      screen: state.screen,
      scriptId: state.scriptId,
      playerCount: state.playerCount,
      dist: state.dist,
      names: state.names,
      rolePool: state.rolePool,
      assignments: state.assignments,
      revealIndex: state.revealIndex,
      dayNum: state.dayNum,
      phase: state.phase,
      activeWakeIdx: state.activeWakeIdx,
      nightLog: state.nightLog,
      alive: state.alive,
      nominations: state.nominations,
      votes: state.votes,
      ghostVotes: state.ghostVotes,
      deathsLastNight: state.deathsLastNight,
      chronicle: state.chronicle,
      winTeam: state.winTeam,
      timerSeconds: state.timerSeconds,
      timerTotal: state.timerTotal,
      tab: state.tab,
    }));
  } catch (e) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function resetEngine() {
  stopTimer();
  clearSave();
  state = {
    screen: "select",
    scriptId: null,
    playerCount: 8,
    names: [],
    nameInput: "",
    dist: { t: 0, o: 0, m: 0, d: 0 },
    rolePool: [],
    assignments: {},
    revealIndex: 0,
    dayNum: 1,
    phase: "night",
    activeWakeIdx: 0,
    nightLog: [],
    alive: {},
    nominations: [],
    votes: {},
    ghostVotes: {},
    deathsLastNight: [],
    chronicle: [],
    drawerOpen: false,
    winTeam: null,
    timerSeconds: 300,
    timerTotal: 300,
    timerRunning: false,
    timerIntervalId: null,
    tab: "grimoire",
    confirm: null,
    showCard: null
  };
  autoSave();
  render();
}

function resumeGame() {
  const saved = loadFromStorage();
  if (saved) {
    Object.assign(state, saved);
    if (!saved.dist) {
      const s = S();
      const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
      state.dist = { ...d };
    }
    state.showResume = false;
    if (state.timerRunning) {
      state.timerRunning = false; // pause on reload for safety
    }
    render();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER ROUTINE
// ══════════════════════════════════════════════════════════════════════════
function render() {
  const app = document.getElementById("app");
  if (!app) return;

  let html = renderHeader();

  switch (state.screen) {
    case "select":     html += renderSelectScreen(); break;
    case "count":      html += renderCountScreen(); break;
    case "names":      html += renderNamesScreen(); break;
    case "roles":      html += renderRolesScreen(); break;
    case "reveal":     html += renderRevealScreen(); break;
    case "game":       html += renderGameScreen(); break;
    case "victory":    html += renderVictoryScreen(); break;
  }

  html += renderOverlays();
  app.innerHTML = html;

  // Roster input focus helper
  if (state.screen === "names" && state.names.length < state.playerCount) {
    const el = document.getElementById(`name-input-${state.names.length}`);
    if (el) setTimeout(() => el.focus(), 80);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HEADER & STYLED APP TOP BAR
// ══════════════════════════════════════════════════════════════════════════
function renderHeader() {
  const hasGameActive = state.screen === "game" || state.screen === "reveal" || state.screen === "victory";
  const s = state.scriptId ? S() : null;

  return `
    <div class="header" style="position:relative">
      <div style="display:flex;align-items:center;gap:14px">
        <button onclick="toggleDrawer()" style="background:none;border:none;color:var(--text);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center">☰</button>
        <span class="header-title" style="color:${s ? s.color : 'var(--text)'};font-family:var(--font-serif)">
          ${s ? s.name : "Storyteller's Grimoire"}
        </span>
      </div>
      ${hasGameActive ? `
        <div style="display:flex;align-items:center;gap:10px">
          <div class="phase-badge ${state.phase === 'night' ? 'warn-red' : 'warn-orange'}" style="margin:0;font-size:10px;font-weight:700">
            ${state.phase === 'night' ? '🌙 Night' : '☀️ Day'} ${state.dayNum}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Toggle drawer state
function toggleDrawer() {
  state.drawerOpen = !state.drawerOpen;
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// OVERLAYS (Drawer, Modal cards, Confirm prompts)
// ══════════════════════════════════════════════════════════════════════════
function renderOverlays() {
  let html = "";

  // Storyteller Navigation Sidebar Drawer
  if (state.drawerOpen) {
    html += `
      <div class="overlay" style="z-index:900;background:rgba(0,0,0,0.6)" onclick="toggleDrawer()">
        <div class="drawer-menu" style="position:absolute;left:0;top:0;bottom:0;width:280px;background:var(--surface2);border-right:1px solid var(--border);padding:24px 16px;display:flex;flex-direction:column;gap:18px;animation:slideIn 0.2s ease-out" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px">
            <h3 style="font-family:var(--font-serif);color:var(--text)">Storyteller Menu</h3>
            <button onclick="toggleDrawer()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();state.confirm={msg:'Start a completely new session? Your current game will be erased.',onYes:'resetEngine'};render()">🔄 Reset Session</button>
            <button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();state.showCard={title:'Volume Control',text:'Adjust phone notifications or alarm sounds. Digital clock sound registers automatically at countdown end.',emoji:'🔊'};render()">🔊 Alarm Volume</button>
            <button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();state.showCard={title:'Rulebook Quick Reference',text:'1. Good wins if the Demon dies and cannot make a starpass.\\n2. Evil wins if only 2 players are alive and the Demon survives.\\n3. Keep your private grim hidden from players during Night hand-offs!',emoji:'📖'};render()">📖 Rules Quickref</button>
          </div>

          <div style="margin-top:auto;border-top:1px solid var(--border);padding-top:16px;font-size:11px;color:var(--text3);text-align:center">
            BOTC Grimoire companion v2.0
          </div>
        </div>
      </div>
    `;
  }

  // Resume state prompt
  if (state.showResume) {
    const s = state.scriptId ? S() : null;
    html += `
      <div class="overlay" style="z-index:220">
        <div class="overlay-box" style="border:2px solid var(--blue);box-shadow: 0 0 16px rgba(41, 128, 185, 0.2)">
          <div style="font-size:36px;margin-bottom:12px">💾</div>
          <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px">Saved Session Found</div>
          <p style="font-size:13px;color:var(--text2);margin-bottom:16px">
            Resume the active game of <strong>${s ? s.name : 'Unknown Script'}</strong>?
          </p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="flex:1;margin:0" onclick="state.showResume=false;resetEngine()">New Game</button>
            <button class="btn btn-primary" style="flex:1;margin:0" onclick="resumeGame()">Resume</button>
          </div>
        </div>
      </div>
    `;
  }

  // Confirmation box
  if (state.confirm) {
    html += `
      <div class="confirm-overlay" style="z-index:250">
        <div class="confirm-box">
          <div style="font-size:32px;margin-bottom:8px">⚠️</div>
          <div style="font-size:13px;color:var(--text);margin-bottom:16px;line-height:1.5">${state.confirm.msg}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="flex:1;margin:0" onclick="state.confirm=null;render()">Cancel</button>
            <button class="btn btn-primary" style="flex:1;margin:0" onclick="${state.confirm.onYes}();state.confirm=null;">Confirm</button>
          </div>
        </div>
      </div>
    `;
  }

  // Dismissible details card popup
  if (state.showCard) {
    html += `
      <div class="overlay" style="z-index:300" onclick="state.showCard=null;render()">
        <div class="show-card" style="background:var(--surface2);border:1px solid var(--border);padding:24px;border-radius:12px;width:90%;max-width:380px;text-align:center;box-shadow: 0 8px 32px rgba(0,0,0,0.6)" onclick="event.stopPropagation()">
          <div style="font-size:48px;margin-bottom:12px">${state.showCard.emoji || 'ℹ️'}</div>
          <h3 style="font-family:var(--font-serif);color:var(--text);margin-bottom:8px;font-size:22px">${state.showCard.title}</h3>
          <p style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px">${state.showCard.text.replace(/\n/g, '<br>')}</p>
          <button class="btn btn-primary" style="padding:10px" onclick="state.showCard=null;render()">Dismiss</button>
        </div>
      </div>
    `;
  }

  return html;
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1: SCRIPT SELECTION SCREEN (`Script Selection.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderSelectScreen() {
  const scripts = [
    {
      id: "tb",
      name: "Trouble Brewing",
      emoji: "🍸",
      color: "#951B1E",
      desc: "A perfect introduction. Deception is straightforward, and the evils are known. Ideal for newer players and storytellers alike.",
      tag: "Recommended for new players"
    },
    {
      id: "bmr",
      name: "Bad Moon Rising",
      emoji: "🌙",
      color: "#f39c12",
      desc: "Death is not the end, and survival is not guaranteed. Focuses heavily on deduction through night deaths and complex mechanics.",
      tag: "More complex — experienced players"
    },
    {
      id: "sv",
      name: "Sects & Violets",
      emoji: "👁️",
      color: "#9b59b6",
      desc: "Madness and misinformation rule. A highly complex script where alignments shift and information is rarely what it seems.",
      tag: "High madness and information control"
    }
  ];

  let cards = "";
  scripts.forEach(s => {
    cards += `
      <div class="script-card" style="border: 1px solid ${s.color}33;background:rgba(30,30,30,0.4);border-radius:12px;padding:20px;margin-bottom:14px;cursor:pointer;transition:all 0.2s" onclick="pickScript('${s.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:36px">${s.emoji}</div>
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${s.color}">${s.tag}</span>
        </div>
        <h3 style="font-family:var(--font-serif);color:${s.color};font-size:20px;margin-bottom:6px">${s.name}</h3>
        <p style="font-size:12px;color:var(--text3);line-height:1.5">${s.desc}</p>
      </div>
    `;
  });

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Script Selection</h2>
        <p style="color:var(--text3);font-size:13px">Choose the fate of Ravenswood Bluff.</p>
      </div>
      
      <div style="margin-bottom:20px">${cards}</div>
    </div>
  `;
}

function pickScript(id) {
  state.scriptId = id;
  state.screen = "count";
  const s = S();
  const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
  state.dist = { ...d };
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2: PLAYER SETUP SCREEN (`Player Setup.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderCountScreen() {
  const s = S();
  const d = state.dist;
  const total = (d.t || 0) + (d.o || 0) + (d.m || 0) + (d.d || 1);
  const mismatch = total !== state.playerCount;

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Player Setup</h2>
        <p style="color:var(--text3);font-size:13px">Gather your townsfolk. Determine the soul count for tonight's tragedy.</p>
      </div>

      <!-- Player Count Card -->
      <div class="card" style="padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:12px">Number of Players</div>

        <div style="display:flex;align-items:center;justify-content:center;gap:32px;margin-bottom:14px">
          <button class="timer-adj-btn" style="width:48px;height:48px;font-size:24px" onclick="adjCount(-1)">-</button>
          <span style="font-size:44px;font-weight:700;color:${s.color};font-family:var(--font-serif)">${state.playerCount}</span>
          <button class="timer-adj-btn" style="width:48px;height:48px;font-size:24px" onclick="adjCount(1)">+</button>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
          <span>Min: 5 players</span>
          <span>Max: 15 players</span>
        </div>
      </div>

      <!-- Distribution Preview Card -->
      <div class="card" style="padding:16px;border-radius:12px;background:rgba(0,0,0,0.15);margin-bottom:24px;border:1px solid ${mismatch ? 'var(--red)' : 'transparent'}">
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;font-family:var(--font-serif);display:flex;justify-content:space-between;align-items:center;">
          <span>STANDARD DISTRIBUTION:</span>
          <span style="color:${mismatch ? 'var(--red)' : 'var(--green)'};font-size:11px">Total: ${total} / ${state.playerCount}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px">
          <div style="display:flex;align-items:center;color:${TYPE_CLR.townsfolk.txt};background:${TYPE_CLR.townsfolk.bg};border:1px solid ${TYPE_CLR.townsfolk.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1">🏘️ Townsfolk</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('t', -1)">-</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.t}</span>
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('t', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.outsider.txt};background:${TYPE_CLR.outsider.bg};border:1px solid ${TYPE_CLR.outsider.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1">🌿 Outsiders</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('o', -1)">-</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.o}</span>
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('o', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.minion.txt};background:${TYPE_CLR.minion.bg};border:1px solid ${TYPE_CLR.minion.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1">🗡️ Minions</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('m', -1)">-</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.m}</span>
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('m', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.demon.txt};background:${TYPE_CLR.demon.bg};border:1px solid ${TYPE_CLR.demon.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1">👹 Demon</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('d', -1)">-</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.d ?? 1}</span>
              <button class="timer-adj-btn" style="width:20px;height:20px;font-size:12px" onclick="adjDist('d', 1)">+</button>
            </div>
          </div>
        </div>
        ${mismatch ? `<div style="color:var(--red);font-size:11px;margin-top:10px;text-align:center;font-weight:bold">⚠️ Distribution does not match player count!</div>` : ''}
      </div>

      <button class="btn btn-primary" ${mismatch ? 'style="opacity:0.5;pointer-events:none"' : ''} onclick="proceedToNames()">Proceed to Player Roster →</button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="state.screen='select';render()">← Back to Scripts</button>
    </div>
  `;
}

function adjDist(type, delta) {
  const s = S();
  // Get available characters for this script
  const availableCount = Object.values(s.C).filter(c => c.type === (type === 't' ? 'townsfolk' : type === 'o' ? 'outsider' : type === 'm' ? 'minion' : 'demon')).length;
  const min = type === 'd' ? 1 : 0;
  state.dist[type] = Math.max(min, Math.min(availableCount, (state.dist[type] || 0) + delta));
  autoSave();
  render();
}

function adjCount(delta) {
  state.playerCount = Math.max(5, Math.min(15, state.playerCount + delta));
  const s = S();
  const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
  state.dist = { ...d };
  autoSave();
  render();
}
function proceedToNames() {
  // Pad names array to length
  while (state.names.length < state.playerCount) {
    state.names.push("");
  }
  state.screen = "names";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 (cont): PLAYER ROSTER NAMES
// ══════════════════════════════════════════════════════════════════════════
function renderNamesScreen() {
  const entered = state.names.filter(n => n.trim() !== "").length;

  let roster = "";
  for (let i = 0; i < state.playerCount; i++) {
    roster += `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="seat-num" style="background:var(--border);border:none;width:28px;height:28px">${i + 1}</div>
        <input type="text" id="name-input-${i}" class="input" style="flex:1" 
          value="${esc(state.names[i])}" 
          placeholder="Enter player name..." 
          oninput="savePlayerName(${i}, this.value)"
          onkeydown="if(event.key==='Enter') focusNextName(${i})">
      </div>
    `;
  }

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Player Setup</h2>
          <p style="color:var(--text3);font-size:13px">Register players sitting clockwise around the table.</p>
        </div>
        <span class="phase-badge warn-red" style="font-size:11px">${entered}/${state.playerCount} Roster</span>
      </div>

      <div class="card" style="padding:16px;border-radius:12px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:12px">PLAYER ROSTER</div>
        ${roster}
      </div>

      <button class="btn btn-primary" onclick="proceedToRoles()">Continue to Roles →</button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="state.screen='count';render()">← Back</button>
    </div>
  `;
}

function savePlayerName(idx, val) {
  state.names[idx] = val;
  autoSave();
}

function focusNextName(idx) {
  const next = document.getElementById(`name-input-${idx + 1}`);
  if (next) next.focus();
}

function proceedToRoles() {
  // Ensure all names are filled out with defaults if missing
  for (let i = 0; i < state.playerCount; i++) {
    if (!state.names[i] || state.names[i].trim() === "") {
      state.names[i] = `Player ${i + 1}`;
    }
  }

  // Populate dynamic role pool based on active script character list
  const d = state.dist || { t: 3, o: 0, m: 1, d: 1 };
  
  // Randomize initial pool from the script
  const chars = S().C;
  const tfKeys = Object.keys(chars).filter(k => chars[k].type === "townsfolk");
  const osKeys = Object.keys(chars).filter(k => chars[k].type === "outsider");
  const mnKeys = Object.keys(chars).filter(k => chars[k].type === "minion");
  const dmKeys = Object.keys(chars).filter(k => chars[k].type === "demon");

  // Pick correct count randomly
  const chosenTF = shuffle(tfKeys).slice(0, d.t);
  const chosenOS = shuffle(osKeys).slice(0, d.o);
  const chosenMN = shuffle(mnKeys).slice(0, d.m);
  const chosenDM = shuffle(dmKeys).slice(0, d.d ?? 1);

  state.rolePool = [...chosenTF, ...chosenOS, ...chosenMN, ...chosenDM];
  
  // Empty assignments
  state.assignments = {};
  for (let i = 0; i < state.playerCount; i++) {
    state.assignments[i] = "";
  }

  state.screen = "roles";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3: ROLE POOL & ASSIGNMENT SCREEN (`Role Assignment.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderRolesScreen() {
  const s = S();
  const chars = s.C;

  let playerRows = "";
  for (let i = 0; i < state.playerCount; i++) {
    const roleId = state.assignments[i];
    const c = chars[roleId];
    const isAssigned = !!c;

    let roleDisplay = "";
    if (isAssigned) {
      const colors = TYPE_CLR[c.type];
      roleDisplay = `
        <div style="display:flex;align-items:center;gap:8px;background:${colors.bg};border:1px solid ${colors.bdr}44;padding:4px 8px;border-radius:6px">
          ${renderRoleImage(c.id, c.type, 20)}
          <span style="font-size:12px;font-weight:700;color:${colors.txt}">${c.name}</span>
          <span style="font-size:9px;text-transform:uppercase;color:var(--text3)">${c.type}</span>
        </div>
      `;
    } else {
      roleDisplay = `<span style="font-size:12px;color:var(--text3);font-style:italic">Unassigned</span>`;
    }

    playerRows += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="seat-num" style="background:${isAssigned ? TYPE_CLR[c.type].bdr : 'var(--border)'};border:none">${i + 1}</div>
          <span style="font-weight:600;font-size:14px;color:var(--text)">${esc(state.names[i])}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${roleDisplay}
          <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px" onclick="editPlayerRole(${i})">
            ${isAssigned ? '⇄ Swap' : '+ Assign'}
          </button>
        </div>
      </div>
    `;
  }

  // Render pool stats
  const poolCount = state.rolePool.length;
  const assignedCount = Object.keys(state.assignments).filter(k => state.assignments[k] !== "").length;

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Role Assignment</h2>
          <p style="color:var(--text3);font-size:13px">Distribute role tokens to the roster.</p>
        </div>
        <button class="btn-outline" style="padding:6px 12px;font-size:11px" onclick="randomizeAssignments()">🔀 Randomize All</button>
      </div>

      <!-- Role Pool Display Card -->
      <div class="card" style="padding:14px;border-radius:12px;margin-bottom:16px;background:rgba(0,0,0,0.1)">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:10px">
          <span>Target Pool (${poolCount} Roles Selected)</span>
          <button style="background:none;border:none;color:${s.color};font-size:11px;font-weight:700;cursor:pointer" onclick="openPoolEditor()">✎ Customize Pool</button>
        </div>
        
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${state.rolePool.map(rid => {
            const rc = chars[rid] || { name: rid, type: "townsfolk" };
            return `
              <span style="font-size:11px;background:${TYPE_CLR[rc.type].bg};border:1px solid ${TYPE_CLR[rc.type].bdr}33;color:${TYPE_CLR[rc.type].txt};padding:3px 6px;border-radius:4px">
                ${rc.name}
              </span>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Player List -->
      <div style="margin-bottom:24px">
        ${playerRows}
      </div>

      <button class="btn btn-primary" ${assignedCount < state.playerCount ? 'class="btn btn-disabled" disabled' : ''} onclick="finalizeGrimoire()">
        📖 Finalize Grimoire
      </button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="state.screen='names';render()">← Back to Roster</button>
    </div>
  `;
}

function randomizeAssignments() {
  const shuffledPool = shuffle(state.rolePool);
  for (let i = 0; i < state.playerCount; i++) {
    state.assignments[i] = shuffledPool[i] || "";
  }
  autoSave();
  render();
}

// Edit a single player's role assignment manually
function editPlayerRole(playerIdx) {
  const s = S();
  const chars = s.C;
  
  // Render options from pool + unpicked script roles
  let optionsHtml = "";
  Object.keys(chars).forEach(rid => {
    const c = chars[rid];
    const inPool = state.rolePool.includes(rid);
    const badge = inPool ? `<span style="font-size:9px;background:rgba(255,255,255,0.05);color:var(--text3);padding:2px 4px;border-radius:3px">Pool</span>` : "";

    optionsHtml += `
      <button class="btn" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);justify-content:space-between;margin-bottom:6px" 
        onclick="assignRoleToPlayer(${playerIdx}, '${rid}');state.showCard=null;render()">
        <span style="display:flex;align-items:center;gap:8px">
          ${renderRoleImage(c.id, c.type, 20)}
          <strong style="color:${TYPE_CLR[c.type].txt}">${c.name}</strong>
          <span style="font-size:10px;color:var(--text3)">(${c.type})</span>
        </span>
        ${badge}
      </button>
    `;
  });

  state.showCard = {
    title: `Assign Role: ${esc(state.names[playerIdx])}`,
    emoji: "🃏",
    text: `Select a character token to place in ${esc(state.names[playerIdx])}'s grimoire slot:<br><br><div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column">${optionsHtml}</div>`
  };
  render();
}

function assignRoleToPlayer(pIdx, rid) {
  state.assignments[pIdx] = rid;
  // If role chosen wasn't in pool, swap/append it dynamically
  if (!state.rolePool.includes(rid)) {
    const oldRole = state.assignments[pIdx];
    const oldIdx = state.rolePool.indexOf(oldRole);
    if (oldIdx >= 0) {
      state.rolePool[oldIdx] = rid;
    } else {
      state.rolePool.push(rid);
    }
  }
  autoSave();
}

// Customize dynamic pool
function openPoolEditor() {
  const s = S();
  const chars = s.C;
  
  let listHtml = "";
  Object.keys(chars).forEach(rid => {
    const c = chars[rid];
    const selected = state.rolePool.includes(rid);
    
    listHtml += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px;border-bottom:1px solid var(--border)">
        <span style="display:flex;align-items:center;gap:6px">
          ${renderRoleImage(c.id, c.type, 18)}
          <span style="color:${TYPE_CLR[c.type].txt};font-size:13px">${c.name}</span>
        </span>
        <input type="checkbox" ${selected ? 'checked' : ''} onchange="togglePoolRole('${rid}', this.checked)">
      </div>
    `;
  });

  state.showCard = {
    title: "Customize Role Pool",
    emoji: "⚙️",
    text: `Toggle roles that should be present in tonight's distribution:<br><br><div style="max-height:250px;overflow-y:auto;text-align:left">${listHtml}</div>`
  };
  render();
}

function togglePoolRole(rid, enabled) {
  if (enabled) {
    if (!state.rolePool.includes(rid)) state.rolePool.push(rid);
  } else {
    state.rolePool = state.rolePool.filter(id => id !== rid);
  }
  autoSave();
}

// Finalize the setup stage and enter Hand-off reveal
function finalizeGrimoire() {
  // Complete initial states
  state.dayNum = 1;
  state.phase = "night";
  state.activeWakeIdx = 0;
  state.nightLog = [];
  state.revealIndex = 0;
  state.winTeam = null;

  // Set initial alive status
  state.alive = {};
  state.votes = {};
  state.ghostVotes = {};
  for (let i = 0; i < state.playerCount; i++) {
    state.alive[i] = true;
    state.votes[i] = 1;
    state.ghostVotes[i] = false;
  }

  // Push initial game start log into chronicle
  state.chronicle = [
    {
      type: "system",
      title: "Tragedy Begins",
      details: `A new game of <strong>${S().name}</strong> has commenced at Ravenswood Bluff with ${state.playerCount} players.`,
      badgeColor: "var(--border)"
    }
  ];

  state.screen = "reveal";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4: HAND-OFF ROLE REVEAL SCREEN (`Role Reveal.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderRevealScreen() {
  const pIdx = state.revealIndex;
  const pName = state.names[pIdx];
  const rId = state.assignments[pIdx];
  const c = S().C[rId];

  const colors = TYPE_CLR[c.type];
  const alignLabel = c.team === "evil" ? "EVIL • DEMON / MINION" : "GOOD • TOWNSFOLK / OUTSIDER";
  const alignColor = c.team === "evil" ? "var(--red)" : "var(--green)";

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <!-- Full screen hand-off layout -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--red)"></span>
          Phase: Hand-off
        </span>
        <button onclick="abortToGrimSetup()" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer">✕</button>
      </div>

      <div class="card" style="border: 2px solid ${colors.bdr};box-shadow: 0 0 20px ${colors.bdr}22;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">PLAYER ${pIdx + 1} OF ${state.playerCount}</div>
        <h2 style="font-family:var(--font-serif);font-size:32px;color:var(--text);margin-bottom:18px">${esc(pName)}</h2>
        
        <div style="margin-bottom:18px">${renderRoleImage(c.id, c.type, 96)}</div>
        
        <div style="font-size:11px;font-weight:700;color:${alignColor};letter-spacing:2px;margin-bottom:6px">${alignLabel}</div>
        <h1 style="font-family:var(--font-serif);font-size:40px;color:${colors.txt};margin-bottom:16px">${c.name}</h1>
        
        <div style="background:rgba(0,0,0,0.15);border:1px solid var(--border);border-radius:8px;padding:12px 16px;font-size:13px;color:var(--text2);line-height:1.6;text-align:left">
          ${esc(c.ab)}
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <button class="btn btn-outline" style="flex:1;margin:0" ${pIdx === 0 ? 'disabled' : ''} onclick="prevReveal()">← Prev</button>
        <div class="phase-badge done" style="font-weight:700">${pIdx + 1} of ${state.playerCount}</div>
        <button class="btn btn-primary" style="flex:2;margin:0" onclick="nextReveal()">
          ${pIdx < state.playerCount - 1 ? 'Next Player →' : '🌙 Start Night 1'}
        </button>
      </div>
    </div>
  `;
}

function prevReveal() {
  if (state.revealIndex > 0) {
    state.revealIndex--;
    render();
  }
}

function nextReveal() {
  if (state.revealIndex < state.playerCount - 1) {
    state.revealIndex++;
    render();
  } else {
    // Reveal finished, proceed to night 1
    state.screen = "game";
    state.tab = "night";
    state.phase = "night";
    state.dayNum = 1;
    state.activeWakeIdx = 0;
    state.nightLog = [];
    autoSave();
    render();
  }
}

function abortToGrimSetup() {
  state.screen = "roles";
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5: GUIDED NIGHT PHASE SCREEN (`Night Phase.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderNightScreen() {
  const s = S();
  const nightOrder = state.dayNum === 1 ? s.FIRST_NIGHT : s.OTHER_NIGHT;
  
  // Filter active wake order to only show elements in play
  const activeWakeList = nightOrder.filter(n => {
    // minion/demon info always wakes on Night 1
    if (n.id.startsWith("_")) return true;
    
    // Check if role is in play
    return Object.values(state.assignments).includes(n.id);
  });

  const stepCount = activeWakeList.length;

  if (state.activeWakeIdx >= stepCount) {
    // Night is complete, proceed to Day announcements
    return `
      <div style="padding:16px;text-align:center">
        <div style="font-size:48px;margin-bottom:14px">🌅</div>
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:8px">Night Sequence Complete</h3>
        <p style="color:var(--text3);font-size:13px;line-height:1.6;margin-bottom:24px">
          All active roles have been processed successfully. Prepare your morning announcements.
        </p>
        <button class="btn btn-primary" onclick="proceedToDay()">Rise & Shine for Day ${state.dayNum} →</button>
      </div>
    `;
  }

  const activeNode = activeWakeList[state.activeWakeIdx];
  const charDetails = s.C[activeNode.id] || { name: activeNode.title || activeNode.id, type: "demon", ab: "", fn_r: "", on_r: "" };

  // Waking list timeline builder
  let timelineItems = "";
  activeWakeList.forEach((n, idx) => {
    const rc = s.C[n.id] || { name: n.title || n.id, type: "demon" };
    const done = idx < state.activeWakeIdx;
    const current = idx === state.activeWakeIdx;

    if (done) {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;opacity:0.4">
          <span style="font-size:12px;color:var(--green)">✓</span>
          <span style="font-size:13px;text-decoration:line-through">${rc.name}</span>
        </div>
      `;
    } else if (current) {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;background:rgba(149, 27, 30, 0.12);border:1px solid rgba(149, 27, 30, 0.3);padding:6px 12px;border-radius:6px">
          <span style="font-size:10px;color:var(--red)">▶</span>
          <strong style="font-size:13px;color:var(--text)">${rc.name}</strong>
        </div>
      `;
    } else {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;opacity:0.35">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--text3)"></span>
          <span style="font-size:13px">${rc.name}</span>
        </div>
      `;
    }
  });

  // Action variables checklist
  const wakeDesc = state.dayNum === 1 ? (charDetails.fn_r || "Give info") : (charDetails.on_r || "Perform action");
  let actionControls = "";

  if (!activeNode.id.startsWith("_")) {
    // Display checkboxes or player options
    let playerSelect = "";
    for (let i = 0; i < state.playerCount; i++) {
      if (state.alive[i]) {
        playerSelect += `<option value="${i}">${esc(state.names[i])} (${s.C[state.assignments[i]]?.name})</option>`;
      }
    }

    actionControls = `
      <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;text-align:left">
        <label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase">Log Action</label>
        <div style="display:flex;gap:8px;margin-top:6px">
          <select id="night-target-select" class="input" style="flex:1">
            <option value="">-- Choose player target --</option>
            ${playerSelect}
          </select>
          <button class="btn btn-primary" style="width:auto" onclick="submitNightTarget('${activeNode.id}')">Submit</button>
        </div>
      </div>
    `;
  }

  return `
    <div style="padding:16px">
      <!-- Active Card -->
      <div class="card" style="border-radius:12px;border-color:var(--border);padding:24px;margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:10px;font-weight:700;color:${TYPE_CLR[charDetails.type]?.txt || 'var(--text3)'};text-transform:uppercase;letter-spacing:1.5px">
            ${(charDetails.type || 'SYSTEM').toUpperCase()} • ACTION REQUIRED
          </span>
          <span style="font-size:11px;color:var(--text3)">${state.activeWakeIdx + 1} of ${stepCount}</span>
        </div>
        
        <h3 style="font-family:var(--font-serif);font-size:28px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:10px">
          ${renderRoleImage(charDetails.id, charDetails.type, 32)}
          ${charDetails.name}
        </h3>

        <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);padding:14px;border-radius:8px;font-size:13px;line-height:1.6;color:var(--text2);text-align:left">
          <strong>Storyteller Instructions:</strong><br>
          <span style="display:block;margin-top:4px;color:var(--orange)">${esc(wakeDesc)}</span>
        </div>

        ${actionControls}

        <div style="display:flex;align-items:center;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-primary" style="width:auto;padding:8px 16px" onclick="nextNightStep()">
            Next Step →
          </button>
        </div>
      </div>

      <!-- Timeline Order -->
      <div class="card" style="border-radius:12px;background:rgba(0,0,0,0.1);padding:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:10px">NIGHT ORDER SEQUENCE</div>
        <div style="max-height:160px;overflow-y:auto;text-align:left">
          ${timelineItems}
        </div>
      </div>
    </div>
  `;
}

function submitNightTarget(rid) {
  const el = document.getElementById("night-target-select");
  if (!el || el.value === "") return;
  const pIdx = parseInt(el.value);
  const pName = state.names[pIdx];

  state.nightLog.push({ roleId: rid, targetIndex: pIdx });

  // Custom logical actions based on scripts
  if (rid === "poisoner") {
    // Poison target
    state.chronicle.push({
      type: "night",
      nightNum: state.dayNum,
      title: "Poisoner Target",
      details: `The Poisoner poisoned <strong>${pName}</strong>.`,
      badgeColor: TYPE_CLR.minion.bdr
    });
  } else if (rid === "imp" || rid === "fanggu" || rid === "nodashi" || rid === "vortox" || rid === "vigormortis") {
    // Demon kill targets
    state.deathsLastNight.push(pIdx);
    state.chronicle.push({
      type: "night",
      nightNum: state.dayNum,
      title: "Demon Strike",
      details: `The Demon targeted <strong>${pName}</strong>.`,
      badgeColor: TYPE_CLR.demon.bdr
    });
  } else {
    // General action log
    state.chronicle.push({
      type: "night",
      nightNum: state.dayNum,
      title: `${S().C[rid]?.name || rid} Action`,
      details: `Target chosen: <strong>${pName}</strong>.`,
      badgeColor: "var(--border)"
    });
  }

  el.value = "";
  autoSave();
  render();
}

function nextNightStep() {
  state.activeWakeIdx++;
  autoSave();
  render();
}

function proceedToDay() {
  state.phase = "day";
  state.tab = "day";
  state.activeWakeIdx = 0;
  
  // Apply overnight deaths
  state.deathsLastNight.forEach(pIdx => {
    state.alive[pIdx] = false;
  });

  // Chronicle day entry
  state.chronicle.push({
    type: "system",
    dayNum: state.dayNum,
    title: `Day ${state.dayNum} Rises`,
    details: `The town wakes up to face Day ${state.dayNum}.`,
    badgeColor: "var(--border)"
  });

  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 6: DAY ANNOUNCEMENTS / MORNING BRIEF SCREEN (`Day Announcements.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderDayScreen() {
  let announcements = "";

  // 1. Deaths Announcements
  if (state.deathsLastNight.length > 0) {
    state.deathsLastNight.forEach(pIdx => {
      const pName = state.names[pIdx];
      const rc = S().C[state.assignments[pIdx]];
      announcements += `
        <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--red);padding:14px">
          <input type="checkbox" style="width:18px;height:18px">
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase">Death Announcement</div>
            <strong style="font-size:14px;color:var(--text)">${esc(pName)} (${rc?.name}) died last night.</strong>
          </div>
          <span style="font-size:20px">☠️</span>
        </div>
      `;
    });
  } else {
    announcements += `
      <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--green);padding:14px">
        <input type="checkbox" style="width:18px;height:18px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase">Peaceful Night</div>
          <strong style="font-size:14px;color:var(--text)">No one died during the night.</strong>
        </div>
        <span style="font-size:20px">✨</span>
      </div>
    `;
  }

  // 2. Events & Reminders based on script
  announcements += `
    <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--blue);padding:14px">
      <input type="checkbox" style="width:18px;height:18px">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase">Reminder</div>
        <span style="font-size:13px;color:var(--text2)">Announce that public nominations are open now. Dead players retain 1 vote token!</span>
      </div>
      <span style="font-size:20px">🔔</span>
    </div>
  `;

  return `
    <div style="padding:16px">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px;color:var(--orange)">☀️ Day ${state.dayNum}</h3>
        <p style="color:var(--text3);font-size:13px">Morning Brief — check off announcements as they are delivered.</p>
      </div>

      <div style="margin-bottom:24px">${announcements}</div>

      <button class="btn btn-primary" onclick="startTimerUI()">
        ⏱ Start Discussion Timer (${formatTime(state.timerTotal)})
      </button>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 7: DISCUSSION TIMER DIAL SCREEN (`Discussion Timer.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderTimerScreen() {
  const pct = state.timerTotal > 0 ? (state.timerSeconds / state.timerTotal) * 100 : 0;
  
  // Math for circular ring dial
  const radius = 80;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return `
    <div style="padding:16px;text-align:center">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px">Town Square</h3>
        <p style="color:var(--text3);font-size:13px">Day Phase — private/public discussions.</p>
      </div>

      <!-- Circular Timer Dial -->
      <div style="position:relative;width:200px;height:200px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center">
        <svg style="transform: rotate(-90deg);width:100%;height:100%">
          <circle stroke="var(--border)" fill="transparent" stroke-width="${stroke}" r="${normalizedRadius}" cx="${radius}" cy="${radius}" style="transform: scale(1.25);transform-origin:center"/>
          <circle stroke="var(--red)" fill="transparent" stroke-width="${stroke}" stroke-dasharray="${circumference} ${circumference}" style="stroke-dashoffset:${strokeDashoffset};transition: stroke-dashoffset 0.5s;transform: scale(1.25);transform-origin:center" r="${normalizedRadius}" cx="${radius}" cy="${radius}"/>
        </svg>
        <div style="position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-size:36px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums">${formatTime(state.timerSeconds)}</span>
          <span style="font-size:10px;text-transform:uppercase;color:var(--text3);letter-spacing:1px">Remaining</span>
        </div>
      </div>

      <!-- Timer controls -->
      <div style="display:flex;justify-content:center;gap:20px;margin-bottom:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%" onclick="adjustTimerVal(30)">+</button>
          <span style="font-size:11px;color:var(--text3)">Add 30s</span>
        </div>
        
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%" onclick="toggleTimerRunning()">
            ${state.timerRunning ? '⏸' : '▶'}
          </button>
          <span style="font-size:11px;color:var(--text3)">${state.timerRunning ? 'Pause' : 'Start'}</span>
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%;color:var(--red);border-color:var(--red)33" onclick="resetTimerVal()">■</button>
          <span style="font-size:11px;color:var(--text3)">Reset</span>
        </div>
      </div>

      <!-- Fast timeline trigger -->
      <button class="btn btn-outline" style="width:100%;margin-bottom:12px" onclick="proceedToNightStep()">
        🌙 Proceed to Night
      </button>

      <!-- Declare winner trigger -->
      <div style="display:flex;gap:8px">
        <button class="btn btn-blue" style="flex:1;background:rgba(45, 90, 39, 0.1);color:var(--green);border-color:var(--green)33;margin:0" onclick="triggerWin('good')">😇 Good Wins</button>
        <button class="btn btn-blue" style="flex:1;background:rgba(149, 27, 30, 0.1);color:var(--red);border-color:var(--red)33;margin:0" onclick="triggerWin('evil')">😈 Evil Wins</button>
      </div>
    </div>
  `;
}

function startTimerUI() {
  state.tab = "timer";
  startTimerTicker();
  render();
}

function startTimerTicker() {
  if (state.timerIntervalId) clearInterval(state.timerIntervalId);
  state.timerRunning = true;
  state.timerIntervalId = setInterval(() => {
    if (state.timerRunning && state.timerSeconds > 0) {
      state.timerSeconds--;
      if (state.timerSeconds === 0) {
        state.timerRunning = false;
        clearInterval(state.timerIntervalId);
        playAlarmAudio();
      }
      autoSave();
      render();
    }
  }, 1000);
}

function toggleTimerRunning() {
  state.timerRunning = !state.timerRunning;
  autoSave();
  render();
}

function adjustTimerVal(seconds) {
  state.timerSeconds += seconds;
  state.timerTotal = Math.max(state.timerTotal, state.timerSeconds);
  autoSave();
  render();
}

function resetTimerVal() {
  state.timerSeconds = 300;
  state.timerTotal = 300;
  state.timerRunning = false;
  autoSave();
  render();
}

function stopTimer() {
  state.timerRunning = false;
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function playAlarmAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach(d => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      gain.gain.value = 0.25;
      osc.start(ctx.currentTime + d);
      osc.stop(ctx.currentTime + d + 0.15);
    });
  } catch(e) {}
}

function triggerWin(team) {
  state.winTeam = team;
  state.screen = "victory";
  
  // Log winning state to chronicle
  state.chronicle.push({
    type: "system",
    title: "Tragedy Concluded",
    details: `The Storyteller has declared victory for <strong>${team.toUpperCase()}</strong>!`,
    badgeColor: team === "good" ? "var(--green)" : "var(--red)"
  });

  autoSave();
  render();
}

function proceedToNightStep() {
  stopTimer();
  state.phase = "night";
  state.dayNum++;
  state.activeWakeIdx = 0;
  state.nightLog = [];
  state.deathsLastNight = [];
  state.tab = "night";

  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 8: VICTORY SCREEN (`Victory Screen.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderVictoryScreen() {
  const isGood = state.winTeam === "good";
  const colors = isGood ? TYPE_CLR.townsfolk : TYPE_CLR.demon;
  const title = isGood ? "TOWNSFOLK WIN" : "DEMONS WIN";
  const desc = isGood ? "Light has triumphed. The evil has been banished from our village." : "The town has fallen to the darkness. Ravenswood Bluff is no more.";

  return `
    <div class="screen fade-in" style="padding-top:32px;text-align:center">
      <!-- Glow Portal symbol -->
      <div style="width:160px;height:160px;border-radius:50%;background:rgba(149,27,30,0.05);border:2px dashed ${colors.bdr};box-shadow: 0 0 40px ${colors.bdr}33;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite">
        <span style="font-size:72px">${isGood ? '😇' : '👹'}</span>
      </div>

      <h1 style="font-family:var(--font-serif);font-size:38px;color:${colors.txt};margin-bottom:12px;letter-spacing:1px">${title}</h1>
      <p style="color:var(--text3);font-size:14px;line-height:1.6;margin-bottom:32px;padding:0 20px">${desc}</p>

      <button class="btn btn-primary" onclick="showChronicleEnd()">📖 View Game Summary</button>
      
      <!-- Replay / Reset btn bottom-right -->
      <div style="margin-top:40px;text-align:right">
        <button class="timer-adj-btn" style="width:48px;height:48px;border-radius:50%;display:inline-flex" onclick="resetEngine()">↻</button>
      </div>
    </div>
  `;
}

function showChronicleEnd() {
  state.screen = "game";
  state.tab = "chronicle";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 9: GAME CHRONICLE TIMELINE SCREEN (`Game Summary.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderChronicleScreen() {
  let timeline = "";

  if (state.chronicle.length === 0) {
    return `<div style="color:var(--text3);text-align:center;padding:32px">The story of Ravenswood Bluff is waiting to unfold...</div>`;
  }

  state.chronicle.forEach((c, idx) => {
    let icon = "🔔";
    if (c.type === "night") icon = "🌙";
    if (c.type === "system" && c.title.includes("Tragedy Begins")) icon = "📜";
    if (c.type === "system" && c.title.includes("Concluded")) icon = "🏆";
    if (c.type === "day") icon = "☀️";

    timeline += `
      <div style="position:relative;padding-left:36px;margin-bottom:20px;text-align:left">
        <!-- Vertical connector line -->
        ${idx < state.chronicle.length - 1 ? `<div style="position:absolute;left:13px;top:26px;bottom:-20px;width:2px;background:var(--border)"></div>` : ''}
        
        <!-- Timeline dot -->
        <div style="position:absolute;left:0;top:2px;width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;z-index:2">
          <span style="font-size:12px">${icon}</span>
        </div>

        <div class="card" style="margin:0;padding:12px 16px;border-radius:10px;border-left:4px solid ${c.badgeColor || 'var(--border)'}">
          <div style="font-size:10px;text-transform:uppercase;color:var(--text3);letter-spacing:1px;font-weight:700;margin-bottom:4px">
            ${c.nightNum ? `Night ${c.nightNum}` : c.dayNum ? `Day ${c.dayNum}` : 'SETUP'}
          </div>
          <h4 style="font-family:var(--font-serif);color:var(--text);font-size:15px;margin-bottom:4px">${c.title}</h4>
          <p style="font-size:12px;color:var(--text2);line-height:1.5">${c.details}</p>
        </div>
      </div>
    `;
  });

  return `
    <div style="padding:16px">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px">Game Chronicle</h3>
        <p style="color:var(--text3);font-size:13px">The definitive history of Ravenswood Bluff.</p>
      </div>

      <div style="margin-bottom:28px">${timeline}</div>

      <button class="btn btn-primary" onclick="resetEngine()">🔄 Reset & New Game</button>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// PRIMARY GAME SCREEN (Grimoire tab, Day announcements tab, Night wakes)
// ══════════════════════════════════════════════════════════════════════════
function renderGameScreen() {
  let content = "";
  if (state.tab === "grimoire") {
    content = renderGrimoireTab();
  } else if (state.tab === "night") {
    content = renderNightScreen();
  } else if (state.tab === "day") {
    content = renderDayScreen();
  } else if (state.tab === "timer") {
    content = renderTimerScreen();
  } else if (state.tab === "chronicle") {
    content = renderChronicleScreen();
  }

  // Beautiful bottom navigation pills matching Script Selection bottom pills
  return `
    <div class="screen fade-in" style="padding-bottom:110px">
      ${content}
    </div>
    
    <!-- Bottom Navigation bar -->
    <div class="bottom-nav" style="position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:12px 0;z-index:200;backdrop-filter:blur(10px)">
      <button style="background:none;border:none;color:${state.tab === 'grimoire' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('grimoire')">
        <span style="font-size:18px">👁️</span>
        Grimoire
      </button>
      <button style="background:none;border:none;color:${state.tab === 'night' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('night')">
        <span style="font-size:18px">🌙</span>
        Night Sequence
      </button>
      <button style="background:none;border:none;color:${state.tab === 'day' || state.tab === 'timer' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('day')">
        <span style="font-size:18px">🏘️</span>
        Town Square
      </button>
      <button style="background:none;border:none;color:${state.tab === 'chronicle' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('chronicle')">
        <span style="font-size:18px">📜</span>
        Chronicle
      </button>
    </div>
  `;
}

function setTab(t) {
  state.tab = t;
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// GRIMOIRE TAB (Active view of player roster, alive metrics, character powers)
// ══════════════════════════════════════════════════════════════════════════
function renderGrimoireTab() {
  const s = S();
  const chars = s.C;

  let playerGrid = "";
  for (let i = 0; i < state.playerCount; i++) {
    const rId = state.assignments[i];
    const c = chars[rId];
    const colors = TYPE_CLR[c.type];
    const isAlive = state.alive[i];

    let badgeText = isAlive ? "Alive" : "Dead";
    let badgeColor = isAlive ? "var(--green)" : "var(--red)";

    playerGrid += `
      <div class="player-row" style="background:rgba(30,30,30,0.3);margin-bottom:10px;border-radius:10px;border:1px solid ${state.alive[i] ? 'var(--border)' : 'var(--red)33'}">
        <div class="player-main" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px" onclick="togglePlayerExpand(${i})">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="seat-num" style="background:${colors.bdr};border:none">${i + 1}</div>
            <div>
              <span style="font-weight:700;font-size:15px;color:var(--text);${isAlive ? '' : 'text-decoration:line-through;opacity:0.6'}">${esc(state.names[i])}</span>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font-size:11px;font-weight:700;color:${colors.txt}">${c.name}</span>
                <span style="font-size:9px;color:var(--text3);text-transform:uppercase">(${c.type})</span>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:10px;text-transform:uppercase;font-weight:700;color:${badgeColor};background:${badgeColor}11;border:1px solid ${badgeColor}33;padding:4px 8px;border-radius:4px">
              ${badgeText}
            </span>
            <span style="font-size:12px;color:var(--text3)">${state.expandedPlayer === i ? '▲' : '▼'}</span>
          </div>
        </div>

        <!-- Expansion drawer -->
        ${state.expandedPlayer === i ? `
          <div class="player-expand" style="border-top:1px solid var(--border);padding:14px;background:rgba(0,0,0,0.2);border-bottom-left-radius:10px;border-bottom-right-radius:10px">
            <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5">
              <strong>Ability:</strong> ${esc(c.ab)}
            </div>
            
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <button class="btn-sm" style="flex:1;background:${isAlive ? 'var(--red)15' : 'var(--green)15'};color:${isAlive ? 'var(--red)' : 'var(--green)'};border:1px solid ${isAlive ? 'var(--red)' : 'var(--green)'}44" onclick="togglePlayerAlive(${i})">
                ${isAlive ? '☠️ Mark Dead' : '💖 Resurrect'}
              </button>
              <button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="triggerStarpass(${i})">
                👑 Trigger Starpass
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <div style="padding:16px">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px">Grimoire</h3>
        <p style="color:var(--text3);font-size:13px">Active overview of player seats, tokens, and alignments.</p>
      </div>

      <div style="margin-bottom:24px">${playerGrid}</div>

      <button class="btn btn-outline" style="width:100%" onclick="state.confirm={msg:'Declare new game? This deletes session progress.',onYes:'resetEngine'};render()">
        🔄 New Game / Reset
      </button>
    </div>
  `;
}

function togglePlayerExpand(idx) {
  state.expandedPlayer = state.expandedPlayer === idx ? -1 : idx;
  render();
}

function togglePlayerAlive(idx) {
  state.alive[idx] = !state.alive[idx];
  
  // Log changes to chronicle
  state.chronicle.push({
    type: "day",
    dayNum: state.dayNum,
    title: state.alive[idx] ? "Resurrection" : "Death Announcement",
    details: `Storyteller manually updated <strong>${state.names[idx]}</strong> to be ${state.alive[idx] ? 'ALIVE' : 'DEAD'}.`,
    badgeColor: state.alive[idx] ? "var(--green)" : "var(--red)"
  });

  autoSave();
  render();
}

function triggerStarpass(idx) {
  const s = S();
  const c = s.C[state.assignments[idx]];

  if (c.type !== "demon") {
    state.showCard = {
      title: "Starpass Error",
      emoji: "❌",
      text: "Starpass can only be initiated on the active Demon."
    };
    render();
    return;
  }

  // Open pop up to select which alive Minion becomes Demon
  const minions = Object.keys(state.assignments).filter(pIdx => {
    return state.alive[pIdx] && s.C[state.assignments[pIdx]]?.type === "minion";
  });

  if (minions.length === 0) {
    state.showCard = {
      title: "Starpass Blocked",
      emoji: "🚫",
      text: "No living Minions are left to pass the demonhood to!"
    };
    render();
    return;
  }

  let optionsHtml = "";
  minions.forEach(mIdx => {
    optionsHtml += `
      <button class="btn" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);margin-bottom:6px"
        onclick="confirmStarpass(${idx}, ${mIdx})">
        <strong>${esc(state.names[mIdx])}</strong> (${s.C[state.assignments[mIdx]]?.name})
      </button>
    `;
  });

  state.showCard = {
    title: "Select New Demon",
    emoji: "👑",
    text: `Demon died. Choose which Minion inherits demonhood:<br><br>${optionsHtml}`
  };
  render();
}

function confirmStarpass(oldDemonIdx, newDemonIdx) {
  const s = S();
  const oldDemonName = state.names[oldDemonIdx];
  const newDemonName = state.names[newDemonIdx];
  
  // Set old demon dead, swap role
  state.alive[oldDemonIdx] = false;
  
  // Assign demon token to Minion
  // Find which demon role they had
  const demonRole = state.assignments[oldDemonIdx];
  state.assignments[newDemonIdx] = demonRole;

  state.chronicle.push({
    type: "system",
    title: "Demon Starpass",
    details: `Demon <strong>${oldDemonName}</strong> passed the crown. <strong>${newDemonName}</strong> is now the Demon!`,
    badgeColor: "var(--red)"
  });

  state.showCard = null;
  autoSave();
  render();
}
