const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_TRANSIENT_KEYS,
  createHistoryController,
  sanitizeHistorySnapshot
} = require("../scripts/history.js");

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    has: key => values.has(key),
    read: key => values.get(key) ?? null
  };
}

test("undo restores a labeled durable snapshot through the supplied callbacks", () => {
  let state = {
    screen: "game",
    dayNum: 2,
    alive: { 0: true, 1: true },
    chronicle: [{ title: "Day 2" }],
    drawerOpen: true,
    toast: { message: "Temporary" }
  };
  const calls = [];
  const history = createHistoryController({
    storage: null,
    now: () => 123,
    getState: () => state,
    beforeRestore: context => calls.push(`before:${context.label}`),
    restoreState: (snapshot, context) => {
      calls.push(`restore:${context.label}`);
      state = snapshot;
    },
    afterRestore: context => calls.push(`after:${context.label}`)
  });

  history.record("Mark Ben dead");
  state.alive[1] = false;
  state.chronicle.push({ title: "Death" });

  assert.equal(history.peekLabel(), "Mark Ben dead");
  assert.deepEqual(history.undo(), { label: "Mark Ben dead", recordedAt: 123 });
  assert.deepEqual(state.alive, { 0: true, 1: true });
  assert.deepEqual(state.chronicle, [{ title: "Day 2" }]);
  assert.equal("drawerOpen" in state, false);
  assert.equal("toast" in state, false);
  assert.deepEqual(calls, ["before:Mark Ben dead", "restore:Mark Ben dead", "after:Mark Ben dead"]);
  assert.equal(history.canUndo(), false);
});

test("history is bounded and discards the oldest snapshots", () => {
  let state = { value: 1 };
  const history = createHistoryController({
    limit: 2,
    storage: null,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });

  history.record("First");
  state.value = 2;
  history.record("Second");
  state.value = 3;
  history.record("Third");
  state.value = 4;

  assert.equal(history.size(), 2);
  assert.deepEqual(history.getEntries().map(entry => entry.label), ["Second", "Third"]);
  history.undo();
  assert.equal(state.value, 3);
  history.undo();
  assert.equal(state.value, 2);
  assert.equal(history.undo(), null);
});

test("recorded and returned snapshots are immutable copies", () => {
  let state = { names: ["Ada"], nested: { score: 1 } };
  const history = createHistoryController({
    storage: null,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });

  history.record("Before edits");
  state.names[0] = "Changed";
  state.nested.score = 9;
  const exposed = history.getEntries();
  exposed[0].snapshot.names[0] = "Tampered";
  exposed[0].snapshot.nested.score = 20;

  history.undo();
  assert.deepEqual(state, {
    names: ["Ada"],
    nested: { score: 1 },
    timerRunning: false,
    timerIntervalId: null,
    timerDeadline: null,
    timerStartedAt: null
  });
});

test("running timers restore paused from their deadline without retaining interval handles", () => {
  let clock = 1_000;
  let intervalStops = 0;
  let state = {
    dayNum: 3,
    timerSessionDay: 3,
    activeDiscussionType: "private",
    timerSeconds: 5,
    timerTotal: 10,
    timerRunning: true,
    timerDeadline: 5_000,
    timerIntervalId: { nativeHandle: true },
    discussionTimerSessions: {
      3: {
        private: { enabled: true, durationSeconds: 10, remainingSeconds: 5 }
      }
    }
  };
  const history = createHistoryController({
    storage: null,
    now: () => clock,
    getState: () => state,
    beforeRestore: () => { intervalStops++; },
    restoreState: snapshot => { state = snapshot; }
  });

  history.record("Before target change");
  clock = 3_500;
  state.timerSeconds = 1;
  state.timerIntervalId = { differentHandle: true };
  history.undo();

  assert.equal(intervalStops, 1);
  assert.equal(state.timerRunning, false);
  assert.equal(state.timerIntervalId, null);
  assert.equal(state.timerDeadline, null);
  assert.equal(state.timerStartedAt, null);
  assert.equal(state.timerSeconds, 2);
  assert.equal(state.discussionTimerSessions[3].private.remainingSeconds, 2);
});

test("snapshots omit transient, function, and circular fields", () => {
  const intervalHandle = { id: 7 };
  intervalHandle.self = intervalHandle;
  const state = {
    screen: "game",
    dayNum: 4,
    drawerOpen: true,
    confirm: { message: "Confirm" },
    timerIntervalId: intervalHandle,
    timerRunning: true,
    emailEventTimes: { "game-start": "2026-09-12T10:00:00.000Z" },
    emailDispatchedKeys: ["session-1:game-start"],
    pendingEmails: [{ eventType: "game-start" }],
    helper: () => "unused",
    nested: { durable: true }
  };
  state.circular = state;
  state.list = ["kept", state];

  const snapshot = sanitizeHistorySnapshot(state);

  assert.deepEqual(snapshot.nested, { durable: true });
  assert.equal(snapshot.screen, "game");
  assert.equal(snapshot.dayNum, 4);
  assert.equal("drawerOpen" in snapshot, false);
  assert.equal("confirm" in snapshot, false);
  assert.equal("timerIntervalId" in snapshot, false);
  assert.equal("timerRunning" in snapshot, false);
  assert.equal("emailEventTimes" in snapshot, false);
  assert.equal("emailDispatchedKeys" in snapshot, false);
  assert.equal("pendingEmails" in snapshot, false);
  assert.equal("helper" in snapshot, false);
  assert.equal("circular" in snapshot, false);
  assert.deepEqual(snapshot.list, ["kept", null]);
  assert.ok(DEFAULT_TRANSIENT_KEYS.includes("timerIntervalId"));
});

test("history survives controller recreation and persists undo removal", () => {
  const storage = createMemoryStorage();
  const storageKey = "test-history";
  let state = { value: 1 };
  const first = createHistoryController({
    storage,
    storageKey,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });
  first.record("One");
  state.value = 2;
  first.record("Two");

  const second = createHistoryController({
    storage,
    storageKey,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });
  assert.equal(second.size(), 2);
  assert.equal(second.peekLabel(), "Two");
  second.undo();
  assert.equal(state.value, 2);

  const third = createHistoryController({
    storage,
    storageKey,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });
  assert.equal(third.size(), 1);
  assert.equal(third.peekLabel(), "One");
  third.clearForTakeover();
  assert.equal(storage.has(storageKey), false);
});

test("new-game and takeover clearing remove every pending entry", () => {
  const storage = createMemoryStorage();
  let state = { value: 1 };
  const history = createHistoryController({
    storage,
    getState: () => state,
    restoreState: snapshot => { state = snapshot; }
  });

  history.record("First action");
  history.clearForNewGame();
  assert.equal(history.size(), 0);
  assert.equal(history.peekLabel(), null);

  history.record("Second action");
  history.clearForTakeover();
  assert.equal(history.size(), 0);
  assert.equal(history.canUndo(), false);
});

test("a failed restore keeps the entry available for a retry", () => {
  const state = { value: 1 };
  const history = createHistoryController({
    storage: null,
    getState: () => state,
    restoreState: () => { throw new Error("restore failed"); }
  });
  history.record("Retryable action");

  assert.throws(() => history.undo(), /restore failed/);
  assert.equal(history.size(), 1);
  assert.equal(history.peekLabel(), "Retryable action");
});
