const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const commonSource = fs.readFileSync(path.join(__dirname, "..", "scripts", "common.js"), "utf8");
const handoffSource = fs.readFileSync(path.join(__dirname, "..", "scripts", "handoff.js"), "utf8");

function createHarness() {
  const elements = new Map([
    ["discussion-timer-display", { textContent: "", style: {} }],
    ["discussion-timer-progress", { style: {} }],
    ["discussion-timer-toggle", {
      textContent: "",
      attributes: {},
      dataset: {},
      _innerHTML: "",
      innerHTMLWrites: 0,
      get innerHTML() { return this._innerHTML; },
      set innerHTML(value) {
        this._innerHTML = value;
        this.innerHTMLWrites += 1;
      },
      setAttribute(name, value) { this.attributes[name] = value; }
    }],
    ["discussion-timer-toggle-label", { textContent: "", style: {} }],
    ["discussion-timer-complete", { textContent: "" }]
  ]);
  const storage = new Map();
  let intervalCallback = null;

  const context = vm.createContext({
    console,
    document: { getElementById: id => elements.get(id) ?? null },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    setInterval: callback => {
      intervalCallback = callback;
      return 1;
    },
    clearInterval: () => { intervalCallback = null; },
    setTimeout,
    clearTimeout,
    window: { setTimeout, clearTimeout }
  });
  vm.runInContext(commonSource, context, { filename: "scripts/common.js" });
  vm.runInContext("render = () => { globalThis.renderCount = (globalThis.renderCount || 0) + 1; };", context);

  return {
    elements,
    evaluate: expression => vm.runInContext(expression, context),
    getIntervalCallback: () => intervalCallback,
    loadHandoff: () => vm.runInContext(handoffSource, context, { filename: "scripts/handoff.js" })
  };
}

test("public and private timer settings are independent and durations carry to the next day", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'tb'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90);");
  harness.evaluate("adjustDiscussionTimerDuration('private', -60);");
  harness.evaluate("setDiscussionTimerEnabled('private', false);");

  const dayOne = harness.evaluate("JSON.parse(JSON.stringify(ensureDiscussionTimerSession()))");
  assert.equal(dayOne.public.durationSeconds, 390);
  assert.equal(dayOne.private.durationSeconds, 240);
  assert.equal(dayOne.public.enabled, true);
  assert.equal(dayOne.private.enabled, false);

  harness.evaluate("state.dayNum = 2;");
  const dayTwo = harness.evaluate("JSON.parse(JSON.stringify(ensureDiscussionTimerSession()))");
  assert.equal(dayTwo.public.durationSeconds, 390);
  assert.equal(dayTwo.private.durationSeconds, 240);
  assert.equal(dayTwo.public.enabled, true);
  assert.equal(dayTwo.private.enabled, true);
});

test("saved timer sessions retain each day's choices while new days use the latest per-type defaults", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'sv'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); adjustDiscussionTimerDuration('private', -60); setDiscussionTimerEnabled('private', false);");
  harness.evaluate("state.dayNum = 2; ensureDiscussionTimerSession(); adjustDiscussionTimerDuration('public', 30); setDiscussionTimerEnabled('public', false);");
  const serialized = harness.evaluate("getSerializableState()");

  harness.evaluate(`hydrateState(${JSON.stringify(serialized)})`);
  const restored = harness.evaluate("JSON.parse(JSON.stringify({ defaults: state.discussionTimerDefaults, sessions: state.discussionTimerSessions }))");
  assert.equal(restored.defaults.public, 420);
  assert.equal(restored.defaults.private, 240);
  assert.equal(restored.sessions[1].public.durationSeconds, 390);
  assert.equal(restored.sessions[1].private.enabled, false);
  assert.equal(restored.sessions[2].public.durationSeconds, 420);
  assert.equal(restored.sessions[2].public.enabled, false);

  harness.evaluate("state.dayNum = 3;");
  const dayThree = harness.evaluate("JSON.parse(JSON.stringify(ensureDiscussionTimerSession()))");
  assert.equal(dayThree.public.durationSeconds, 420);
  assert.equal(dayThree.private.durationSeconds, 240);
  assert.equal(dayThree.public.enabled, true);
  assert.equal(dayThree.private.enabled, true);
});

