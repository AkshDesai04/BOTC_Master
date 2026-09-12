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
      setAttribute(name, value) { this.attributes[name] = value; }
    }],
    ["discussion-timer-toggle-label", { textContent: "", style: {} }]
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
  harness.evaluate("state.scriptId = 'tb'; state.dayNum = 1; ensureDiscussionTimerSession();");
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

test("opening timer setup during a night does not copy the prior day's remainder", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'bmr'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer(); proceedToNightStep();");
  harness.evaluate("renderDiscussionTimerSetup(); startTimerUI('public');");

  assert.equal(harness.evaluate("state.phase"), "night");
  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);
});

test("handoff during a later night keeps the next day's full carried duration", () => {
  const harness = createHarness();
  harness.loadHandoff();
  harness.evaluate("dispatchHandoffEmail = () => Promise.resolve(false); showToast = () => {};");
  harness.evaluate("state.scriptId = 'tb'; state.screen = 'game'; state.dayNum = 1; state.phase = 'day'; ensureDiscussionTimerSession();");
  harness.evaluate("adjustDiscussionTimerDuration('public', 90); state.timerSeconds = 125; syncActiveDiscussionTimer(); proceedToNightStep();");
  harness.evaluate("globalThis.testSnapshot = JSON.parse(JSON.stringify(getHandoffSnapshot())); commitHandoffSnapshot(globalThis.testSnapshot); proceedToDay(); startTimerUI('public');");

  assert.equal(harness.evaluate("state.dayNum"), 2);
  assert.equal(harness.evaluate("state.timerTotal"), 390);
  assert.equal(harness.evaluate("state.timerSeconds"), 390);
});

test("Ultimate Werewolf renders a disabled option and rejects timer handlers", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'uw'; state.tab = 'day'; state.dayNum = 1;");

  const markup = harness.evaluate("renderDiscussionTimerSetup()");
  assert.match(markup, /discussion-timer-disabled/);
  assert.match(markup, /disabled aria-disabled="true"/);

  harness.evaluate("startTimerUI('public'); adjustDiscussionTimerDuration('public', 30); setDiscussionTimerEnabled('public', true);");
  assert.equal(harness.evaluate("state.tab"), "day");
  assert.equal(harness.evaluate("state.timerRunning"), false);
  assert.equal(harness.getIntervalCallback(), null);
});

test("timer ticks update stable clock elements without a full render", () => {
  const harness = createHarness();
  harness.evaluate("state.scriptId = 'bmr'; state.dayNum = 1; startTimerUI('public');");
  const rendersAfterStart = harness.evaluate("globalThis.renderCount");
  const tick = harness.getIntervalCallback();
  assert.equal(typeof tick, "function");

  tick();

  assert.equal(harness.evaluate("state.timerSeconds"), 299);
  assert.equal(harness.evaluate("globalThis.renderCount"), rendersAfterStart);
  assert.equal(harness.elements.get("discussion-timer-display").textContent, "4:59");
  assert.notEqual(harness.elements.get("discussion-timer-progress").style.strokeDashoffset, "");

  harness.evaluate("adjustTimerVal(30); resetTimerVal();");
  assert.equal(harness.evaluate("globalThis.renderCount"), rendersAfterStart);
  assert.equal(harness.elements.get("discussion-timer-toggle-label").textContent, "Start");
});

test("legacy saves migrate and persisted sessions resume paused", () => {
  const harness = createHarness();
  harness.evaluate("hydrateState({ scriptId: 'sv', dayNum: 2, timerTotal: 420, timerSeconds: 390, timerRunning: true });");
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
