const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const {
  EMAIL_EVENT_TYPES,
  EMAIL_LIMITS,
  normalizeEmailPayload,
  createIdempotencyKey,
  buildEmail,
  escapeHtml
} = require("../scripts/email.js");

function samplePayload(eventType, overrides = {}) {
  return {
    eventType,
    script: { id: "bmr", name: "Bad Moon Rising" },
    session: {
      id: "session-42",
      phase: eventType === "night-complete" ? "Night 2" : "Day 2",
      dayNumber: 2,
      nightNumber: 2,
      playerCount: 2,
      occurredAt: "2026-09-12T12:30:00.000Z"
    },
    players: [
      { seat: 2, name: "Blair", role: "Pukka", alignment: "Evil", alive: false },
      { seat: 1, name: "Alex", role: "Sailor", alignment: "Good", alive: true }
    ],
    results: [
      { label: "Deaths", value: "Blair died during the night.", tone: "bad" },
      { label: "Reminder", value: "Review protection tokens.", tone: "warning" }
    ],
    winners: [{ name: "Good team", detail: "The Demon was defeated." }],
    notes: ["Check the physical grimoire before announcing details."],
    handover: {
      url: "https://example.test/take-over#session-42",
      json: { kind: "botc-handoff", v: 1, game: { dayNum: 2, phase: "day" } }
    },
    ...overrides
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createEmailRuntimeHarness() {
  const storage = new Map();
  const timers = new Map();
  const fetchCalls = [];
  let nextTimerId = 1;
  let fetchImplementation = async () => ({ ok: true });
  const sandbox = {
    AbortController,
    URL,
    console: { ...console, error() {} },
    crypto: globalThis.crypto,
    document: {
      getElementById() { return null; },
      querySelectorAll() { return []; }
    },
    fetch(...args) {
      fetchCalls.push(args);
      return fetchImplementation(...args);
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      removeItem(key) { storage.delete(key); },
      setItem(key, value) { storage.set(key, value); }
    },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(callback, milliseconds) {
      const id = nextTimerId++;
      timers.set(id, { callback, milliseconds, cleared: false });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.cleared = true;
    }
  };
  sandbox.window = sandbox;
  sandbox.location = { href: "https://grimoire.example.test/game" };
  const context = vm.createContext(sandbox);
  for (const file of [
    "icons.js",
    "history.js",
    "game-rules.js",
    "trouble_brewing.js",
    "bad_moon_rising.js",
    "sects_and_violets.js",
    "ultimate_werewolf.js",
    "email.js",
    "common.js"
  ]) {
    const source = fs.readFileSync(path.join(__dirname, "..", "scripts", file), "utf8");
    vm.runInContext(source, context, { filename: `scripts/${file}` });
  }
  vm.runInContext(`
    render = () => {};
    autoSave = () => { globalThis.__autoSaveCount = (globalThis.__autoSaveCount || 0) + 1; };
    showToast = (message, tone) => { globalThis.__toasts.push({ message, tone }); };
    getHandoffSnapshot = source => ({ kind: "botc-handoff", v: 2, scriptId: source.scriptId, game: { dayNum: source.dayNum } });
    buildHandoffQrParts = async () => ["https://grimoire.example.test/#handoff=test"];
    globalThis.__autoSaveCount = 0;
    globalThis.__toasts = [];
    window.GRIMOIRE_RUNTIME_CONFIG = { emailEndpoint: "https://relay.example.test/send" };
    state.scriptId = "tb";
    state.screen = "game";
    state.phase = "night";
    state.dayNum = 2;
    state.playerCount = 5;
    state.names = ["Ada", "Bea", "Cleo", "Dara", "Eli"];
    state.assignments = { 0: "washerwoman", 1: "chef", 2: "empath", 3: "poisoner", 4: "imp" };
    state.rolePool = Object.values(state.assignments);
    state.alignments = { 0: "good", 1: "good", 2: "good", 3: "evil", 4: "evil" };
    state.alive = { 0: true, 1: true, 2: true, 3: true, 4: true };
    state.registeredDead = {};
    state.nightLog = [];
    state.deathsLastNight = [];
    state.sessionId = "session-a";
    state.emailEventTimes = {};
    state.emailDispatchedKeys = [];
    state.pendingEmails = [];
  `, context);

  return {
    evaluate(expression) {
      return vm.runInContext(expression, context);
    },
    fetchCalls,
    storage,
    timers,
    setFetch(implementation) {
      fetchImplementation = implementation;
    },
    fireTimeout(milliseconds) {
      const match = [...timers.values()].find(timer => timer.milliseconds === milliseconds && !timer.cleared);
      assert.ok(match, `expected an active ${milliseconds}ms timeout`);
      match.callback();
    },
    async flush() {
      for (let index = 0; index < 6; index++) await Promise.resolve();
    }
  };
}

function runtimeJson(harness, expression) {
  return JSON.parse(harness.evaluate(`JSON.stringify(${expression})`));
}

function seedPendingNightEmail(harness, instanceKey = "session-a:night-complete:2") {
  harness.evaluate(`
    (() => {
      const instanceKey = ${JSON.stringify(instanceKey)};
      const email = {
        eventType: "night-complete",
        subject: "Trouble Brewing — Night 2 complete",
        html: "<!doctype html><html><body>Night complete</body></html>",
        text: "Night complete",
        idempotencyKey: "retry-email-key"
      };
      storePendingEmail(instanceKey, email, []);
      state.pendingEmails = [{
        eventType: "night-complete",
        instanceKey,
        occurredAt: "2026-09-12T12:30:00.000Z"
      }];
    })()
  `);
}

test("exports exactly the three supported email event types", () => {
  assert.deepEqual(EMAIL_EVENT_TYPES, ["game-start", "night-complete", "game-end"]);
  assert.equal(Object.isFrozen(EMAIL_EVENT_TYPES), true);
  assert.equal(globalThis.BOTCEmail.EMAIL_EVENT_TYPES, EMAIL_EVENT_TYPES);

  for (const invalidType of ["", "roster", "handoff", "day-complete", "GAME-START", null]) {
    assert.throws(
      () => normalizeEmailPayload({ eventType: invalidType }),
      /Unsupported email event type/
    );
  }
});

test("loads as a browser script without CommonJS globals", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "email.js"), "utf8");
  const context = vm.createContext({ URL, Intl, Date, Set, WeakSet, Object, JSON, Math, Number, String, Array, TypeError, RangeError });
  vm.runInContext(source, context, { filename: "scripts/email.js" });

  assert.equal(typeof context.BOTCEmail, "object");
  assert.equal(typeof context.BOTCEmail.normalizeEmailPayload, "function");
  assert.equal(typeof context.BOTCEmail.createIdempotencyKey, "function");
  assert.equal(typeof context.BOTCEmail.buildEmail, "function");
  assert.deepEqual(Array.from(context.BOTCEmail.EMAIL_EVENT_TYPES), EMAIL_EVENT_TYPES);
});

