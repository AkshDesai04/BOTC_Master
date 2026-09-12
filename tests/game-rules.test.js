const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const {
  ACTION_SPECS,
  expandWakeList,
  getActionSpec,
  isCharacterChoiceEligible,
  isTargetEligible,
  isTimerEligibleScript,
  validateSetup
} = require("../scripts/game-rules.js");

function scriptFixture(id) {
  return {
    id,
    C: {
      [`${id}-town-1`]: { id: `${id}-town-1`, name: "Town One", type: "townsfolk" },
      [`${id}-town-2`]: { id: `${id}-town-2`, name: "Town Two", type: "townsfolk" },
      [`${id}-town-3`]: { id: `${id}-town-3`, name: "Town Three", type: "townsfolk" },
      [`${id}-minion`]: { id: `${id}-minion`, name: "Minion", type: "minion" },
      [`${id}-demon`]: { id: `${id}-demon`, name: "Demon", type: "demon" }
    },
    DIST: { 5: { t: 3, o: 0, m: 1, d: 1 } }
  };
}

function validSetup(id) {
  const script = scriptFixture(id);
  const roles = [
    `${id}-town-1`,
    `${id}-town-2`,
    `${id}-town-3`,
    `${id}-minion`,
    `${id}-demon`
  ];
  return {
    script,
    playerCount: 5,
    names: ["Ada", "Ben", "Cy", "Dee", "Eli"],
    assignments: Object.fromEntries(roles.map((roleId, seat) => [seat, roleId])),
    rolePool: [...roles]
  };
}

function codes(result) {
  return result.errors.map(error => error.code);
}

test("only the three Clocktower scripts are timer eligible", () => {
  assert.equal(isTimerEligibleScript("tb"), true);
  assert.equal(isTimerEligibleScript("BMR"), true);
  assert.equal(isTimerEligibleScript("sv"), true);
  assert.equal(isTimerEligibleScript("uw"), false);
  assert.equal(isTimerEligibleScript(""), false);
  assert.equal(isTimerEligibleScript(null), false);
});

test("loads as a browser script without CommonJS globals", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "game-rules.js"), "utf8");
  const context = {};
  vm.runInNewContext(source, context);
  assert.equal(typeof context.BOTCGameRules.validateSetup, "function");
  assert.equal(context.BOTCGameRules.isTimerEligibleScript("tb"), true);
});

test("strict setup validation accepts coherent TB, BMR, and SV rosters", () => {
  for (const scriptId of ["tb", "bmr", "sv"]) {
    const setup = validSetup(scriptId);
    const result = validateSetup(setup);
    assert.equal(result.valid, true, `${scriptId}: ${JSON.stringify(result.errors)}`);
    assert.deepEqual(result.actualDistribution, { t: 3, o: 0, m: 1, d: 1 });
  }
});

test("strict setup validation reports roster, seat, role, pool, and distribution faults", () => {
  const setup = validSetup("tb");
  setup.names = ["Ada", " ada ", "", "Dee"];
  setup.assignments = {
    0: "tb-town-1",
    1: "tb-town-1",
    2: "missing-role",
    3: "tb-minion",
    7: "tb-demon"
  };
  setup.rolePool = ["tb-town-1", "tb-town-1", "tb-minion", "tb-demon", "unknown-pool-role"];

  const result = validateSetup(setup);
  const errorCodes = codes(result);
  assert.equal(result.valid, false);
  assert.ok(errorCodes.includes("seat-count-mismatch"));
  assert.ok(errorCodes.includes("duplicate-player-name"));
  assert.ok(errorCodes.includes("empty-player-name"));
  assert.ok(errorCodes.includes("invalid-seat"));
  assert.ok(errorCodes.includes("missing-assignment"));
  assert.ok(errorCodes.includes("unknown-role"));
  assert.ok(errorCodes.includes("unknown-pool-role"));
  assert.ok(errorCodes.includes("duplicate-unique-role"));
  assert.ok(errorCodes.includes("duplicate-pool-role"));
  assert.ok(errorCodes.includes("pool-assignment-mismatch"));
  assert.ok(errorCodes.includes("distribution-mismatch"));
});

