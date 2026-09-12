const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = name => fs.readFileSync(path.join(__dirname, "..", "scripts", name), "utf8");

function createHarness({ fetchImplementation = async () => ({ ok: true, json: async () => ({}) }) } = {}) {
  const storage = new Map();
  const fetchCalls = [];
  const dom = {
    checkedTargets: [],
    characterValue: ""
  };
  const sandbox = {
    console: { ...console, warn() {} },
    crypto,
    document: {
      getElementById: id => id === "night-character-select"
        ? { value: dom.characterValue }
        : null,
      querySelectorAll: selector => selector === "[data-night-target]:checked"
        ? dom.checkedTargets.map(value => ({ value: String(value) }))
        : []
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout,
    clearTimeout,
    fetch(...args) {
      fetchCalls.push(args);
      return fetchImplementation(...args);
    }
  };
  sandbox.__dom = dom;
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  [
    "icons.js",
    "history.js",
    "game-rules.js",
    "trouble_brewing.js",
    "bad_moon_rising.js",
    "sects_and_violets.js",
    "ultimate_werewolf.js",
    "common.js"
  ].forEach(file => vm.runInContext(script(file), context, { filename: `scripts/${file}` }));
  vm.runInContext("render = () => {}; globalThis.dispatchedEvents = []; dispatchGameEmail = eventType => { dispatchedEvents.push(eventType); return Promise.resolve(true); };", context);
  const evaluate = expression => vm.runInContext(expression, context);
  evaluate.fetchCalls = fetchCalls;
  return evaluate;
}

test("a recorded execution is fully undoable and survives into the next night for Undertaker", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "day";
    state.dayNum = 1;
    state.playerCount = 5;
    state.names = ["Imp", "Scarlet", "Undertaker", "Chef", "Empath"];
    state.assignments = { 0: "imp", 1: "scarletwoman", 2: "undertaker", 3: "chef", 4: "empath" };
    state.rolePool = Object.values(state.assignments);
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.votes = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 };
    state.ghostVotes = { 0: false, 1: false, 2: false, 3: false, 4: false };
    state.chronicle = [];
    requestExecution(0);
    runConfirmedAction();
  `);

  assert.equal(evaluate("state.alive[0]"), false);
  assert.equal(evaluate("state.executedTodayIndex"), 0);
  assert.equal(evaluate("state.assignments[1]"), "imp");
  assert.equal(evaluate("historyController.canUndo()"), true);

  evaluate("undoLastAction()");
  assert.equal(evaluate("state.alive[0]"), true);
  assert.equal(evaluate("state.executedTodayIndex"), null);
  assert.equal(evaluate("state.assignments[1]"), "scarletwoman");
  assert.equal(evaluate("JSON.stringify(state.deathsToday)"), "[]");
  assert.equal(evaluate("state.chronicle.length"), 0);

  evaluate("requestExecution(0); runConfirmedAction();");
  evaluate("proceedToNightStep()");
  assert.equal(evaluate("state.executedTodayIndex"), 0);
  assert.equal(evaluate("getActiveWakeList(TB_OTHER_NIGHT).some(node => node.id === 'undertaker')"), true);
});

test("the game lifecycle emits only the three supported email events", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.screen = "roles";
    state.playerCount = 5;
    state.dist = { t: 3, o: 0, m: 1, d: 1 };
    state.names = ["Ada", "Bea", "Cleo", "Dara", "Eli"];
    state.assignments = { 0: "washerwoman", 1: "chef", 2: "empath", 3: "poisoner", 4: "imp" };
    state.rolePool = Object.values(state.assignments);
    finalizeGrimoire();
    proceedToDay();
    triggerWin("good");
  `);

  assert.equal(
    evaluate("JSON.stringify(dispatchedEvents)"),
    '["game-start","night-complete","game-end"]'
  );
  assert.equal(evaluate("new Set(dispatchedEvents).size"), 3);
});

test("CSV roster imports preserve names for editable setup and fill the minimum seats", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.playerCount = 8;
    state.dist = { t: 5, o: 1, m: 1, d: 1 };
    globalThis.importedNames = JSON.stringify(parseCsvRoster('Seat,Player Name\\n1,Ada\\n2,"Bea, Jr."\\n3,Ada'));
    applyImportedPlayerNames(JSON.parse(importedNames));
  `);
  assert.equal(evaluate("importedNames"), '["Ada","Bea, Jr."]');
  assert.equal(evaluate("state.playerCount"), 5);
  assert.equal(evaluate("JSON.stringify(state.names)"), '["Ada","Bea, Jr.","","",""]');
  evaluate("addRosterPlayer(); removeRosterPlayer(1);");
  assert.equal(evaluate("state.playerCount"), 5);
  assert.equal(evaluate("JSON.stringify(state.names)"), '["Ada","","","",""]');
});

test("Gemini roster extraction falls back after an unavailable model", async () => {
  let calls = 0;
  const evaluate = createHarness({
    fetchImplementation: async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 429, json: async () => ({ error: { message: "Rate limit reached" } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"names":["Ada","Bea","Ada"]}' }] } }] })
      };
    }
  });
  evaluate('window.ROSTER_DISPATCH_CONFIG = { geminiApiKey: "test-key" };');

  const names = await evaluate('extractPlayerNamesWithGemini({ name: "players.csv", text: async () => "Ada\\nBea" })');

  assert.equal(JSON.stringify(names), '["Ada","Bea"]');
  assert.equal(evaluate.fetchCalls.length, 2);
  assert.match(evaluate.fetchCalls[0][0], /models\/gemini-3\.5-flash-lite:generateContent/);
  assert.match(evaluate.fetchCalls[1][0], /models\/gemini-3\.5-flash:generateContent/);
});

test("once-per-game characters leave the wake list after their ability is recorded", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.dayNum = 1;
    state.playerCount = 2;
    state.assignments = { 0: "philosopher", 1: "vortox" };
    state.alive = { 0: true, 1: true };
    state.usedAbilities = { "0:philosopher": true };
  `);
  assert.equal(evaluate("getActiveWakeList(SV_FIRST_NIGHT).some(node => node.id === 'philosopher')"), false);
});