test("normalization is pure, bounded, canonical, and does not mutate the input", () => {
  const input = samplePayload("game-start", {
    script: { id: " BMR ", name: "  Bad\n Moon\tRising  " },
    session: { dayNumber: -8, nightNumber: 1.6, playerCount: 1000, occurredAt: "invalid" },
    handover: { json: { z: 1, a: { d: 4, b: 2 } } }
  });
  const before = JSON.stringify(input);
  const normalized = normalizeEmailPayload(input);

  assert.equal(JSON.stringify(input), before);
  assert.equal(normalized.script.id, "bmr");
  assert.equal(normalized.script.name, "Bad Moon Rising");
  assert.equal(normalized.session.dayNumber, 0);
  assert.equal(normalized.session.nightNumber, 2);
  assert.equal(normalized.session.playerCount, 100);
  assert.equal(normalized.session.occurredAt, "");
  assert.deepEqual(normalized.players.map(player => player.seat), [1, 2]);
  assert.equal(normalized.players[0].status, "Alive");
  assert.equal(normalized.players[1].status, "Dead");
  assert.equal(normalized.handover.json, '{\n  "a": {\n    "b": 2,\n    "d": 4\n  },\n  "z": 1\n}');
});

test("idempotency keys are deterministic across object key order", () => {
  const first = samplePayload("night-complete", {
    handover: { json: { b: 2, a: 1 }, url: "https://example.test/take-over" }
  });
  const second = samplePayload("night-complete", {
    handover: { url: "https://example.test/take-over", json: { a: 1, b: 2 } }
  });

  const firstKey = createIdempotencyKey(first);
  const secondKey = createIdempotencyKey(second);
  assert.equal(firstKey, secondKey);
  assert.match(firstKey, /^botc-night-complete-[0-9a-f]{16}$/);

  second.results[0].value = "A different result";
  assert.notEqual(createIdempotencyKey(second), firstKey);
  assert.equal(buildEmail(first).idempotencyKey, firstKey);
});