test("setup validation honors explicit quantities and effective distributions", () => {
  const script = {
    C: {
      twin: { id: "twin", name: "Twin", type: "townsfolk", quantity: 2 },
      outsider: { id: "outsider", name: "Outsider", type: "outsider" },
      minion: { id: "minion", name: "Minion", type: "minion" },
      demon: { id: "demon", name: "Demon", type: "demon" }
    },
    DIST: {}
  };
  const result = validateSetup({
    script,
    playerCount: 5,
    names: ["A", "B", "C", "D", "E"],
    assignments: { 0: "twin", 1: "twin", 2: "outsider", 3: "minion", 4: "demon" },
    rolePool: ["twin", "twin", "outsider", "minion", "demon"],
    distribution: { t: 2, o: 1, m: 1, d: 1 }
  });
  assert.equal(result.valid, true);
});

test("large standard rosters can use a repeated character when explicitly enabled", () => {
  const townsfolk = Object.fromEntries(Array.from({ length: 13 }, (_, index) => [
    `town-${index}`,
    { id: `town-${index}`, name: `Town ${index}`, type: "townsfolk" }
  ]));
  const script = {
    C: {
      ...townsfolk,
      minion: { id: "minion", name: "Minion", type: "minion" },
      minionTwo: { id: "minionTwo", name: "Minion Two", type: "minion" },
      minionThree: { id: "minionThree", name: "Minion Three", type: "minion" },
      minionFour: { id: "minionFour", name: "Minion Four", type: "minion" },
      demon: { id: "demon", name: "Demon", type: "demon" }
    },
    DIST: { 19: { t: 13, o: 0, m: 5, d: 1 } }
  };
  const roles = [...Object.keys(townsfolk), "minion", "minion", "minionTwo", "minionThree", "minionFour", "demon"];
  const setup = {
    script,
    playerCount: 19,
    names: Array.from({ length: 19 }, (_, index) => `Player ${index + 1}`),
    assignments: Object.fromEntries(roles.map((roleId, seat) => [seat, roleId])),
    rolePool: roles
  };
  assert.equal(validateSetup(setup).valid, false);
  assert.equal(validateSetup({ ...setup, allowAdditionalMinionCopy: true }).valid, true);
});

test("wake expansion resolves a demon placeholder and filters dead characters", () => {
  const characters = {
    sailor: { id: "sailor", type: "townsfolk" },
    zombuul: { id: "zombuul", type: "demon" },
    pukka: { id: "pukka", type: "demon" }
  };
  const result = expandWakeList({
    scriptId: "bmr",
    nightOrder: [{ id: "sailor", order: 1 }, { id: "_demon", order: 2 }],
    characters,
    assignments: { 0: "sailor", 1: "zombuul", 2: "pukka" },
    alive: { 0: false, 1: true, 2: false },
    playerCount: 3
  });

  assert.deepEqual(result.map(node => [node.id, node.sourceId, node.playerIndex]), [
    ["zombuul", "_demon", 1]
  ]);
});

test("BMR Lunatic aliases expand to the living Lunatic seat", () => {
  const order = [{ id: "lunatic_info" }, { id: "lunatic_action" }, { id: "lunatic" }];
  const living = expandWakeList({
    script: { id: "BMR", C: { lunatic: { id: "lunatic", type: "outsider" } } },
    nightOrder: order,
    assignments: { 4: "lunatic" },
    alive: { 4: true },
    playerCount: 7
  });
  assert.deepEqual(living.map(node => [node.id, node.sourceId, node.isAlias]), [
    ["lunatic", "lunatic_info", true],
    ["lunatic", "lunatic_action", true],
    ["lunatic", "lunatic", false]
  ]);

  const dead = expandWakeList({
    scriptId: "bmr",
    nightOrder: order,
    characters: { lunatic: { id: "lunatic", type: "outsider" } },
    assignments: { 4: "lunatic" },
    alive: { 4: false },
    playerCount: 7
  });
  assert.deepEqual(dead, []);
});

