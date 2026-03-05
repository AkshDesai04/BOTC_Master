// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TEAM COLORS & EMOJIS (shared)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const TYPE_CLR = {
  townsfolk: {bg:"rgba(93,173,226,0.08)", bdr:"#2980b9", txt:"#5dade2"},
  outsider:  {bg:"rgba(72,201,176,0.08)", bdr:"#1abc9c", txt:"#48c9b0"},
  minion:    {bg:"rgba(155,89,182,0.08)", bdr:"#8e44ad", txt:"#bb8fce"},
  demon:     {bg:"rgba(231,76,60,0.08)",  bdr:"#c0392b", txt:"#e74c3c"},
};
const TEMOJI = {townsfolk:"ðŸ˜ï¸", outsider:"ðŸŒ¿", minion:"ðŸ—¡ï¸", demon:"ðŸ‘¹"};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Script accessor â”€â”€
function S() { return state.scriptId === "tb" ? TB : BMR; }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function esc(s) { if(!s)return""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
function formatTime(secs) { const m=Math.floor(secs/60); const s=secs%60; return `${m}:${s<10?'0':''}${s}`; }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let state = {
  screen: "count",        // select | count | names | characters | showroles | game
  scriptId: null,         // "tb" | "bmr"
  playerCount: 10,
  names: [],
  nameInput: "",

  // Character selection
  selTF: [], selOS: [], selMN: [], selDM: [],
  godfatherOutsiderMod: 0, // BMR only: -1, 0, +1
  drunkAs: "",              // TB only: which TF the Drunk believes they are

  // Game state
  gs: null,

  // UI state
  tab: "grimoire",
  expandedPlayer: -1,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SAVE / LOAD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const SAVE_KEY = "botc_storyteller_v2";
const LISTS_KEY = "botc_player_lists";

function autoSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      _v: 2, _saved: Date.now(),
      screen: state.screen, scriptId: state.scriptId,
      playerCount: state.playerCount, names: state.names,
      selTF: state.selTF, selOS: state.selOS, selMN: state.selMN, selDM: state.selDM,
      godfatherOutsiderMod: state.godfatherOutsiderMod, drunkAs: state.drunkAs,
      gs: state.gs, tab: state.tab, nightStep: state.nightStep,
      nightPhase: state.nightPhase, undoStack: state.undoStack,
      rolesShown: state.rolesShown,
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
    godfatherOutsiderMod: saved.godfatherOutsiderMod || 0,
    drunkAs: saved.drunkAs || "",
    gs: saved.gs, tab: saved.tab || "grimoire",
    nightStep: saved.nightStep || 0, nightPhase: saved.nightPhase || "none",
    undoStack: saved.undoStack || [],
    rolesShown: saved.rolesShown || [],
    expandedPlayer: -1, confirm: null, showCard: null, showingRoleFor: -1,
    timer: null,
  });
  state.showResume = false;
  render();
}