test("a dead Barber wakes the living Demon for the optional swap", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.dayNum = 2;
    state.playerCount = 2;
    state.assignments = { 0: "barber", 1: "fanggu" };
    state.alive = { 0: false, 1: true };
    state.deathsToday = [0];
  `);
  const barberStep = evaluate("getActiveWakeList(SV_OTHER_NIGHT).find(node => node.id === 'barber')");
  assert.equal(barberStep.playerIndex, 1);
  assert.equal(barberStep.triggerPlayerIndex, 0);
});

test("legacy state hydration supplies durable collection defaults", () => {
  const evaluate = createHarness();
  evaluate("hydrateState({ scriptId: 'bmr', dayNum: 3, deathsLastNight: null, deathsToday: null, nightProtected: null, usedAbilities: null })");
  assert.equal(evaluate("JSON.stringify([state.deathsLastNight, state.deathsToday, state.nightProtected, state.usedAbilities])"), "[[],[],[],{}]");
});

test("setup validation uses the roster distribution selected in state", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.playerCount = 5;
    state.dist = { t: 2, o: 1, m: 1, d: 1 };
    state.names = ["Ada", "Bea", "Cleo", "Dara", "Eli"];
    state.assignments = { 0: "washerwoman", 1: "chef", 2: "butler", 3: "poisoner", 4: "imp" };
    state.rolePool = Object.values(state.assignments);
  `);

  assert.equal(evaluate("JSON.stringify(validateRoleSetup())"), "[]");
});

test("setup modifiers are atomic and Godfather choices support both legal exchanges", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.dist = { t: 3, o: 0, m: 1, d: 1 };
  `);
  assert.equal(
    evaluate("JSON.stringify(getSetupAdjustedDistribution(state.dist, ['vigormortis']))"),
    '{"t":3,"o":0,"m":1,"d":1}'
  );

  evaluate(`
    state.scriptId = "bmr";
    state.dist = { t: 3, o: 1, m: 1, d: 1 };
  `);
  assert.equal(
    evaluate("JSON.stringify(getSetupAdjustedDistribution(state.dist, ['godfather'], { godfatherOutsiderDelta: -1 }))"),
    '{"t":4,"o":0,"m":1,"d":1}'
  );
  assert.equal(
    evaluate("JSON.stringify(getSetupAdjustedDistribution(state.dist, ['godfather'], { godfatherOutsiderDelta: 1 }))"),
    '{"t":2,"o":2,"m":1,"d":1}'
  );
  evaluate("state.dist = { t: 3, o: 0, m: 1, d: 1 }");
  assert.equal(evaluate("JSON.stringify(validGodfatherOutsiderDeltas())"), "[1]");
});

test("editing a roster name preserves the generated pool and seat assignments", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.playerCount = 5;
    state.names = ["Ada", "Bea", "Cleo", "Dara", "Eli"];
    state.assignments = { 0: "washerwoman", 1: "chef", 2: "empath", 3: "poisoner", 4: "imp" };
    state.rolePool = Object.values(state.assignments);
    globalThis.beforeAssignments = JSON.stringify(state.assignments);
    globalThis.beforePool = JSON.stringify(state.rolePool);
    savePlayerName(0, "Avery");
  `);

  assert.equal(evaluate("state.names[0]"), "Avery");
  assert.equal(evaluate("JSON.stringify(state.assignments) === beforeAssignments"), true);
  assert.equal(evaluate("JSON.stringify(state.rolePool) === beforePool"), true);
});

test("an empty seat cannot add an out-of-pool character", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.playerCount = 5;
    state.names = ["Ada", "Bea", "Cleo", "Dara", "Eli"];
    state.assignments = { 0: "", 1: "chef", 2: "empath", 3: "poisoner", 4: "imp" };
    state.rolePool = ["librarian", "chef", "empath", "poisoner", "imp"];
    globalThis.beforePool = JSON.stringify(state.rolePool);
    assignRoleToPlayer(0, "washerwoman");
  `);

  assert.equal(evaluate("state.assignments[0]"), "");
  assert.equal(evaluate("JSON.stringify(state.rolePool) === beforePool"), true);
});

test("poisoned Soldier and Mayor abilities do not stop the Imp kill", () => {
  for (const targetRole of ["soldier", "mayor"]) {
    const evaluate = createHarness();
    evaluate(`
      state.scriptId = "tb";
      state.screen = "game";
      state.phase = "night";
      state.dayNum = 2;
      state.playerCount = 2;
      state.names = ["Demon", "Target"];
      state.assignments = { 0: "imp", 1: "${targetRole}" };
      state.rolePool = Object.values(state.assignments);
      state.alive = { 0: true, 1: true };
      state.poisonedIndex = 1;
      state.nightProtected = [];
      state.deathsLastNight = [];
      state.deathsToday = [];
      state.nightLog = [];
      state.chronicle = [];
      state.activeWakeIdx = 0;
      __dom.checkedTargets = [1];
      submitNightTarget("imp", 0, false);
    `);

    assert.equal(evaluate("JSON.stringify(state.deathsLastNight)"), "[1]", targetRole);
    assert.equal(evaluate("state.nightLog.length"), 1, targetRole);
  }
});

test("an unset poison marker never disables seat zero or its ability", () => {
  const poisoner = createHarness();
  poisoner(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 2;
    state.names = ["Poisoner", "Imp"];
    state.assignments = { 0: "poisoner", 1: "imp" };
    state.alive = { 0: true, 1: true };
    state.poisonedIndex = null;
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = 0;
    __dom.checkedTargets = [1];
    submitNightTarget("poisoner", 0, false);
  `);
  assert.equal(poisoner("state.nightLog[0].fakeNoEffect"), false);
  assert.equal(poisoner("state.poisonedIndex"), 1);

  for (const targetRole of ["soldier", "mayor"]) {
    const imp = createHarness();
    imp(`
      state.scriptId = "tb";
      state.screen = "game";
      state.phase = "night";
      state.dayNum = 2;
      state.playerCount = 2;
      state.names = ["Target", "Imp"];
      state.assignments = { 0: "${targetRole}", 1: "imp" };
      state.alive = { 0: true, 1: true };
      state.poisonedIndex = null;
      state.nightProtected = [];
      state.deathsLastNight = [];
      state.nightLog = [];
      state.chronicle = [];
      state.activeWakeIdx = 0;
      __dom.checkedTargets = [0];
      submitNightTarget("imp", 1, false);
    `);
    assert.equal(imp("JSON.stringify(state.deathsLastNight)"), "[]", targetRole);
  }
});

