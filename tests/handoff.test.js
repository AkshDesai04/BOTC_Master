"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");

const handoff = require("../scripts/handoff.js");

const NOW = 2_000_000_000_000;
const CAPTURED_AT = NOW - 120_000;
const LEGACY_FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "handoff-previews",
  "max-20p-day7-mid-night.json"
);

const ROLES = Object.freeze({
  tb: Object.freeze(["washerwoman", "chef", "empath", "poisoner", "imp"]),
  bmr: Object.freeze(["grandmother", "chambermaid", "innkeeper", "godfather", "shabaloth"]),
  sv: Object.freeze(["clockmaker", "dreamer", "snakecharmer", "cerenovus", "vortox"]),
  uw: Object.freeze(["seer", "bodyguard", "villager", "werewolf", "wolf-cub"])
});

const CHARACTERS = Object.freeze(Object.fromEntries(
  Object.entries(ROLES).map(([scriptId, ids]) => [
    scriptId,
    Object.freeze(Object.fromEntries(ids.map(id => [id, Object.freeze({ id })])))
  ])
));

function typedCharacters(definitions) {
  return Object.freeze(Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [
    id,
    Object.freeze({ id, ...definition })
  ])));
}

const DYNAMIC_HANDOFF_CHARACTERS = Object.freeze({
  bmr: typedCharacters({
    lunatic: { type: "outsider", team: "good" },
    exorcist: { type: "townsfolk", team: "good" },
    devilsadvocate: { type: "minion", team: "evil" },
    courtier: { type: "townsfolk", team: "good" },
    po: { type: "demon", team: "evil" }
  }),
  sv: typedCharacters({
    philosopher: { type: "townsfolk", team: "good" },
    vigormortis: { type: "demon", team: "evil" },
    witch: { type: "minion", team: "evil" },
    fanggu: { type: "demon", team: "evil" },
    barber: { type: "outsider", team: "good" }
  })
});

