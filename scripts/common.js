// ══════════════════════════════════════════════════════════════════════════
// BOTC STORYTELLER ENGINE — REDESIGN
// ══════════════════════════════════════════════════════════════════════════

// Shared visual configuration
const TYPE_CLR = {
  townsfolk: { bg: "rgba(45, 90, 39, 0.08)", bdr: "#2D5A27", txt: "#a3e498" },
  outsider:  { bg: "rgba(41, 128, 185, 0.08)", bdr: "#2980b9", txt: "#5dade2" },
  minion:    { bg: "rgba(142, 68, 173, 0.08)", bdr: "#8e44ad", txt: "#bb8fce" },
  demon:     { bg: "rgba(149, 27, 30, 0.08)", bdr: "#951B1E", txt: "#e74c3c" },
  traveller: { bg: "rgba(243, 156, 18, 0.08)", bdr: "#f39c12", txt: "#f5b041" },
  village:   { bg: "rgba(45, 90, 39, 0.08)", bdr: "#2D5A27", txt: "#a3e498" },
  werewolf:  { bg: "rgba(149, 27, 30, 0.08)", bdr: "#951B1E", txt: "#e74c3c" },
  vampire:   { bg: "rgba(94, 68, 92, 0.16)", bdr: "#9b59b6", txt: "#d7b5e8" },
  cult:      { bg: "rgba(243, 156, 18, 0.08)", bdr: "#a56f16", txt: "#f5b041" },
  solo:      { bg: "rgba(41, 128, 185, 0.08)", bdr: "#2980b9", txt: "#5dade2" },
  artifact:  { bg: "rgba(214, 207, 192, 0.06)", bdr: "#8d877d", txt: "#D6CFC0" },
  moderator: { bg: "rgba(214, 207, 192, 0.06)", bdr: "#666", txt: "#aaa" }
};
const iconSvg = (...args) => window.GrimoireIcons?.iconSvg(...args) ?? "";
const ROLE_FALLBACK_ICONS = {
  townsfolk: "shield", outsider: "user", minion: "evil", demon: "skull", traveller: "users",
  village: "users", werewolf: "wolf", vampire: "evil", cult: "users", solo: "user",
  artifact: "sparkle", moderator: "book"
};

function scriptById(scriptId) {
  if (scriptId === "tb" && typeof TB !== "undefined") return TB;
  if (scriptId === "bmr" && typeof BMR !== "undefined") return BMR;
  if (scriptId === "sv" && typeof SV !== "undefined") return SV;
  if (typeof TB !== "undefined") return TB;
  return { id: scriptId ?? null, name: "Game", C: {}, FIRST_NIGHT: [], OTHER_NIGHT: [] };
}

// Access the active script object
function S() {
  return scriptById(state.scriptId);
}

function isUltimateWerewolf() {
  return state.scriptId === "uw";
}

function playerAlignment(playerIndex, source = state) {
  const script = scriptById(source.scriptId);
  return source.alignments?.[playerIndex] ?? script.C[source.assignments?.[playerIndex]]?.team ?? "unknown";
}

function roleColors(role) {
  return TYPE_CLR[role?.type] ?? TYPE_CLR.artifact;
}

function roleCategoryLabel(role) {
  if (!role) return "Unknown";
  if (!isUltimateWerewolf()) return role.type;
  const labels = {
    village: "Village",
    werewolf: "Werewolf team",
    vampire: "Vampire team",
    cult: "Cult",
    solo: "Solo / conditional",
    artifact: "Artifact",
    moderator: "Moderator"
  };
  return labels[role.category] ?? role.category ?? role.type;
}

// ══════════════════════════════════════════════════════════════════════════
// CORE UTILITIES
// ══════════════════════════════════════════════════════════════════════════
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function plainText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function stripLeadingIcon(value) {
  return String(value ?? "").replace(/^[^\p{L}\p{N}_]+/u, "").trim();
}

function goToScreen(screen) {
  if (state.screen === "count" && screen !== "count") rosterImportOperation++;
  state.screen = screen;
  autoSave();
  render();
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

// Render character artwork with a consistent vector fallback.
function renderRoleImage(roleId, type, size = 32, style = "") {
  if (!roleId || !type) return "";
  const fallbackMarkup = iconSvg(ROLE_FALLBACK_ICONS[type] || "info", size * 0.68);
  if (String(roleId).startsWith("_") || !/^[a-z0-9-]+$/i.test(String(roleId))) {
    return `<span class="role-icon-fallback" style="width:${size}px;height:${size}px;${style}">${fallbackMarkup}</span>`;
  }
  const typeMap = {
    townsfolk: "townsfolk", outsider: "outsiders", minion: "minions", demon: "demons", traveller: "travellers",
    village: "townsfolk", werewolf: "demons", vampire: "demons", cult: "minions", solo: "outsiders",
    artifact: "travellers", moderator: "travellers"
  };
  const dir = typeMap[type] || "townsfolk";
  const basePath = `assets/images/${dir}/${roleId}`;
  return `<span class="role-icon-fallback" style="position:relative;width:${size}px;height:${size}px;${style}">
    ${fallbackMarkup}
    <img src="${basePath}.png" alt="" onerror="this.hidden=true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:50%;background:rgba(0,0,0,0.1);padding:2px">
  </span>`;
}

// ══════════════════════════════════════════════════════════════════════════
// GLOBAL GAME STATE
// ══════════════════════════════════════════════════════════════════════════
const SAVE_KEY = "botc_storyteller_v2";
const DISCUSSION_TIMER_TYPES = ["public", "private"];
const DEFAULT_DISCUSSION_TIMER_SECONDS = 300;
const MIN_DISCUSSION_TIMER_SECONDS = 30;
const MAX_DISCUSSION_TIMER_SECONDS = 3600;

let rosterImportOperation = 0;
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
  alignments: {},         // playerIndex -> current alignment
  setupChoices: {},       // script-specific setup decisions
  drunkBelievedRoles: {}, // TB Drunk playerIndex -> out-of-play Townsfolk roleId
  lunaticBelievedRoles: {}, // BMR Lunatic playerIndex -> believed Demon roleId
  lunaticPoCharged: {},
  redHerringIndex: null,  // TB Fortune Teller good player registration
  roleEntryIndex: 0,      // moderator's current physical-card entry seat
  revealIndex: 0,         // Index of player during hand-off role reveal
  revealCovered: true,    // privacy cover between players

  // Active game variables
  dayNum: 1,
  phase: "night",         // night | day
  activeWakeIdx: 0,       // current woken role in night sequence
  nightLog: [],           // current night choices/actions
  alive: {},              // playerIndex -> boolean
  registeredDead: {},     // BMR Zombuul registration without actual death
  nominations: [],        // list of nominations today
  votes: {},              // playerIndex -> number of vote tokens (default 1)
  ghostVotes: {},         // playerIndex -> boolean (used ghost vote)
  deathsLastNight: [],    // tracking deaths
  deathsToday: [],        // players marked dead during the current day
  poisonedIndex: null,    // TB Poisoner current target (tonight + following day)
  nightProtected: [],     // player indexes protected during the current night
  executedTodayIndex: null,
  usedAbilities: {},      // seat:role keys for once-per-game night abilities
  poCharged: false,
  permanentlyPoisoned: {},
  gainedAbilities: {},
  fangGuJumpUsed: false,
  pendingMoonchildIndexes: [],
  vigormortisRetainedMinions: [],
  previousNightTargets: {},
  courtierEffect: null,
  chronicle: [],          // chronological logs of events: { type, nightNum, dayNum, title, details, badgeColor }
  drawerOpen: false,      // storyteller sidebar menu drawer state
  winTeam: null,          // good | evil
  winnerSelection: [],    // Ultimate Werewolf team/player winner IDs
  sessionId: null,
  emailEventTimes: {},
  emailDispatchedKeys: [],
  pendingEmails: [],

  // Timers
  timerSeconds: 300,
  timerTotal: 300,
  timerRunning: false,
  timerIntervalId: null,
  timerDeadline: null,
  timerSessionDay: 1,
  discussionTimerDefaults: { public: 300, private: 300 },
  discussionTimerSessions: {},
  activeDiscussionType: "public",

  // UI helpers
  tab: "grimoire",        // grimoire | night | day | chronicle
  confirm: null,          // confirm dialog modal state
  showCard: null,         // popup dismissible card modal state
  toast: null,            // non-blocking toast { message, tone }
};

const DIALOG_SELECTOR = '[role="alertdialog"], [role="dialog"]';
const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
let dialogFocusOrigin = null;

const historyController = window.BOTCHistory?.createHistoryController({
  limit: 30,
  getState: () => state,
  beforeRestore: () => clearTimerInterval(),
  restoreState: snapshot => {
    state = {
      ...state,
      ...snapshot,
      drawerOpen: false,
      confirm: null,
      showCard: null,
      toast: null,
      timerRunning: false,
      timerIntervalId: null,
      timerDeadline: null
    };
    normalizeDiscussionTimerState();
  },
  afterRestore: context => {
    autoSave();
    state.toast = { message: `Undid: ${context.label}`, tone: "success" };
    render();
  }
}) ?? {
  record() {}, undo() { return null; }, clearForNewGame() {}, clearForTakeover() {},
  canUndo() { return false; }, peekLabel() { return null; }
};

function recordHistory(label) {
  historyController.record(label);
}

function undoLastAction() {
  if (!historyController.canUndo()) return;
  historyController.undo();
}

function getSerializableState() {
  return {
    _saved: Date.now(),
    screen: state.screen,
    scriptId: state.scriptId,
    playerCount: state.playerCount,
    dist: state.dist,
    names: state.names,
    rolePool: state.rolePool,
    assignments: state.assignments,
    alignments: state.alignments ?? {},
    setupChoices: state.setupChoices ?? {},
    drunkBelievedRoles: state.drunkBelievedRoles,
    lunaticBelievedRoles: state.lunaticBelievedRoles ?? {},
    lunaticPoCharged: state.lunaticPoCharged ?? {},
    redHerringIndex: state.redHerringIndex,
    roleEntryIndex: state.roleEntryIndex,
    revealIndex: state.revealIndex,
    revealCovered: state.revealCovered,
    dayNum: state.dayNum,
    phase: state.phase,
    activeWakeIdx: state.activeWakeIdx,
    nightLog: state.nightLog,
    alive: state.alive,
    registeredDead: state.registeredDead ?? {},
    nominations: state.nominations,
    votes: state.votes,
    ghostVotes: state.ghostVotes,
    deathsLastNight: state.deathsLastNight,
    deathsToday: state.deathsToday ?? [],
    poisonedIndex: state.poisonedIndex ?? null,
    nightProtected: state.nightProtected ?? [],
    executedTodayIndex: state.executedTodayIndex ?? null,
    usedAbilities: state.usedAbilities ?? {},
    poCharged: state.poCharged === true,
    permanentlyPoisoned: state.permanentlyPoisoned ?? {},
    gainedAbilities: state.gainedAbilities ?? {},
    fangGuJumpUsed: state.fangGuJumpUsed === true,
    pendingMoonchildIndexes: state.pendingMoonchildIndexes ?? [],
    vigormortisRetainedMinions: state.vigormortisRetainedMinions ?? [],
    previousNightTargets: state.previousNightTargets ?? {},
    courtierEffect: state.courtierEffect ?? null,
    chronicle: state.chronicle,
    winTeam: state.winTeam,
    winnerSelection: state.winnerSelection,
    sessionId: state.sessionId,
    emailEventTimes: state.emailEventTimes ?? {},
    emailDispatchedKeys: state.emailDispatchedKeys ?? [],
    pendingEmails: state.pendingEmails ?? [],
    timerSeconds: state.timerSeconds,
    timerTotal: state.timerTotal,
    timerRunning: state.timerRunning,
    timerDeadline: state.timerDeadline,
    discussionTimerDefaults: state.discussionTimerDefaults,
    discussionTimerSessions: state.discussionTimerSessions,
    activeDiscussionType: state.activeDiscussionType,
    tab: state.tab
  };
}

function autoSave() {
  if (!state.scriptId) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(getSerializableState()));
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

function normalizeDiscussionDuration(value, fallback = DEFAULT_DISCUSSION_TIMER_SECONDS) {
  const parsed = Number(value);
  const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : DEFAULT_DISCUSSION_TIMER_SECONDS;
  return Math.max(
    MIN_DISCUSSION_TIMER_SECONDS,
    Math.min(MAX_DISCUSSION_TIMER_SECONDS, Math.round(Number.isFinite(parsed) ? parsed : safeFallback))
  );
}

function normalizeDiscussionRemaining(value, duration) {
  const parsed = Number(value);
  return Math.max(0, Math.min(duration, Math.round(Number.isFinite(parsed) ? parsed : duration)));
}

function createDiscussionTimerSession() {
  const timerAllowed = canConfigureDiscussionTimers();
  return Object.fromEntries(DISCUSSION_TIMER_TYPES.map(type => {
    const durationSeconds = normalizeDiscussionDuration(state.discussionTimerDefaults?.[type]);
    return [type, { enabled: timerAllowed, durationSeconds, remainingSeconds: durationSeconds }];
  }));
}

function normalizeDiscussionTimerSession(session) {
  const timerAllowed = canConfigureDiscussionTimers();
  const normalized = {};
  DISCUSSION_TIMER_TYPES.forEach(type => {
    const raw = session?.[type] ?? {};
    const durationSeconds = normalizeDiscussionDuration(
      raw.durationSeconds,
      state.discussionTimerDefaults[type]
    );
    normalized[type] = {
      enabled: timerAllowed && raw.enabled !== false,
      durationSeconds,
      remainingSeconds: normalizeDiscussionRemaining(raw.remainingSeconds, durationSeconds)
    };
  });
  return normalized;
}

function ensureDiscussionTimerSession(dayNum = state.dayNum) {
  const sessionKey = String(Math.max(1, Number(dayNum) || 1));
  if (!state.discussionTimerDefaults || typeof state.discussionTimerDefaults !== "object") {
    state.discussionTimerDefaults = { public: DEFAULT_DISCUSSION_TIMER_SECONDS, private: DEFAULT_DISCUSSION_TIMER_SECONDS };
  }
  DISCUSSION_TIMER_TYPES.forEach(type => {
    state.discussionTimerDefaults[type] = normalizeDiscussionDuration(state.discussionTimerDefaults[type]);
  });
  if (!state.discussionTimerSessions || typeof state.discussionTimerSessions !== "object") {
    state.discussionTimerSessions = {};
  }
  if (!state.discussionTimerSessions[sessionKey]) {
    state.discussionTimerSessions[sessionKey] = createDiscussionTimerSession();
  } else if (DISCUSSION_TIMER_TYPES.some(type => {
    const timer = state.discussionTimerSessions[sessionKey][type];
    return !timer
      || typeof timer.enabled !== "boolean"
      || !Number.isFinite(Number(timer.durationSeconds))
      || !Number.isFinite(Number(timer.remainingSeconds));
  })) {
    state.discussionTimerSessions[sessionKey] = normalizeDiscussionTimerSession(state.discussionTimerSessions[sessionKey]);
  }
  return state.discussionTimerSessions[sessionKey];
}

function normalizeDiscussionTimerState({ migrateLegacyTimer = false } = {}) {
  const legacyDuration = normalizeDiscussionDuration(state.timerTotal);
  const rawDefaults = state.discussionTimerDefaults;
  state.discussionTimerDefaults = {
    public: normalizeDiscussionDuration(rawDefaults?.public, legacyDuration),
    private: normalizeDiscussionDuration(rawDefaults?.private, legacyDuration)
  };

  const rawSessions = state.discussionTimerSessions;
  state.discussionTimerSessions = {};
  if (rawSessions && typeof rawSessions === "object") {
    Object.entries(rawSessions).forEach(([sessionKey, session]) => {
      state.discussionTimerSessions[sessionKey] = normalizeDiscussionTimerSession(session);
    });
  }

  state.activeDiscussionType = DISCUSSION_TIMER_TYPES.includes(state.activeDiscussionType)
    ? state.activeDiscussionType
    : "public";
  const currentKey = String(Math.max(1, Number(state.dayNum) || 1));
  const hadCurrentSession = Boolean(state.discussionTimerSessions[currentKey]);
  const currentSession = ensureDiscussionTimerSession();
  const activeTimer = currentSession[state.activeDiscussionType];
  if (!hadCurrentSession && migrateLegacyTimer) {
    activeTimer.durationSeconds = legacyDuration;
    activeTimer.remainingSeconds = normalizeDiscussionRemaining(state.timerSeconds, legacyDuration);
    state.discussionTimerDefaults[state.activeDiscussionType] = legacyDuration;
  }
  state.timerTotal = activeTimer.durationSeconds;
  state.timerSeconds = activeTimer.remainingSeconds;
  state.timerRunning = false;
  state.timerIntervalId = null;
  state.timerDeadline = null;
  state.timerSessionDay = state.dayNum;
}

function hydrateState(saved) {
  if (!["tb", "bmr", "sv"].includes(saved?.scriptId)) {
    resetEngine();
    return false;
  }
  const hasDiscussionTimerState = Object.prototype.hasOwnProperty.call(saved, "discussionTimerDefaults")
    || Object.prototype.hasOwnProperty.call(saved, "discussionTimerSessions");
  Object.assign(state, saved);
  state.alignments = saved.alignments && typeof saved.alignments === "object" && !Array.isArray(saved.alignments)
    ? saved.alignments
    : {};
  state.deathsLastNight = Array.isArray(saved.deathsLastNight) ? saved.deathsLastNight : [];
  state.registeredDead = saved.registeredDead && typeof saved.registeredDead === "object" && !Array.isArray(saved.registeredDead)
    ? saved.registeredDead
    : {};
  state.deathsToday = Array.isArray(saved.deathsToday) ? saved.deathsToday : [];
  state.nightProtected = Array.isArray(saved.nightProtected) ? saved.nightProtected : [];
  state.usedAbilities = saved.usedAbilities && typeof saved.usedAbilities === "object" && !Array.isArray(saved.usedAbilities)
    ? saved.usedAbilities
    : {};
  state.setupChoices = saved.setupChoices && typeof saved.setupChoices === "object" && !Array.isArray(saved.setupChoices)
    ? saved.setupChoices
    : {};
  state.lunaticBelievedRoles = saved.lunaticBelievedRoles && typeof saved.lunaticBelievedRoles === "object" && !Array.isArray(saved.lunaticBelievedRoles)
    ? saved.lunaticBelievedRoles
    : {};
  state.lunaticPoCharged = saved.lunaticPoCharged && typeof saved.lunaticPoCharged === "object" && !Array.isArray(saved.lunaticPoCharged)
    ? saved.lunaticPoCharged
    : {};
  state.poCharged = saved.poCharged === true;
  state.permanentlyPoisoned = saved.permanentlyPoisoned && typeof saved.permanentlyPoisoned === "object" && !Array.isArray(saved.permanentlyPoisoned)
    ? saved.permanentlyPoisoned
    : {};
  state.gainedAbilities = saved.gainedAbilities && typeof saved.gainedAbilities === "object" && !Array.isArray(saved.gainedAbilities)
    ? saved.gainedAbilities
    : {};
  state.fangGuJumpUsed = saved.fangGuJumpUsed === true;
  const activeScript = scriptById(state.scriptId);
  state.alignments = Object.fromEntries(Array.from({ length: Number(state.playerCount) || 0 }, (_, index) => {
    const roleTeam = activeScript.C[state.assignments?.[index]]?.team ?? "unknown";
    const restored = state.alignments[index];
    const valid = state.scriptId === "uw" ? restored === roleTeam : ["good", "evil"].includes(restored);
    return [index, valid ? restored : roleTeam];
  }));
  state.pendingMoonchildIndexes = Array.isArray(saved.pendingMoonchildIndexes) ? saved.pendingMoonchildIndexes : [];
  state.vigormortisRetainedMinions = Array.isArray(saved.vigormortisRetainedMinions) ? saved.vigormortisRetainedMinions : [];
  state.previousNightTargets = saved.previousNightTargets && typeof saved.previousNightTargets === "object" && !Array.isArray(saved.previousNightTargets)
    ? saved.previousNightTargets
    : {};
  state.courtierEffect = saved.courtierEffect && typeof saved.courtierEffect === "object" && !Array.isArray(saved.courtierEffect)
    ? saved.courtierEffect
    : null;
  state.emailEventTimes = saved.emailEventTimes && typeof saved.emailEventTimes === "object" ? saved.emailEventTimes : {};
  state.emailDispatchedKeys = Array.isArray(saved.emailDispatchedKeys) ? saved.emailDispatchedKeys : [];
  state.pendingEmails = Array.isArray(saved.pendingEmails) ? saved.pendingEmails : [];
  if (saved.timerRunning === true && Number.isFinite(Number(saved.timerDeadline))) {
    state.timerSeconds = Math.max(0, Math.ceil((Number(saved.timerDeadline) - Date.now()) / 1000));
  }
  if (!Object.prototype.hasOwnProperty.call(saved, "discussionTimerDefaults")) {
    state.discussionTimerDefaults = null;
  }
  if (!Object.prototype.hasOwnProperty.call(saved, "discussionTimerSessions")) {
    state.discussionTimerSessions = {};
  }
  if (!Object.prototype.hasOwnProperty.call(saved, "activeDiscussionType")) {
    state.activeDiscussionType = "public";
  }
  state.timerRunning = false;
  state.timerIntervalId = null;
  state.timerDeadline = null;
  normalizeDiscussionTimerState({ migrateLegacyTimer: !hasDiscussionTimerState });
  return true;
}

function resetEngine() {
  rosterImportOperation++;
  stopTimer();
  if (typeof stopHandoffScanner === "function") stopHandoffScanner();
  clearSave();
  try { localStorage.removeItem(EMAIL_OUTBOX_KEY); } catch (error) {}
  state = {
    screen: "select",
    scriptId: null,
    playerCount: 8,
    names: [],
    nameInput: "",
    dist: { t: 0, o: 0, m: 0, d: 0 },
    rolePool: [],
    assignments: {},
    alignments: {},
    setupChoices: {},
    drunkBelievedRoles: {},
    lunaticBelievedRoles: {},
    lunaticPoCharged: {},
    redHerringIndex: null,
    roleEntryIndex: 0,
    revealIndex: 0,
    revealCovered: true,
    dayNum: 1,
    phase: "night",
    activeWakeIdx: 0,
    nightLog: [],
    alive: {},
    registeredDead: {},
    nominations: [],
    votes: {},
    ghostVotes: {},
    deathsLastNight: [],
    deathsToday: [],
    poisonedIndex: null,
    nightProtected: [],
    executedTodayIndex: null,
    usedAbilities: {},
    poCharged: false,
    permanentlyPoisoned: {},
    gainedAbilities: {},
    fangGuJumpUsed: false,
    pendingMoonchildIndexes: [],
    vigormortisRetainedMinions: [],
    previousNightTargets: {},
    courtierEffect: null,
    chronicle: [],
    drawerOpen: false,
    winTeam: null,
    winnerSelection: [],
    sessionId: null,
    emailEventTimes: {},
    emailDispatchedKeys: [],
    pendingEmails: [],
    timerSeconds: 300,
    timerTotal: 300,
    timerRunning: false,
    timerIntervalId: null,
    timerDeadline: null,
    timerSessionDay: 1,
    discussionTimerDefaults: { public: 300, private: 300 },
    discussionTimerSessions: {},
    activeDiscussionType: "public",
    tab: "grimoire",
    confirm: null,
    showCard: null,
    toast: null
  };
  if (typeof historyController !== "undefined") historyController.clearForNewGame();
  render();
}