test("the Fortune Teller red-herring placeholder does not coerce to seat zero", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.playerCount = 3;
    state.names = ["Good", "Fortune Teller", "Imp"];
    state.assignments = { 0: "chef", 1: "fortuneteller", 2: "imp" };
    state.redHerringIndex = null;
  `);
  assert.equal(evaluate("/value=\"0\" selected/.test(renderRedHerringSetup())"), false);
  evaluate("setRedHerring('0')");
  assert.equal(evaluate("state.redHerringIndex"), 0);
  evaluate("setRedHerring('')");
  assert.equal(evaluate("state.redHerringIndex"), null);
});

test("a legal unresolved Imp starpass prevents the night from ending", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.tab = "night";
    state.dayNum = 2;
    state.playerCount = 2;
    state.names = ["Imp", "Minion"];
    state.assignments = { 0: "imp", 1: "poisoner" };
    state.rolePool = Object.values(state.assignments);
    state.alive = { 0: true, 1: true };
    state.nightLog = [{ roleId: "imp", actingPlayerIndex: 0, targetIndexes: [0], fakeNoEffect: false }];
    state.deathsLastNight = [0];
    state.deathsToday = [];
    state.chronicle = [];
    proceedToDay();
  `);

  assert.equal(evaluate("state.phase"), "night");
  assert.equal(evaluate("state.tab"), "grimoire");
  assert.equal(evaluate("state.expandedPlayer"), 0);
  assert.equal(evaluate("state.showCard.title"), "Resolve the Imp starpass");
});

test("consuming a once-per-game action leaves its successor at the active cursor", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 4;
    state.names = ["Philosopher", "Witch", "Good", "Demon"];
    state.assignments = { 0: "philosopher", 1: "witch", 2: "clockmaker", 3: "vortox" };
    state.rolePool = Object.values(state.assignments);
    state.alive = { 0: true, 1: true, 2: true, 3: true };
    state.usedAbilities = {};
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = 0;
    __dom.checkedTargets = [];
    __dom.characterValue = "dreamer";
    submitNightTarget("philosopher", 0, false);
  `);

  assert.equal(evaluate("state.usedAbilities['0:philosopher']"), true);
  assert.equal(evaluate("state.activeWakeIdx"), 0);
  assert.equal(evaluate("getActiveWakeList(SV_FIRST_NIGHT)[state.activeWakeIdx].id"), "witch");
});

test("Librarian and Po enforce their exact legal target counts", () => {
  const librarian = createHarness();
  librarian(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 3;
    state.names = ["Librarian", "Two", "Three"];
    state.assignments = { 0: "librarian", 1: "butler", 2: "imp" };
    state.alive = { 0: true, 1: true, 2: true };
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = 0;
    __dom.checkedTargets = [1];
    submitNightTarget("librarian", 0, false);
  `);
  assert.equal(librarian("state.nightLog.length"), 0);
  librarian("__dom.checkedTargets = [1, 2]; submitNightTarget('librarian', 0, false)");
  assert.equal(librarian("state.nightLog.length"), 1);

  const po = createHarness();
  po(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 4;
    state.names = ["Po", "One", "Two", "Three"];
    state.assignments = { 0: "po", 1: "fool", 2: "tealady", 3: "acrobat" };
    state.alive = { 0: true, 1: true, 2: true, 3: true };
    state.poCharged = true;
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = 0;
    __dom.checkedTargets = [1, 2];
    submitNightTarget("po", 0, false);
  `);
  assert.equal(po("state.nightLog.length"), 0);
  po("__dom.checkedTargets = [1, 2, 3]; submitNightTarget('po', 0, false)");
  assert.equal(po("state.nightLog.length"), 1);
  assert.equal(po("state.nightLog[0].targetIndexes.length"), 3);
});

test("character-choice filters also reject forged invalid selections", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 4;
    state.names = ["Philosopher", "Witch", "Good", "Demon"];
    state.assignments = { 0: "philosopher", 1: "witch", 2: "clockmaker", 3: "vortox" };
    state.alive = { 0: true, 1: true, 2: true, 3: true };
    state.usedAbilities = {};
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = 0;
    globalThis.philosopherHtml = renderNightActionControls(getActiveWakeList(SV_FIRST_NIGHT)[0]);
    __dom.characterValue = "witch";
    submitNightTarget("philosopher", 0, false);
  `);

  assert.equal(evaluate("philosopherHtml.includes('value=\"dreamer\"')"), true);
  assert.equal(evaluate("philosopherHtml.includes('value=\"witch\"')"), false);
  assert.equal(evaluate("state.nightLog.length"), 0);

  evaluate(`
    state.scriptId = "sv";
    state.dayNum = 2;
    state.assignments = { 0: "pithag", 1: "witch", 2: "clockmaker", 3: "vortox" };
    state.activeWakeIdx = getActiveWakeList(SV_OTHER_NIGHT).findIndex(node => node.id === "pithag");
    globalThis.pitHagHtml = renderNightActionControls(getActiveWakeList(SV_OTHER_NIGHT)[state.activeWakeIdx]);
  `);
  assert.equal(evaluate("pitHagHtml.includes('value=\"clockmaker\"')"), false);
  assert.equal(evaluate("pitHagHtml.includes('value=\"dreamer\"')"), true);
});