function getCharacters(scriptId) {
  return CHARACTERS[scriptId];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotFor(scriptId) {
  const roles = ROLES[scriptId];
  const game = {
    screen: "game",
    scriptId,
    playerCount: 5,
    names: ["Ada", "Bea", "Cleo", "Dara", "Eli"],
    rolePool: [...roles],
    assignments: Object.fromEntries(roles.map((roleId, index) => [index, roleId])),
    drunkBelievedRoles: {},
    redHerringIndex: null,
    roleEntryIndex: 0,
    revealIndex: 3,
    revealCovered: true,
    dayNum: 3,
    phase: "day",
    activeWakeIdx: 4,
    nightLog: [{
      roleId: roles[0],
      sourceId: null,
      targetIndexes: [1],
      characterId: null,
      actingPlayerIndex: 0,
      fakeNoEffect: false,
      manualResolution: false,
      nightNumber: 2,
      stepIndex: 1
    }],
    alive: { 0: true, 1: true, 2: false, 3: true, 4: false },
    nominations: [{
      nominatorIndex: 0,
      nomineeIndex: 2,
      votes: [0, 3],
      voteCount: 2,
      executed: true,
      dayNum: 2
    }],
    votes: { 0: 1, 1: 1, 2: 0, 3: 1, 4: 0 },
    ghostVotes: { 0: false, 1: false, 2: true, 3: false, 4: false },
    deathsLastNight: [4],
    deathsToday: [2],
    poisonedIndex: 1,
    nightProtected: [3],
    executedTodayIndex: 2,
    usedAbilities: { [`0:${roles[0]}`]: true },
    chronicle: [{
      type: "night",
      nightNum: 2,
      title: "Night resolved",
      details: "Seat five died.",
      badgeColor: "#951B1E"
    }],
    winTeam: null,
    winnerSelection: [],
    sessionId: `${scriptId}-session-1`,
    emailEventTimes: { "night-complete:2": "2033-05-18T03:33:20.000Z" },
    emailDispatchedKeys: ["night-complete:2"],
    pendingEmails: [{
      eventType: "night-complete",
      instanceKey: "night-complete:2",
      occurredAt: "2033-05-18T03:33:20.000Z"
    }],
    timerSeconds: 125,
    timerTotal: 300,
    timerRunning: false,
    timerDeadline: null,
    discussionTimerDefaults: { public: 300, private: 180 },
    discussionTimerSessions: {
      3: {
        public: { enabled: true, durationSeconds: 300, remainingSeconds: 125 },
        private: { enabled: true, durationSeconds: 180, remainingSeconds: 180 }
      }
    },
    activeDiscussionType: "public",
    tab: "day"
  };

  if (scriptId === "uw") game.dist = { t: 0, o: 0, m: 0, d: 0 };
  else game.dist = { t: 3, o: 0, m: 1, d: 1 };

  return {
    kind: handoff.HANDOFF_KIND,
    v: handoff.HANDOFF_VERSION,
    scriptId,
    capturedAt: CAPTURED_AT,
    game
  };
}

function codecOptions(extra = {}) {
  return { now: NOW, getCharacters, ...extra };
}

function dynamicCodecOptions(extra = {}) {
  return codecOptions({
    getCharacters(scriptId) {
      return DYNAMIC_HANDOFF_CHARACTERS[scriptId] || getCharacters(scriptId);
    },
    ...extra
  });
}

function dynamicSnapshotFor(scriptId) {
  const source = snapshotFor(scriptId);
  source.game.nightLog = [];
  source.game.usedAbilities = {};

  if (scriptId === "bmr") {
    const roles = ["lunatic", "exorcist", "devilsadvocate", "courtier", "po"];
    source.game.rolePool = [...roles];
    source.game.assignments = Object.fromEntries(roles.map((roleId, seat) => [seat, roleId]));
    source.game.dist = { t: 2, o: 1, m: 1, d: 1 };
    source.game.alignments = { 0: "evil", 1: "good", 2: "evil", 3: "good", 4: "good" };
    source.game.lunaticBelievedRoles = { 0: "po" };
    source.game.lunaticPoCharged = { 0: true };
    source.game.previousNightTargets = {
      "1:exorcist": { targetIndex: 4, nightNumber: 2 },
      "2:devilsadvocate": { targetIndex: 0, nightNumber: 2 }
    };
    source.game.courtierEffect = { characterId: "po", expiresAfterDay: 5 };
    return source;
  }

  if (scriptId === "sv") {
    const roles = ["philosopher", "vigormortis", "witch", "fanggu", "fanggu"];
    source.game.rolePool = [...roles];
    source.game.assignments = Object.fromEntries(roles.map((roleId, seat) => [seat, roleId]));
    source.game.dist = { t: 1, o: 0, m: 1, d: 3 };
    source.game.alive[2] = false;
    source.game.alignments = { 0: "evil", 1: "evil", 2: "evil", 3: "evil", 4: "good" };
    source.game.gainedAbilities = { 0: "barber" };
    source.game.vigormortisRetainedMinions = [2];
    source.game.permanentlyPoisoned = { 2: true };
    source.game.fangGuJumpUsed = true;
    return source;
  }

  throw new Error(`No dynamic handoff fixture exists for ${scriptId}.`);
}

function fangGuJumpAfterCharacterChangeSnapshot() {
  const source = dynamicSnapshotFor("sv");
  source.game.rolePool = ["philosopher", "vigormortis", "witch", "barber", "fanggu"];
  source.game.assignments = {
    0: "philosopher",
    1: "vigormortis",
    2: "witch",
    3: "barber",
    4: "fanggu"
  };
  source.game.dist = { t: 1, o: 1, m: 1, d: 2 };
  source.game.alive = { 0: true, 1: true, 2: false, 3: false, 4: true };
  source.game.alignments = { 0: "evil", 1: "evil", 2: "evil", 3: "evil", 4: "evil" };
  source.game.deathsLastNight = [3];
  source.game.nightLog = [{
    roleId: "fanggu",
    sourceId: null,
    targetIndexes: [4],
    characterId: null,
    actingPlayerIndex: 3,
    fakeNoEffect: false,
    manualResolution: false,
    nightNumber: 3,
    stepIndex: 4
  }];
  source.game.chronicle = [{
    type: "night",
    nightNum: 3,
    title: "Fang Gu Action",
    details: "The first Outsider jump was applied: Eli is now an evil Fang Gu and Dara dies instead.",
    badgeColor: "var(--red)"
  }, {
    type: "night",
    nightNum: 3,
    title: "Character Changed",
    details: "Dara changed from Fang Gu to Barber.",
    badgeColor: "var(--green)"
  }];
  source.game.fangGuJumpUsed = true;
  return source;
}

function assertCode(error, expectedCode) {
  assert.equal(error?.code, expectedCode);
  return true;
}

test("browser adapter exposes handoff controls for every supported active script", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "handoff.js"), "utf8");
  const stored = new Map();
  const context = vm.createContext({
    Blob,
    CompressionStream,
    DecompressionStream,
    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,
    clearTimeout,
    document: {},
    sessionStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      removeItem(key) { stored.delete(key); },
      setItem(key, value) { stored.set(key, value); }
    },
    setTimeout() { return 0; },
    state: { scriptId: "tb", screen: "game", dayNum: 1, phase: "night" }
  });
  vm.runInContext(source, context, { filename: "scripts/handoff.js" });

  assert.equal(context.BOTCHandoffCodec.HANDOFF_VERSION, 2);
  for (const scriptId of ["tb", "bmr", "sv"]) {
    context.state.scriptId = scriptId;
    assert.equal(context.canGiveHandoff(), true, scriptId);
  }
  context.state.screen = "reveal";
  assert.equal(context.canGiveHandoff(), true);
  context.state.screen = "roles";
  assert.equal(context.canGiveHandoff(), false);
});