test("synthetic reminders require relevant living roles and respect Teensyville", () => {
  const characters = {
    minstrel: { id: "minstrel", type: "townsfolk" },
    goon: { id: "goon", type: "outsider" },
    lunatic: { id: "lunatic", type: "outsider" },
    minion: { id: "minion", type: "minion" },
    demon: { id: "demon", type: "demon" }
  };
  const order = [
    { id: "_minioninfo" },
    { id: "_demoninfo" },
    { id: "_minstrel" },
    { id: "_goon" },
    { id: "_lunatic_identity" },
    { id: "_grandmother" }
  ];
  const assignments = { 0: "minstrel", 1: "goon", 2: "minion", 3: "demon", 4: "lunatic" };
  const alive = { 0: true, 1: false, 2: true, 3: true, 4: true };

  const standard = expandWakeList({ nightOrder: order, characters, assignments, alive, playerCount: 7 });
  assert.deepEqual(standard.map(node => node.id), ["_minioninfo", "_demoninfo", "_minstrel"]);
  assert.ok(standard.every(node => node.isSynthetic));

  const teensyville = expandWakeList({ nightOrder: order, characters, assignments, alive, playerCount: 5 });
  assert.deepEqual(teensyville.map(node => node.id), ["_minstrel", "_lunatic_identity"]);
});

test("TB action specs describe target counts and eligibility", () => {
  const fortuneTeller = getActionSpec("tb", "fortuneteller");
  assert.equal(fortuneTeller.minTargets, 2);
  assert.equal(fortuneTeller.maxTargets, 2);
  assert.equal(fortuneTeller.manualResolution, true);

  const monk = getActionSpec("tb", "monk");
  assert.equal(monk.targetEligibility.self, false);
  assert.equal(monk.targetEligibility.alive, true);
  assert.equal(monk.targetEligibility.dead, true);
  assert.equal(isTargetEligible(monk, { actorIndex: 1, targetIndex: 1, alive: { 1: true } }), false);
  assert.equal(isTargetEligible(monk, { actorIndex: 1, targetIndex: 2, alive: { 2: false } }), true);

  const spy = getActionSpec("tb", "spy");
  assert.deepEqual([spy.minTargets, spy.maxTargets, spy.manualResolution], [0, 0, true]);

  const librarian = getActionSpec("tb", "librarian");
  assert.deepEqual(librarian.allowedTargetCounts, [0, 2]);
  assert.equal(librarian.optional, true);
});

test("BMR action specs distinguish phase variants and complex choices", () => {
  const firstGodfather = getActionSpec("bmr", "godfather", { firstNight: true });
  const laterGodfather = getActionSpec("bmr", "godfather", { firstNight: false });
  assert.deepEqual([firstGodfather.minTargets, firstGodfather.maxTargets], [0, 0]);
  assert.deepEqual([laterGodfather.minTargets, laterGodfather.maxTargets, laterGodfather.optional], [1, 1, true]);

  const chambermaid = getActionSpec("bmr", "chambermaid");
  assert.deepEqual(chambermaid.targetEligibility, { self: false, alive: true, dead: false });
  assert.deepEqual([chambermaid.minTargets, chambermaid.maxTargets], [2, 2]);
  assert.equal(chambermaid.playerChoosesTargets, true);

  const professor = getActionSpec("bmr", "professor");
  assert.deepEqual(professor.targetEligibility, { self: false, alive: false, dead: true });
  assert.deepEqual([professor.minTargets, professor.maxTargets], [1, 1]);
  assert.equal(professor.optional, true);
  assert.equal(professor.oncePerGame, true);

  const gambler = getActionSpec("bmr", "gambler");
  assert.equal(gambler.requiresCharacterChoice, true);
  assert.equal(gambler.playerChoosesTargets, true);

  const assassin = getActionSpec("bmr", "assassin");
  assert.deepEqual([assassin.minTargets, assassin.maxTargets, assassin.optional], [1, 1, true]);
  assert.equal(assassin.manualResolution, true);
  assert.equal(assassin.oncePerGame, true);
  assert.equal(getActionSpec("bmr", "courtier").oncePerGame, true);

  const po = getActionSpec("bmr", "po");
  assert.deepEqual([po.minTargets, po.maxTargets, po.optional], [0, 1, true]);
  assert.deepEqual(po.allowedTargetCounts, [0, 1]);
  assert.equal(po.playerChoosesTargets, true);
  assert.equal(getActionSpec("bmr", "gossip").playerChoosesTargets, false);
  assert.equal(getActionSpec("bmr", "grandmother").playerChoosesTargets, false);
  assert.equal(getActionSpec("bmr", "moonchild").playerChoosesTargets, false);
});