test("game-start email is a complete responsive dark HTML document with a plain-text fallback", () => {
  const email = buildEmail(samplePayload("game-start"));

  assert.equal(email.eventType, "game-start");
  assert.equal(email.subject, "Bad Moon Rising — game started");
  assert.match(email.html, /^<!doctype html>/);
  assert.match(email.html, /<meta name="viewport"/);
  assert.match(email.html, /<meta name="color-scheme" content="dark">/);
  assert.match(email.html, /@media only screen and \(max-width: 620px\)/);
  assert.match(email.html, /<table role="presentation"/);
  assert.match(email.html, /style="[^"]*background:#090909/);
  assert.match(email.html, />Game Start</);
  assert.match(email.html, />Roster</);
  assert.match(email.html, />Alex</);
  assert.doesNotMatch(email.html, /https:\/\/fonts\.|@import|<script/i);
  assert.match(email.text, /GAME START/);
  assert.match(email.text, /ROSTER\n1\. Alex — Sailor — Good/);
});

test("night-complete email includes results but omits roster and winners", () => {
  const email = buildEmail(samplePayload("night-complete"));

  assert.equal(email.subject, "Bad Moon Rising — Night 2 complete");
  assert.match(email.html, />Night Complete</);
  assert.match(email.html, />Night results</);
  assert.match(email.html, /Blair died during the night/);
  assert.doesNotMatch(email.html, />Final roster</);
  assert.doesNotMatch(email.html, /<h2[^>]*>Winners?<\/h2>/);
  assert.match(email.text, /NIGHT RESULTS/);
  assert.match(email.text, /Deaths: Blair died during the night/);
});

test("game-end email includes winners and final roster but omits night-result cards", () => {
  const email = buildEmail(samplePayload("game-end"));

  assert.equal(email.subject, "Bad Moon Rising — game concluded");
  assert.match(email.html, />Game End</);
  assert.match(email.html, />Winner</);
  assert.match(email.html, /Good team/);
  assert.match(email.html, />Final roster</);
  assert.doesNotMatch(email.html, />Night results</);
  assert.match(email.text, /WINNER\n- Good team — The Demon was defeated/);
  assert.match(email.text, /FINAL ROSTER/);
});

test("all hostile HTML is escaped and unsafe handover protocols are omitted", () => {
  const attack = '<img src=x onerror="globalThis.compromised=true"><script>alert(1)</script>';
  const email = buildEmail(samplePayload("game-end", {
    script: { id: "bmr", name: `Bad\r\nBcc: victim@example.test ${attack}` },
    headline: attack,
    summary: attack,
    players: [{ seat: 1, name: attack, role: attack, alignment: attack, status: attack }],
    results: [{ label: attack, value: attack, tone: "bad" }],
    winners: [{ name: attack, detail: attack }],
    notes: [attack],
    handover: {
      url: "javascript:alert(document.cookie)",
      json: { payload: attack, closingTag: "</pre><script>alert(2)</script>" }
    }
  }));

  assert.doesNotMatch(email.subject, /\r|\n/);
  assert.doesNotMatch(email.html, /<script(?:\s|>)/i);
  assert.doesNotMatch(email.html, /<img\s+src=x/i);
  assert.doesNotMatch(email.html, /<[^>]+\sonerror\s*=/i);
  assert.doesNotMatch(email.html, /javascript:/i);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html, /&lt;\/pre&gt;&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(email.html, /Take over this game/);
  assert.match(email.html, /Handover data/);
});