for (const scriptId of ["tb", "bmr", "sv"]) {
  test(`v2 JSON payload round-trips the complete ${scriptId} state`, async () => {
    const source = snapshotFor(scriptId);
    const expected = handoff.sanitizeHandoffSnapshot(source, codecOptions());
    const payload = await handoff.encodeHandoffPayload(source, codecOptions({ compress: false }));

    assert.ok(payload.startsWith(handoff.V2_JSON_PREFIX));
    const restored = await handoff.decodeHandoffPayload(payload, codecOptions());
    assert.deepEqual(restored, expected);
    assert.notStrictEqual(restored.game, source.game);
    assert.deepEqual(restored.game.usedAbilities, source.game.usedAbilities);
    assert.deepEqual(restored.game.deathsToday, source.game.deathsToday);
    assert.deepEqual(restored.game.nightProtected, source.game.nightProtected);
    assert.equal(restored.game.executedTodayIndex, source.game.executedTodayIndex);
    assert.deepEqual(restored.game.emailEventTimes, source.game.emailEventTimes);
    assert.deepEqual(restored.game.emailDispatchedKeys, source.game.emailDispatchedKeys);
    assert.deepEqual(restored.game.pendingEmails, source.game.pendingEmails);
  });
}

test("Bad Moon Rising role-dependent state survives a typed handoff round-trip", async () => {
  const source = dynamicSnapshotFor("bmr");
  const options = dynamicCodecOptions({ compress: false });
  const payload = await handoff.encodeHandoffPayload(source, options);
  const restored = await handoff.decodeHandoffPayload(payload, options);

  assert.deepEqual(restored.game.alignments, {
    0: "evil",
    1: "good",
    2: "evil",
    3: "good",
    4: "good"
  });
  assert.deepEqual(restored.game.lunaticBelievedRoles, { 0: "po" });
  assert.deepEqual(restored.game.lunaticPoCharged, {
    0: true,
    1: false,
    2: false,
    3: false,
    4: false
  });
  assert.deepEqual(restored.game.previousNightTargets, {
    "1:exorcist": { targetIndex: 4, nightNumber: 2 },
    "2:devilsadvocate": { targetIndex: 0, nightNumber: 2 }
  });
  assert.deepEqual(restored.game.courtierEffect, {
    characterId: "po",
    expiresAfterDay: 5
  });
});

test("Sects & Violets role-dependent state survives a typed handoff round-trip", async () => {
  const source = dynamicSnapshotFor("sv");
  const options = dynamicCodecOptions({ compress: false });
  const payload = await handoff.encodeHandoffPayload(source, options);
  const restored = await handoff.decodeHandoffPayload(payload, options);

  assert.deepEqual(restored.game.alignments, {
    0: "evil",
    1: "evil",
    2: "evil",
    3: "evil",
    4: "good"
  });
  assert.deepEqual(restored.game.gainedAbilities, { 0: "barber" });
  assert.deepEqual(restored.game.vigormortisRetainedMinions, [2]);
  assert.deepEqual(restored.game.permanentlyPoisoned, {
    0: false,
    1: false,
    2: true,
    3: false,
    4: false
  });
  assert.equal(restored.game.fangGuJumpUsed, true);
});

test("Fang Gu jump use survives a later character change through round-trip and takeover", async () => {
  const source = fangGuJumpAfterCharacterChangeSnapshot();
  const options = dynamicCodecOptions({ compress: false });
  assert.equal(Object.values(source.game.assignments).filter(roleId => roleId === "fanggu").length, 1);

  const payload = await handoff.encodeHandoffPayload(source, options);
  const restored = await handoff.decodeHandoffPayload(payload, options);
  assert.equal(restored.game.fangGuJumpUsed, true);
  assert.equal(restored.game.assignments[3], "barber");
  assert.equal(restored.game.assignments[4], "fanggu");

  const takeover = handoff.createTakeoverState(
    { scriptId: "sv", fangGuJumpUsed: false },
    restored,
    dynamicCodecOptions()
  );
  assert.equal(takeover.fangGuJumpUsed, true);
  assert.equal(takeover.assignments[3], "barber");
  assert.equal(takeover.assignments[4], "fanggu");
});