function newGame() {
  clearSave();
  const currentScriptId = state.scriptId; // Preserve script selection
  state = {
    screen: "count", scriptId: currentScriptId, playerCount: 10,
    names: [], nameInput: "",
    selTF: [], selOS: [], selMN: [], selDM: [],
    godfatherOutsiderMod: 0, drunkAs: "",
    gs: null, tab: "grimoire", expandedPlayer: -1,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UNDO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER ENGINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function render() {
  const app = document.getElementById("app");
  // Track screen changes for fade-in
  const screenChanged = state._lastScreen !== state.screen;
  state._lastScreen = state.screen;
  state._fadeIn = screenChanged;
  let html = renderHeader();

  switch (state.screen) {
    case "select":     html += state.scriptId ? renderCountScreen() : renderSelectScreen(); break;
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEADER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderHeader() {
  const s = state.scriptId ? S() : null;
  const titleColor = s ? s.color : "var(--red)";
  const titleText = s ? s.name : "BOTC STORYTELLER";

  let badge = "";
  if (state.gs) {
    const isNight = state.gs.phase === "night";
    badge = `<div class="phase-badge" style="background:${isNight?"#1a1a3a":"#3a3a1a"};border:1px solid ${isNight?"#4a4a8a":"#8a8a4a"};color:${isNight?"#8888dd":"#cccc44"}">
      ${isNight?"ðŸŒ™":"â˜€ï¸"} ${isNight?"Night":"Day"} ${state.gs.dayNum||1}
    </div>`;
  }

  let rightBtns = "";
  if (state.screen === "game" || state.screen === "showroles") {
    rightBtns = `<button class="btn-outline" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:var(--red)"
      onclick="state.confirm={msg:'Start a completely new game? Current progress will be lost.',onYes:'newGame'};render()">New Game</button>`;
  }

  return `<div class="header">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">${s ? s.emoji : 'ðŸ©¸'}</span>
      <span class="header-title" style="color:${titleColor}">${titleText}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">${rightBtns}${badge}</div>
  </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OVERLAYS (Confirm, Show Card, Role Reveal, Resume)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderOverlays() {
  let html = "";

  // Resume prompt
  if (state.showResume) {
    const saved = loadFromStorage();
    const when = saved?._saved ? new Date(saved._saved).toLocaleString() : "unknown";
    const sData = saved?.scriptId === "tb" ? TB : BMR;
    const sName = sData?.name || "Unknown";
    const sEmoji = sData?.emoji || "ðŸ©¸";
    const phase = saved?.gs ? `${saved.gs.phase==="night"?"ðŸŒ™ Night":"â˜€ï¸ Day"} ${saved.gs.dayNum||1}` : "Setup";
    const pCount = saved?.gs?.players?.length || saved?.playerCount || "?";

    html += `<div class="overlay" style="z-index:220">
      <div class="overlay-box" style="border:2px solid var(--blue)">
        <div style="font-size:36px;margin-bottom:12px">ðŸ’¾</div>
        <div style="font-size:18px;font-weight:700;color:var(--blue);margin-bottom:8px">Saved Game Found</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${sEmoji} ${sName}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${phase} â€¢ ${pCount} players</div>
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
        <div style="font-size:36px;margin-bottom:12px">âš ï¸</div>
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
    html += `<div class="show-card-overlay" onclick="state.showingRoleFor=-1;render()">
      <div class="show-card" style="background:linear-gradient(135deg,#0d0d1a,${clr.bg});border:3px solid ${clr.bdr}">
        <div style="font-size:64px;margin-bottom:12px">${TEMOJI[showCh?.type||"townsfolk"]}</div>
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">${(showCh?.type||"").toUpperCase()}</div>
        <div style="font-size:28px;font-weight:700;color:${clr.txt};margin-bottom:16px">${showCh?.name||''}</div>
        <div style="font-size:14px;color:#ccc;line-height:1.6;padding:12px 16px;background:rgba(0,0,0,0.3);border-radius:10px">${esc(showCh?.ab||'')}</div>
        ${ch?.team==="evil"?`<div style="margin-top:12px;padding:6px 16px;background:rgba(231,76,60,0.2);border-radius:8px;font-size:13px;color:var(--red);font-weight:700">ðŸ˜ˆ YOU ARE EVIL</div>`:''}
        <div style="font-size:11px;color:var(--text3);margin-top:16px">tap anywhere to dismiss</div>
      </div>
    </div>`;
  }

  return html;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Script Selector
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderSelectScreen() {
  return `<div class="screen${state._fadeIn?' fade-in':''}" style="padding-top:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:40px;margin-bottom:8px">ðŸ©¸</div>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Player Count
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderCountScreen() {
  const s = S();
  const d = s.DIST[state.playerCount];

  let buttons = "";
  for (let n = 5; n <= 15; n++) {
    const active = n === state.playerCount;
    buttons += `<button class="count-btn ${active?'active':''}" onclick="setPlayerCount(${n})">${n}</button>`;
  }

  return `<div class="screen${state._fadeIn?' fade-in':''}" style="text-align:center;padding-top:32px">
    <h2 style="color:${s.color};margin-bottom:4px;font-size:20px">${s.emoji} ${s.name}</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:8px">How many players? (not counting Storyteller)</p>

    <div class="count-grid">${buttons}</div>

    <div class="card" style="text-align:left;margin-bottom:24px">
      <div style="font-weight:600;margin-bottom:6px;font-size:13px;color:var(--text2)">Distribution for ${state.playerCount} players:</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px">
        <span style="color:${TYPE_CLR.townsfolk.txt}">ðŸ˜ï¸ ${d.t} Townsfolk</span>
        <span style="color:${TYPE_CLR.outsider.txt}">ðŸŒ¿ ${d.o} Outsiders</span>
        <span style="color:${TYPE_CLR.minion.txt}">ðŸ—¡ï¸ ${d.m} Minions</span>
        <span style="color:${TYPE_CLR.demon.txt}">ðŸ‘¹ ${d.d||1} Demon</span>
      </div>
    </div>

    <button class="btn btn-primary" style="background:linear-gradient(135deg,${s.color}cc,${s.color})" onclick="goToNames()">Enter Player Names â†’</button>
    <button class="btn-outline" style="margin-top:12px;width:100%" onclick="state.screen='select';state.scriptId=null;render()">â† Change Script</button>
  </div>`;
}

function setPlayerCount(n) {
  state.playerCount = n;
  state.names = state.names.slice(0, n);
  autoSave();
  render();
}

function goToNames() {
  state.screen = "names";
  autoSave();
  render();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Names
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderNamesScreen() {
  const count = state.playerCount;
  const names = state.names;
  const lists = getPlayerLists();

  let list = "";
  names.forEach((n, i) => {
    list += `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:4px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
      <span style="width:24px;height:24px;border-radius:50%;background:${S().color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
      <span style="flex:1;font-weight:500">${esc(n)}</span>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px" onclick="moveName(${i},-1)" ${i===0?"disabled":""}>â†‘</button>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px" onclick="moveName(${i},1)" ${i===names.length-1?"disabled":""}>â†“</button>
      <button class="btn-outline" style="padding:2px 6px;font-size:12px;color:var(--red);border-color:var(--red)" onclick="removeName(${i})">âœ•</button>
    </div>`;
  });

  const canProceed = names.length === count;

  // Save/Load list buttons
  let listBtns = "";
  if (canProceed) {
    listBtns += `<button class="btn-outline" style="margin-right:8px;font-size:11px" onclick="promptSaveList()">ðŸ’¾ Save List</button>`;
  }
  if (lists.length > 0) {
    listBtns += `<button class="btn-outline" style="font-size:11px" onclick="state.showLoadList=!state.showLoadList;render()">ðŸ“‹ Load List (${lists.length})</button>`;
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
          <div style="font-size:11px;color:var(--text3)">${l.count}p â€¢ ${l.players.slice(0,3).join(", ")}${l.count>3?"...":""}</div>
        </div>
        <button class="btn-outline" style="padding:2px 6px;font-size:11px;color:var(--red);border-color:var(--red)" onclick="deletePlayerList(${i})">âœ•</button>
      </div>`;
    });
    loadPanel += `</div>`;
  }

  return `<div class="screen${state._fadeIn?' fade-in':''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;color:${S().color}">Player Names</h2>
        <p style="color:var(--text2);font-size:12px">${names.length}/${count} â€” clockwise seating order</p>
      </div>
      <button class="btn-outline" onclick="state.screen='count';render()">â† Back</button>
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
      ${canProceed ? "Select Characters â†’" : `Add ${count - names.length} more player${count-names.length>1?"s":""}`}
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
  state.drunkAs = ""; state.godfatherOutsiderMod = 0;
  autoSave(); render();
}

function promptSaveList() {
  const defaultName = `${state.playerCount}p â€” ${new Date().toLocaleDateString()}`;
  const name = prompt("Save list as:", defaultName);
  if (name) { savePlayerList(name); render(); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Character Selection
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
  const adj = getAdjustedDist();
  const townsfolk = Object.values(c).filter(ch => ch.type === "townsfolk");
  const outsiders = Object.values(c).filter(ch => ch.type === "outsider");
  const minions = Object.values(c).filter(ch => ch.type === "minion");
  const demons = Object.values(c).filter(ch => ch.type === "demon");

  function chipSection(title, chars, sel, key, needed) {
    const type = key === "selMN" ? "minion" : key === "selOS" ? "outsider" : key === "selDM" ? "demon" : "townsfolk";
    const clr = TYPE_CLR[type];
    const ok = sel.length === needed;
    let chips = "";
    chars.forEach(ch => {
      const on = sel.includes(ch.id);
      chips += `<span class="role-chip" onclick="toggleRole('${key}','${ch.id}')"
        style="border-color:${on?clr.bdr:'#333'};background:${on?clr.bg:'rgba(0,0,0,0.3)'};color:${on?clr.txt:'#666'};font-weight:${on?600:400}">${ch.name}</span>`;
    });
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-weight:600;color:${clr.txt};font-size:14px">${title}</span>
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;font-weight:600;background:${ok?'rgba(39,174,96,0.2)':'rgba(231,76,60,0.2)'};color:${ok?'var(--green)':'var(--red)'}">${sel.length}/${needed}</span>
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
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;font-weight:600;background:rgba(39,174,96,0.2);color:var(--green)">1/1</span>
      </div>
      <span class="role-chip" style="border-color:${clr.bdr};background:${clr.bg};color:${clr.txt};font-weight:600;cursor:default">Imp</span>
    </div>`;
  } else {
    demonSection = chipSection("Demon (choose 1)", demons, state.selDM, "selDM", adj.d);
  }

  // Drunk picker (TB only)
  let drunkPicker = "";
  if (state.scriptId === "tb" && state.selOS.includes("drunk")) {
    const availTF = townsfolk.filter(t => !state.selTF.includes(t.id));
    let opts = '<option value="">Select a Townsfolk...</option>';
    availTF.forEach(ch => { opts += `<option value="${ch.id}" ${state.drunkAs===ch.id?"selected":""}>${ch.name}</option>`; });
    drunkPicker = `<div class="card" style="border-color:rgba(72,201,176,0.3);background:rgba(26,74,58,0.15);margin-bottom:16px">
      <div style="font-weight:600;font-size:13px;color:var(--teal);margin-bottom:8px">ðŸº The Drunk believes they are:</div>
      <select class="input" onchange="state.drunkAs=this.value;autoSave();render()">${opts}</select>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">This Townsfolk goes in the bag. The player thinks they ARE this Townsfolk.</div>
    </div>`;
  }

  // Godfather modifier (BMR only)
  let godfatherMod = "";
  if (state.scriptId === "bmr") {
    const hasGF = state.selMN.includes("godfather");
    if (hasGF) {
      const mod = state.godfatherOutsiderMod;
      godfatherMod = `<div class="card" style="border-color:rgba(155,89,182,0.3);background:rgba(90,26,90,0.1);margin-bottom:16px">
        <div style="font-weight:600;font-size:13px;color:var(--purple);margin-bottom:8px">ðŸŽ© Godfather: Outsider Modifier</div>
        <div style="display:flex;align-items:center;gap:12px;justify-content:center">
          <button class="count-btn ${mod===-1?'active':''}" style="width:40px;height:40px;font-size:14px" onclick="state.godfatherOutsiderMod=-1;autoSave();render()">âˆ’1</button>
          <button class="count-btn ${mod===0?'active':''}" style="width:40px;height:40px;font-size:14px" onclick="state.godfatherOutsiderMod=0;autoSave();render()">0</button>
          <button class="count-btn ${mod===1?'active':''}" style="width:40px;height:40px;font-size:14px" onclick="state.godfatherOutsiderMod=1;autoSave();render()">+1</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px;text-align:center">Adds or removes 1 Outsider (adjusts Townsfolk accordingly)</div>
      </div>`;
    }
  }

  // Validation
  const hasDrunk = state.scriptId === "tb" && state.selOS.includes("drunk");
  const canProceed = state.selTF.length === adj.t && state.selOS.length === adj.o && state.selMN.length === adj.m && state.selDM.length === adj.d && (!hasDrunk || state.drunkAs);

  // Baron warning for TB
  let baronNote = "";
  if (state.scriptId === "tb" && state.selMN.includes("baron")) {
    baronNote = `<div class="warn warn-orange" style="margin-bottom:12px">ðŸ‘‘ Baron: +2 Outsiders, âˆ’2 Townsfolk</div>`;
  }

  return `<div class="screen${state._fadeIn?' fade-in':''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;color:${s.color}">Select Characters</h2>
        <p style="color:var(--text2);font-size:12px">${state.playerCount} players</p>
      </div>
      <button class="btn-outline" onclick="state.screen='names';render()">â† Back</button>
    </div>
    <button class="btn btn-blue" style="margin-bottom:16px;font-size:13px" onclick="randomizeRoles()">ðŸŽ² Randomize All</button>
    ${baronNote}
    ${chipSection("Townsfolk", townsfolk, state.selTF, "selTF", adj.t)}
    ${chipSection("Outsiders", outsiders, state.selOS, "selOS", adj.o)}
    ${chipSection("Minions", minions, state.selMN, "selMN", adj.m)}
    ${demonSection}
    ${drunkPicker}
    ${godfatherMod}
    <button class="btn ${canProceed?'btn-primary':'btn-disabled'}" ${canProceed?"":'disabled'}
      style="${canProceed?'background:'+s.color:''}"
      onclick="assignAndShowRoles()">
      ${canProceed?"ðŸŽ­ Assign Roles & Start":"Select correct number of each type"}
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

function randomizeRoles() {
  const s = S(); const c = s.C;
  const base = s.DIST[state.playerCount];

  const allTF = Object.values(c).filter(ch => ch.type === "townsfolk").map(ch => ch.id);
  const allOS = Object.values(c).filter(ch => ch.type === "outsider").map(ch => ch.id);
  const allMN = Object.values(c).filter(ch => ch.type === "minion").map(ch => ch.id);
  const allDM = Object.values(c).filter(ch => ch.type === "demon").map(ch => ch.id);

  // Pick demon first
  let selDM;
  if (s.demonFixed) {
    selDM = [...s.defaultDemon];
  } else {
    // BMR: keep current demon if one selected, else random
    selDM = state.selDM.length === 1 ? [...state.selDM] : [shuffle(allDM)[0]];
  }

  // Pick minions
  const selMN = shuffle(allMN).slice(0, base.m);

  // Calculate modifiers
  let oMod = 0, tMod = 0;
  if (state.scriptId === "tb" && selMN.includes("baron")) {
    oMod = 2; tMod = -2;
  } else if (state.scriptId === "bmr" && selMN.includes("godfather")) {
    const mod = [-1, 0, 1][Math.floor(Math.random() * 3)];
    state.godfatherOutsiderMod = mod;
    oMod = mod; tMod = -mod;
  }

  const selOS = shuffle(allOS).slice(0, base.o + oMod);
  const selTF = shuffle(allTF).slice(0, base.t + tMod);

  // Drunk-believes-as for TB
  let drunkAs = "";
  if (state.scriptId === "tb" && selOS.includes("drunk")) {
    const remaining = allTF.filter(id => !selTF.includes(id));
    if (remaining.length > 0) drunkAs = shuffle(remaining)[0];
  }

  state.selTF = selTF; state.selOS = selOS; state.selMN = selMN; state.selDM = selDM;
  state.drunkAs = drunkAs;
  autoSave(); render();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROLE ASSIGNMENT + GAME STATE CREATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function assignAndShowRoles() {
  const s = S(); const c = s.C;
  const hasDrunk = state.scriptId === "tb" && state.selOS.includes("drunk");

  // Build role pool
  const pool = [...state.selTF, ...state.selOS.filter(id => id !== "drunk"), ...state.selMN, ...state.selDM];
  if (hasDrunk) pool.push("drunk");
  const shuffled = shuffle(pool);

  // Create players
  const players = state.names.map((name, i) => {
    const roleId = shuffled[i];
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
    ...extra,
  };

  state.gs = gs;
  state.screen = "showroles";
  state.tab = "grimoire";
  state.expandedPlayer = -1;
  state.nightStep = 0;
  state.showingRoleFor = -1;
  state.showCard = null;
  state.rolesShown = [];
  autoSave(); render();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Show Roles
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderShowRolesScreen() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = `<div class="screen${state._fadeIn?' fade-in':''}">
    <h2 style="font-size:18px;color:${s.color};margin-bottom:4px">ðŸŽ­ Show Role Cards</h2>
    <p style="color:var(--text2);font-size:12px;margin-bottom:16px">Tap each player to show them their role privately. Drunk sees their believed Townsfolk.</p>`;

  // TB: Red Herring picker
  if (state.scriptId === "tb" && gs.redHerring !== undefined) {
    const hasFT = gs.players.some(p => p.actual === "fortuneteller" || (p.actual === "drunk" && p.believed === "fortuneteller"));
    if (hasFT) {
      const goodPlayers = gs.players.map((p,i) => ({...p,i})).filter(p => c[p.actual]?.team === "good");
      let rhOpts = "";
      goodPlayers.forEach(p => {
        rhOpts += `<option value="${p.i}" ${gs.redHerring===p.i?"selected":""}>${p.name} (Seat ${p.i+1} â€” ${c[p.actual]?.name}${p.actual==="drunk"?" / Drunk":""})</option>`;
      });
      html += `<div class="card" style="border-color:rgba(231,76,60,0.3);background:rgba(90,26,26,0.15);margin-bottom:16px">
        <div style="font-weight:600;font-size:13px;color:var(--red);margin-bottom:6px">ðŸŽ¯ Fortune Teller â€” Red Herring</div>
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
        <div style="font-weight:600;font-size:13px;color:var(--blue);margin-bottom:6px">ðŸ‘µ Grandmother's Grandchild</div>
        <div style="font-size:13px;color:var(--text)">${grandchild.name} (Seat ${grandchild.seat}) â€” ${c[grandchild.actual]?.name}</div>
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
    html += `<div onclick="showRoleTo(${i})" style="padding:12px;margin-bottom:6px;border-radius:10px;border:1px solid ${clr.bdr}44;background:${clr.bg};cursor:pointer;display:flex;align-items:center;gap:10px;${shown?'opacity:0.6':''}">
      <span class="seat-num" style="background:${clr.bdr}">${i+1}</span>
      <span style="flex:1;font-weight:600;font-size:14px">${esc(p.name)}</span>
      <span style="font-size:20px">${TEMOJI[showCh?.type||"townsfolk"]}</span>
      <span style="color:var(--text3);font-size:14px">${shown?"âœ“":"ðŸ‘ï¸"}</span>
    </div>`;
  });

  const allShown = state.rolesShown.length >= gs.players.length;
  html += `<div style="margin-top:20px">
    <button class="btn btn-night" onclick="state.screen='game';autoSave();render()">
      ${allShown ? "âœ…" : "âš ï¸"} Begin Night 1
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN: Game
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderGameScreen() {
  const gs = state.gs;
  if (!gs) return `<div class="screen">No game state</div>`;
  const alive = gs.players.filter(p => p.alive).length;
  const majority = Math.ceil(alive / 2);
  const ghostsLeft = gs.players.filter(p => !p.alive && p.ghostVote && !p.ghostUsed).length;

  let tabs = "";
  const tabList = [
    {id:"grimoire",l:"ðŸ“– Grim"},{id:"night",l:"ðŸŒ™ Night"},
    {id:"day",l:"â˜€ï¸ Day"},{id:"roles",l:"ðŸŽ­ Roles"},{id:"log",l:"ðŸ“ Log"}
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
  const undoBtn = hasUndo ? `<button class="btn" style="width:auto;padding:12px 14px;background:#2a1a1a;color:var(--orange);border:1px solid #4a2a1a;font-size:18px;border-radius:10px" onclick="undoAction()" title="Undo">â†©</button>` : "";

  let bottomBtns = "";
  if (gs.phase === "day") {
    const nextN = gs.dayNum + 1;
    bottomBtns = `${undoBtn}<button class="btn btn-night" style="flex:1" onclick="confirmAction('startNight','Begin Night ${nextN}? Make sure all day actions are done.')"">ðŸŒ™ Begin Night ${nextN}</button>`;
  } else {
    bottomBtns = `${undoBtn}
      <button class="btn btn-night" style="flex:1" onclick="state.tab='night';render()">ðŸŒ™ Night Walker</button>
      <button class="btn btn-day" style="flex:1" onclick="confirmAction('startDay','Advance to Day? Make sure all night steps are done.')">â˜€ï¸ Dawn</button>`;
  }

  // Win overlay
  let winOverlay = "";
  if (state.winMsg) {
    const w = state.winMsg;
    winOverlay = `<div class="overlay" onclick="state.winMsg=null;render()">
      <div class="overlay-box" style="border:2px solid ${w.team==='good'?'#2980b9':'#e74c3c'}">
        <div style="font-size:48px;margin-bottom:12px">${w.team==='good'?'ðŸ˜‡':'ðŸ˜ˆ'}</div>
        <div style="font-size:24px;font-weight:700;color:${w.team==='good'?'#5dade2':'#e74c3c'};margin-bottom:8px">${w.team==='good'?'GOOD':'EVIL'} WINS!</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:16px">${w.reason}</div>
        <div style="font-size:12px;color:var(--text3)">Tap to dismiss</div>
      </div>
    </div>`;
  }

  return `<div class="tabs">${tabs}</div>
    <div class="status-bar">
      <span style="color:var(--green)">ðŸ‘¤ ${alive}</span>
      <span style="color:var(--red)">ðŸ’€ ${gs.players.length - alive}</span>
      <span style="color:var(--orange)">ðŸ—³ï¸ ${majority}</span>
      <span style="color:var(--purple)">ðŸ‘» ${ghostsLeft}</span>
    </div>
    <div style="padding-bottom:80px">${content}</div>
    <div class="bottom-bar">${bottomBtns}</div>
    ${winOverlay}`;
}