test("Witch stops waking at three publicly living players", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.dayNum = 2;
    state.playerCount = 4;
    state.assignments = { 0: "witch", 1: "clockmaker", 2: "mutant", 3: "vortox" };
    state.alive = { 0: true, 1: true, 2: true, 3: true };
  `);
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'witch')"), true);
  evaluate("state.alive[1] = false");
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'witch')"), false);
});

test("Sage wakes only after a real Demon action caused the recent death", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.dayNum = 2;
    state.playerCount = 3;
    state.assignments = { 0: "sage", 1: "witch", 2: "vortox" };
    state.alive = { 0: false, 1: true, 2: true };
    state.deathsLastNight = [0];
    state.deathsToday = [];
    state.nightLog = [{ actingPlayerIndex: 1, targetIndexes: [0], fakeNoEffect: false }];
  `);
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'sage')"), false);
  evaluate("state.nightLog = [{ actingPlayerIndex: 2, targetIndexes: [0], fakeNoEffect: false }]");
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'sage')"), true);
  evaluate("state.nightLog[0].fakeNoEffect = true");
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'sage')"), false);
});

test("email event keys are session scoped and undo does not rewind delivery metadata", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.sessionId = "session-one";
    state.dayNum = 4;
    globalThis.firstNightKey = emailEventInstanceKey("night-complete");
    state.sessionId = "session-two";
    globalThis.secondNightKey = emailEventInstanceKey("night-complete");
    state.emailEventTimes = { "session-two:game-start": "before" };
    state.emailDispatchedKeys = ["session-two:game-start"];
    state.pendingEmails = [{ instanceKey: "session-two:night-complete:4" }];
    recordHistory("delivery metadata isolation");
    state.emailEventTimes["session-two:game-end"] = "after";
    state.emailDispatchedKeys.push("session-two:game-end");
    state.pendingEmails.push({ instanceKey: "session-two:game-end" });
    undoLastAction();
  `);

  assert.equal(evaluate("firstNightKey"), "session-one:night-complete:4");
  assert.equal(evaluate("secondNightKey"), "session-two:night-complete:4");
  assert.equal(evaluate("state.emailEventTimes['session-two:game-end']"), "after");
  assert.equal(evaluate("state.emailDispatchedKeys.includes('session-two:game-end')"), true);
  assert.equal(evaluate("state.pendingEmails.some(item => item.instanceKey === 'session-two:game-end')"), true);
});

test("Zombuul registration is not recorded as a death and does not suppress its next attack", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "day";
    state.dayNum = 1;
    state.playerCount = 3;
    state.names = ["Zed", "Fay", "Sal"];
    state.assignments = { 0: "zombuul", 1: "fool", 2: "sailor" };
    state.alive = { 0: true, 1: true, 2: true };
    state.registeredDead = {};
    state.deathsToday = [];
    state.chronicle = [];
    requestExecution(0);
    runConfirmedAction();
  `);
  assert.equal(evaluate("state.alive[0]"), true);
  assert.equal(evaluate("state.registeredDead[0]"), true);
  assert.equal(evaluate("JSON.stringify(state.deathsToday)"), "[]");
  evaluate("proceedToNightStep()");
  assert.equal(evaluate("getActiveWakeList(BMR_OTHER_NIGHT).some(node => node.id === 'zombuul')"), true);
});

test("Moonchild deaths queue exactly one next-night resolution", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "day";
    state.dayNum = 1;
    state.playerCount = 3;
    state.names = ["Moon", "Sailor", "Demon"];
    state.assignments = { 0: "moonchild", 1: "sailor", 2: "zombuul" };
    state.alive = { 0: true, 1: true, 2: true };
    state.deathsToday = [];
    state.deathsLastNight = [];
    state.pendingMoonchildIndexes = [];
    state.nightLog = [];
    state.chronicle = [];
    togglePlayerAlive(0);
    proceedToNightStep();
    state.activeWakeIdx = getActiveWakeList(BMR_OTHER_NIGHT).findIndex(node => node.id === "moonchild");
    __dom.checkedTargets = [1];
    submitNightTarget("moonchild", 0, false);
  `);
  assert.equal(evaluate("JSON.stringify(state.pendingMoonchildIndexes)"), "[]");
  assert.equal(evaluate("state.nightLog.some(action => action.roleId === 'moonchild' && action.targetIndexes[0] === 1)"), true);
});

test("a Minion killed by Vigormortis keeps waking while the Vigormortis lives", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "sv";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 5;
    state.names = ["Vigor", "Witch", "Dreamer", "Sage", "Artist"];
    state.assignments = { 0: "vigormortis", 1: "witch", 2: "dreamer", 3: "sage", 4: "artist" };
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.nightLog = [{ roleId: "vigormortis", actingPlayerIndex: 0, targetIndexes: [1], fakeNoEffect: false }];
    state.deathsLastNight = [];
    state.vigormortisRetainedMinions = [];
    state.chronicle = [];
    togglePlayerAlive(1);
  `);
  assert.equal(evaluate("JSON.stringify(state.vigormortisRetainedMinions)"), "[1]");
  assert.equal(evaluate("state.showCard.title"), "Vigormortis Reminder");
  assert.equal(evaluate("state.showCard.text.includes('Manually choose and track 1 Townsfolk neighbour')"), true);
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'witch' && node.playerIndex === 1)"), true);
  evaluate("state.alive[0] = false");
  assert.equal(evaluate("getActiveWakeList(SV_OTHER_NIGHT).some(node => node.id === 'witch' && node.playerIndex === 1)"), false);
});