test("Fang Gu jump use is rejected when no eligible game state supports it", () => {
  const withoutFangGu = fangGuJumpAfterCharacterChangeSnapshot();
  withoutFangGu.game.rolePool[4] = "barber";
  withoutFangGu.game.assignments[4] = "barber";
  const sanitized = handoff.sanitizeHandoffSnapshot(withoutFangGu, dynamicCodecOptions());
  assert.equal(sanitized.game.fangGuJumpUsed, false);

  const wrongScript = snapshotFor("bmr");
  wrongScript.game.fangGuJumpUsed = true;
  assert.equal(handoff.sanitizeHandoffSnapshot(wrongScript, codecOptions()).game.fangGuJumpUsed, false);

  withoutFangGu.game.fangGuJumpUsed = "true";
  assert.throws(
    () => handoff.sanitizeHandoffSnapshot(withoutFangGu, dynamicCodecOptions()),
    error => assertCode(error, "invalid-boolean")
  );
});

test("role-dependent fields reject malformed handoff data with stable errors", () => {
  const cases = [
    {
      name: "invalid BMR alignment",
      scriptId: "bmr",
      code: "invalid-alignment",
      mutate(game) { game.alignments[0] = "neutral"; }
    },
    {
      name: "Lunatic belief outside the roster",
      scriptId: "bmr",
      code: "invalid-seat",
      mutate(game) { game.lunaticBelievedRoles = { 5: "po" }; }
    },
    {
      name: "non-boolean fake Po charge",
      scriptId: "bmr",
      code: "invalid-boolean",
      mutate(game) { game.lunaticPoCharged = { 0: "true" }; }
    },
    {
      name: "Courtier effect with an array shape",
      scriptId: "bmr",
      code: "invalid-shape",
      mutate(game) { game.courtierEffect = ["po", 5]; }
    },
    {
      name: "previous target with an injected field",
      scriptId: "bmr",
      code: "unknown-field",
      mutate(game) {
        game.previousNightTargets["1:exorcist"].unexpected = "ignored-by-old-code";
      }
    },
    {
      name: "malformed previous-target key",
      scriptId: "bmr",
      code: "invalid-previous-target",
      mutate(game) {
        game.previousNightTargets = {
          "1:po": { targetIndex: 4, nightNumber: 2 }
        };
      }
    },
    {
      name: "gained abilities with an array shape",
      scriptId: "sv",
      code: "invalid-map",
      mutate(game) { game.gainedAbilities = ["barber"]; }
    },
    {
      name: "duplicate Vigormortis-retained minion seat",
      scriptId: "sv",
      code: "duplicate-seat",
      mutate(game) { game.vigormortisRetainedMinions = [2, 2]; }
    },
    {
      name: "non-boolean permanent poison marker",
      scriptId: "sv",
      code: "invalid-boolean",
      mutate(game) { game.permanentlyPoisoned = { 2: "yes" }; }
    },
    {
      name: "non-boolean Fang Gu jump state",
      scriptId: "sv",
      code: "invalid-boolean",
      mutate(game) { game.fangGuJumpUsed = "yes"; }
    }
  ];

  for (const item of cases) {
    const source = dynamicSnapshotFor(item.scriptId);
    item.mutate(source.game);
    assert.throws(
      () => handoff.sanitizeHandoffSnapshot(source, dynamicCodecOptions()),
      error => assertCode(error, item.code),
      item.name
    );
  }
});

test("role-dependent handoff state is constrained to eligible roles and seats", () => {
  const bmr = dynamicSnapshotFor("bmr");
  bmr.game.lunaticBelievedRoles = { 0: "courtier" };
  bmr.game.lunaticPoCharged = { 0: true };
  bmr.game.previousNightTargets = {
    "3:exorcist": { targetIndex: 4, nightNumber: 2 }
  };
  const cleanBmr = handoff.sanitizeHandoffSnapshot(bmr, dynamicCodecOptions());
  assert.deepEqual(cleanBmr.game.lunaticBelievedRoles, {});
  assert.equal(cleanBmr.game.lunaticPoCharged[0], false);
  assert.deepEqual(cleanBmr.game.previousNightTargets, {});

  const sv = dynamicSnapshotFor("sv");
  sv.game.gainedAbilities = { 0: "vigormortis" };
  sv.game.alive[2] = true;
  const cleanSv = handoff.sanitizeHandoffSnapshot(sv, dynamicCodecOptions());
  assert.deepEqual(cleanSv.game.gainedAbilities, {});
  assert.deepEqual(cleanSv.game.vigormortisRetainedMinions, []);
});

test("removed scripts are rejected by the handoff schema", async () => {
  const source = snapshotFor("uw");
  source.game.screen = "victory";
  source.game.winTeam = "manual";
  source.game.winnerSelection = ["werewolves", "tanner"];
  await assert.rejects(() => handoff.encodeHandoffPayload(source, codecOptions({ compress: false })), { code: "unsupported-script" });
});