function resumeGame() {
  const saved = loadFromStorage();
  if (saved) {
    hydrateState(saved);
    state.drunkBelievedRoles = saved.drunkBelievedRoles ?? {};
    state.redHerringIndex = saved.redHerringIndex ?? null;
    state.poisonedIndex = saved.poisonedIndex ?? null;
    if (!saved.dist) {
      const s = S();
      const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
      state.dist = { ...d };
    }
    state.showResume = false;
    const legacyDrunkNeedsSetup = state.scriptId === "tb"
      && getTroubleBrewingDrunkIndexes().some(playerIndex => !getDrunkBelievedRoleId(playerIndex));
    const legacyLunaticNeedsSetup = state.scriptId === "bmr"
      && Object.entries(state.assignments).some(([seat, roleId]) => roleId === "lunatic" && !getLunaticBelievedRoleId(Number(seat)));
    if ((legacyDrunkNeedsSetup || legacyLunaticNeedsSetup) && ["reveal", "game", "victory"].includes(state.screen)) {
      state.screen = "roles";
      state.showCard = {
        title: "Private Role Setup Required",
        icon: "warning",
        text: legacyDrunkNeedsSetup
          ? "Choose an out-of-play Townsfolk for every Drunk before continuing. Re-finalizing restarts the reveal and active-night setup."
          : "Choose the Demon each Lunatic believes they are before continuing. Re-finalizing restarts the reveal and active-night setup."
      };
    }
    render();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER ROUTINE
// ══════════════════════════════════════════════════════════════════════════
function findNonDrawerDialog(root) {
  const dialogs = root?.querySelectorAll?.(DIALOG_SELECTOR) ?? [];
  return [...dialogs].find(dialog => !dialog.classList?.contains?.("drawer-menu")) ?? null;
}

function hasNonDrawerDialogState() {
  return Boolean(state.showCard || state.confirm || state.showWinnerPicker || state.showResume || state.showHandoffGive);
}

function normalizedFocusText(element) {
  return String(element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function focusAttribute(element, name) {
  return String(element?.getAttribute?.(name) ?? "");
}

function rememberDialogFocus(root) {
  const activeElement = document.activeElement;
  if (!activeElement || activeElement === document.body) return;
  if (typeof root?.contains === "function" && !root.contains(activeElement)) return;

  const signature = {
    id: String(activeElement.id ?? ""),
    tagName: String(activeElement.tagName ?? "").toLowerCase(),
    ariaLabel: focusAttribute(activeElement, "aria-label"),
    action: focusAttribute(activeElement, "onclick") || focusAttribute(activeElement, "onchange"),
    name: focusAttribute(activeElement, "name"),
    value: String(activeElement.value ?? ""),
    text: normalizedFocusText(activeElement)
  };
  if (signature.id || signature.ariaLabel || signature.action || signature.name || signature.text) {
    dialogFocusOrigin = signature;
  }
}

function restoreDialogFocus(root) {
  const signature = dialogFocusOrigin;
  dialogFocusOrigin = null;
  if (!signature) return;

  const belongsToRoot = element => element && (typeof root?.contains !== "function" || root.contains(element));
  let target = signature.id ? document.getElementById(signature.id) : null;
  if (!belongsToRoot(target)) target = null;

  const candidates = [...(root?.querySelectorAll?.(FOCUSABLE_SELECTOR) ?? [])];
  if (!target && signature.ariaLabel) {
    target = candidates.find(element => focusAttribute(element, "aria-label") === signature.ariaLabel) ?? null;
  }
  if (!target && signature.action) {
    target = candidates.find(element => (
      (focusAttribute(element, "onclick") || focusAttribute(element, "onchange")) === signature.action
      && String(element.tagName ?? "").toLowerCase() === signature.tagName
    )) ?? null;
  }
  if (!target && signature.name) {
    target = candidates.find(element => (
      focusAttribute(element, "name") === signature.name
      && String(element.value ?? "") === signature.value
    )) ?? null;
  }
  if (!target && signature.text) {
    target = candidates.find(element => (
      normalizedFocusText(element) === signature.text
      && String(element.tagName ?? "").toLowerCase() === signature.tagName
    )) ?? null;
  }
  if (!target) target = candidates[0] ?? null;
  target?.focus?.();
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const hadNonDrawerDialog = Boolean(findNonDrawerDialog(app));
  if (!hadNonDrawerDialog && hasNonDrawerDialogState() && !dialogFocusOrigin) rememberDialogFocus(app);
  if (state.screen !== "handoffReceive" && typeof handoffRuntime !== "undefined" && handoffRuntime.stream) {
    stopHandoffScanner();
  }

  let html = renderHeader();

  switch (state.screen) {
    case "select":     html += renderSelectScreen(); break;
    case "count":      html += renderCountScreen(); break;
    case "names":      html += renderNamesScreen(); break;
    case "roles":      html += renderRolesScreen(); break;
    case "reveal":     html += renderRevealScreen(); break;
    case "game":       html += renderGameScreen(); break;
    case "victory":    html += renderVictoryScreen(); break;
    case "handoffReceive": html += (typeof renderHandoffReceiveScreen === "function" ? renderHandoffReceiveScreen() : ""); break;
  }

  html += renderOverlays();
  if (state.toast) {
    const toastTone = state.toast.tone === "error" ? "var(--red)" : state.toast.tone === "success" ? "var(--green)" : "var(--text2)";
    html += `
      <div class="app-toast" role="status" style="border-color:${toastTone}">
        ${esc(state.toast.message ?? "")}
      </div>
    `;
  }
  app.innerHTML = html;

  const activeDialog = app.querySelector?.(DIALOG_SELECTOR);
  const hasNonDrawerDialog = Boolean(findNonDrawerDialog(app));
  if (activeDialog) {
    const firstControl = activeDialog.querySelector?.(FOCUSABLE_SELECTOR);
    if (typeof firstControl?.focus === "function") firstControl.focus();
    else if (typeof activeDialog.focus === "function") activeDialog.focus();
  }
  if (hadNonDrawerDialog && !hasNonDrawerDialog) {
    if (state.drawerOpen) dialogFocusOrigin = null;
    else restoreDialogFocus(app);
  }

  // Roster input focus helper
  if (state.screen === "names" && state.names.length < state.playerCount) {
    const el = document.getElementById(`name-input-${state.names.length}`);
    if (el) setTimeout(() => el.focus(), 80);
  }
  if (typeof afterRenderHandoff === "function") afterRenderHandoff();
}

// ══════════════════════════════════════════════════════════════════════════
// HEADER & STYLED APP TOP BAR
// ══════════════════════════════════════════════════════════════════════════
function renderHeader() {
  const hasGameActive = state.screen === "game" || state.screen === "reveal" || state.screen === "victory";
  const canOpenMenu = state.screen !== "reveal";
  const s = state.scriptId ? S() : null;

  return `
    <header class="header">
      <div style="display:flex;align-items:center;gap:14px">
        ${canOpenMenu ? `<button class="icon-button" onclick="toggleDrawer()" aria-label="Open Storyteller menu">${iconSvg("menu", 22)}</button>` : ""}
        <span class="header-title" style="color:${s ? s.color : 'var(--text)'};font-family:var(--font-serif)">
          ${s ? s.name : "Storyteller's Grimoire"}
        </span>
      </div>
      ${hasGameActive ? `
        <div style="display:flex;align-items:center;gap:10px">
          ${typeof canGiveHandoff === "function" && canGiveHandoff() ? `
            <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 10px" onclick="openGiveHandoff()" aria-label="Give host handoff">${iconSvg("share", 16)} Handoff</button>
          ` : ""}
          <div class="phase-badge ${state.phase === 'night' ? 'warn-red' : 'warn-orange'}" style="margin:0;font-size:10px;font-weight:700">
            ${iconSvg(state.phase === "night" ? "moon" : "sun", 14)} ${state.phase === 'night' ? 'Night' : 'Day'} ${state.dayNum}
          </div>
        </div>
      ` : ''}
    </header>
  `;
}

// Toggle drawer state
function toggleDrawer() {
  const closing = state.drawerOpen;
  state.drawerOpen = !closing;
  render();
  if (closing) document.querySelector?.('[aria-label="Open Storyteller menu"]')?.focus?.();
}

function dismissTopDialog() {
  if (state.showHandoffGive && typeof closeGiveHandoff === "function") return closeGiveHandoff();
  if (state.showCard) state.showCard = null;
  else if (state.confirm) state.confirm = null;
  else if (state.showWinnerPicker) state.showWinnerPicker = false;
  else if (state.showResume) state.showResume = false;
  else if (state.drawerOpen) {
    state.drawerOpen = false;
    render();
    document.querySelector?.('[aria-label="Open Storyteller menu"]')?.focus?.();
    return;
  }
  render();
}

function trapDialogFocus(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    dismissTopDialog();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.hidden);
  if (focusable.length === 0) {
    event.preventDefault();
    event.currentTarget.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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
        <aside class="drawer-menu" role="dialog" aria-modal="true" aria-label="Storyteller menu" tabindex="-1" onkeydown="trapDialogFocus(event)" style="position:absolute;left:0;top:0;bottom:0;width:280px;background:var(--surface2);border-right:1px solid var(--border);padding:24px 16px;display:flex;flex-direction:column;gap:18px;animation:slideIn 0.2s ease-out" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px">
            <h3 style="font-family:var(--font-serif);color:var(--text)">Storyteller Menu</h3>
            <button class="icon-button" onclick="toggleDrawer()" aria-label="Close menu">${iconSvg("close", 19)}</button>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:8px">
            ${typeof renderHandoffMenuButtons === "function" ? renderHandoffMenuButtons() : ""}
            ${historyController.canUndo() ? `<button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();undoLastAction()">${iconSvg("undo", 18)} Undo: ${esc(historyController.peekLabel())}</button>` : ""}
            ${readEmailOutbox().length > 0 ? `<button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();retryPendingEmails()">${iconSvg("refresh", 18)} Retry pending emails</button>` : ""}
            <button class="btn btn-blue" style="justify-content:flex-start" onclick="toggleDrawer();state.confirm={msg:'Start a completely new session? Your current game will be erased.',onYes:'resetEngine'};render()">${iconSvg("refresh", 18)} Reset Session</button>
            <button class="btn btn-blue" style="justify-content:flex-start" onclick="showRulesQuickref()">${iconSvg("book", 18)} Rules Quick Reference</button>
          </div>

          <div style="margin-top:auto;border-top:1px solid var(--border);padding-top:16px;font-size:11px;color:var(--text3);text-align:center">
            BOTC Grimoire companion v2.0
          </div>
        </aside>
      </div>
    `;
  }

  // Resume state prompt
  if (state.showResume) {
    const s = state.scriptId ? S() : null;
    html += `
      <div class="overlay" style="z-index:220">
        <div class="overlay-box" role="dialog" aria-modal="true" aria-labelledby="resume-title" tabindex="-1" onkeydown="trapDialogFocus(event)" style="border:2px solid var(--blue);box-shadow:0 0 16px rgba(41,128,185,0.2)">
          <div style="margin-bottom:12px">${iconSvg("book", 36)}</div>
          <div id="resume-title" style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px">Saved Session Found</div>
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
        <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-message" tabindex="-1" onkeydown="trapDialogFocus(event)">
          <div style="margin-bottom:8px;color:var(--orange)">${iconSvg("warning", 32)}</div>
          <div id="confirm-dialog-message" style="font-size:13px;color:var(--text);margin-bottom:16px;line-height:1.5">${esc(state.confirm.msg)}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="flex:1;margin:0" onclick="state.confirm=null;render()">Cancel</button>
            <button class="btn btn-primary" style="flex:1;margin:0" onclick="runConfirmedAction()">Confirm</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.showWinnerPicker && isUltimateWerewolf()) {
    const winnerOptions = getUltimateWinnerOptions();
    html += `
      <div class="overlay" style="z-index:280" onclick="state.showWinnerPicker=false;render()">
        <div class="show-card" role="dialog" aria-modal="true" aria-labelledby="winner-dialog-title" tabindex="-1" onkeydown="trapDialogFocus(event)" style="background:var(--surface2);padding:24px;max-width:430px;text-align:left" onclick="event.stopPropagation()">
          <h3 id="winner-dialog-title" style="font-family:var(--font-serif);font-size:24px;margin-bottom:6px">Declare Winner(s)</h3>
          <p style="font-size:12px;color:var(--text3);margin-bottom:16px">Select every team and individual role that won. The moderator resolves all conditions manually.</p>
          <div style="max-height:55vh;overflow-y:auto;margin-bottom:16px">
            ${winnerOptions.map(option => `
              <label class="uw-winner-option">
                <input type="checkbox" ${state.winnerSelection.includes(option.id) ? "checked" : ""} onchange="toggleUltimateWinner('${option.id}', this.checked)">
                <span style="display:flex;align-items:center;gap:8px">${iconSvg("trophy", 16)} ${esc(option.label)}</span>
              </label>
            `).join("")}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="flex:1;margin:0" onclick="state.showWinnerPicker=false;render()">Cancel</button>
            <button class="btn btn-primary" style="flex:1;margin:0" ${state.winnerSelection.length === 0 ? "disabled" : ""} onclick="confirmUltimateWinners()">Confirm winners</button>
          </div>
        </div>
      </div>
    `;
  }

  // Dismissible details card popup
  if (state.showCard) {
    const cardBody = state.showCard.html
      ? state.showCard.html
      : esc(state.showCard.text ?? "").replace(/\n/g, "<br>");
    html += `
      <div class="overlay" style="z-index:300" onclick="state.showCard=null;render()">
        <div class="show-card" role="dialog" aria-modal="true" aria-labelledby="details-dialog-title" tabindex="-1" onkeydown="trapDialogFocus(event)" style="background:var(--surface2);border:1px solid var(--border);padding:24px;border-radius:12px;width:90%;max-width:380px;text-align:center;box-shadow: 0 8px 32px rgba(0,0,0,0.6)" onclick="event.stopPropagation()">
          <div style="margin-bottom:12px">${iconSvg(state.showCard.icon || "info", 42)}</div>
          <h3 id="details-dialog-title" style="font-family:var(--font-serif);color:var(--text);margin-bottom:8px;font-size:22px">${esc(state.showCard.title ?? "")}</h3>
          <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px">${cardBody}</div>
          <button class="btn btn-primary" style="padding:10px" onclick="state.showCard=null;render()">Dismiss</button>
        </div>
      </div>
    `;
  }

  if (typeof renderGiveHandoffOverlay === "function") {
    html += renderGiveHandoffOverlay();
  }

  return html;
}

function runConfirmedAction() {
  const confirmation = state.confirm;
  const actionName = confirmation?.onYes;
  state.confirm = null;
  const action = actionName && globalThis[actionName];
  if (typeof action === "function") action(confirmation?.context);
  else render();
}

function showRulesQuickref() {
  toggleDrawer();
  const scriptName = S().name || "Clocktower";
  state.showCard = isUltimateWerewolf()
    ? {
        title: "Ultimate Werewolf Quick Reference",
        text: "1. Discussion is public only.\\n2. Dead players cannot vote.\\n3. At night, dead players may keep their eyes open and silently watch, but do not act or become targets.\\n4. The moderator manually resolves role interactions and declares every applicable winner.",
        icon: "wolf"
      }
    : {
        title: `${scriptName} Quick Reference`,
        text: "1. Good wins when the Demon dies, unless a character ability keeps the game going.\\n2. Evil wins when only two living players remain and the Demon is alive.\\n3. Dead players keep their ability unless it says otherwise and have one final vote.\\n4. Keep the Grimoire hidden whenever players handle this device.",
        icon: "book"
      };
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1: SCRIPT SELECTION SCREEN (`Script Selection.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderSelectScreen() {
  const scripts = [
    {
      id: "tb",
      name: "Trouble Brewing",
      icon: "cocktail",
      color: "#e0575b",
      desc: "A perfect introduction. Deception is straightforward, and the evils are known. Ideal for newer players and storytellers alike.",
      tag: "Recommended for new players"
    },
    {
      id: "bmr",
      name: "Bad Moon Rising",
      icon: "moon",
      color: "#f39c12",
      desc: "Death is not the end, and survival is not guaranteed. Focuses heavily on deduction through night deaths and complex mechanics.",
      tag: "More complex — experienced players"
    },
    {
      id: "sv",
      name: "Sects & Violets",
      icon: "flower",
      color: "#c47bd9",
      desc: "Madness and misinformation rule. A highly complex script where alignments shift and information is rarely what it seems.",
      tag: "High madness and information control"
    },
  ];

  let cards = "";
  scripts.forEach(s => {
    cards += `
      <button type="button" class="script-card" style="width:100%;color:var(--text);border:1px solid ${s.color}55;background:rgba(30,30,30,0.4);border-radius:12px;padding:20px;margin-bottom:14px;cursor:pointer;transition:all 0.2s;text-align:left" onclick="pickScript('${s.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="color:${s.color}">${iconSvg(s.icon, 36)}</div>
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${s.color}">${s.tag}</span>
        </div>
        <h3 style="font-family:var(--font-serif);color:${s.color};font-size:20px;margin-bottom:6px">${s.name}</h3>
        <p style="font-size:12px;color:var(--text3);line-height:1.5">${s.desc}</p>
      </button>
    `;
  });

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Script Selection</h2>
        <p style="color:var(--text3);font-size:13px">Choose the fate of Ravenswood Bluff.</p>
      </div>
      
      <div style="margin-bottom:20px">${cards}</div>
      <p style="color:var(--text3);font-size:12px;text-align:center;line-height:1.5">Taking over an in-progress game? Open the Storyteller Menu and choose <strong>Receive Handoff</strong>.</p>
    </div>
  `;
}

function pickScript(id) {
  if (!["tb", "bmr", "sv"].includes(id)) return;
  rosterImportOperation++;
  const changedScript = state.scriptId && state.scriptId !== id;
  state.scriptId = id;
  state.screen = "count";
  if (changedScript) {
    state.names = [];
    state.rolePool = [];
    state.assignments = {};
    state.setupChoices = {};
    state.drunkBelievedRoles = {};
    state.redHerringIndex = null;
  }
  const s = S();
  if (s.setupMode === "physical-cards") {
    state.playerCount = Math.max(s.playerLimits.min, Math.min(s.playerLimits.max, state.playerCount));
    state.dist = { t: 0, o: 0, m: 0, d: 0 };
  } else {
    const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
    state.dist = { ...d };
  }
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
  const usesPhysicalCards = s.setupMode === "physical-cards";
  const mismatch = !usesPhysicalCards && total !== state.playerCount;
  const minimumPlayers = s.playerLimits?.min ?? 5;
  const maximumPlayers = s.playerLimits?.max ?? 20;

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="margin-bottom:24px">
        <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Player Setup</h2>
        <p style="color:var(--text3);font-size:13px">${usesPhysicalCards ? "Set the clockwise roster size before recording the dealt physical cards." : "Gather your townsfolk. Determine the soul count for tonight's tragedy."}</p>
      </div>

      <!-- Player Count Card -->
      <div class="card" style="padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:12px">Number of Players</div>

        <div style="display:flex;align-items:center;justify-content:center;gap:32px;margin-bottom:14px">
          <button class="timer-adj-btn" aria-label="Decrease player count" style="width:48px;height:48px;font-size:24px" onclick="adjCount(-1)">−</button>
          <span style="font-size:44px;font-weight:700;color:${s.color};font-family:var(--font-serif)">${state.playerCount}</span>
          <button class="timer-adj-btn" aria-label="Increase player count" style="width:48px;height:48px;font-size:24px" onclick="adjCount(1)">+</button>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
          <span>Min: ${minimumPlayers} players</span>
          <span>Max: ${maximumPlayers} players</span>
        </div>
      </div>

      <!-- Distribution Preview Card -->
      ${usesPhysicalCards ? `
        <div class="card" style="padding:16px;border-radius:12px;background:rgba(0,0,0,0.15);margin-bottom:24px">
          <div style="font-size:12px;font-weight:700;color:${s.color};margin-bottom:8px">PHYSICAL-CARD SETUP</div>
          <p style="font-size:12px;color:var(--text2);line-height:1.6">No roles are distributed or randomized here. After entering the clockwise roster, the moderator records each player's dealt card in seat order. Card inventory limits are enforced.</p>
        </div>
      ` : `
      <div class="card" style="padding:16px;border-radius:12px;background:rgba(0,0,0,0.15);margin-bottom:24px;border:1px solid ${mismatch ? 'var(--red)' : 'transparent'}">
        <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;font-family:var(--font-serif);display:flex;justify-content:space-between;align-items:center;">
          <span>STANDARD DISTRIBUTION:</span>
          <span style="color:${mismatch ? 'var(--red)' : 'var(--green)'};font-size:11px">Total: ${total} / ${state.playerCount}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px">
          <div style="display:flex;align-items:center;color:${TYPE_CLR.townsfolk.txt};background:${TYPE_CLR.townsfolk.bg};border:1px solid ${TYPE_CLR.townsfolk.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1;display:flex;align-items:center;gap:6px">${iconSvg("shield", 15)} Townsfolk</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn compact-adjust" aria-label="Decrease Townsfolk count" onclick="adjDist('t', -1)">−</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.t}</span>
              <button class="timer-adj-btn compact-adjust" aria-label="Increase Townsfolk count" onclick="adjDist('t', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.outsider.txt};background:${TYPE_CLR.outsider.bg};border:1px solid ${TYPE_CLR.outsider.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1;display:flex;align-items:center;gap:6px">${iconSvg("user", 15)} Outsiders</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn compact-adjust" aria-label="Decrease Outsider count" onclick="adjDist('o', -1)">−</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.o}</span>
              <button class="timer-adj-btn compact-adjust" aria-label="Increase Outsider count" onclick="adjDist('o', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.minion.txt};background:${TYPE_CLR.minion.bg};border:1px solid ${TYPE_CLR.minion.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1;display:flex;align-items:center;gap:6px">${iconSvg("evil", 15)} Minions</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn compact-adjust" aria-label="Decrease Minion count" onclick="adjDist('m', -1)">−</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.m}</span>
              <button class="timer-adj-btn compact-adjust" aria-label="Increase Minion count" onclick="adjDist('m', 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;color:${TYPE_CLR.demon.txt};background:${TYPE_CLR.demon.bg};border:1px solid ${TYPE_CLR.demon.bdr}33;padding:6px 10px;border-radius:6px">
            <span style="flex:1;display:flex;align-items:center;gap:6px">${iconSvg("skull", 15)} Demon</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button class="timer-adj-btn compact-adjust" aria-label="Decrease Demon count" onclick="adjDist('d', -1)">−</button>
              <span style="font-weight:bold;width:16px;text-align:center;">${d.d ?? 1}</span>
              <button class="timer-adj-btn compact-adjust" aria-label="Increase Demon count" onclick="adjDist('d', 1)">+</button>
            </div>
          </div>
        </div>
        ${mismatch ? `<div style="color:var(--danger-text);font-size:11px;margin-top:10px;text-align:center;font-weight:bold;display:flex;justify-content:center;gap:6px">${iconSvg("warning", 15)} Distribution does not match player count.</div>` : ''}
      </div>
      `}

      <div class="card" style="padding:16px;border-radius:12px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Import roster</div>
        <p style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:12px">Load player names from a CSV or image. You can add, remove, and rename seats before continuing.</p>
        <input type="file" id="player-import-file" accept=".csv,text/csv,image/png,image/jpeg" style="display:none" onchange="handlePlayerImportFile(event)">
        <button type="button" class="btn-outline" style="width:100%" onclick="document.getElementById('player-import-file').click()" ${state.playerImportBusy ? "disabled" : ""}>
          ${iconSvg("upload", 17)} ${state.playerImportBusy ? "Reading roster…" : "Import CSV or image"}
        </button>
      </div>
      <button class="btn btn-primary" ${mismatch || state.playerImportBusy ? 'disabled' : ''} onclick="proceedToNames()">Proceed to Player Roster ${iconSvg("forward", 17)}</button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="goToScreen('select')">${iconSvg("back", 17)} Back to Scripts</button>
    </div>
  `;
}

function adjDist(type, delta) {
  const s = S();
  // Get available characters for this script
  const availableCount = Object.values(s.C).filter(c => c.type === (type === 't' ? 'townsfolk' : type === 'o' ? 'outsider' : type === 'm' ? 'minion' : 'demon')).length;
  const distributionLimit = Number(s.DIST?.[state.playerCount]?.[type]) || 0;
  const min = type === 'd' ? 1 : 0;
  state.dist[type] = Math.max(min, Math.min(Math.max(availableCount, distributionLimit), (state.dist[type] || 0) + delta));
  state.rolePool = [];
  state.assignments = {};
  state.setupChoices = {};
  state.drunkBelievedRoles = {};
  state.redHerringIndex = null;
  autoSave();
  render();
}

function adjCount(delta) {
  const s = S();
  const minimumPlayers = s.playerLimits?.min ?? 5;
  const maximumPlayers = s.playerLimits?.max ?? 20;
  const previousCount = state.playerCount;
  state.playerCount = Math.max(minimumPlayers, Math.min(maximumPlayers, state.playerCount + delta));
  if (state.playerCount === previousCount) return;
  if (s.setupMode !== "physical-cards") {
    const d = s.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 };
    state.dist = { ...d };
    state.setupChoices = {};
  }
  autoSave();
  render();
}
function proceedToNames() {
  // Pad or trim names array to length
  if (state.names.length > state.playerCount) {
    state.names = state.names.slice(0, state.playerCount);
  }
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
  const entered = state.names.filter(name => String(name ?? "").trim() !== "").length;

  let roster = "";
  for (let i = 0; i < state.playerCount; i++) {
    roster += `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="seat-num" style="background:var(--border);border:none;width:28px;height:28px">${i + 1}</div>
        <label class="sr-only" for="name-input-${i}">Player name for seat ${i + 1}</label>
        <input type="text" id="name-input-${i}" class="input" style="flex:1" maxlength="80"
          value="${esc(state.names[i])}" 
          placeholder="Enter player name..." 
          oninput="savePlayerName(${i}, this.value)"
          onkeydown="if(event.key==='Enter') focusNextName(${i})">
        <button type="button" class="timer-adj-btn compact-adjust" aria-label="Remove player at seat ${i + 1}" onclick="removeRosterPlayer(${i})" ${state.playerCount <= (S().playerLimits?.min ?? 5) ? "disabled" : ""}>${iconSvg("close", 14)}</button>
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
        <span id="roster-progress" class="phase-badge warn-red" style="font-size:11px">${entered}/${state.playerCount} Roster</span>
      </div>

      <div class="card" style="padding:16px;border-radius:12px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:12px">PLAYER ROSTER</div>
        ${roster}
        <button type="button" class="btn-outline" style="width:100%;margin-top:4px" onclick="addRosterPlayer()" ${state.playerCount >= (S().playerLimits?.max ?? 20) ? "disabled" : ""}>${iconSvg("users", 16)} Add player</button>
      </div>

      <button class="btn btn-primary" onclick="proceedToRoles()">Continue to Roles ${iconSvg("forward", 17)}</button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="goToScreen('count')">${iconSvg("back", 17)} Back</button>
    </div>
  `;
}

function savePlayerName(idx, val) {
  state.names[idx] = String(val ?? "").slice(0, 80);
  autoSave();
  const progress = document.getElementById("roster-progress");
  if (progress) {
    const entered = state.names.filter(name => String(name ?? "").trim() !== "").length;
    progress.textContent = `${entered}/${state.playerCount} Roster`;
  }
  state.names = state.names.slice(0, state.playerCount);
}

function focusNextName(idx) {
  const next = document.getElementById(`name-input-${idx + 1}`);
  if (next) next.focus();
}

function addRosterPlayer() {
  const script = S();
  if (state.playerCount >= (script.playerLimits?.max ?? 20)) return;
  state.playerCount += 1;
  state.names.push("");
  state.dist = { ...(script.DIST[state.playerCount] || state.dist) };
  clearRoleSetupForRosterChange();
  autoSave();
  render();
}

function removeRosterPlayer(index) {
  const script = S();
  if (state.playerCount <= (script.playerLimits?.min ?? 5) || index < 0 || index >= state.playerCount) return;
  state.names.splice(index, 1);
  state.playerCount -= 1;
  state.dist = { ...(script.DIST[state.playerCount] || state.dist) };
  clearRoleSetupForRosterChange();
  autoSave();
  render();
}

function validGodfatherOutsiderDeltas(baseDistribution = state.dist) {
  const base = baseDistribution ?? {};
  return [-1, 1].filter(delta => (
    Number(base.o ?? 0) + delta >= 0
    && Number(base.t ?? 0) - delta >= 0
  ));
}

function ensureSetupChoices(roleIds = state.rolePool) {
  state.setupChoices = state.setupChoices && typeof state.setupChoices === "object"
    ? state.setupChoices
    : {};
  if (state.scriptId !== "bmr" || !roleIds.includes("godfather")) return;
  const validDeltas = validGodfatherOutsiderDeltas();
  if (!validDeltas.includes(Number(state.setupChoices.godfatherOutsiderDelta))) {
    state.setupChoices.godfatherOutsiderDelta = validDeltas[0] ?? 1;
  }
}

function getSetupAdjustedDistribution(baseDistribution, roleIds, choices = state.setupChoices) {
  const adjusted = {
    t: Math.max(0, Number(baseDistribution?.t) || 0),
    o: Math.max(0, Number(baseDistribution?.o) || 0),
    m: Math.max(0, Number(baseDistribution?.m) || 0),
    d: Math.max(0, Number(baseDistribution?.d) || 0)
  };
  const selectedRoles = [...new Set(Array.isArray(roleIds) ? roleIds : [])];
  const applyGoodExchange = (townsfolkDelta, outsiderDelta) => {
    const nextTownsfolk = adjusted.t + Number(townsfolkDelta || 0);
    const nextOutsiders = adjusted.o + Number(outsiderDelta || 0);
    if (nextTownsfolk < 0 || nextOutsiders < 0) return false;
    adjusted.t = nextTownsfolk;
    adjusted.o = nextOutsiders;
    return true;
  };

  selectedRoles.forEach(roleId => {
    if (state.scriptId === "bmr" && roleId === "godfather") {
      const validDeltas = validGodfatherOutsiderDeltas(baseDistribution);
      const selectedDelta = Number(choices?.godfatherOutsiderDelta);
      const outsiderDelta = validDeltas.includes(selectedDelta) ? selectedDelta : (validDeltas[0] ?? 0);
      applyGoodExchange(-outsiderDelta, outsiderDelta);
      return;
    }
    const modifier = S().C[roleId]?.setupModifier;
    if (modifier) applyGoodExchange(modifier.townsfolkDelta, modifier.outsiderDelta);
  });
  return adjusted;
}

function proceedToRoles() {
  const normalizedNames = Array.from({ length: state.playerCount }, (_, index) => String(state.names[index] ?? "").trim());
  const duplicateNames = normalizedNames.filter((name, index) => name && normalizedNames.findIndex(candidate => candidate.toLocaleLowerCase() === name.toLocaleLowerCase()) !== index);
  if (normalizedNames.some(name => !name) || duplicateNames.length > 0) {
    state.showCard = {
      title: "Check the roster",
      text: normalizedNames.some(name => !name)
        ? "Enter a name for every seat before assigning characters."
        : "Each seat needs a distinct player name."
    };
    render();
    return;
  }
  state.names = normalizedNames;

  const canResumeRoleSetup = state.rolePool.length > 0
    && Object.keys(state.assignments).length === state.playerCount;
  if (canResumeRoleSetup) {
    state.screen = "roles";
    autoSave();
    render();
    return;
  }

  if (S().setupMode === "physical-cards") {
    state.uwSearchQuery = "";
    const existingAssignments = state.assignments ?? {};
    state.assignments = {};
    for (let i = 0; i < state.playerCount; i++) {
      state.assignments[i] = existingAssignments[i] ?? "";
    }
    state.rolePool = Object.values(state.assignments).filter(Boolean);
    const firstUnassigned = Object.values(state.assignments).findIndex(roleId => roleId === "");
    state.roleEntryIndex = firstUnassigned >= 0 ? firstUnassigned : 0;
    state.screen = "roles";
    autoSave();
    render();
    return;
  }

  // Populate dynamic role pool based on active script character list
  const d = state.dist || { t: 3, o: 0, m: 1, d: 1 };
  
  // Randomize initial pool from the script
  const chars = S().C;
  const tfKeys = Object.keys(chars).filter(k => chars[k].type === "townsfolk");
  const osKeys = Object.keys(chars).filter(k => chars[k].type === "outsider");
  const mnKeys = Object.keys(chars).filter(k => chars[k].type === "minion");
  const dmKeys = Object.keys(chars).filter(k => chars[k].type === "demon");

  // Pick the requested role count. The 19- and 20-player distributions use a
  // second copy of one Minion because a base script contains four Minion roles.
  const chooseRoleCopies = (roleIds, count) => {
    const shuffled = shuffle(roleIds);
    return Array.from({ length: count }, (_, index) => shuffled[index % shuffled.length]);
  };
  const chosenMN = chooseRoleCopies(mnKeys, d.m);
  const chosenDM = chooseRoleCopies(dmKeys, d.d ?? 1);
  ensureSetupChoices([...chosenMN, ...chosenDM]);
  const adjustedDistribution = getSetupAdjustedDistribution(d, [...chosenMN, ...chosenDM]);
  const townsfolkCount = adjustedDistribution.t;
  const outsiderCount = adjustedDistribution.o;
  const chosenTF = chooseRoleCopies(tfKeys, townsfolkCount);
  const eligibleOutsiders = state.playerCount >= 19 && state.scriptId === "tb"
    ? osKeys.filter(roleId => roleId !== "drunk")
    : osKeys;
  const chosenOS = chooseRoleCopies(eligibleOutsiders, outsiderCount);

  state.rolePool = [...chosenTF, ...chosenOS, ...chosenMN, ...chosenDM];
  
  // Empty assignments
  state.assignments = {};
  state.drunkBelievedRoles = {};
  state.redHerringIndex = null;
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
function isTroubleBrewingDrunk(playerIndex) {
  return state.scriptId === "tb" && state.assignments[playerIndex] === "drunk";
}

function isPoisonedSeat(playerIndex) {
  const temporaryPoison = state.poisonedIndex !== null
    && state.poisonedIndex !== undefined
    && Number(state.poisonedIndex) === Number(playerIndex);
  const permanentPoison = state.scriptId === "sv" && state.permanentlyPoisoned?.[playerIndex] === true;
  return temporaryPoison || permanentPoison;
}

function isPhilosopherDrunk(playerIndex, roleId = state.assignments[playerIndex]) {
  if (state.scriptId !== "sv") return false;
  return Object.entries(state.gainedAbilities ?? {}).some(([philosopherSeat, gainedRoleId]) => (
    Number(philosopherSeat) !== Number(playerIndex)
    && gainedRoleId === roleId
    && state.assignments[philosopherSeat] === "philosopher"
    && state.alive[philosopherSeat] !== false
  ));
}

function isCourtierDrunk(playerIndex, roleId = state.assignments[playerIndex]) {
  const effect = state.courtierEffect;
  return state.scriptId === "bmr"
    && effect
    && Number(effect.expiresAfterDay) >= state.dayNum
    && effect.characterId === roleId;
}

function isPlayerAbilityImpaired(playerIndex, roleId = state.assignments[playerIndex]) {
  return isPoisonedSeat(playerIndex)
    || isPhilosopherDrunk(playerIndex, roleId)
    || isCourtierDrunk(playerIndex, roleId);
}

function targetAliveState() {
  if (state.scriptId !== "bmr") return state.alive;
  const publicAlive = { ...state.alive };
  Object.keys(state.registeredDead ?? {}).forEach(seat => {
    if (state.registeredDead[seat] === true) publicAlive[seat] = false;
  });
  return publicAlive;
}

function priorTargetKey(playerIndex, roleId) {
  return `${Number(playerIndex)}:${String(roleId ?? "")}`;
}

function isRepeatRestrictedTarget(activeNode, targetIndex) {
  const actionId = activeNode.sourceId || activeNode.id;
  const previous = state.previousNightTargets?.[priorTargetKey(activeNode.playerIndex, actionId)];
  return state.scriptId === "bmr"
    && ["exorcist", "devilsadvocate"].includes(actionId)
    && Number(previous?.nightNumber) === state.dayNum - 1
    && Number(previous?.targetIndex) === Number(targetIndex);
}

function addPendingMoonchild(playerIndex) {
  if (state.scriptId !== "bmr" || state.assignments[playerIndex] !== "moonchild") return;
  state.pendingMoonchildIndexes = [...new Set([...(state.pendingMoonchildIndexes ?? []), Number(playerIndex)])];
}

function hasLivingVigormortis() {
  return state.scriptId === "sv" && Object.entries(state.assignments).some(([seat, roleId]) => (
    roleId === "vigormortis" && state.alive[seat] !== false
  ));
}

function recordVigormortisRetentionForDeath(playerIndex) {
  if (
    state.scriptId !== "sv"
    || S().C[state.assignments[playerIndex]]?.type !== "minion"
    || !(state.nightLog ?? []).some(action => (
      action.fakeNoEffect !== true
      && action.targetIndexes?.includes(Number(playerIndex))
      && (action.roleId || state.assignments[action.actingPlayerIndex]) === "vigormortis"
    ))
  ) return;
  state.vigormortisRetainedMinions = [...new Set([...(state.vigormortisRetainedMinions ?? []), Number(playerIndex)])];
  state.showCard = {
    title: "Vigormortis Reminder",
    icon: "warning",
    text: `${state.names[playerIndex]} keeps the ${S().C[state.assignments[playerIndex]]?.name ?? "Minion"} ability while the Vigormortis lives. Manually choose and track 1 Townsfolk neighbour as poisoned; make that player healthy when no living Vigormortis remains.`
  };
}

function getDrunkBelievedRoleId(playerIndex) {
  if (!isTroubleBrewingDrunk(playerIndex)) return "";
  return state.drunkBelievedRoles?.[playerIndex] ?? "";
}

function getOutOfPlayTownsfolk() {
  if (state.scriptId !== "tb") return [];
  const assignedRoles = new Set(Object.values(state.assignments));
  return Object.values(TB.C).filter(role => role.type === "townsfolk" && !assignedRoles.has(role.id));
}

function getTroubleBrewingDrunkIndexes() {
  if (state.scriptId !== "tb") return [];
  return Object.entries(state.assignments)
    .filter(([, roleId]) => roleId === "drunk")
    .map(([playerIndex]) => Number(playerIndex));
}

function hasFortuneTellerContext() {
  if (state.scriptId !== "tb") return false;
  return Object.values(state.assignments).includes("fortuneteller")
    || getTroubleBrewingDrunkIndexes().some(playerIndex => getDrunkBelievedRoleId(playerIndex) === "fortuneteller");
}

function getEligibleRedHerringIndexes() {
  if (state.scriptId !== "tb") return [];
  return Object.keys(state.assignments)
    .map(Number)
    .filter(playerIndex => TB.C[state.assignments[playerIndex]]?.team === "good");
}

function normalizeTroubleBrewingSetupState() {
  state.drunkBelievedRoles = state.drunkBelievedRoles ?? {};
  Object.keys(state.drunkBelievedRoles).forEach(playerIndex => {
    if (!isTroubleBrewingDrunk(Number(playerIndex))) delete state.drunkBelievedRoles[playerIndex];
  });

  const eligibleBeliefs = new Set(getOutOfPlayTownsfolk().map(role => role.id));
  getTroubleBrewingDrunkIndexes().forEach(playerIndex => {
    if (!eligibleBeliefs.has(state.drunkBelievedRoles[playerIndex])) {
      delete state.drunkBelievedRoles[playerIndex];
    }
  });

  const eligibleRedHerrings = getEligibleRedHerringIndexes();
  if (
    !hasFortuneTellerContext()
    || state.redHerringIndex === null
    || state.redHerringIndex === undefined
    || !eligibleRedHerrings.includes(Number(state.redHerringIndex))
  ) {
    state.redHerringIndex = null;
  }
}

function setDrunkBelievedRole(playerIndex, roleId) {
  if (!isTroubleBrewingDrunk(playerIndex)) return;
  const isEligible = getOutOfPlayTownsfolk().some(role => role.id === roleId);
  if (isEligible) state.drunkBelievedRoles[playerIndex] = roleId;
  else delete state.drunkBelievedRoles[playerIndex];
  normalizeTroubleBrewingSetupState();
  autoSave();
  render();
}

function assignRandomDrunkBelievedRoles() {
  state.drunkBelievedRoles = {};
  const drunkPlayerIndexes = getTroubleBrewingDrunkIndexes();
  const availableBelievedRoles = shuffle(getOutOfPlayTownsfolk());
  if (availableBelievedRoles.length === 0) return;
  drunkPlayerIndexes.forEach((playerIndex, index) => {
    const believedRole = availableBelievedRoles[index % availableBelievedRoles.length];
    if (believedRole) state.drunkBelievedRoles[playerIndex] = believedRole.id;
  });
}

function setRedHerring(playerIndexValue) {
  const playerIndex = playerIndexValue === "" || playerIndexValue === null || playerIndexValue === undefined
    ? null
    : Number(playerIndexValue);
  state.redHerringIndex = getEligibleRedHerringIndexes().includes(playerIndex) ? playerIndex : null;
  autoSave();
  render();
}

function renderDrunkBeliefPicker(playerIndex) {
  if (!isTroubleBrewingDrunk(playerIndex)) return "";
  const believedRoleId = getDrunkBelievedRoleId(playerIndex);
  const options = getOutOfPlayTownsfolk().map(role =>
    `<option value="${role.id}" ${believedRoleId === role.id ? "selected" : ""}>${esc(role.name)}</option>`
  ).join("");
  return `
    <div style="margin-top:8px;padding:10px;border:1px solid var(--orange);background:rgba(243,156,18,0.08);border-radius:7px">
      <label for="drunk-belief-${playerIndex}" style="display:block;font-size:11px;font-weight:700;color:var(--orange);margin-bottom:5px">
        ASSUMED TOWNSFOLK (required)
      </label>
      <select id="drunk-belief-${playerIndex}" class="input" onchange="setDrunkBelievedRole(${playerIndex}, this.value)">
        <option value="">-- Choose an out-of-play Townsfolk --</option>
        ${options}
      </select>
      <div style="font-size:10px;color:var(--text3);margin-top:5px">This is the only role card and ability shown to the player. Tap Swap to change the actual role.</div>
    </div>
  `;
}

function renderRedHerringSetup() {
  if (!hasFortuneTellerContext()) return "";
  const options = getEligibleRedHerringIndexes().map(playerIndex => {
    const actualRole = TB.C[state.assignments[playerIndex]];
    return `<option value="${playerIndex}" ${state.redHerringIndex !== null && Number(state.redHerringIndex) === playerIndex ? "selected" : ""}>${esc(state.names[playerIndex])} — ${esc(actualRole?.name ?? "Good")}</option>`;
  }).join("");
  return `
    <div class="card" style="padding:14px;border:1px solid var(--red);background:rgba(149,27,30,0.08);margin-bottom:16px">
      <label for="red-herring-select" style="display:block;font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">FORTUNE TELLER RED HERRING (required)</label>
      <select id="red-herring-select" class="input" onchange="setRedHerring(this.value)">
        <option value="">-- Choose a good player --</option>
        ${options}
      </select>
      <div style="font-size:10px;color:var(--text3);margin-top:5px">Used as the sober truth reference even when the Drunk only believes they are the Fortune Teller.</div>
    </div>
  `;
}

function isBadMoonRisingLunatic(playerIndex) {
  return state.scriptId === "bmr" && state.assignments[playerIndex] === "lunatic";
}

function getLunaticBelievedRoleId(playerIndex) {
  if (!isBadMoonRisingLunatic(playerIndex)) return "";
  return state.lunaticBelievedRoles?.[playerIndex] ?? "";
}

function normalizeLunaticSetupState() {
  state.lunaticBelievedRoles = state.lunaticBelievedRoles ?? {};
  state.lunaticPoCharged = state.lunaticPoCharged ?? {};
  Object.keys(state.lunaticBelievedRoles).forEach(seat => {
    const believedRole = BMR.C[state.lunaticBelievedRoles[seat]];
    if (!isBadMoonRisingLunatic(Number(seat)) || believedRole?.type !== "demon") {
      delete state.lunaticBelievedRoles[seat];
      delete state.lunaticPoCharged[seat];
    }
  });
}

function setLunaticBelievedRole(playerIndex, roleId) {
  if (!isBadMoonRisingLunatic(playerIndex)) return;
  if (BMR.C[roleId]?.type === "demon") state.lunaticBelievedRoles[playerIndex] = roleId;
  else delete state.lunaticBelievedRoles[playerIndex];
  state.lunaticPoCharged[playerIndex] = false;
  normalizeLunaticSetupState();
  autoSave();
  render();
}

function clearRoleSetupForRosterChange() {
  state.rolePool = [];
  state.assignments = {};
  state.setupChoices = {};
  state.drunkBelievedRoles = {};
  state.lunaticBelievedRoles = {};
  state.lunaticPoCharged = {};
  state.redHerringIndex = null;
}

function rosterFileExtension(fileName) {
  const parts = String(fileName ?? "").toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) : "";
}

function parseCsvRows(source) {
  const rows = [[]];
  let value = "";
  let quoted = false;
  const input = String(source ?? "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      rows.at(-1).push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index++;
      rows.at(-1).push(value);
      rows.push([]);
      value = "";
    } else value += character;
  }
  rows.at(-1).push(value);
  return rows.filter(row => row.some(cell => String(cell).trim() !== ""));
}

function normalizeImportedNames(values) {
  const seen = new Set();
  return values.reduce((names, value) => {
    const name = String(value ?? "")
      .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const identity = name.normalize("NFKC").toLocaleLowerCase();
    if (!name || seen.has(identity)) return names;
    seen.add(identity);
    names.push(name);
    return names;
  }, []);
}

function parseCsvRoster(source) {
  const rows = parseCsvRows(source).map(row => row.map(cell => String(cell).trim()));
  if (!rows.length) return [];
  const headerIndex = rows[0].findIndex(cell => /^(?:(?:player\s*)?name|player|guest)$/i.test(cell));
  const firstColumnLooksNumbered = rows.slice(headerIndex >= 0 ? 1 : 0).every(row => /^\d+$/.test(row[0] ?? ""));
  const nameColumn = headerIndex >= 0 ? headerIndex : (firstColumnLooksNumbered ? 1 : 0);
  return normalizeImportedNames(rows.slice(headerIndex >= 0 ? 1 : 0).map(row => row[nameColumn]));
}

const ROSTER_IMPORT_MODELS = Object.freeze([
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash"
]);

async function extractPlayerNamesWithGemini(file) {
  const apiKey = String(window.ROSTER_DISPATCH_CONFIG?.geminiApiKey ?? "").trim();
  if (!apiKey) throw new Error("Roster import is not configured on this deployment.");
  const extension = rosterFileExtension(file.name);
  const isImage = ["png", "jpg", "jpeg"].includes(extension);
  const data = isImage
    ? await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? "").split(",").at(-1));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the roster file."));
      reader.readAsDataURL(file);
    })
    : await file.text();
  const prompt = 'Extract every player name. Return JSON only: {"names":["Name One","Name Two"]}. Keep source order; omit headings, seat numbers, emails, phones, blanks, and duplicates.';
  const parts = isImage
    ? [{ text: prompt }, { inlineData: { mimeType: extension === "png" ? "image/png" : "image/jpeg", data } }]
    : [{ text: `${prompt}\n\nFILE_CONTENTS:\n${data}` }];
  let lastError = null;
  for (const modelId of ROSTER_IMPORT_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0, responseMimeType: "application/json" } })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `${modelId} returned HTTP ${response.status}`);
      const text = payload?.candidates?.[0]?.content?.parts?.map(part => part?.text ?? "").join("") ?? "";
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);
      if (!Array.isArray(parsed?.names)) throw new Error(`${modelId} did not return a names array.`);
      return normalizeImportedNames(parsed.names);
    } catch (error) {
      lastError = error;
      console.warn(`Roster import model ${modelId} failed; trying the next available model.`, error);
    }
  }
  throw lastError ?? new Error("No roster import model was available.");
}

function applyImportedPlayerNames(names) {
  const script = S();
  const minimumPlayers = script.playerLimits?.min ?? 5;
  const maximumPlayers = script.playerLimits?.max ?? 20;
  const wasTrimmed = names.length > maximumPlayers;
  const imported = names.slice(0, maximumPlayers);
  if (!imported.length) throw new Error("No player names were found in that file.");
  state.playerCount = Math.max(minimumPlayers, imported.length);
  state.names = [...imported];
  while (state.names.length < state.playerCount) state.names.push("");
  state.dist = { ...(script.DIST[state.playerCount] || { t: 0, o: 0, m: 0, d: 1 }) };
  clearRoleSetupForRosterChange();
  state.screen = "names";
  autoSave();
  showToast(wasTrimmed ? `Imported the first ${maximumPlayers} names.` : `Imported ${imported.length} player${imported.length === 1 ? "" : "s"}.`, "success");
}

async function handlePlayerImportFile(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (input) input.value = "";
  if (!file) return;
  const extension = rosterFileExtension(file.name);
  if (!["csv", "png", "jpg", "jpeg"].includes(extension)) {
    showToast("Choose a CSV, PNG, JPG, or JPEG roster file.", "error");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast("The roster file must be 8 MB or smaller.", "error");
    return;
  }
  const operation = ++rosterImportOperation;
  const importedForScript = state.scriptId;
  state.playerImportBusy = true;
  render();
  try {
    const names = await extractPlayerNamesWithGemini(file);
    if (operation !== rosterImportOperation || state.scriptId !== importedForScript) return;
    state.playerImportBusy = false;
    applyImportedPlayerNames(names);
  } catch (error) {
    if (operation !== rosterImportOperation || state.scriptId !== importedForScript) return;
    state.playerImportBusy = false;
    showToast(error?.message ? `Roster import failed: ${error.message}` : "Roster import failed.", "error");
  }
}

function renderLunaticBeliefPicker(playerIndex) {
  if (!isBadMoonRisingLunatic(playerIndex)) return "";
  const believedRoleId = getLunaticBelievedRoleId(playerIndex);
  const options = Object.values(BMR.C)
    .filter(role => role.type === "demon")
    .map(role => `<option value="${role.id}" ${believedRoleId === role.id ? "selected" : ""}>${esc(role.name)}</option>`)
    .join("");
  return `
    <div style="margin-top:8px;padding:10px;border:1px solid var(--orange);background:rgba(243,156,18,0.08);border-radius:7px">
      <label for="lunatic-belief-${playerIndex}" style="display:block;font-size:11px;font-weight:700;color:var(--orange);margin-bottom:5px">BELIEVED DEMON (required)</label>
      <select id="lunatic-belief-${playerIndex}" class="input" onchange="setLunaticBelievedRole(${playerIndex}, this.value)">
        <option value="">-- Choose the Demon shown to this player --</option>
        ${options}
      </select>
      <div style="font-size:10px;color:var(--text3);margin-top:5px">The private reveal shows this Demon character and evil alignment; the Grimoire keeps the actual Lunatic.</div>
    </div>
  `;
}

function rebuildGoodRolePoolForSetup() {
  const characters = S().C;
  const evilRoles = state.rolePool.filter(roleId => ["minion", "demon"].includes(characters[roleId]?.type));
  const distribution = getSetupAdjustedDistribution(state.dist, evilRoles);
  const selected = new Set(evilRoles);
  const chooseGoodRoles = (type, count) => {
    const retained = state.rolePool.filter(roleId => characters[roleId]?.type === type && !selected.has(roleId));
    const available = shuffle(Object.keys(characters).filter(roleId => characters[roleId]?.type === type && !selected.has(roleId) && !retained.includes(roleId)));
    const chosen = [...retained, ...available].slice(0, count);
    chosen.forEach(roleId => selected.add(roleId));
    return chosen;
  };
  const townsfolk = chooseGoodRoles("townsfolk", distribution.t);
  const outsiders = chooseGoodRoles("outsider", distribution.o);
  state.rolePool = [...townsfolk, ...outsiders, ...evilRoles];
  state.assignments = Object.fromEntries(Array.from({ length: state.playerCount }, (_, index) => [index, ""]));
  state.drunkBelievedRoles = {};
  state.redHerringIndex = null;
}

function applyGodfatherOutsiderDelta(context = {}) {
  const delta = Number(context.delta);
  if (state.scriptId !== "bmr" || !state.rolePool.includes("godfather") || !validGodfatherOutsiderDeltas().includes(delta)) {
    render();
    return;
  }
  state.setupChoices.godfatherOutsiderDelta = delta;
  rebuildGoodRolePoolForSetup();
  autoSave();
  showToast("Godfather setup updated. Reassign the refreshed character pool.", "success");
}

function requestGodfatherOutsiderDelta(delta) {
  const normalizedDelta = Number(delta);
  if (!validGodfatherOutsiderDeltas().includes(normalizedDelta)) return;
  ensureSetupChoices();
  if (Number(state.setupChoices.godfatherOutsiderDelta) === normalizedDelta) return;
  const hasAssignments = Object.values(state.assignments).some(Boolean);
  if (!hasAssignments) {
    applyGodfatherOutsiderDelta({ delta: normalizedDelta });
    return;
  }
  state.confirm = {
    msg: "Changing the Godfather setup choice refreshes the good-character pool and clears current seat assignments. Continue?",
    onYes: "applyGodfatherOutsiderDelta",
    context: { delta: normalizedDelta }
  };
  render();
}

function renderScriptSetupChoices() {
  if (state.scriptId !== "bmr" || !state.rolePool.includes("godfather")) return "";
  ensureSetupChoices();
  const selectedDelta = Number(state.setupChoices.godfatherOutsiderDelta);
  const validDeltas = validGodfatherOutsiderDeltas();
  const options = validDeltas.map(delta => `
    <button type="button" class="btn-sm ${selectedDelta === delta ? "is-selected" : ""}"
      aria-pressed="${selectedDelta === delta}"
      onclick="requestGodfatherOutsiderDelta(${delta})">
      ${delta < 0 ? "1 fewer Outsider / 1 extra Townsfolk" : "1 extra Outsider / 1 fewer Townsfolk"}
    </button>
  `).join("");
  return `
    <section class="card setup-choice-card" aria-labelledby="godfather-setup-title">
      <h3 id="godfather-setup-title">Godfather setup</h3>
      <p>Choose which legal Outsider adjustment applies to this game.</p>
      <div class="setup-choice-options">${options}</div>
    </section>
  `;
}

function renderRolesScreen() {
  if (S().setupMode === "physical-cards") {
    return renderPhysicalRoleEntryScreen();
  }

  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
  const s = S();
  const chars = s.C;

  let playerRows = "";
  for (let i = 0; i < state.playerCount; i++) {
    const roleId = state.assignments[i];
    const c = chars[roleId];
    const isAssigned = !!c;

    let roleDisplay = "";
    if (isAssigned) {
      const colors = roleColors(c);
      const believedRole = chars[getDrunkBelievedRoleId(i)];
      roleDisplay = `
        <div style="display:flex;align-items:center;gap:8px;background:${colors.bg};border:1px solid ${colors.bdr}44;padding:4px 8px;border-radius:6px">
          ${renderRoleImage(c.id, c.type, 20)}
          <span style="font-size:12px;font-weight:700;color:${colors.txt}">${believedRole ? `Drunk (${esc(believedRole.name)})` : esc(c.name)}</span>
          <span style="font-size:9px;text-transform:uppercase;color:var(--text3)">${c.type}</span>
        </div>
      `;
    } else {
      roleDisplay = `<span style="font-size:12px;color:var(--text3);font-style:italic">Unassigned</span>`;
    }

    playerRows += `
      <div style="padding:12px 16px;background:var(--surface2);border-radius:8px;border:1px solid ${isTroubleBrewingDrunk(i) && !getDrunkBelievedRoleId(i) ? 'var(--orange)' : 'var(--border)'};margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="seat-num" style="background:${isAssigned ? roleColors(c).bdr : 'var(--border)'};border:none">${i + 1}</div>
            <span style="font-weight:600;font-size:14px;color:var(--text)">${esc(state.names[i])}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            ${roleDisplay}
            <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px" onclick="editPlayerRole(${i})">
              ${isAssigned ? `${iconSvg("swap", 15)} Swap` : `${iconSvg("check", 15)} Assign`}
            </button>
          </div>
        </div>
        ${renderDrunkBeliefPicker(i)}
        ${renderLunaticBeliefPicker(i)}
      </div>
    `;
  }

  // Render pool stats
  const poolCount = state.rolePool.length;
  const assignedCount = Object.keys(state.assignments).filter(k => state.assignments[k] !== "").length;
  const setupErrors = validateRoleSetup();
  const missingDrunkBeliefs = getTroubleBrewingDrunkIndexes().filter(playerIndex => !getDrunkBelievedRoleId(playerIndex));
  const missingRedHerring = hasFortuneTellerContext() && state.redHerringIndex === null;
  const canFinalize = setupErrors.length === 0 && missingDrunkBeliefs.length === 0 && !missingRedHerring;

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Role Assignment</h2>
          <p style="color:var(--text3);font-size:13px">Distribute role tokens to the roster.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn-outline" style="padding:6px 12px;font-size:11px" onclick="randomizeUnselectedAssignments()">${iconSvg("dice", 16)} Randomize Unselected</button>
          <button class="btn-outline" style="padding:6px 12px;font-size:11px" onclick="randomizeAssignments()">${iconSvg("shuffle", 16)} Randomize All</button>
        </div>
      </div>

      <!-- Role Pool Display Card -->
      <div class="card" style="padding:14px;border-radius:12px;margin-bottom:16px;background:rgba(0,0,0,0.1)">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:10px">
          <span>Target Pool (${poolCount} Roles Selected)</span>
          <button class="btn-link" style="color:${s.color}" onclick="openPoolEditor()">${iconSvg("edit", 15)} Customize Pool</button>
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

      ${renderScriptSetupChoices()}
      <!-- Player List -->
      <div style="margin-bottom:24px">
        ${playerRows}
      </div>

      ${renderRedHerringSetup()}
      ${missingDrunkBeliefs.length > 0 ? `<div class="warn warn-orange" role="alert">Choose an out-of-play assumed Townsfolk for every Drunk before finalizing.</div>` : ""}
      ${missingRedHerring ? `<div class="warn warn-red" role="alert">Choose the Fortune Teller's Red Herring before finalizing.</div>` : ""}
      ${setupErrors.length > 0 ? `<div class="warn warn-red" role="alert">${setupErrors.map(esc).join(" ")}</div>` : ""}
      <button class="btn btn-primary" ${canFinalize ? "" : 'disabled'} onclick="finalizeGrimoire()">
        ${iconSvg("book", 18)} Finalize Grimoire
      </button>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="goToScreen('names')">${iconSvg("back", 17)} Back to Roster</button>
    </div>
  `;
}

function getRoleUsage(roleId, ignoredPlayerIndex = -1) {
  return Object.entries(state.assignments).filter(([playerIndex, assignedRoleId]) => {
    return Number(playerIndex) !== ignoredPlayerIndex && assignedRoleId === roleId;
  }).length;
}

function renderPhysicalRoleEntryScreen() {
  const s = S();
  const playerIndex = Math.max(0, Math.min(state.playerCount - 1, state.roleEntryIndex ?? 0));
  const assignedCount = Object.values(state.assignments).filter(Boolean).length;
  const currentRoleId = state.assignments[playerIndex] ?? "";
  const sortedRoles = Object.values(s.C).sort((firstRole, secondRole) => firstRole.name.localeCompare(secondRole.name));
  const searchQuery = state.uwSearchQuery ?? "";
  const roleButtons = sortedRoles.map(role => {
    const usedQuantity = getRoleUsage(role.id);
    const remainingQuantity = role.quantity - usedQuantity;
    const isUnavailable = remainingQuantity <= 0 && currentRoleId !== role.id;
    const colors = roleColors(role);
    const matchesSearch = searchQuery === "" || `${role.name} ${roleCategoryLabel(role)}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return `
      <button class="uw-role-option" data-search="${esc(`${role.name} ${roleCategoryLabel(role)}`.toLowerCase())}"
        style="border-color:${colors.bdr}55;background:${colors.bg}"
        ${isUnavailable ? "disabled" : ""}
        ${matchesSearch ? "" : "hidden"}
        onclick="assignPhysicalRole(${playerIndex}, '${role.id}')">
        <span style="display:flex;align-items:center;gap:8px;min-width:0">
          ${renderRoleImage(role.id, role.type, 24)}
          <span style="min-width:0">
            <strong style="display:block;color:${colors.txt};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(role.name)}</strong>
            <span style="font-size:9px;color:var(--text3);text-transform:uppercase">${esc(roleCategoryLabel(role))}</span>
          </span>
        </span>
        <span style="font-size:10px;color:${isUnavailable ? "var(--red)" : "var(--text3)"};white-space:nowrap">${remainingQuantity} left</span>
      </button>
    `;
  }).join("");

  const assignmentSummary = Array.from({ length: state.playerCount }, (_, index) => {
    const role = s.C[state.assignments[index]];
    const colors = role ? roleColors(role) : null;
    return `
      <button class="uw-seat-summary ${index === playerIndex ? "active" : ""}" onclick="editPhysicalRole(${index})">
        <span class="seat-num" style="background:${colors?.bdr ?? "var(--border)"};border:none">${index + 1}</span>
        <span style="text-align:left;min-width:0;flex:1">
          <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state.names[index])}</strong>
          <span style="font-size:10px;color:${colors?.txt ?? "var(--text3)"}">${role ? esc(role.name) : "Not recorded"}</span>
        </span>
      </button>
    `;
  }).join("");

  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:16px">
        <div>
          <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Record Physical Cards</h2>
          <p style="color:var(--text3);font-size:13px">Moderator entry only. Record each dealt card clockwise.</p>
        </div>
        <span class="phase-badge warn-red">${assignedCount}/${state.playerCount}</span>
      </div>

      <div class="card" style="padding:16px;border-color:${s.color}55">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;font-weight:700">Seat ${playerIndex + 1} of ${state.playerCount}</div>
        <h3 style="font-size:22px;margin:3px 0 12px">${esc(state.names[playerIndex])}</h3>
        <label for="uw-role-search" style="display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px">SEARCH ROLES</label>
        <input id="uw-role-search" class="input" type="search" placeholder="Role name or category..." value="${esc(searchQuery)}" oninput="filterUltimateRoles(this.value)">
        <div id="uw-role-options" class="uw-role-list">${roleButtons}</div>
      </div>

      <div class="card" style="padding:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px">CLOCKWISE ROSTER — TAP TO EDIT</div>
        <div class="uw-seat-grid">${assignmentSummary}</div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-outline" style="flex:1;margin:0" onclick="previousPhysicalRole()">${iconSvg("back", 17)} Previous</button>
        <button class="btn btn-primary" style="flex:2;margin:0" ${assignedCount < state.playerCount ? "disabled" : ""} onclick="finalizeGrimoire()">${iconSvg("book", 18)} Finalize Roles</button>
      </div>
      <button class="btn-outline" style="margin-top:10px;width:100%" onclick="goToScreen('names')">${iconSvg("back", 17)} Back to Roster</button>
    </div>
  `;
}

function filterUltimateRoles(searchValue) {
  state.uwSearchQuery = searchValue;
  const normalizedSearch = String(searchValue ?? "").trim().toLowerCase();
  document.querySelectorAll(".uw-role-option").forEach(option => {
    option.hidden = normalizedSearch !== "" && !option.dataset.search.includes(normalizedSearch);
  });
}

function assignPhysicalRole(playerIndex, roleId) {
  const role = S().C[roleId];
  if (!role || getRoleUsage(roleId, playerIndex) >= role.quantity) return;
  state.assignments[playerIndex] = roleId;
  state.rolePool = Object.values(state.assignments).filter(Boolean);
  state.roleEntryIndex = Math.min(state.playerCount - 1, playerIndex + 1);
  autoSave();
  render();
}

function editPhysicalRole(playerIndex) {
  state.roleEntryIndex = playerIndex;
  autoSave();
  render();
}

function previousPhysicalRole() {
  state.roleEntryIndex = Math.max(0, (state.roleEntryIndex ?? 0) - 1);
  autoSave();
  render();
}

function randomizeAssignments() {
  const shuffledPool = shuffle(state.rolePool);
  for (let i = 0; i < state.playerCount; i++) {
    state.assignments[i] = shuffledPool[i] || "";
  }
  normalizeTroubleBrewingSetupState();
  assignRandomDrunkBelievedRoles();
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
  autoSave();
  render();
}

function randomizeUnselectedAssignments() {
  const remainingPool = [...state.rolePool];
  for (let i = 0; i < state.playerCount; i++) {
    const assignedRoleId = state.assignments[i];
    if (!assignedRoleId) continue;
    const poolIndex = remainingPool.indexOf(assignedRoleId);
    if (poolIndex >= 0) remainingPool.splice(poolIndex, 1);
  }
  const shuffledRemainder = shuffle(remainingPool);
  let remainderIndex = 0;
  for (let i = 0; i < state.playerCount; i++) {
    if (state.assignments[i]) continue;
    state.assignments[i] = shuffledRemainder[remainderIndex++] || "";
  }
  normalizeTroubleBrewingSetupState();
  assignRandomDrunkBelievedRoles();
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
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
    const currentRole = state.assignments[playerIdx];
    const assignedElsewhere = Object.entries(state.assignments).filter(([index, assignedRoleId]) => Number(index) !== Number(playerIdx) && assignedRoleId === rid).length;
    const unavailableOutsidePool = !currentRole && !inPool;
    const availableCopies = state.rolePool.filter(roleId => roleId === rid).length;
    const lacksAvailableCopy = assignedElsewhere >= availableCopies;
    const badge = inPool ? `<span style="font-size:9px;background:rgba(255,255,255,0.05);color:var(--text3);padding:2px 4px;border-radius:3px">Pool</span>` : "";

    optionsHtml += `
      <button class="btn" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);justify-content:space-between;margin-bottom:6px" ${lacksAvailableCopy || unavailableOutsidePool ? "disabled" : ""}
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
    icon: "user",
    html: `Select a character token to place in ${esc(state.names[playerIdx])}'s grimoire slot:<br><br><div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column">${optionsHtml}</div>`
  };
  render();
}