function confirmAction(fn, msg) {
  state.confirm = { msg, onYes: fn };
  render();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PHASE TRANSITIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function startDay() {
  pushUndo();
  const gs = state.gs;
  gs.phase = "day";
  gs.executedToday = null;
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GRIMOIRE TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderGrimoire() {
  const gs = state.gs;
  const s = S(); const c = s.C;
  const isNight = gs.phase === "night";
  const isDay = gs.phase === "day";

  let html = `<div style="padding:12px">`;

  // Bluffs + script info
  html += `<div class="card" style="border-color:rgba(231,76,60,0.2);background:rgba(90,26,26,0.15);font-size:12px;margin-bottom:8px">
    <span style="font-weight:600;color:var(--red)">ðŸƒ Bluffs: </span>
    ${gs.bluffs.map(b => c[b]?.name || b).join(", ")}`;
  if (state.scriptId === "tb" && gs.redHerring >= 0) {
    html += `<br><span style="font-weight:600;color:var(--orange)">ðŸŽ¯ Red Herring: </span>${gs.players[gs.redHerring]?.name} (Seat ${gs.redHerring+1})`;
  }
  if (state.scriptId === "bmr") {
    html += `<br><span style="font-weight:600;color:var(--purple)">ðŸ‘¹ Demon: </span>${c[gs.demonType]?.name || gs.demonType}`;
    if (gs.grandchildIdx >= 0) {
      html += `<br><span style="font-weight:600;color:var(--blue)">ðŸ‘µ Grandchild: </span>${gs.players[gs.grandchildIdx]?.name}`;
    }
  }
  html += `</div>`;

  // Night kill status
  if (isNight && !gs.isFirstNight) {
    if (gs.nightKillDone) {
      const killNames = gs.diedTonight.length > 0
        ? gs.players.filter((_,i) => gs.diedTonight.includes(i)).map(p => p.name).join(", ")
        : "blocked";
      html += `<div class="warn warn-red" style="margin-bottom:8px">ðŸ’€ Night kill: ${killNames}</div>`;
    } else {
      html += `<button class="btn-outline" style="width:100%;margin-bottom:8px;color:var(--green);border-color:rgba(39,174,96,0.3);font-size:12px" onclick="markNoDeath()">ðŸ›¡ï¸ No death tonight (kill blocked)</button>`;
    }
  }

  // Player cards
  gs.players.forEach((p, i) => {
    const ch = c[p.actual];
    const clr = TYPE_CLR[ch?.type || "townsfolk"];
    const isDrunk = p.actual === "drunk";
    const isExp = state.expandedPlayer === i;

    let badges = "";
    if (p.poisoned) badges += '<span title="Poisoned">â˜ ï¸</span>';
    if (p.protected) badges += '<span title="Protected">ðŸ›¡ï¸</span>';
    if (p.daProtected) badges += '<span title="DA Protected">âš–ï¸</span>';
    if (p.drunkSource) badges += '<span title="Drunk">ðŸº</span>';

    let expanded = "";
    if (isExp) {
      const bch = isDrunk ? c[p.believed] : null;
      const abilityText = isDrunk
        ? `<strong style="color:var(--teal)">ACTUAL:</strong> Drunk<br><strong style="color:var(--blue)">BELIEVES (${bch?.name}):</strong> ${esc(bch?.ab||"")}`
        : esc(ch?.ab || "");

      let actions = "";
      if (p.alive) {
        // Kill: night only, not first night
        if (isNight && !gs.isFirstNight && !gs.nightKillDone) {
          actions += `<button class="btn-sm" style="background:rgba(231,76,60,0.12);color:var(--red)" onclick="killPlayer(${i})">ðŸ’€ Kill</button> `;
        }
        // Execute: day only, max 1/day
        if (isDay && gs.executedToday === null) {
          actions += `<button class="btn-sm" style="background:rgba(243,156,18,0.12);color:var(--orange)" onclick="executePlayer(${i})">âš–ï¸ Execute</button> `;
        }
        // Toggles
        actions += `<button class="btn-sm" style="background:${p.poisoned?'rgba(39,174,96,0.12)':'rgba(155,89,182,0.12)'};color:${p.poisoned?'var(--green)':'var(--purple)'}" onclick="togglePoison(${i})">${p.poisoned?'ðŸ’Š Cure':'â˜ ï¸ Poison'}</button> `;
        actions += `<button class="btn-sm" style="background:${p.protected?'rgba(39,174,96,0.12)':'rgba(41,128,185,0.12)'};color:${p.protected?'var(--green)':'var(--blue)'}" onclick="toggleProtect(${i})">${p.protected?'ðŸ›¡ï¸âˆ’':'ðŸ›¡ï¸+'}</button> `;
      } else {
        actions = `<button class="btn-sm" style="background:rgba(39,174,96,0.12);color:var(--green)" onclick="revivePlayer(${i})">âœ¨ Revive</button> `;
        if (p.ghostVote && !p.ghostUsed) {
          actions += `<button class="btn-sm" style="background:rgba(155,89,182,0.12);color:var(--purple)" onclick="useGhostVote(${i})">ðŸ‘» Use Vote</button> `;
        }
      }

      expanded = `<div class="player-expand">
        <div style="font-size:11px;color:var(--text2);margin-bottom:10px;padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:6px;line-height:1.4">${abilityText}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${actions}</div>
        <textarea class="input" style="font-size:11px;min-height:36px;resize:vertical" placeholder="Notes..."
          oninput="state.gs.players[${i}].notes=this.value">${esc(p.notes)}</textarea>
      </div>`;
    }

    html += `<div class="player-row" style="border-color:${p.alive ? clr.bdr+'44' : '#222'};background:${p.alive ? clr.bg : 'rgba(20,20,20,0.5)'};opacity:${p.alive?1:0.55}">
      <div class="player-main" onclick="state.expandedPlayer=${isExp?-1:i};render()">
        <span class="seat-num" style="background:${p.alive?clr.bdr:'#444'}">${i+1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;color:${p.alive?'var(--text)':'#666'};${p.alive?'':'text-decoration:line-through'}">
            ${esc(p.name)}${!p.alive&&p.ghostVote&&!p.ghostUsed?' ðŸ‘»':''}${p.ghostUsed?' ðŸ’€':''}
          </div>
          <div style="font-size:11px;color:${clr.txt};margin-top:1px">
            ${isDrunk?`ðŸº DRUNK (thinks: ${c[p.believed]?.name||p.believed})`:(ch?.name||p.actual)}
            <span style="color:var(--text3);margin-left:6px">${TEMOJI[ch?.type||"townsfolk"]} ${ch?.type||""}</span>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">${badges}</div>
        <span style="color:var(--text3);font-size:14px">${isExp?"â–²":"â–¼"}</span>
      </div>
      ${expanded}
    </div>`;
  });

  html += `</div>`;
  return html;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PLAYER ACTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NIGHT WALKER ACTION FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  gs.log.push(`Night ${gs.dayNum}: Ravenkeeper chose ${p.name} â€” shown ${c[p.actual]?.name}.`);
  autoSave();
}

// BMR: Sailor picks who to make drunk
function nightAction_sailorDrunk(i) {
  pushUndo();
  const gs = state.gs;
  // Clear previous Sailor drunk
  gs.players.forEach(p => { if (p.drunkSource === "Sailor") p.drunkSource = null; });
  gs.players[i].drunkSource = "Sailor";
  gs.log.push(`Night ${gs.dayNum}: Sailor chose ${gs.players[i].name} â€” drunk until dusk.`);
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
    gs.log.push(`Night ${gs.dayNum}: Courtier chose ${S().C[charId]?.name} â€” ${target.name} drunk for 3 nights.`);
  } else {
    gs.courtierUsed = true;
    gs.courtierTarget = charId;
    gs.courtierTimer = 3;
    gs.log.push(`Night ${gs.dayNum}: Courtier chose ${S().C[charId]?.name} (not in play â€” wasted).`);
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
        // Both picked â€” now need to choose which is drunk
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

// BMR: Pukka â€” kill previous victim + poison new target
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

// BMR: Po â€” charge or attack
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
  gs.log.push(`Night ${gs.dayNum}: Gambler (${p.name}) guessed WRONG â€” dies!`);
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

  // TB: Imp self-kill â†’ starpass
  if (state.scriptId === "tb" && p.actual === "imp") {
    p.alive = false; p.ghostVote = true;
    gs.diedTonight.push(i);
    gs.nightKillDone = true;
    gs.log.push(`Night ${gs.dayNum}: ${p.name} (Imp) self-killed â€” STARPASS!`);
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
      gs.log.push(`Night ${gs.dayNum}: ${p.name} (Fool) â€” first death blocked!`);
      autoSave(); render();
      return;
    }
    // Sailor: can't die (unless drunk)
    if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) {
      gs.nightKillDone = true;
      gs.log.push(`Night ${gs.dayNum}: ${p.name} (Sailor) â€” can't die.`);
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

  // TB: Saint â†’ evil wins
  if (p.actual === "saint") {
    p.alive = false; p.ghostVote = true;
    gs.executedToday = i;
    gs.log.push(`Day ${gs.dayNum}: ${p.name} executed â€” SAINT!`);
    state.winMsg = {team:"evil", reason:"The Saint was executed! Evil wins."};
    autoSave(); render();
    return;
  }

  // BMR: Fool first life
  if (state.scriptId === "bmr" && p.actual === "fool" && !p.foolLifeUsed) {
    p.foolLifeUsed = true;
    gs.executedToday = i;
    gs.log.push(`Day ${gs.dayNum}: ${p.name} (Fool) executed â€” first death blocked!`);
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
        gs.log.push(`â†’ ${sw.name} (Scarlet Woman) becomes the Imp! (${aliveCount} alive â‰¥ 5)`);
        autoSave(); render();
        return;
      }
    }

    // BMR: Mastermind check
    if (state.scriptId === "bmr") {
      const mm = gs.players.find(pp => pp.actual === "mastermind" && pp.alive);
      if (mm) {
        gs.mastermindDay = true;
        gs.log.push(`â†’ Mastermind (${mm.name}) is alive! Play continues â€” next execution, that player's team loses.`);
        autoSave(); render();
        return;
      }
    }

    state.winMsg = {team:"good", reason:`The Demon (${p.name}) has been executed!`};
    autoSave(); render();
    return;
  }

  // BMR: Minion executed â†’ Minstrel trigger
  if (state.scriptId === "bmr" && c[p.actual]?.type === "minion") {
    const minstrel = gs.players.find(pp => pp.actual === "minstrel" && pp.alive);
    if (minstrel) {
      gs.minstrelAllDrunk = true;
      gs.log.push(`â†’ Minion executed! Minstrel (${minstrel.name}): everyone is drunk until dusk tomorrow.`);
    }
  }

  // BMR: Zombuul first death
  if (state.scriptId === "bmr" && p.actual === "zombuul" && !p.zombuulUndead) {
    p.zombuulUndead = true;
    gs.log.push(`â†’ ${p.name} (Zombuul) appears dead but is actually still alive (undead)!`);
    // Note: alive=false but zombuulUndead=true means demon still "in play"
  }

  // Mastermind day: whoever was executed, their team loses
  if (state.scriptId === "bmr" && gs.mastermindDay) {
    const team = c[p.actual]?.team;
    if (team === "good") {
      state.winMsg = {team:"evil", reason:`Mastermind's day: ${p.name} (good) was executed â€” evil wins!`};
    } else {
      state.winMsg = {team:"good", reason:`Mastermind's day: ${p.name} (evil) was executed â€” good wins!`};
    }
  }

  autoSave(); render();
  checkWin();
}