test("Zombuul registered-dead state survives a handoff round-trip", async () => {
  const source = snapshotFor("bmr");
  source.game.assignments[4] = "zombuul";
  source.game.rolePool[4] = "zombuul";
  source.game.alive[4] = true;
  source.game.registeredDead = { 4: true };
  const bmrCharacters = {
    ...CHARACTERS.bmr,
    zombuul: Object.freeze({ id: "zombuul" })
  };
  const options = {
    now: NOW,
    compress: false,
    getCharacters(scriptId) {
      return scriptId === "bmr" ? bmrCharacters : getCharacters(scriptId);
    }
  };

  const payload = await handoff.encodeHandoffPayload(source, options);
  const restored = await handoff.decodeHandoffPayload(payload, options);

  assert.equal(restored.game.assignments[4], "zombuul");
  assert.deepEqual(restored.game.registeredDead, {
    0: false,
    1: false,
    2: false,
    3: false,
    4: true
  });
  assert.equal(restored.game.alive[4], true);
});

test("phase-specific tabs are canonicalized while neutral tabs remain available", () => {
  const cases = [
    { phase: "night", tab: "night", expected: "night" },
    { phase: "night", tab: "day", expected: "night" },
    { phase: "night", tab: "timer", expected: "night" },
    { phase: "night", tab: "grimoire", expected: "grimoire" },
    { phase: "night", tab: "chronicle", expected: "chronicle" },
    { phase: "day", tab: "day", expected: "day" },
    { phase: "day", tab: "night", expected: "day" },
    { phase: "day", tab: "timer", expected: "timer" },
    { phase: "day", tab: "grimoire", expected: "grimoire" },
    { phase: "day", tab: "chronicle", expected: "chronicle" }
  ];

  for (const { phase, tab, expected } of cases) {
    const source = snapshotFor("tb");
    source.game.phase = phase;
    source.game.tab = tab;
    const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
    assert.equal(clean.game.tab, expected, `${phase} phase with ${tab} tab`);
  }
});

test("poison markers are retained only for Trouble Brewing", () => {
  const troubleBrewing = handoff.sanitizeHandoffSnapshot(snapshotFor("tb"), codecOptions());
  assert.equal(troubleBrewing.game.poisonedIndex, 1);

  for (const scriptId of ["bmr", "sv"]) {
    const source = snapshotFor(scriptId);
    source.game.poisonedIndex = 1;
    const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
    assert.equal(clean.game.poisonedIndex, null, scriptId);
  }
});

test("registered-dead markers are retained only for a living Bad Moon Rising Zombuul", () => {
  const bmrCharacters = {
    ...CHARACTERS.bmr,
    zombuul: Object.freeze({ id: "zombuul" })
  };
  const options = {
    now: NOW,
    getCharacters(scriptId) {
      return scriptId === "bmr" ? bmrCharacters : getCharacters(scriptId);
    }
  };

  const valid = snapshotFor("bmr");
  valid.game.assignments[4] = "zombuul";
  valid.game.rolePool[4] = "zombuul";
  valid.game.alive[4] = true;
  valid.game.registeredDead = { 4: true };
  assert.equal(handoff.sanitizeHandoffSnapshot(valid, options).game.registeredDead[4], true);

  const deadZombuul = clone(valid);
  deadZombuul.game.alive[4] = false;
  assert.equal(handoff.sanitizeHandoffSnapshot(deadZombuul, options).game.registeredDead[4], false);

  const wrongCharacter = snapshotFor("bmr");
  wrongCharacter.game.registeredDead = { 0: true };
  assert.equal(handoff.sanitizeHandoffSnapshot(wrongCharacter, options).game.registeredDead[0], false);

  for (const scriptId of ["tb", "sv"]) {
    const source = snapshotFor(scriptId);
    source.game.registeredDead = { 0: true };
    const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
    assert.equal(clean.game.registeredDead[0], false, scriptId);
  }
});

test("Po charge state is retained only when Bad Moon Rising has a Po", () => {
  const bmrCharacters = {
    ...CHARACTERS.bmr,
    po: Object.freeze({ id: "po" })
  };
  const options = {
    now: NOW,
    getCharacters(scriptId) {
      return scriptId === "bmr" ? bmrCharacters : getCharacters(scriptId);
    }
  };

  const withPo = snapshotFor("bmr");
  withPo.game.assignments[4] = "po";
  withPo.game.rolePool[4] = "po";
  withPo.game.poCharged = true;
  assert.equal(handoff.sanitizeHandoffSnapshot(withPo, options).game.poCharged, true);

  const withoutPo = snapshotFor("bmr");
  withoutPo.game.poCharged = true;
  assert.equal(handoff.sanitizeHandoffSnapshot(withoutPo, options).game.poCharged, false);

  for (const scriptId of ["tb", "sv"]) {
    const source = snapshotFor(scriptId);
    source.game.poCharged = true;
    const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
    assert.equal(clean.game.poCharged, false, scriptId);
  }
});

