const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const STANDARD_TYPES = ["townsfolk", "outsider", "minion", "demon"];
const TYPE_COUNTS = {
  tb: { townsfolk: 13, outsider: 4, minion: 4, demon: 1 },
  bmr: { townsfolk: 13, outsider: 4, minion: 4, demon: 4 },
  sv: { townsfolk: 13, outsider: 4, minion: 4, demon: 4 }
};

function loadScriptData(fileName, globalName) {
  const source = fs.readFileSync(path.join(ROOT, "scripts", fileName), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__scriptData = ${globalName};`, context, {
    filename: `scripts/${fileName}`
  });
  return JSON.parse(JSON.stringify(context.__scriptData));
}

const scripts = {
  tb: loadScriptData("trouble_brewing.js", "TB"),
  bmr: loadScriptData("bad_moon_rising.js", "BMR"),
  sv: loadScriptData("sects_and_violets.js", "SV")
};

function assertNightOrderIntegrity(script, phaseName, nodes) {
  const seen = new Set();
  let previousOrder = -Infinity;

  for (const node of nodes) {
    assert.equal(typeof node.id, "string", `${script.id} ${phaseName} node has an id`);
    assert.ok(!seen.has(node.id), `${script.id} ${phaseName} repeats ${node.id}`);
    seen.add(node.id);

    assert.ok(Number.isInteger(node.order), `${script.id} ${phaseName} ${node.id} has an integer order`);
    assert.ok(node.order > previousOrder, `${script.id} ${phaseName} follows array order at ${node.id}`);
    previousOrder = node.order;

    const aliasMatch = node.id.match(/^(.+)_(?:info|action)$/);
    const referencesRole = Boolean(script.C[node.id]);
    const referencesSystemStep = node.id.startsWith("_");
    const referencesRoleAlias = Boolean(aliasMatch && script.C[aliasMatch[1]]);
    assert.ok(
      referencesRole || referencesSystemStep || referencesRoleAlias,
      `${script.id} ${phaseName} node ${node.id} references a known role or system step`
    );
  }
}

test("standard script data has internally consistent roles and distributions", () => {
  for (const script of Object.values(scripts)) {
    const roles = Object.entries(script.C);
    const ids = roles.map(([, role]) => role.id);
    assert.equal(new Set(ids).size, ids.length, `${script.id} character ids are unique`);

    for (const [key, role] of roles) {
      assert.equal(role.id, key, `${script.id} role key matches ${role.id}`);
      assert.ok(STANDARD_TYPES.includes(role.type), `${script.id} ${role.id} has a standard role type`);
      assert.ok(role.team === "good" || role.team === "evil", `${script.id} ${role.id} has a valid team`);
      assert.ok(role.name.trim(), `${script.id} ${role.id} has a display name`);
      assert.ok(role.ab.trim(), `${script.id} ${role.id} has ability text`);
    }

    for (const type of STANDARD_TYPES) {
      assert.equal(
        roles.filter(([, role]) => role.type === type).length,
        TYPE_COUNTS[script.id][type],
        `${script.id} has the expected ${type} count`
      );
    }

    for (const [playerCount, distribution] of Object.entries(script.DIST)) {
      const total = distribution.t + distribution.o + distribution.m + distribution.d;
      assert.equal(total, Number(playerCount), `${script.id} distribution totals ${playerCount} players`);
      for (const value of Object.values(distribution)) {
        assert.ok(Number.isInteger(value) && value >= 0, `${script.id} distribution counts are non-negative integers`);
      }
    }

    assertNightOrderIntegrity(script, "first night", script.FIRST_NIGHT);
    assertNightOrderIntegrity(script, "other night", script.OTHER_NIGHT);
  }
});

test("Trouble Brewing and Bad Moon Rising contain their complete official rosters", () => {
  const expected = {
    tb: {
      townsfolk: [
        "washerwoman", "librarian", "investigator", "chef", "empath", "fortuneteller",
        "undertaker", "monk", "ravenkeeper", "virgin", "slayer", "soldier", "mayor"
      ],
      outsider: ["butler", "drunk", "recluse", "saint"],
      minion: ["poisoner", "spy", "scarletwoman", "baron"],
      demon: ["imp"]
    },
    bmr: {
      townsfolk: [
        "grandmother", "sailor", "chambermaid", "exorcist", "innkeeper", "gambler",
        "gossip", "courtier", "professor", "minstrel", "tealady", "pacifist", "fool"
      ],
      outsider: ["tinker", "moonchild", "goon", "lunatic"],
      minion: ["godfather", "devilsadvocate", "assassin", "mastermind"],
      demon: ["zombuul", "pukka", "shabaloth", "po"]
    }
  };

  for (const [scriptId, expectedByType] of Object.entries(expected)) {
    for (const [type, expectedIds] of Object.entries(expectedByType)) {
      const actualIds = Object.values(scripts[scriptId].C)
        .filter(role => role.type === type)
        .map(role => role.id)
        .sort();
      assert.deepEqual(actualIds, [...expectedIds].sort(), `${scriptId} ${type} roster matches the official script`);
    }
  }
});

test("Trouble Brewing exposes the Baron's setup adjustment", () => {
  assert.deepEqual(
    scripts.tb.C.baron.setupModifier,
    { townsfolkDelta: -2, outsiderDelta: 2 }
  );
  assert.equal(
    scripts.tb.C.baron.setupModifier.townsfolkDelta + scripts.tb.C.baron.setupModifier.outsiderDelta,
    0
  );
});

test("Trouble Brewing follows the current official night order", () => {
  assert.deepEqual(scripts.tb.FIRST_NIGHT.map(node => node.id), [
    "_minioninfo", "_demoninfo", "poisoner", "washerwoman", "librarian",
    "investigator", "chef", "empath", "fortuneteller", "butler", "spy"
  ]);
  assert.deepEqual(scripts.tb.OTHER_NIGHT.map(node => node.id), [
    "poisoner", "monk", "imp", "ravenkeeper", "empath", "fortuneteller",
    "undertaker", "butler", "spy"
  ]);
});

test("current Exorcist and Sects & Violets Traveller text is retained", () => {
  assert.match(scripts.bmr.C.exorcist.ab, /doesn't wake tonight/);
  assert.doesNotMatch(scripts.bmr.C.exorcist.ab, /doesn't attack/);
  assert.match(scripts.sv.TRAVELLERS.barista.ab, /They learn which\.$/);
  assert.match(scripts.sv.TRAVELLERS.harlot.ab, /learn their character/);
  assert.match(scripts.sv.TRAVELLERS.butcher.ab, /after the 1st execution/);
  assert.match(scripts.sv.TRAVELLERS.deviant.ab, /cannot die by exile/);
});

test("Sects & Violets contains the official 13/4/4/4 roster", () => {
  const expectedByType = {
    townsfolk: [
      "clockmaker", "dreamer", "snakecharmer", "mathematician", "flowergirl",
      "towncrier", "oracle", "savant", "seamstress", "philosopher", "artist",
      "juggler", "sage"
    ],
    outsider: ["mutant", "sweetheart", "barber", "klutz"],
    minion: ["eviltwin", "witch", "cerenovus", "pithag"],
    demon: ["fanggu", "vigormortis", "nodashi", "vortox"]
  };

  for (const [type, expectedIds] of Object.entries(expectedByType)) {
    const actualIds = Object.values(scripts.sv.C)
      .filter(role => role.type === type)
      .map(role => role.id)
      .sort();
    assert.deepEqual(actualIds, [...expectedIds].sort(), `S&V ${type} roster matches the official script`);
  }

  assert.equal(scripts.sv.C.pixie, undefined, "Pixie is not part of Sects & Violets");
});

test("Sects & Violets uses a canonical, contiguous night sequence", () => {
  const expectedFirstNight = [
    "philosopher", "_minioninfo", "_demoninfo", "snakecharmer", "eviltwin",
    "witch", "cerenovus", "clockmaker", "dreamer", "seamstress", "mathematician"
  ];
  const expectedOtherNight = [
    "philosopher", "snakecharmer", "witch", "cerenovus", "pithag", "fanggu",
    "nodashi", "vortox", "vigormortis", "barber", "sweetheart", "sage",
    "dreamer", "flowergirl", "towncrier", "oracle", "seamstress", "juggler",
    "mathematician"
  ];

  assert.deepEqual(scripts.sv.FIRST_NIGHT.map(node => node.id), expectedFirstNight);
  assert.deepEqual(scripts.sv.OTHER_NIGHT.map(node => node.id), expectedOtherNight);

  for (const nodes of [scripts.sv.FIRST_NIGHT, scripts.sv.OTHER_NIGHT]) {
    assert.deepEqual(nodes.map(node => node.order), nodes.map((_, index) => index + 1));
  }
});

test("Sects & Violets setup modifiers are explicit and conserve player count", () => {
  const expectedModifiers = {
    fanggu: { townsfolkDelta: -1, outsiderDelta: 1 },
    vigormortis: { townsfolkDelta: 1, outsiderDelta: -1 }
  };

  for (const [roleId, expected] of Object.entries(expectedModifiers)) {
    const modifier = scripts.sv.C[roleId].setupModifier;
    assert.deepEqual(modifier, expected, `${roleId} exposes its setup adjustment`);
    assert.ok(Number.isInteger(modifier.townsfolkDelta));
    assert.ok(Number.isInteger(modifier.outsiderDelta));
    assert.equal(modifier.townsfolkDelta + modifier.outsiderDelta, 0, `${roleId} preserves the player total`);
  }

  const unexpectedModifiers = Object.values(scripts.sv.C)
    .filter(role => role.setupModifier && !expectedModifiers[role.id]);
  assert.deepEqual(unexpectedModifiers, []);
});