test("character changes preserve alignment and Snake Charmer swaps move alignment and poison", () => {
  const pitHag = createHarness();
  pitHag(`
    state.scriptId = "sv";
    state.playerCount = 2;
    state.names = ["Good", "Demon"];
    state.assignments = { 0: "dreamer", 1: "vortox" };
    state.alignments = { 0: "good", 1: "evil" };
    state.rolePool = ["dreamer", "vortox"];
    state.registeredDead = {};
    state.chronicle = [];
    changePlayerCharacter(0, "witch");
  `);
  assert.equal(pitHag("state.assignments[0]"), "witch");
  assert.equal(pitHag("playerAlignment(0)"), "good");

  const snake = createHarness();
  snake(`
    state.scriptId = "sv";
    state.playerCount = 2;
    state.names = ["Snake", "Demon"];
    state.assignments = { 0: "snakecharmer", 1: "vortox" };
    state.alignments = { 0: "good", 1: "evil" };
    state.registeredDead = {};
    state.permanentlyPoisoned = {};
    state.usedAbilities = {};
    state.gainedAbilities = {};
    state.previousNightTargets = {};
    state.chronicle = [];
    swapPlayerCharacters(0, 1, true);
  `);
  assert.equal(snake("state.assignments[0]"), "vortox");
  assert.equal(snake("playerAlignment(0)"), "evil");
  assert.equal(snake("state.assignments[1]"), "snakecharmer");
  assert.equal(snake("playerAlignment(1)"), "good");
  assert.equal(snake("isPoisonedSeat(1)"), true);
});

test("repeat-target restrictions expire after one night and follow a moved character", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.dayNum = 3;
    state.playerCount = 3;
    state.names = ["Exorcist", "Target", "Sailor"];
    state.assignments = { 0: "exorcist", 1: "fool", 2: "sailor" };
    state.alignments = { 0: "good", 1: "good", 2: "good" };
    state.registeredDead = {};
    state.usedAbilities = {};
    state.gainedAbilities = {};
    state.previousNightTargets = { "0:exorcist": { targetIndex: 1, nightNumber: 2 } };
    state.chronicle = [];
  `);
  assert.equal(evaluate("isRepeatRestrictedTarget({ id: 'exorcist', playerIndex: 0 }, 1)"), true);
  evaluate("swapPlayerCharacters(0, 2, false)");
  assert.equal(evaluate("state.previousNightTargets['2:exorcist'].targetIndex"), 1);
  assert.equal(evaluate("isRepeatRestrictedTarget({ id: 'exorcist', playerIndex: 2 }, 1)"), true);
  evaluate("state.dayNum = 4");
  assert.equal(evaluate("isRepeatRestrictedTarget({ id: 'exorcist', playerIndex: 2 }, 1)"), false);
});

test("a protected Imp self-target does not unlock starpass", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 2;
    state.names = ["Imp", "Monk"];
    state.assignments = { 0: "imp", 1: "monk" };
    state.alive = { 0: true, 1: true };
    state.nightProtected = [0];
    state.deathsLastNight = [];
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = getActiveWakeList(TB_OTHER_NIGHT).findIndex(node => node.id === "imp");
    __dom.checkedTargets = [0];
    submitNightTarget("imp", 0, false);
  `);
  assert.equal(evaluate("JSON.stringify(state.deathsLastNight)"), "[]");
  assert.equal(evaluate("canTriggerStarpass(0)"), false);
});

test("Lunatic setup is required and private reveal shows only the believed Demon", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "roles";
    state.playerCount = 5;
    state.dist = { t: 3, o: 0, m: 1, d: 1 };
    state.setupChoices = { godfatherOutsiderDelta: 1 };
    state.names = ["Luna", "Sailor", "Chambermaid", "Godfather", "Demon"];
    state.assignments = { 0: "lunatic", 1: "sailor", 2: "chambermaid", 3: "godfather", 4: "zombuul" };
    state.rolePool = Object.values(state.assignments);
    state.lunaticBelievedRoles = {};
    finalizeGrimoire();
  `);

  assert.equal(evaluate("state.screen"), "roles");
  assert.equal(
    evaluate("state.showCard.text.includes('needs a believed Demon character')"),
    true,
    evaluate("String(state.showCard.text)")
  );

  evaluate(`
    state.lunaticBelievedRoles = { 0: "shabaloth" };
    finalizeGrimoire();
    state.revealIndex = 0;
    state.revealCovered = false;
    globalThis.revealHtml = renderRevealScreen();
  `);
  assert.equal(evaluate("state.screen"), "reveal");
  assert.equal(evaluate("revealHtml.includes('Shabaloth')"), true);
  assert.equal(evaluate("revealHtml.includes('EVIL')"), true);
  assert.equal(evaluate("revealHtml.includes('You think you are a Demon')"), false);

  evaluate(`
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      scriptId: "bmr",
      screen: "reveal",
      playerCount: 2,
      names: ["Luna", "Demon"],
      assignments: { 0: "lunatic", 1: "zombuul" },
      lunaticBelievedRoles: {}
    }));
    resumeGame();
  `);
  assert.equal(evaluate("state.screen"), "roles");
  assert.equal(evaluate("state.showCard.title"), "Private Role Setup Required");
});

test("Teensyville gives the real Demon a dedicated Lunatic identity step", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.dayNum = 1;
    state.playerCount = 5;
    state.names = ["Luna", "Demon", "Sailor", "Courtier", "Minion"];
    state.assignments = { 0: "lunatic", 1: "shabaloth", 2: "sailor", 3: "courtier", 4: "godfather" };
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.lunaticBelievedRoles = { 0: "shabaloth" };
    globalThis.firstNight = getActiveWakeList(BMR_FIRST_NIGHT);
    globalThis.identityStep = firstNight.find(node => node.id === "_lunatic_identity");
  `);

  assert.equal(evaluate("firstNight.some(node => node.id === '_demoninfo')"), false);
  assert.equal(evaluate("firstNight.some(node => node.sourceId === 'lunatic_info')"), false);
  assert.equal(evaluate("firstNight.some(node => node.sourceId === 'lunatic_action')"), false);
  assert.equal(evaluate("Boolean(identityStep)"), true);
  assert.equal(evaluate("getSyntheticNightInstructions(identityStep).includes('Demon (Seat 2)')"), true);
  assert.equal(evaluate("getSyntheticNightInstructions(identityStep).includes('Luna (Seat 1)')"), true);

  evaluate("state.lunaticBelievedRoles[0] = 'pukka'; globalThis.pukkaFirstNight = getActiveWakeList(BMR_FIRST_NIGHT)");
  assert.equal(evaluate("pukkaFirstNight.some(node => node.sourceId === 'lunatic_action')"), true);
  assert.equal(
    evaluate("JSON.stringify((() => { const node = pukkaFirstNight.find(item => item.sourceId === 'lunatic_action'); const spec = getNightActionSpec(node); return [spec.minTargets, spec.maxTargets]; })())"),
    "[1,1]"
  );

  evaluate("state.playerCount = 7; globalThis.standardNight = getActiveWakeList(BMR_FIRST_NIGHT)");
  assert.equal(evaluate("standardNight.some(node => node.id === '_demoninfo')"), true);
  assert.equal(evaluate("standardNight.some(node => node.id === '_lunatic_identity')"), false);
});