test("session identifiers containing delimiters are rejected", () => {
  const source = snapshotFor("tb");
  source.game.sessionId = "tb:session-1";

  assert.throws(
    () => handoff.sanitizeHandoffSnapshot(source, codecOptions()),
    error => assertCode(error, "invalid-session-id")
  );
});

test("handoff preserves unresolved steps and session-scoped email metadata", () => {
  const source = snapshotFor("tb");
  source.game.nightLog[0].skipped = true;
  source.game.emailEventTimes = {
    "tb-session-1:night-complete:2": "2033-05-18T03:33:20.000Z"
  };
  source.game.emailDispatchedKeys = ["tb-session-1:night-complete:2"];
  source.game.pendingEmails = [{
    eventType: "night-complete",
    instanceKey: "tb-session-1:night-complete:2",
    occurredAt: "2033-05-18T03:33:20.000Z"
  }];

  const clean = handoff.sanitizeHandoffSnapshot(source, { getCharacters, now: NOW });
  assert.equal(clean.game.nightLog[0].skipped, true);
  assert.deepEqual(clean.game.emailDispatchedKeys, ["tb-session-1:night-complete:2"]);
  assert.deepEqual(Object.keys(clean.game.emailEventTimes), ["tb-session-1:night-complete:2"]);
  assert.equal(clean.game.pendingEmails[0].instanceKey, "tb-session-1:night-complete:2");
});

test("the checked-in version 1 Trouble Brewing JSON fixture remains readable", async () => {
  const raw = fs.readFileSync(LEGACY_FIXTURE_PATH, "utf8");
  const restored = await handoff.decodeHandoffPayload(raw, { now: NOW });

  assert.equal(restored.v, handoff.HANDOFF_VERSION);
  assert.equal(restored.scriptId, "tb");
  assert.equal(restored.game.playerCount, 20);
  assert.equal(restored.game.dayNum, 7);
  assert.equal(restored.game.names.length, 20);
  assert.equal(restored.game.assignments[19], "imp");
  assert.equal(restored.game.timerRunning, false);
  assert.equal(restored.game.timerDeadline, null);
  assert.ok(restored.game.chronicle.length > 30);
});

test("the checked-in version 1 fixture remains readable in BOTC1 gzip form", async t => {
  if (typeof DecompressionStream === "undefined") {
    t.skip("gzip streams are unavailable in this runtime");
    return;
  }

  const raw = fs.readFileSync(LEGACY_FIXTURE_PATH, "utf8");
  const packed = zlib.gzipSync(Buffer.from(raw, "utf8")).toString("base64");
  const restored = await handoff.decodeHandoffPayload(
    handoff.V1_COMPRESSED_PREFIX + packed,
    { now: NOW }
  );

  assert.equal(restored.scriptId, "tb");
  assert.equal(restored.game.playerCount, 20);
  assert.equal(restored.game.dayNum, 7);
});

test("imported chronicle markup is converted to text and unsafe badge styles are discarded", () => {
  const source = snapshotFor("tb");
  source.game.chronicle = [{
    type: "night",
    nightNum: 2,
    title: '<img src=x onerror="alert(1)">Night & "watch"',
    details: '<script>alert("x")</script><strong>Seat 1</strong>',
    badgeColor: "url(javascript:alert(1))"
  }];

  const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
  const entry = clean.game.chronicle[0];
  assert.equal(entry.title, 'Night & "watch"');
  assert.equal(entry.details, 'alert("x")Seat 1');
  assert.equal(entry.badgeColor, "var(--border)");
  assert.doesNotMatch(entry.title + entry.details, /<|onerror/i);

  const withStyleField = snapshotFor("tb");
  withStyleField.game.chronicle[0].style = "position:fixed";
  assert.throws(
    () => handoff.sanitizeHandoffSnapshot(withStyleField, codecOptions()),
    error => assertCode(error, "unknown-field")
  );
});