test("SV action specs expose character choices and manual resolution", () => {
  const cerenovus = getActionSpec("sv", "cerenovus");
  assert.deepEqual([cerenovus.minTargets, cerenovus.maxTargets], [1, 1]);
  assert.equal(cerenovus.requiresCharacterChoice, true);
  assert.equal(cerenovus.manualResolution, true);

  const philosopher = getActionSpec("sv", "philosopher");
  assert.equal(philosopher.optional, true);
  assert.equal(philosopher.requiresCharacterChoice, true);
  assert.equal(philosopher.oncePerGame, true);

  const seamstress = getActionSpec("sv", "seamstress");
  assert.deepEqual([seamstress.minTargets, seamstress.maxTargets], [2, 2]);
  assert.equal(seamstress.targetEligibility.self, false);
  assert.equal(seamstress.oncePerGame, true);
  assert.equal(getActionSpec("sv", "pixie"), null);

  const sage = getActionSpec("sv", "sage");
  assert.deepEqual([sage.minTargets, sage.maxTargets], [2, 2]);

  const barber = getActionSpec("sv", "barber");
  assert.deepEqual([barber.minTargets, barber.maxTargets, barber.optional], [2, 2, true]);
  assert.equal(barber.targetEligibility.self, true);
  assert.deepEqual(barber.excludedOtherTargetTypes, ["demon"]);
  assert.equal(getActionSpec("sv", "not-a-role"), null);
  assert.equal(getActionSpec("uw", "werewolf"), null);
});

test("character-choice restrictions allow only legal character options", () => {
  const goodTownsfolk = { id: "dreamer", type: "townsfolk" };
  const goodOutsider = { id: "mutant", type: "outsider" };
  const evilMinion = { id: "witch", type: "minion" };

  for (const roleId of ["philosopher", "cerenovus"]) {
    const spec = getActionSpec("sv", roleId);
    assert.equal(isCharacterChoiceEligible(spec, { character: goodTownsfolk }), true, roleId);
    assert.equal(isCharacterChoiceEligible(spec, { character: goodOutsider }), true, roleId);
    assert.equal(isCharacterChoiceEligible(spec, { character: evilMinion }), false, roleId);
  }

  const pitHag = getActionSpec("sv", "pithag");
  assert.equal(isCharacterChoiceEligible(pitHag, {
    character: goodTownsfolk,
    inPlayRoleIds: ["dreamer", "witch", "vortox"]
  }), false);
  assert.equal(isCharacterChoiceEligible(pitHag, {
    character: { id: "clockmaker", type: "townsfolk" },
    inPlayRoleIds: ["dreamer", "witch", "vortox"]
  }), true);
});

test("team and Barber restrictions are enforced for player targets", () => {
  const grandmother = getActionSpec("bmr", "grandmother");
  assert.equal(isTargetEligible(grandmother, {
    actorIndex: 0,
    targetIndex: 1,
    alive: { 1: true },
    targetRole: { team: "good", type: "townsfolk" }
  }), true);
  assert.equal(isTargetEligible(grandmother, {
    actorIndex: 0,
    targetIndex: 1,
    alive: { 1: true },
    targetRole: { team: "evil", type: "minion" }
  }), false);

  const barber = getActionSpec("sv", "barber");
  assert.equal(isTargetEligible(barber, {
    actorIndex: 2,
    targetIndex: 2,
    alive: { 2: true },
    targetRole: { team: "evil", type: "demon" }
  }), true);
  assert.equal(isTargetEligible(barber, {
    actorIndex: 2,
    targetIndex: 3,
    alive: { 3: true },
    targetRole: { team: "evil", type: "demon" }
  }), false);
});

test("action specification tables are immutable", () => {
  assert.equal(Object.isFrozen(ACTION_SPECS), true);
  assert.equal(Object.isFrozen(ACTION_SPECS.tb), true);
  assert.equal(Object.isFrozen(ACTION_SPECS.tb.monk.targetEligibility), true);
});