test("Lunatic actions delegate target counts and only notify the Demon about actual choices", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 5;
    state.names = ["Luna", "Demon", "One", "Two", "Three"];
    state.assignments = { 0: "lunatic", 1: "zombuul", 2: "sailor", 3: "fool", 4: "goon" };
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.alignments = { 0: "good", 1: "evil", 2: "good", 3: "good", 4: "good" };
    state.lunaticBelievedRoles = { 0: "po" };
    state.lunaticPoCharged = { 0: false };
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = getActiveWakeList(BMR_OTHER_NIGHT).findIndex(node => node.sourceId === "lunatic");
    globalThis.poStep = getActiveWakeList(BMR_OTHER_NIGHT)[state.activeWakeIdx];
    globalThis.poSpec = getNightActionSpec(poStep);
    __dom.checkedTargets = [];
    submitNightTarget("lunatic", 0, false);
  `);

  assert.equal(evaluate("JSON.stringify([poSpec.minTargets, poSpec.maxTargets, poSpec.allowedTargetCounts])"), "[0,1,[0,1]]");
  assert.equal(evaluate("state.lunaticPoCharged[0]"), true);
  assert.equal(evaluate("state.chronicle.at(-1).details.includes('Do not wake the real Demon for choices.')"), true);
  assert.equal(evaluate("getSyntheticNightInstructions(poStep).includes('If nobody is selected, do not wake the Demon')"), true);

  evaluate(`
    state.dayNum = 3;
    globalThis.chargedPoSpec = getNightActionSpec({ id: "lunatic", sourceId: "lunatic", playerIndex: 0, believedDemonId: "po" });
    globalThis.shabalothSpec = getNightActionSpec({ id: "lunatic", sourceId: "lunatic", playerIndex: 0, believedDemonId: "shabaloth" });
  `);
  assert.equal(evaluate("JSON.stringify([chargedPoSpec.minTargets, chargedPoSpec.maxTargets])"), "[3,3]");
  assert.equal(evaluate("JSON.stringify([shabalothSpec.minTargets, shabalothSpec.maxTargets])"), "[2,2]");

  evaluate(`
    globalThis.savedLunaticState = getSerializableState();
    state.lunaticBelievedRoles = {};
    state.lunaticPoCharged = {};
    hydrateState(savedLunaticState);
    recordHistory("Lunatic state mutation");
    state.lunaticBelievedRoles[0] = "pukka";
    state.lunaticPoCharged[0] = false;
    undoLastAction();
  `);
  assert.equal(evaluate("state.lunaticBelievedRoles[0]"), "po");
  assert.equal(evaluate("state.lunaticPoCharged[0]"), true);

  evaluate(`
    state.dayNum = 2;
    state.lunaticBelievedRoles[0] = "zombuul";
    state.deathsToday = [2];
    globalThis.zombuulBeliefNight = getActiveWakeList(BMR_OTHER_NIGHT);
  `);
  assert.equal(evaluate("zombuulBeliefNight.some(node => node.sourceId === 'lunatic')"), false);
});

test("only a healthy player's own target choice triggers the Goon once", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 3;
    state.names = ["Grandmother", "Goon", "Pukka"];
    state.assignments = { 0: "grandmother", 1: "goon", 2: "pukka" };
    state.alive = { 0: true, 1: true, 2: true };
    state.alignments = { 0: "good", 1: "good", 2: "evil" };
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "grandmother");
    __dom.checkedTargets = [1];
    submitNightTarget("grandmother", 0, false);
    globalThis.grandmotherLog = state.nightLog.at(-1);
    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "pukka");
    __dom.checkedTargets = [1];
    submitNightTarget("pukka", 2, false);
    globalThis.pukkaLog = state.nightLog.at(-1);
  `);

  assert.equal(evaluate("grandmotherLog.fakeNoEffect"), false);
  assert.equal(evaluate("pukkaLog.fakeNoEffect"), true);
  assert.equal(evaluate("playerAlignment(1)"), "evil");

  evaluate(`
    state.activeWakeIdx = 0;
    state.nightLog = [];
    state.alignments[1] = "good";
    state.courtierEffect = { characterId: "pukka", expiresAfterDay: 3 };
    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "pukka");
    __dom.checkedTargets = [1];
    submitNightTarget("pukka", 2, false);
    globalThis.impairedLog = state.nightLog.at(-1);
  `);
  assert.equal(evaluate("impairedLog.fakeNoEffect"), true);
  assert.equal(evaluate("playerAlignment(1)"), "good");

  evaluate(`
    state.nightLog = [];
    state.courtierEffect = null;
    state.alive[1] = false;
    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "pukka");
    __dom.checkedTargets = [1];
    submitNightTarget("pukka", 2, false);
    globalThis.deadGoonLog = state.nightLog.at(-1);
  `);
  assert.equal(evaluate("deadGoonLog.fakeNoEffect"), false);
  assert.equal(evaluate("playerAlignment(1)"), "good");
});