test("strict schema checks reject malformed structures and out-of-range values", () => {
  const cases = [
    {
      name: "unsupported version",
      code: "unsupported-version",
      mutate(value) { value.v = 99; }
    },
    {
      name: "conflicting script identifiers",
      code: "script-mismatch",
      mutate(value) { value.game.scriptId = "bmr"; }
    },
    {
      name: "unknown game field",
      code: "unknown-field",
      mutate(value) { value.game.unexpected = true; }
    },
    {
      name: "player count above the script limit",
      code: "invalid-number",
      mutate(value) { value.game.playerCount = 21; }
    },
    {
      name: "duplicate normalized names",
      code: "duplicate-name",
      mutate(value) { value.game.names[1] = "ADA"; }
    },
    {
      name: "missing seat assignment",
      code: "missing-assignment",
      mutate(value) { delete value.game.assignments[4]; }
    },
    {
      name: "assignment outside the roster",
      code: "invalid-seat",
      mutate(value) { value.game.assignments[5] = "imp"; }
    },
    {
      name: "unknown character id",
      code: "unknown-role",
      mutate(value) { value.game.assignments[0] = "not-in-script"; }
    },
    {
      name: "role pool with the wrong length",
      code: "invalid-role-pool",
      mutate(value) { value.game.rolePool.pop(); }
    },
    {
      name: "timer below its minimum",
      code: "invalid-number",
      mutate(value) { value.game.timerTotal = 29; }
    },
    {
      name: "timer remaining above its duration",
      code: "invalid-number",
      mutate(value) { value.game.discussionTimerSessions[3].private.remainingSeconds = 181; }
    },
    {
      name: "duplicate death seat",
      code: "duplicate-seat",
      mutate(value) { value.game.deathsLastNight = [4, 4]; }
    },
    {
      name: "malformed used ability key",
      code: "invalid-ability-key",
      mutate(value) { value.game.usedAbilities = { malformed: true }; }
    },
    {
      name: "registered-dead seat outside the roster",
      code: "invalid-seat",
      mutate(value) { value.game.registeredDead = { 5: true }; }
    },
    {
      name: "too many chronicle entries",
      code: "invalid-chronicle",
      mutate(value) {
        value.game.chronicle = Array.from(
          { length: handoff.HANDOFF_LIMITS.maxChronicleEntries + 1 },
          () => ({ type: "system", title: "Entry", details: "Text", badgeColor: "#fff" })
        );
      }
    }
  ];

  for (const item of cases) {
    const source = clone(snapshotFor("tb"));
    item.mutate(source);
    assert.throws(
      () => handoff.sanitizeHandoffSnapshot(source, codecOptions()),
      error => assertCode(error, item.code),
      item.name
    );
  }

  assert.throws(
    () => handoff.extractHandoffToken("x".repeat(handoff.HANDOFF_LIMITS.maxRawBytes + 1)),
    error => assertCode(error, "input-too-large")
  );
});

test("a running timer is restored with deadline-adjusted time in a paused state", async () => {
  const source = snapshotFor("sv");
  source.game.timerSeconds = 299;
  source.game.timerRunning = true;
  source.game.timerDeadline = NOW + 65_000;
  source.game.discussionTimerSessions[3].public.remainingSeconds = 299;

  const restored = await handoff.decodeHandoffPayload(
    JSON.stringify(source),
    codecOptions()
  );

  assert.equal(restored.game.timerSeconds, 65);
  assert.equal(restored.game.timerRunning, false);
  assert.equal(restored.game.timerDeadline, null);
  assert.equal(restored.game.discussionTimerSessions[3].public.remainingSeconds, 65);
  assert.equal(restored.game.discussionTimerSessions[3].public.durationSeconds, 300);
});

test("night logs preserve supported synthetic and Lunatic wake identifiers", () => {
  const source = snapshotFor("bmr");
  source.game.nightLog[0].sourceId = "lunatic_action";
  const clean = handoff.sanitizeHandoffSnapshot(source, codecOptions());
  assert.equal(clean.game.nightLog[0].sourceId, "lunatic_action");

  source.game.nightLog[0].sourceId = "_minion_info";
  assert.equal(
    handoff.sanitizeHandoffSnapshot(source, codecOptions()).game.nightLog[0].sourceId,
    "_minion_info"
  );
});

