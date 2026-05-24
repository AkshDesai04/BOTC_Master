
// ══════════════════════════════════════════════════════════════════════════
// TEAM COLORS & EMOJIS (shared)
// ══════════════════════════════════════════════════════════════════════════
const TYPE_CLR = {
  townsfolk: {bg:"rgba(93,173,226,0.08)", bdr:"#2980b9", txt:"#5dade2"},
  outsider:  {bg:"rgba(72,201,176,0.08)", bdr:"#1abc9c", txt:"#48c9b0"},
  minion:    {bg:"rgba(155,89,182,0.08)", bdr:"#8e44ad", txt:"#bb8fce"},
  demon:     {bg:"rgba(231,76,60,0.08)",  bdr:"#c0392b", txt:"#e74c3c"},
};
const TEMOJI = {townsfolk:"🏘️", outsider:"🌿", minion:"🗡️", demon:"👹"};

// ── Script accessor ──
function S() { return state.scriptId === "tb" ? TB : BMR; }

// ══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════
function esc(s) { if(!s)return""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
function formatTime(secs) { const m=Math.floor(secs/60); const s=secs%60; return `${m}:${s<10?'0':''}${s}`; }

// Get role image path
// Note: Download script saves files with extensions from wiki (.png, .jpg, etc.)
// This function returns .png path - if file has different extension, it will gracefully fail
function getRoleImage(roleId, type) {
  if (!roleId || !type) return null;
  // Map type to directory name (matching download script structure)
  const typeMap = {
    townsfolk: "townsfolk",
    outsider: "outsiders",
    minion: "minions",
    demon: "demons",
    traveller: "travellers"
  };
  const dir = typeMap[type] || "townsfolk";
  // Default to .png - if download script saved with different extension,
  // the onerror handler will hide the image gracefully
  return `assets/images/${dir}/${roleId}.png`;
}

// Render role image with graceful fallback
// Tries .png first, then attempts other common extensions if .png fails
function renderRoleImage(roleId, type, size = 32, style = "") {
  if (!roleId || !type) return "";
  
  const typeMap = {
    townsfolk: "townsfolk",
    outsider: "outsiders",
    minion: "minions",
    demon: "demons",
    traveller: "travellers"
  };
  const dir = typeMap[type] || "townsfolk";
  const basePath = `assets/images/${dir}/${roleId}`;
  
  // Simple img tag - browser will handle missing images gracefully
  // If image doesn't exist, onerror will hide it
  return `<img src="${basePath}.png" alt="${roleId}" style="width:${size}px;height:${size}px;object-fit:contain;${style}" onerror="this.style.display='none'">`;
}

// ══════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════
let state = {
  screen: "select",       // select | count | names | characters | travellers | showroles | game
  scriptId: null,         // "tb" | "bmr"
  playerCount: 10,
  names: [],
  nameInput: "",

  // Character selection
  selTF: [], selOS: [], selMN: [], selDM: [],
  selTR: [],                 // Selected Traveller characters (IDs)
  travellerData: [],          // Array of {character, name, alignment} for each selected Traveller
  godfatherOutsiderMod: 0, // BMR only: -1, 0, +1
  drunkAs: "",              // TB only: which TF the Drunk believes they are

  // Travellers
  travellersEnabled: false,
  travellersToggle: false,  // Toggle to show/hide Travellers section
  travellers: [],            // Array of {name, character, alignment, seat, alive, exiled, notes, ...}

  // Game state
  gs: null,

  // UI state
  tab: "grimoire",
  expandedPlayer: -1,
  expandedTraveller: -1,
  nightPhase: "none",
  nightStep: 0,
  nightStepData: {},
  undoStack: [],
  confirm: null,
  timer: null,

  // Overlay state
  showingRoleFor: -1,
  showCard: null,
  rolesShown: [],

  // Timer
  timer: { phase:0, running:false, paused:false, seconds:0, totalSeconds:0, alarm:false, intervalId:null, durations:[180,120,30], showSettings:false },
};

// ══════════════════════════════════════════════════════════════════════════
// SAVE / LOAD
// ══════════════════════════════════════════════════════════════════════════
const SAVE_KEY = "botc_storyteller_v2";
const LISTS_KEY = "botc_player_lists";

function autoSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      _v: 2, _saved: Date.now(),
      screen: state.screen, scriptId: state.scriptId,
      playerCount: state.playerCount, names: state.names,
      selTF: state.selTF, selOS: state.selOS, selMN: state.selMN, selDM: state.selDM,
      selTR: state.selTR || [], travellerData: state.travellerData || [],
      godfatherOutsiderMod: state.godfatherOutsiderMod, drunkAs: state.drunkAs,
      travellersEnabled: state.travellersEnabled ?? false,
      travellersToggle: state.travellersToggle ?? false,
      travellers: state.travellers || [],
      gs: state.gs, tab: state.tab, nightStep: state.nightStep,
      nightPhase: state.nightPhase, undoStack: state.undoStack,
      rolesShown: state.rolesShown, expandedTraveller: state.expandedTraveller,
    }));
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function resumeGame() {
  const saved = loadFromStorage();
  if (!saved) return;
  Object.assign(state, {
    screen: saved.screen, scriptId: saved.scriptId,
    playerCount: saved.playerCount, names: saved.names || [],
    selTF: saved.selTF || [], selOS: saved.selOS || [],
    selMN: saved.selMN || [], selDM: saved.selDM || [],
    selTR: saved.selTR || [], travellerData: saved.travellerData || [],
    godfatherOutsiderMod: saved.godfatherOutsiderMod || 0,
    drunkAs: saved.drunkAs || "",
    travellersEnabled: saved.travellersEnabled ?? false,
    travellersToggle: saved.travellersToggle ?? false,
    travellers: saved.travellers || [],
    gs: saved.gs, tab: saved.tab || "grimoire",
    nightStep: saved.nightStep || 0, nightPhase: saved.nightPhase || "none",
    undoStack: saved.undoStack || [],
    rolesShown: saved.rolesShown || [],
    expandedPlayer: -1, expandedTraveller: saved.expandedTraveller ?? -1,
    confirm: null, showCard: null, showingRoleFor: -1,
    timer: null,
  });
  state.showResume = false;
  render();
}

function newGame() {
  clearSave();
  state = {
    screen: "select", scriptId: null, playerCount: 10,
    names: [], nameInput: "",
    selTF: [], selOS: [], selMN: [], selDM: [],
    selTR: [], travellerData: [],
    godfatherOutsiderMod: 0, drunkAs: "",
    travellersEnabled: false, travellersToggle: false, travellers: [],
    gs: null, tab: "grimoire", expandedPlayer: -1, expandedTraveller: -1,
    nightPhase: "none", nightStep: 0, nightStepData: {},
    undoStack: [], confirm: null,
    showingRoleFor: -1, showCard: null, rolesShown: [],
    timer: { phase:0, running:false, paused:false, seconds:0, totalSeconds:0, alarm:false, intervalId:null, durations:[180,120,30], showSettings:false },
  };
  render();
}