function assignRoleToPlayer(pIdx, rid) {
  if (!S().C[rid]) return;
  const assignedElsewhere = Object.entries(state.assignments).filter(([index, assignedRoleId]) => Number(index) !== Number(pIdx) && assignedRoleId === rid).length;
  const availableCopies = state.rolePool.filter(roleId => roleId === rid).length;
  if (assignedElsewhere >= availableCopies) {
    showToast("Every selected copy of that character is already assigned.", "error");
    return;
  }
  const oldRole = state.assignments[pIdx];
  if (!oldRole && !state.rolePool.includes(rid)) {
    showToast("Add that character through Customize Pool before assigning it to an empty seat.", "error");
    return;
  }
  state.assignments[pIdx] = rid;
  if (oldRole !== rid) {
    state.drunkBelievedRoles = state.drunkBelievedRoles ?? {};
    delete state.drunkBelievedRoles[pIdx];
    state.lunaticBelievedRoles = state.lunaticBelievedRoles ?? {};
    state.lunaticPoCharged = state.lunaticPoCharged ?? {};
    delete state.lunaticBelievedRoles[pIdx];
    delete state.lunaticPoCharged[pIdx];
  }
  // Replacing an assigned token also replaces that token in the pool.
  if (!state.rolePool.includes(rid)) {
    const oldIdx = state.rolePool.indexOf(oldRole);
    if (oldIdx >= 0) {
      state.rolePool[oldIdx] = rid;
    }
  }
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
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
    const selectedCount = state.rolePool.filter(roleId => roleId === rid).length;
    const copyControl = state.playerCount >= 19 && c.type === "minion"
      ? `<select class="input" aria-label="${esc(c.name)} copies" style="width:58px;padding:3px 5px;font-size:12px" onchange="setPoolRoleCount('${rid}', this.value)"><option value="0" ${selectedCount === 0 ? "selected" : ""}>0</option><option value="1" ${selectedCount === 1 ? "selected" : ""}>1</option><option value="2" ${selectedCount >= 2 ? "selected" : ""}>2</option></select>`
      : `<input type="checkbox" aria-label="Include ${esc(c.name)} in the role pool" ${selected ? 'checked' : ''} onchange="togglePoolRole('${rid}', this.checked)">`;
    
    listHtml += `
      <label class="pool-role-option">
        <span style="display:flex;align-items:center;gap:6px">
          ${renderRoleImage(c.id, c.type, 18)}
          <span style="color:${TYPE_CLR[c.type].txt};font-size:13px">${c.name}</span>
        </span>
        ${copyControl}
      </label>
    `;
  });

  state.showCard = {
    title: "Customize Role Pool",
    icon: "edit",
    html: `Toggle roles that should be present in tonight's distribution:<br><br><div style="max-height:250px;overflow-y:auto;text-align:left">${listHtml}</div>`
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
function showToast(message, tone = "info") {
  state.toast = { message, tone };
  render();
  window.clearTimeout(showToast._timerId);
  showToast._timerId = window.setTimeout(() => {
    if (state.toast?.message === message) {
      state.toast = null;
      render();
    }
  }, 4500);
}

function setPoolRoleCount(rid, value) {
  const count = Math.max(0, Math.min(2, Number.parseInt(value, 10) || 0));
  state.rolePool = [
    ...state.rolePool.filter(roleId => roleId !== rid),
    ...Array.from({ length: count }, () => rid)
  ];
  autoSave();
}

function createSessionId() {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch (error) {}
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const EMAIL_OUTBOX_KEY = "botc_storyteller_email_outbox_v1";

function readEmailOutbox() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMAIL_OUTBOX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeEmailOutbox(entries) {
  try {
    if (entries.length > 0) localStorage.setItem(EMAIL_OUTBOX_KEY, JSON.stringify(entries.slice(-20)));
    else localStorage.removeItem(EMAIL_OUTBOX_KEY);
  } catch (error) {}
}

function storePendingEmail(instanceKey, email, handoverUrls) {
  const entries = readEmailOutbox().filter(item => item.instanceKey !== instanceKey);
  entries.push({ instanceKey, email, handoverUrls: Array.isArray(handoverUrls) ? handoverUrls : [] });
  writeEmailOutbox(entries);
}

function removePendingEmail(instanceKey) {
  writeEmailOutbox(readEmailOutbox().filter(item => item.instanceKey !== instanceKey));
}

function emailEventInstanceKey(eventType, source = state) {
  const sessionId = String(source.sessionId || "unstarted-session");
  if (eventType === "night-complete") return `${sessionId}:${eventType}:${source.dayNum}`;
  return `${sessionId}:${eventType}`;
}

function getConfiguredEmailEndpoint() {
  const configuredValue = String(window.GRIMOIRE_RUNTIME_CONFIG?.emailEndpoint ?? "").trim();
  if (!configuredValue) return "";
  try {
    const endpoint = new URL(configuredValue, window.location?.href);
    const isLocalDevelopment = endpoint.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    return endpoint.protocol === "https:" || isLocalDevelopment ? endpoint.href : "";
  } catch (error) {
    return "";
  }
}

function isSourcePlayerPubliclyAlive(source, index) {
  return source.alive?.[index] !== false
    && !(source.scriptId === "bmr" && source.registeredDead?.[index] === true);
}

function buildEmailPlayers(source = state) {
  const script = scriptById(source.scriptId);
  return Array.from({ length: source.playerCount }, (_, index) => {
    const roleId = source.assignments[index];
    const role = script.C[roleId];
    const believedRole = script.C[source.drunkBelievedRoles?.[index]];
    return {
      seat: index + 1,
      name: source.names[index],
      role: believedRole ? `Drunk (shown ${believedRole.name})` : (role?.name ?? "Not recorded"),
      alignment: source.scriptId === "uw"
        ? String(role?.team ?? role?.category ?? role?.type ?? "Unknown").replace(/\b\w/g, letter => letter.toUpperCase())
        : (playerAlignment(index, source) === "evil" ? "Evil" : "Good"),
      alive: isSourcePlayerPubliclyAlive(source, index)
    };
  });
}

function buildNightEmailResults(source = state) {
  const script = scriptById(source.scriptId);
  const deaths = [...new Set(source.deathsLastNight ?? [])]
    .map(index => source.names[index])
    .filter(Boolean);
  const actionLines = (source.nightLog ?? [])
    .filter(action => Number(action.nightNumber ?? source.dayNum) === source.dayNum)
    .map(action => {
      const roleName = script.C[action.roleId]?.name ?? action.roleId;
      if (action.skipped === true) return `${roleName}: left unresolved for manual follow-up`;
      const targetIndexes = Array.isArray(action.targetIndexes)
        ? action.targetIndexes
        : (Number.isInteger(action.targetIndex) ? [action.targetIndex] : []);
      const targets = targetIndexes.map(index => source.names[index]).filter(Boolean).join(", ") || "No player target";
      const character = action.characterId ? `; character: ${script.C[action.characterId]?.name ?? action.characterId}` : "";
      return `${roleName}: ${targets}${character}${action.fakeNoEffect ? " (no effect)" : ""}`;
    });
  return [
    {
      label: "Morning announcement",
      value: deaths.length > 0 ? `${deaths.join(", ")} died during the night.` : "No deaths were recorded during the night.",
      tone: deaths.length > 0 ? "bad" : "good"
    },
    ...(actionLines.length > 0 ? [{ label: "Recorded actions", value: actionLines.join("\n"), tone: "neutral" }] : [])
  ];
}

function buildWinnerEmailDetails(source = state) {
  const script = scriptById(source.scriptId);
  if (source.scriptId === "uw") {
    return (source.winnerSelection ?? []).map(winnerId => {
      if (String(winnerId).startsWith("team:")) {
        const groupId = String(winnerId).slice(5);
        return { name: script.winnerGroups?.find(group => group.id === groupId)?.label ?? winnerId };
      }
      const playerIndex = Number(String(winnerId).slice(7));
      const role = script.C[source.assignments?.[playerIndex]];
      return { name: Number.isInteger(playerIndex) && role ? `${source.names[playerIndex]} — ${role.name}` : winnerId };
    });
  }
  return [{
    name: source.winTeam === "good" ? "Good team" : "Evil team",
    detail: source.winTeam === "good" ? "The Storyteller declared Good victorious." : "The Storyteller declared Evil victorious."
  }];
}

async function buildEmailHandover(eventType, source = getSerializableState()) {
  if (eventType === "game-end" || typeof getHandoffSnapshot !== "function") return null;
  try {
    const snapshot = getHandoffSnapshot(source);
    const urls = typeof buildHandoffQrParts === "function"
      ? await buildHandoffQrParts(snapshot)
      : (typeof buildHandoffUrl === "function" ? [await buildHandoffUrl(snapshot)] : []);
    const limits = window.BOTCEmail?.EMAIL_LIMITS ?? {};
    const safeUrls = urls.length <= Number(limits.maxHandoverUrls ?? 12)
      && urls.every(url => String(url).length <= Number(limits.maxHandoverUrlChars ?? 2200))
      && urls.reduce((total, url) => total + String(url).length, 0) <= Number(limits.maxHandoverUrlTotalChars ?? 12000)
      ? urls
      : [];
    const safeJson = JSON.stringify(snapshot, null, 2).length <= Number(limits.maxHandoverJsonChars ?? 12000)
      ? snapshot
      : null;
    return {
      urls: safeUrls,
      ...(safeUrls.length === 1 ? { url: safeUrls[0] } : {}),
      json: safeJson
    };
  } catch (error) {
    console.error("Could not prepare handover details for email.", error);
    return null;
  }
}

async function deliverBuiltEmail(email, handoverUrls = []) {
  const endpoint = getConfiguredEmailEndpoint();
  if (endpoint) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 15000) : null;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(controller ? { signal: controller.signal } : {}),
        body: JSON.stringify({
          eventType: email.eventType,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey: email.idempotencyKey,
          handoverUrls: Array.isArray(email.handoverUrls) ? email.handoverUrls : handoverUrls
        })
      });
      return response.ok;
    } catch (error) {
      console.error("Email endpoint request failed.", error);
      return false;
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }
  const dispatch = window.ROSTER_DISPATCH_CONFIG ?? {};
  const token = String(dispatch.token ?? "").trim();
  const owner = String(dispatch.owner ?? "AkshDesai04").trim();
  const repo = String(dispatch.repo ?? "BOTC_Master").trim();
  if (token && owner && repo) {
    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dispatches`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({
          event_type: "send-game-email",
          client_payload: {
            eventType: email.eventType,
            subject: email.subject,
            html: email.html,
            text: email.text,
            idempotencyKey: email.idempotencyKey,
            handoverUrls: Array.isArray(email.handoverUrls) ? email.handoverUrls : handoverUrls
          }
        })
      });
      return response.ok;
    } catch (error) {
      console.error("GitHub email dispatch failed.", error);
      return false;
    }
  }
  return false;
}

const emailDispatchesInFlight = new Set();

async function dispatchGameEmail(eventType) {
  if (!window.BOTCEmail?.EMAIL_EVENT_TYPES.includes(eventType)) return false;
  if (!getConfiguredEmailEndpoint() && !String(window.ROSTER_DISPATCH_CONFIG?.token ?? "").trim()) return false;
  const source = getSerializableState();
  const sourceStateRef = state;
  const sourceSessionId = source.sessionId;
  const script = scriptById(source.scriptId);
  const instanceKey = emailEventInstanceKey(eventType, source);
  state.emailEventTimes = state.emailEventTimes ?? {};
  state.emailDispatchedKeys = state.emailDispatchedKeys ?? [];
  state.pendingEmails = state.pendingEmails ?? [];
  if (state.emailDispatchedKeys.includes(instanceKey)) return true;
  if (emailDispatchesInFlight.has(instanceKey)) return false;
  const occurredAt = state.emailEventTimes[instanceKey] ?? new Date().toISOString();
  state.emailEventTimes[instanceKey] = occurredAt;
  const emailInput = {
    eventType,
    script: { id: source.scriptId, name: script.name },
    session: {
      id: sourceSessionId,
      phase: source.phase === "night" ? `Night ${source.dayNum}` : `Day ${source.dayNum}`,
      dayNumber: source.dayNum,
      nightNumber: source.dayNum,
      playerCount: source.playerCount,
      occurredAt
    },
    players: buildEmailPlayers(source),
    results: eventType === "night-complete" ? buildNightEmailResults(source) : [],
    winners: eventType === "game-end" ? buildWinnerEmailDetails(source) : [],
    summary: eventType === "night-complete"
      ? "The Storyteller completed the night sequence. Review the private record before making public announcements."
      : ""
  };
  emailDispatchesInFlight.add(instanceKey);
  try {
    const handover = await buildEmailHandover(eventType, source);
    const email = window.BOTCEmail.buildEmail({ ...emailInput, handover });
    const delivered = await deliverBuiltEmail(email, handover?.urls ?? []);
    const sourceSessionIsActive = state === sourceStateRef && state.sessionId === sourceSessionId;
    if (delivered) {
      if (sourceSessionIsActive) {
        removePendingEmail(instanceKey);
        state.emailDispatchedKeys = [...new Set([...(state.emailDispatchedKeys ?? []), instanceKey])];
        state.pendingEmails = (state.pendingEmails ?? []).filter(item => item.instanceKey !== instanceKey);
        autoSave();
        const eventLabel = eventType === "night-complete" ? "Night Complete" : eventType === "game-start" ? "Game Start" : "Game End";
        showToast(`${eventLabel} email sent.`, "success");
      }
      return true;
    }
    if (sourceSessionIsActive) {
      storePendingEmail(instanceKey, {
        eventType: email.eventType,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: email.idempotencyKey
      }, handover?.urls ?? []);
      if (!state.pendingEmails.some(item => item.instanceKey === instanceKey)) {
        state.pendingEmails.push({ eventType, instanceKey, occurredAt });
      }
      autoSave();
      showToast("Email delivery failed and was saved for retry.", "error");
    }
    return false;
  } catch (error) {
    console.error("Could not prepare or deliver the game email.", error);
    if (state === sourceStateRef && state.sessionId === sourceSessionId) {
      showToast("The email could not be prepared. Game progress is still saved.", "error");
    }
    return false;
  } finally {
    emailDispatchesInFlight.delete(instanceKey);
  }
}

let pendingEmailRetry = null;

function retryPendingEmails() {
  if (pendingEmailRetry) return pendingEmailRetry;
  const retryStateRef = state;
  const retrySessionId = state.sessionId;
  pendingEmailRetry = (async () => {
    for (const item of readEmailOutbox()) {
      if (emailDispatchesInFlight.has(item.instanceKey)) continue;
      emailDispatchesInFlight.add(item.instanceKey);
      try {
        const legacyUrls = item.handoverUrl ? [item.handoverUrl] : [];
        const delivered = await deliverBuiltEmail(item.email, item.handoverUrls ?? legacyUrls);
        if (state !== retryStateRef || state.sessionId !== retrySessionId) return false;
        if (!delivered) continue;
        state.emailDispatchedKeys = [...new Set([...(state.emailDispatchedKeys ?? []), item.instanceKey])];
        state.pendingEmails = (state.pendingEmails ?? []).filter(pending => pending.instanceKey !== item.instanceKey);
        removePendingEmail(item.instanceKey);
      } finally {
        emailDispatchesInFlight.delete(item.instanceKey);
      }
    }
    if (state !== retryStateRef || state.sessionId !== retrySessionId) return false;
    autoSave();
    showToast(state.pendingEmails.length === 0 ? "Pending emails sent." : "Some emails still need delivery configuration.", state.pendingEmails.length === 0 ? "success" : "error");
    return state.pendingEmails.length === 0;
  })().finally(() => {
    pendingEmailRetry = null;
  });
  return pendingEmailRetry;
}

function finalizeGrimoire() {
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
  const setupErrors = validateRoleSetup();
  const hasMissingBelief = getTroubleBrewingDrunkIndexes().some(playerIndex => !getDrunkBelievedRoleId(playerIndex));
  const hasMissingLunaticBelief = state.scriptId === "bmr" && Object.entries(state.assignments)
    .some(([seat, roleId]) => roleId === "lunatic" && !getLunaticBelievedRoleId(Number(seat)));
  const hasMissingRedHerring = hasFortuneTellerContext() && state.redHerringIndex === null;
  if (setupErrors.length > 0 || hasMissingBelief || hasMissingLunaticBelief || hasMissingRedHerring) {
    state.showCard = {
      title: "Setup Incomplete",
      text: setupErrors[0] || (hasMissingBelief
        ? "Every Trouble Brewing Drunk needs an out-of-play assumed Townsfolk role."
        : hasMissingLunaticBelief
          ? "Every Bad Moon Rising Lunatic needs a believed Demon character."
          : "Choose a good player as the Fortune Teller's Red Herring.")
    };
    autoSave();
    render();
    return;
  }
  // Complete initial states
  state.dayNum = 1;
  state.phase = "night";
  state.activeWakeIdx = 0;
  state.nightLog = [];
  state.revealIndex = 0;
  state.revealCovered = true;
  state.winTeam = null;
  state.winnerSelection = [];
  state.sessionId = createSessionId();
  state.emailEventTimes = {};
  state.emailDispatchedKeys = [];
  state.pendingEmails = [];
  state.poisonedIndex = null;
  state.nightProtected = [];
  state.executedTodayIndex = null;
  state.usedAbilities = {};
  state.poCharged = false;
  state.lunaticPoCharged = Object.fromEntries(Object.keys(state.lunaticBelievedRoles ?? {}).map(seat => [seat, false]));
  state.permanentlyPoisoned = {};
  state.gainedAbilities = {};
  state.fangGuJumpUsed = false;
  state.pendingMoonchildIndexes = [];
  state.vigormortisRetainedMinions = [];
  state.previousNightTargets = {};
  state.courtierEffect = null;

  // Set initial alive status
  state.alive = {};
  state.registeredDead = {};
  state.alignments = {};
  state.votes = {};
  state.ghostVotes = {};
  for (let i = 0; i < state.playerCount; i++) {
    state.alive[i] = true;
    state.alignments[i] = S().C[state.assignments[i]]?.team ?? "unknown";
    state.votes[i] = 1;
    state.ghostVotes[i] = false;
  }

  // Push initial game start log into chronicle
  state.chronicle = [
    {
      type: "system",
      title: isUltimateWerewolf() ? "The Village Sleeps" : "Tragedy Begins",
      details: isUltimateWerewolf()
        ? `A new game of <strong>${S().name}</strong> has begun with ${state.playerCount} recorded physical cards. Role interactions will be resolved by the moderator.`
        : `A new game of <strong>${S().name}</strong> has commenced at Ravenswood Bluff with ${state.playerCount} players.`,
      badgeColor: "var(--border)"
    }
  ];

  state.screen = isUltimateWerewolf() ? "game" : "reveal";
  if (isUltimateWerewolf()) state.tab = "night";
  autoSave();
  if (typeof dispatchGameEmail === "function") void dispatchGameEmail("game-start");
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4: HAND-OFF ROLE REVEAL SCREEN (`Role Reveal.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderRevealScreen() {
  const pIdx = state.revealIndex;
  if (pIdx >= state.playerCount) {
    return `
      <div class="screen fade-in reveal-cover" style="padding-top:48px;text-align:center">
        ${iconSvg("lock", 54, { label: "Private hand-off complete" })}
        <h2 style="font-family:var(--font-serif);margin:18px 0 8px">Return to the Storyteller</h2>
        <p style="color:var(--text3);font-size:13px;margin-bottom:24px">Every player has seen their character. The Storyteller can now begin the first night.</p>
        <button class="btn btn-primary" onclick="startFirstNight()">${iconSvg("moon", 18)} Start Night 1</button>
        <button class="btn btn-outline" style="margin-top:10px" onclick="previousReveal()">${iconSvg("back", 17)} Review previous player</button>
      </div>
    `;
  }
  const pName = state.names[pIdx];
  const rId = state.assignments[pIdx];
  const believedRoleId = getDrunkBelievedRoleId(pIdx);
  const believedDemonRoleId = getLunaticBelievedRoleId(pIdx);
  if (state.revealCovered !== false) {
    return `
      <div class="screen fade-in reveal-cover" style="padding-top:48px;text-align:center">
        ${iconSvg("lock", 54, { label: "Role hidden" })}
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin:18px 0 6px">Player ${pIdx + 1} of ${state.playerCount}</div>
        <h2 style="font-family:var(--font-serif);font-size:30px;margin-bottom:8px">Pass to ${esc(pName)}</h2>
        <p style="color:var(--text3);font-size:13px;margin-bottom:24px">Only this player should look at the next screen.</p>
        <button class="btn btn-primary" onclick="revealCurrentRole()">${iconSvg("eye", 18)} Reveal my character</button>
        ${pIdx > 0 ? `<button class="btn btn-outline" style="margin-top:10px" onclick="previousReveal()">${iconSvg("back", 17)} Previous player</button>` : ""}
      </div>
    `;
  }
  if ((isTroubleBrewingDrunk(pIdx) && !believedRoleId) || (isBadMoonRisingLunatic(pIdx) && !believedDemonRoleId)) {
    return `
      <div class="screen fade-in" style="padding:32px 16px;text-align:center">
        <div style="margin-bottom:14px">${iconSvg("lock", 48)}</div>
        <h2 style="font-family:var(--font-serif);margin-bottom:8px">Private role not configured</h2>
        <p style="color:var(--text3);font-size:13px;margin-bottom:20px">Return the device to the Storyteller to complete setup.</p>
        <button class="btn btn-primary" onclick="abortToGrimSetup()">Return to Storyteller Setup</button>
      </div>
    `;
  }
  const c = S().C[believedRoleId || believedDemonRoleId || rId];

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
        <button class="icon-button" onclick="abortToGrimSetup()" aria-label="Return to setup">${iconSvg("close", 19)}</button>
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
        <button class="btn btn-outline" style="flex:1;margin:0" ${pIdx === 0 ? 'disabled' : ''} onclick="previousReveal()">${iconSvg("back", 17)} Prev</button>
        <div class="phase-badge done" style="font-weight:700">${pIdx + 1} of ${state.playerCount}</div>
        <button class="btn btn-primary" style="flex:2;margin:0" onclick="nextReveal()">
          ${pIdx < state.playerCount - 1 ? `Hide &amp; pass ${iconSvg("forward", 17)}` : `Hide &amp; return ${iconSvg("lock", 17)}`}
        </button>
      </div>
    </div>
  `;
}

function revealCurrentRole() {
  state.revealCovered = false;
  autoSave();
  render();
}

function previousReveal() {
  if (state.revealIndex > 0) {
    state.revealIndex--;
    state.revealCovered = true;
    autoSave();
    render();
  }
}

function nextReveal() {
  if (state.revealIndex < state.playerCount - 1) {
    state.revealIndex++;
    state.revealCovered = true;
    autoSave();
    render();
  } else {
    state.revealIndex = state.playerCount;
    state.revealCovered = true;
    autoSave();
    render();
  }
}

function startFirstNight() {
  state.screen = "game";
  state.tab = "night";
  state.phase = "night";
  state.dayNum = 1;
  state.activeWakeIdx = 0;
  state.nightLog = [];
  autoSave();
  render();
}

function abortToGrimSetup() {
  goToScreen("roles");
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5: GUIDED NIGHT PHASE SCREEN (`Night Phase.png`)
// ══════════════════════════════════════════════════════════════════════════
const TB_INFORMATION_ROLES = new Set([
  "washerwoman", "librarian", "investigator", "chef", "empath",
  "fortuneteller", "undertaker", "ravenkeeper"
]);

function abilityUsageKey(playerIndex, roleId) {
  return `${Number(playerIndex)}:${String(roleId ?? "")}`;
}

function getActiveWakeList(nightOrder) {
  if (window.BOTCGameRules?.expandWakeList) {
    const activeWakeList = [];
    nightOrder.forEach(nightNode => {
      const recentDeaths = [...(state.deathsLastNight ?? []), ...(state.deathsToday ?? [])];
      if (
        nightNode.id === "courtier"
        && state.courtierEffect
        && Number(state.courtierEffect.expiresAfterDay) >= state.dayNum
      ) {
        const effectStartedTonight = (state.nightLog ?? []).some(action => (
          action.roleId === "courtier"
          && Number(action.nightNumber) === state.dayNum
          && action.fakeNoEffect !== true
        ));
        if (!effectStartedTonight) {
          activeWakeList.push({
            ...nightNode,
            id: "_courtier",
            sourceId: "courtier_cleanup",
            playerIndex: null,
            isDrunk: false,
            isSynthetic: true,
            isReminder: true
          });
        }
        return;
      }
      if (nightNode.id === "barber") {
        const barberIndexes = Object.entries(state.assignments)
          .filter(([seat, roleId]) => {
            const playerIndex = Number(seat);
            const hasBarberAbility = roleId === "barber"
              || (roleId === "philosopher" && state.gainedAbilities?.[playerIndex] === "barber");
            return hasBarberAbility
              && recentDeaths.includes(playerIndex)
              && !isPlayerAbilityImpaired(playerIndex, "barber");
          })
          .map(([seat]) => Number(seat));
        const demonIndex = Object.entries(state.assignments)
          .find(([seat, roleId]) => state.alive[seat] !== false && S().C[roleId]?.type === "demon")?.[0];
        if (demonIndex !== undefined) barberIndexes.forEach(barberIndex => {
          activeWakeList.push({
            ...nightNode,
            sourceId: "barber",
            playerIndex: Number(demonIndex),
            triggerPlayerIndex: barberIndex,
            isDrunk: false,
            isSynthetic: false
          });
        });
        return;
      }
      const wakeAlive = { ...state.alive };
      if (hasLivingVigormortis()) {
        (state.vigormortisRetainedMinions ?? []).forEach(seat => {
          if (state.alive[seat] === false && S().C[state.assignments[seat]]?.type === "minion") wakeAlive[seat] = true;
        });
      }
      if (["ravenkeeper", "sage", "sweetheart", "moonchild"].includes(nightNode.id)) {
        Object.entries(state.assignments).forEach(([seat, roleId]) => {
          const eligibleDeaths = nightNode.id === "moonchild"
            ? (state.pendingMoonchildIndexes ?? [])
            : (["ravenkeeper", "sage"].includes(nightNode.id) ? (state.deathsLastNight ?? []) : recentDeaths);
          if (roleId === nightNode.id && eligibleDeaths.includes(Number(seat))) {
            wakeAlive[seat] = true;
          }
        });
        Object.entries(state.gainedAbilities ?? {}).forEach(([seat, gainedRoleId]) => {
          const eligibleDeaths = ["sage"].includes(nightNode.id)
            ? (state.deathsLastNight ?? [])
            : recentDeaths;
          if (gainedRoleId === nightNode.id && eligibleDeaths.includes(Number(seat))) wakeAlive[seat] = true;
        });
      }
      const expandedNodes = window.BOTCGameRules.expandWakeList({
        script: S(),
        nightOrder: [nightNode],
        assignments: state.assignments,
        alive: wakeAlive,
        playerCount: state.playerCount
      }).map(node => ({
        ...node,
        isDrunk: isPhilosopherDrunk(node.playerIndex, node.id) || isCourtierDrunk(node.playerIndex, node.id),
        isReminder: node.isSynthetic || ["gossip", "tinker", "moonchild", "sweetheart"].includes(node.id),
        ...(["lunatic_info", "lunatic_action", "lunatic"].includes(node.sourceId)
          ? { believedDemonId: getLunaticBelievedRoleId(node.playerIndex) }
          : {})
      }));
      activeWakeList.push(...expandedNodes);
      if (state.scriptId === "sv" && !nightNode.id.startsWith("_")) {
        Object.entries(state.gainedAbilities ?? {}).forEach(([seat, gainedRoleId]) => {
          const playerIndex = Number(seat);
          const isPendingDeathTrigger = ["sage", "sweetheart"].includes(gainedRoleId)
            && wakeAlive[playerIndex] === true;
          if (
            gainedRoleId === nightNode.id
            && state.assignments[playerIndex] === "philosopher"
            && (state.alive[playerIndex] !== false || isPendingDeathTrigger)
          ) {
            activeWakeList.push({
              ...nightNode,
              sourceId: nightNode.id,
              playerIndex,
              isDrunk: false,
              isSynthetic: false,
              isPhilosopherAbility: true
            });
          }
        });
      }
      if (state.scriptId === "tb" && !nightNode.id.startsWith("_")) {
        Object.keys(state.assignments).map(Number).forEach(playerIndex => {
          if (state.alive[playerIndex] !== false && isTroubleBrewingDrunk(playerIndex) && getDrunkBelievedRoleId(playerIndex) === nightNode.id) {
            activeWakeList.push({ ...nightNode, sourceId: nightNode.id, playerIndex, isDrunk: true, isSynthetic: false });
          }
        });
      }
    });
    return activeWakeList.filter(node => {
      if (node.sourceId === "lunatic_action" && node.believedDemonId !== "pukka") return false;
      if (["ravenkeeper", "sage", "sweetheart", "moonchild"].includes(node.id)) {
        const eligibleDeaths = node.id === "moonchild"
          ? (state.pendingMoonchildIndexes ?? [])
          : (["ravenkeeper", "sage"].includes(node.id)
            ? (state.deathsLastNight ?? [])
            : [...(state.deathsLastNight ?? []), ...(state.deathsToday ?? [])]);
        const diedRecently = eligibleDeaths.includes(node.playerIndex);
        if (!diedRecently) return false;
        if (node.id === "sage") {
          return (state.nightLog ?? []).some(action => (
            action.fakeNoEffect !== true
            && action.targetIndexes?.includes(node.playerIndex)
            && S().C[action.roleId || state.assignments[action.actingPlayerIndex]]?.type === "demon"
          ));
        }
        return true;
      }
      if (node.id === "undertaker") return state.executedTodayIndex !== null && state.alive[state.executedTodayIndex] === false;
      if (node.id === "godfather" && state.dayNum > 1) {
        return (state.deathsToday ?? []).some(playerIndex => S().C[state.assignments[playerIndex]]?.type === "outsider");
      }
      if (node.id === "juggler") return state.dayNum === 2;
      if (node.id === "witch" && Object.keys(state.assignments).map(Number).filter(isPlayerPubliclyAlive).length <= 3) return false;
      if ((node.id === "zombuul" || node.believedDemonId === "zombuul") && (state.deathsToday ?? []).length > 0) return false;
      if (S().C[node.id]?.type === "demon") {
        const blockedByExorcist = (state.nightLog ?? []).some(action => (
          action.roleId === "exorcist"
          && action.fakeNoEffect !== true
          && action.targetIndexes?.includes(node.playerIndex)
        ));
        if (blockedByExorcist) return false;
      }
      if (node.id === "_minstrel") {
        const functioningMinstrelExists = Object.entries(state.assignments).some(([seat, roleId]) => (
          roleId === "minstrel"
          && state.alive[seat] !== false
          && !isPlayerAbilityImpaired(Number(seat), roleId)
        ));
        return functioningMinstrelExists
          && state.executedTodayIndex !== null
          && state.alive[state.executedTodayIndex] === false
          && S().C[state.assignments[state.executedTodayIndex]]?.type === "minion";
      }
      if (node.id === "_grandmother") {
        return Object.entries(state.assignments).some(([seat, roleId]) => (
          roleId === "grandmother"
          && state.alive[seat] !== false
          && !isPlayerAbilityImpaired(Number(seat), roleId)
        ));
      }
      if (node.id === "scarletwoman") {
        const livingDemonExists = Object.entries(state.assignments).some(([seat, roleId]) => state.alive[seat] !== false && S().C[roleId]?.type === "demon");
        const aliveCount = Object.keys(state.assignments).map(Number).filter(isPlayerPubliclyAlive).length;
        return !livingDemonExists && aliveCount >= 5;
      }
      const actionSpec = window.BOTCGameRules.getActionSpec(state.scriptId, node.id, { firstNight: state.dayNum === 1 });
      if (actionSpec?.oncePerGame && state.usedAbilities?.[abilityUsageKey(node.playerIndex, node.id)]) return false;
      return true;
    });
  }
  const activeWakeList = [];
  nightOrder.forEach(nightNode => {
    if (nightNode.id.startsWith("_")) {
      activeWakeList.push({ ...nightNode, playerIndex: null, isDrunk: false });
      return;
    }

    Object.entries(state.assignments).forEach(([playerIndexValue, actualRoleId]) => {
      const playerIndex = Number(playerIndexValue);
      if (isUltimateWerewolf()) {
        if (actualRoleId === nightNode.id && state.alive[playerIndex] !== false) {
          const char = S().C[actualRoleId];
          const isGroupRole = char && char.quantity > 1;
          if (isGroupRole) {
            if (!activeWakeList.some(n => n.id === nightNode.id)) {
              activeWakeList.push({ ...nightNode, playerIndex: null, isDrunk: false });
            }
          } else {
            activeWakeList.push({ ...nightNode, playerIndex, isDrunk: false });
          }
        }
        return;
      }
      if (actualRoleId === nightNode.id) {
        activeWakeList.push({ ...nightNode, playerIndex, isDrunk: false });
      }
      if (isTroubleBrewingDrunk(playerIndex) && getDrunkBelievedRoleId(playerIndex) === nightNode.id) {
        activeWakeList.push({ ...nightNode, playerIndex, isDrunk: true });
      }
    });
  });
  return activeWakeList;
}

function roleRosterByType(roleType) {
  return Object.entries(state.assignments)
    .filter(([, roleId]) => TB.C[roleId]?.type === roleType)
    .map(([playerIndex, roleId]) => `${esc(state.names[playerIndex])} — ${esc(TB.C[roleId]?.name ?? roleId)}`)
    .join("<br>");
}

function countChefEvilPairs() {
  if (state.playerCount < 2) return 0;
  let evilPairCount = 0;
  for (let playerIndex = 0; playerIndex < state.playerCount; playerIndex++) {
    const nextPlayerIndex = (playerIndex + 1) % state.playerCount;
    const isCurrentEvil = playerAlignment(playerIndex) === "evil";
    const isNextEvil = playerAlignment(nextPlayerIndex) === "evil";
    if (isCurrentEvil && isNextEvil) evilPairCount++;
  }
  return evilPairCount;
}

function getEmpathTruth(playerIndex) {
  const aliveOthers = Object.keys(state.assignments)
    .map(Number)
    .filter(otherIndex => otherIndex !== playerIndex && state.alive[otherIndex] !== false);
  if (aliveOthers.length === 0) return "No other living players.";

  const neighbours = [];
  for (const direction of [-1, 1]) {
    for (let distance = 1; distance < state.playerCount; distance++) {
      const candidateIndex = (playerIndex + (direction * distance) + state.playerCount) % state.playerCount;
      if (candidateIndex !== playerIndex && state.alive[candidateIndex] !== false) {
        if (!neighbours.includes(candidateIndex)) neighbours.push(candidateIndex);
        break;
      }
    }
  }
  const evilCount = neighbours.filter(neighbourIndex => playerAlignment(neighbourIndex) === "evil").length;
  const neighbourLabels = neighbours.map(neighbourIndex =>
    `${esc(state.names[neighbourIndex])} (${esc(TB.C[state.assignments[neighbourIndex]]?.name ?? "Unknown")})`
  ).join(" and ");
  return `Closest alive neighbours: ${neighbourLabels || "none"}. Sober evil count: <strong>${evilCount}</strong>.`;
}

function getDrunkTruthReference(roleId, playerIndex) {
  if (state.scriptId !== "tb") return "";
  if (roleId === "washerwoman") {
    return `<strong>Sober reference — in-play Townsfolk:</strong><br>${roleRosterByType("townsfolk") || "None recorded."}`;
  }
  if (roleId === "librarian") {
    return `<strong>Sober reference — in-play Outsiders:</strong><br>${roleRosterByType("outsider") || "No Outsiders are recorded in play."}`;
  }
  if (roleId === "investigator") {
    return `<strong>Sober reference — in-play Minions:</strong><br>${roleRosterByType("minion") || "None recorded."}`;
  }
  if (roleId === "chef") {
    return `<strong>Sober reference:</strong> current seating has <strong>${countChefEvilPairs()}</strong> adjacent evil pair(s), including the wraparound pair.`;
  }
  if (roleId === "empath") {
    return `<strong>Sober reference:</strong> ${getEmpathTruth(playerIndex)}`;
  }
  if (roleId === "fortuneteller") {
    const demons = Object.entries(state.assignments)
      .filter(([, assignedRoleId]) => TB.C[assignedRoleId]?.type === "demon")
      .map(([demonPlayerIndex, assignedRoleId]) => `${esc(state.names[demonPlayerIndex])} (${esc(TB.C[assignedRoleId]?.name ?? assignedRoleId)})`)
      .join(", ") || "No Demon recorded";
    const redHerringName = state.redHerringIndex === null ? "Not configured" : `${esc(state.names[state.redHerringIndex])} (Seat ${Number(state.redHerringIndex) + 1})`;
    return `<strong>Sober reference:</strong> Demon: ${demons}. Red Herring: <strong>${redHerringName}</strong>. A selected target would sober-register YES only if they are one of these.`;
  }
  if (roleId === "ravenkeeper") {
    return `<strong>Sober reference:</strong> the selected player's true role is shown beside their name in the target menu.`;
  }
  if (roleId === "undertaker") {
    const executedRole = state.executedTodayIndex === null ? null : TB.C[state.assignments[state.executedTodayIndex]];
    return executedRole
      ? `<strong>Sober reference:</strong> the executed character was ${esc(executedRole.name)}.`
      : `<strong>Sober reference:</strong> no execution is recorded for the preceding day.`;
  }
  return "";
}