test("handover sections are optional and safe HTTP links remain visible in both formats", () => {
  const absent = buildEmail(samplePayload("game-start", { handover: null }));
  assert.doesNotMatch(absent.html, /Continue this game/);
  assert.doesNotMatch(absent.text, /CONTINUE THIS GAME/);

  const present = buildEmail(samplePayload("game-start", {
    handover: {
      url: "https://example.test/take-over?game=one&mode=host#resume",
      json: '{"kind":"botc-handoff","text":"<safe>"}'
    }
  }));
  assert.match(present.html, /Continue this game/);
  assert.match(present.html, /href="https:\/\/example\.test\/take-over\?game=one&amp;mode=host#resume"/);
  assert.match(present.html, /src="cid:handover-qr"/);
  assert.match(present.html, /alt="Handover QR code"/);
  assert.match(present.html, /&quot;text&quot;: &quot;&lt;safe&gt;&quot;/);
  assert.match(present.text, /Take over: https:\/\/example\.test\/take-over\?game=one&mode=host#resume/);
  assert.match(present.text, /Handover JSON:/);
});

test("multipart handover links render one ordered QR attachment reference per part", () => {
  const urls = [
    "https://example.test/#handoff-part=BOTCP2.transfer.1.3.digest.first",
    "https://example.test/#handoff-part=BOTCP2.transfer.2.3.digest.second",
    "https://example.test/#handoff-part=BOTCP2.transfer.3.3.digest.third"
  ];
  const email = buildEmail(samplePayload("game-start", {
    handover: { urls, json: { kind: "botc-handoff", v: 2 } }
  }));

  assert.deepEqual(email.handoverUrls, urls);
  assert.deepEqual(email.payload.handover.urls, urls);
  assert.match(email.html, /Scan every QR code in order/);
  urls.forEach((_url, index) => {
    assert.match(email.html, new RegExp(`src="cid:handover-qr-${index + 1}"`));
    assert.match(email.html, new RegExp(`alt="Handover QR code ${index + 1} of ${urls.length}"`));
    assert.match(email.text, new RegExp(`Part ${index + 1} of ${urls.length}: https://example\\.test/`));
  });
  assert.doesNotMatch(email.html, /src="cid:handover-qr"(?:\s|>)/);
});

test("handover part counts and sizes are bounded before delivery", () => {
  assert.throws(
    () => normalizeEmailPayload(samplePayload("game-start", {
      handover: { urls: Array.from({ length: EMAIL_LIMITS.maxHandoverUrls + 1 }, (_, index) => `https://example.test/#part-${index}`) }
    })),
    /At most 12 handover URLs/
  );
  assert.throws(
    () => normalizeEmailPayload(samplePayload("game-start", {
      handover: { urls: [`https://example.test/#${"x".repeat(EMAIL_LIMITS.maxHandoverUrlChars)}`] }
    })),
    /2200 characters or fewer/
  );
  assert.throws(
    () => normalizeEmailPayload(samplePayload("game-start", { handover: { urls: "not-an-array" } })),
    /must be an array/
  );
});

test("large emails stay within the dispatch budget as complete documents", () => {
  const repeated = "'".repeat(1000);
  const urls = Array.from({ length: 5 }, (_, index) => (
    `https://example.test/#handoff-part=${index}-${"x".repeat(1700)}`
  ));
  const email = buildEmail(samplePayload("game-start", {
    players: Array.from({ length: 75 }, (_, index) => ({
      seat: index + 1,
      name: repeated,
      role: repeated,
      alignment: repeated,
      alive: true
    })),
    notes: Array.from({ length: 12 }, () => repeated),
    handover: { urls, json: { data: repeated.repeat(10) } }
  }));
  const envelope = JSON.stringify({
    eventType: email.eventType,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: email.idempotencyKey,
    handoverUrls: email.handoverUrls
  });

  assert.ok(envelope.length <= EMAIL_LIMITS.maxDispatchChars);
  assert.ok(email.html.length <= EMAIL_LIMITS.maxHtmlChars);
  assert.ok(email.text.length <= EMAIL_LIMITS.maxTextChars);
  assert.match(email.html, /^<!doctype html>/);
  assert.match(email.html, /<\/html>$/);
  assert.ok(email.omitted.length > 0);
});

test("invalid and circular handover JSON is rejected", () => {
  assert.throws(
    () => normalizeEmailPayload(samplePayload("game-start", { handover: { json: "not-json" } })),
    /valid JSON/
  );

  const circular = {};
  circular.self = circular;
  assert.throws(
    () => normalizeEmailPayload(samplePayload("game-start", { handover: { json: circular } })),
    /circular references/
  );
});

test("minimal payloads produce useful content without undefined values", () => {
  for (const eventType of EMAIL_EVENT_TYPES) {
    const email = buildEmail({ eventType });
    assert.match(email.subject, /^Storyteller's Grimoire — /);
    assert.doesNotMatch(email.html, /undefined|null|NaN/);
    assert.doesNotMatch(email.text, /undefined|null|NaN/);
    assert.match(email.html, /Verify game-critical details/);
  }
});

test("escapeHtml covers all characters meaningful in HTML text and attributes", () => {
  assert.equal(
    escapeHtml(`&<>"'`),
    "&amp;&lt;&gt;&quot;&#39;"
  );
});

test("email workflow pins dependencies and validates multipart delivery inputs", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "send-game-email.yml"),
    "utf8"
  );

  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
  assert.match(workflow, /nodemailer@10\.0\.9/);
  assert.match(workflow, /qrcode@1\.5\.4/);
  assert.match(workflow, /sanitize-html@2\.17\.7/);
  assert.match(workflow, /handoverUrls/);
  assert.match(workflow, /handover-qr-\$\{index \+ 1\}-of-\$\{handoverUrls\.length\}\.png/);
  assert.match(workflow, /supportedTypes = new Set\(\["game-start", "night-complete", "game-end"\]\)/);
  assert.match(workflow, /client_payload exceeds the safe delivery limit/);
  assert.match(workflow, /html must be a complete HTML document/);
  assert.doesNotMatch(workflow, /rawHtml[^\n]*\.slice\(/);
});