test("a later impairment does not erase an earlier Goon trigger", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 5;
    state.names = ["Sailor", "Goon", "Courtier", "Chambermaid", "Pukka"];
    state.assignments = { 0: "sailor", 1: "goon", 2: "courtier", 3: "chambermaid", 4: "pukka" };
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.alignments = { 0: "good", 1: "good", 2: "good", 3: "good", 4: "evil" };
    state.nightLog = [];
    state.usedAbilities = {};
    state.chronicle = [];

    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "sailor");
    __dom.checkedTargets = [1];
    submitNightTarget("sailor", 0, false);

    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "courtier");
    __dom.checkedTargets = [];
    __dom.characterValue = "sailor";
    submitNightTarget("courtier", 2, false);

    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "chambermaid");
    __dom.checkedTargets = [1, 4];
    __dom.characterValue = "";
    submitNightTarget("chambermaid", 3, false);
    globalThis.chambermaidLog = state.nightLog.at(-1);
  `);

  assert.equal(evaluate("state.nightLog[0].sourceId"), "_goon");
  assert.equal(evaluate("isCourtierDrunk(0, 'sailor')"), true);
  assert.equal(evaluate("chambermaidLog.fakeNoEffect"), false);
  assert.equal(evaluate("playerAlignment(1)"), "good");
});

test("Courtier lasts for three night-and-day cycles without inserting a same-night cleanup step", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 1;
    state.playerCount = 4;
    state.names = ["Courtier", "Sailor", "Minion", "Demon"];
    state.assignments = { 0: "courtier", 1: "sailor", 2: "godfather", 3: "zombuul" };
    state.alive = { 0: true, 1: true, 2: true, 3: true };
    state.usedAbilities = {};
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = getActiveWakeList(BMR_FIRST_NIGHT).findIndex(node => node.id === "courtier");
    __dom.characterValue = "sailor";
    submitNightTarget("courtier", 0, false);
    globalThis.sameNightList = getActiveWakeList(BMR_FIRST_NIGHT);
  `);

  assert.equal(evaluate("sameNightList.some(node => node.id === '_courtier')"), false);
  assert.equal(evaluate("isCourtierDrunk(1, 'sailor')"), true);
  evaluate("state.alive[0] = false; state.dayNum = 2; globalThis.secondNightList = getActiveWakeList(BMR_OTHER_NIGHT)");
  assert.equal(evaluate("secondNightList.some(node => node.id === '_courtier')"), true);
  assert.equal(evaluate("isCourtierDrunk(1, 'sailor')"), true);
  evaluate("state.dayNum = 3");
  assert.equal(evaluate("isCourtierDrunk(1, 'sailor')"), true);
  evaluate("state.assignments[2] = 'sailor'; state.assignments[1] = 'fool'");
  assert.equal(evaluate("isCourtierDrunk(1, 'fool')"), false);
  assert.equal(evaluate("isCourtierDrunk(2, 'sailor')"), true);
  evaluate("state.dayNum = 4");
  assert.equal(evaluate("isCourtierDrunk(2, 'sailor')"), false);
});

test("Courtier impairment disables the Minstrel's passive night effect", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.dayNum = 2;
    state.playerCount = 3;
    state.assignments = { 0: "minstrel", 1: "godfather", 2: "zombuul" };
    state.alive = { 0: true, 1: false, 2: true };
    state.executedTodayIndex = 1;
    state.courtierEffect = { characterId: "minstrel", expiresAfterDay: 3 };
  `);
  assert.equal(evaluate("getActiveWakeList(BMR_OTHER_NIGHT).some(node => node.id === '_minstrel')"), false);
  evaluate("state.courtierEffect = null");
  assert.equal(evaluate("getActiveWakeList(BMR_OTHER_NIGHT).some(node => node.id === '_minstrel')"), true);
});

test("a Courtier-drunk Zombuul dies normally on its first execution", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "bmr";
    state.screen = "game";
    state.phase = "day";
    state.dayNum = 2;
    state.playerCount = 2;
    state.names = ["Zombuul", "Courtier"];
    state.assignments = { 0: "zombuul", 1: "courtier" };
    state.alive = { 0: true, 1: true };
    state.registeredDead = {};
    state.deathsToday = [];
    state.chronicle = [];
    state.executedTodayIndex = null;
    state.courtierEffect = { characterId: "zombuul", expiresAfterDay: 3 };
    requestExecution(0);
    runConfirmedAction();
  `);

  assert.equal(evaluate("state.alive[0]"), false);
  assert.equal(evaluate("state.registeredDead[0]"), false);
  assert.equal(evaluate("JSON.stringify(state.deathsToday)"), "[0]");
});