function renderDrunkNightWarning(activeNode) {
  if (!activeNode.isDrunk) return "";
  if (state.scriptId !== "tb") {
    return `<div class="warn warn-orange" role="alert" style="margin:12px 0 0"><strong>DRUNK / NO EFFECT.</strong> Wake ${esc(state.names[activeNode.playerIndex])} as normal, but do not apply this ${esc(S().C[activeNode.id]?.name ?? activeNode.id)} ability.</div>`;
  }
  const truthReference = getDrunkTruthReference(activeNode.id, activeNode.playerIndex);
  const misinformationWarning = TB_INFORMATION_ROLES.has(activeNode.id)
    ? `<div class="warn warn-red" role="alert" style="margin:12px 0 0"><strong>DRUNK INFORMATION MAY BE TRUE OR FALSE.</strong><br>Use the sober result only as a reference. Do not resolve this as a sober ability, and account for Spy or Recluse registration choices where relevant.</div>`
    : "";
  return `
    <div class="warn warn-orange" role="alert" style="margin:12px 0 0"><strong>FAKE / NO EFFECT.</strong> Wake ${esc(state.names[activeNode.playerIndex])} as the ${esc(TB.C[activeNode.id]?.name ?? activeNode.id)}, but never apply protection, death, poison, role changes, voting restrictions, or any other effect.</div>
    ${misinformationWarning}
    ${truthReference ? `<div style="margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:7px;background:rgba(0,0,0,0.2);font-size:12px;line-height:1.6">${truthReference}</div>` : ""}
  `;
}