function togglePoison(i) { state.gs.players[i].poisoned = !state.gs.players[i].poisoned; autoSave(); render(); }
function toggleProtect(i) { state.gs.players[i].protected = !state.gs.players[i].protected; autoSave(); render(); }
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
  gs.log.push(`â†’ ${minion.name} (${S().C[minion.actual]?.name}) is now the Imp!`);
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// IMP STARPASS OVERLAY (added to renderOverlays)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      btns = `<div style="color:var(--text3);padding:12px">No alive Minions â€” no starpass.</div>
        <button class="btn btn-primary" style="padding:10px;font-size:13px" onclick="state.impStarpassPicker=false;render()">OK</button>`;
    }
    html += `<div class="overlay" style="z-index:230">
      <div class="overlay-box" style="border:2px solid var(--red)">
        <div style="font-size:36px;margin-bottom:8px">ðŸ‘¹</div>
        <div style="font-size:16px;font-weight:700;color:var(--red);margin-bottom:4px">Imp Starpass!</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Imp killed themselves. Choose which Minion becomes Imp.</div>
        ${btns}
      </div>
    </div>`;
  }

  return html;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DAY PHASE TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderDayPhase() {
  const gs = state.gs;
  const alive = gs.players.filter(p => p.alive).length;
  const majority = Math.ceil(alive / 2);

  let html = `<div style="padding:16px">
    <h3 style="font-size:16px;color:var(--orange);margin-bottom:12px">â˜€ï¸ Day ${gs.dayNum}</h3>
    <div class="card" style="font-size:13px;margin-bottom:12px">
      <div>ðŸ‘¤ <strong>${alive}</strong> alive â€” need <strong style="color:var(--orange)">${majority}</strong> votes to execute</div>
      ${gs.executedToday !== null ? `<div style="margin-top:4px;color:var(--red)">âš–ï¸ Executed today: ${gs.players[gs.executedToday]?.name}</div>` : '<div style="margin-top:4px;color:var(--text3)">No execution yet</div>'}
    </div>`;

  // BMR warnings
  if (state.scriptId === "bmr") {
    if (gs.mastermindDay) {
      html += `<div class="warn warn-red" style="margin-bottom:8px">ðŸŽ­ MASTERMIND DAY: If any player is executed, their team loses!</div>`;
    }
    if (gs.minstrelAllDrunk) {
      html += `<div class="warn warn-orange" style="margin-bottom:8px">ðŸŽµ MINSTREL: Everyone is drunk until dusk!</div>`;
    }
  }

  // Timer
  html += renderTimer();

  // Slayer ability (TB â€” once per game, day only)
  if (state.scriptId === "tb") {
    const slayer = gs.players.find(p => p.alive && (p.actual === "slayer" || (p.actual === "drunk" && p.believed === "slayer")));
    if (slayer && !slayer.abilityUsed) {
      html += `<div class="card" style="border-color:rgba(231,76,60,0.3);margin-top:12px">
        <div style="font-weight:600;font-size:13px;color:var(--red);margin-bottom:8px">âš”ï¸ Slayer â€” ${esc(slayer.name)}</div>
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
    <button class="btn-outline" style="flex:1;color:var(--blue);border-color:rgba(93,173,226,0.3);font-size:12px" onclick="declareWin('good')">ðŸ˜‡ Good Wins</button>
    <button class="btn-outline" style="flex:1;color:var(--red);border-color:rgba(231,76,60,0.3);font-size:12px" onclick="declareWin('evil')">ðŸ˜ˆ Evil Wins</button>
  </div>`;

  // Gossip tracker (BMR)
  if (state.scriptId === "bmr" && gs.players.some(p => p.alive && p.actual === "gossip")) {
    html += `<div class="card" style="border-color:rgba(243,156,18,0.3);margin-top:12px">
      <div style="font-weight:600;font-size:13px;color:var(--orange);margin-bottom:8px">ðŸ’¬ Gossip Tracker</div>
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
  state.gs.log.push(`Gossip: "${state.gs.gossipStatements[idx].text}" â€” ${isTrue ? "TRUE (someone dies tonight!)" : "FALSE"}`);
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
    gs.log.push(`Day ${gs.dayNum}: ${slayer.name} (Slayer) shot ${target.name} â€” DEMON DIES!`);
    state.winMsg = {team:"good", reason:`${slayer.name} slayed the Demon (${target.name})!`};
  } else {
    gs.log.push(`Day ${gs.dayNum}: ${slayer.name} (Slayer) shot ${target.name} â€” nothing happens.`);
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
    state.winMsg = {team:"good", reason:`Mayor (${mayor.name}) is alive with 3 players and no execution â€” Good wins!`};
    render();
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TIMER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    controls = `<button class="timer-btn" style="border-color:var(--green);color:var(--green)" onclick="startTimer()">â–¶ Start</button>`;
  } else if (t.running) {
    controls = `<button class="timer-btn" style="border-color:var(--orange);color:var(--orange)" onclick="pauseTimer()">â¸ Pause</button>`;
  } else {
    controls = `<button class="timer-btn" style="border-color:var(--green);color:var(--green)" onclick="startTimer()">â–¶ Resume</button>`;
  }
  controls += `<button class="timer-btn" onclick="timerReset()">â†»</button>`;
  if (done || t.alarm) {
    controls += `<button class="timer-btn" style="border-color:${TIMER_PHASE_COLORS[Math.min(t.phase+1,2)]};color:${TIMER_PHASE_COLORS[Math.min(t.phase+1,2)]}" onclick="timerAdvance()">${t.phase<2?'Next â–¶':'Done'}</button>`;
  }
  controls += `<button class="timer-btn" onclick="state.timer.showSettings=!state.timer.showSettings;render()">âš™</button>`;

  let settings = "";
  if (t.showSettings) {
    settings = `<div class="timer-settings">`;
    const deltas = [30, 30, 5]; // seconds per adjustment per phase
    TIMER_PHASES.forEach((name, i) => {
      settings += `<div class="timer-setting-row">
        <span style="color:${TIMER_PHASE_COLORS[i]}">${name}</span>
        <div class="timer-adj">
          <button class="timer-adj-btn" onclick="timerAdjust(${i},-${deltas[i]})">âˆ’</button>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NIGHT WALKER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Show card helpers â”€â”€
function showNumberCard(num) {
  state.showCard = {
    emoji: ["0ï¸âƒ£","1ï¸âƒ£","2ï¸âƒ£","3ï¸âƒ£","4ï¸âƒ£","5ï¸âƒ£"][num] || "ðŸ”¢",
    title: String(num), fontSize: 72,
    bg: "#0d0d1a", color: "#fff", borderColor: "#4a4a8a",
  }; render();
}
function showYesNo(yes) {
  state.showCard = {
    emoji: yes ? "âœ…" : "âŒ", title: yes ? "YES" : "NO",
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
    emoji: ch ? TEMOJI[ch.type] : "ðŸ‘¹", title: roleName,
    subtitle: subtitle || "YOU ARE", text: ch ? ch.ab : "",
    bg: `linear-gradient(135deg,#0d0d1a,${clr.bg})`,
    color: clr.txt, borderColor: clr.bdr,
  }; render();
}

// â”€â”€ Auto-calcs (TB) â”€â”€
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

// â”€â”€ Build night steps â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TB NIGHT STEPS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function buildTBNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs) {
  const order = isFirst ? TB_FIRST_NIGHT : TB_OTHER_NIGHT;

  if (isFirst && gs.players.length >= 7) {
    const minions = gs.players.filter(p => c[p.actual]?.type === "minion");
    const demon = gs.players.find(p => c[p.actual]?.type === "demon");
    steps.push({
      title: "ðŸ¤ Minion Info", type: "info",
      instr: `Wake ALL Minions together. Show "This is the Demon" â€” point to <strong>${demon?.name||"?"}</strong>.`,
      who: minions.map(m => `${m.name} (${c[m.actual]?.name})`).join(", "),
    });
    steps.push({
      title: "ðŸ˜ˆ Demon Info", type: "evil",
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
        warn: isDrunk ? "âš ï¸ DRUNK â€” give FALSE info!" : (p.poisoned ? "âš ï¸ POISONED â€” give FALSE info!" : null),
      };

      // â”€â”€â”€ POISONER â”€â”€â”€
      if (entry.id === "poisoner") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_poison";
        step.actionLabel = "â˜ ï¸ Poison";
        step.actionDone = gs.players.some(pp => pp.poisonSource === "poisoner");
        if (step.actionDone) {
          const victim = gs.players.find(pp => pp.poisonSource === "poisoner");
          const vi = gs.players.indexOf(victim);
          step.actionStatus = `â˜ ï¸ Poisoning: <strong>${victim.name}</strong> (Seat ${vi+1})`;
        }
      }

      // â”€â”€â”€ MONK â”€â”€â”€
      if (entry.id === "monk") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_monkProtect";
        step.actionLabel = "ðŸ›¡ï¸ Protect";
        const prot = gs.players.find(pp => pp.protected && pp.actual !== "monk");
        if (prot) {
          step.actionDone = true;
          step.actionStatus = `ðŸ›¡ï¸ Protecting: <strong>${prot.name}</strong>`;
        }
      }

      // â”€â”€â”€ BUTLER â”€â”€â”€
      if (entry.id === "butler") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_butlerMaster";
        step.actionLabel = "ðŸ‘‘ Set Master";
        step.actionExclude = [p.i]; // Can't pick self
        const master = gs.players.find(pp => pp.master);
        if (master) {
          step.actionDone = true;
          step.actionStatus = `ðŸ‘‘ Master: <strong>${master.name}</strong>`;
        }
      }

      // â”€â”€â”€ SPY â”€â”€â”€
      if (entry.id === "spy") { step.showType = "grimoire"; }

      // â”€â”€â”€ CHEF â”€â”€â”€
      if (entry.id === "chef") {
        step.showType = "number"; step.maxNum = 3;
        const v = calcChef();
        step.stHint = `ðŸ§® TRUE: <strong>${v}</strong> evil pair${v!==1?"s":""}`;
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Give WRONG number!`;
      }

      // â”€â”€â”€ EMPATH â”€â”€â”€
      if (entry.id === "empath") {
        step.showType = "number"; step.maxNum = 2;
        const v = calcEmpath(p.i);
        step.stHint = `ðŸ§® TRUE: <strong>${v}</strong> evil neighbor${v!==1?"s":""}`;
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Give WRONG number!`;
      }

      // â”€â”€â”€ FORTUNE TELLER â”€â”€â”€
      if (entry.id === "fortuneteller") {
        step.showType = "yesno";
        const rh = gs.redHerring >= 0 ? gs.players[gs.redHerring] : null;
        step.stHint = rh ? `ðŸŽ¯ Red Herring: <strong>${rh.name}</strong> (Seat ${gs.redHerring+1})` : `ðŸŽ¯ No Red Herring`;
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Answer can be anything!`;
      }

      // â”€â”€â”€ WASHERWOMAN â”€â”€â”€
      if (entry.id === "washerwoman") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "townsfolk").map(ch2 => ch2.id);
        const info = calcWasherwomanInfo();
        step.stHint = `ðŸ“‹ TRUE:<br>` + info.map(x => `â€¢ <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Show anything (all can be wrong)!`;
      }

      // â”€â”€â”€ LIBRARIAN â”€â”€â”€
      if (entry.id === "librarian") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "outsider").map(ch2 => ch2.id);
        const info = calcLibrarianInfo();
        step.stHint = info.length === 0 ? `ðŸ“‹ No Outsiders â€” show 0` :
          `ðŸ“‹ TRUE:<br>` + info.map(x => `â€¢ <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Show anything!`;
      }

      // â”€â”€â”€ INVESTIGATOR â”€â”€â”€
      if (entry.id === "investigator") {
        step.showType = "character_pick";
        step.pickFrom = Object.values(c).filter(ch2 => ch2.type === "minion").map(ch2 => ch2.id);
        const info = calcInvestigatorInfo();
        step.stHint = `ðŸ“‹ TRUE:<br>` + info.map(x => `â€¢ <strong>${x.name}</strong> (Seat ${x.seat}) = ${x.role}`).join("<br>");
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Show anything!`;
      }

      // â”€â”€â”€ UNDERTAKER â”€â”€â”€
      if (entry.id === "undertaker" && gs.executedToday !== null) {
        const ex = gs.players[gs.executedToday];
        step.extra = `Executed: <strong>${ex.name}</strong> â€” show <strong>${c[ex.actual]?.name}</strong>`;
        step.showType = "auto_character"; step.autoCharId = ex.actual;
      }

      // â”€â”€â”€ IMP â”€â”€â”€
      if (entry.id === "imp") {
        step.showType = "imp_kill";
        const soldier = gs.players.find(pp => pp.alive && pp.actual === "soldier");
        const prot = gs.players.filter(pp => pp.alive && pp.protected);
        let notes = [];
        if (soldier) notes.push(`âš”ï¸ ${soldier.name} = SOLDIER`);
        prot.forEach(pp => notes.push(`ðŸ›¡ï¸ ${pp.name} = PROTECTED`));
        if (notes.length) step.extra = notes.join("<br>");
      }

      // â”€â”€â”€ SCARLET WOMAN â”€â”€â”€
      if (!isFirst && entry.id === "scarletwoman") {
        if (gs.executedToday !== null && c[gs.players[gs.executedToday].actual]?.type === "demon") {
          const aliveCount = gs.players.filter(pp=>pp.alive).length;
          if (aliveCount >= 5 && p.alive) {
            step.showType = "you_are";
            step.warn = `Demon executed! ${aliveCount} alive â‰¥ 5. Show SW she's the Imp.`;
          } else return;
        } else return;
      }

      // â”€â”€â”€ RAVENKEEPER â”€â”€â”€
      if (!isFirst && entry.id === "ravenkeeper") {
        if (!gs.diedTonight.includes(p.i)) return;
        step.condition = "âš°ï¸ Died tonight â€” gets to use ability";
        step.showType = "ravenkeeper_pick";
      }

      steps.push(step);
    });
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BMR NIGHT STEPS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function buildBMRNightSteps(gs, c, isFirst, steps, findAlive, findDrunkAs) {
  const order = isFirst ? BMR_FIRST_NIGHT : BMR_OTHER_NIGHT;
  const alivePlayers = gs.players.map((p,i)=>({...p,i})).filter(p=>p.alive);

  order.forEach(entry => {
    const id = entry.id;

    // â”€â”€â”€ SPECIAL STEPS â”€â”€â”€
    if (id === "_minioninfo" && isFirst && gs.players.length >= 7) {
      const minions = gs.players.filter(p => c[p.actual]?.type === "minion");
      const demon = gs.players.find(p => c[p.actual]?.type === "demon");
      steps.push({
        title: "ðŸ¤ Minion Info", type: "info",
        instr: `Wake ALL Minions. Show "This is the Demon" â€” point to <strong>${demon?.name||"?"}</strong>.`,
        who: minions.map(m => `${m.name} (${c[m.actual]?.name})`).join(", "),
      });
      return;
    }
    if (id === "_demoninfo" && isFirst && gs.players.length >= 7) {
      const demon = gs.players.find(p => c[p.actual]?.type === "demon");
      steps.push({
        title: "ðŸ˜ˆ Demon Info", type: "evil",
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
        title: "ðŸŒ™ Lunatic (Info)", type: "good",
        instr: `Show Lunatic fake Minion info + 3 bluffs (as if they are the Demon). Then wake real Demon and show them who the Lunatic is.`,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "âš ï¸ The Lunatic thinks they are the Demon! Give fake info.",
      });
      return;
    }
    if (id === "lunatic_action" && isFirst) {
      const lunatic = gs.players.find(p => p.actual === "lunatic");
      if (!lunatic) return;
      steps.push({
        title: "ðŸŒ™ Lunatic (Action)", type: "good",
        instr: `Lunatic does fake demon attacks. Then show real Demon who the Lunatic chose.`,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "âš ï¸ Nobody actually dies from the Lunatic's choice.",
      });
      return;
    }
    if (id === "_minstrel" && !isFirst) {
      const minstrel = findAlive("minstrel");
      if (minstrel.length === 0) return;
      steps.push({
        title: "ðŸŽµ Minstrel (cleanup)", type: "info",
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
          title: "ðŸ‘µ Grandmother (passive)", type: "info",
          instr: `Grandchild (${gc.name}) died tonight! If killed by the Demon, Grandmother (${gm.name}) also dies.`,
          who: `${gm.name}`,
          warn: "âš ï¸ Kill Grandmother if the Demon killed the grandchild.",
        });
      }
      return;
    }
    if (id === "_goon") {
      const goon = gs.players.find(p => p.actual === "goon");
      if (!goon || !goon.alive) return;
      steps.push({
        title: "ðŸ”„ Goon (passive)", type: "info",
        instr: `If anyone chose the Goon tonight, the FIRST chooser is drunk until dusk and the Goon becomes their alignment.`,
        who: `${goon.name} (Seat ${goon.seat})`,
      });
      return;
    }

    // â”€â”€â”€ DEMON STEP â”€â”€â”€
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
          blockNote = `<br>âš ï¸ Pukka's previous victim (${prev?.name}) still dies! Exorcist only blocks the NEW poison.`;
        }
        // Po: loses charge if exorcised
        if (demonType === "po" && gs.poCharged) {
          blockNote = `<br>âš ï¸ Po was charged â€” charge is LOST.`;
        }
        const blockStep = {
          title: `ðŸ‘¹ ${c[demonType]?.name} (BLOCKED)`, type: "evil",
          instr: `Exorcist targeted the Demon! The Demon does NOT wake tonight.${blockNote}`,
          who: `${demon.name} (${c[demonType]?.name})`,
          warn: "âœï¸ Exorcist blocks the Demon's active ability.",
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
        title: `ðŸ‘¹ ${c[demonType]?.name}`, type: "evil",
        instr: c[demonType]?.on_r || c[demonType]?.ab,
        who: `${demon.name} (Seat ${demon.seat})`,
      };

      // Demon-specific showTypes
      if (demonType === "zombuul") {
        if (gs.executedToday !== null || gs.diedTonight.length > 0) {
          step.warn = "Someone died today â€” Zombuul does NOT kill tonight.";
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

    // â”€â”€â”€ REGULAR STEPS â”€â”€â”€
    const ch = c[id]; if (!ch) return;

    // Lunatic on other nights
    if (id === "lunatic" && !isFirst) {
      const lunatic = gs.players.find(p => p.actual === "lunatic" && p.alive);
      if (!lunatic) return;
      steps.push({
        title: `ðŸŒ™ Lunatic`, type: "good",
        instr: ch.on_r || ch.ab,
        who: `${lunatic.name} (Seat ${lunatic.seat})`,
        warn: "âš ï¸ Lunatic thinks they're the Demon. Show real Demon their choices.",
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
        warn: isDrunk ? "âš ï¸ DRUNK â€” give FALSE info!" : (p.poisoned ? "âš ï¸ POISONED â€” give FALSE info!" : null),
      };

      // â”€â”€â”€ SAILOR â”€â”€â”€
      if (id === "sailor") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_sailorDrunk";
        step.actionLabel = "ðŸº Make Drunk";
        step.actionExclude = [p.i]; // Can't pick self
        const drunkTarget = gs.players.find(pp => pp.drunkSource === "Sailor");
        if (drunkTarget) {
          step.actionDone = true;
          step.actionStatus = `ðŸº Drunk: <strong>${drunkTarget.name}</strong>`;
        }
      }

      // â”€â”€â”€ COURTIER â”€â”€â”€
      if (id === "courtier") {
        if (gs.courtierUsed) {
          step.instr = `Courtier already used their ability.`;
          if (gs.courtierTimer > 0) step.extra = `â±ï¸ Timer: ${gs.courtierTimer} nights remaining. Target: ${gs.courtierTarget ? c[gs.courtierTarget]?.name : "?"}`;
          step.warn = null;
          steps.push(step);
          return;
        }
        step.showType = "courtier_pick";
      }

      // â”€â”€â”€ INNKEEPER â”€â”€â”€
      if (id === "innkeeper" && !isFirst) {
        step.showType = "innkeeper_pick";
      }

      // â”€â”€â”€ GAMBLER â”€â”€â”€
      if (id === "gambler" && !isFirst) {
        step.showType = "gambler_pick";
        step.gamblerId = p.i;
      }

      // â”€â”€â”€ DEVIL'S ADVOCATE â”€â”€â”€
      if (id === "devilsadvocate") {
        step.showType = "action_pick";
        step.actionFn = "nightAction_daProtect";
        step.actionLabel = "âš–ï¸ DA Protect";
        // DA can't pick same player 2 nights in a row
        step.actionExclude = gs.daLastTarget >= 0 ? [gs.daLastTarget] : [];
        if (gs.daTarget >= 0) {
          step.actionDone = true;
          step.actionStatus = `âš–ï¸ DA Protecting: <strong>${gs.players[gs.daTarget].name}</strong>`;
        }
        if (gs.daLastTarget >= 0) {
          step.stHint = `Cannot choose <strong>${gs.players[gs.daLastTarget]?.name}</strong> (last night's target).`;
        }
      }

      // â”€â”€â”€ EXORCIST â”€â”€â”€
      if (id === "exorcist" && !isFirst) {
        step.showType = "action_pick";
        step.actionFn = "nightAction_exorcistPick";
        step.actionLabel = "âœï¸ Exorcise";
        if (gs.exorcistTarget >= 0) {
          step.actionDone = true;
          step.actionStatus = `âœï¸ Exorcising: <strong>${gs.players[gs.exorcistTarget].name}</strong>`;
        }
      }

      // â”€â”€â”€ CHAMBERMAID â”€â”€â”€
      if (id === "chambermaid") {
        step.showType = "number"; step.maxNum = 2;
      }

      // â”€â”€â”€ GRANDMOTHER (first night) â”€â”€â”€
      if (id === "grandmother" && isFirst && gs.grandchildIdx >= 0) {
        const gc = gs.players[gs.grandchildIdx];
        step.stHint = `ðŸ‘¶ Grandchild: <strong>${gc.name}</strong> (Seat ${gc.seat}) â€” ${c[gc.actual]?.name}`;
        step.showType = "player_pick";
        if (isDrunk || p.poisoned) step.stHint += `<br>âš ï¸ Show wrong player/character!`;
      }

      // â”€â”€â”€ GODFATHER (first night) â”€â”€â”€
      if (id === "godfather" && isFirst) {
        const outsiders = gs.outsidersInPlay || [];
        step.stHint = `ðŸŒ¿ Outsiders in play: ${outsiders.map(o => c[o]?.name||o).join(", ") || "None"}`;
      }

      // â”€â”€â”€ GODFATHER (other night â€” kills if outsider died) â”€â”€â”€
      if (id === "godfather" && !isFirst) {
        const exIdx = gs.executedToday;
        const outsiderDied = exIdx !== null && c[gs.players[exIdx]?.actual]?.type === "outsider";
        const nightOutsiderDied = gs.diedTonight.some(idx => c[gs.players[idx]?.actual]?.type === "outsider");
        if (!outsiderDied && !nightOutsiderDied) return;
        step.showType = "demon_kill";
      }

      // â”€â”€â”€ ASSASSIN â”€â”€â”€
      if (id === "assassin" && !isFirst) {
        if (gs.assassinUsed) return;
        step.showType = "assassin_pick";
      }

      // â”€â”€â”€ PROFESSOR â”€â”€â”€
      if (id === "professor" && !isFirst) {
        if (gs.professorUsed) return;
        step.showType = "professor_pick";
      }

      // â”€â”€â”€ GOSSIP â”€â”€â”€
      if (id === "gossip" && !isFirst) {
        const trueGossips = (gs.gossipStatements||[]).filter(g => g.resolved && g.isTrue);
        if (trueGossips.length === 0) {
          step.instr = "No true gossip statements today â€” no kill.";
        } else {
          step.showType = "demon_kill";
          step.extra = `TRUE gossip! "${trueGossips[0].text}" â€” choose someone to die.`;
        }
      }

      // â”€â”€â”€ TINKER â”€â”€â”€
      if (id === "tinker") {
        step.instr = "You may kill the Tinker. Or not. Your choice.";
        step.showType = "demon_kill";
      }

      // â”€â”€â”€ MOONCHILD â”€â”€â”€
      if (id === "moonchild" && !isFirst) {
        const mcDied = gs.diedTonight.some(idx => gs.players[idx].actual === "moonchild");
        if (!mcDied) return;
        step.condition = "âš°ï¸ Moonchild died tonight";
        step.showType = "moonchild_pick";
      }

      steps.push(step);
    });
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER SHOW CARDS (in night walker steps)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderStepShowCards(step) {
  if (!step || !step.showType) return "";
  const gs = state.gs; const s = S(); const c = s.C;

  // Section header varies by type
  const isAction = step.showType.startsWith("action_") || ["courtier_pick","innkeeper_pick","gambler_pick",
    "assassin_pick","professor_pick","moonchild_pick","pukka_pick","po_pick","shabaloth_pick",
    "pukka_prev_only","po_lose_charge","ravenkeeper_pick"].includes(step.showType);
  const sectionLabel = isAction ? "ðŸŽ¯ Action" : "ðŸ“‹ Show to Player";

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
        if (p.poisoned) badge += ' <span style="color:var(--purple);font-size:10px">â˜ ï¸</span>';
        if (p.protected) badge += ' <span style="color:var(--blue);font-size:10px">ðŸ›¡ï¸</span>';
        if (p.daProtected) badge += ' <span style="color:var(--orange);font-size:10px">âš–ï¸</span>';
        if (p.drunkSource) badge += ' <span style="color:var(--teal);font-size:10px">ðŸº</span>';
        if (p.actual === "soldier") badge += ' <span style="color:var(--orange);font-size:10px">âš”ï¸</span>';
        if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) badge += ' <span style="color:var(--teal);font-size:10px">â›µ</span>';
      }
      const fn = onclick.replace("IDX", idx);
      h += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="${fn}">
        <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span>${badge}</span>
        <span style="color:var(--text3);font-size:12px">${opts?.icon||"â†’"}</span></button>`;
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
        <span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span> âš°ï¸</button>`;
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
      if (p.actual === "soldier") badge = ' <span style="color:var(--orange);font-size:10px">âš”ï¸ SOLDIER</span>';
      if (p.protected) badge = ' <span style="color:var(--blue);font-size:10px">ðŸ›¡ï¸ PROTECTED</span>';
      if (ch2?.type === "demon") badge = ' <span style="color:var(--red);font-size:10px">ðŸ‘¹ SELF</span>';
      if (p.actual === "sailor" && !p.drunkSource && !p.poisoned) badge = ' <span style="color:var(--teal);font-size:10px">â›µ SAILOR</span>';
      const fn = onclick.replace("IDX", idx);
      h += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="${fn}">
        <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span>${badge}</span>
        <span style="color:var(--red)">ðŸ’€</span></button>`;
    });
    h += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:rgba(39,174,96,0.3);color:var(--green);font-style:italic" onclick="markNoDeath()">ðŸ›¡ï¸ No death (blocked)</button>`;
    return h;
  }

  switch (step.showType) {

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ORIGINAL SHOW TYPES (unchanged)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    case "number": {
      html += `<div class="choice-grid">`;
      for (let n = 0; n <= (step.maxNum||3); n++)
        html += `<button class="choice-btn" onclick="showNumberCard(${n})">${n}</button>`;
      html += `</div>`;
      break;
    }
    case "yesno": {
      html += `<div class="choice-grid">
        <button class="choice-btn" style="flex:1;color:#4ade80;border-color:#22c55e" onclick="showYesNo(true)">âœ… YES</button>
        <button class="choice-btn" style="flex:1;color:#ef4444;border-color:#dc2626" onclick="showYesNo(false)">âŒ NO</button>
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
      html += `<button class="char-choice-btn" style="text-align:center;border-color:var(--indigo);color:var(--indigo);font-size:14px;padding:12px" onclick="state.tab='grimoire';render()">ðŸ“– Open Grimoire (show Spy your screen)</button>`;
      break;
    }
    case "you_are": {
      html += `<button class="char-choice-btn" style="text-align:center;border-color:${TYPE_CLR.demon.bdr};color:${TYPE_CLR.demon.txt};font-size:14px;padding:12px" onclick="showThisIsCard('Imp','YOU ARE NOW THE')">
        ðŸ‘¹ Show: "You are the Imp"</button>`;
      break;
    }
    case "imp_kill":
    case "demon_kill": {
      if (gs.nightKillDone && step.showType === "imp_kill") {
        html += `<div style="padding:10px;border-radius:8px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.2);color:var(--red);font-size:13px;font-weight:600">
          ðŸ’€ Kill resolved${gs.diedTonight.length===0?" (blocked)":""}</div>`;
      } else {
        html += killPlayerBtns("killFromNightWalker(IDX)");
      }
      break;
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // NEW ACTION TYPES â€” inline state changes
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    // Generic: pick a player â†’ call action function
    case "action_pick": {
      if (step.actionDone && step.actionStatus) {
        html += `<div style="padding:10px;border-radius:8px;background:rgba(39,174,96,0.08);border:1px solid rgba(39,174,96,0.2);color:var(--green);font-size:13px;margin-bottom:6px">
          ${step.actionStatus}</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Change:</div>`;
      }
      html += alivePlayerBtns(`${step.actionFn}(IDX)`, step.actionExclude, {icon: step.actionLabel||"â†’"});
      break;
    }

    // TB: Ravenkeeper â€” pick player, show their character
    case "ravenkeeper_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Player picks someone to learn their character:</div>`;
      html += alivePlayerBtns("nightAction_ravenkeeperPick(IDX)", [], {icon:"ðŸ”"});
      break;
    }

    // BMR: Courtier â€” pick character (not player) to make drunk
    case "courtier_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose a CHARACTER to make drunk for 3 nights:</div>`;
      Object.values(c).forEach(ch2 => {
        const clr = TYPE_CLR[ch2.type];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;color:${clr.txt}" onclick="nightAction_courtierPick('${ch2.id}')">
          ${TEMOJI[ch2.type]} ${ch2.name}</button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3);font-style:italic" onclick="nightAction_courtierPick('none')">Skip (don't use ability yet)</button>`;
      break;
    }

    // BMR: Innkeeper â€” pick 2 to protect, then 1 of them to drunk
    case "innkeeper_pick": {
      const phase = state.nightStepData.innkeeperPhase;
      const picks = state.nightStepData.innkeeperPicks || [];

      if (phase === "drunk") {
        html += `<div style="font-size:12px;color:var(--green);font-weight:600;margin-bottom:6px">âœ… Protecting: ${picks.map(idx=>gs.players[idx].name).join(" & ")}</div>`;
        html += `<div style="font-size:12px;color:var(--orange);margin-bottom:6px">Now choose which one is DRUNK:</div>`;
        picks.forEach(idx => {
          const p = gs.players[idx]; const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
          html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:var(--orange);color:var(--orange)" onclick="nightAction_innkeeperDrunk(${idx})">
            ðŸº ${esc(p.name)} (${ch2?.name})</button>`;
        });
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_innkeeperReset()">â†© Reset</button>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose 2 players to protect (${picks.length}/2):</div>`;
        if (picks.length > 0) {
          html += `<div style="font-size:11px;color:var(--green);margin-bottom:4px">Selected: ${picks.map(idx=>gs.players[idx].name).join(", ")}</div>`;
        }
        html += alivePlayerBtns("nightAction_innkeeperPick(IDX)", picks, {icon:"ðŸ›¡ï¸"});
        if (picks.length > 0) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_innkeeperReset()">â†© Reset</button>`;
        }
      }
      break;
    }

    // BMR: Gambler â€” pick player, ST decides if guess was right
    case "gambler_pick": {
      const gamblerId = step.gamblerId;
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Gambler guesses a player's character. Was the guess correct?</div>`;
      html += `<div class="choice-grid" style="margin-bottom:8px">
        <button class="choice-btn" style="flex:1;color:#4ade80;border-color:#22c55e" onclick="state.gs.log.push('Night '+state.gs.dayNum+': Gambler guessed correctly.');autoSave();render()">âœ… Correct</button>
        <button class="choice-btn" style="flex:1;color:#ef4444;border-color:#dc2626" onclick="nightAction_gamblerDies(${gamblerId})">âŒ Wrong â€” dies!</button>
      </div>`;
      break;
    }

    // BMR: Assassin â€” kill (bypasses ALL protection, once per game)
    case "assassin_pick": {
      html += `<div style="padding:8px;border-radius:6px;background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.2);color:var(--red);font-size:12px;font-weight:600;margin-bottom:8px">
        ðŸ’€ ONE-TIME ABILITY â€” Bypasses ALL protection!</div>`;
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose target (or skip):</div>`;
      gs.players.forEach((p, idx) => {
        if (!p.alive) return;
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="nightAction_assassinKill(${idx})">
          <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></span>
          <span style="color:var(--red)">ðŸ’€</span></button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3);font-style:italic" onclick="nightAction_assassinSkip()">ðŸ™… Don't use ability tonight</button>`;
      break;
    }

    // BMR: Professor â€” revive a dead player (once per game)
    case "professor_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Choose dead Townsfolk to revive (once per game):</div>`;
      html += deadPlayerBtns("nightAction_professorRevive(IDX)");
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--red);color:var(--red);font-style:italic" onclick="nightAction_professorFail()">âŒ Professor fails (wrong guess or poisoned)</button>`;
      break;
    }

    // BMR: Moonchild â€” if died tonight, choose good player to revenge kill
    case "moonchild_pick": {
      html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Moonchild died! If they chose a good player today, that player dies:</div>`;
      gs.players.forEach((p, idx) => {
        if (!p.alive) return;
        const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
        const isGood = ch2?.team === "good";
        html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:${clr.bdr}44;display:flex;justify-content:space-between;align-items:center" onclick="nightAction_moonchildKill(${idx})">
          <span><span style="color:var(--text3)">${idx+1}.</span> ${esc(p.name)} <span style="color:${clr.txt};font-size:11px">(${ch2?.name})</span></span>
          <span style="color:${isGood?'var(--green)':'var(--red)'}; font-size:10px">${isGood?'GOOD âœ“':'EVIL'}</span></button>`;
      });
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="">ðŸ™… No revenge (chose evil or nobody)</button>`;
      break;
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // DEMON VARIANTS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    // BMR: Pukka â€” kill prev victim + poison new
    case "pukka_pick": {
      const prevIdx = gs.pukkaVictimIdx;
      const prev = prevIdx >= 0 ? gs.players[prevIdx] : null;

      if (prev && prev.alive) {
        html += `<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:6px">Step 1: Previous victim ${prev.name} dies now:</div>`;
        html += `<div class="choice-grid" style="margin-bottom:10px">
          <button class="choice-btn" style="flex:1;color:var(--red);border-color:var(--darkred)" onclick="nightAction_pukkaKillPrev()">ðŸ’€ Kill ${esc(prev.name)}</button>
          <button class="choice-btn" style="flex:1;color:var(--green);border-color:#22c55e" onclick="nightAction_pukkaSkipPrev()">ðŸ›¡ï¸ Survives</button>
        </div>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text3);margin-bottom:6px">${prev ? "Previous victim already dead." : "No previous victim."}</div>`;
      }
      html += `<div style="font-size:12px;color:var(--purple);font-weight:600;margin-bottom:6px">Step 2: Pukka poisons a new player:</div>`;
      html += alivePlayerBtns("nightAction_pukkaPoison(IDX)", [], {icon:"â˜ ï¸"});
      break;
    }

    // Pukka prev only (when exorcised â€” still resolve prev victim)
    case "pukka_prev_only": {
      const prevIdx = gs.pukkaVictimIdx;
      const prev = prevIdx >= 0 ? gs.players[prevIdx] : null;
      if (prev && prev.alive) {
        html += `<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:6px">Previous victim ${prev.name} still dies (Exorcist doesn't prevent this):</div>`;
        html += `<div class="choice-grid">
          <button class="choice-btn" style="flex:1;color:var(--red);border-color:var(--darkred)" onclick="nightAction_pukkaKillPrev()">ðŸ’€ Kill ${esc(prev.name)}</button>
          <button class="choice-btn" style="flex:1;color:var(--green);border-color:#22c55e" onclick="nightAction_pukkaSkipPrev()">ðŸ›¡ï¸ Survives</button>
        </div>`;
      } else {
        html += `<div style="font-size:12px;color:var(--text3)">No previous victim to resolve.</div>`;
      }
      break;
    }

    // BMR: Po â€” charge up or attack (1 or 3)
    case "po_pick": {
      const charged = gs.poCharged;
      const picks = state.nightStepData.poKills || [];

      if (charged) {
        html += `<div style="padding:8px;border-radius:6px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3);color:var(--red);font-size:13px;font-weight:700;margin-bottom:8px">
          âš¡ CHARGED â€” Choose 3 players to kill!</div>`;
        if (picks.length > 0) {
          html += `<div style="font-size:11px;color:var(--orange);margin-bottom:4px">Selected (${picks.length}/3): ${picks.map(idx=>gs.players[idx].name).join(", ")}</div>`;
        }
        html += killPlayerBtns("nightAction_poKill(IDX)", picks);
        if (picks.length > 0) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_poReset()">â†© Reset</button>`;
        }
        if (picks.length > 0 && picks.length < 3) {
          html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--orange);color:var(--orange)" onclick="nightAction_poApply()">âš¡ Apply ${picks.length} kill${picks.length>1?"s":""} (skip remaining)</button>`;
        }
      } else {
        html += `<div class="choice-grid" style="margin-bottom:10px">
          <button class="choice-btn" style="flex:1;color:var(--orange);border-color:var(--orange);font-weight:700" onclick="nightAction_poCharge()">âš¡ CHARGE UP<br><span style="font-size:10px;font-weight:400">(3 kills next night)</span></button>
        </div>`;
        html += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">â€” OR kill 1 player:</div>`;
        html += killPlayerBtns("killFromNightWalker(IDX)");
      }
      break;
    }

    // Po loses charge when exorcised
    case "po_lose_charge": {
      html += `<button class="char-choice-btn" style="text-align:center;border-color:var(--red);color:var(--red);padding:12px" onclick="state.gs.poCharged=false;state.gs.nightKillDone=true;state.gs.log.push('Night '+state.gs.dayNum+': Po charge lost (Exorcist).');autoSave();render()">
        âš¡ Clear Po's Charge</button>`;
      break;
    }

    // BMR: Shabaloth â€” kill 2 + optional regurgitate
    case "shabaloth_pick": {
      const picks = state.nightStepData.shabKills || [];

      // Regurgitate option (last night's kills)
      const lastNightDead = gs.players.map((p,i)=>({...p,i})).filter(p => !p.alive);
      if (lastNightDead.length > 0) {
        html += `<div style="font-size:12px;color:var(--green);margin-bottom:6px">Optional: Regurgitate (revive) a previous victim first:</div>`;
        lastNightDead.forEach(p => {
          const ch2 = c[p.actual]; const clr = TYPE_CLR[ch2?.type||"townsfolk"];
          html += `<button class="char-choice-btn" style="margin-bottom:3px;border-color:rgba(39,174,96,0.3);color:var(--green)" onclick="nightAction_shabalothRegurgitate(${p.i})">
            âœ¨ ${esc(p.name)} (${ch2?.name})</button>`;
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
          <span style="color:var(--red)">ðŸ’€</span></button>`;
      });
      if (picks.length > 0) {
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--text3);color:var(--text3)" onclick="nightAction_shabalothReset()">â†© Reset</button>`;
      }
      if (picks.length === 1) {
        html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:var(--orange);color:var(--orange)" onclick="nightAction_shabalothApply()">ðŸ’€ Apply 1 kill only</button>`;
      }
      html += `<button class="char-choice-btn" style="margin-top:4px;text-align:center;border-color:rgba(39,174,96,0.3);color:var(--green);font-style:italic" onclick="markNoDeath()">ðŸ›¡ï¸ No death (blocked)</button>`;
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER NIGHT WALKER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
        <span style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);display:block;margin-bottom:4px">ðŸ”’ ST EYES ONLY</span>
        ${step.stHint}
      </div>`:""}
      ${step.condition?`<div style="font-size:11px;color:var(--text2);margin-top:6px;font-style:italic">â„¹ï¸ ${step.condition}</div>`:""}
      ${renderStepShowCards(step)}
    </div>`;
  } else {
    stepCard = `<div style="text-align:center;padding:40px 20px;color:var(--text3)">
      <div style="font-size:40px;margin-bottom:12px">ðŸŒ…</div>
      <div style="font-size:14px">Night phase complete. Advance to day when ready.</div>
    </div>`;
  }

  // Navigation
  let nav = `<div style="display:flex;gap:8px;margin-bottom:20px">
    <button class="btn" style="flex:1;padding:10px;background:${cur===0?'#1a1a1a':'#222'};color:${cur===0?'#444':'#aaa'};border:1px solid #333;font-size:13px" ${cur===0?"disabled":""} onclick="state.nightStep=${Math.max(0,cur-1)};render()">â† Prev</button>
    ${cur < steps.length - 1
      ? `<button class="btn btn-night" style="flex:1;padding:10px;font-size:13px" onclick="state.nightStep=${cur+1};render()">Next â†’</button>`
      : `<button class="btn btn-day" style="flex:1;padding:10px;font-size:13px" onclick="confirmAction('startDay','Advance to Day?')">â˜€ï¸ Dawn</button>`
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
      <span>${i<cur?"âœ“ ":""}${s.title}</span>
      <span style="color:var(--text3)">${(s.who||"").split("(")[0].trim()}</span>
    </div>`;
  });

  return `<div style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;color:var(--indigo)">ðŸŒ™ ${gs.isFirstNight?"First Night":`Night ${gs.dayNum}`}</h3>
      <span style="font-size:12px;color:var(--text3)">Step ${cur+1}/${steps.length}</span>
    </div>
    ${progress}${stepCard}${nav}${stepList}
  </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROLES REFERENCE TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderRolesRef() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = `<div style="padding:16px">
    <h3 style="font-size:16px;color:${s.color};margin-bottom:8px">ðŸŽ­ Role Cards</h3>
    <div class="card" style="border-color:rgba(41,128,185,0.2);background:rgba(41,128,185,0.08);font-size:12px;color:var(--blue);margin-bottom:12px">
      ðŸ’¡ Tap a player to show their role card.
    </div>`;

  gs.players.forEach((p, i) => {
    const ch = c[p.actual];
    const showCh = (p.actual === "drunk" && p.believed) ? c[p.believed] : ch;
    const clr = TYPE_CLR[showCh?.type || ch?.type || "townsfolk"];
    html += `<div onclick="state.showingRoleFor=${i};render()" style="padding:10px 12px;margin-bottom:5px;border-radius:8px;border:1px solid ${clr.bdr}44;background:${clr.bg};cursor:pointer;display:flex;align-items:center;gap:8px">
      <span class="seat-num" style="background:${clr.bdr}">${i+1}</span>
      <span style="flex:1;font-weight:600;font-size:13px">${esc(p.name)}</span>
      <span style="font-size:16px">${TEMOJI[showCh?.type||"townsfolk"]}</span>
      <span style="color:var(--text3);font-size:12px">ðŸ‘ï¸</span>
    </div>`;
  });

  // Full character encyclopedia
  html += `<h4 style="font-size:14px;color:var(--text2);margin:20px 0 10px">All ${s.name} Characters</h4>`;
  ["townsfolk","outsider","minion","demon"].forEach(type => {
    const clr = TYPE_CLR[type];
    html += `<div style="font-weight:600;font-size:12px;color:${clr.txt};margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">${TEMOJI[type]} ${type}s</div>`;
    Object.values(c).filter(ch => ch.type === type).forEach(ch => {
      html += `<div style="padding:6px 10px;margin-bottom:3px;border-radius:6px;background:rgba(255,255,255,0.02);font-size:11px;line-height:1.4">
        <strong style="color:${clr.txt}">${ch.name}:</strong> <span style="color:var(--text2)">${esc(ch.ab)}</span>
      </div>`;
    });
    html += '<div style="height:8px"></div>';
  });
  html += '</div>';
  return html;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOG TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderLog() {
  const gs = state.gs;
  const s = S(); const c = s.C;

  let html = '<div style="padding:16px">';
  html += `<h3 style="font-size:16px;color:${s.color};margin-bottom:12px">ðŸ“ Game Log</h3>`;

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
    <div>Phase: ${gs.phase==="night"?"ðŸŒ™ Night":"â˜€ï¸ Day"} ${gs.dayNum}</div>
    <div>Alive: ${alive.length} / ${gs.players.length}</div>
    <div>Votes needed: <strong style="color:var(--orange)">${Math.ceil(alive.length/2)}</strong></div>
    <hr style="border-color:#222;margin:8px 0">
    <div>Evil alive: ${evilAlive.map(p=>`<span style="color:var(--red)">${esc(p.name)} (${c[p.actual]?.name})</span>`).join(", ")||"None"}</div>
    <div>Demon: ${demon?`${esc(demon.name)} ${demon.alive?"âœ…":"âŒ"}`:"-"}</div>
    <div>Poisoned: ${gs.players.filter(p=>p.poisoned).map(p=>`<span style="color:var(--purple)">${esc(p.name)}</span>`).join(", ")||"None"}</div>`;

  if (state.scriptId === "tb") {
    const sw = gs.players.find(p => p.actual === "scarletwoman");
    const mayor = alive.find(p => p.actual === "mayor");
    if (sw) html += `<div>Scarlet Woman: ${esc(sw.name)} ${sw.alive?"âœ…":"âŒ"} â€” ${alive.length>=5?"can become Demon":"needs 5+ alive"}</div>`;
    if (mayor) html += `<div>âš ï¸ Mayor alive â€” 3 alive + no execution = GOOD WINS</div>`;
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Note: Initialization is handled in the HTML files