test("dispatch timeout aborts the request and preserves one retryable email for the active session", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  let requestSignal = null;
  harness.setFetch((_url, options) => {
    requestSignal = options.signal;
    options.signal.addEventListener("abort", () => {
      const error = new Error("request aborted");
      error.name = "AbortError";
      request.reject(error);
    }, { once: true });
    return request.promise;
  });

  const dispatch = harness.evaluate("dispatchGameEmail('night-complete')");
  await harness.flush();

  assert.equal(harness.fetchCalls.length, 1);
  assert.equal(requestSignal.aborted, false);
  harness.fireTimeout(15000);
  assert.equal(await dispatch, false);
  assert.equal(requestSignal.aborted, true);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), [{
    eventType: "night-complete",
    instanceKey: "session-a:night-complete:2",
    occurredAt: runtimeJson(harness, "state.emailEventTimes")['session-a:night-complete:2']
  }]);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox().map(item => item.instanceKey)"), [
    "session-a:night-complete:2"
  ]);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  assert.match(harness.evaluate("globalThis.__toasts.at(-1).message"), /failed|retry/i);

  harness.setFetch(async () => ({ ok: true }));
  assert.equal(await harness.evaluate("retryPendingEmails()"), true);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), []);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
  assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), ["session-a:night-complete:2"]);
});

test("a dispatch failure completing after reset or takeover cannot recreate retry state", async (t) => {
  await t.test("reset", async () => {
    const harness = createEmailRuntimeHarness();
    const request = deferred();
    harness.setFetch(() => request.promise);

    const dispatch = harness.evaluate("dispatchGameEmail('night-complete')");
    await harness.flush();
    harness.evaluate("resetEngine()");
    request.resolve({ ok: false });

    assert.equal(await dispatch, false);
    assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
    assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), []);
    assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), []);
    assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  });

  await t.test("replacement state", async () => {
    const harness = createEmailRuntimeHarness();
    const request = deferred();
    harness.setFetch(() => request.promise);

    const dispatch = harness.evaluate("dispatchGameEmail('night-complete')");
    await harness.flush();
    harness.evaluate(`
      state = {
        ...state,
        sessionId: "replacement-session",
        emailEventTimes: {},
        emailDispatchedKeys: [],
        pendingEmails: []
      };
      writeEmailOutbox([]);
    `);
    request.resolve({ ok: false });

    assert.equal(await dispatch, false);
    assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
    assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), []);
    assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), []);
    assert.equal(harness.evaluate("globalThis.__autoSaveCount"), 0);
    assert.equal(harness.evaluate("globalThis.__toasts.length"), 0);
  });
});

test("a stale successful dispatch cannot remove a replacement state's retry record", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  harness.setFetch(() => request.promise);

  const dispatch = harness.evaluate("dispatchGameEmail('night-complete')");
  await harness.flush();
  harness.evaluate(`
    state = {
      ...state,
      emailEventTimes: {},
      emailDispatchedKeys: [],
      pendingEmails: [{
        eventType: "night-complete",
        instanceKey: "session-a:night-complete:2",
        occurredAt: "replacement-attempt"
      }]
    };
  `);
  seedPendingNightEmail(harness);
  request.resolve({ ok: true });

  assert.equal(await dispatch, true);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox().map(item => item.instanceKey)"), [
    "session-a:night-complete:2"
  ]);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails.map(item => item.instanceKey)"), [
    "session-a:night-complete:2"
  ]);
  assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), []);
  assert.equal(harness.evaluate("globalThis.__autoSaveCount"), 0);
  assert.equal(harness.evaluate("globalThis.__toasts.length"), 0);
});