function getSyntheticNightInstructions(activeNode) {
  if (activeNode.sourceId === "lunatic_info") {
    return "Show the Lunatic the same number of fake Minion players as the real setup contains, plus 3 arbitrary good-character bluffs for the Demon they believe they are. Do not show the real setup.";
  }
  if (activeNode.id === "_lunatic_identity") {
    const lunatic = Object.entries(state.assignments).find(([, roleId]) => roleId === "lunatic");
    const demon = Object.entries(state.assignments).find(([, roleId]) => S().C[roleId]?.type === "demon");
    const lunaticLabel = lunatic
      ? `${state.names[lunatic[0]]} (Seat ${Number(lunatic[0]) + 1})`
      : "the Lunatic";
    const demonLabel = demon
      ? `${state.names[demon[0]]} (Seat ${Number(demon[0]) + 1})`
      : "the Demon";
    return `Wake ${demonLabel} and identify the Lunatic: ${lunaticLabel}. Do not show Minion information or Demon bluffs in this game size.`;
  }
  if (activeNode.sourceId === "lunatic_action" || activeNode.sourceId === "lunatic") {
    return "Resolve the action of the Demon the Lunatic believes they are, using that Demon's legal target count. If the Lunatic selects one or more players, wake the real Demon and show the Lunatic and each choice. If nobody is selected, do not wake the Demon for choices.";
  }
  if (activeNode.id === "_minioninfo") {
    const demon = Object.entries(state.assignments)
      .find(([, roleId]) => S().C[roleId]?.type === "demon");
    const minions = Object.entries(state.assignments)
      .filter(([, roleId]) => S().C[roleId]?.type === "minion")
      .map(([seat]) => `${state.names[seat]} (Seat ${Number(seat) + 1})`);
    const demonLabel = demon
      ? `${state.names[demon[0]]} (Seat ${Number(demon[0]) + 1})`
      : "No Demon recorded";
    return `Wake the Minions together. Show them the Demon: ${demonLabel}. Show the Minions to one another: ${minions.join("; ") || "none recorded"}.`;
  }
  if (activeNode.id === "_demoninfo") {
    const minions = Object.entries(state.assignments)
      .filter(([, roleId]) => S().C[roleId]?.type === "minion")
      .map(([seat]) => `${state.names[seat]} (Seat ${Number(seat) + 1})`);
    const assignedRoles = new Set(Object.values(state.assignments));
    const bluffs = Object.values(S().C)
      .filter(role => ["townsfolk", "outsider"].includes(role.type) && !assignedRoles.has(role.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 3)
      .map(role => role.name);
    const lunatics = Object.entries(state.assignments)
      .filter(([, roleId]) => roleId === "lunatic")
      .map(([seat]) => `${state.names[seat]} (Seat ${Number(seat) + 1})`);
    return `Wake the Demon. Show the Minions: ${minions.join("; ") || "none recorded"}.${lunatics.length > 0 ? ` Show the Lunatic: ${lunatics.join("; ")}.` : ""} Valid out-of-play good-character bluffs: ${bluffs.join(", ") || "choose three from the physical script"}.`;
  }
  if (activeNode.id === "_minstrel") {
    return "If a Minion died by execution today, all other players except Travellers are drunk until dusk. Account for that before resolving tonight's abilities.";
  }
  if (activeNode.id === "_grandmother") {
    return "If the Grandmother's grandchild died to the Demon tonight, the Grandmother also dies. Update both players in the Grimoire.";
  }
  if (activeNode.id === "_goon") {
    return "Confirm the first ability that selected the Goon was marked no-effect and that the Goon took the acting player's alignment. If nobody selected the Goon, make no change.";
  }
  if (activeNode.id === "_courtier") {
    const characterName = S().C[state.courtierEffect?.characterId]?.name ?? "chosen character";
    const remaining = Math.max(1, Number(state.courtierEffect?.expiresAfterDay) - state.dayNum + 1);
    return `${characterName} remains drunk from the Courtier for ${remaining} more night-and-day cycle${remaining === 1 ? "" : "s"}, including tonight.`;
  }
  return "";
}

function renderNightScreen() {
  const s = S();
  const nightOrder = state.dayNum === 1 ? s.FIRST_NIGHT : s.OTHER_NIGHT;
  
  const activeWakeList = getActiveWakeList(nightOrder);

  const stepCount = activeWakeList.length;

  if (state.activeWakeIdx >= stepCount) {
    const unresolvedCount = (state.nightLog ?? []).filter(entry => entry.nightNumber === state.dayNum && entry.skipped === true).length;
    // Night is complete, proceed to Day announcements
    return `
      <div style="padding:16px;text-align:center">
        <div style="margin-bottom:14px;color:var(--orange)">${iconSvg("sunrise", 48)}</div>
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:8px">Night Sequence Complete</h3>
        <p style="color:var(--text3);font-size:13px;line-height:1.6;margin-bottom:24px">
          ${unresolvedCount > 0
            ? `${unresolvedCount} action${unresolvedCount === 1 ? " was" : "s were"} left for manual resolution. Review the Chronicle before making announcements.`
            : "All active roles have been recorded. Prepare your morning announcements."}
        </p>
        <button class="btn btn-primary" onclick="proceedToDay()">${iconSvg("sunrise", 18)} Rise for Day ${state.dayNum} ${iconSvg("forward", 17)}</button>
      </div>
    `;
  }

  const activeNode = activeWakeList[state.activeWakeIdx];
  const charDetails = s.C[activeNode.id] || {
    id: activeNode.id,
    name: stripLeadingIcon(activeNode.title || activeNode.id),
    type: activeNode.isSynthetic || activeNode.id.startsWith("_") ? "moderator" : "demon",
    category: activeNode.isSynthetic || activeNode.id.startsWith("_") ? "moderator" : "demon",
    ab: "",
    fn_r: "",
    on_r: ""
  };

  // Waking list timeline builder
  let timelineItems = "";
  activeWakeList.forEach((n, idx) => {
    const rc = s.C[n.id] || { name: stripLeadingIcon(n.title || n.id), type: "demon" };
    const wakeLabel = n.playerIndex === null
      ? rc.name
      : `${n.isDrunk ? `Drunk (${rc.name})` : rc.name} — ${state.names[n.playerIndex]}`;
    const done = idx < state.activeWakeIdx;
    const current = idx === state.activeWakeIdx;

    if (done) {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;opacity:0.4">
          <span style="color:var(--success-text)">${iconSvg("check", 15)}</span>
          <span style="font-size:13px;text-decoration:line-through">${esc(wakeLabel)}</span>
        </div>
      `;
    } else if (current) {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;background:rgba(149, 27, 30, 0.12);border:1px solid rgba(149, 27, 30, 0.3);padding:6px 12px;border-radius:6px">
          <span style="color:var(--red)">${iconSvg("forward", 13)}</span>
          <strong style="font-size:13px;color:var(--text)">${esc(wakeLabel)}</strong>
        </div>
      `;
    } else {
      timelineItems += `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;opacity:0.35">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--text3)"></span>
          <span style="font-size:13px">${esc(wakeLabel)}</span>
        </div>
      `;
    }
  });

  // Action variables checklist
  const wakeDesc = getSyntheticNightInstructions(activeNode)
    || activeNode.instructions
    || (state.dayNum === 1 ? (charDetails.fn_r || "Give info") : (charDetails.on_r || "Perform action"));
  const actionControls = renderNightActionControls(activeNode);

  return `
    <div style="padding:16px">
      <!-- Active Card -->
      <div class="card" style="border-radius:12px;border-color:var(--border);padding:24px;margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:10px;font-weight:700;color:${TYPE_CLR[charDetails.type]?.txt || 'var(--text3)'};text-transform:uppercase;letter-spacing:1.5px">
            ${esc(roleCategoryLabel(charDetails).toUpperCase())} • ${activeNode.isReminder || activeNode.isSynthetic || activeNode.id.startsWith("_") ? "REMINDER" : "ACTION REQUIRED"}
          </span>
          <span style="font-size:11px;color:var(--text3)">${state.activeWakeIdx + 1} of ${stepCount}</span>
        </div>
        
        <h3 style="font-family:var(--font-serif);font-size:28px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:10px">
          ${renderRoleImage(charDetails.id, charDetails.type, 32)}
          ${activeNode.isDrunk ? `Drunk (${esc(charDetails.name)})` : esc(charDetails.name)}
        </h3>
        ${activeNode.playerIndex !== null ? `<div style="font-size:13px;color:var(--text2);margin:-6px 0 12px">${activeNode.isReminder ? "Resolve reminder for" : "Wake"} <strong>${esc(state.names[activeNode.playerIndex])}</strong> (Seat ${activeNode.playerIndex + 1})</div>` : ""}

        <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);padding:14px;border-radius:8px;font-size:13px;line-height:1.6;color:var(--text2);text-align:left">
          <strong>Storyteller Instructions:</strong><br>
          <span style="display:block;margin-top:4px;color:var(--orange)">${esc(wakeDesc)}</span>
        </div>

        ${renderDrunkNightWarning(activeNode)}
        ${actionControls}

        <div style="display:flex;align-items:center;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-outline" style="width:auto;padding:8px 16px" onclick="requestNextNightStep()">
            ${actionControls ? "Resolve manually / skip" : "Next Step"} ${iconSvg("forward", 17)}
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

function effectiveNightActionId(activeNode) {
  const sourceId = activeNode.sourceId || activeNode.id;
  const isLunaticAction = ["lunatic_action", "lunatic"].includes(sourceId);
  return isLunaticAction
    ? activeNode.believedDemonId
    : (sourceId === "_demon" ? activeNode.id : sourceId);
}

function getNightActionSpec(activeNode) {
  const sourceId = activeNode.sourceId || activeNode.id;
  const isLunaticAction = ["lunatic_action", "lunatic"].includes(sourceId);
  const actionId = effectiveNightActionId(activeNode);
  const definedSpec = window.BOTCGameRules?.getActionSpec?.(state.scriptId, actionId, { firstNight: state.dayNum === 1 });
  if (definedSpec) {
    const poIsCharged = isLunaticAction
      ? state.lunaticPoCharged?.[activeNode.playerIndex] === true
      : state.poCharged;
    if (state.scriptId === "bmr" && actionId === "po" && poIsCharged) {
      return {
        ...definedSpec,
        minTargets: 3,
        maxTargets: 3,
        allowedTargetCounts: [3],
        optional: false
      };
    }
    return definedSpec;
  }
  if (isUltimateWerewolf() && !activeNode.isSynthetic) {
    return {
      minTargets: 1,
      maxTargets: 1,
      targetEligibility: { self: true, alive: true, dead: false },
      optional: false,
      requiresCharacterChoice: false,
      manualResolution: true
    };
  }
  return null;
}

function isGoonEligiblePlayerChoice(activeNode, spec) {
  const sourceId = activeNode?.sourceId || activeNode?.id;
  return state.scriptId === "bmr"
    && spec?.playerChoosesTargets === true
    && activeNode?.playerIndex !== null
    && activeNode?.playerIndex !== undefined
    && Number.isInteger(Number(activeNode.playerIndex))
    && !activeNode?.isSynthetic
    && !activeNode?.isReminder
    && !["lunatic", "lunatic_action"].includes(sourceId);
}

function nightLogContainsGoonTrigger(goonIndex) {
  return (state.nightLog ?? []).some(action => (
    action.sourceId === "_goon"
    && action.targetIndexes?.includes(goonIndex)
  ));
}

function renderNightActionControls(activeNode) {
  const spec = getNightActionSpec(activeNode);
  if (!spec || (spec.maxTargets === 0 && !spec.requiresCharacterChoice)) return "";
  const candidateButtons = [];
  const eligibleAlive = targetAliveState();
  for (let targetIndex = 0; targetIndex < state.playerCount; targetIndex++) {
    const eligible = window.BOTCGameRules?.isTargetEligible
      ? window.BOTCGameRules.isTargetEligible(spec, {
          actorIndex: activeNode.playerIndex,
          targetIndex,
          alive: eligibleAlive,
          targetRole: {
            ...S().C[state.assignments[targetIndex]],
            team: playerAlignment(targetIndex)
          }
        })
      : eligibleAlive[targetIndex] !== false;
    if (!eligible || isRepeatRestrictedTarget(activeNode, targetIndex)) continue;
    const targetRole = S().C[state.assignments[targetIndex]];
    candidateButtons.push(`
      <label class="night-target-option">
        <input type="checkbox" data-night-target value="${targetIndex}">
        <span><strong>${esc(state.names[targetIndex])}</strong><small>Seat ${targetIndex + 1}${targetRole ? ` · ${esc(targetRole.name)}` : ""}</small></span>
      </label>
    `);
  }
  const inPlayRoleIds = Object.values(state.assignments);
  const characterOptions = Object.values(S().C)
    .filter(character => !spec.requiresCharacterChoice || !window.BOTCGameRules?.isCharacterChoiceEligible
      || window.BOTCGameRules.isCharacterChoiceEligible(spec, { character, inPlayRoleIds }))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(character => `<option value="${esc(character.id)}">${esc(character.name)}</option>`)
    .join("");
  const targetPrompt = spec.allowedTargetCounts?.length > 0
    ? `Choose ${spec.allowedTargetCounts.join(" or ")} player${Math.max(...spec.allowedTargetCounts) === 1 ? "" : "s"}`
    : spec.maxTargets === 1
    ? "Choose one player"
    : `Choose ${spec.minTargets === spec.maxTargets ? spec.maxTargets : `up to ${spec.maxTargets}`} players`;
  return `
    <fieldset class="night-action-controls">
      <legend>Record action</legend>
      ${spec.maxTargets > 0 ? `
        <div class="night-action-label">${targetPrompt}${spec.optional ? " (optional)" : ""}</div>
        <div class="night-target-grid">${candidateButtons.join("")}</div>
      ` : ""}
      ${spec.requiresCharacterChoice ? `
        <label class="night-action-label" for="night-character-select">Character choice${spec.optional ? " (optional)" : ""}</label>
        <select id="night-character-select" class="input">
          <option value="">-- Choose a character --</option>
          ${characterOptions}
        </select>
      ` : ""}
      ${spec.manualResolution ? `<p class="night-manual-note">This records the choice only. Resolve the ability using the printed character text and update the Grimoire if player state changes.</p>` : ""}
      <button class="btn btn-primary" style="margin-top:10px" onclick="submitNightTarget('${activeNode.id}', ${activeNode.playerIndex ?? "null"}, ${activeNode.isDrunk})">
        ${iconSvg("check", 17)} Record &amp; continue
      </button>
    </fieldset>
  `;
}

function submitNightTarget(rid, actingPlayerIndex = null, isDrunkAction = false) {
  if (state.phase !== "night") return;
  const nightOrder = state.dayNum === 1 ? S().FIRST_NIGHT : S().OTHER_NIGHT;
  const activeNode = getActiveWakeList(nightOrder)[state.activeWakeIdx];
  if (!activeNode || activeNode.id !== rid) return;
  const spec = getNightActionSpec(activeNode);
  if (!spec) return;
  const selectedInputs = typeof document.querySelectorAll === "function"
    ? [...document.querySelectorAll("[data-night-target]:checked")]
    : [];
  const legacyTarget = document.getElementById("night-target-select")?.value;
  const targetIndexes = selectedInputs.length > 0
    ? selectedInputs.map(input => Number(input.value))
    : (legacyTarget === undefined || legacyTarget === "" ? [] : [Number(legacyTarget)]);
  const uniqueTargets = [...new Set(targetIndexes)].filter(Number.isInteger);
  const characterId = String(document.getElementById("night-character-select")?.value ?? "");
  const targetCountIsValid = spec.allowedTargetCounts?.length > 0
    ? spec.allowedTargetCounts.includes(uniqueTargets.length)
    : uniqueTargets.length >= spec.minTargets && uniqueTargets.length <= spec.maxTargets;
  if (!targetCountIsValid) {
    const expectedCount = spec.allowedTargetCounts?.length > 0
      ? spec.allowedTargetCounts.join(" or ")
      : (spec.minTargets === spec.maxTargets ? spec.minTargets : `${spec.minTargets} to ${spec.maxTargets}`);
    showToast(`Choose ${expectedCount} valid target${spec.maxTargets === 1 ? "" : "s"}.`, "error");
    return;
  }
  if (spec.requiresCharacterChoice && !characterId && !spec.optional) {
    showToast("Choose a character before continuing.", "error");
    return;
  }
  const eligibleAlive = targetAliveState();
  const allTargetsEligible = uniqueTargets.every(targetIndex => !isRepeatRestrictedTarget(activeNode, targetIndex) && (
    window.BOTCGameRules?.isTargetEligible
    ? window.BOTCGameRules.isTargetEligible(spec, {
        actorIndex: actingPlayerIndex,
        targetIndex,
        alive: eligibleAlive,
        targetRole: {
          ...S().C[state.assignments[targetIndex]],
          team: playerAlignment(targetIndex)
        }
      })
    : true));
  const selectedCharacter = S().C[characterId];
  const characterChoiceIsValid = !characterId || (
    selectedCharacter
    && (!window.BOTCGameRules?.isCharacterChoiceEligible
      || window.BOTCGameRules.isCharacterChoiceEligible(spec, {
        character: selectedCharacter,
        inPlayRoleIds: Object.values(state.assignments)
      }))
  );
  if (!allTargetsEligible || !characterChoiceIsValid) {
    showToast("That action contains an invalid choice.", "error");
    return;
  }

  const sourceActionId = activeNode.sourceId || rid;
  const effectiveActionId = effectiveNightActionId(activeNode);
  const role = S().C[rid];
  const roleName = ["lunatic_action", "lunatic"].includes(sourceActionId)
    ? `Lunatic (${S().C[effectiveActionId]?.name ?? "believed Demon"})`
    : (role?.name ?? activeNode.title ?? rid);
  const targetNames = uniqueTargets.map(targetIndex => state.names[targetIndex]);
  const actorIsImpaired = isPlayerAbilityImpaired(actingPlayerIndex, rid);
  const goonIndex = uniqueTargets.find(targetIndex => state.assignments[targetIndex] === "goon");
  const goonWasAlreadyChosen = goonIndex !== undefined && nightLogContainsGoonTrigger(goonIndex);
  const goonTriggers = state.scriptId === "bmr"
    && goonIndex !== undefined
    && isGoonEligiblePlayerChoice(activeNode, spec)
    && !isDrunkAction
    && !actorIsImpaired
    && state.alive[goonIndex] !== false
    && !goonWasAlreadyChosen
    && !isPlayerAbilityImpaired(goonIndex, "goon");
  let actionHasEffect = !isDrunkAction && !actorIsImpaired && !goonTriggers;
  recordHistory(`${roleName} action`);
  if (goonTriggers) {
    const actingAlignment = playerAlignment(actingPlayerIndex);
    if (["good", "evil"].includes(actingAlignment)) state.alignments[goonIndex] = actingAlignment;
  }
  state.nightLog.push({
    roleId: rid,
    sourceId: goonTriggers ? "_goon" : (activeNode.sourceId || rid),
    targetIndexes: uniqueTargets,
    targetIndex: uniqueTargets[0] ?? null,
    characterId: characterId || null,
    actingPlayerIndex,
    fakeNoEffect: !actionHasEffect,
    manualResolution: spec.manualResolution,
    nightNumber: state.dayNum,
    stepIndex: state.activeWakeIdx
  });
  const consumedOncePerGameAbility = spec.oncePerGame && (uniqueTargets.length > 0 || characterId);
  if (consumedOncePerGameAbility) {
    state.usedAbilities[abilityUsageKey(actingPlayerIndex, rid)] = true;
  }
  if (state.scriptId === "bmr" && ["exorcist", "devilsadvocate"].includes(effectiveActionId) && uniqueTargets.length === 1) {
    state.previousNightTargets[priorTargetKey(actingPlayerIndex, effectiveActionId)] = {
      targetIndex: uniqueTargets[0],
      nightNumber: state.dayNum
    };
  }
  if (actionHasEffect && state.scriptId === "sv" && rid === "philosopher" && characterId) {
    state.gainedAbilities[actingPlayerIndex] = characterId;
  }
  if (actionHasEffect && state.scriptId === "bmr" && rid === "courtier" && characterId) {
    state.courtierEffect = { characterId, expiresAfterDay: state.dayNum + 2 };
  }

  let details = targetNames.length > 0 ? `Selected ${targetNames.join(" and ")}.` : "No player target was selected.";
  if (characterId) details += ` Character choice: ${S().C[characterId].name}.`;
  if (!actionHasEffect && !goonTriggers) details += " This action had no effect because the acting character was drunk or poisoned.";
  if (goonTriggers) details += ` The Goon was the first target tonight, so this action had no effect and the Goon became ${playerAlignment(goonIndex)}.`;
  if (["lunatic_action", "lunatic"].includes(sourceActionId)) {
    details += uniqueTargets.length > 0
      ? " Wake the real Demon and show these choices."
      : " Do not wake the real Demon for choices.";
  }
  if (actionHasEffect && state.scriptId === "tb" && rid === "poisoner") {
    state.poisonedIndex = uniqueTargets[0];
  } else if (actionHasEffect && state.scriptId === "tb" && rid === "monk") {
    state.nightProtected = uniqueTargets;
  } else if (actionHasEffect && state.scriptId === "tb" && rid === "imp") {
    const targetIndex = uniqueTargets[0];
    const targetRoleId = state.assignments[targetIndex];
    const targetIsPoisoned = isPoisonedSeat(targetIndex);
    const targetAbilityWorks = !targetIsPoisoned;
    if ((targetRoleId === "soldier" && targetAbilityWorks) || state.nightProtected.includes(targetIndex)) {
      details += " The target was protected and did not die.";
    } else if (targetRoleId === "mayor" && targetAbilityWorks) {
      details += " Resolve the Mayor redirect, then update player state manually.";
    } else if (!state.deathsLastNight.includes(targetIndex)) {
      state.deathsLastNight.push(targetIndex);
    }
    if (targetIndex === actingPlayerIndex && state.deathsLastNight.includes(targetIndex)) {
      details += " Open the Grimoire and use Trigger Starpass before completing the night.";
      state.toast = { message: "Imp self-kill recorded. Choose Trigger Starpass from the Imp's Grimoire card.", tone: "info" };
    }
  } else if (actionHasEffect && state.scriptId === "bmr" && effectiveActionId === "po") {
    if (["lunatic_action", "lunatic"].includes(activeNode.sourceId)) {
      state.lunaticPoCharged[actingPlayerIndex] = uniqueTargets.length === 0;
    } else {
      state.poCharged = uniqueTargets.length === 0;
    }
  } else if (actionHasEffect && state.scriptId === "sv" && rid === "fanggu" && !state.fangGuJumpUsed) {
    const targetIndex = uniqueTargets[0];
    const targetRoleId = state.assignments[targetIndex];
    const targetCanDie = state.alive[targetIndex] !== false
      && !(state.nightProtected ?? []).includes(targetIndex);
    if (targetCanDie && S().C[targetRoleId]?.type === "outsider") {
      state.fangGuJumpUsed = true;
      state.alive[actingPlayerIndex] = false;
      if (!state.deathsLastNight.includes(actingPlayerIndex)) state.deathsLastNight.push(actingPlayerIndex);
      state.assignments[targetIndex] = "fanggu";
      state.alignments[targetIndex] = "evil";
      const poolIndex = state.rolePool.indexOf(targetRoleId);
      if (poolIndex >= 0) state.rolePool[poolIndex] = "fanggu";
      clearSeatAbilityUsage(targetIndex);
      details += ` The first Outsider jump was applied: ${state.names[targetIndex]} is now an evil Fang Gu and ${state.names[actingPlayerIndex]} dies instead.`;
      state.showCard = {
        title: "Fang Gu Jump",
        icon: "evil",
        text: `Wake ${state.names[targetIndex]} and show the Fang Gu and evil-alignment tokens. ${state.names[actingPlayerIndex]} dies instead.`
      };
    }
  }
  state.chronicle.push({
    type: "night",
    nightNum: state.dayNum,
    title: `${roleName} Action`,
    details,
    badgeColor: TYPE_CLR[role?.type]?.bdr || "var(--border)"
  });
  const completedPendingMoonchild = state.scriptId === "bmr"
    && rid === "moonchild"
    && (state.pendingMoonchildIndexes ?? []).includes(Number(actingPlayerIndex));
  if (completedPendingMoonchild) {
    state.pendingMoonchildIndexes = state.pendingMoonchildIndexes.filter(index => Number(index) !== Number(actingPlayerIndex));
  }
  // A consumed or trigger-only character disappears from the recomputed wake
  // list, so its successor moves into the current index.
  if (!consumedOncePerGameAbility && !completedPendingMoonchild) state.activeWakeIdx++;
  autoSave();
  render();
}

function requestNextNightStep() {
  if (state.phase !== "night") return;
  const nightOrder = state.dayNum === 1 ? S().FIRST_NIGHT : S().OTHER_NIGHT;
  const activeNode = getActiveWakeList(nightOrder)[state.activeWakeIdx];
  const spec = activeNode ? getNightActionSpec(activeNode) : null;
  const requiresRecordedChoice = spec && (spec.maxTargets > 0 || spec.requiresCharacterChoice) && !spec.optional;
  if (requiresRecordedChoice) {
    state.confirm = {
      msg: "Skip this required action without recording its choices? It will be marked unresolved for the Storyteller.",
      onYes: "nextNightStep",
      context: { markUnresolved: true }
    };
    render();
    return;
  }
  nextNightStep({ markUnresolved: Boolean(spec && (spec.maxTargets > 0 || spec.requiresCharacterChoice)) });
}

function nextNightStep(context = {}) {
  if (state.phase !== "night") return;
  const nightOrder = state.dayNum === 1 ? S().FIRST_NIGHT : S().OTHER_NIGHT;
  const activeNode = getActiveWakeList(nightOrder)[state.activeWakeIdx];
  const label = activeNode ? (S().C[activeNode.id]?.name ?? stripLeadingIcon(activeNode.title) ?? "night step") : "night step";
  recordHistory(`advance past ${plainText(label)}`);
  if (activeNode && context.markUnresolved) {
    state.nightLog.push({
      roleId: activeNode.id,
      sourceId: activeNode.sourceId || activeNode.id,
      actingPlayerIndex: activeNode.playerIndex,
      targetIndexes: [],
      skipped: true,
      nightNumber: state.dayNum,
      stepIndex: state.activeWakeIdx
    });
    state.chronicle.push({
      type: "night",
      nightNum: state.dayNum,
      title: `${plainText(label)} Unresolved`,
      details: "The Storyteller continued without recording this action's choices.",
      badgeColor: "var(--orange)"
    });
  }
  const completedPendingMoonchild = activeNode?.id === "moonchild"
    && (state.pendingMoonchildIndexes ?? []).includes(Number(activeNode.playerIndex));
  if (completedPendingMoonchild) {
    state.pendingMoonchildIndexes = state.pendingMoonchildIndexes.filter(index => Number(index) !== Number(activeNode.playerIndex));
  } else {
    state.activeWakeIdx++;
  }
  autoSave();
  render();
}

function proceedToDay() {
  if (state.phase !== "night") return;
  const pendingStarpassIndex = state.scriptId === "tb"
    ? Object.entries(state.assignments).find(([seat, roleId]) => (
        roleId === "imp"
        && state.alive[seat] !== false
        && canTriggerStarpass(Number(seat))
        && Object.entries(state.assignments).some(([otherSeat, otherRoleId]) => (
          Number(otherSeat) !== Number(seat)
          && state.alive[otherSeat] !== false
          && S().C[otherRoleId]?.type === "minion"
        ))
      ))?.[0]
    : undefined;
  if (pendingStarpassIndex !== undefined) {
    state.tab = "grimoire";
    state.expandedPlayer = Number(pendingStarpassIndex);
    state.showCard = {
      title: "Resolve the Imp starpass",
      icon: "crown",
      text: "Choose Trigger Starpass on the Imp's Grimoire card before ending the night."
    };
    render();
    return;
  }
  recordHistory(`complete Night ${state.dayNum}`);
  state.phase = "day";
  state.tab = "day";
  state.activeWakeIdx = 0;
  state.deathsToday = [];
  state.executedTodayIndex = null;
  
  // Apply overnight deaths
  state.deathsLastNight.forEach(pIdx => {
    if (state.registeredDead?.[pIdx] === true) return;
    addPendingMoonchild(pIdx);
    recordVigormortisRetentionForDeath(pIdx);
    state.alive[pIdx] = false;
    if (isUltimateWerewolf()) state.votes[pIdx] = 0;
  });

  // Chronicle day entry
  state.chronicle.push({
    type: "system",
    dayNum: state.dayNum,
    title: `Day ${state.dayNum} Rises`,
    details: `The town wakes up to face Day ${state.dayNum}.`,
    badgeColor: "var(--border)"
  });

  const discussionSession = ensureDiscussionTimerSession();
  if (canConfigureDiscussionTimers()) {
    clearTimerInterval();
    state.timerRunning = false;
    const activeType = DISCUSSION_TIMER_TYPES.includes(state.activeDiscussionType)
      ? state.activeDiscussionType
      : "public";
    state.timerTotal = discussionSession[activeType].durationSeconds;
    state.timerSeconds = discussionSession[activeType].remainingSeconds;
    state.timerSessionDay = state.dayNum;
  }
  autoSave();
  if (typeof dispatchGameEmail === "function") void dispatchGameEmail("night-complete");
  render();
}

function validateRoleSetup() {
  if (S().setupMode === "physical-cards") return [];
  const assignedRoleIds = Object.values(state.assignments);
  ensureSetupChoices(state.rolePool);
  const distribution = getSetupAdjustedDistribution(state.dist, state.rolePool);
  if (window.BOTCGameRules?.validateSetup) {
    const result = window.BOTCGameRules.validateSetup({
      script: S(),
      playerCount: state.playerCount,
      names: state.names,
      assignments: state.assignments,
      rolePool: state.rolePool,
      distribution,
      allowAdditionalMinionCopy: state.playerCount >= 19
    });
    return result.errors.map(error => error.message);
  }
  const errors = [];
  const assigned = Array.from({ length: state.playerCount }, (_, index) => state.assignments[index] || "");
  const validRoleIds = new Set(Object.keys(S().C));
  if (assigned.some(roleId => !roleId)) errors.push("Assign a character to every seat.");
  if (assigned.some(roleId => roleId && !validRoleIds.has(roleId))) errors.push("One or more assigned characters are invalid for this script.");
  const nonEmptyAssignments = assigned.filter(Boolean);
  const hasUnsupportedDuplicate = values => Object.entries(values.reduce((counts, roleId) => ({ ...counts, [roleId]: (counts[roleId] ?? 0) + 1 }), {}))
    .some(([roleId, count]) => count > 1 && !(state.playerCount >= 19 && S().C[roleId]?.type === "minion" && count === 2));
  if (hasUnsupportedDuplicate(nonEmptyAssignments)) errors.push("Only one additional Minion copy is allowed in 19- or 20-player games.");
  if (state.rolePool.length !== state.playerCount || hasUnsupportedDuplicate(state.rolePool)) {
    errors.push(`The role pool must contain exactly ${state.playerCount} characters with only the supported extra Minion copy.`);
  }
  const poolSet = new Set(state.rolePool);
  if (nonEmptyAssignments.some(roleId => !poolSet.has(roleId))) errors.push("Assigned characters must match the selected role pool.");
  return [...new Set(errors)];
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
      announcements += `
        <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--red);padding:14px">
          ${iconSvg("skull", 22)}
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase">Death Announcement</div>
            <strong style="font-size:14px;color:var(--text)">${esc(pName)} died last night.</strong>
          </div>
        </div>
      `;
    });
  } else {
    announcements += `
      <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--green);padding:14px">
        ${iconSvg("sparkle", 22)}
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase">Peaceful Night</div>
          <strong style="font-size:14px;color:var(--text)">No one died during the night.</strong>
        </div>
      </div>
    `;
  }

  // 2. Events & Reminders based on script
  announcements += `
    <div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--blue);padding:14px">
      ${iconSvg("bell", 22)}
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase">Reminder</div>
        <span style="font-size:13px;color:var(--text2)">${isUltimateWerewolf()
          ? "Open public discussion. Private discussions are not used. Dead players may observe but cannot vote."
          : "Announce that public nominations are open now. Dead players retain 1 vote token!"}</span>
      </div>
    </div>
  `;

  return `
    <div style="padding:16px">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px;color:var(--orange);display:flex;align-items:center;gap:8px">${iconSvg("sun", 23)} Day ${state.dayNum}</h3>
        <p style="color:var(--text3);font-size:13px">Morning brief and Storyteller controls.</p>
      </div>

      <div style="margin-bottom:24px">${announcements}</div>

      ${renderDiscussionTimerSetup()}
      ${renderDayActions()}
    </div>
  `;
}

function renderDayActions() {
  const winnerControls = isUltimateWerewolf()
    ? `<button class="btn btn-primary" onclick="openUltimateWinnerPicker()">${iconSvg("trophy", 18)} Declare Winner(s)</button>`
    : `<div class="day-winner-actions">
        <button class="btn btn-blue" onclick="requestWin('good')">${iconSvg("good", 18)} Good Wins</button>
        <button class="btn btn-blue danger-action" onclick="requestWin('evil')">${iconSvg("evil", 18)} Evil Wins</button>
      </div>`;
  return `
    <section class="day-actions" aria-label="Day controls">
      <button class="btn btn-primary" onclick="proceedToNightStep()">${iconSvg("moon", 18)} Proceed to Night ${state.dayNum + 1}</button>
      ${winnerControls}
    </section>
  `;
}

function canConfigureDiscussionTimers() {
  return window.BOTCGameRules?.isTimerEligibleScript
    ? window.BOTCGameRules.isTimerEligibleScript(state.scriptId)
    : ["tb", "bmr", "sv"].includes(state.scriptId);
}

function discussionTypeLabel(type) {
  return type === "private" ? "Private" : "Public";
}

function renderDiscussionTimerSetup() {
  if (!canConfigureDiscussionTimers()) return "";

  const session = ensureDiscussionTimerSession();
  const timerOptions = DISCUSSION_TIMER_TYPES.map(type => {
    const timer = session[type];
    const label = discussionTypeLabel(type);
    const disabled = !timer.enabled;
    return `
      <div class="discussion-timer-option${disabled ? " is-disabled" : ""}">
        <div class="discussion-timer-option-header">
          <div style="text-align:left">
            <strong>${label} discussion</strong>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Day ${state.dayNum} timer</div>
          </div>
          <label class="discussion-timer-toggle">
            <input type="checkbox" aria-label="Enable ${label.toLowerCase()} discussion timer for Day ${state.dayNum}" ${timer.enabled ? "checked" : ""} onchange="setDiscussionTimerEnabled('${type}', this.checked)">
            <span>${timer.enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <div class="timer-setting-row" style="margin:12px 0">
          <span style="color:var(--text2)">Duration</span>
          <div class="timer-adj">
            <button class="timer-adj-btn" onclick="adjustDiscussionTimerDuration('${type}', -30)" ${disabled || timer.durationSeconds <= MIN_DISCUSSION_TIMER_SECONDS ? "disabled" : ""} aria-label="Reduce ${label.toLowerCase()} discussion timer by 30 seconds">−</button>
            <span class="timer-adj-val">${formatTime(timer.durationSeconds)}</span>
            <button class="timer-adj-btn" onclick="adjustDiscussionTimerDuration('${type}', 30)" ${disabled || timer.durationSeconds >= MAX_DISCUSSION_TIMER_SECONDS ? "disabled" : ""} aria-label="Increase ${label.toLowerCase()} discussion timer by 30 seconds">+</button>
          </div>
        </div>
        <button class="btn ${disabled ? "btn-outline" : "btn-primary"}" style="margin:0" onclick="startTimerUI('${type}')" ${disabled ? "disabled" : ""}>
          ${iconSvg("timer", 17)} Start ${label} Timer (${formatTime(timer.remainingSeconds)})
        </button>
      </div>
    `;
  }).join("");

  return `
    <section class="timer-settings" aria-label="Discussion timer settings">
      <div style="text-align:left;margin-bottom:12px">
        <strong style="display:block;color:var(--text)">Discussion timers</strong>
        <span style="font-size:12px;color:var(--text3)">Choose separate timers for this day's public and private discussions.</span>
      </div>
      <div class="discussion-timer-grid">${timerOptions}</div>
    </section>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 7: DISCUSSION TIMER DIAL SCREEN (`Discussion Timer.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderTimerScreen() {
  if (!canConfigureDiscussionTimers() || state.phase !== "day") return renderDayScreen();

  const session = ensureDiscussionTimerSession();
  const activeType = DISCUSSION_TIMER_TYPES.includes(state.activeDiscussionType) ? state.activeDiscussionType : "public";
  const activeLabel = discussionTypeLabel(activeType);
  const pct = state.timerTotal > 0 ? (state.timerSeconds / state.timerTotal) * 100 : 0;
  
  // Math for circular ring dial
  const center = 100;
  const radius = 88;
  const stroke = 8;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return `
    <div style="padding:16px;text-align:center">
      <div style="margin-bottom:20px">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:4px">Town Square</h3>
        <p style="color:var(--text3);font-size:13px">Day ${state.dayNum} — ${activeLabel.toLowerCase()} discussion</p>
      </div>

      <div class="timer-phases" aria-label="Discussion type">
        ${DISCUSSION_TIMER_TYPES.map(type => `
          <button class="timer-phase-dot${type === activeType ? " current" : ""}" aria-pressed="${type === activeType}" onclick="switchDiscussionTimer('${type}')" ${session[type].enabled ? "" : "disabled"}>
            ${discussionTypeLabel(type)}
          </button>
        `).join("")}
      </div>

      <!-- Circular Timer Dial -->
      <div style="position:relative;width:200px;height:200px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center">
        <svg viewBox="0 0 200 200" style="transform:rotate(-90deg);width:100%;height:100%;overflow:visible">
          <circle stroke="var(--border)" fill="transparent" stroke-width="${stroke}" r="${radius}" cx="${center}" cy="${center}"/>
          <circle id="discussion-timer-progress" stroke="var(--red)" fill="transparent" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circumference} ${circumference}" style="stroke-dashoffset:${strokeDashoffset};transition:stroke-dashoffset 0.5s linear" r="${radius}" cx="${center}" cy="${center}"/>
        </svg>
        <div style="position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <output id="discussion-timer-display" class="discussion-timer-clock" role="timer" aria-live="off" aria-label="${activeLabel} discussion time remaining">${formatTime(state.timerSeconds)}</output>
          <span style="font-size:10px;text-transform:uppercase;color:var(--text3);letter-spacing:1px">Remaining</span>
          <span id="discussion-timer-complete" class="sr-only" role="status" aria-live="polite"></span>
        </div>
      </div>

      <!-- Timer controls -->
      <div style="display:flex;justify-content:center;gap:20px;margin-bottom:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%" onclick="adjustTimerVal(30)" aria-label="Add 30 seconds to ${activeLabel.toLowerCase()} discussion timer">+</button>
          <span style="font-size:11px;color:var(--text3)">Add 30s</span>
        </div>
        
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button id="discussion-timer-toggle" class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%" onclick="toggleTimerRunning()" data-timer-state="${state.timerRunning ? 'running' : 'paused'}" aria-label="${state.timerRunning ? 'Pause' : 'Start'} ${activeLabel.toLowerCase()} discussion timer">
            ${iconSvg(state.timerRunning ? "pause" : "play", 18)}
          </button>
          <span id="discussion-timer-toggle-label" style="font-size:11px;color:var(--text3)">${state.timerRunning ? 'Pause' : 'Start'}</span>
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <button class="timer-adj-btn" style="width:42px;height:42px;border-radius:50%;color:var(--red);border-color:var(--red)33" onclick="resetTimerVal()" aria-label="Reset ${activeLabel.toLowerCase()} discussion timer">${iconSvg("refresh", 18)}</button>
          <span style="font-size:11px;color:var(--text3)">Reset</span>
        </div>
      </div>

      <!-- Fast timeline trigger -->
      <button class="btn btn-outline" style="width:100%;margin-bottom:12px" onclick="proceedToNightStep()">
        ${iconSvg("moon", 18)} Proceed to Night
      </button>

      <!-- Declare winner trigger -->
      <div style="display:flex;gap:8px">
        <button class="btn btn-blue" style="flex:1;margin:0" onclick="requestWin('good')">${iconSvg("good", 18)} Good Wins</button>
        <button class="btn btn-blue danger-action" style="flex:1;margin:0" onclick="requestWin('evil')">${iconSvg("evil", 18)} Evil Wins</button>
      </div>
    </div>
  `;
}

function getDiscussionTimer(type = state.activeDiscussionType) {
  if (!DISCUSSION_TIMER_TYPES.includes(type)) return null;
  return ensureDiscussionTimerSession()[type];
}

function syncActiveDiscussionTimer(updateDefault = false) {
  if (state.timerSessionDay !== state.dayNum) return;
  const timer = getDiscussionTimer();
  if (!timer) return;
  timer.durationSeconds = normalizeDiscussionDuration(state.timerTotal, timer.durationSeconds);
  timer.remainingSeconds = normalizeDiscussionRemaining(state.timerSeconds, timer.durationSeconds);
  if (updateDefault) state.discussionTimerDefaults[state.activeDiscussionType] = timer.durationSeconds;
}

function setDiscussionTimerEnabled(type, enabled) {
  if (state.phase !== "day" || !canConfigureDiscussionTimers() || !DISCUSSION_TIMER_TYPES.includes(type)) return;
  const timer = getDiscussionTimer(type);
  if (!timer) return;
  if (timer.enabled === Boolean(enabled)) return;
  recordHistory(`${discussionTypeLabel(type)} timer ${Boolean(enabled) ? "enable" : "disable"}`);
  timer.enabled = Boolean(enabled);
  if (!timer.enabled && state.activeDiscussionType === type) {
    stopTimer();
    if (state.tab === "timer") state.tab = "day";
  }
  autoSave();
  render();
}

function adjustDiscussionTimerDuration(type, seconds) {
  if (state.phase !== "day" || !canConfigureDiscussionTimers() || !DISCUSSION_TIMER_TYPES.includes(type)) return;
  const timer = getDiscussionTimer(type);
  if (!timer?.enabled) return;
  const nextDuration = normalizeDiscussionDuration(timer.durationSeconds + seconds, timer.durationSeconds);
  if (nextDuration === timer.durationSeconds) return;
  recordHistory(`${discussionTypeLabel(type)} timer duration change`);
  if (state.activeDiscussionType === type) stopTimer();
  timer.durationSeconds = nextDuration;
  timer.remainingSeconds = nextDuration;
  state.discussionTimerDefaults[type] = nextDuration;
  if (state.activeDiscussionType === type) {
    state.timerSessionDay = state.dayNum;
    state.timerTotal = nextDuration;
    state.timerSeconds = nextDuration;
  }
  autoSave();
  render();
}

function switchDiscussionTimer(type) {
  if (state.phase !== "day" || !canConfigureDiscussionTimers() || !DISCUSSION_TIMER_TYPES.includes(type)) return;
  const timer = getDiscussionTimer(type);
  if (!timer?.enabled || state.activeDiscussionType === type) return;
  stopTimer();
  state.activeDiscussionType = type;
  state.timerTotal = timer.durationSeconds;
  state.timerSeconds = timer.remainingSeconds;
  state.timerSessionDay = state.dayNum;
  autoSave();
  render();
}

function startTimerUI(type = state.activeDiscussionType) {
  if (!canConfigureDiscussionTimers() || state.phase !== "day" || !DISCUSSION_TIMER_TYPES.includes(type)) return;
  const timer = getDiscussionTimer(type);
  if (!timer?.enabled) return;
  if (state.timerSessionDay === state.dayNum) {
    stopTimer();
  } else {
    state.timerRunning = false;
    clearTimerInterval();
  }
  state.activeDiscussionType = type;
  state.timerTotal = timer.durationSeconds;
  state.timerSeconds = timer.remainingSeconds;
  state.timerSessionDay = state.dayNum;
  state.tab = "timer";
  startTimerTicker();
  autoSave();
  render();
}

function startTimerTicker() {
  clearTimerInterval();
  const timer = getDiscussionTimer();
  if (!canConfigureDiscussionTimers() || !timer?.enabled) {
    state.timerRunning = false;
    updateTimerDisplay();
    return;
  }
  if (state.timerSeconds <= 0) {
    state.timerRunning = false;
    updateTimerDisplay();
    return;
  }
  prepareAlarmAudio();
  state.timerRunning = true;
  state.timerDeadline = Date.now() + (state.timerSeconds * 1000);
  let lastPersistedAt = Date.now();
  state.timerIntervalId = setInterval(() => {
    if (state.timerRunning && state.timerSeconds > 0) {
      const nextSeconds = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
      if (nextSeconds === state.timerSeconds) return;
      state.timerSeconds = nextSeconds;
      if (state.timerSeconds === 0) {
        state.timerRunning = false;
        state.timerDeadline = null;
        clearTimerInterval();
        playAlarmAudio();
      }
      syncActiveDiscussionTimer();
      if (Date.now() - lastPersistedAt >= 15000 || state.timerSeconds === 0) {
        autoSave();
        lastPersistedAt = Date.now();
      }
      updateTimerDisplay(state.timerSeconds === 0);
    }
  }, 1000);
}

function toggleTimerRunning() {
  if (state.phase !== "day" || !canConfigureDiscussionTimers() || !getDiscussionTimer()?.enabled) return;
  if (state.timerRunning) {
    stopTimer();
  } else {
    if (state.timerSeconds <= 0) {
      state.timerSeconds = state.timerTotal;
      syncActiveDiscussionTimer();
    }
    startTimerTicker();
  }
  autoSave();
  updateTimerDisplay();
}

function adjustTimerVal(seconds) {
  if (state.phase !== "day" || !canConfigureDiscussionTimers() || !getDiscussionTimer()?.enabled) return;
  const previousSeconds = state.timerSeconds;
  recordHistory(`${discussionTypeLabel(state.activeDiscussionType)} timer adjustment`);
  state.timerSeconds = Math.max(0, Math.min(MAX_DISCUSSION_TIMER_SECONDS, state.timerSeconds + seconds));
  const appliedSeconds = state.timerSeconds - previousSeconds;
  if (state.timerRunning && Number.isFinite(Number(state.timerDeadline))) {
    state.timerDeadline += appliedSeconds * 1000;
  }
  state.timerTotal = normalizeDiscussionDuration(state.timerTotal + Math.max(0, appliedSeconds), state.timerTotal);
  syncActiveDiscussionTimer(true);
  autoSave();
  updateTimerDisplay();
}

function resetTimerVal() {
  if (state.phase !== "day" || !canConfigureDiscussionTimers()) return;
  const timer = getDiscussionTimer();
  if (!timer?.enabled) return;
  recordHistory(`${discussionTypeLabel(state.activeDiscussionType)} timer reset`);
  stopTimer();
  state.timerTotal = timer.durationSeconds;
  state.timerSeconds = timer.durationSeconds;
  syncActiveDiscussionTimer();
  autoSave();
  updateTimerDisplay();
}

function clearTimerInterval() {
  if (state.timerIntervalId !== null) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function stopTimer() {
  if (state.timerRunning && Number.isFinite(Number(state.timerDeadline))) {
    state.timerSeconds = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
  }
  state.timerRunning = false;
  state.timerDeadline = null;
  clearTimerInterval();
  if (canConfigureDiscussionTimers() && state.timerSessionDay === state.dayNum) {
    syncActiveDiscussionTimer();
  }
}

function updateTimerDisplay(announceCompletion = false) {
  const display = document.getElementById("discussion-timer-display");
  const progress = document.getElementById("discussion-timer-progress");
  const toggle = document.getElementById("discussion-timer-toggle");
  const toggleLabel = document.getElementById("discussion-timer-toggle-label");
  const completion = document.getElementById("discussion-timer-complete");
  const pct = state.timerTotal > 0 ? Math.max(0, Math.min(1, state.timerSeconds / state.timerTotal)) : 0;
  const circumference = 88 * 2 * Math.PI;

  const displayValue = formatTime(state.timerSeconds);
  const progressOffset = String(circumference - pct * circumference);
  const controlState = state.timerRunning ? "running" : "paused";
  const controlLabel = state.timerRunning ? "Pause" : "Start";
  const completionMessage = announceCompletion
    ? `${discussionTypeLabel(state.activeDiscussionType)} discussion timer finished.`
    : "";

  if (display && display.textContent !== displayValue) display.textContent = displayValue;
  if (progress && progress.style.strokeDashoffset !== progressOffset) {
    progress.style.strokeDashoffset = progressOffset;
  }
  if (toggle) {
    if (toggle.dataset.timerState !== controlState) {
      toggle.dataset.timerState = controlState;
      toggle.innerHTML = iconSvg(state.timerRunning ? "pause" : "play", 18);
      toggle.setAttribute("aria-label", `${controlLabel} ${discussionTypeLabel(state.activeDiscussionType).toLowerCase()} discussion timer`);
    }
  }
  if (toggleLabel && toggleLabel.textContent !== controlLabel) toggleLabel.textContent = controlLabel;
  if (completion && completion.textContent !== completionMessage) completion.textContent = completionMessage;
}

let alarmAudioContext = null;

function prepareAlarmAudio() {
  try {
    if (!alarmAudioContext) alarmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (alarmAudioContext.state === "suspended") void alarmAudioContext.resume();
  } catch (error) {}
}

function playAlarmAudio() {
  try {
    prepareAlarmAudio();
    const ctx = alarmAudioContext;
    if (!ctx) return;
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

function getUltimateWinnerOptions() {
  if (!isUltimateWerewolf()) return [];
  const teamOptions = S().winnerGroups.map(group => ({
    id: `team:${group.id}`,
    label: group.label
  }));
  const individualOptions = Object.entries(state.assignments)
    .filter(([, roleId]) => S().soloWinnerRoles.includes(roleId))
    .map(([playerIndex, roleId]) => ({
      id: `player:${playerIndex}`,
      label: `${state.names[playerIndex]} — ${S().C[roleId].name}`,
      icon: "user"
    }));
  return [...teamOptions, ...individualOptions];
}

function openUltimateWinnerPicker() {
  state.showWinnerPicker = true;
  state.winnerSelection = state.winnerSelection ?? [];
  autoSave();
  render();
}

function toggleUltimateWinner(winnerId, isSelected) {
  const currentSelection = new Set(state.winnerSelection ?? []);
  if (isSelected) currentSelection.add(winnerId);
  else currentSelection.delete(winnerId);
  state.winnerSelection = [...currentSelection];
  autoSave();
  render();
}

function ultimateWinnerLabel(winnerId) {
  return getUltimateWinnerOptions().find(option => option.id === winnerId)?.label ?? winnerId;
}

function confirmUltimateWinners() {
  if (!isUltimateWerewolf() || (state.winnerSelection?.length ?? 0) === 0) return;
  recordHistory("game conclusion");
  stopTimer();
  const winnerLabels = state.winnerSelection.map(ultimateWinnerLabel);
  state.winTeam = "manual";
  state.showWinnerPicker = false;
  state.screen = "victory";
  state.chronicle.push({
    type: "system",
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: "Game Concluded",
    details: `The moderator declared the following winner${winnerLabels.length === 1 ? "" : "s"}: <strong>${winnerLabels.map(esc).join(", ")}</strong>.`,
    badgeColor: "var(--orange)"
  });
  autoSave();
  if (typeof dispatchGameEmail === "function") void dispatchGameEmail("game-end");
  render();
}

function requestWin(team) {
  if (!['good', 'evil'].includes(team)) return;
  const label = team === "good" ? "Good" : "Evil";
  state.confirm = {
    msg: `End the game and declare ${label} victorious? You can undo this from the Storyteller menu.`,
    onYes: team === "good" ? "confirmGoodWin" : "confirmEvilWin"
  };
  render();
}

function confirmGoodWin() {
  triggerWin("good");
}

function confirmEvilWin() {
  triggerWin("evil");
}

function triggerWin(team) {
  if (!["good", "evil"].includes(team)) return;
  recordHistory("game conclusion");
  stopTimer();
  state.winTeam = team;
  state.screen = "victory";
  
  // Log winning state to chronicle
  state.chronicle.push({
    type: "system",
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: "Tragedy Concluded",
    details: `The Storyteller has declared victory for <strong>${team.toUpperCase()}</strong>!`,
    badgeColor: team === "good" ? "var(--green)" : "var(--red)"
  });

  autoSave();
  if (typeof dispatchGameEmail === "function") void dispatchGameEmail("game-end");
  render();
}

function proceedToNightStep() {
  if (state.phase !== "day") return;
  recordHistory(`start Night ${state.dayNum + 1}`);
  stopTimer();
  state.phase = "night";
  state.dayNum++;
  if (state.courtierEffect && Number(state.courtierEffect.expiresAfterDay) < state.dayNum) state.courtierEffect = null;
  state.activeWakeIdx = 0;
  state.nightLog = [];
  state.deathsLastNight = [];
  state.poisonedIndex = null;
  state.nightProtected = [];
  state.tab = "night";

  autoSave();
  render();
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW 8: VICTORY SCREEN (`Victory Screen.png`)
// ══════════════════════════════════════════════════════════════════════════
function renderVictoryScreen() {
  if (isUltimateWerewolf()) {
    const winnerLabels = (state.winnerSelection ?? []).map(ultimateWinnerLabel);
    return `
      <div class="screen fade-in" style="padding-top:32px;text-align:center">
        <div style="width:160px;height:160px;border-radius:50%;background:rgba(243,156,18,0.05);border:2px dashed var(--orange);box-shadow:0 0 40px rgba(243,156,18,0.2);margin:0 auto 24px;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite">
          ${iconSvg("trophy", 72)}
        </div>
        <h1 style="font-family:var(--font-serif);font-size:38px;color:var(--orange);margin-bottom:12px">WINNERS DECLARED</h1>
        <p style="color:var(--text3);font-size:13px;margin-bottom:16px">Ultimate Werewolf supports simultaneous team and role victories.</p>
        <div class="card" style="text-align:left;margin-bottom:24px">
          ${winnerLabels.map(label => `<div style="padding:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">${iconSvg("trophy", 16)} ${esc(label)}</div>`).join("")}
        </div>
        <button class="btn btn-primary" onclick="showChronicleEnd()">${iconSvg("book", 18)} View Game Summary</button>
        <div style="margin-top:40px;text-align:right">
          <button class="timer-adj-btn" aria-label="Reset and start a new game" style="width:48px;height:48px;border-radius:50%;display:inline-flex" onclick="resetEngine()">${iconSvg("refresh", 20)}</button>
        </div>
      </div>
    `;
  }

  const isGood = state.winTeam === "good";
  const colors = isGood ? TYPE_CLR.townsfolk : TYPE_CLR.demon;
  const title = isGood ? "TOWNSFOLK WIN" : "DEMONS WIN";
  const desc = isGood ? "Light has triumphed. The evil has been banished from our village." : "The town has fallen to the darkness. Ravenswood Bluff is no more.";

  return `
    <div class="screen fade-in" style="padding-top:32px;text-align:center">
      <!-- Glow Portal symbol -->
      <div style="width:160px;height:160px;border-radius:50%;background:rgba(149,27,30,0.05);border:2px dashed ${colors.bdr};box-shadow: 0 0 40px ${colors.bdr}33;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite">
        ${iconSvg(isGood ? "good" : "evil", 72)}
      </div>

      <h1 style="font-family:var(--font-serif);font-size:38px;color:${colors.txt};margin-bottom:12px;letter-spacing:1px">${title}</h1>
      <p style="color:var(--text3);font-size:14px;line-height:1.6;margin-bottom:32px;padding:0 20px">${desc}</p>

      <button class="btn btn-primary" onclick="showChronicleEnd()">${iconSvg("book", 18)} View Game Summary</button>
      
      <!-- Replay / Reset btn bottom-right -->
      <div style="margin-top:40px;text-align:right">
        <button class="timer-adj-btn" aria-label="Reset and start a new game" style="width:48px;height:48px;border-radius:50%;display:inline-flex" onclick="resetEngine()">${iconSvg("refresh", 20)}</button>
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
    let icon = "bell";
    if (c.type === "night") icon = "moon";
    if (c.type === "system" && String(c.title).includes("Tragedy Begins")) icon = "book";
    if (c.type === "system" && String(c.title).includes("Concluded")) icon = "trophy";
    if (c.type === "day") icon = "sun";

    timeline += `
      <div style="position:relative;padding-left:36px;margin-bottom:20px;text-align:left">
        <!-- Vertical connector line -->
        ${idx < state.chronicle.length - 1 ? `<div style="position:absolute;left:13px;top:26px;bottom:-20px;width:2px;background:var(--border)"></div>` : ''}
        
        <!-- Timeline dot -->
        <div style="position:absolute;left:0;top:2px;width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;z-index:2">
          ${iconSvg(icon, 14)}
        </div>

        <div class="card" style="margin:0;padding:12px 16px;border-radius:10px;border-left:4px solid ${c.badgeColor || 'var(--border)'}">
          <div style="font-size:10px;text-transform:uppercase;color:var(--text3);letter-spacing:1px;font-weight:700;margin-bottom:4px">
            ${c.nightNum ? `Night ${c.nightNum}` : c.dayNum ? `Day ${c.dayNum}` : 'SETUP'}
          </div>
          <h4 style="font-family:var(--font-serif);color:var(--text);font-size:15px;margin-bottom:4px">${esc(c.title)}</h4>
          <p style="font-size:12px;color:var(--text2);line-height:1.5;white-space:pre-line">${esc(plainText(c.details))}</p>
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

      <button class="btn btn-primary" onclick="state.confirm={msg:'Start a completely new session? Your current game will be erased.',onYes:'resetEngine'};render()">${iconSvg("refresh", 18)} Reset &amp; New Game</button>
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
    <nav class="bottom-nav" aria-label="Game sections" style="position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:12px 0;z-index:200;backdrop-filter:blur(10px)">
      <button ${state.tab === 'grimoire' ? 'aria-current="page"' : ''} style="background:none;border:none;color:${state.tab === 'grimoire' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('grimoire')">
        ${iconSvg("eye", 19)}
        Grimoire
      </button>
      ${state.winTeam ? "" : state.phase === "night" ? `
        <button ${state.tab === 'night' ? 'aria-current="page"' : ''} style="background:none;border:none;color:${state.tab === 'night' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('night')">
          ${iconSvg("moon", 19)}
          Night Sequence
        </button>
      ` : `
        <button ${state.tab === 'day' || state.tab === 'timer' ? 'aria-current="page"' : ''} style="background:none;border:none;color:${state.tab === 'day' || state.tab === 'timer' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('day')">
          ${iconSvg("users", 19)}
          Town Square
        </button>
      `}
      <button ${state.tab === 'chronicle' ? 'aria-current="page"' : ''} style="background:none;border:none;color:${state.tab === 'chronicle' ? 'var(--red)' : 'var(--text3)'};font-size:11px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="setTab('chronicle')">
        ${iconSvg("book", 19)}
        Chronicle
      </button>
    </nav>
  `;
}