test("Philosopher-gained Barber and Snake Charmer abilities keep their transition rules", () => {
  const barber = createHarness();
  barber(`
    state.scriptId = "sv";
    state.dayNum = 2;
    state.playerCount = 3;
    state.names = ["Philosopher", "Demon", "Dreamer"];
    state.assignments = { 0: "philosopher", 1: "vortox", 2: "dreamer" };
    state.alive = { 0: false, 1: true, 2: true };
    state.deathsLastNight = [0];
    state.deathsToday = [];
    state.gainedAbilities = { 0: "barber" };
    state.permanentlyPoisoned = {};
    globalThis.barberStep = getActiveWakeList(SV_OTHER_NIGHT).find(node => node.id === "barber");
  `);
  assert.equal(barber("barberStep.playerIndex"), 1);
  assert.equal(barber("barberStep.triggerPlayerIndex"), 0);

  const snake = createHarness();
  snake(`
    state.scriptId = "sv";
    state.playerCount = 2;
    state.names = ["Philosopher", "Demon"];
    state.assignments = { 0: "philosopher", 1: "vortox" };
    state.alignments = { 0: "good", 1: "evil" };
    state.rolePool = ["philosopher", "vortox"];
    state.registeredDead = {};
    state.permanentlyPoisoned = {};
    state.usedAbilities = { "0:philosopher": true };
    state.gainedAbilities = { 0: "snakecharmer" };
    state.previousNightTargets = {};
    state.chronicle = [];
    swapPlayerCharacters(0, 1, true);
  `);
  assert.equal(snake("state.assignments[0]"), "vortox");
  assert.equal(snake("playerAlignment(0)"), "evil");
  assert.equal(snake("state.assignments[1]"), "philosopher");
  assert.equal(snake("playerAlignment(1)"), "good");
  assert.equal(snake("state.gainedAbilities[1]"), "snakecharmer");
  assert.equal(snake("isPoisonedSeat(1)"), true);
  assert.equal(snake("state.showCard.title"), "Snake Charmer Swap");
});

test("Fang Gu jumps only when its functioning ability can kill a living Outsider", () => {
  const jump = createHarness();
  jump(`
    state.scriptId = "sv";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 3;
    state.names = ["Fang Gu", "Mutant", "Dreamer"];
    state.assignments = { 0: "fanggu", 1: "mutant", 2: "dreamer" };
    state.alignments = { 0: "evil", 1: "good", 2: "good" };
    state.rolePool = ["fanggu", "mutant", "dreamer"];
    state.alive = { 0: true, 1: true, 2: true };
    state.permanentlyPoisoned = { 1: true };
    state.fangGuJumpUsed = false;
    state.nightProtected = [];
    state.deathsLastNight = [];
    state.nightLog = [];
    state.chronicle = [];
    state.activeWakeIdx = getActiveWakeList(SV_OTHER_NIGHT).findIndex(node => node.id === "fanggu");
    __dom.checkedTargets = [1];
    submitNightTarget("fanggu", 0, false);
  `);
  assert.equal(jump("state.fangGuJumpUsed"), true);
  assert.equal(jump("state.alive[0]"), false);
  assert.equal(jump("state.alive[1]"), true);
  assert.equal(jump("state.assignments[1]"), "fanggu");
  assert.equal(jump("playerAlignment(1)"), "evil");
  assert.equal(jump("state.permanentlyPoisoned[1]"), true);

  jump("changePlayerCharacter(0, 'clockmaker')");
  assert.equal(jump("state.assignments[0]"), "clockmaker");
  assert.equal(jump("Object.values(state.assignments).filter(roleId => roleId === 'fanggu').length"), 1);
  assert.equal(jump("state.fangGuJumpUsed"), true);

  for (const impairedOrProtected of ["impaired", "protected"]) {
    const blocked = createHarness();
    blocked(`
      state.scriptId = "sv";
      state.screen = "game";
      state.phase = "night";
      state.dayNum = 2;
      state.playerCount = 2;
      state.names = ["Fang Gu", "Mutant"];
      state.assignments = { 0: "fanggu", 1: "mutant" };
      state.alignments = { 0: "evil", 1: "good" };
      state.rolePool = ["fanggu", "mutant"];
      state.alive = { 0: true, 1: true };
      state.permanentlyPoisoned = ${impairedOrProtected === "impaired" ? "{ 0: true }" : "{}"};
      state.fangGuJumpUsed = false;
      state.nightProtected = ${impairedOrProtected === "protected" ? "[1]" : "[]"};
      state.deathsLastNight = [];
      state.nightLog = [];
      state.chronicle = [];
      state.activeWakeIdx = getActiveWakeList(SV_OTHER_NIGHT).findIndex(node => node.id === "fanggu");
      __dom.checkedTargets = [1];
      submitNightTarget("fanggu", 0, false);
    `);
    assert.equal(blocked("state.fangGuJumpUsed"), false, impairedOrProtected);
    assert.equal(blocked("state.alive[0]"), true, impairedOrProtected);
    assert.equal(blocked("state.assignments[1]"), "mutant", impairedOrProtected);
  }
});

test("Imp starpass leaves an explicit private reveal instruction for the new Demon", () => {
  const evaluate = createHarness();
  evaluate(`
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 2;
    state.names = ["Old Imp", "New Imp"];
    state.assignments = { 0: "imp", 1: "poisoner" };
    state.alignments = { 0: "evil", 1: "evil" };
    state.alive = { 0: true, 1: true };
    state.deathsLastNight = [0];
    state.deathsToday = [];
    state.usedAbilities = {};
    state.chronicle = [];
    confirmStarpass(0, 1);
  `);

  assert.equal(evaluate("state.assignments[1]"), "imp");
  assert.equal(evaluate("state.showCard.title"), "New Imp");
  assert.equal(evaluate("state.showCard.text.includes('show “You are” and the Imp token')"), true);
});
