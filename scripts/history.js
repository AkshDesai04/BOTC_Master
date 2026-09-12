(function attachHistoryModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BOTCHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHistoryModule() {
  "use strict";

  const HISTORY_VERSION = 1;
  const DEFAULT_HISTORY_LIMIT = 30;
  const DEFAULT_HISTORY_STORAGE_KEY = "botc_storyteller_history_v1";
  const DEFAULT_TRANSIENT_KEYS = Object.freeze([
    "confirm",
    "drawerOpen",
    "emailDispatchedKeys",
    "emailEventTimes",
    "expandedPlayer",
    "handoffReturnScreen",
    "nameInput",
    "pendingEmails",
    "showCard",
    "showHandoffGive",
    "showResume",
    "showWinnerPicker",
    "timerDeadline",
    "timerIntervalId",
    "timerRunning",
    "timerStartedAt",
    "toast",
    "uwSearchQuery"
  ]);

  function normalizeLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_HISTORY_LIMIT;
    return Math.max(1, Math.floor(parsed));
  }

  function normalizeLabel(value) {
    const label = String(value ?? "").trim();
    if (!label) throw new TypeError("History entries require a label.");
    return label.slice(0, 160);
  }

  function cloneJsonValue(value, transientKeys, ancestors, inArray = false) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "bigint") return String(value);
    if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
      return inArray ? null : undefined;
    }
    if (value instanceof Date) return value.toISOString();
    if (ancestors.has(value)) return inArray ? null : undefined;

    ancestors.add(value);
    let clone;
    if (Array.isArray(value)) {
      clone = value.map(item => cloneJsonValue(item, transientKeys, ancestors, true));
    } else {
      clone = {};
      Object.keys(value).forEach(key => {
        if (transientKeys.has(key)) return;
        const child = cloneJsonValue(value[key], transientKeys, ancestors, false);
        if (child !== undefined) clone[key] = child;
      });
    }
    ancestors.delete(value);
    return clone;
  }

  function sanitizeHistorySnapshot(source, options = {}) {
    if (!source || typeof source !== "object") {
      throw new TypeError("History snapshots require a state object.");
    }
    const transientKeys = new Set([
      ...DEFAULT_TRANSIENT_KEYS,
      ...(Array.isArray(options.transientKeys) ? options.transientKeys : [])
    ]);
    return cloneJsonValue(source, transientKeys, new WeakSet());
  }

  function cloneSnapshot(snapshot) {
    return cloneJsonValue(snapshot, new Set(), new WeakSet());
  }

  function finiteNonNegative(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return Math.max(0, Number(fallback) || 0);
    return Math.max(0, parsed);
  }

  function captureTimerState(source, capturedAt) {
    const deadlineValue = Number(source?.timerDeadline);
    return {
      wasRunning: source?.timerRunning === true,
      deadline: Number.isFinite(deadlineValue) ? deadlineValue : null,
      remainingSeconds: Math.round(finiteNonNegative(source?.timerSeconds)),
      capturedAt
    };
  }

  function reconcileTimerForRestore(snapshot, timerState, nowValue) {
    const restored = cloneSnapshot(snapshot);
    const timer = timerState && typeof timerState === "object" ? timerState : {};
    let remaining = Math.round(finiteNonNegative(restored.timerSeconds, timer.remainingSeconds));

    if (timer.wasRunning && Number.isFinite(Number(timer.deadline))) {
      remaining = Math.max(0, Math.ceil((Number(timer.deadline) - Number(nowValue)) / 1000));
      if (Number.isFinite(Number(restored.timerTotal))) {
        remaining = Math.min(remaining, Math.max(0, Math.round(Number(restored.timerTotal))));
      }
    }

    if (Object.prototype.hasOwnProperty.call(restored, "timerSeconds") || timer.wasRunning) {
      restored.timerSeconds = remaining;
    }
    restored.timerRunning = false;
    restored.timerIntervalId = null;
    restored.timerDeadline = null;
    restored.timerStartedAt = null;

    const sessionDay = restored.timerSessionDay ?? restored.dayNum;
    const activeType = restored.activeDiscussionType;
    const activeTimer = restored.discussionTimerSessions?.[String(sessionDay)]?.[activeType];
    if (activeTimer && typeof activeTimer === "object") {
      const duration = finiteNonNegative(activeTimer.durationSeconds, restored.timerTotal);
      activeTimer.remainingSeconds = Math.min(remaining, duration);
    }

    return restored;
  }

  function getDefaultStorage() {
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeStoredEntry(rawEntry, transientKeys) {
    if (!rawEntry || typeof rawEntry !== "object") return null;
    let label;
    try {
      label = normalizeLabel(rawEntry.label);
    } catch (error) {
      return null;
    }
    if (!rawEntry.snapshot || typeof rawEntry.snapshot !== "object") return null;
    const recordedAt = Number(rawEntry.recordedAt);
    const timer = rawEntry.timer && typeof rawEntry.timer === "object" ? rawEntry.timer : {};
    return {
      label,
      recordedAt: Number.isFinite(recordedAt) ? recordedAt : 0,
      snapshot: sanitizeHistorySnapshot(rawEntry.snapshot, { transientKeys }),
      timer: {
        wasRunning: timer.wasRunning === true,
        deadline: Number.isFinite(Number(timer.deadline)) ? Number(timer.deadline) : null,
        remainingSeconds: Math.round(finiteNonNegative(timer.remainingSeconds)),
        capturedAt: Number.isFinite(Number(timer.capturedAt)) ? Number(timer.capturedAt) : 0
      }
    };
  }

  function createHistoryController(options = {}) {
    if (typeof options.getState !== "function") {
      throw new TypeError("createHistoryController requires getState().");
    }
    if (typeof options.restoreState !== "function") {
      throw new TypeError("createHistoryController requires restoreState().");
    }

    const limit = normalizeLimit(options.limit);
    const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
    const storageKey = String(options.storageKey || DEFAULT_HISTORY_STORAGE_KEY);
    const transientKeys = Array.isArray(options.transientKeys) ? [...options.transientKeys] : [];
    const beforeRestore = typeof options.beforeRestore === "function" ? options.beforeRestore : () => {};
    const afterRestore = typeof options.afterRestore === "function" ? options.afterRestore : () => {};
    const now = typeof options.now === "function" ? options.now : Date.now;
    const onStorageError = typeof options.onStorageError === "function" ? options.onStorageError : () => {};
    let entries = [];

    function persist() {
      if (!storage || typeof storage.setItem !== "function") return;
      try {
        if (entries.length === 0 && typeof storage.removeItem === "function") {
          storage.removeItem(storageKey);
          return;
        }
        storage.setItem(storageKey, JSON.stringify({ version: HISTORY_VERSION, entries }));
      } catch (error) {
        onStorageError(error);
      }
    }

    function load() {
      if (!storage || typeof storage.getItem !== "function") return;
      try {
        const raw = storage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.version !== HISTORY_VERSION || !Array.isArray(parsed.entries)) return;
        entries = parsed.entries
          .map(entry => normalizeStoredEntry(entry, transientKeys))
          .filter(Boolean)
          .slice(-limit);
      } catch (error) {
        entries = [];
        onStorageError(error);
      }
    }

    function record(label, stateOverride) {
      const normalizedLabel = normalizeLabel(label);
      const source = stateOverride === undefined ? options.getState() : stateOverride;
      const recordedAt = Number(now());
      const safeRecordedAt = Number.isFinite(recordedAt) ? recordedAt : Date.now();
      const entry = {
        label: normalizedLabel,
        recordedAt: safeRecordedAt,
        snapshot: sanitizeHistorySnapshot(source, { transientKeys }),
        timer: captureTimerState(source, safeRecordedAt)
      };
      entries.push(entry);
      if (entries.length > limit) entries = entries.slice(-limit);
      persist();
      return { label: entry.label, recordedAt: entry.recordedAt };
    }

    function undo() {
      if (entries.length === 0) return null;
      const entry = entries[entries.length - 1];
      const currentTime = Number(now());
      const restoreTime = Number.isFinite(currentTime) ? currentTime : entry.recordedAt;
      const restoredState = reconcileTimerForRestore(entry.snapshot, entry.timer, restoreTime);
      const context = {
        label: entry.label,
        recordedAt: entry.recordedAt,
        timerRestoredPaused: true,
        transientKeys: [...DEFAULT_TRANSIENT_KEYS, ...transientKeys]
      };

      beforeRestore(context);
      options.restoreState(restoredState, context);
      entries.pop();
      persist();
      afterRestore(context);
      return { label: entry.label, recordedAt: entry.recordedAt };
    }

    function clear() {
      entries = [];
      persist();
    }

    function getEntries() {
      return cloneSnapshot(entries);
    }

    load();

    return Object.freeze({
      record,
      undo,
      clear,
      clearForNewGame: clear,
      clearForTakeover: clear,
      canUndo: () => entries.length > 0,
      peekLabel: () => entries.at(-1)?.label ?? null,
      size: () => entries.length,
      getEntries
    });
  }

  return Object.freeze({
    HISTORY_VERSION,
    DEFAULT_HISTORY_LIMIT,
    DEFAULT_HISTORY_STORAGE_KEY,
    DEFAULT_TRANSIENT_KEYS,
    sanitizeHistorySnapshot,
    reconcileTimerForRestore,
    createHistoryController
  });
});