function setTab(t) {
  const allowedTabs = new Set(["grimoire", "chronicle"]);
  if (!state.winTeam && state.phase === "night") allowedTabs.add("night");
  if (!state.winTeam && state.phase === "day") allowedTabs.add("day");
  if (!state.winTeam && state.phase === "day" && canConfigureDiscussionTimers()) allowedTabs.add("timer");
  if (!allowedTabs.has(t)) {
    showToast(state.phase === "night" ? "Finish the current night before opening Town Square." : "Night Sequence opens when the next night begins.", "error");
    return;
  }
  state.tab = t;
  autoSave();
  render();
}

function isPlayerPubliclyAlive(playerIndex) {
  return state.alive[playerIndex] !== false && state.registeredDead?.[playerIndex] !== true;
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
    const believedRole = chars[getDrunkBelievedRoleId(i)];
    const displayRole = believedRole ?? c;
    const colors = roleColors(displayRole);
    const isAlive = state.alive[i] !== false;
    const isRegisteredDead = isAlive && state.registeredDead?.[i] === true;
    const isPubliclyAlive = isAlive && !isRegisteredDead;

    let badgeText = isRegisteredDead ? "Registers dead" : isAlive ? "Alive" : "Dead";
    let badgeColor = isPubliclyAlive ? "var(--green)" : "var(--red)";
    const isPoisoned = state.scriptId === "tb" && isPoisonedSeat(i);

    let voteIndicator = "";
    if (isUltimateWerewolf()) {
      if ((state.votes[i] ?? 1) > 0) {
        voteIndicator = `<span class="vote-indicator" title="Votes: ${state.votes[i] ?? 1}">${iconSvg("check", 14)} ${state.votes[i] ?? 1}</span>`;
      }
    } else {
      if (isPubliclyAlive) {
        if ((state.votes[i] ?? 1) !== 1) {
          voteIndicator = `<span class="vote-indicator" title="Votes: ${state.votes[i] ?? 1}">${iconSvg("check", 14)} ${state.votes[i] ?? 1}</span>`;
        }
      } else {
        if (state.ghostVotes[i]) {
          voteIndicator = `<span class="vote-indicator is-spent" title="Ghost vote spent">${iconSvg("user", 14)} Spent</span>`;
        } else {
          voteIndicator = `<span class="vote-indicator" title="Ghost vote available">${iconSvg("user", 14)} Vote</span>`;
        }
      }
    }

    playerGrid += `
      <div class="player-row" style="background:rgba(30,30,30,0.3);margin-bottom:10px;border-radius:10px;border:1px solid ${isPubliclyAlive ? 'var(--border)' : 'var(--red)33'}">
        <button type="button" class="player-main" aria-expanded="${state.expandedPlayer === i}" aria-controls="player-details-${i}" onclick="togglePlayerExpand(${i})">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="seat-num" style="background:${colors.bdr};border:none">${i + 1}</div>
            <div>
              <span style="font-weight:700;font-size:15px;color:var(--text);${isPubliclyAlive ? '' : 'text-decoration:line-through;opacity:0.6'}">${esc(state.names[i])}</span>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font-size:11px;font-weight:700;color:${colors.txt}">${believedRole ? `Drunk (${esc(believedRole.name)})` : esc(displayRole.name)}</span>
                <span style="font-size:9px;color:var(--text3);text-transform:uppercase">(${esc(roleCategoryLabel(displayRole))})</span>
                ${!isUltimateWerewolf() && playerAlignment(i) !== c?.team ? `<span style="font-size:9px;color:var(--orange);text-transform:uppercase">${esc(playerAlignment(i))} alignment</span>` : ""}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:12px">
            ${voteIndicator}
            ${isPoisoned ? `<span style="font-size:10px;text-transform:uppercase;font-weight:700;color:var(--purple);background:rgba(142,68,173,0.16);border:1px solid rgba(142,68,173,0.4);padding:4px 8px;border-radius:4px">Poisoned</span>` : ""}
            <span style="font-size:10px;text-transform:uppercase;font-weight:700;color:${badgeColor};background:${badgeColor}11;border:1px solid ${badgeColor}33;padding:4px 8px;border-radius:4px">
              ${badgeText}
            </span>
            <span style="color:var(--text3)">${iconSvg(state.expandedPlayer === i ? "chevronUp" : "chevronDown", 15)}</span>
          </div>
        </button>

        <!-- Expansion drawer -->
        ${state.expandedPlayer === i ? `
          <div id="player-details-${i}" class="player-expand" style="border-top:1px solid var(--border);padding:14px;background:rgba(0,0,0,0.2);border-bottom-left-radius:10px;border-bottom-right-radius:10px">
            ${believedRole ? `
              <div class="warn warn-red" style="margin:0 0 10px"><strong>Actual character: Drunk.</strong> The believed ability has no effect.</div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5"><strong>Believed ${esc(believedRole.name)} ability:</strong> ${esc(believedRole.ab)}</div>
              <div class="warn warn-orange" style="margin:0 0 12px">For action, passive, and daytime abilities, manually ignore or nullify every assumed effect. The app will not resolve it.</div>
            ` : `
              <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5">
                <strong>Ability:</strong> ${esc(c.ab)}
              </div>
            `}
            ${displayRole.variation ? `<div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.5"><strong>Reference variation:</strong> ${esc(displayRole.variation)}</div>` : ""}
            ${isUltimateWerewolf() && !isAlive ? `<div class="warn warn-orange" style="margin:0 0 12px">May silently watch at night. Cannot act, be targeted, or vote.</div>` : ""}
            
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <button class="btn-sm" style="flex:1;background:${isAlive ? 'var(--red)15' : 'var(--green)15'};color:${isAlive ? 'var(--red)' : 'var(--green)'};border:1px solid ${isAlive ? 'var(--red)' : 'var(--green)'}44" onclick="togglePlayerAlive(${i})">
                ${iconSvg(isAlive ? "skull" : "heart", 16)} ${isAlive ? (c?.id === "zombuul" ? "Mark Truly Dead" : "Mark Dead") : 'Resurrect'}
              </button>
              ${state.scriptId === "bmr" && c?.id === "zombuul" && isAlive ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="toggleRegisteredDead(${i})">
                ${iconSvg(isRegisteredDead ? "heart" : "eye", 16)} ${isRegisteredDead ? "Register alive" : "Register dead"}
              </button>` : ""}
              ${state.phase === "day" && !isUltimateWerewolf() && isPubliclyAlive ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--orange);color:var(--orange)" onclick="requestExecution(${i})" ${state.executedTodayIndex !== null ? "disabled" : ""}>
                ${iconSvg("gavel", 16)} ${state.executedTodayIndex === null ? "Record Execution" : "Execution Recorded"}
              </button>` : ""}
              ${state.phase === "day" && state.scriptId === "bmr" && isPubliclyAlive ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--green);color:var(--green)" onclick="requestExecution(${i}, true)" ${state.executedTodayIndex !== null ? "disabled" : ""}>
                ${iconSvg("shield", 16)} Record Survived Execution
              </button>` : ""}
              ${state.scriptId === "tb" && displayRole?.id === "imp" && isAlive && canTriggerStarpass(i) ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="triggerStarpass(${i})">
                ${iconSvg("crown", 16)} Trigger Starpass
              </button>` : ""}
              ${state.scriptId === "bmr" && c?.id === "goon" ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="setPlayerAlignment(${i}, '${playerAlignment(i) === "evil" ? "good" : "evil"}')">
                ${iconSvg("swap", 16)} Set ${playerAlignment(i) === "evil" ? "Good" : "Evil"}
              </button>` : ""}
              ${!isUltimateWerewolf() ? `<button class="btn-sm" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="openInGameCharacterEditor(${i})">
                ${iconSvg("swap", 16)} Change / swap character
              </button>` : ""}
            </div>

            <!-- Vote & Ghost Vote Controls -->
            <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--text2)">
                <span>Vote Tokens: <strong>${state.votes[i] ?? 1}</strong></span>
                <div style="display:flex;gap:4px">
                  <button class="timer-adj-btn compact-adjust" aria-label="Remove one vote token from ${esc(state.names[i])}" onclick="adjustPlayerVotes(${i}, -1);event.stopPropagation()">−</button>
                  <button class="timer-adj-btn compact-adjust" aria-label="Add one vote token to ${esc(state.names[i])}" onclick="adjustPlayerVotes(${i}, 1);event.stopPropagation()">+</button>
                </div>
              </div>
              ${!isPubliclyAlive && !isUltimateWerewolf() ? `
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--text2)">
                  <span>Ghost Vote: <strong>${state.ghostVotes[i] ? "Used" : "Available"}</strong></span>
                  <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:2px 8px;font-size:11px" onclick="toggleGhostVote(${i});event.stopPropagation()">
                    ${state.ghostVotes[i] ? "Restore" : "Spend"}
                  </button>
                </div>
              ` : ""}
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

      ${state.scriptId === "tb" && hasFortuneTellerContext() ? `
        <div class="card" style="padding:12px;border-color:var(--red);font-size:12px">
          <strong style="color:var(--red);display:inline-flex;align-items:center;gap:6px">${iconSvg("user", 15)} Red Herring:</strong>
          ${state.redHerringIndex === null ? "Not configured" : `${esc(state.names[state.redHerringIndex])} (Seat ${Number(state.redHerringIndex) + 1})`}
        </div>
      ` : ""}
      <div style="margin-bottom:24px">${playerGrid}</div>

      <button class="btn btn-outline" style="width:100%" onclick="state.confirm={msg:'Declare new game? This deletes session progress.',onYes:'resetEngine'};render()">
        ${iconSvg("refresh", 18)} New Game / Reset
      </button>
    </div>
  `;
}