test("a new day starts from the carried duration instead of the previous day's remainder", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'tb'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer();");
  harness.evaluate("proceedToNightStep(); proceedToDay(); startTimerUI('public');");
  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);

  harness.evaluate("stopTimer(); state.timerSeconds = 0; syncActiveDiscussionTimer(); proceedToNightStep(); proceedToDay(); startTimerUI('public');");
  assert.equal(harness.evaluate("state.dayNum"), 3);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);
});

test("reload during a later night creates the next day from the carried duration", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'tb'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer(); proceedToNightStep();");
  const serialized = harness.evaluate("getSerializableState()");

  harness.evaluate(`hydrateState(${JSON.stringify(serialized)}); proceedToDay(); startTimerUI('public');`);

  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);
  assert.equal(harness.evaluate("state.timerRunning"), true);
});

test("timer controls cannot be opened during a night", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'bmr'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer(); proceedToNightStep();");
  harness.evaluate("renderDiscussionTimerSetup(); startTimerUI('public');");

  assert.equal(harness.evaluate("state.phase"), "night");
  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 125);
  assert.equal(harness.evaluate("state.tab"), "night");
  assert.equal(harness.getIntervalCallback(), null);
});

test("handoff during a later night keeps the next day's full carried duration", () => {
  const harness = createHarness();
  harness.loadHandoff();
  harness.evaluate("showToast = () => {};");
  harness.evaluate("state.scriptId = 'tb'; state.screen = 'game'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer(); proceedToNightStep();");
  harness.evaluate("globalThis.testSnapshot = JSON.parse(JSON.stringify(getHandoffSnapshot())); commitHandoffSnapshot(globalThis.testSnapshot); proceedToDay(); startTimerUI('public');");

  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);
});

test("Ultimate Werewolf omits timer UI and rejects timer handlers", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'uw'; state.phase = 'day'; state.tab = 'day'; state.dayNum = 1;");

  const markup = harness.evaluate("renderDiscussionTimerSetup()");
  assert.equal(markup, "");
  assert.doesNotMatch(harness.evaluate("renderGameScreen()"), /startTimerUI|discussion-timer/);

  const before = harness.evaluate("JSON.stringify({ timerSeconds: state.timerSeconds, timerTotal: state.timerTotal, timerRunning: state.timerRunning, session: ensureDiscussionTimerSession() })");
  harness.evaluate("setTab('timer'); startTimerUI('public'); adjustDiscussionTimerDuration('public', 30); setDiscussionTimerEnabled('public', true); switchDiscussionTimer('private'); toggleTimerRunning(); adjustTimerVal(30);");
  assert.equal(harness.evaluate("state.tab"), "day");
  assert.equal(harness.evaluate("state.timerRunning"), false);
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().public.enabled"), false);
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().private.enabled"), false);
  assert.equal(
    harness.evaluate("JSON.stringify({ timerSeconds: state.timerSeconds, timerTotal: state.timerTotal, timerRunning: state.timerRunning, session: ensureDiscussionTimerSession() })"),
    before
  );
  assert.equal(harness.getIntervalCallback(), null);
});

for (const scriptId of ["tb", "bmr", "sv"]) {
  test(`${scriptId} exposes independent public and private discussion timer controls`, () => {
    const harness = createHarness();
    harness.evaluate(`state.scriptId = ${JSON.stringify(scriptId)}; state.phase = 'day'; state.dayNum = 1;`);

    const markup = harness.evaluate("renderDiscussionTimerSetup()");
    assert.match(markup, /Public discussion/);
    assert.match(markup, /Private discussion/);
    assert.match(markup, /startTimerUI\('public'\)/);
    assert.match(markup, /startTimerUI\('private'\)/);
    assert.equal(harness.evaluate("ensureDiscussionTimerSession().public.enabled"), true);
    assert.equal(harness.evaluate("ensureDiscussionTimerSession().private.enabled"), true);
  });
}

test("disabled timers cannot start or change until explicitly enabled", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'sv'; state.phase = 'day'; state.dayNum = 1; ensureDiscussionTimerSession(); setDiscussionTimerEnabled('private', false);");
  const durationBefore = harness.evaluate("ensureDiscussionTimerSession().private.durationSeconds");

  harness.evaluate("adjustDiscussionTimerDuration('private', 120); startTimerUI('private');");
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().private.durationSeconds"), durationBefore);
  assert.equal(harness.evaluate("state.tab"), "grimoire");
  assert.equal(harness.evaluate("state.timerRunning"), false);
  assert.equal(harness.getIntervalCallback(), null);

  harness.evaluate("setDiscussionTimerEnabled('private', true); adjustDiscussionTimerDuration('private', 120); startTimerUI('private');");
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().private.durationSeconds"), durationBefore + 120);
  assert.equal(harness.evaluate("state.activeDiscussionType"), "private");
  assert.equal(harness.evaluate("state.tab"), "timer");
  assert.equal(harness.evaluate("state.timerRunning"), true);
});