test("takeover URLs discard old fragments and decode the encoded handoff fragment", async () => {
  const source = snapshotFor("bmr");
  const url = await handoff.buildTakeoverUrl(source, codecOptions({
    baseUrl: "https://example.test/grimoire?mode=host#old-fragment",
    compress: false
  }));

  assert.match(url, /^https:\/\/example\.test\/grimoire\?mode=host#handoff=/);
  assert.doesNotMatch(url, /old-fragment/);
  const restored = await handoff.decodeHandoffPayload(url, codecOptions());
  assert.equal(restored.scriptId, "bmr");
  assert.deepEqual(restored.game.names, source.game.names);
});

test("multipart links can arrive out of order and reject duplicate conflicts", async () => {
  const source = snapshotFor("tb");
  source.game.chronicle[0].details = "Long handoff detail ".repeat(80);
  const parts = await handoff.buildHandoffQrParts(source, codecOptions({
    baseUrl: "https://example.test/play",
    compress: false,
    maxPartBytes: 420,
    transferId: "test-transfer-01"
  }));

  assert.ok(parts.length > 1, "the fixture must be split across multiple links");
  assert.ok(parts.every(part => handoff.utf8ByteLength(part) <= 420));

  const collector = handoff.createMultipartCollector();
  let restored = null;
  const reversed = [...parts].reverse();
  for (let index = 0; index < reversed.length; index++) {
    restored = await handoff.decodeHandoffPayload(reversed[index], codecOptions({ collector }));
    if (index < reversed.length - 1) assert.equal(restored, null);
  }
  assert.equal(restored.scriptId, "tb");
  assert.equal(restored.game.chronicle[0].details, source.game.chronicle[0].details.trim());
  assert.equal(collector.getProgress(), null);

  const conflictCollector = handoff.createMultipartCollector();
  const firstToken = handoff.extractHandoffToken(parts[0]);
  conflictCollector.add(firstToken);
  const replacement = firstToken.endsWith("A") ? "B" : "A";
  const conflictingToken = firstToken.slice(0, -1) + replacement;
  assert.throws(
    () => conflictCollector.add(conflictingToken),
    error => assertCode(error, "conflicting-part")
  );
});

test("multipart collectors reject parts from a different transfer", async () => {
  const source = snapshotFor("sv");
  source.game.chronicle[0].details = "Transfer separation detail ".repeat(70);
  const options = codecOptions({
    baseUrl: "https://example.test/play",
    compress: false,
    maxPartBytes: 420
  });
  const first = await handoff.buildHandoffQrParts(source, {
    ...options,
    transferId: "transfer-set-one"
  });
  const second = await handoff.buildHandoffQrParts(source, {
    ...options,
    transferId: "transfer-set-two"
  });
  const collector = handoff.createMultipartCollector();

  collector.add(handoff.extractHandoffToken(first[0]));
  assert.throws(
    () => collector.add(handoff.extractHandoffToken(second[0])),
    error => assertCode(error, "mixed-transfer")
  );
});

test("takeover resets transient controls, pauses timers, and invokes the optional history hook", () => {
  let clearCount = 0;
  const current = {
    scriptId: "tb",
    localPreference: "preserved",
    drawerOpen: true,
    timerRunning: true,
    timerIntervalId: 42,
    timerDeadline: NOW + 5_000
  };
  const source = snapshotFor("sv");
  const next = handoff.createTakeoverState(current, source, codecOptions({
    clearHistory() { clearCount += 1; }
  }));

  assert.equal(clearCount, 1);
  assert.equal(next.scriptId, "sv");
  assert.equal(next.localPreference, "preserved");
  assert.equal(next.drawerOpen, false);
  assert.equal(next.timerRunning, false);
  assert.equal(next.timerIntervalId, null);
  assert.equal(next.timerDeadline, null);
  assert.equal(next.timerSessionDay, 3);
  assert.equal(next.handoffReturnScreen, null);
});

test("takeover restores BMR and SV role-dependent state instead of retaining local values", () => {
  const current = {
    scriptId: "tb",
    alignments: { 0: "good" },
    lunaticBelievedRoles: { 0: "shabaloth" },
    lunaticPoCharged: { 0: false },
    previousNightTargets: {},
    courtierEffect: null,
    gainedAbilities: {},
    vigormortisRetainedMinions: [],
    permanentlyPoisoned: {},
    fangGuJumpUsed: false
  };

  const bmr = handoff.createTakeoverState(
    current,
    dynamicSnapshotFor("bmr"),
    dynamicCodecOptions()
  );
  assert.deepEqual(bmr.lunaticBelievedRoles, { 0: "po" });
  assert.equal(bmr.lunaticPoCharged[0], true);
  assert.equal(bmr.alignments[4], "good");
  assert.deepEqual(bmr.previousNightTargets["1:exorcist"], {
    targetIndex: 4,
    nightNumber: 2
  });
  assert.deepEqual(bmr.courtierEffect, { characterId: "po", expiresAfterDay: 5 });

  const sv = handoff.createTakeoverState(
    current,
    dynamicSnapshotFor("sv"),
    dynamicCodecOptions()
  );
  assert.deepEqual(sv.gainedAbilities, { 0: "barber" });
  assert.deepEqual(sv.vigormortisRetainedMinions, [2]);
  assert.equal(sv.permanentlyPoisoned[2], true);
  assert.equal(sv.alignments[0], "evil");
  assert.equal(sv.alignments[4], "good");
  assert.equal(sv.fangGuJumpUsed, true);
});