function togglePlayerExpand(idx) {
  state.expandedPlayer = state.expandedPlayer === idx ? -1 : idx;
  render();
}

function openInGameCharacterEditor(playerIndex) {
  if (isUltimateWerewolf() || !Number.isInteger(playerIndex) || !state.assignments[playerIndex]) return;
  const characterOptions = Object.values(S().C)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(character => {
      const assignedSeat = Object.entries(state.assignments)
        .find(([seat, roleId]) => Number(seat) !== playerIndex && roleId === character.id)?.[0];
      return `
        <button class="btn" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);margin-bottom:6px" ${assignedSeat !== undefined ? "disabled" : ""}
          onclick="changePlayerCharacter(${playerIndex}, '${character.id}')">
          ${renderRoleImage(character.id, character.type, 20)} ${esc(character.name)}
        </button>
      `;
    }).join("");
  const swapOptions = Object.keys(state.assignments)
    .map(Number)
    .filter(otherIndex => otherIndex !== playerIndex)
    .map(otherIndex => `
      <div style="border:1px solid var(--border);border-radius:7px;padding:8px;margin-bottom:8px">
        <strong style="display:block;margin-bottom:6px">${esc(state.names[otherIndex])} — ${esc(S().C[state.assignments[otherIndex]]?.name ?? "Unknown")}</strong>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-sm" style="flex:1" onclick="swapPlayerCharacters(${playerIndex}, ${otherIndex}, false)">${iconSvg("swap", 15)} Characters only</button>
          <button class="btn-sm" style="flex:1" onclick="swapPlayerCharacters(${playerIndex}, ${otherIndex}, true)">${iconSvg("swap", 15)} Characters + alignments</button>
        </div>
      </div>
    `).join("");
  state.showCard = {
    title: `Update ${state.names[playerIndex]}'s character`,
    icon: "swap",
    html: `
      <p style="margin-bottom:10px">Replace preserves the player's alignment. For a Barber, swap characters only. For a Snake Charmer, swap characters and alignments. These controls update later wake lists and can be undone.</p>
      <details style="text-align:left;margin-bottom:10px"><summary>Replace character</summary><div style="max-height:220px;overflow:auto;margin-top:8px">${characterOptions}</div></details>
      <details style="text-align:left"><summary>Swap with another player</summary><div style="max-height:220px;overflow:auto;margin-top:8px">${swapOptions}</div></details>
    `
  };
  render();
}