test("discussion durations clamp safely and the final tick stops at zero", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'tb'; state.phase = 'day'; state.dayNum = 1; ensureDiscussionTimerSession(); adjustDiscussionTimerDuration('public', -9999);");
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().public.durationSeconds"), 30);

  harness.evaluate("adjustDiscussionTimerDuration('private', 9999);");
  assert.equal(harness.evaluate("ensureDiscussionTimerSession().private.durationSeconds"), 3600);

  harness.evaluate("startTimerUI('public'); state.timerDeadline = Date.now() - 1;");
  const tick = harness.getIntervalCallback();
  assert.equal(typeof tick, "function");
  tick();

  assert.equal(harness.evaluate("state.timerSeconds"), 0);
  assert.equal(harness.evaluate("state.timerRunning"), false);
  assert.equal(harness.evaluate("state.timerDeadline"), null);
  assert.equal(harness.getIntervalCallback(), null);
  assert.equal(harness.elements.get("discussion-timer-display").textContent, "0:00");
  assert.equal(harness.elements.get("discussion-timer-complete").textContent, "Public discussion timer finished.");
});

test("timer ticks update stable clock elements without a full render", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'bmr'; state.dayNum = 1; state.phase = 'day'; startTimerUI('public'); state.timerDeadline = Date.now() + 299000;");
  const timerMarkup = harness.evaluate("renderTimerScreen()");
  assert.match(timerMarkup, /class="discussion-timer-clock"/);
  assert.match(timerMarkup, /data-timer-state="running"/);

  const toggle = harness.elements.get("discussion-timer-toggle");
  toggle.dataset.timerState = "running";
  toggle.innerHTMLWrites = 0;
  const rendersAfterStart = harness.evaluate("globalThis.renderCount");
  const tick = harness.getIntervalCallback();
  assert.equal(typeof tick, "function");

  tick();

  assert.equal(harness.evaluate("state.timerSeconds"), 299);
  assert.equal(harness.evaluate("globalThis.renderCount"), rendersAfterStart);
  assert.equal(harness.elements.get("discussion-timer-display").textContent, "4:59");
  assert.notEqual(harness.elements.get("discussion-timer-progress").style.strokeDashoffset, "");
  assert.equal(toggle.innerHTMLWrites, 0);

  harness.evaluate("toggleTimerRunning(); updateTimerDisplay();");
  assert.equal(toggle.dataset.timerState, "paused");
  assert.equal(toggle.innerHTMLWrites, 1);

  harness.evaluate("adjustTimerVal(30); resetTimerVal();");
  assert.equal(harness.evaluate("globalThis.renderCount"), rendersAfterStart);
  assert.equal(harness.elements.get("discussion-timer-toggle-label").textContent, "Start");
});

test("legacy saves migrate and persisted sessions resume paused", () => {
  const harness = createHarness();
  harness.evaluate("hydrateState({ scriptId: 'sv', dayNum: 2, phase: 'day', timerTotal: 420, timerSeconds: 390, timerRunning: true });");
  const legacyState = harness.evaluate("JSON.parse(JSON.stringify({ defaults: state.discussionTimerDefaults, session: ensureDiscussionTimerSession(), running: state.timerRunning }))");
  assert.equal(legacyState.defaults.public, 420);
  assert.equal(legacyState.defaults.private, 420);
  assert.equal(legacyState.session.public.remainingSeconds, 390);
  assert.equal(legacyState.running, false);

  harness.evaluate("adjustDiscussionTimerDuration('private', -120);");
  const serialized = harness.evaluate("getSerializableState()");
  harness.evaluate("state.discussionTimerDefaults = null; state.discussionTimerSessions = {}; state.timerRunning = true;");
  harness.evaluate(`hydrateState(${JSON.stringify(serialized)})`);
  const restored = harness.evaluate("JSON.parse(JSON.stringify({ defaults: state.discussionTimerDefaults, session: ensureDiscussionTimerSession(), running: state.timerRunning }))");
  assert.equal(restored.defaults.public, 420);
  assert.equal(restored.defaults.private, 300);
  assert.equal(restored.session.private.durationSeconds, 300);
  assert.equal(restored.running, false);
});