// Player Lists
function savePlayerList(name) {
  try {
    const lists = JSON.parse(localStorage.getItem(LISTS_KEY) || "[]");
    lists.push({ name, players: [...state.names], count: state.playerCount, saved: Date.now() });
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists.slice(-20))); // Max 20 lists
  } catch(e) {}
}
function getPlayerLists() {
  try { return JSON.parse(localStorage.getItem(LISTS_KEY) || "[]"); } catch(e) { return []; }
}
function deletePlayerList(idx) {
  try {
    const lists = getPlayerLists();
    lists.splice(idx, 1);
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch(e) {}
  render();
}
function loadPlayerList(idx) {
  const lists = getPlayerLists();
  if (!lists[idx]) return;
  const list = lists[idx];
  state.names = [...list.players];
  state.playerCount = list.count;
  state.showLoadList = false;
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// UNDO
// ══════════════════════════════════════════════════════════════════════════
function pushUndo() {
  if (!state.gs) return;
  state.undoStack = [...state.undoStack, deepCopy(state.gs)].slice(-5);
}
function undoAction() {
  if (state.undoStack.length === 0) return;
  const stack = [...state.undoStack];
  state.gs = stack.pop();
  state.undoStack = stack;
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER ENGINE
// ══════════════════════════════════════════════════════════════════════════
function render() {
  const app = document.getElementById("app");
  // Track screen changes for fade-in
  const screenChanged = state._lastScreen !== state.screen;
  state._lastScreen = state.screen;
  state._fadeIn = screenChanged;
  let html = renderHeader();

  switch (state.screen) {
    case "select":     html += renderSelectScreen(); break;
    case "count":      html += renderCountScreen(); break;
    case "names":      html += renderNamesScreen(); break;
    case "characters": html += renderCharScreen(); break;
    case "showroles":  html += renderShowRolesScreen(); break;
    case "game":       html += renderGameScreen(); break;
  }

  html += renderOverlays();
  app.innerHTML = html;

  // Auto-focus name input if on names screen
  if (state.screen === "names" && state.names.length < state.playerCount) {
    setTimeout(() => { const el = document.getElementById("nameInput"); if (el && !el.value) el.focus(); }, 50);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════════════
function renderHeader() {
  const s = state.scriptId ? S() : null;
  const titleColor = s ? s.color : "var(--red)";
  const titleText = s ? s.name : "BOTC STORYTELLER";

  let badge = "";
  if (state.gs) {
    const isNight = state.gs.phase === "night";
    badge = `<div class="phase-badge" style="background:${isNight?"#1a1a3a":"#3a3a1a"};border:1px solid ${isNight?"#4a4a8a":"#8a8a4a"};color:${isNight?"#8888dd":"#cccc44"}">
      ${isNight?"🌙":"☀️"} ${isNight?"Night":"Day"} ${state.gs.dayNum||1}
    </div>`;
  }

  let rightBtns = "";
  if (state.screen === "game" || state.screen === "showroles") {
    rightBtns = `<button class="btn-outline" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:var(--red)"
      onclick="state.confirm={msg:'Start a completely new game? Current progress will be lost.',onYes:'newGame'};render()">New Game</button>`;
  }

  return `<div class="header">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">${s ? s.emoji : '🩸'}</span>
      <span class="header-title" style="color:${titleColor}">${titleText}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">${rightBtns}${badge}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// OVERLAYS (Confirm, Show Card, Role Reveal, Resume)
// ══════════════════════════════════════════════════════════════════════════
function renderOverlays() {
  let html = "";

  // Resume prompt
  if (state.showResume) {
    const saved = loadFromStorage();
    const when = saved?._saved ? new Date(saved._saved).toLocaleString() : "unknown";
    const sData = saved?.scriptId === "tb" ? TB : BMR;
    const sName = sData?.name || "Unknown";
    const sEmoji = sData?.emoji || "🩸";
    const phase = saved?.gs ? `${saved.gs.phase==="night"?"🌙 Night":"☀️ Day"} ${saved.gs.dayNum||1}` : "Setup";
    const pCount = saved?.gs?.players?.length || saved?.playerCount || "?";

    html += `<div class="overlay" style="z-index:220">
      <div class="overlay-box" style="border:2px solid var(--blue)">
        <div style="font-size:36px;margin-bottom:12px">💾</div>
        <div style="font-size:18px;font-weight:700;color:var(--blue);margin-bottom:8px">Saved Game Found</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${sEmoji} ${sName}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${phase} • ${pCount} players</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:16px">Last saved: ${when}</div>
        <div style="display:flex;gap:8px">
          <button class="btn" style="flex:1;padding:10px;background:#222;color:var(--text2);border:1px solid #333;font-size:13px" onclick="newGame()">New Game</button>
          <button class="btn btn-blue" style="flex:1;padding:10px;font-size:13px" onclick="resumeGame()">Resume</button>
        </div>
      </div>
    </div>`;
  }

  // Confirm dialog
  if (state.confirm) {
    html += `<div class="confirm-overlay">
      <div class="confirm-box">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div style="font-size:14px;color:var(--text);margin-bottom:16px;line-height:1.5">${state.confirm.msg}</div>
        <div style="display:flex;gap:8px">
          <button class="btn" style="flex:1;padding:10px;background:#222;color:var(--text2);border:1px solid #333;font-size:13px" onclick="state.confirm=null;render()">Cancel</button>
          <button class="btn btn-primary" style="flex:1;padding:10px;font-size:13px" onclick="${state.confirm.onYes}();state.confirm=null;">Confirm</button>
        </div>
      </div>
    </div>`;
  }

  // Show Card overlay
  if (state.showCard) {
    const sc = state.showCard;
    html += `<div class="show-card-overlay" onclick="state.showCard=null;render()">
      <div class="show-card" style="background:${sc.bg||'#111'};border:3px solid ${sc.borderColor||'#444'}">
        <div style="font-size:64px;margin-bottom:16px">${sc.emoji||''}</div>
        <div style="font-size:${sc.fontSize||'28'}px;font-weight:700;color:${sc.color||'#fff'};margin-bottom:8px">${sc.title||''}</div>
        ${sc.subtitle?`<div style="font-size:14px;color:var(--text2);margin-bottom:12px">${sc.subtitle}</div>`:''}
        ${sc.text?`<div style="font-size:15px;color:#ccc;line-height:1.5;padding:12px;background:rgba(0,0,0,0.3);border-radius:10px">${sc.text}</div>`:''}
        <div style="font-size:11px;color:var(--text3);margin-top:16px">tap anywhere to dismiss</div>
      </div>
    </div>`;
  }

  // Role reveal overlay
  if (state.showingRoleFor >= 0 && state.gs) {
    const p = state.gs.players[state.showingRoleFor];
    const c = S().C;
    const ch = c[p.actual];
    const showCh = (p.actual === "drunk" && p.believed) ? c[p.believed] : ch;
    const clr = TYPE_CLR[showCh?.type || "townsfolk"];
    const roleImg = renderRoleImage(showCh?.id, showCh?.type, 120, "margin-bottom:12px");
    html += `<div class="show-card-overlay" onclick="state.showingRoleFor=-1;render()">
      <div class="show-card" style="background:linear-gradient(135deg,#0d0d1a,${clr.bg});border:3px solid ${clr.bdr}">
        ${roleImg || `<div style="font-size:64px;margin-bottom:12px">${TEMOJI[showCh?.type||"townsfolk"]}</div>`}
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">${(showCh?.type||"").toUpperCase()}</div>
        <div style="font-size:28px;font-weight:700;color:${clr.txt};margin-bottom:16px">${showCh?.name||''}</div>
        <div style="font-size:14px;color:#ccc;line-height:1.6;padding:12px 16px;background:rgba(0,0,0,0.3);border-radius:10px">${esc(showCh?.ab||'')}</div>
        ${ch?.team==="evil"?`<div style="margin-top:12px;padding:6px 16px;background:rgba(231,76,60,0.2);border-radius:8px;font-size:13px;color:var(--red);font-weight:700">😈 YOU ARE EVIL</div>`:''}
        <div style="font-size:11px;color:var(--text3);margin-top:16px">tap anywhere to dismiss</div>
      </div>
    </div>`;
  }

  return html;
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Script Selector
// ══════════════════════════════════════════════════════════════════════════
function renderSelectScreen() {
  return `<div class="screen${state._fadeIn?' fade-in':''}" style="padding-top:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:40px;margin-bottom:8px">🩸</div>
      <h1 style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px">BOTC Storyteller</h1>
      <p style="color:var(--text3);font-size:13px">Choose your script</p>
    </div>

    <div class="script-card" style="border-color:${TB.color}44" onclick="selectScript('tb')">
      <div style="font-size:36px;margin-bottom:8px">${TB.emoji}</div>
      <div style="font-size:18px;font-weight:700;color:${TB.color};margin-bottom:4px">${TB.name}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:2px">${TB.desc}</div>
      <div style="font-size:11px;color:var(--text3)">${TB.tagline}</div>
    </div>

    <div class="script-card" style="border-color:${BMR.color}44" onclick="selectScript('bmr')">
      <div style="font-size:36px;margin-bottom:8px">${BMR.emoji}</div>
      <div style="font-size:18px;font-weight:700;color:${BMR.color};margin-bottom:4px">${BMR.name}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:2px">${BMR.desc}</div>
      <div style="font-size:11px;color:var(--text3)">${BMR.tagline}</div>
    </div>
  </div>`;
}

function selectScript(id) {
  state.scriptId = id;
  state.selDM = S().demonFixed ? [...S().defaultDemon] : [];
  state.screen = "count";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Player Count
// ══════════════════════════════════════════════════════════════════════════
function renderCountScreen() {
  const s = S();
  const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };

  return `<div class="screen${state._fadeIn?' fade-in':''}" style="text-align:center;padding-top:32px">
    <h2 style="color:${s.color};margin-bottom:4px;font-size:20px">${s.emoji} ${s.name}</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:16px">How many players? (not counting Storyteller)</p>

    <div style="padding:0 24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <span style="font-size:14px;color:var(--text2);min-width:30px">5</span>
        <input type="range" min="5" max="25" value="${state.playerCount}" 
          style="flex:1;outline:none;cursor:pointer"
          oninput="updatePlayerCount(this.value)"
          onchange="updatePlayerCount(this.value)">
        <span style="font-size:14px;color:var(--text2);min-width:30px">25</span>
      </div>
      <input type="number" min="5" max="25" value="${state.playerCount}" 
        inputmode="numeric"
        style="font-size:24px;font-weight:700;color:${s.color};margin-top:8px;text-align:center;background:transparent;border:none;outline:none;width:100%;padding:4px;border-radius:4px;transition:background 0.2s;cursor:text"
        onfocus="this.style.background='rgba(255,255,255,0.1)';this.select()"
        onblur="this.style.background='transparent';updatePlayerCount(this.value)"
        onkeydown="if(event.key==='Enter'){this.blur()}"
        onclick="this.select()">
    </div>

    <div class="card" style="text-align:left;margin-bottom:24px">
      <div style="font-weight:600;margin-bottom:6px;font-size:13px;color:var(--text2)">Distribution for ${state.playerCount} players:</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px">
        <span style="color:${TYPE_CLR.townsfolk.txt}">🏘️ ${d.t} Townsfolk</span>
        <span style="color:${TYPE_CLR.outsider.txt}">🌿 ${d.o} Outsiders</span>
        <span style="color:${TYPE_CLR.minion.txt}">🗡️ ${d.m} Minions</span>
        <span style="color:${TYPE_CLR.demon.txt}">👹 ${d.d||1} Demon</span>
      </div>
    </div>

    <button class="btn btn-primary" style="background:linear-gradient(135deg,${s.color}cc,${s.color})" onclick="goToNames()">Enter Player Names →</button>
    <button class="btn-outline" style="margin-top:12px;width:100%" onclick="state.screen='select';state.scriptId=null;render()">← Change Script</button>
  </div>`;
}

function setPlayerCount(n) {
  state.playerCount = n;
  state.names = state.names.slice(0, n);
  autoSave();
  render();
}

function updatePlayerCount(val, skipRender) {
  const num = Math.min(25, Math.max(5, parseInt(val) || 10));
  state.playerCount = num;
  autoSave();
  if (!skipRender) render();
}

function goToNames() {
  state.screen = "names";
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Names
// ══════════════════════════════════════════════════════════════════════════
function renderNamesScreen() {
  const count = state.playerCount;
  const names = state.names;
  const lists = getPlayerLists();

  let list = "";
  names.forEach((n, i) => {
    list += `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:4px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
      <span style="width:24px;height:24px;border-radius:50%;background:${S().color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
      <span style="flex:1;font-weight:500">${esc(n)}</span>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px" onclick="moveName(${i},-1)" ${i===0?"disabled":""}>↑</button>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px" onclick="moveName(${i},1)" ${i===names.length-1?"disabled":""}>↓</button>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px;color:var(--red);border-color:var(--red)" onclick="removeName(${i})">✕</button>
    </div>`;
  });

  const canProceed = names.length === count;

  // Save/Load list buttons
  let listBtns = "";
  if (canProceed) {
    listBtns += `<button class="btn-outline" style="margin-right:8px;font-size:11px" onclick="promptSaveList()">💾 Save List</button>`;
  }
  if (lists.length > 0) {
    listBtns += `<button class="btn-outline" style="font-size:11px" onclick="state.showLoadList=!state.showLoadList;render()">📋 Load List (${lists.length})</button>`;
  }

  // Load list panel
  let loadPanel = "";
  if (state.showLoadList && lists.length > 0) {
    loadPanel = `<div class="card" style="margin-bottom:12px;border-color:rgba(93,173,226,0.3)">
      <div style="font-weight:600;font-size:12px;color:var(--blue);margin-bottom:8px">Saved Player Lists</div>`;
    lists.forEach((l, i) => {
      loadPanel += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div onclick="loadPlayerList(${i})" style="cursor:pointer;flex:1">
          <div style="font-weight:600;font-size:13px">${esc(l.name)}</div>
          <div style="font-size:11px;color:var(--text3)">${l.count}p • ${l.players.slice(0,3).join(", ")}${l.count>3?"...":""}</div>
        </div>
        <button class="btn-outline" style="padding:2px 6px;font-size:11px;color:var(--red);border-color:var(--red)" onclick="deletePlayerList(${i})">✕</button>
      </div>`;
    });
    loadPanel += `</div>`;
  }

  return `<div class="screen${state._fadeIn?' fade-in':''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;color:${S().color}">Player Names</h2>
        <p style="color:var(--text2);font-size:12px">${names.length}/${count} — clockwise seating order</p>
      </div>
      <button class="btn-outline" onclick="state.screen='count';render()">← Back</button>
    </div>
    <div style="margin-bottom:12px">${listBtns}</div>
    ${loadPanel}
    ${names.length < count ? `<div style="display:flex;gap:8px;margin-bottom:16px">
      <input class="input" id="nameInput" placeholder="Player name..." value="${esc(state.nameInput)}"
        onkeydown="if(event.key==='Enter')addName()" oninput="state.nameInput=this.value" style="flex:1">
      <button class="btn btn-primary" style="width:auto;padding:10px 18px;background:${S().color}" onclick="addName()">Add</button>
    </div>` : ""}
    <div style="margin-bottom:16px">${list || '<div style="text-align:center;padding:20px;color:var(--text3)">No players added yet</div>'}</div>
    <button class="btn ${canProceed?'btn-primary':'btn-disabled'}" ${canProceed?"":'disabled'}
      style="${canProceed?'background:'+S().color:''}"
      onclick="goToCharacters()">
      ${canProceed ? "Select Characters →" : `Add ${count - names.length} more player${count-names.length>1?"s":""}`}
    </button>
  </div>`;
}

function addName() {
  const n = state.nameInput.trim();
  if (!n || state.names.length >= state.playerCount) return;
  if (state.names.find(x => x.toLowerCase() === n.toLowerCase())) return;
  state.names = [...state.names, n];
  state.nameInput = "";
  autoSave();
  render();
}
function removeName(i) { state.names.splice(i, 1); autoSave(); render(); }
function moveName(i, d) {
  const a = [...state.names]; const t = i + d;
  if (t < 0 || t >= a.length) return;
  [a[i], a[t]] = [a[t], a[i]];
  state.names = a; autoSave(); render();
}
function goToCharacters() {
  state.screen = "characters";
  state.selTF = []; state.selOS = []; state.selMN = [];
  state.selDM = S().demonFixed ? [...S().defaultDemon] : [];
  state.selTR = state.selTR || [];
  state.travellerData = state.travellerData || [];
  state.travellersToggle = state.travellersToggle ?? false;
  state.drunkAs = ""; state.godfatherOutsiderMod = 0;
  autoSave(); render();
}

function promptSaveList() {
  const defaultName = `${state.playerCount}p — ${new Date().toLocaleDateString()}`;
  const name = prompt("Save list as:", defaultName);
  if (name) { savePlayerList(name); render(); }
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Character Selection
// ══════════════════════════════════════════════════════════════════════════
function getAdjustedDist() {
  const s = S();
  const base = s.DIST[state.playerCount];
  const d = { t: base.t, o: base.o, m: base.m, d: base.d };
  if (state.scriptId === "tb") {
    if (state.selMN.includes("baron")) { d.t -= 2; d.o += 2; }
  } else {
    // BMR: Godfather modifier
    d.o += state.godfatherOutsiderMod;
    d.t -= state.godfatherOutsiderMod;
  }
  return d;
}

function renderCharScreen() {
  const s = S(); const c = s.C;
  const townsfolk = Object.values(c).filter(ch => ch.type === "townsfolk");
  const outsiders = Object.values(c).filter(ch => ch.type === "outsider");
  const minions = Object.values(c).filter(ch => ch.type === "minion");
  const demons = Object.values(c).filter(ch => ch.type === "demon");
  const travellers = Object.values(s.TRAVELLERS || {});

  function chipSection(title, chars, sel, key) {
    const type = key === "selMN" ? "minion" : key === "selOS" ? "outsider" : key === "selDM" ? "demon" : "townsfolk";
    const clr = TYPE_CLR[type];
    let chips = "";
    chars.forEach(ch => {
      const on = sel.includes(ch.id);
      const roleImg = renderRoleImage(ch.id, type, 20, "vertical-align:middle;margin-right:4px");
      chips += `<span class="role-chip" onclick="toggleRole('${key}','${ch.id}')"
        style="border-color:${on?clr.bdr:'#333'};background:${on?clr.bg:'rgba(0,0,0,0.3)'};color:${on?clr.txt:'#666'};font-weight:${on?600:400};display:inline-flex;align-items:center">${roleImg}${ch.name}</span>`;
    });
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-weight:600;color:${clr.txt};font-size:14px">${title}</span>
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;font-weight:600;background:rgba(243,156,18,0.2);color:#f39c12">${sel.length}</span>
      </div>
      <div>${chips}</div>
    </div>`;
  }

  // Demon section
  let demonSection = "";
  if (s.demonFixed) {
    const clr = TYPE_CLR.demon;
    demonSection = `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-weight:600;color:${clr.txt};font-size:14px">Demon</span>
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;font-weight:600;background:rgba(243,156,18,0.2);color:#f39c12">1</span>
      </div>
      <span class="role-chip" style="border-color:${clr.bdr};background:${clr.bg};color:${clr.txt};font-weight:600;cursor:default">Imp</span>
    </div>`;
  } else {
    demonSection = chipSection("Demon", demons, state.selDM, "selDM");
  }

  // Drunk picker (TB only)
  let drunkPicker = "";
  if (state.scriptId === "tb" && state.selOS.includes("drunk")) {
    const availTF = townsfolk.filter(t => !state.selTF.includes(t.id));
    let opts = '<option value="">Select a Townsfolk...</option>';
    availTF.forEach(ch => { opts += `<option value="${ch.id}" ${state.drunkAs===ch.id?"selected":""}>${ch.name}</option>`; });
    drunkPicker = `<div class="card" style="border-color:rgba(72,201,176,0.3);background:rgba(26,74,58,0.15);margin-bottom:16px">
      <div style="font-weight:600;font-size:13px;color:var(--teal);margin-bottom:8px">🍺 The Drunk believes they are:</div>
      <select class="input" onchange="state.drunkAs=this.value;autoSave();render()">${opts}</select>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">This Townsfolk goes in the bag. The player thinks they ARE this Townsfolk.</div>
    </div>`;
  }

  // Travellers toggle and section
  let travellerSection = "";
  if (!state.travellersToggle) {
    // Clear Travellers if toggle is off
    state.selTR = [];
    state.travellerData = [];
  } else if (travellers.length > 0) {
    // Initialize Traveller selection state if needed
    if (!state.selTR) state.selTR = [];
    if (!state.travellerData) state.travellerData = [];
    
    // Ensure travellerData matches selTR
    while (state.travellerData.length < state.selTR.length) {
      state.travellerData.push({ character: state.selTR[state.travellerData.length], alignment: "good" });
    }
    while (state.travellerData.length > state.selTR.length) {
      state.travellerData.pop();
    }
    
    let travellerChips = "";
    travellers.forEach(tr => {
      const on = state.selTR.includes(tr.id);
      const travImg = renderRoleImage(tr.id, "traveller", 20, "vertical-align:middle;margin-right:4px");
      travellerChips += `<span class="role-chip" onclick="toggleTraveller('${tr.id}')"
        style="border-color:${on?'#f39c12':'#333'};background:${on?'rgba(243,156,18,0.15)':'rgba(0,0,0,0.3)'};color:${on?'#f39c12':'#666'};font-weight:${on?600:400};display:inline-flex;align-items:center">${travImg}${tr.name}</span>`;
    });
    
    let travellerDetails = "";
    state.travellerData.forEach((td, idx) => {
      const travChar = travellers.find(t => t.id === td.character);
      if (!travChar) return;
      
      const alignmentColor = td.alignment === "good" ? "#5dade2" : "#e74c3c";
      const alignmentText = td.alignment === "good" ? "Good" : "Evil";
      travellerDetails += `<div class="card" style="border-color:rgba(243,156,18,0.3);background:rgba(243,156,18,0.08);margin-bottom:8px;padding:10px">
        <div style="font-weight:600;font-size:12px;color:#f39c12;margin-bottom:6px">${travChar.name}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:11px;color:var(--text2)">Will be randomly assigned from player list</span>
          <button class="btn-outline" 
            style="width:80px;font-size:12px;padding:6px 12px;margin-left:auto;background:${alignmentColor}22;border-color:${alignmentColor};color:${alignmentColor};font-weight:600"
            onclick="state.travellerData[${idx}].alignment=state.travellerData[${idx}].alignment==='good'?'evil':'good';autoSave();render()">
            ${alignmentText}
          </button>
        </div>
      </div>`;
    });
    
    travellerSection = `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-weight:600;color:#f39c12;font-size:14px">🧳 Travellers (Optional)</span>
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;font-weight:600;background:rgba(243,156,18,0.2);color:#f39c12">${state.selTR.length}</span>
      </div>
      <div style="margin-bottom:8px">${travellerChips}</div>
      ${travellerDetails}
    </div>`;
  }

  // Validation - only require at least one demon (unless fixed)
  const hasDrunk = state.scriptId === "tb" && state.selOS.includes("drunk");
  
  // Calculate total selected roles
  const totalRoles = state.selTF.length + state.selOS.length + state.selMN.length + state.selDM.length;
  const playerCount = state.playerCount || 0;
  const rolesMatchPlayers = totalRoles === playerCount;
  
  const canProceed = (s.demonFixed || state.selDM.length > 0) && (!hasDrunk || state.drunkAs) && rolesMatchPlayers;

  return `<div class="screen${state._fadeIn?' fade-in':''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;color:${s.color}">Select Characters</h2>
        <p style="color:var(--text2);font-size:12px">${state.playerCount} players</p>
      </div>
      <button class="btn-outline" onclick="state.screen='names';render()">← Back</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
      <button class="btn btn-blue" style="flex:1;font-size:13px" onclick="randomizeRoles()">🎲 Randomize All</button>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;font-size:13px;color:var(--text2)" onclick="state.travellersToggle=!state.travellersToggle;autoSave();render()">
        <span>🧳 Travellers</span>
        <div style="position:relative;width:40px;height:20px;background:${state.travellersToggle?'#f39c12':'#444'};border-radius:10px;transition:background 0.2s;cursor:pointer">
          <div style="position:absolute;top:2px;left:${state.travellersToggle?'22px':'2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>
        </div>
      </label>
    </div>
    ${chipSection("Townsfolk", townsfolk, state.selTF, "selTF")}
    ${chipSection("Outsiders", outsiders, state.selOS, "selOS")}
    ${chipSection("Minions", minions, state.selMN, "selMN")}
    ${demonSection}
    ${drunkPicker}
    ${travellerSection}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;margin-bottom:8px">
      <div style="flex:1"></div>
      <div style="font-size:14px;font-weight:600;color:${rolesMatchPlayers?'var(--green)':'var(--red)'};padding:4px 12px;border-radius:6px;background:${rolesMatchPlayers?'rgba(39,174,96,0.15)':'rgba(231,76,60,0.15)'}">
        ${totalRoles}/${playerCount}
      </div>
    </div>
    <button class="btn ${canProceed?'btn-primary':'btn-disabled'}" ${canProceed?"":'disabled'}
      style="${canProceed?'background:'+s.color:''}"
      onclick="assignAndShowRoles()">
      ${canProceed?"🎭 Assign Roles & Start":(hasDrunk && !state.drunkAs ? "Select Drunk's false role" : rolesMatchPlayers ? "Select at least one Demon" : `Select ${Math.abs(playerCount - totalRoles)} more role${Math.abs(playerCount - totalRoles) === 1 ? '' : 's'}`)}
    </button>
  </div>`;
}

function toggleRole(key, id) {
  const arr = [...state[key]];
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
  state[key] = arr;
  // Reset Godfather mod if removed
  if (key === "selMN" && id === "godfather" && idx >= 0) {
    state.godfatherOutsiderMod = 0;
  }
  // Reset drunkAs if Drunk removed
  if (key === "selOS" && id === "drunk" && idx >= 0) {
    state.drunkAs = "";
  }
  autoSave(); render();
}

function toggleTraveller(id) {
  if (!state.selTR) state.selTR = [];
  if (!state.travellerData) state.travellerData = [];
  
  const arr = [...state.selTR];
  const idx = arr.indexOf(id);
  
  if (idx >= 0) {
    // Remove Traveller
    arr.splice(idx, 1);
    // Remove corresponding travellerData entry
    if (state.travellerData.length > idx) {
      state.travellerData.splice(idx, 1);
    }
  } else {
    // Add Traveller
    arr.push(id);
    // Add corresponding travellerData entry
    state.travellerData.push({ character: id, alignment: "good" });
  }
  
  state.selTR = arr;
  autoSave(); render();
}

function randomizeRoles() {
  const s = S(); const c = s.C;
  const playerCount = state.playerCount || 0;

  const allTF = Object.values(c).filter(ch => ch.type === "townsfolk").map(ch => ch.id);
  const allOS = Object.values(c).filter(ch => ch.type === "outsider").map(ch => ch.id);
  const allMN = Object.values(c).filter(ch => ch.type === "minion").map(ch => ch.id);
  const allDM = Object.values(c).filter(ch => ch.type === "demon").map(ch => ch.id);
  const allTR = state.travellersToggle ? Object.values(s.TRAVELLERS || {}).map(ch => ch.id) : [];

  // Calculate how many roles we need
  let rolesNeeded = playerCount;
  let travellerCount = 0;
  
  // If Travellers toggle is on, randomly select some Travellers
  if (state.travellersToggle && allTR.length > 0 && playerCount > 1) {
    // Randomly select 0-3 Travellers (or up to 1/3 of players, but leave at least 2 roles for regular players)
    const maxTravellers = Math.min(3, Math.max(0, Math.floor(playerCount / 3)), allTR.length, playerCount - 2);
    travellerCount = Math.floor(Math.random() * (maxTravellers + 1));
    rolesNeeded -= travellerCount;
  }

  // Pick demon first - at least one required
  let selDM;
  if (s.demonFixed) {
    selDM = [...s.defaultDemon];
    rolesNeeded -= selDM.length;
  } else {
    // Select 1 demon (required)
    selDM = [shuffle(allDM)[0]];
    rolesNeeded -= 1;
  }

  // Ensure we have enough roles left for at least some Townsfolk
  rolesNeeded = Math.max(1, rolesNeeded);

  // Distribute remaining roles randomly among TF, OS, MN
  // Ensure we have at least some Townsfolk for balance
  const minTownsfolk = Math.max(1, Math.floor(rolesNeeded * 0.4));
  const maxTownsfolk = Math.min(allTF.length, Math.floor(rolesNeeded * 0.7));
  const townsfolkCount = Math.floor(Math.random() * (maxTownsfolk - minTownsfolk + 1)) + minTownsfolk;
  rolesNeeded -= townsfolkCount;

  // Remaining roles split between Outsiders and Minions
  const remainingRoles = Math.max(0, rolesNeeded);
  const minionCount = Math.floor(Math.random() * (remainingRoles + 1));
  const outsiderCount = remainingRoles - minionCount;

  let selTF = shuffle(allTF).slice(0, Math.min(townsfolkCount, allTF.length));
  let selMN = shuffle(allMN).slice(0, Math.min(minionCount, allMN.length));
  let selOS = shuffle(allOS).slice(0, Math.min(outsiderCount, allOS.length));

  // Calculate current total and adjust to match playerCount exactly
  let totalSelected = selTF.length + selOS.length + selMN.length + selDM.length + travellerCount;
  let stillNeeded = playerCount - totalSelected;
  
  // Fill remaining roles with Townsfolk first, then Outsiders, then Minions
  if (stillNeeded > 0) {
    const remainingTF = allTF.filter(id => !selTF.includes(id));
    const remainingOS = allOS.filter(id => !selOS.includes(id));
    const remainingMN = allMN.filter(id => !selMN.includes(id));
    
    const addTF = Math.min(stillNeeded, remainingTF.length);
    selTF.push(...shuffle(remainingTF).slice(0, addTF));
    stillNeeded -= addTF;
    
    if (stillNeeded > 0) {
      const addOS = Math.min(stillNeeded, remainingOS.length);
      selOS.push(...shuffle(remainingOS).slice(0, addOS));
      stillNeeded -= addOS;
    }
    
    if (stillNeeded > 0) {
      const addMN = Math.min(stillNeeded, remainingMN.length);
      selMN.push(...shuffle(remainingMN).slice(0, addMN));
      stillNeeded -= addMN;
  }
  } else if (stillNeeded < 0) {
    // Too many roles selected, remove excess (prefer removing from TF, then OS, then MN)
    let toRemove = -stillNeeded;
    while (toRemove > 0 && selTF.length > 1) {
      selTF.pop();
      toRemove--;
    }
    while (toRemove > 0 && selOS.length > 0) {
      selOS.pop();
      toRemove--;
    }
    while (toRemove > 0 && selMN.length > 0) {
      selMN.pop();
      toRemove--;
    }
  }

  // Select Travellers if toggle is on
  let selTR = [];
  let travellerData = [];
  if (state.travellersToggle && travellerCount > 0 && allTR.length > 0) {
    selTR = shuffle(allTR).slice(0, Math.min(travellerCount, allTR.length));
    travellerData = selTR.map(charId => ({
      character: charId,
      alignment: Math.random() > 0.5 ? "good" : "evil"
    }));
  }

  // Drunk-believes-as for TB
  let drunkAs = "";
  if (state.scriptId === "tb" && selOS.includes("drunk")) {
    const remaining = allTF.filter(id => !selTF.includes(id));
    if (remaining.length > 0) drunkAs = shuffle(remaining)[0];
  }

  state.selTF = selTF; 
  state.selOS = selOS; 
  state.selMN = selMN; 
  state.selDM = selDM;
  state.selTR = selTR;
  state.travellerData = travellerData;
  state.drunkAs = drunkAs;
  state.godfatherOutsiderMod = 0;
  autoSave(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT + GAME STATE CREATION
// ══════════════════════════════════════════════════════════════════════════
function goToTravellers() {
  state.screen = "travellers";
  // Initialize travellers array if not already set
  if (!state.travellers) {
    state.travellers = [];
  }
  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Travellers Selection
// ══════════════════════════════════════════════════════════════════════════
function renderTravellersScreen() {
  const s = S();
  const travellers = s.TRAVELLERS || {};
  const travellerList = Object.values(travellers);
  
  let travellerCards = "";
  if (state.travellers && state.travellers.length > 0) {
    state.travellers.forEach((t, i) => {
      const travChar = travellers[t.character];
      const alignmentColor = t.alignment === "good" ? "#5dade2" : "#e74c3c";
      const travImg = renderRoleImage(t.character, "traveller", 40, "margin-right:8px");
      
      travellerCards += `<div class="card" style="border-color:rgba(243,156,18,0.3);background:rgba(243,156,18,0.08);margin-bottom:8px;display:flex;align-items:center;gap:10px">
        ${travImg}
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px;color:var(--text)">${esc(t.name)}</div>
          <div style="font-size:11px;color:#f39c12">${travChar?.name || t.character}</div>
          <div style="font-size:11px;color:${alignmentColor}">${t.alignment === "good" ? "Good" : "Evil"}</div>
        </div>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;color:var(--red);border-color:var(--red)" onclick="removeTravellerSetup(${i})">✕</button>
      </div>`;
    });
  } else {
    travellerCards = `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">No Travellers added yet</div>`;
  }
  
  return `<div class="screen${state._fadeIn?' fade-in':''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;color:${s.color}">🧳 Travellers</h2>
        <p style="color:var(--text2);font-size:12px">Optional: Add Travellers for late joiners or early leavers</p>
      </div>
      <button class="btn-outline" onclick="state.screen='characters';render()">← Back</button>
    </div>
    
    <div style="margin-bottom:16px">
      <button class="btn-outline" style="width:100%;color:#f39c12;border-color:rgba(243,156,18,0.3);margin-bottom:12px" onclick="addTravellerSetup()">+ Add Traveller</button>
      ${travellerCards}
    </div>
    
    <button class="btn btn-primary" style="background:${s.color};width:100%" onclick="assignAndShowRoles()">
      🎭 Assign Roles & Start
    </button>
  </div>`;
}

function addTravellerSetup() {
  const s = S();
  const travellers = s.TRAVELLERS || {};
  const travellerList = Object.values(travellers);
  
  if (travellerList.length === 0) {
    alert("No Travellers available for this script.");
    return;
  }
  
  const name = prompt("Enter Traveller name:");
  if (!name || !name.trim()) return;
  
  let charList = travellerList.map((t, i) => `${i+1}. ${t.name}`).join("\n");
  const charId = prompt(`Select Traveller character:\n${charList}\n\nEnter number (1-${travellerList.length}):`);
  if (!charId) return;
  
  const charIdx = parseInt(charId) - 1;
  if (charIdx < 0 || charIdx >= travellerList.length) {
    alert("Invalid selection.");
    return;
  }
  
  const selectedChar = travellerList[charIdx];
  const alignment = confirm("Is this Traveller Good? (OK = Good, Cancel = Evil)") ? "good" : "evil";
  
  const maxSeat = Math.max(...(state.travellers || []).map(t => t.seat || 0), state.playerCount || 0);
  const newTraveller = {
    name: name.trim(),
    character: selectedChar.id,
    alignment: alignment,
    seat: maxSeat + 1,
    alive: true,
    exiled: false,
    notes: "",
  };
  
  state.travellers = [...(state.travellers || []), newTraveller];
  autoSave();
  render();
}

function removeTravellerSetup(i) {
  if (confirm(`Remove Traveller "${state.travellers[i].name}"?`)) {
    state.travellers.splice(i, 1);
    autoSave();
    render();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT + GAME STATE CREATION
// ══════════════════════════════════════════════════════════════════════════
function assignAndShowRoles() {
  const s = S(); const c = s.C;
  const hasDrunk = state.scriptId === "tb" && state.selOS.includes("drunk");
  
  // Build Travellers from travellerData - randomly assign names from player list
  state.travellers = [];
  let travellerNames = [];
  if (state.travellerData && state.travellerData.length > 0) {
    state.travellersEnabled = true;
    
    // Shuffle player names and randomly assign to Travellers
    const shuffledNames = shuffle([...state.names]);
    
    state.travellerData.forEach((td, idx) => {
      if (td.character && shuffledNames[idx]) {
        const assignedName = shuffledNames[idx];
        travellerNames.push(assignedName);
        
        // Find the seat number for this Traveller
        const seatNum = state.names.indexOf(assignedName) + 1;
        
        state.travellers.push({
          name: assignedName,
          character: td.character,
          alignment: td.alignment || "good",
          seat: seatNum,
          alive: true,
          exiled: false,
          notes: "",
        });
      }
    });
  } else {
    state.travellersEnabled = false;
  }

  // Build role pool - we need enough roles for non-Traveller players
  const pool = [...state.selTF, ...state.selOS.filter(id => id !== "drunk"), ...state.selMN, ...state.selDM];
  if (hasDrunk) pool.push("drunk");
  const shuffled = shuffle(pool);

  // Create players - Travellers don't get regular roles
  const regularPlayers = state.names.filter(name => !travellerNames.includes(name));
  let roleIndex = 0;
  
  const players = state.names.map((name, i) => {
    // If this player is a Traveller, they don't get a regular role
    if (travellerNames.includes(name)) {
      return {
        name, seat: i + 1, actual: null,
        believed: null,
        alive: true, ghostVote: false, ghostUsed: false,
        poisoned: false, protected: false, daProtected: false,
        poisonSource: null, drunkSource: null, notes: "",
        abilityUsed: false, master: null,
        // BMR-specific
        foolLifeUsed: false, zombuulUndead: false,
        isTraveller: true,
      };
    }
    
    // Regular players get roles from the shuffled pool
    const roleId = shuffled[roleIndex];
    roleIndex++;
    return {
      name, seat: i + 1, actual: roleId,
      believed: (roleId === "drunk" && state.drunkAs) ? state.drunkAs : roleId,
      alive: true, ghostVote: false, ghostUsed: false,
      poisoned: false, protected: false, daProtected: false,
      poisonSource: null, drunkSource: null, notes: "",
      abilityUsed: false, master: null,
      // BMR-specific
      foolLifeUsed: false, zombuulUndead: false,
    };
  });

  // Generate 3 bluffs (good characters not in play)
  const goodInPlay = [...state.selTF, ...state.selOS];
  if (hasDrunk && state.drunkAs) goodInPlay.push(state.drunkAs);
  const allGood = Object.values(c).filter(ch => ch.team === "good").map(ch => ch.id);
  const notInPlay = allGood.filter(id => !goodInPlay.includes(id));
  const bluffs = shuffle(notInPlay).slice(0, 3);

  // Script-specific game state
  let extra = {};
  if (state.scriptId === "tb") {
    // Red Herring: random good player for Fortune Teller
    const hasFT = state.selTF.includes("fortuneteller") || (hasDrunk && state.drunkAs === "fortuneteller");
    const goodPlayers = players.filter(p => c[p.actual]?.team === "good");
    extra.redHerring = hasFT && goodPlayers.length > 0
      ? goodPlayers[Math.floor(Math.random() * goodPlayers.length)].seat - 1
      : -1;
    extra.drunkAs = hasDrunk ? state.drunkAs : null;
  } else {
    // BMR specifics
    extra.demonType = state.selDM[0];
    extra.poCharged = false;
    extra.pukkaVictimIdx = -1;
    extra.courtierTarget = null;
    extra.courtierTimer = 0;
    extra.courtierUsed = false;
    extra.exorcistTarget = -1;
    extra.daTarget = -1;
    extra.daLastTarget = -1;
    extra.assassinUsed = false;
    extra.professorUsed = false;
    extra.minstrelAllDrunk = false;
    extra.mastermindDay = false;
    extra.gossipStatements = [];
    // Grandmother: assign grandchild (random good player, not Grandmother)
    const grandmotherIdx = players.findIndex(p => p.actual === "grandmother");
    if (grandmotherIdx >= 0) {
      const goodOthers = players.filter((p, i) => i !== grandmotherIdx && c[p.actual]?.team === "good");
      extra.grandchildIdx = goodOthers.length > 0 ? players.indexOf(goodOthers[Math.floor(Math.random() * goodOthers.length)]) : -1;
    } else {
      extra.grandchildIdx = -1;
    }
    // Outsiders in play (for Godfather info)
    extra.outsidersInPlay = players.filter(p => c[p.actual]?.type === "outsider").map(p => p.actual);
  }

  // Create game state
  const gs = {
    players, phase: "night", dayNum: 1, isFirstNight: true,
    executedToday: null, diedTonight: [], bluffs,
    log: [], nightKillDone: false,
    exiledToday: null, // For Travellers
    ...extra,
  };

  state.gs = gs;
  state.screen = "showroles";
  state.tab = "grimoire";
  state.expandedPlayer = -1;
  state.expandedTraveller = -1;
  state.nightStep = 0;
  state.showingRoleFor = -1;
  state.showCard = null;
  state.rolesShown = [];
  autoSave(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Show Roles
// ══════════════════════════════════════════════════════════════════════════
function renderShowRolesScreen() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = `<div class="screen${state._fadeIn?' fade-in':''}">
    <h2 style="font-size:18px;color:${s.color};margin-bottom:4px">🎭 Show Role Cards</h2>
    <p style="color:var(--text2);font-size:12px;margin-bottom:16px">Tap each player to show them their role privately. Drunk sees their believed Townsfolk.</p>`;

  // TB: Red Herring picker
  if (state.scriptId === "tb" && gs.redHerring !== undefined) {
    const hasFT = gs.players.some(p => p.actual === "fortuneteller" || (p.actual === "drunk" && p.believed === "fortuneteller"));
    if (hasFT) {
      const goodPlayers = gs.players.map((p,i) => ({...p,i})).filter(p => c[p.actual]?.team === "good");
      let rhOpts = "";
      goodPlayers.forEach(p => {
        rhOpts += `<option value="${p.i}" ${gs.redHerring===p.i?"selected":""}>${p.name} (Seat ${p.i+1} — ${c[p.actual]?.name}${p.actual==="drunk"?" / Drunk":""})</option>`;
      });
      html += `<div class="card" style="border-color:rgba(231,76,60,0.3);background:rgba(90,26,26,0.15);margin-bottom:16px">
        <div style="font-weight:600;font-size:13px;color:var(--red);margin-bottom:6px">🎯 Fortune Teller — Red Herring</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">This good player always registers as the Demon. Persists all game.</div>
        <select class="input" onchange="setRedHerring(parseInt(this.value))">${rhOpts}</select>
      </div>`;
    }
  }

  // BMR: Show grandchild assignment
  if (state.scriptId === "bmr" && gs.grandchildIdx >= 0) {
    const grandma = gs.players.find(p => p.actual === "grandmother");
    const grandchild = gs.players[gs.grandchildIdx];
    if (grandma && grandchild) {
      html += `<div class="card" style="border-color:rgba(93,173,226,0.3);background:rgba(14,37,64,0.3);margin-bottom:16px">
        <div style="font-weight:600;font-size:13px;color:var(--blue);margin-bottom:6px">👵 Grandmother's Grandchild</div>
        <div style="font-size:13px;color:var(--text)">${grandchild.name} (Seat ${grandchild.seat}) — ${c[grandchild.actual]?.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Grandmother will be told this during First Night. If Demon kills the grandchild, Grandmother dies too.</div>
      </div>`;
    }
  }

  // Player list
  gs.players.forEach((p, i) => {
    const ch = c[p.actual];
    const showCh = (p.actual === "drunk" && p.believed) ? c[p.believed] : ch;
    const clr = TYPE_CLR[showCh?.type || "townsfolk"];
    const shown = state.rolesShown.includes(i);
    const roleImg = renderRoleImage(showCh?.id, showCh?.type, 28);
    html += `<div onclick="showRoleTo(${i})" style="padding:12px;margin-bottom:6px;border-radius:10px;border:1px solid ${clr.bdr}44;background:${clr.bg};cursor:pointer;display:flex;align-items:center;gap:10px;${shown?'opacity:0.6':''}">
      <span class="seat-num" style="background:${clr.bdr}">${i+1}</span>
      ${roleImg}
      <span style="flex:1;font-weight:600;font-size:14px">${esc(p.name)}</span>
      <span style="font-size:20px">${TEMOJI[showCh?.type||"townsfolk"]}</span>
      <span style="color:var(--text3);font-size:14px">${shown?"✓":"👁️"}</span>
    </div>`;
  });

  const allShown = state.rolesShown.length >= gs.players.length;
  html += `<div style="margin-top:20px">
    <button class="btn btn-night" onclick="state.screen='game';autoSave();render()">
      ${allShown ? "✅" : "⚠️"} Begin Night 1
    </button>
  </div></div>`;
  return html;
}

function showRoleTo(i) {
  state.showingRoleFor = i;
  if (!state.rolesShown.includes(i)) state.rolesShown = [...state.rolesShown, i];
  autoSave(); render();
}

function setRedHerring(idx) {
  if (!state.gs) return;
  state.gs.redHerring = idx;
  autoSave(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN: Game
// ══════════════════════════════════════════════════════════════════════════
function renderGameScreen() {
  const gs = state.gs;
  if (!gs) return `<div class="screen">No game state</div>`;
  const alive = gs.players.filter(p => p.alive).length;
  const majority = Math.ceil(alive / 2);
  const ghostsLeft = gs.players.filter(p => !p.alive && p.ghostVote && !p.ghostUsed).length;

  let tabs = "";
  const tabList = [
    {id:"grimoire",l:"📖 Grim"},{id:"night",l:"🌙 Night"},
    {id:"day",l:"☀️ Day"},{id:"roles",l:"🎭 Roles"},{id:"log",l:"📝 Log"}
  ];
  tabList.forEach(t => {
    tabs += `<button class="tab ${state.tab===t.id?'active':''}" onclick="state.tab='${t.id}';render()">${t.l}</button>`;
  });

  let content = "";
  switch (state.tab) {
    case "grimoire": content = renderGrimoire(); break;
    case "night": content = renderNightWalker(); break;
    case "day": content = renderDayPhase(); break;
    case "roles": content = renderRolesRef(); break;
    case "log": content = renderLog(); break;
  }

  // Bottom bar
  const hasUndo = state.undoStack.length > 0;
  const undoBtn = hasUndo ? `<button class="btn" style="width:auto;padding:12px 14px;background:#2a1a1a;color:var(--orange);border:1px solid #4a2a1a;font-size:18px;border-radius:10px" onclick="undoAction()" title="Undo">↩</button>` : "";

  let bottomBtns = "";
  if (gs.phase === "day") {
    const nextN = gs.dayNum + 1;
    bottomBtns = `${undoBtn}<button class="btn btn-night" style="flex:1" onclick="confirmAction('startNight','Begin Night ${nextN}? Make sure all day actions are done.')"">🌙 Begin Night ${nextN}</button>`;
  } else {
    bottomBtns = `${undoBtn}
      <button class="btn btn-night" style="flex:1" onclick="state.tab='night';render()">🌙 Night Walker</button>
      <button class="btn btn-day" style="flex:1" onclick="confirmAction('startDay','Advance to Day? Make sure all night steps are done.')">☀️ Dawn</button>`;
  }

  // Win overlay
  let winOverlay = "";
  if (state.winMsg) {
    const w = state.winMsg;
    winOverlay = `<div class="overlay" onclick="state.winMsg=null;render()">
      <div class="overlay-box" style="border:2px solid ${w.team==='good'?'#2980b9':'#e74c3c'}">
        <div style="font-size:48px;margin-bottom:12px">${w.team==='good'?'😇':'😈'}</div>
        <div style="font-size:24px;font-weight:700;color:${w.team==='good'?'#5dade2':'#e74c3c'};margin-bottom:8px">${w.team==='good'?'GOOD':'EVIL'} WINS!</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:16px">${w.reason}</div>
        <div style="font-size:12px;color:var(--text3)">Tap to dismiss</div>
      </div>
    </div>`;
  }

  return `<div class="tabs">${tabs}</div>
    <div class="status-bar">
      <span style="color:var(--green)">👤 ${alive}</span>
      <span style="color:var(--red)">💀 ${gs.players.length - alive}</span>
      <span style="color:var(--orange)">🗳️ ${majority}</span>
      <span style="color:var(--purple)">👻 ${ghostsLeft}</span>
    </div>
    <div style="padding-bottom:80px">${content}</div>
    <div class="bottom-bar">${bottomBtns}</div>
    ${winOverlay}`;
}

function confirmAction(fn, msg) {
  state.confirm = { msg, onYes: fn };
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// PHASE TRANSITIONS
// ══════════════════════════════════════════════════════════════════════════
function startDay() {
  pushUndo();
  const gs = state.gs;
  gs.phase = "day";
  gs.executedToday = null;
  gs.exiledToday = null;
  gs.nightKillDone = false;
  gs.isFirstNight = false;
  if (state.scriptId === "bmr") {
    gs.minstrelAllDrunk = false;
    gs.mastermindDay = false;
  }
  state.nightStep = 0;
  state.tab = "grimoire";
  state.confirm = null;
  // Init timer
  initTimer();
  autoSave(); render();
}

function startNight() {
  // Mayor check: 3 alive + no execution = good wins
  checkMayorWin();
  if (state.winMsg) return;
  pushUndo();
  const gs = state.gs;
  gs.phase = "night";
  gs.dayNum += 1;
  gs.isFirstNight = false;
  gs.diedTonight = [];
  gs.nightKillDone = false;
  // Clear protections
  gs.players.forEach(p => {
    p.protected = false;
    p.daProtected = false;
  });
  // TB: Clear Poisoner's poison (will be re-applied at Poisoner step)
  if (state.scriptId === "tb") {
    gs.players.forEach(p => {
      if (p.poisonSource === "poisoner") { p.poisoned = false; p.poisonSource = null; }
    });
  }
  // BMR cleanup
  if (state.scriptId === "bmr") {
    // Clear Innkeeper protections + drunk
    gs.players.forEach(p => {
      if (p.drunkSource === "Innkeeper") p.drunkSource = null;
      // Clear Sailor drunk (re-applied at Sailor step)
      if (p.drunkSource === "Sailor") p.drunkSource = null;
    });
    // Courtier timer tick
    if (gs.courtierTimer > 0) {
      gs.courtierTimer--;
      if (gs.courtierTimer <= 0) {
        // Remove Courtier drunk from the target
        gs.players.forEach(p => {
          if (p.drunkSource === "Courtier") p.drunkSource = null;
        });
        gs.courtierTarget = null;
        gs.log.push(`Night ${gs.dayNum}: Courtier's 3-night drunk expired.`);
      }
    }
    gs.exorcistTarget = -1;
    if (gs.daTarget >= 0) gs.daLastTarget = gs.daTarget;
    gs.daTarget = -1;
  }
  state.nightStep = 0;
  state.nightStepData = {}; // Reset step-specific data (innkeeper picks, po kills, etc.)
  state.tab = "grimoire";
  state.confirm = null;
  stopTimer();
  autoSave(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// GRIMOIRE TAB
// ══════════════════════════════════════════════════════════════════════════
function renderGrimoire() {
  const gs = state.gs;
  const s = S(); const c = s.C;
  const isNight = gs.phase === "night";
  const isDay = gs.phase === "day";

  let html = `<div style="padding:12px">`;

  // Bluffs + script info
  html += `<div class="card" style="border-color:rgba(231,76,60,0.2);background:rgba(90,26,26,0.15);font-size:12px;margin-bottom:8px">
    <span style="font-weight:600;color:var(--red)">🃏 Bluffs: </span>
    ${gs.bluffs.map(b => c[b]?.name || b).join(", ")}`;
  if (state.scriptId === "tb" && gs.redHerring >= 0) {
    html += `<br><span style="font-weight:600;color:var(--orange)">🎯 Red Herring: </span>${gs.players[gs.redHerring]?.name} (Seat ${gs.redHerring+1})`;
  }
  if (state.scriptId === "bmr") {
    html += `<br><span style="font-weight:600;color:var(--purple)">👹 Demon: </span>${c[gs.demonType]?.name || gs.demonType}`;
    if (gs.grandchildIdx >= 0) {
      html += `<br><span style="font-weight:600;color:var(--blue)">👵 Grandchild: </span>${gs.players[gs.grandchildIdx]?.name}`;
    }
  }
  html += `</div>`;

  // Night kill status
  if (isNight && !gs.isFirstNight) {
    if (gs.nightKillDone) {
      const killNames = gs.diedTonight.length > 0
        ? gs.players.filter((_,i) => gs.diedTonight.includes(i)).map(p => p.name).join(", ")
        : "blocked";
      html += `<div class="warn warn-red" style="margin-bottom:8px">💀 Night kill: ${killNames}</div>`;
    } else {
      html += `<button class="btn-outline" style="width:100%;margin-bottom:8px;color:var(--green);border-color:rgba(39,174,96,0.3);font-size:12px" onclick="markNoDeath()">🛡️ No death tonight (kill blocked)</button>`;
    }
  }

  // Player cards
  gs.players.forEach((p, i) => {
    const ch = c[p.actual];
    const clr = TYPE_CLR[ch?.type || "townsfolk"];
    const isDrunk = p.actual === "drunk";
    const isExp = state.expandedPlayer === i;

    let badges = "";
    if (p.poisoned) badges += '<span title="Poisoned">☠️</span>';
    if (p.protected) badges += '<span title="Protected">🛡️</span>';
    if (p.daProtected) badges += '<span title="DA Protected">⚖️</span>';
    if (p.drunkSource) badges += '<span title="Drunk">🍺</span>';

    let expanded = "";
    if (isExp) {
      const bch = isDrunk ? c[p.believed] : null;
      const abilityText = isDrunk
        ? `<strong style="color:var(--teal)">ACTUAL:</strong> Drunk<br><strong style="color:var(--blue)">BELIEVES (${bch?.name}):</strong> ${esc(bch?.ab||"")}`
        : esc(ch?.ab || "");

      let actions = "";
      if (p.alive) {
        // Execute: always available
        actions += `<button class="btn-sm" style="background:rgba(243,156,18,0.12);color:var(--orange)" onclick="executePlayer(${i})">⚖️ Execute</button> `;
        // Kill: night only, not first night
        if (isNight && !gs.isFirstNight && !gs.nightKillDone) {
          actions += `<button class="btn-sm" style="background:rgba(231,76,60,0.12);color:var(--red)" onclick="killPlayer(${i})">💀 Kill</button> `;
        }
        // Toggles
        actions += `<button class="btn-sm" style="background:${p.poisoned?'rgba(39,174,96,0.12)':'rgba(155,89,182,0.12)'};color:${p.poisoned?'var(--green)':'var(--purple)'}" onclick="togglePoison(${i})">${p.poisoned?'💊 Cure':'☠️ Poison'}</button> `;
        actions += `<button class="btn-sm" style="background:${p.protected?'rgba(39,174,96,0.12)':'rgba(41,128,185,0.12)'};color:${p.protected?'var(--green)':'var(--blue)'}" onclick="toggleProtect(${i})">${p.protected?'🛡️ Unprotect':'🛡️ Protect'}</button> `;
      } else {
        actions = `<button class="btn-sm" style="background:rgba(39,174,96,0.12);color:var(--green)" onclick="revivePlayer(${i})">✨ Revive</button> `;
        if (p.ghostVote && !p.ghostUsed) {
          actions += `<button class="btn-sm" style="background:rgba(155,89,182,0.12);color:var(--purple)" onclick="useGhostVote(${i})">👻 Use Vote</button> `;
        }
      }

      expanded = `<div class="player-expand">
        <div style="font-size:11px;color:var(--text2);margin-bottom:10px;padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:6px;line-height:1.4">${abilityText}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${actions}</div>
        <textarea class="input" style="font-size:11px;min-height:36px;resize:vertical" placeholder="Notes..."
          oninput="state.gs.players[${i}].notes=this.value">${esc(p.notes)}</textarea>
      </div>`;
    }

    const roleImg = renderRoleImage(ch?.id, ch?.type, 32, "margin-right:8px;flex-shrink:0");
    html += `<div class="player-row" style="border-color:${p.alive ? clr.bdr+'44' : '#222'};background:${p.alive ? clr.bg : 'rgba(20,20,20,0.5)'};opacity:${p.alive?1:0.55}">
      <div class="player-main" onclick="state.expandedPlayer=${isExp?-1:i};render()">
        <span class="seat-num" style="background:${p.alive?clr.bdr:'#444'}">${i+1}</span>
        ${roleImg}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;color:${p.alive?'var(--text)':'#666'};${p.alive?'':'text-decoration:line-through'}">
            ${esc(p.name)}${!p.alive&&p.ghostVote&&!p.ghostUsed?' 👻':''}${p.ghostUsed?' 💀':''}
          </div>
          <div style="font-size:11px;color:${clr.txt};margin-top:1px">
            ${isDrunk?`🍺 DRUNK (thinks: ${c[p.believed]?.name||p.believed})`:(ch?.name||p.actual)}
            <span style="color:var(--text3);margin-left:6px">${TEMOJI[ch?.type||"townsfolk"]} ${ch?.type||""}</span>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">${badges}</div>
        <span style="color:var(--text3);font-size:14px">${isExp?"▲":"▼"}</span>
      </div>
      ${expanded}
    </div>`;
  });

  // Travellers section
  if (state.travellersEnabled && state.travellers.length > 0) {
    html += `<div style="margin-top:16px;padding-top:16px;border-top:2px solid rgba(255,255,255,0.1)">
      <div style="font-weight:600;font-size:13px;color:var(--text2);margin-bottom:8px">🧳 Travellers</div>`;
    
    state.travellers.forEach((t, i) => {
      const travChar = s.TRAVELLERS?.[t.character];
      const isExp = state.expandedTraveller === i;
      const alignmentColor = t.alignment === "good" ? "#5dade2" : "#e74c3c";
      
      let expanded = "";
      if (isExp) {
        let actions = "";
        if (t.alive && !t.exiled) {
          if (isDay && gs.exiledToday === null) {
            actions += `<button class="btn-sm" style="background:rgba(243,156,18,0.12);color:var(--orange)" onclick="exileTraveller(${i})">🚫 Exile</button> `;
          }
        } else if (t.exiled) {
          actions += `<button class="btn-sm" style="background:rgba(39,174,96,0.12);color:var(--green)" onclick="unexileTraveller(${i})">✨ Return</button> `;
        }
        
        const travExpandedImg = renderRoleImage(t.character, "traveller", 48, "margin-bottom:8px");
        expanded = `<div class="player-expand">
          ${travExpandedImg ? `<div style="text-align:center;margin-bottom:8px">${travExpandedImg}</div>` : ""}
          <div style="font-size:11px;color:var(--text2);margin-bottom:10px;padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:6px;line-height:1.4">
            <strong style="color:${alignmentColor}">Alignment:</strong> ${t.alignment === "good" ? "Good" : "Evil"}<br>
            ${travChar ? `<strong>Ability:</strong> ${esc(travChar.ab)}` : ""}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            ${actions}
            <button class="btn-sm" style="background:rgba(231,76,60,0.12);color:var(--red)" onclick="removeTraveller(${i})">✕ Remove</button>
          </div>
          <textarea class="input" style="font-size:11px;min-height:36px;resize:vertical" placeholder="Notes..."
            oninput="state.travellers[${i}].notes=this.value">${esc(t.notes ?? "")}</textarea>
        </div>`;
      }
      
      const travImg = renderRoleImage(t.character, "traveller", 32, "margin-right:8px;flex-shrink:0");
      html += `<div class="player-row" style="border-color:${t.exiled ? '#222' : 'rgba(243,156,18,0.4)'};background:${t.exiled ? 'rgba(20,20,20,0.5)' : 'rgba(243,156,18,0.08)'};opacity:${t.exiled?0.55:1}">
        <div class="player-main" onclick="state.expandedTraveller=${isExp?-1:i};render()">
          <span class="seat-num" style="background:${t.exiled ? '#444' : '#f39c12'}">T${i+1}</span>
          ${travImg}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px;color:${t.exiled?'#666':'var(--text)'};${t.exiled?'text-decoration:line-through':''}">
              ${esc(t.name)} ${t.exiled ? '🚫' : ''}
            </div>
            <div style="font-size:11px;color:#f39c12;margin-top:1px">
              ${travChar?.name || t.character || "Unknown"}
              <span style="color:${alignmentColor};margin-left:6px">(${t.alignment === "good" ? "Good" : "Evil"})</span>
            </div>
          </div>
        <span style="color:var(--text3);font-size:14px">${isExp?"▲":"▼"}</span>
      </div>
      ${expanded}
    </div>`;
  });
    
    html += `</div>`;
  }
  
  // Add Traveller button
  if (state.travellersEnabled) {
    html += `<div style="margin-top:12px">
      <button class="btn-outline" style="width:100%;color:#f39c12;border-color:rgba(243,156,18,0.3)" onclick="showAddTraveller()">+ Add Traveller</button>
    </div>`;
  } else {
    html += `<div style="margin-top:12px">
      <button class="btn-outline" style="width:100%;color:#f39c12;border-color:rgba(243,156,18,0.3)" onclick="enableTravellers()">🧳 Enable Travellers</button>
    </div>`;
  }

  html += `</div>`;
  return html;
}

// ══════════════════════════════════════════════════════════════════════════
// PLAYER ACTIONS
// ══════════════════════════════════════════════════════════════════════════
// Tea Lady protection check
function isTeaLadyProtected(targetIdx) {
  const gs = state.gs; const c = S().C;
  const tl = gs.players.find(p => p.actual === "tealady" && p.alive && !p.poisoned && !p.drunkSource);
  if (!tl) return false;
  const tlIdx = gs.players.indexOf(tl);
  const n = gs.players.length;
  // Find alive neighbors of Tea Lady
  let cw = -1, ccw = -1;
  for (let d = 1; d < n; d++) { const i = (tlIdx+d)%n; if (gs.players[i].alive) { cw = i; break; } }
  for (let d = 1; d < n; d++) { const i = (tlIdx-d+n)%n; if (gs.players[i].alive) { ccw = i; break; } }
  // Both alive neighbors must be good
  if (cw < 0 || ccw < 0) return false;
  const cwGood = c[gs.players[cw].actual]?.team === "good";
  const ccwGood = c[gs.players[ccw].actual]?.team === "good";
  if (!cwGood || !ccwGood) return false;
  // Target must be one of those neighbors
  return targetIdx === cw || targetIdx === ccw;
}

function markNoDeath() {
  pushUndo();
  state.gs.nightKillDone = true;
  state.gs.log.push(`Night ${state.gs.dayNum}: No death (kill blocked).`);
  autoSave(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// NIGHT WALKER ACTION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

// TB: Poisoner picks target
function nightAction_poison(i) {
  pushUndo();
  const gs = state.gs;
  // Clear previous Poisoner poison (keep Pukka poison separate)
  gs.players.forEach(p => { if (p.poisonSource === "poisoner") { p.poisoned = false; p.poisonSource = null; }});
  gs.players[i].poisoned = true;
  gs.players[i].poisonSource = "poisoner";
  gs.log.push(`Night ${gs.dayNum}: Poisoner chose ${gs.players[i].name}.`);
  autoSave(); render();
}

// TB: Monk protects target
function nightAction_monkProtect(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].protected = true;
  gs.log.push(`Night ${gs.dayNum}: Monk protects ${gs.players[i].name}.`);
  autoSave(); render();
}

// TB: Butler chooses master
function nightAction_butlerMaster(i) {
  pushUndo();
  const gs = state.gs;
  // Clear old master
  gs.players.forEach(p => p.master = false);
  gs.players[i].master = true;
  gs.log.push(`Night ${gs.dayNum}: Butler chose ${gs.players[i].name} as master.`);
  autoSave(); render();
}

// TB: Ravenkeeper picks player to learn
function nightAction_ravenkeeperPick(i) {
  const gs = state.gs; const c = S().C;
  const p = gs.players[i];
  showCharCard(p.actual);
  gs.log.push(`Night ${gs.dayNum}: Ravenkeeper chose ${p.name} — shown ${c[p.actual]?.name}.`);
  autoSave();
}

// BMR: Sailor picks who to make drunk
function nightAction_sailorDrunk(i) {
  pushUndo();
  const gs = state.gs;
  // Clear previous Sailor drunk
  gs.players.forEach(p => { if (p.drunkSource === "Sailor") p.drunkSource = null; });
  gs.players[i].drunkSource = "Sailor";
  gs.log.push(`Night ${gs.dayNum}: Sailor chose ${gs.players[i].name} — drunk until dusk.`);
  autoSave(); render();
}

// BMR: Courtier picks character to make drunk (once per game)
function nightAction_courtierPick(charId) {
  pushUndo();
  const gs = state.gs;
  // Find alive player with that character
  const target = gs.players.find(p => p.actual === charId && p.alive);
  if (target) {
    target.drunkSource = "Courtier";
    gs.courtierTarget = charId;
    gs.courtierTimer = 3;
    gs.courtierUsed = true;
    gs.log.push(`Night ${gs.dayNum}: Courtier chose ${S().C[charId]?.name} — ${target.name} drunk for 3 nights.`);
  } else {
    gs.courtierUsed = true;
    gs.courtierTarget = charId;
    gs.courtierTimer = 3;
    gs.log.push(`Night ${gs.dayNum}: Courtier chose ${S().C[charId]?.name} (not in play — wasted).`);
  }
  autoSave(); render();
}

// BMR: Devil's Advocate protects from execution
function nightAction_daProtect(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].daProtected = true;
  gs.daTarget = i;
  gs.log.push(`Night ${gs.dayNum}: Devil's Advocate protects ${gs.players[i].name} from execution.`);
  autoSave(); render();
}

// BMR: Exorcist picks player (blocks demon)
function nightAction_exorcistPick(i) {
  pushUndo();
  const gs = state.gs;
  gs.exorcistTarget = i;
  gs.log.push(`Night ${gs.dayNum}: Exorcist chose ${gs.players[i].name}.`);
  autoSave(); render();
}

// BMR: Innkeeper picks 2 to protect, then 1 of them to drunk
function nightAction_innkeeperPick(i) {
  const gs = state.gs;
  const picks = state.nightStepData.innkeeperPicks || [];
  if (picks.length < 2) {
    // Picking protected players
    if (!picks.includes(i)) {
      picks.push(i);
      state.nightStepData.innkeeperPicks = picks;
      if (picks.length === 2) {
        // Both picked — now need to choose which is drunk
        state.nightStepData.innkeeperPhase = "drunk";
      }
      render();
    }
  }
}
function nightAction_innkeeperDrunk(i) {
  pushUndo();
  const gs = state.gs;
  const picks = state.nightStepData.innkeeperPicks || [];
  picks.forEach(idx => { gs.players[idx].protected = true; });
  gs.players[i].drunkSource = "Innkeeper";
  gs.log.push(`Night ${gs.dayNum}: Innkeeper protects ${picks.map(idx=>gs.players[idx].name).join(" & ")}. ${gs.players[i].name} is drunk.`);
  state.nightStepData.innkeeperPicks = null;
  state.nightStepData.innkeeperPhase = null;
  autoSave(); render();
}
function nightAction_innkeeperReset() {
  state.nightStepData.innkeeperPicks = [];
  state.nightStepData.innkeeperPhase = null;
  render();
}

// BMR: Pukka — kill previous victim + poison new target
function nightAction_pukkaKillPrev() {
  pushUndo();
  const gs = state.gs;
  if (gs.pukkaVictimIdx >= 0) {
    const prev = gs.players[gs.pukkaVictimIdx];
    if (prev.alive) {
      // Clear old Pukka poison
      prev.poisoned = false;
      prev.poisonSource = null;
      prev.alive = false;
      prev.ghostVote = true;
      gs.diedTonight.push(gs.pukkaVictimIdx);
      gs.nightKillDone = true;
      gs.log.push(`Night ${gs.dayNum}: ${prev.name} dies (Pukka poison from last night).`);
      checkWin();
    }
  }
  gs.pukkaVictimIdx = -1;
  autoSave(); render();
}
function nightAction_pukkaPoison(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].poisoned = true;
  gs.players[i].poisonSource = "pukka";
  gs.pukkaVictimIdx = i;
  gs.log.push(`Night ${gs.dayNum}: Pukka poisons ${gs.players[i].name} (will die tomorrow night).`);
  autoSave(); render();
}
function nightAction_pukkaSkipPrev() {
  pushUndo();
  const gs = state.gs;
  if (gs.pukkaVictimIdx >= 0) {
    const prev = gs.players[gs.pukkaVictimIdx];
    prev.poisoned = false;
    prev.poisonSource = null;
  }
  gs.pukkaVictimIdx = -1;
  gs.log.push(`Night ${gs.dayNum}: Pukka previous victim survives (protected/blocked).`);
  autoSave(); render();
}

// BMR: Po — charge or attack
function nightAction_poCharge() {
  pushUndo();
  const gs = state.gs;
  gs.poCharged = true;
  gs.nightKillDone = true;
  gs.log.push(`Night ${gs.dayNum}: Po charges up! (3 kills next night)`);
  autoSave(); render();
}
function nightAction_poKill(i) {
  const gs = state.gs;
  const picks = state.nightStepData.poKills || [];
  if (!picks.includes(i)) {
    picks.push(i);
    state.nightStepData.poKills = picks;
    const needed = gs.poCharged ? 3 : 1;
    if (picks.length >= needed) {
      nightAction_poApply();
    } else {
      render();
    }
  }
}
function nightAction_poApply() {
  pushUndo();
  const gs = state.gs;
  const picks = state.nightStepData.poKills || [];
  picks.forEach(idx => {
    const p = gs.players[idx];
    if (p.alive) {
      p.alive = false; p.ghostVote = true;
      gs.diedTonight.push(idx);
      gs.log.push(`Night ${gs.dayNum}: Po kills ${p.name}.`);
    }
  });
  gs.nightKillDone = true;
  gs.poCharged = false;
  state.nightStepData.poKills = null;
  autoSave(); render();
  checkWin();
}
function nightAction_poReset() {
  state.nightStepData.poKills = [];
  render();
}

// BMR: Shabaloth kills 2 + optional regurgitate
function nightAction_shabalothKill(i) {
  const gs = state.gs;
  const picks = state.nightStepData.shabKills || [];
  if (!picks.includes(i)) {
    picks.push(i);
    state.nightStepData.shabKills = picks;
    if (picks.length >= 2) {
      nightAction_shabalothApply();
    } else {
      render();
    }
  }
}
function nightAction_shabalothApply() {
  pushUndo();
  const gs = state.gs;
  const picks = state.nightStepData.shabKills || [];
  picks.forEach(idx => {
    const p = gs.players[idx];
    if (p.alive) {
      p.alive = false; p.ghostVote = true;
      gs.diedTonight.push(idx);
      gs.log.push(`Night ${gs.dayNum}: Shabaloth kills ${p.name}.`);
    }
  });
  gs.nightKillDone = true;
  state.nightStepData.shabKills = null;
  autoSave(); render();
  checkWin();
}
function nightAction_shabalothRegurgitate(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].alive = true;
  gs.players[i].ghostVote = false;
  gs.log.push(`Night ${gs.dayNum}: Shabaloth regurgitates ${gs.players[i].name}!`);
  autoSave(); render();
}
function nightAction_shabalothReset() {
  state.nightStepData.shabKills = [];
  render();
}

// BMR: Assassin kill (once per game, bypasses ALL protection)
function nightAction_assassinKill(i) {
  pushUndo();
  const gs = state.gs;
  const p = gs.players[i];
  p.alive = false; p.ghostVote = true;
  gs.diedTonight.push(i);
  gs.nightKillDone = true;
  gs.assassinUsed = true;
  gs.log.push(`Night ${gs.dayNum}: Assassin kills ${p.name} (bypasses ALL protection)!`);
  autoSave(); render();
  checkWin();
}
function nightAction_assassinSkip() {
  pushUndo();
  state.gs.log.push(`Night ${state.gs.dayNum}: Assassin chooses not to use ability.`);
  autoSave(); render();
}

// BMR: Professor revives (once per game)
function nightAction_professorRevive(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].alive = true;
  gs.players[i].ghostVote = false;
  gs.players[i].ghostUsed = false;
  gs.professorUsed = true;
  gs.log.push(`Night ${gs.dayNum}: Professor revives ${gs.players[i].name}!`);
  autoSave(); render();
}
function nightAction_professorFail() {
  pushUndo();
  const gs = state.gs;
  gs.professorUsed = true;
  gs.log.push(`Night ${gs.dayNum}: Professor revive fails (wrong guess or poisoned).`);
  autoSave(); render();
}

// BMR: Gambler guess resolution
function nightAction_gamblerDies(i) {
  pushUndo();
  const gs = state.gs;
  const p = gs.players[i];
  p.alive = false; p.ghostVote = true;
  gs.diedTonight.push(i);
  gs.nightKillDone = true;
  gs.log.push(`Night ${gs.dayNum}: Gambler (${p.name}) guessed WRONG — dies!`);
  autoSave(); render();
  checkWin();
}

// BMR: Moonchild kill (if died tonight and chose a good player)
function nightAction_moonchildKill(i) {
  pushUndo();
  const gs = state.gs;
  const p = gs.players[i];
  p.alive = false; p.ghostVote = true;
  gs.diedTonight.push(i);
  gs.log.push(`Night ${gs.dayNum}: Moonchild revenge kills ${p.name}!`);
  autoSave(); render();
  checkWin();
}

function killPlayer(i) {
  pushUndo();
  const gs = state.gs;
  const p = gs.players[i];
  const s = S(); const c = s.C;

  // TB: Imp self-kill → starpass
  if (state.scriptId === "tb" && p.actual === "imp") {
    p.alive = false; p.ghostVote = true;
    gs.diedTonight.push(i);
    gs.nightKillDone = true;
    gs.log.push(`Night ${gs.dayNum}: ${p.name} (Imp) self-killed — STARPASS!`);
    state.impStarpassPicker = true;
    state.impDyingIndex = i;
    autoSave(); render();
    return;
  }

  // BMR: Protection checks
  if (state.scriptId === "bmr") {
    // Tea Lady: if both alive neighbors are good, they can't die
    if (isTeaLadyProtected(i)) {
      gs.nightKillDone = true;
      gs.log.push(`Night ${gs.dayNum}: ${p.name} protected by Tea Lady (both neighbors good).`);
      autoSave(); render();
      return;
    }
    // Fool: first death doesn't count
    if (p.actual === "fool" && !p.foolLifeUsed) {
      p.foolLifeUsed = true;
      gs.nightKillDone = true;
      gs.log.push(`Night ${gs.dayNum}: ${p.name} (Fool) — first death blocked!`);
      autoSave(); render();
      return;
    }
    // Sailor: can't die (unless drunk)
    if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) {
      gs.nightKillDone = true;
      gs.log.push(`Night ${gs.dayNum}: ${p.name} (Sailor) — can't die.`);
      autoSave(); render();
      return;
    }
  }

  p.alive = false; p.ghostVote = true;
  gs.diedTonight.push(i);
  gs.nightKillDone = true;
  gs.log.push(`Night ${gs.dayNum}: ${p.name} killed (${c[p.actual]?.name})`);
  autoSave(); render();
  checkWin();
}

function executePlayer(i) {
  pushUndo();
  const gs = state.gs;
  const p = gs.players[i];
  const s = S(); const c = s.C;

  // BMR: DA protection
  if (state.scriptId === "bmr" && p.daProtected) {
    gs.executedToday = i; // still counts as the execution
    gs.log.push(`Day ${gs.dayNum}: ${p.name} executed but SURVIVES (Devil's Advocate).`);
    autoSave(); render();
    return;
  }

  // TB: Saint → evil wins
  if (p.actual === "saint") {
    p.alive = false; p.ghostVote = true;
    gs.executedToday = i;
    gs.log.push(`Day ${gs.dayNum}: ${p.name} executed — SAINT!`);
    state.winMsg = {team:"evil", reason:"The Saint was executed! Evil wins."};
    autoSave(); render();
    return;
  }

  // BMR: Fool first life
  if (state.scriptId === "bmr" && p.actual === "fool" && !p.foolLifeUsed) {
    p.foolLifeUsed = true;
    gs.executedToday = i;
    gs.log.push(`Day ${gs.dayNum}: ${p.name} (Fool) executed — first death blocked!`);
    autoSave(); render();
    return;
  }

  p.alive = false; p.ghostVote = true;
  gs.executedToday = i;
  gs.log.push(`Day ${gs.dayNum}: ${p.name} executed (${c[p.actual]?.name})`);

  // Demon executed
  if (c[p.actual]?.type === "demon") {
    const aliveCount = gs.players.filter(pp => pp.alive).length;

    // TB: Scarlet Woman check
    if (state.scriptId === "tb") {
      const sw = gs.players.find(pp => pp.actual === "scarletwoman" && pp.alive);
      if (sw && aliveCount >= 5) {
        const swIdx = gs.players.indexOf(sw);
        gs.players[swIdx].actual = "imp";
        gs.players[swIdx].believed = "imp";
        gs.log.push(`→ ${sw.name} (Scarlet Woman) becomes the Imp! (${aliveCount} alive ≥ 5)`);
        autoSave(); render();
        return;
      }
    }

    // BMR: Mastermind check
    if (state.scriptId === "bmr") {
      const mm = gs.players.find(pp => pp.actual === "mastermind" && pp.alive);
      if (mm) {
        gs.mastermindDay = true;
        gs.log.push(`→ Mastermind (${mm.name}) is alive! Play continues — next execution, that player's team loses.`);
        autoSave(); render();
        return;
      }
    }

    state.winMsg = {team:"good", reason:`The Demon (${p.name}) has been executed!`};
    autoSave(); render();
    return;
  }

  // BMR: Minion executed → Minstrel trigger
  if (state.scriptId === "bmr" && c[p.actual]?.type === "minion") {
    const minstrel = gs.players.find(pp => pp.actual === "minstrel" && pp.alive);
    if (minstrel) {
      gs.minstrelAllDrunk = true;
      gs.log.push(`→ Minion executed! Minstrel (${minstrel.name}): everyone is drunk until dusk tomorrow.`);
    }
  }

  // BMR: Zombuul first death
  if (state.scriptId === "bmr" && p.actual === "zombuul" && !p.zombuulUndead) {
    p.zombuulUndead = true;
    gs.log.push(`→ ${p.name} (Zombuul) appears dead but is actually still alive (undead)!`);
    // Note: alive=false but zombuulUndead=true means demon still "in play"
  }

  // Mastermind day: whoever was executed, their team loses
  if (state.scriptId === "bmr" && gs.mastermindDay) {
    const team = c[p.actual]?.team;
    if (team === "good") {
      state.winMsg = {team:"evil", reason:`Mastermind's day: ${p.name} (good) was executed — evil wins!`};
    } else {
      state.winMsg = {team:"good", reason:`Mastermind's day: ${p.name} (evil) was executed — good wins!`};
    }
  }

  autoSave(); render();
  checkWin();
}

function togglePoison(i) { state.gs.players[i].poisoned = !state.gs.players[i].poisoned; autoSave(); render(); }
function toggleProtect(i) { state.gs.players[i].protected = !state.gs.players[i].protected; autoSave(); render(); }

// ══════════════════════════════════════════════════════════════════════════
// TRAVELLER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
function enableTravellers() {
  state.travellersEnabled = true;
  state.travellers = state.travellers || [];
  autoSave();
  render();
}

function showAddTraveller() {
  const s = S();
  const travellers = s.TRAVELLERS || {};
  const travellerList = Object.values(travellers);
  
  if (travellerList.length === 0) {
    alert("No Travellers available for this script.");
    return;
  }
  
  const name = prompt("Enter Traveller name:");
  if (!name || !name.trim()) return;
  
  let charList = travellerList.map((t, i) => `${i+1}. ${t.name}`).join("\n");
  const charId = prompt(`Select Traveller character:\n${charList}\n\nEnter number (1-${travellerList.length}):`);
  if (!charId) return;
  
  const charIdx = parseInt(charId) - 1;
  if (charIdx < 0 || charIdx >= travellerList.length) {
    alert("Invalid selection.");
    return;
  }
  
  const selectedChar = travellerList[charIdx];
  const alignment = confirm("Is this Traveller Good? (OK = Good, Cancel = Evil)") ? "good" : "evil";
  
  const maxSeat = Math.max(...(state.travellers || []).map(t => t.seat || 0), state.gs?.players?.length || 0);
  const newTraveller = {
    name: name.trim(),
    character: selectedChar.id,
    alignment: alignment,
    seat: maxSeat + 1,
    alive: true,
    exiled: false,
    notes: "",
  };
  
  state.travellers = [...(state.travellers || []), newTraveller];
  autoSave();
  render();
}

function removeTraveller(i) {
  if (confirm(`Remove Traveller "${state.travellers[i].name}"?`)) {
    state.travellers.splice(i, 1);
    if (state.expandedTraveller === i) state.expandedTraveller = -1;
    else if (state.expandedTraveller > i) state.expandedTraveller--;
    autoSave();
    render();
  }
}

function exileTraveller(i) {
  pushUndo();
  const t = state.travellers[i];
  const gs = state.gs;
  
  t.exiled = true;
  t.alive = false;
  gs.exiledToday = i;
  gs.log.push(`Day ${gs.dayNum}: ${t.name} (${t.character}) exiled.`);
  
  autoSave();
  render();
}

function unexileTraveller(i) {
  pushUndo();
  const t = state.travellers[i];
  const gs = state.gs;
  
  t.exiled = false;
  t.alive = true;
  if (gs.exiledToday === i) gs.exiledToday = null;
  gs.log.push(`Day ${gs.dayNum}: ${t.name} returns from exile.`);
  
  autoSave();
  render();
}
function revivePlayer(i) {
  pushUndo();
  const gs = state.gs;
  gs.players[i].alive = true;
  gs.players[i].ghostVote = false;
  gs.players[i].ghostUsed = false;
  if (gs.executedToday === i) gs.executedToday = null;
  if (gs.diedTonight.includes(i)) {
    gs.diedTonight = gs.diedTonight.filter(x => x !== i);
    gs.nightKillDone = false;
  }
  autoSave(); render();
}
function useGhostVote(i) {
  state.gs.players[i].ghostUsed = true;
  state.gs.log.push(`${state.gs.players[i].name} used their ghost vote.`);
  autoSave(); render();
}

// TB: Imp starpass
function doImpStarpass(minionIdx) {
  const gs = state.gs;
  const minion = gs.players[minionIdx];
  gs.log.push(`→ ${minion.name} (${S().C[minion.actual]?.name}) is now the Imp!`);
  gs.players[minionIdx].actual = "imp";
  gs.players[minionIdx].believed = "imp";
  state.impStarpassPicker = false;
  state.impDyingIndex = -1;
  autoSave(); render();
}

// Win check
function checkWin() {
  const gs = state.gs;
  const s = S(); const c = s.C;
  const alive = gs.players.filter(p => p.alive);

  // Zombuul undead counts as "alive" for win condition
  let demonAlive;
  if (state.scriptId === "bmr") {
    demonAlive = gs.players.find(p => (p.alive || p.zombuulUndead) && c[p.actual]?.type === "demon");
  } else {
    demonAlive = alive.find(p => c[p.actual]?.type === "demon");
  }

  if (alive.length <= 2 && demonAlive) {
    state.winMsg = {team:"evil", reason:`Only ${alive.length} players remain. The Demon survives!`};
    render();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// IMP STARPASS OVERLAY (added to renderOverlays)
// ══════════════════════════════════════════════════════════════════════════
const _origOverlays = renderOverlays;
renderOverlays = function() {
  let html = _origOverlays();

  // Imp starpass picker
  if (state.impStarpassPicker && state.gs) {
    const c = S().C;
    const aliveMinions = state.gs.players.map((p,i)=>({...p,i})).filter(p=>p.alive && c[p.actual]?.type==="minion");
    let btns = "";
    aliveMinions.forEach(m => {
      btns += `<button class="btn" style="margin-bottom:8px;padding:10px;background:${TYPE_CLR.minion.bg};border:1px solid ${TYPE_CLR.minion.bdr};color:${TYPE_CLR.minion.txt};font-size:14px" onclick="doImpStarpass(${m.i})">${esc(m.name)} (${c[m.actual]?.name})</button>`;
    });
    if (aliveMinions.length === 0) {
      btns = `<div style="color:var(--text3);padding:12px">No alive Minions — no starpass.</div>
        <button class="btn btn-primary" style="padding:10px;font-size:13px" onclick="state.impStarpassPicker=false;render()">OK</button>`;
    }
    html += `<div class="overlay" style="z-index:230">
      <div class="overlay-box" style="border:2px solid var(--red)">
        <div style="font-size:36px;margin-bottom:8px">👹</div>
        <div style="font-size:16px;font-weight:700;color:var(--red);margin-bottom:4px">Imp Starpass!</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Imp killed themselves. Choose which Minion becomes Imp.</div>
        ${btns}
      </div>
    </div>`;
  }

  return html;
};

// ══════════════════════════════════════════════════════════════════════════
// DAY PHASE TAB
// ══════════════════════════════════════════════════════════════════════════
function renderDayPhase() {
  const gs = state.gs;
  const alive = gs.players.filter(p => p.alive).length;
  const majority = Math.ceil(alive / 2);

  let html = `<div style="padding:16px">
    <h3 style="font-size:16px;color:var(--orange);margin-bottom:12px">☀️ Day ${gs.dayNum}</h3>
    <div class="card" style="font-size:13px;margin-bottom:12px">
      <div>👤 <strong>${alive}</strong> alive — need <strong style="color:var(--orange)">${majority}</strong> votes to execute</div>
      ${gs.executedToday !== null ? `<div style="margin-top:4px;color:var(--red)">⚖️ Executed today: ${gs.players[gs.executedToday]?.name}</div>` : '<div style="margin-top:4px;color:var(--text3)">No execution yet</div>'}
      ${gs.exiledToday !== null && state.travellers?.[gs.exiledToday] ? `<div style="margin-top:4px;color:#f39c12">🚫 Exiled today: ${state.travellers[gs.exiledToday]?.name}</div>` : ''}
    </div>`;

  // BMR warnings
  if (state.scriptId === "bmr") {
    if (gs.mastermindDay) {
      html += `<div class="warn warn-red" style="margin-bottom:8px">🎭 MASTERMIND DAY: If any player is executed, their team loses!</div>`;
    }
    if (gs.minstrelAllDrunk) {
      html += `<div class="warn warn-orange" style="margin-bottom:8px">🎵 MINSTREL: Everyone is drunk until dusk!</div>`;
    }
  }

  // Timer
  html += renderTimer();

  // Slayer ability (TB — once per game, day only)
  if (state.scriptId === "tb") {
    const slayer = gs.players.find(p => p.alive && (p.actual === "slayer" || (p.actual === "drunk" && p.believed === "slayer")));
    if (slayer && !slayer.abilityUsed) {
      html += `<div class="card" style="border-color:rgba(231,76,60,0.3);margin-top:12px">
        <div style="font-weight:600;font-size:13px;color:var(--red);margin-bottom:8px">⚔️ Slayer — ${esc(slayer.name)}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Once per game: publicly choose a player. If they are the Demon, they die.</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">`;
      gs.players.forEach((p, idx) => {
        if (!p.alive || idx === gs.players.indexOf(slayer)) return;
        html += `<button class="btn-sm" style="background:rgba(231,76,60,0.08);color:var(--text);border:1px solid #333" onclick="slayerUse(${gs.players.indexOf(slayer)},${idx})">${esc(p.name)}</button>`;
      });
      html += `</div></div>`;
    }
  }

  // Manual win declaration
  html += `<div style="margin-top:16px;display:flex;gap:8px">
    <button class="btn-outline" style="flex:1;color:var(--blue);border-color:rgba(93,173,226,0.3);font-size:12px" onclick="declareWin('good')">😇 Good Wins</button>
    <button class="btn-outline" style="flex:1;color:var(--red);border-color:rgba(231,76,60,0.3);font-size:12px" onclick="declareWin('evil')">😈 Evil Wins</button>
  </div>`;

  // Gossip tracker (BMR)
  if (state.scriptId === "bmr" && gs.players.some(p => p.alive && p.actual === "gossip")) {
    html += `<div class="card" style="border-color:rgba(243,156,18,0.3);margin-top:12px">
      <div style="font-weight:600;font-size:13px;color:var(--orange);margin-bottom:8px">💬 Gossip Tracker</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="input" style="flex:1;font-size:12px" id="gossipInput" placeholder="Gossip statement..."
          onkeydown="if(event.key==='Enter')addGossip()">
        <button class="btn-sm" style="background:rgba(243,156,18,0.12);color:var(--orange)" onclick="addGossip()">Add</button>
      </div>`;
    (gs.gossipStatements || []).forEach((g, idx) => {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.04)">
        <span style="flex:1;color:${g.resolved?'var(--text3)':'var(--text)'};${g.resolved?'text-decoration:line-through':''}">${esc(g.text)}</span>
        <span style="display:flex;gap:4px">
          <button class="btn-sm" style="background:rgba(39,174,96,0.12);color:var(--green);font-size:10px" onclick="resolveGossip(${idx},true)">T</button>
          <button class="btn-sm" style="background:rgba(231,76,60,0.12);color:var(--red);font-size:10px" onclick="resolveGossip(${idx},false)">F</button>
        </span>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function addGossip() {
  const el = document.getElementById("gossipInput");
  if (!el || !el.value.trim()) return;
  if (!state.gs.gossipStatements) state.gs.gossipStatements = [];
  state.gs.gossipStatements.push({ text: el.value.trim(), resolved: false, isTrue: null });
  autoSave(); render();
}
function resolveGossip(idx, isTrue) {
  if (!state.gs.gossipStatements?.[idx]) return;
  state.gs.gossipStatements[idx].resolved = true;
  state.gs.gossipStatements[idx].isTrue = isTrue;
  state.gs.log.push(`Gossip: "${state.gs.gossipStatements[idx].text}" — ${isTrue ? "TRUE (someone dies tonight!)" : "FALSE"}`);
  autoSave(); render();
}

// Slayer ability
function slayerUse(slayerIdx, targetIdx) {
  pushUndo();
  const gs = state.gs; const c = S().C;
  const slayer = gs.players[slayerIdx];
  const target = gs.players[targetIdx];
  slayer.abilityUsed = true;
  const isDemon = c[target.actual]?.type === "demon";
  const isDrunkSlayer = slayer.actual === "drunk";
  if (isDemon && !isDrunkSlayer && !slayer.poisoned) {
    target.alive = false; target.ghostVote = true;
    gs.log.push(`Day ${gs.dayNum}: ${slayer.name} (Slayer) shot ${target.name} — DEMON DIES!`);
    state.winMsg = {team:"good", reason:`${slayer.name} slayed the Demon (${target.name})!`};
  } else {
    gs.log.push(`Day ${gs.dayNum}: ${slayer.name} (Slayer) shot ${target.name} — nothing happens.`);
  }
  autoSave(); render();
}

// Manual win declaration
function declareWin(team) {
  state.winMsg = {team, reason: `Storyteller declared ${team === "good" ? "Good" : "Evil"} wins.`};
  render();
}

// Mayor check: 3 alive + no execution + Mayor alive = good wins
function checkMayorWin() {
  if (state.scriptId !== "tb") return;
  const gs = state.gs;
  const alive = gs.players.filter(p => p.alive);
  const mayor = alive.find(p => p.actual === "mayor");
  if (mayor && alive.length === 3 && gs.executedToday === null) {
    state.winMsg = {team:"good", reason:`Mayor (${mayor.name}) is alive with 3 players and no execution — Good wins!`};
    render();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════════════════════════════════════
const TIMER_PHASES = ["Personal", "Public", "Nominations"];
const TIMER_PHASE_COLORS = ["var(--blue)", "var(--orange)", "var(--red)"];

function getTimerDefaults(count) {
  if (count <= 8) return [180, 120, 30];
  if (count <= 12) return [300, 180, 30];
  return [420, 240, 45];
}

function initTimer() {
  const durs = getTimerDefaults(state.gs?.players?.length || state.playerCount);
  state.timer = {
    phase: 0, running: false, paused: false,
    seconds: durs[0], totalSeconds: durs[0],
    alarm: false, intervalId: null,
    durations: [...durs], showSettings: false,
  };
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true; state.timer.paused = false; state.timer.alarm = false;
  state.timer.intervalId = setInterval(timerTick, 1000);
  render();
}
function pauseTimer() {
  state.timer.paused = true; state.timer.running = false;
  clearInterval(state.timer.intervalId);
  render();
}
function stopTimer() {
  state.timer.running = false; state.timer.paused = false;
  clearInterval(state.timer.intervalId);
}
function timerTick() {
  const t = state.timer;
  if (t.seconds > 0) {
    t.seconds--;
    if (t.seconds <= 10 && t.seconds > 0) {
      try { navigator.vibrate?.(50); } catch(e){}
    }
    if (t.seconds === 0) {
      t.alarm = true;
      playAlarm();
      try { navigator.vibrate?.([200,100,200,100,200]); } catch(e){}
      render(); // Full render to show alarm controls
      return;
    }
  }
  // Targeted timer update instead of full render
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const el = document.getElementById("timerDisplay");
  const bar = document.getElementById("timerBar");
  const wrap = document.getElementById("timerWrap");
  if (!el || !state.timer) return;
  const t = state.timer;
  const low = t.seconds <= 10 && t.seconds > 0;
  const done = t.seconds === 0;
  const clr = TIMER_PHASE_COLORS[t.phase];
  el.textContent = formatTime(t.seconds);
  el.className = "timer-display" + (low?" timer-low":"") + (done?" timer-done":"");
  el.style.color = done ? "var(--red)" : low ? "var(--orange)" : clr;
  if (bar) {
    const pct = t.totalSeconds > 0 ? (t.seconds / t.totalSeconds * 100) : 0;
    bar.style.width = pct + "%";
  }
  if (wrap) {
    wrap.className = "timer-wrap" + (t.alarm ? " timer-alarm" : "");
  }
}
function timerAdvance() {
  const t = state.timer;
  if (t.phase < 2) {
    t.phase++; t.alarm = false;
    t.seconds = t.durations[t.phase];
    t.totalSeconds = t.durations[t.phase];
    if (!t.running) { t.running = true; t.intervalId = setInterval(timerTick, 1000); }
  } else {
    stopTimer(); t.alarm = false;
  }
  render();
}
function timerReset() {
  const t = state.timer;
  t.seconds = t.durations[t.phase];
  t.totalSeconds = t.durations[t.phase];
  t.alarm = false;
  render();
}
function timerSetPhase(p) {
  stopTimer();
  const t = state.timer;
  t.phase = p; t.seconds = t.durations[p]; t.totalSeconds = t.durations[p];
  t.alarm = false; t.running = false; t.paused = false;
  render();
}
function timerAdjust(idx, delta) {
  const t = state.timer;
  t.durations[idx] = Math.max(idx===2?5:15, t.durations[idx] + delta);
  if (idx === t.phase && !t.running) {
    t.seconds = t.durations[idx]; t.totalSeconds = t.durations[idx];
  }
  render();
}
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach(delay => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch(e){}
}

function renderTimer() {
  if (!state.timer) initTimer();
  const t = state.timer;
  const pct = t.totalSeconds > 0 ? (t.seconds / t.totalSeconds * 100) : 0;
  const clr = TIMER_PHASE_COLORS[t.phase];
  const low = t.seconds <= 10 && t.seconds > 0;
  const done = t.seconds === 0;

  let dots = "";
  TIMER_PHASES.forEach((name, i) => {
    const cls = i === t.phase ? "current" : i < t.phase ? "done" : "";
    dots += `<span class="timer-phase-dot ${cls}" onclick="timerSetPhase(${i})">${name}</span>`;
  });

  let controls = "";
  if (!t.running && !t.paused) {
    controls = `<button class="timer-btn" style="border-color:var(--green);color:var(--green)" onclick="startTimer()">▶ Start</button>`;
  } else if (t.running) {
    controls = `<button class="timer-btn" style="border-color:var(--orange);color:var(--orange)" onclick="pauseTimer()">⏸ Pause</button>`;
  } else {
    controls = `<button class="timer-btn" style="border-color:var(--green);color:var(--green)" onclick="startTimer()">▶ Resume</button>`;
  }
  controls += `<button class="timer-btn" onclick="timerReset()">↻</button>`;
  if (done || t.alarm) {
    controls += `<button class="timer-btn" style="border-color:${TIMER_PHASE_COLORS[Math.min(t.phase+1,2)]};color:${TIMER_PHASE_COLORS[Math.min(t.phase+1,2)]}" onclick="timerAdvance()">${t.phase<2?'Next ▶':'Done'}</button>`;
  }
  controls += `<button class="timer-btn" onclick="state.timer.showSettings=!state.timer.showSettings;render()">⚙</button>`;

  let settings = "";
  if (t.showSettings) {
    settings = `<div class="timer-settings">`;
    const deltas = [30, 30, 5]; // seconds per adjustment per phase
    TIMER_PHASES.forEach((name, i) => {
      settings += `<div class="timer-setting-row">
        <span style="color:${TIMER_PHASE_COLORS[i]}">${name}</span>
        <div class="timer-adj">
          <button class="timer-adj-btn" onclick="timerAdjust(${i},-${deltas[i]})">−</button>
          <span class="timer-adj-val">${formatTime(t.durations[i])}</span>
          <button class="timer-adj-btn" onclick="timerAdjust(${i},${deltas[i]})">+</button>
        </div>
      </div>`;
    });
    settings += `<button class="btn-outline" style="width:100%;margin-top:8px;font-size:11px" onclick="initTimer();render()">Reset to Defaults</button></div>`;
  }

  return `<div class="timer-wrap ${t.alarm?'timer-alarm':''}" id="timerWrap">
    <div class="timer-phases">${dots}</div>
    <div class="timer-phase-label" style="color:${clr}">${TIMER_PHASES[t.phase]}</div>
    <div class="timer-display ${low?'timer-low':''} ${done?'timer-done':''}" id="timerDisplay" style="color:${done?'var(--red)':low?'var(--orange)':clr}">${formatTime(t.seconds)}</div>
    <div class="timer-bar-track"><div class="timer-bar-fill" id="timerBar" style="width:${pct}%;background:${clr}"></div></div>
    <div class="timer-controls">${controls}</div>
    ${settings}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// NIGHT WALKER
// ══════════════════════════════════════════════════════════════════════════

// ── Show card helpers ──
function showNumberCard(num) {
  state.showCard = {
    emoji: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"][num] || "🔢",
    title: String(num), fontSize: 72,
    bg: "#0d0d1a", color: "#fff", borderColor: "#4a4a8a",
  }; render();
}
function showYesNo(yes) {
  state.showCard = {
    emoji: yes ? "✅" : "❌", title: yes ? "YES" : "NO",
    subtitle: yes ? "One IS the Demon (or Red Herring)" : "Neither is the Demon",
    fontSize: 48, bg: yes?"#0e2e0e":"#2e0e0e",
    color: yes?"#4ade80":"#ef4444", borderColor: yes?"#22c55e":"#dc2626",
  }; render();
}
function showCharCard(charId) {
  const s = S(); const ch = s.C[charId]; if (!ch) return;
  const clr = TYPE_CLR[ch.type];
  state.showCard = {
    emoji: TEMOJI[ch.type], title: ch.name,
    subtitle: ch.type.toUpperCase(), text: ch.ab,
    bg: `linear-gradient(135deg,#0d0d1a,${clr.bg})`,
    color: clr.txt, borderColor: clr.bdr,
  }; render();
}
function showThisIsCard(roleName, subtitle) {
  const s = S();
  const ch = Object.values(s.C).find(c => c.name === roleName);
  const clr = ch ? TYPE_CLR[ch.type] : TYPE_CLR.demon;
  state.showCard = {
    emoji: ch ? TEMOJI[ch.type] : "👹", title: roleName,
    subtitle: subtitle || "YOU ARE", text: ch ? ch.ab : "",
    bg: `linear-gradient(135deg,#0d0d1a,${clr.bg})`,
    color: clr.txt, borderColor: clr.bdr,
  }; render();
}

// ── Auto-calcs (TB) ──
function calcChef() {
  const gs = state.gs; const n = gs.players.length;
  const c = S().C; let pairs = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (c[gs.players[i].actual]?.team === "evil" && c[gs.players[j].actual]?.team === "evil") pairs++;
  }
  return pairs;
}
function calcEmpath(idx) {
  const gs = state.gs; const n = gs.players.length; const c = S().C;
  let cw = -1, ccw = -1;
  for (let d = 1; d < n; d++) { const i = (idx+d)%n; if (gs.players[i].alive) { cw = i; break; } }
  for (let d = 1; d < n; d++) { const i = (idx-d+n)%n; if (gs.players[i].alive) { ccw = i; break; } }
  let count = 0;
  if (cw >= 0 && c[gs.players[cw].actual]?.team === "evil") count++;
  if (ccw >= 0 && ccw !== cw && c[gs.players[ccw].actual]?.team === "evil") count++;
  return count;
}
function calcWasherwomanInfo() {
  const gs = state.gs; const c = S().C;
  return gs.players.filter(p => p.actual !== "drunk" && c[p.actual]?.type === "townsfolk")
    .map(p => ({name:p.name, seat:p.seat, role:c[p.actual]?.name}));
}
function calcLibrarianInfo() {
  const gs = state.gs; const c = S().C;
  return gs.players.filter(p => c[p.actual]?.type === "outsider")
    .map(p => ({name:p.name, seat:p.seat, role:c[p.actual]?.name}));
}
function calcInvestigatorInfo() {
  const gs = state.gs; const c = S().C;
  return gs.players.filter(p => c[p.actual]?.type === "minion")
    .map(p => ({name:p.name, seat:p.seat, role:c[p.actual]?.name}));
}

// ── Build night steps ──
function buildNightSteps() {
  const gs = state.gs; const s = S(); const c = s.C;
  const isFirst = gs.isFirstNight;
  const steps = [];

  const alivePlayers = gs.players.map((p,i) => ({...p,i})).filter(p => p.alive);
  const findAlive = (id) => alivePlayers.filter(p => p.actual === id);
  const findDrunkAs = (id) => alivePlayers.filter(p => p.actual === "drunk" && p.believed === id);

  if (state.scriptId === "tb") {
    buildTBNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs);
  } else {
    buildBMRNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs);
  }
  return steps;
}

// ══════════════════════════════════════════════════════════════════════════
// TB NIGHT STEPS
// ══════════════════════════════════════════════════════════════════════════
function buildTBNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs) {
  const order = isFirst ? TB_FIRST_NIGHT : TB_OTHER_NIGHT;

  if (isFirst && gs.players.length >= 7) {
    const minions = gs.players.filter(p => c[p.actual]?.type === "minion");
    const demon = gs.players.find(p => c[p.actual]?.type === "demon");
    steps.push({
      title: "🤝 Minion Info", type: "info",
      instr: `Wake ALL Minions together. Show "This is the Demon" — point to <strong>${demon?.name||"?"}</strong>.`,
      who: minions.map(m => `${m.name} (${c[m.actual]?.name})`).join(", "),
    });
    steps.push({
      title: "😈 Demon Info", type: "evil",
      instr: `Wake the Demon. Show Minions. Then show 3 bluffs.`,
      who: `${demon?.name||"?"} (Imp)`,
      extra: `Bluffs: <strong>${gs.bluffs.map(b=>c[b]?.name||b).join(", ")}</strong>`,
      showType: "bluffs", bluffIds: gs.bluffs,
    });
  }

  order.forEach(entry => {
    if (entry.id.startsWith("_")) return;
    const ch = c[entry.id]; if (!ch) return;
    const direct = findAlive(entry.id);
    const drunk = findDrunkAs(entry.id);

    [...direct, ...drunk].forEach(p => {
      const isDrunk = p.actual === "drunk";
      const instrText = isFirst ? ch.fn_r : ch.on_r;
      if (!instrText && !isFirst) return;

      const step = {
        title: `${TEMOJI[ch.type]} ${ch.name}`,
        type: ch.team === "evil" ? "evil" : "good",
        instr: instrText || ch.ab,
        who: `${p.name} (Seat ${p.i+1})`,
        warn: isDrunk ? "⚠️ DRUNK — give FALSE info!" : (p.poisoned ? "⚠️ POISONED — give FALSE info!" : null),
      };

      // ─── POISONER ───
      if (entry.id === "poisoner") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_poison";
        step.actionLabel = "☠️ Poison";
        step.actionDone = gs.players.some(pp => pp.poisonSource === "poisoner");
        if (step.actionDone) {
          const victim = gs.players.find(pp => pp.poisonSource === "poisoner");
          const vi = gs.players.indexOf(victim);
          step.actionStatus = `☠️ Poisoning: <strong>${victim.name}</strong> (Seat ${vi+1})`;
        }
      }

      // ─── MONK ───
      if (entry.id === "monk") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_monkProtect";
        step.actionLabel = "🛡️ Protect";
        const prot = gs.players.find(pp => pp.protected && pp.actual !== "monk");
        if (prot) {
          step.actionDone = true;
          step.actionStatus = `🛡️ Protecting: <strong>${prot.name}</strong>`;
        }
      }

      // ─── BUTLER ───
      if (entry.id === "butler") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_butlerMaster";
        step.actionLabel = "👑 Set Master";
        step.actionExclude = [p.i]; // Can't pick self
        const master = gs.players.find(pp => pp.master);
        if (master) {
          step.actionDone = true;
          step.actionStatus = `👑 Master: <strong>${master.name}</strong>`;
        }
      }

      // ─── SPY ───
      if (entry.id === "spy") { step.showType = "grimoire"; }

      // ─── CHEF ───
      if (entry.id === "chef") {
        step.showType = "number"; step.maxNum = 3;
        const v = calcChef();
        step.stHint = `🧮 TRUE: <strong>${v}</strong> evil pair${v!==1?"s":""}`;
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Give WRONG number!`;
      }

      // ─── EMPATH ───
      if (entry.id === "empath") {
        step.showType = "number"; step.maxNum = 2;
        const v = calcEmpath(p.i);
        step.stHint = `🧮 TRUE: <strong>${v}</strong> evil neighbor${v!==1?"s":""}`;
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Give WRONG number!`;
      }

      // ─── FORTUNE TELLER ───
      if (entry.id === "fortuneteller") {
        step.showType = "yesno";
        const rh = gs.redHerring >= 0 ? gs.players[gs.redHerring] : null;
        step.stHint = rh ? `🎯 Red Herring: <strong>${rh.name}</strong> (Seat ${gs.redHerring+1})` : `🎯 No Red Herring`;
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Answer can be anything!`;
      }

      // ─── WASHERWOMAN ───
      if (entry.id === "washerwoman") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "townsfolk").map(ch2 => ch2.id);
        const info = calcWasherwomanInfo();
        step.stHint = `📋 TRUE:<br>` + info.map(x => `• <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Show anything (all can be wrong)!`;
      }

      // ─── LIBRARIAN ───
      if (entry.id === "librarian") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "outsider").map(ch2 => ch2.id);
        const info = calcLibrarianInfo();
        step.stHint = info.length === 0 ? `📋 No Outsiders — show 0` :
          `📋 TRUE:<br>` + info.map(x => `• <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Show anything!`;
      }

      // ─── INVESTIGATOR ───
      if (entry.id === "investigator") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "minion").map(ch2 => ch2.id);
        const info = calcInvestigatorInfo();
        step.stHint = `📋 TRUE:<br>` + info.map(x => `• <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Show anything!`;
      }

      // ─── UNDERTAKER ───
      if (entry.id === "undertaker" && gs.executedToday !== null) {
        const ex = gs.players[gs.executedToday];
        step.extra = `Executed: <strong>${ex.name}</strong> — show <strong>${c[ex.actual]?.name}</strong>`;
        step.showType = "auto_character"; step.autoCharId = ex.actual;
      }

      // ─── IMP ───
      if (entry.id === "imp") {
        step.showType = "imp_kill";
        const soldier = gs.players.find(pp => pp.alive && pp.actual === "soldier");
        const prot = gs.players.filter(pp => pp.alive && pp.protected);
        let notes = [];
        if (soldier) notes.push(`⚔️ ${soldier.name} = SOLDIER`);
        prot.forEach(pp => notes.push(`🛡️ ${pp.name} = PROTECTED`));
        if (notes.length) step.extra = notes.join("<br>");
      }

      // ─── SCARLET WOMAN ───
      if (!isFirst && entry.id === "scarletwoman") {
        if (gs.executedToday !== null && c[gs.players[gs.executedToday].actual]?.type === "demon") {
          const aliveCount = gs.players.filter(pp=>pp.alive).length;
          if (aliveCount >= 5 && p.alive) {
            step.showType = "you_are";
            step.warn = `Demon executed! ${aliveCount} alive ≥ 5. Show SW she's the Imp.`;
          } else return;
        } else return;
      }

      // ─── RAVENKEEPER ───
      if (!isFirst && entry.id === "ravenkeeper") {
        if (!gs.diedTonight.includes(p.i)) return;
        step.condition = "⚰️ Died tonight — gets to use ability";
        step.showType = "ravenkeeper_pick";
      }

      steps.push(step);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// BMR NIGHT STEPS
// ══════════════════════════════════════════════════════════════════════════
function buildBMRNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs) {
  const order = isFirst ? BMR_FIRST_NIGHT : BMR_OTHER_NIGHT;
  const alivePlayers = gs.players.map((p,i)=>({...p,i})).filter(p=>p.alive);

  order.forEach(entry => {
    const id = entry.id;

    // ─── SPECIAL STEPS ───
    if (id === "_minioninfo" && isFirst && gs.players.length >= 7) {
      const minions = gs.players.filter(p => c[p.actual]?.type === "minion");
      const demon = gs.players.find(p => c[p.actual]?.type === "demon");
      steps.push({
        title: "🤝 Minion Info", type: "info",
        instr: `Wake ALL Minions. Show "This is the Demon" — point to <strong>${demon?.name||"?"}</strong>.`,
        who: minions.map(m => `${m.name} (${c[m.actual]?.name})`).join(", "),
      });
      return;
    }
    if (id === "_demoninfo" && isFirst && gs.players.length >= 7) {
      const demon = gs.players.find(p => c[p.actual]?.type === "demon");
      steps.push({
        title: "😈 Demon Info", type: "evil",
        instr: `Wake Demon. Show Minions. Show 3 bluffs.`,
        who: `${demon?.name||"?"} (${c[demon?.actual]?.name||"?"})`,
        extra: `Bluffs: <strong>${gs.bluffs.map(b=>c[b]?.name||b).join(", ")}</strong>`,
        showType: "bluffs", bluffIds: gs.bluffs,
      });
      return;
    }
    if (id === "lunatic_info" && isFirst) {
      const lunatic = gs.players.find(p => p.actual === "lunatic");
      if (!lunatic) return;
      steps.push({
        title: "🌙 Lunatic (Info)", type: "good",
        instr: `Show Lunatic fake Minion info + 3 bluffs (as if they are the Demon). Then wake real Demon and show them who the Lunatic is.`,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "⚠️ The Lunatic thinks they are the Demon! Give fake info.",
      });
      return;
    }
    if (id === "lunatic_action" && isFirst) {
      const lunatic = gs.players.find(p => p.actual === "lunatic");
      if (!lunatic) return;
      steps.push({
        title: "🌙 Lunatic (Action)", type: "good",
        instr: `Lunatic does fake demon attacks. Then show real Demon who the Lunatic chose.`,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "⚠️ Nobody actually dies from the Lunatic's choice.",
      });
      return;
    }
    if (id === "_minstrel" && !isFirst) {
      const minstrel = findAlive("minstrel");
      if (minstrel.length === 0) return;
      steps.push({
        title: "🎵 Minstrel (cleanup)", type: "info",
        instr: gs.minstrelAllDrunk
          ? `Minstrel triggered! ALL players are drunk until dusk. Clear the drunk status now.`
          : `No Minion was executed yesterday. No Minstrel effect.`,
        who: `${minstrel[0].name} (Seat ${minstrel[0].i+1})`,
      });
      return;
    }
    if (id === "_grandmother" && !isFirst) {
      if (gs.grandchildIdx < 0) return;
      const gc = gs.players[gs.grandchildIdx];
      const gm = gs.players.find(p => p.actual === "grandmother" && p.alive);
      if (!gm || !gc) return;
      if (gs.diedTonight.includes(gs.grandchildIdx)) {
        // Check if demon killed the grandchild
        steps.push({
          title: "👵 Grandmother (passive)", type: "info",
          instr: `Grandchild (${gc.name}) died tonight! If killed by the Demon, Grandmother (${gm.name}) also dies.`,
          who: `${gm.name}`,
          warn: "⚠️ Kill Grandmother if the Demon killed the grandchild.",
        });
      }
      return;
    }
    if (id === "_goon") {
      const goon = gs.players.find(p => p.actual === "goon");
      if (!goon || !goon.alive) return;
      steps.push({
        title: "🔄 Goon (passive)", type: "info",
        instr: `If anyone chose the Goon tonight, the FIRST chooser is drunk until dusk and the Goon becomes their alignment.`,
        who: `${goon.name} (Seat ${goon.seat})`,
      });
      return;
    }

    // ─── DEMON STEP ───
    if (id === "_demon" && !isFirst) {
      const demonType = gs.demonType;
      const demon = gs.players.find(p => p.actual === demonType && p.alive);
      if (!demon) return;
      const dIdx = gs.players.indexOf(demon);

      // Check Exorcist block
      if (gs.exorcistTarget === dIdx) {
        let blockNote = "";
        // Pukka: previous victim still dies even if exorcised
        if (demonType === "pukka" && gs.pukkaVictimIdx >= 0) {
          const prev = gs.players[gs.pukkaVictimIdx];
          blockNote = `<br>⚠️ Pukka's previous victim (${prev?.name}) still dies! Exorcist only blocks the NEW poison.`;
        }
        // Po: loses charge if exorcised
        if (demonType === "po" && gs.poCharged) {
          blockNote = `<br>⚠️ Po was charged — charge is LOST.`;
        }
        const blockStep = {
          title: `👹 ${c[demonType]?.name} (BLOCKED)`, type: "evil",
          instr: `Exorcist targeted the Demon! The Demon does NOT wake tonight.${blockNote}`,
          who: `${demon.name} (${c[demonType]?.name})`,
          warn: "✝️ Exorcist blocks the Demon's active ability.",
        };
        // Pukka prev victim still needs resolution even when blocked
        if (demonType === "pukka" && gs.pukkaVictimIdx >= 0) {
          blockStep.showType = "pukka_prev_only";
        }
        // Po loses charge
        if (demonType === "po" && gs.poCharged) {
          blockStep.showType = "po_lose_charge";
        }
        steps.push(blockStep);
        return;
      }

      const step = {
        title: `👹 ${c[demonType]?.name}`, type: "evil",
        instr: c[demonType]?.on_r || c[demonType]?.ab,
        who: `${demon.name} (Seat ${demon.seat})`,
      };

      // Demon-specific showTypes
      if (demonType === "zombuul") {
        if (gs.executedToday !== null || gs.diedTonight.length > 0) {
          step.warn = "Someone died today — Zombuul does NOT kill tonight.";
          step.showType = null;
        } else {
          step.showType = "demon_kill";
        }
      }
      if (demonType === "po") {
        step.showType = "po_pick";
      }
      if (demonType === "shabaloth") {
        step.showType = "shabaloth_pick";
      }
      if (demonType === "pukka") {
        step.showType = "pukka_pick";
      }
      steps.push(step);
      return;
    }

    // ─── REGULAR STEPS ───
    const ch = c[id]; if (!ch) return;

    // Lunatic on other nights
    if (id === "lunatic" && !isFirst) {
      const lunatic = gs.players.find(p => p.actual === "lunatic" && p.alive);
      if (!lunatic) return;
      steps.push({
        title: `🌙 Lunatic`, type: "good",
        instr: ch.on_r || ch.ab,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "⚠️ Lunatic thinks they're the Demon. Show real Demon their choices.",
      });
      return;
    }

    const direct = findAlive(id);
    const drunk = findDrunkAs(id);

    [...direct, ...drunk].forEach(p => {
      const isDrunk = p.actual === "drunk";
      const instrText = isFirst ? ch.fn_r : ch.on_r;
      if (!instrText) return;

      const step = {
        title: `${TEMOJI[ch.type]} ${ch.name}`,
        type: ch.team === "evil" ? "evil" : "good",
        instr: instrText,
        who: `${p.name} (Seat ${p.i+1})`,
        warn: isDrunk ? "⚠️ DRUNK — give FALSE info!" : (p.poisoned ? "⚠️ POISONED — give FALSE info!" : null),
      };

      // ─── SAILOR ───
      if (id === "sailor") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_sailorDrunk";
        step.actionLabel = "🍺 Make Drunk";
        step.actionExclude = [p.i]; // Can't pick self
        const drunkTarget = gs.players.find(pp => pp.drunkSource === "Sailor");
        if (drunkTarget) {
          step.actionDone = true;
          step.actionStatus = `🍺 Drunk: <strong>${drunkTarget.name}</strong>`;
        }
      }

      // ─── COURTIER ───
      if (id === "courtier") {
        if (gs.courtierUsed) {
          step.instr = `Courtier already used their ability.`;
          if (gs.courtierTimer > 0) step.extra = `⏱️ Timer: ${gs.courtierTimer} nights remaining. Target: ${gs.courtierTarget ? c[gs.courtierTarget]?.name : "?"}`;
          step.warn = null;
          steps.push(step);
          return;
        }
        step.showType = "courtier_pick";
      }

      // ─── INNKEEPER ───
      if (id === "innkeeper" && !isFirst) {
        step.showType = "innkeeper_pick";
      }

      // ─── GAMBLER ───
      if (id === "gambler" && !isFirst) {
        step.showType = "gambler_pick";
        step.gamblerId = p.i;
      }

      // ─── DEVIL'S ADVOCATE ───
      if (id === "devilsadvocate") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_daProtect";
        step.actionLabel = "⚖️ DA Protect";
        // DA can't pick same player 2 nights in a row
        step.actionExclude = gs.daLastTarget >= 0 ? [gs.daLastTarget] : [];
        if (gs.daTarget >= 0) {
          step.actionDone = true;
          step.actionStatus = `⚖️ DA Protecting: <strong>${gs.players[gs.daTarget].name}</strong>`;
        }
        if (gs.daLastTarget >= 0) {
          step.stHint = `Cannot choose <strong>${gs.players[gs.daLastTarget]?.name}</strong> (last night's target).`;
        }
      }

      // ─── EXORCIST ───
      if (id === "exorcist" && !isFirst) {
        step.showType = "action_pick";
        step.actionFn = "nightAction_exorcistPick";
        step.actionLabel = "✝️ Exorcise";
        if (gs.exorcistTarget >= 0) {
          step.actionDone = true;
          step.actionStatus = `✝️ Exorcising: <strong>${gs.players[gs.exorcistTarget].name}</strong>`;
        }
      }

      // ─── CHAMBERMAID ───
      if (id === "chambermaid") {
        step.showType = "number"; step.maxNum = 2;
      }

      // ─── GRANDMOTHER (first night) ───
      if (id === "grandmother" && isFirst && gs.grandchildIdx >= 0) {
        const gc = gs.players[gs.grandchildIdx];
        step.stHint = `👶 Grandchild: <strong>${gc.name}</strong> (Seat ${gc.seat}) — ${c[gc.actual]?.name}`;
        step.showType = "player_pick";
        if (isDrunk || p.poisoned) step.stHint += `<br>⚠️ Show wrong player/character!`;
      }

      // ─── GODFATHER (first night) ───
      if (id === "godfather" && isFirst) {
        const outsiders = gs.outsidersInPlay || [];
        step.stHint = `🌿 Outsiders in play: ${outsiders.map(o => c[o]?.name||o).join(", ") || "None"}`;
      }

      // ─── GODFATHER (other night — kills if outsider died) ───
      if (id === "godfather" && !isFirst) {
        const exIdx = gs.executedToday;
        const outsiderDied = exIdx !== null && c[gs.players[exIdx]?.actual]?.type === "outsider";
        const nightOutsiderDied = gs.diedTonight.some(idx => c[gs.players[idx]?.actual]?.type === "outsider");
        if (!outsiderDied && !nightOutsiderDied) return;
        step.showType = "demon_kill";
      }

      // ─── ASSASSIN ───
      if (id === "assassin" && !isFirst) {
        if (gs.assassinUsed) return;
        step.showType = "assassin_pick";
      }

      // ─── PROFESSOR ───
      if (id === "professor" && !isFirst) {
        if (gs.professorUsed) return;
        step.showType = "professor_pick";
      }

      // ─── GOSSIP ───
      if (id === "gossip" && !isFirst) {
        const trueGossips = (gs.gossipStatements||[]).filter(g => g.resolved && g.isTrue);
        if (trueGossips.length === 0) {
          step.instr = "No true gossip statements today — no kill.";
        } else {
          step.showType = "demon_kill";
          step.extra = `TRUE gossip! "${trueGossips[0].text}" — choose someone to die.`;
        }
      }

      // ─── TINKER ───
      if (id === "tinker") {
        step.instr = "You may kill the Tinker. Or not. Your choice.";
        step.showType = "demon_kill";
      }

      // ─── MOONCHILD ───
      if (id === "moonchild" && !isFirst) {
        const mcDied = gs.diedTonight.some(idx => gs.players[idx].actual === "moonchild");
        if (!mcDied) return;
        step.condition = "⚰️ Moonchild died tonight";
        step.showType = "moonchild_pick";
      }

      steps.push(step);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER SHOW CARDS (in night walker steps)
// ══════════════════════════════════════════════════════════════════════════
function renderStepShowCards(step) {
  if (!step || !step.showType) return "";
  const gs = state.gs; const s = S(); const c = s.C;

  // Section header varies by type
  const isAction = step.showType.startsWith("action_") || ["courtier_pick","innkeeper_pick","gambler_pick",
    "assassin_pick","professor_pick","moonchild_pick","pukka_pick","po_pick","shabaloth_pick",
    "pukka_prev_only","po_lose_charge","ravenkeeper_pick"].includes(step.showType);
  const sectionLabel = isAction ? "🎯 Action" : "📋 Show to Player";

  let html = `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08)">
    <div style="font-size:11px;font-weight:700;color:${isAction?'var(--orange)':'var(--blue)'};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${sectionLabel}</div>`;

  // Helper: alive player buttons
  function alivePlayerBtns(onclick, exclude, opts) {
    let h = "";
    const ex = exclude || [];
    const showBadges = opts?.badges !== false;
    gs.players.forEach((p, idx) => {
      if (!p.alive) return;
      if (ex.includes(idx)) return;
      const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
      let badge = "";
      if (showBadges) {
        if (p.poisoned) badge += ' <span style="color:var(--purple);font-size:10px">☠️</span>';
        if (p.protected) badge += ' <span style="color:var(--blue);font-size:10px">🛡️</span>';
        if (p.daProtected) badge += ' <span style="color:var(--orange);font-size:10px">⚖️</span>';
        if (p.drunkSource) badge += ' <span style="color:var(--teal);font-size:10px">🍺</span>';
        if (p.actual === "soldier") badge += ' <span style="color:var(--orange);font-size:10px">⚔️</span>';
        if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) badge += ' <span style="color:var(--teal);font-size:10px">⛵</span>';
      }
      const fn = onclick.replace("IDX", idx);
      h += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="${fn}">
        <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span>${badge}</span>
        <span style="color:var(--text3);font-size:12px">${opts?.icon||"→"}</span></button>`;
    });
    return h;
  }

  // Helper: dead player buttons
  function deadPlayerBtns(onclick) {
    let h = "";
    gs.players.forEach((p, idx) => {
      if (p.alive) return;
      const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
      const fn = onclick.replace("IDX", idx);
      h += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;opacity:0.7" onclick="${fn}">
        <span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span> ⚰️</button>`;
    });
    return h;
  }

  // Helper: kill buttons (with protection badges)
  function killPlayerBtns(onclick, exclude) {
    let h = `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose target to kill:</div>`;
    const ex = exclude || [];
    gs.players.forEach((p, idx) => {
      if (!p.alive || ex.includes(idx)) return;
      const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
      let badge = "";
      if (p.actual === "soldier") badge = ' <span style="color:var(--orange);font-size:10px">⚔️ SOLDIER</span>';
      if (p.protected) badge = ' <span style="color:var(--blue);font-size:10px">🛡️ PROTECTED</span>';
      if (ch2?.type === "demon") badge = ' <span style="color:var(--red);font-size:10px">👹 SELF</span>';
      if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) badge = ' <span style="color:var(--teal);font-size:10px">⛵ SAILOR</span>';
      const fn = onclick.replace("IDX", idx);
      h += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="${fn}">
        <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span>${badge}</span>
        <span style="color:var(--red)">💀</span></button>`;
    });
    h += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:rgba(39,174,96,0.3);color:var(--green);font-style:italic" onclick="markNoDeath()">🛡️ No death (blocked)</button>`;
    return h;
  }

  switch (step.showType) {

    // ═══════════════════════════════
    // ORIGINAL SHOW TYPES (unchanged)
    // ═══════════════════════════════
    case "number": {
      html += `<div class="choice-grid">`;
      for (let n = 0; n <= (step.maxNum||3); n++)
        html += `<button class="choice-btn" onclick="showNumberCard(${n})">${n}</button>`;
      html += `</div>`;
      break;
    }
    case "yesno": {
      html += `<div class="choice-grid">
        <button class="choice-btn" style="flex:1;color:#4ade80;border-color:#22c55e" onclick="showYesNo(true)">✅ YES</button>
        <button class="choice-btn" style="flex:1;color:#ef4444;border-color:#dc2626" onclick="showYesNo(false)">❌ NO</button>
      </div>`;
      break;
    }
    case "character_pick": {
      (step.pickFrom||[]).forEach(id => {
        const ch2 = c[id]; if (!ch2) return;
        const clr = TYPE_CLR[ch2.type];
        html += `<button class="char-choice-btn" style="margin-bottom:4px;border-color:${clr.bdr}44;color:${clr.txt}" onclick="showCharCard('${id}')">
          ${TEMOJI[ch2.type]} ${ch2.name}</button>`;
      });
      break;
    }
    case "auto_character": {
      const ch2 = c[step.autoCharId]; if (!ch2) break;
      const clr = TYPE_CLR[ch2.type];
      html += `<button class="char-choice-btn" style="border-color:${clr.bdr};color:${clr.txt};font-size:14px;text-align:center;padding:12px" onclick="showCharCard('${step.autoCharId}')">
        ${TEMOJI[ch2.type]} Show: <strong>${ch2.name}</strong></button>`;
      break;
    }
    case "player_pick": {
      gs.players.forEach((p, idx) => {
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44" onclick="showCharCard('${p.actual}')">
          <span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></button>`;
      });
      break;
    }
    case "bluffs": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Tap each to show:</div>`;
      (step.bluffIds||[]).forEach(id => {
        const ch2 = c[id]; if (!ch2) return;
        const clr = TYPE_CLR[ch2.type];
        html += `<button class="char-choice-btn" style="margin-bottom:4px;border-color:${clr.bdr}44;color:${clr.txt}" onclick="showCharCard('${id}')">
          ${TEMOJI[ch2.type]} ${ch2.name}</button>`;
      });
      break;
    }
    case "grimoire": {
      html += `<button class="char-choice-btn" style="text-align:center;border-color:var(--indigo);color:var(--indigo);font-size:14px;padding:12px" onclick="state.tab='grimoire';render()">📖 Open Grimoire (show Spy your screen)</button>`;
      break;
    }
    case "you_are": {
      html += `<button class="char-choice-btn" style="text-align:center;border-color:${TYPE_CLR.demon.bdr};color:${TYPE_CLR.demon.txt};font-size:14px;padding:12px" onclick="showThisIsCard('Imp','YOU ARE NOW THE')">
        👹 Show: "You are the Imp"</button>`;
      break;
    }
    case "imp_kill":
    case "demon_kill": {
      if (gs.nightKillDone && step.showType === "imp_kill") {
        html += `<div style="padding:10px;border-radius:8px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.2);color:var(--red);font-size:13px;font-weight:600">
          💀 Kill resolved${gs.diedTonight.length===0?" (blocked)":""}</div>`;
      } else {
        html += killPlayerBtns("killFromNightWalker(IDX)");
      }
      break;
    }

    // ═══════════════════════════════════════
    // NEW ACTION TYPES — inline state changes
    // ═══════════════════════════════════════

    // Generic: pick a player → call action function
    case "action_pick": {
      if (step.actionDone && step.actionStatus) {
        html += `<div style="padding:10px;border-radius:8px;background:rgba(39,174,96,0.08);border:1px solid rgba(39,174,96,0.2);color:var(--green);font-size:13px;margin-bottom:6px">
          ${step.actionStatus}</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Change:</div>`;
      }
      html += alivePlayerBtns(`${step.actionFn}(IDX)`, step.actionExclude, {icon: step.actionLabel||"→"});
      break;
    }

    // TB: Ravenkeeper — pick player, show their character
    case "ravenkeeper_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Player picks someone to learn their character:</div>`;
      html += alivePlayerBtns("nightAction_ravenkeeperPick(IDX)", [], {icon:"🔍"});
      break;
    }

    // BMR: Courtier — pick character (not player) to make drunk
    case "courtier_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose a CHARACTER to make drunk for 3 nights:</div>`;
      const inPlayIds = new Set(gs.players.map(p => p.actual));
      Object.values(c).filter(ch => inPlayIds.has(ch.id)).forEach(ch2 => {
        const clr = TYPE_CLR[ch2.type];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;color:${clr.txt}" onclick="nightAction_courtierPick('${ch2.id}')">
          ${TEMOJI[ch2.type]} ${ch2.name}</button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3);font-style:italic" onclick="nightAction_courtierPick('none')">Skip (don't use ability yet)</button>`;
      break;
    }

    // BMR: Innkeeper — pick 2 to protect, then 1 of them to drunk
    case "innkeeper_pick": {
      const phase = state.nightStepData.innkeeperPhase;
      const picks = state.nightStepData.innkeeperPicks || [];

      if (phase === "drunk") {
        html += `<div style="font-size:12px;color:var(--green);font-weight:600;margin-bottom:6px">✅ Protecting: ${picks.map(idx=>gs.players[idx].name).join(" & ")}</div>`;
        const drunkCount = gs.players.filter(p => p.drunkSource).length;
        if (drunkCount >= 1) {
          html += `<div class="warn warn-red" style="margin-bottom:6px;padding:8px;border-radius:6px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3)">⚠️ WARNING: There are already ${drunkCount} drunk players in the game (Usually max 2).</div>`;
        }
        html += `<div style="font-size:12px;color:var(--orange);margin-bottom:6px">Now choose which one is DRUNK:</div>`;
        picks.forEach(idx => {
          const p = gs.players[idx]; const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
          const warnClick = drunkCount >= 1 ? `if(confirm('There are already ${drunkCount} drunk players. Make ${esc(p.name).replace(/'/g, "\\'")} drunk anyway?')) ` : ``;
          html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:var(--orange);color:var(--orange)" onclick="${warnClick}nightAction_innkeeperDrunk(${idx})">
            🍺 ${esc(p.name)} (${ch2?.name})</button>`;
        });
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_innkeeperReset()">↩ Reset</button>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose 2 players to protect (${picks.length}/2):</div>`;
        if (picks.length > 0) {
          html += `<div style="font-size:11px;color:var(--green);margin-bottom:4px">Selected: ${picks.map(idx=>gs.players[idx].name).join(", ")}</div>`;
        }
        html += alivePlayerBtns("nightAction_innkeeperPick(IDX)", picks, {icon:"🛡️"});
        if (picks.length > 0) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_innkeeperReset()">↩ Reset</button>`;
        }
      }
      break;
    }

    // BMR: Gambler — pick player, ST decides if guess was right
    case "gambler_pick": {
      const gamblerId = step.gamblerId;
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Gambler guesses a player's character. Was the guess correct?</div>`;
      html += `<div class="choice-grid" style="margin-bottom:8px">
        <button class="choice-btn" style="flex:1;color:#4ade80;border-color:#22c55e" onclick="state.gs.log.push('Night '+state.gs.dayNum+': Gambler guessed correctly.');autoSave();render()">✅ Correct</button>
        <button class="choice-btn" style="flex:1;color:#ef4444;border-color:#dc2626" onclick="nightAction_gamblerDies(${gamblerId})">❌ Wrong — dies!</button>
      </div>`;
      break;
    }

    // BMR: Assassin — kill (bypasses ALL protection, once per game)
    case "assassin_pick": {
      html += `<div style="padding:8px;border-radius:6px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.2);color:var(--red);font-size:12px;font-weight:600;margin-bottom:8px">
        💀 ONE-TIME ABILITY — Bypasses ALL protection!</div>`;
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose target (or skip):</div>`;
      gs.players.forEach((p, idx) => {
        if (!p.alive) return;
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="nightAction_assassinKill(${idx})">
          <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></span>
          <span style="color:var(--red)">💀</span></button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3);font-style:italic" onclick="nightAction_assassinSkip()">🙅 Don't use ability tonight</button>`;
      break;
    }

    // BMR: Professor — revive a dead player (once per game)
    case "professor_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose dead Townsfolk to revive (once per game):</div>`;
      html += deadPlayerBtns("nightAction_professorRevive(IDX)");
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--red);color:var(--red);font-style:italic" onclick="nightAction_professorFail()">❌ Professor fails (wrong guess or poisoned)</button>`;
      break;
    }

    // BMR: Moonchild — if died tonight, choose good player to revenge kill
    case "moonchild_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Moonchild died! If they chose a good player today, that player dies:</div>`;
      gs.players.forEach((p, idx) => {
        if (!p.alive) return;
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        const isGood = ch2?.team === "good";
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="nightAction_moonchildKill(${idx})">
          <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></span>
          <span style="color:${isGood?'var(--green)':'var(--red)'}; font-size:10px">${isGood?'GOOD ✓':'EVIL'}</span></button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="">🙅 No revenge (chose evil or nobody)</button>`;
      break;
    }

    // ═══════════════════════════════
    // DEMON VARIANTS
    // ═══════════════════════════════

    // BMR: Pukka — kill prev victim + poison new
    case "pukka_pick": {
      const prevIdx = gs.pukkaVictimIdx;
      const prev = prevIdx >= 0 ? gs.players[prevIdx] : null;

      if (prev && prev.alive) {
        html += `<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:6px">Step 1: Previous victim ${prev.name} dies now:</div>`;
        html += `<div class="choice-grid" style="margin-bottom:10px">
          <button class="choice-btn" style="flex:1;color:var(--red);border-color:var(--darkred)" onclick="nightAction_pukkaKillPrev()">💀 Kill ${esc(prev.name)}</button>
          <button class="choice-btn" style="flex:1;color:var(--green);border-color:#22c55e" onclick="nightAction_pukkaSkipPrev()">🛡️ Survives</button>
        </div>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text3);margin-bottom:6px">${prev ? "Previous victim already dead." : "No previous victim."}</div>`;
      }
      html += `<div style="font-size:12px;color:var(--purple);font-weight:600;margin-bottom:6px">Step 2: Pukka poisons a new player:</div>`;
      html += alivePlayerBtns("nightAction_pukkaPoison(IDX)", [], {icon:"☠️"});
      break;
    }

    // Pukka prev only (when exorcised — still resolve prev victim)
    case "pukka_prev_only": {
      const prevIdx = gs.pukkaVictimIdx;
      const prev = prevIdx >= 0 ? gs.players[prevIdx] : null;
      if (prev && prev.alive) {
        html += `<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:6px">Previous victim ${prev.name} still dies (Exorcist doesn't prevent this):</div>`;
        html += `<div class="choice-grid">
          <button class="choice-btn" style="flex:1;color:var(--red);border-color:var(--darkred)" onclick="nightAction_pukkaKillPrev()">💀 Kill ${esc(prev.name)}</button>
          <button class="choice-btn" style="flex:1;color:var(--green);border-color:#22c55e" onclick="nightAction_pukkaSkipPrev()">🛡️ Survives</button>
        </div>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text3)">No previous victim to resolve.</div>`;
      }
      break;
    }

    // BMR: Po — charge up or attack (1 or 3)
    case "po_pick": {
      const charged = gs.poCharged;
      const picks = state.nightStepData.poKills || [];

      if (charged) {
        html += `<div style="padding:8px;border-radius:6px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3);color:var(--red);font-size:13px;font-weight:700;margin-bottom:8px">
          ⚡ CHARGED — Choose 3 players to kill!</div>`;
        if (picks.length > 0) {
          html += `<div style="font-size:11px;color:var(--orange);margin-bottom:4px">Selected (${picks.length}/3): ${picks.map(idx=>gs.players[idx].name).join(", ")}</div>`;
        }
        html += killPlayerBtns("nightAction_poKill(IDX)", picks);
        if (picks.length > 0) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_poReset()">↩ Reset</button>`;
        }
        if (picks.length > 0 && picks.length < 3) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--orange);color:var(--orange)" onclick="nightAction_poApply()">⚡ Apply ${picks.length} kill${picks.length>1?"s":""} (skip remaining)</button>`;
        }
      } else {
        html += `<div class="choice-grid" style="margin-bottom:10px">
          <button class="choice-btn" style="flex:1;color:var(--orange);border-color:var(--orange);font-weight:700" onclick="nightAction_poCharge()">⚡ CHARGE UP<br><span style="font-size:10px;font-weight:400">(3 kills next night)</span></button>
        </div>`;
        html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">— OR kill 1 player:</div>`;
        html += killPlayerBtns("killFromNightWalker(IDX)");
      }
      break;
    }

    // Po loses charge when exorcised
    case "po_lose_charge": {
      html += `<button class="char-choice-btn" style="text-align:center;border-color:var(--red);color:var(--red);padding:12px" onclick="state.gs.poCharged=false;state.gs.nightKillDone=true;state.gs.log.push('Night '+state.gs.dayNum+': Po charge lost (Exorcist).');autoSave();render()">
        ⚡ Clear Po's Charge</button>`;
      break;
    }

    // BMR: Shabaloth — kill 2 + optional regurgitate
    case "shabaloth_pick": {
      const picks = state.nightStepData.shabKills || [];

      // Regurgitate option (last night's kills)
      const lastNightDead = gs.players.map((p,i)=>({...p,i})).filter(p => !p.alive);
      if (lastNightDead.length > 0) {
        html += `<div style="font-size:12px;color:var(--green);margin-bottom:6px">Optional: Regurgitate (revive) a previous victim first:</div>`;
        lastNightDead.forEach(p => {
          const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
          html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:rgba(39,174,96,0.3);color:var(--green)" onclick="nightAction_shabalothRegurgitate(${p.i})">
            ✨ ${esc(p.name)} (${ch2?.name})</button>`;
        });
        html += `<div style="border-top:1px solid rgba(255,255,255,0.06);margin:8px 0"></div>`;
      }

      html += `<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:6px">Choose 2 players to kill (${picks.length}/2):</div>`;
      if (picks.length > 0) {
        html += `<div style="font-size:11px;color:var(--orange);margin-bottom:4px">Selected: ${picks.map(idx=>gs.players[idx].name).join(", ")}</div>`;
      }
      gs.players.forEach((p, idx) => {
        if (!p.alive || picks.includes(idx)) return;
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="nightAction_shabalothKill(${idx})">
          <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></span>
          <span style="color:var(--red)">💀</span></button>`;
      });
      if (picks.length > 0) {
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_shabalothReset()">↩ Reset</button>`;
      }
      if (picks.length === 1) {
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--orange);color:var(--orange)" onclick="nightAction_shabalothApply()">💀 Apply 1 kill only</button>`;
      }
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:rgba(39,174,96,0.3);color:var(--green);font-style:italic" onclick="markNoDeath()">🛡️ No death (blocked)</button>`;
      break;
    }
  }

  html += `</div>`;
  return html;
}

function killFromNightWalker(i) {
  killPlayer(i);
  // Stay on night tab
  state.tab = "night";
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER NIGHT WALKER
// ══════════════════════════════════════════════════════════════════════════
function renderNightWalker() {
  const gs = state.gs;
  const steps = buildNightSteps();
  const cur = Math.min(state.nightStep, steps.length);
  const step = steps[cur];

  // Progress bar
  const pct = steps.length > 0 ? ((cur / steps.length) * 100) : 0;
  const progress = `<div style="margin-bottom:16px">
    <div style="height:4px;border-radius:2px;background:var(--surface3);overflow:hidden">
      <div style="width:${pct}%;height:100%;background:var(--indigo);transition:width 0.3s"></div>
    </div>
  </div>`;

  let stepCard = "";
  if (step) {
    const bgc = step.type==="evil"?"rgba(60,20,20,0.3)":step.type==="info"?"rgba(20,20,60,0.3)":"rgba(20,40,60,0.3)";
    const bdc = step.type==="evil"?"rgba(231,76,60,0.3)":step.type==="info"?"rgba(136,136,221,0.3)":"rgba(93,173,226,0.3)";
    const ttc = step.type==="evil"?"var(--red)":step.type==="info"?"var(--indigo)":"var(--blue)";

    stepCard = `<div class="night-step fade-in" style="background:${bgc};border:1px solid ${bdc}">
      <h4 style="font-size:18px;color:${ttc};margin-bottom:8px">${step.title}</h4>
      <div style="font-size:13px;color:#ccc;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;margin-bottom:8px">
        <strong style="color:var(--orange)">PLAYER:</strong> ${step.who}
      </div>
      <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:4px">${step.instr}</div>
      ${step.extra?`<div class="warn warn-orange" style="margin-top:8px">${step.extra}</div>`:""}
      ${step.warn?`<div class="warn warn-red" style="margin-top:8px">${step.warn}</div>`:""}
      ${step.stHint?`<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(93,173,226,0.08);border:1px solid rgba(93,173,226,0.2);font-size:12px;line-height:1.6;color:var(--blue)">
        <span style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);display:block;margin-bottom:4px">🔒 ST EYES ONLY</span>
        ${step.stHint}
      </div>`:""}
      ${step.condition?`<div style="font-size:11px;color:var(--text2);margin-top:6px;font-style:italic">ℹ️ ${step.condition}</div>`:""}
      ${renderStepShowCards(step)}
    </div>`;
  } else {
    stepCard = `<div style="text-align:center;padding:40px 20px;color:var(--text3)">
      <div style="font-size:40px;margin-bottom:12px">🌅</div>
      <div style="font-size:14px">Night phase complete. Advance to day when ready.</div>
    </div>`;
  }

  // Navigation
  let nav = `<div style="display:flex;gap:8px;margin-bottom:20px">
    <button class="btn" style="flex:1;padding:10px;background:${cur===0?'#1a1a1a':'#222'};color:${cur===0?'#444':'#aaa'};border:1px solid #333;font-size:13px" ${cur===0?"disabled":""} onclick="state.nightStep=${Math.max(0,cur-1)};render()">← Prev</button>
    ${cur < steps.length - 1
      ? `<button class="btn btn-night" style="flex:1;padding:10px;font-size:13px" onclick="state.nightStep=${cur+1};render()">Next →</button>`
      : `<button class="btn btn-day" style="flex:1;padding:10px;font-size:13px" onclick="confirmAction('startDay','Advance to Day?')">☀️ Dawn</button>`
    }
  </div>`;

  // Step list
  let stepList = '<div style="font-size:12px;color:var(--text3);font-weight:600;margin-bottom:6px">All Night Steps:</div>';
  steps.forEach((s, i) => {
    const active = i === cur;
    stepList += `<div onclick="state.nightStep=${i};render()" style="padding:5px 10px;margin-bottom:2px;border-radius:6px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;
      background:${active?'rgba(136,136,221,0.12)':'transparent'};
      border-left:3px solid ${active?'var(--indigo)':'transparent'};
      color:${i<cur?'var(--text3)':active?'var(--indigo)':'var(--text2)'}">
      <span>${i<cur?"✓ ":""}${s.title}</span>
      <span style="color:var(--text3)">${(s.who||"").split("(")[0].trim()}</span>
    </div>`;
  });

  return `<div style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;color:var(--indigo)">🌙 ${gs.isFirstNight?"First Night":`Night ${gs.dayNum}`}</h3>
      <span style="font-size:12px;color:var(--text3)">Step ${cur+1}/${steps.length}</span>
    </div>
    ${progress}${stepCard}${nav}${stepList}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// ROLES REFERENCE TAB
// ══════════════════════════════════════════════════════════════════════════
function renderRolesRef() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = `<div style="padding:16px">
    <h3 style="font-size:16px;color:${s.color};margin-bottom:8px">🎭 Role Cards</h3>
    <div class="card" style="border-color:rgba(41,128,185,0.2);background:rgba(41,128,185,0.08);font-size:12px;color:var(--blue);margin-bottom:12px">
      💡 Tap a player to show their role card.
    </div>`;

  gs.players.forEach((p, i) => {
    const ch = c[p.actual];
    const showCh = (p.actual === "drunk" && p.believed) ? c[p.believed] : ch;
    const clr = TYPE_CLR[showCh?.type || ch?.type || "townsfolk"];
    const roleImg = renderRoleImage(showCh?.id, showCh?.type, 24);
    html += `<div onclick="state.showingRoleFor=${i};render()" style="padding:10px 12px;margin-bottom:5px;border-radius:8px;border:1px solid ${clr.bdr}44;background:${clr.bg};cursor:pointer;display:flex;align-items:center;gap:8px">
      <span class="seat-num" style="background:${clr.bdr}">${i+1}</span>
      ${roleImg}
      <span style="flex:1;font-weight:600;font-size:13px">${esc(p.name)}</span>
      <span style="font-size:16px">${TEMOJI[showCh?.type||"townsfolk"]}</span>
      <span style="color:var(--text3);font-size:12px">👁️</span>
    </div>`;
  });

  // Full character encyclopedia
  html += `<h4 style="font-size:14px;color:var(--text2);margin:20px 0 10px">All ${s.name} Characters</h4>`;
  ["townsfolk","outsider","minion","demon"].forEach(type => {
    const clr = TYPE_CLR[type];
    html += `<div style="font-weight:600;font-size:12px;color:${clr.txt};margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">${TEMOJI[type]} ${type}s</div>`;
    Object.values(c).filter(ch => ch.type === type).forEach(ch => {
      const roleImg = renderRoleImage(ch.id, type, 20, "vertical-align:middle;margin-right:6px");
      html += `<div style="padding:6px 10px;margin-bottom:3px;border-radius:6px;background:rgba(255,255,255,0.02);font-size:11px;line-height:1.4;display:flex;align-items:center;gap:6px">
        ${roleImg}<div><strong style="color:${clr.txt}">${ch.name}:</strong> <span style="color:var(--text2)">${esc(ch.ab)}</span></div>
      </div>`;
    });
    html += '<div style="height:8px"></div>';
  });
  html += '</div>';
  return html;
}

// ══════════════════════════════════════════════════════════════════════════
// LOG TAB
// ══════════════════════════════════════════════════════════════════════════
function renderLog() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = '<div style="padding:16px">';
  html += `<h3 style="font-size:16px;color:${s.color};margin-bottom:12px">📝 Game Log</h3>`;

  if (gs.log.length === 0) {
    html += '<div style="color:var(--text3);text-align:center;padding:20px">No events yet.</div>';
  } else {
    gs.log.forEach(entry => {
      html += `<div style="padding:6px 10px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,0.02);font-size:12px;color:var(--text2);border-left:3px solid rgba(231,76,60,0.3)">${esc(entry)}</div>`;
    });
  }

  // Game state summary
  const alive = gs.players.filter(p => p.alive);
  const evilAlive = alive.filter(p => c[p.actual]?.team === "evil");
  const demon = gs.players.find(p => c[p.actual]?.type === "demon");

  html += `<div style="margin-top:20px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;font-size:12px;color:var(--text3);line-height:2">
    <div style="font-weight:600;color:var(--text2);margin-bottom:4px">Game State Summary</div>
    <div>Phase: ${gs.phase==="night"?"🌙 Night":"☀️ Day"} ${gs.dayNum}</div>
    <div>Alive: ${alive.length} / ${gs.players.length}</div>
    <div>Votes needed: <strong style="color:var(--orange)">${Math.ceil(alive.length/2)}</strong></div>
    <hr style="border-color:#222;margin:8px 0">
    <div>Evil alive: ${evilAlive.map(p=>`<span style="color:var(--red)">${esc(p.name)} (${c[p.actual]?.name})</span>`).join(", ")||"None"}</div>
    <div>Demon: ${demon?`${esc(demon.name)} ${demon.alive?"✅":"❌"}`:"-"}</div>
    <div>Poisoned: ${gs.players.filter(p=>p.poisoned).map(p=>`<span style="color:var(--purple)">${esc(p.name)}</span>`).join(", ")||"None"}</div>`;

  if (state.scriptId === "tb") {
    const sw = gs.players.find(p => p.actual === "scarletwoman");
    const mayor = alive.find(p => p.actual === "mayor");
    if (sw) html += `<div>Scarlet Woman: ${esc(sw.name)} ${sw.alive?"✅":"❌"} — ${alive.length>=5?"can become Demon":"needs 5+ alive"}</div>`;
    if (mayor) html += `<div>⚠️ Mayor alive — 3 alive + no execution = GOOD WINS</div>`;
  }
  if (state.scriptId === "bmr") {
    html += `<div>Demon type: ${c[gs.demonType]?.name}</div>`;
    if (gs.courtierTarget) html += `<div>Courtier drunk: ${gs.courtierTarget} (${gs.courtierTimer}N left)</div>`;
    if (gs.assassinUsed) html += `<div>Assassin: used</div>`;
    if (gs.professorUsed) html += `<div>Professor: used</div>`;
  }

  html += `</div></div>`;
  return html;
}

// ══════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════
// Note: Initialization is handled in the HTML files