function clearSeatAbilityUsage(playerIndex) {
  state.usedAbilities = state.usedAbilities ?? {};
  Object.keys(state.usedAbilities).forEach(key => {
    if (key.startsWith(`${playerIndex}:`)) delete state.usedAbilities[key];
  });
}

function setPlayerAlignment(playerIndex, alignment) {
  if (isUltimateWerewolf() || !["good", "evil"].includes(alignment) || !state.assignments[playerIndex]) return;
  if (playerAlignment(playerIndex) === alignment) return;
  recordHistory(`${state.names[playerIndex]}'s alignment change`);
  state.alignments[playerIndex] = alignment;
  state.chronicle.push({
    type: state.phase,
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: "Alignment Changed",
    details: `${state.names[playerIndex]} is now ${alignment}.`,
    badgeColor: alignment === "evil" ? "var(--red)" : "var(--blue)"
  });
  autoSave();
  render();
}

function changePlayerCharacter(playerIndex, roleId) {
  const nextRole = S().C[roleId];
  const previousRoleId = state.assignments[playerIndex];
  if (!nextRole || previousRoleId === roleId) {
    state.showCard = null;
    render();
    return;
  }
  if (Object.entries(state.assignments).some(([seat, assignedRoleId]) => Number(seat) !== playerIndex && assignedRoleId === roleId)) {
    showToast("That character is already in play. Use Swap instead.", "error");
    return;
  }
  recordHistory(`${state.names[playerIndex]}'s character change`);
  state.alignments[playerIndex] = playerAlignment(playerIndex);
  state.assignments[playerIndex] = roleId;
  const poolIndex = state.rolePool.indexOf(previousRoleId);
  if (poolIndex >= 0) state.rolePool[poolIndex] = roleId;
  clearSeatAbilityUsage(playerIndex);
  delete state.previousNightTargets?.[priorTargetKey(playerIndex, previousRoleId)];
  delete state.previousNightTargets?.[priorTargetKey(playerIndex, roleId)];
  delete state.gainedAbilities?.[playerIndex];
  delete state.lunaticBelievedRoles?.[playerIndex];
  delete state.lunaticPoCharged?.[playerIndex];
  if (previousRoleId === "po" || roleId === "po") state.poCharged = false;
  if (roleId !== "zombuul") state.registeredDead[playerIndex] = false;
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
  state.chronicle.push({
    type: state.phase,
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: "Character Changed",
    details: `${state.names[playerIndex]} changed from ${S().C[previousRoleId]?.name ?? previousRoleId} to ${nextRole.name}.`,
    badgeColor: roleColors(nextRole).bdr
  });
  state.showCard = null;
  autoSave();
  render();
}

function swapPlayerCharacters(firstIndex, secondIndex, swapAlignments = false) {
  if (isUltimateWerewolf() || firstIndex === secondIndex || !state.assignments[firstIndex] || !state.assignments[secondIndex]) return;
  const firstRoleId = state.assignments[firstIndex];
  const secondRoleId = state.assignments[secondIndex];
  const firstAlignment = playerAlignment(firstIndex);
  const secondAlignment = playerAlignment(secondIndex);
  recordHistory(`${state.names[firstIndex]} and ${state.names[secondIndex]} ${swapAlignments ? "character and alignment" : "character"} swap`);
  state.assignments[firstIndex] = secondRoleId;
  state.assignments[secondIndex] = firstRoleId;
  state.alignments[firstIndex] = swapAlignments ? secondAlignment : firstAlignment;
  state.alignments[secondIndex] = swapAlignments ? firstAlignment : secondAlignment;
  const priorUsage = { ...(state.usedAbilities ?? {}) };
  clearSeatAbilityUsage(firstIndex);
  clearSeatAbilityUsage(secondIndex);
  if (priorUsage[abilityUsageKey(firstIndex, firstRoleId)]) state.usedAbilities[abilityUsageKey(secondIndex, firstRoleId)] = true;
  if (priorUsage[abilityUsageKey(secondIndex, secondRoleId)]) state.usedAbilities[abilityUsageKey(firstIndex, secondRoleId)] = true;
  const firstPriorTarget = state.previousNightTargets?.[priorTargetKey(firstIndex, firstRoleId)];
  const secondPriorTarget = state.previousNightTargets?.[priorTargetKey(secondIndex, secondRoleId)];
  delete state.previousNightTargets?.[priorTargetKey(firstIndex, firstRoleId)];
  delete state.previousNightTargets?.[priorTargetKey(secondIndex, secondRoleId)];
  if (firstPriorTarget) state.previousNightTargets[priorTargetKey(secondIndex, firstRoleId)] = firstPriorTarget;
  if (secondPriorTarget) state.previousNightTargets[priorTargetKey(firstIndex, secondRoleId)] = secondPriorTarget;
  const firstGainedAbility = state.gainedAbilities?.[firstIndex];
  const secondGainedAbility = state.gainedAbilities?.[secondIndex];
  const firstUsesSnakeCharmer = firstRoleId === "snakecharmer"
    || (firstRoleId === "philosopher" && firstGainedAbility === "snakecharmer");
  const secondUsesSnakeCharmer = secondRoleId === "snakecharmer"
    || (secondRoleId === "philosopher" && secondGainedAbility === "snakecharmer");
  delete state.gainedAbilities?.[firstIndex];
  delete state.gainedAbilities?.[secondIndex];
  if (firstRoleId === "philosopher" && firstGainedAbility) state.gainedAbilities[secondIndex] = firstGainedAbility;
  if (secondRoleId === "philosopher" && secondGainedAbility) state.gainedAbilities[firstIndex] = secondGainedAbility;
  const firstLunaticBelief = state.lunaticBelievedRoles?.[firstIndex];
  const secondLunaticBelief = state.lunaticBelievedRoles?.[secondIndex];
  const firstLunaticCharge = state.lunaticPoCharged?.[firstIndex] === true;
  const secondLunaticCharge = state.lunaticPoCharged?.[secondIndex] === true;
  delete state.lunaticBelievedRoles?.[firstIndex];
  delete state.lunaticBelievedRoles?.[secondIndex];
  delete state.lunaticPoCharged?.[firstIndex];
  delete state.lunaticPoCharged?.[secondIndex];
  if (firstRoleId === "lunatic" && firstLunaticBelief) {
    state.lunaticBelievedRoles[secondIndex] = firstLunaticBelief;
    state.lunaticPoCharged[secondIndex] = firstLunaticCharge;
  }
  if (secondRoleId === "lunatic" && secondLunaticBelief) {
    state.lunaticBelievedRoles[firstIndex] = secondLunaticBelief;
    state.lunaticPoCharged[firstIndex] = secondLunaticCharge;
  }
  if (swapAlignments) {
    if (firstUsesSnakeCharmer && S().C[secondRoleId]?.type === "demon") state.permanentlyPoisoned[secondIndex] = true;
    if (secondUsesSnakeCharmer && S().C[firstRoleId]?.type === "demon") state.permanentlyPoisoned[firstIndex] = true;
  }
  state.registeredDead[firstIndex] = false;
  state.registeredDead[secondIndex] = false;
  normalizeTroubleBrewingSetupState();
  normalizeLunaticSetupState();
  state.chronicle.push({
    type: state.phase,
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: "Characters Swapped",
    details: `${state.names[firstIndex]} and ${state.names[secondIndex]} exchanged character tokens${swapAlignments ? " and alignments" : " while keeping their alignments"}.`,
    badgeColor: "var(--purple)"
  });
  const snakeCharmerSwap = swapAlignments && (
    (firstUsesSnakeCharmer && S().C[secondRoleId]?.type === "demon")
    || (secondUsesSnakeCharmer && S().C[firstRoleId]?.type === "demon")
  );
  state.showCard = snakeCharmerSwap
    ? {
        title: "Snake Charmer Swap",
        icon: "swap",
        text: `Wake ${state.names[firstIndex]} and ${state.names[secondIndex]}. Show each player their new character and alignment. The former Demon, now ${S().C[state.assignments[firstUsesSnakeCharmer ? secondIndex : firstIndex]]?.name ?? "the new good character"}, is poisoned.`
      }
    : null;
  autoSave();
  render();
}

function resolveTroubleBrewingDemonDeath(deadPlayerIndex, livingCountBeforeDeath) {
  if (state.scriptId !== "tb" || livingCountBeforeDeath < 5) return null;
  const demonRoleId = state.assignments[deadPlayerIndex];
  if (S().C[demonRoleId]?.type !== "demon") return null;
  const successorEntry = Object.entries(state.assignments).find(([seat, roleId]) => (
    roleId === "scarletwoman"
    && state.alive[seat] !== false
    && Number(seat) !== deadPlayerIndex
    && !isPoisonedSeat(seat)
  ));
  if (!successorEntry) return null;
  const successorIndex = Number(successorEntry[0]);
  state.assignments[successorIndex] = demonRoleId;
  state.alignments[successorIndex] = "evil";
  state.chronicle.push({
    type: "system",
    dayNum: state.dayNum,
    title: "Scarlet Woman Becomes the Demon",
    details: `${state.names[successorIndex]} became the new Demon after ${state.names[deadPlayerIndex]} died.`,
    badgeColor: "var(--red)"
  });
  state.showCard = {
    title: "Scarlet Woman Becomes the Imp",
    icon: "crown",
    text: `Wake ${state.names[successorIndex]}, show “You are” and the Imp token, then put them to sleep before continuing.`
  };
  return successorIndex;
}

function toggleRegisteredDead(playerIndex) {
  if (
    state.scriptId !== "bmr"
    || state.assignments[playerIndex] !== "zombuul"
    || state.alive[playerIndex] === false
  ) return;
  const wasRegisteredDead = state.registeredDead?.[playerIndex] === true;
  recordHistory(`${state.names[playerIndex]} registration change`);
  state.registeredDead = state.registeredDead ?? {};
  state.registeredDead[playerIndex] = !wasRegisteredDead;
  state.chronicle.push({
    type: state.phase,
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: wasRegisteredDead ? "Zombuul Registers Alive" : "Zombuul Registers Dead",
    details: `${state.names[playerIndex]} remains mechanically alive and ${wasRegisteredDead ? "no longer registers as dead" : "now registers as dead"}.`,
    badgeColor: wasRegisteredDead ? "var(--green)" : "var(--red)"
  });
  autoSave();
  render();
}

function requestExecution(playerIndex, survived = false) {
  if (state.phase !== "day" || isUltimateWerewolf() || !isPlayerPubliclyAlive(playerIndex)) return;
  if (state.executedTodayIndex !== null) {
    showToast("An execution has already been recorded for this day. Undo it before choosing another.", "error");
    return;
  }
  state.confirm = {
    msg: survived
      ? `Record ${state.names[playerIndex]} as executed but still alive?`
      : `Record ${state.names[playerIndex]} as executed and dead?`,
    onYes: "confirmExecution",
    context: { playerIndex, survived: Boolean(survived) }
  };
  render();
}

function confirmExecution(context = {}) {
  const playerIndex = Number(context.playerIndex);
  const survived = context.survived === true;
  if (
    state.phase !== "day"
    || isUltimateWerewolf()
    || !Number.isInteger(playerIndex)
    || playerIndex < 0
    || playerIndex >= state.playerCount
    || !isPlayerPubliclyAlive(playerIndex)
    || state.executedTodayIndex !== null
  ) {
    render();
    return;
  }
  const livingCountBeforeDeath = Object.keys(state.assignments).map(Number).filter(isPlayerPubliclyAlive).length;
  recordHistory(`execution of ${state.names[playerIndex]}`);
  state.executedTodayIndex = playerIndex;
  state.deathsToday = state.deathsToday ?? [];
  const zombuulFirstDeath = !survived
    && state.scriptId === "bmr"
    && state.assignments[playerIndex] === "zombuul"
    && state.registeredDead?.[playerIndex] !== true
    && !isPlayerAbilityImpaired(playerIndex, "zombuul");
  if (!survived) {
    if (zombuulFirstDeath) {
      state.registeredDead[playerIndex] = true;
    } else {
      state.alive[playerIndex] = false;
      state.registeredDead[playerIndex] = false;
      addPendingMoonchild(playerIndex);
    }
    if (!zombuulFirstDeath && !state.deathsToday.includes(playerIndex)) state.deathsToday.push(playerIndex);
  }
  state.chronicle.push({
    type: "day",
    dayNum: state.dayNum,
    title: survived ? "Execution Survived" : "Execution",
    details: zombuulFirstDeath
      ? `${state.names[playerIndex]} was executed, remained alive, and now registers as dead.`
      : survived
      ? `${state.names[playerIndex]} was executed but did not die.`
      : `${state.names[playerIndex]} died by execution.`,
    badgeColor: survived ? "var(--green)" : "var(--red)"
  });
  if (!survived && !zombuulFirstDeath) resolveTroubleBrewingDemonDeath(playerIndex, livingCountBeforeDeath);
  autoSave();
  render();
}

function togglePlayerAlive(idx) {
  const wasAlive = state.alive[idx] !== false;
  const livingCountBeforeDeath = Object.keys(state.assignments).map(Number).filter(isPlayerPubliclyAlive).length;
  recordHistory(state.alive[idx] ? `mark ${state.names[idx]} dead` : `restore ${state.names[idx]} to life`);
  state.alive[idx] = !state.alive[idx];
  state.registeredDead = state.registeredDead ?? {};
  state.registeredDead[idx] = false;
  state.deathsToday = state.deathsToday ?? [];
  if (state.phase === "day") {
    if (!state.alive[idx] && !state.deathsToday.includes(idx)) state.deathsToday.push(idx);
    if (state.alive[idx]) state.deathsToday = state.deathsToday.filter(playerIndex => playerIndex !== idx);
  } else {
    if (!state.alive[idx] && !state.deathsLastNight.includes(idx)) state.deathsLastNight.push(idx);
    if (state.alive[idx]) state.deathsLastNight = state.deathsLastNight.filter(playerIndex => playerIndex !== idx);
  }
  if (isUltimateWerewolf()) state.votes[idx] = state.alive[idx] ? 1 : 0;
  
  // Log changes to chronicle
  state.chronicle.push({
    type: state.phase,
    ...(state.phase === "night" ? { nightNum: state.dayNum } : { dayNum: state.dayNum }),
    title: state.alive[idx] ? "Resurrection" : "Death Announcement",
    details: `Storyteller manually updated <strong>${state.names[idx]}</strong> to be ${state.alive[idx] ? 'ALIVE' : 'DEAD'}.`,
    badgeColor: state.alive[idx] ? "var(--green)" : "var(--red)"
  });
  if (wasAlive && state.alive[idx] === false) {
    if (state.phase === "day") addPendingMoonchild(idx);
    if (state.phase === "night") recordVigormortisRetentionForDeath(idx);
    resolveTroubleBrewingDemonDeath(idx, livingCountBeforeDeath);
  } else if (!wasAlive && state.alive[idx] !== false) {
    state.vigormortisRetainedMinions = (state.vigormortisRetainedMinions ?? []).filter(playerIndex => Number(playerIndex) !== Number(idx));
  }

  autoSave();
  render();
}

function canTriggerStarpass(playerIndex) {
  return state.phase === "night"
    && (state.deathsLastNight ?? []).includes(Number(playerIndex))
    && (state.nightLog ?? []).some(action => (
    action.roleId === "imp"
    && action.actingPlayerIndex === playerIndex
    && action.targetIndexes?.includes(playerIndex)
    && action.fakeNoEffect !== true
    ));
}

function triggerStarpass(idx) {
  const s = S();
  const c = s.C[state.assignments[idx]];

  if (state.scriptId !== "tb" || c?.id !== "imp" || state.alive[idx] === false || !canTriggerStarpass(idx)) {
    state.showCard = {
      title: "Starpass Error",
      icon: "warning",
      text: "Starpass is available after a sober, healthy Imp chooses itself during the current night."
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
      icon: "warning",
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
    icon: "crown",
    html: `Demon died. Choose which Minion inherits demonhood:<br><br>${optionsHtml}`
  };
  render();
}

function confirmStarpass(oldDemonIdx, newDemonIdx) {
  const s = S();
  const oldDemonName = state.names[oldDemonIdx];
  const newDemonName = state.names[newDemonIdx];
  
  recordHistory("Imp starpass");
  // Set old demon dead, swap role
  state.alive[oldDemonIdx] = false;
  const deathList = state.phase === "night" ? state.deathsLastNight : state.deathsToday;
  if (!deathList.includes(oldDemonIdx)) deathList.push(oldDemonIdx);
  
  // Assign demon token to Minion
  // Find which demon role they had
  const demonRole = state.assignments[oldDemonIdx];
  state.assignments[newDemonIdx] = demonRole;
  state.alignments[newDemonIdx] = "evil";
  clearSeatAbilityUsage(newDemonIdx);

  state.chronicle.push({
    type: "night",
    nightNum: state.dayNum,
    title: "Demon Starpass",
    details: `Demon <strong>${oldDemonName}</strong> passed the crown. <strong>${newDemonName}</strong> is now the Demon!`,
    badgeColor: "var(--red)"
  });

  state.showCard = {
    title: "New Imp",
    icon: "crown",
    text: `Wake ${newDemonName}, show “You are” and the Imp token, then put them to sleep before continuing.`
  };
  autoSave();
  render();
}

function adjustPlayerVotes(idx, delta) {
  if (delta === 0) return;
  recordHistory(`${state.names[idx]}'s vote-token change`);
  state.votes[idx] = Math.max(0, (state.votes[idx] ?? 1) + delta);
  autoSave();
  render();
}

function toggleGhostVote(idx) {
  recordHistory(`${state.names[idx]}'s ghost vote`);
  state.ghostVotes[idx] = !state.ghostVotes[idx];
  if (state.ghostVotes[idx]) {
    state.votes[idx] = 0;
  } else {
    state.votes[idx] = 1;
  }
  autoSave();
  render();
}