test("dispatch preparation failures release the per-event in-flight guard", async () => {
  const harness = createEmailRuntimeHarness();
  harness.evaluate(`
    globalThis.__workingEmailApi = window.BOTCEmail;
    window.BOTCEmail = {
      ...window.BOTCEmail,
      buildEmail() { throw new Error("synthetic preparation failure"); }
    };
  `);

  assert.equal(await harness.evaluate("dispatchGameEmail('night-complete')"), false);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  assert.equal(harness.fetchCalls.length, 0);

  harness.evaluate("window.BOTCEmail = globalThis.__workingEmailApi");
  assert.equal(await harness.evaluate("dispatchGameEmail('night-complete')"), true);
  assert.equal(harness.fetchCalls.length, 1);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
});

test("concurrent retry requests share one delivery attempt and clear their guards", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  seedPendingNightEmail(harness);
  harness.setFetch(() => request.promise);

  const firstRetry = harness.evaluate("retryPendingEmails()");
  await harness.flush();
  const secondRetry = harness.evaluate("retryPendingEmails()");
  await harness.flush();

  assert.equal(harness.fetchCalls.length, 1);
  request.resolve({ ok: true });
  assert.equal(await firstRetry, true);
  assert.equal(await secondRetry, true);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), []);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);

  seedPendingNightEmail(harness, "session-a:night-complete:3");
  harness.setFetch(async () => ({ ok: false }));
  assert.equal(await harness.evaluate("retryPendingEmails()"), false);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox().map(item => item.instanceKey)"), [
    "session-a:night-complete:3"
  ]);
});

test("retry timeout aborts once, retains the outbox item, and releases its in-flight guard", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  let requestSignal = null;
  seedPendingNightEmail(harness);
  harness.setFetch((_url, options) => {
    requestSignal = options.signal;
    options.signal.addEventListener("abort", () => {
      const error = new Error("retry aborted");
      error.name = "AbortError";
      request.reject(error);
    }, { once: true });
    return request.promise;
  });

  const retry = harness.evaluate("retryPendingEmails()");
  await harness.flush();
  assert.equal(harness.fetchCalls.length, 1);
  harness.fireTimeout(15000);

  assert.equal(await retry, false);
  assert.equal(requestSignal.aborted, true);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox().map(item => item.instanceKey)"), [
    "session-a:night-complete:2"
  ]);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails.map(item => item.instanceKey)"), [
    "session-a:night-complete:2"
  ]);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  assert.equal(harness.evaluate("pendingEmailRetry"), null);
});

test("dispatch and retry cannot send the same event concurrently", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  seedPendingNightEmail(harness);
  harness.setFetch(() => request.promise);

  const retry = harness.evaluate("retryPendingEmails()");
  await harness.flush();
  assert.equal(await harness.evaluate("dispatchGameEmail('night-complete')"), false);
  assert.equal(harness.fetchCalls.length, 1);

  request.resolve({ ok: true });
  assert.equal(await retry, true);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
  assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), ["session-a:night-complete:2"]);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
});

test("a retry completing after state replacement cannot mutate the replacement state or outbox", async () => {
  const harness = createEmailRuntimeHarness();
  const request = deferred();
  seedPendingNightEmail(harness);
  harness.setFetch(() => request.promise);

  const retry = harness.evaluate("retryPendingEmails()");
  await harness.flush();
  harness.evaluate(`
    state = {
      ...state,
      sessionId: "replacement-session",
      emailDispatchedKeys: [],
      pendingEmails: []
    };
    writeEmailOutbox([]);
  `);
  request.resolve({ ok: true });

  assert.equal(await retry, false);
  assert.deepEqual(runtimeJson(harness, "readEmailOutbox()"), []);
  assert.deepEqual(runtimeJson(harness, "state.pendingEmails"), []);
  assert.deepEqual(runtimeJson(harness, "state.emailDispatchedKeys"), []);
  assert.equal(harness.evaluate("emailDispatchesInFlight.size"), 0);
  assert.equal(harness.evaluate("globalThis.__autoSaveCount"), 0);
  assert.equal(harness.evaluate("globalThis.__toasts.length"), 0);
});
