(function attachGameRules(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BOTCGameRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameRules() {
  "use strict";

  const TIMER_SCRIPT_IDS = Object.freeze(["tb", "bmr", "sv"]);
  const TYPE_KEYS = Object.freeze({
    townsfolk: "t",
    outsider: "o",
    minion: "m",
    demon: "d"
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function isTimerEligibleScript(scriptId) {
    return TIMER_SCRIPT_IDS.includes(String(scriptId ?? "").toLowerCase());
  }

  function normalizeDistribution(distribution) {
    if (!distribution || typeof distribution !== "object") return null;
    const normalized = {};
    for (const key of Object.values(TYPE_KEYS)) {
      const raw = distribution[key];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) return null;
      normalized[key] = value;
    }
    return normalized;
  }

  function roleLimit(role) {
    if (role?.unique === false) return Number.POSITIVE_INFINITY;
    const quantity = Number(role?.quantity);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  }

  function countValues(values) {
    const counts = new Map();
    values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
    return counts;
  }

  function sameCounts(left, right) {
    if (left.size !== right.size) return false;
    for (const [key, value] of left) {
      if (right.get(key) !== value) return false;
    }
    return true;
  }

  function validateSetup(options = {}) {
    const script = options.script;
    const characters = script?.C ?? options.characters;
    const playerCount = Number(options.playerCount);
    const names = options.names;
    const assignments = options.assignments;
    const rolePool = options.rolePool;
    const errors = [];
    const addError = (code, message, details = {}) => errors.push({ code, message, ...details });

    if (!Number.isInteger(playerCount) || playerCount < 1) {
      addError("invalid-player-count", "Player count must be a positive integer.");
    }
    if (!characters || typeof characters !== "object") {
      addError("missing-character-data", "Character data is required.");
    }

    if (!Array.isArray(names) || names.length !== playerCount) {
      addError("seat-count-mismatch", "The roster must contain exactly one name for every seat.", {
        expected: playerCount,
        actual: Array.isArray(names) ? names.length : 0
      });
    }

    const seenNames = new Map();
    if (Array.isArray(names)) {
      for (let seat = 0; seat < Math.max(0, playerCount); seat++) {
        const name = typeof names[seat] === "string" ? names[seat].trim() : "";
        if (!name) {
          addError("empty-player-name", `Seat ${seat + 1} needs a player name.`, { seat });
          continue;
        }
        const normalizedName = name.normalize("NFKC").toLowerCase();
        if (seenNames.has(normalizedName)) {
          addError("duplicate-player-name", `Player names must be unique: ${name}.`, {
            seat,
            firstSeat: seenNames.get(normalizedName)
          });
        } else {
          seenNames.set(normalizedName, seat);
        }
      }
    }

    const assignmentObject = assignments && typeof assignments === "object" ? assignments : {};
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) {
      addError("invalid-assignments", "Assignments must be keyed by seat number.");
    }
    const assignmentKeys = Object.keys(assignmentObject);
    assignmentKeys.forEach(key => {
      const seat = Number(key);
      if (!Number.isInteger(seat) || String(seat) !== key || seat < 0 || seat >= playerCount) {
        addError("invalid-seat", `Assignment seat ${key} is outside the roster.`, { seat: key });
      }
    });

    const assignedRoleIds = [];
    for (let seat = 0; seat < Math.max(0, playerCount); seat++) {
      if (!Object.prototype.hasOwnProperty.call(assignmentObject, seat)) {
        addError("missing-assignment", `Seat ${seat + 1} needs a character.`, { seat });
        continue;
      }
      const roleId = assignmentObject[seat];
      if (typeof roleId !== "string" || !roleId) {
        addError("missing-assignment", `Seat ${seat + 1} needs a character.`, { seat });
        continue;
      }
      assignedRoleIds.push(roleId);
      if (!characters?.[roleId]) {
        addError("unknown-role", `Seat ${seat + 1} has an unknown character: ${roleId}.`, { seat, roleId });
      }
    }

    if (!Array.isArray(rolePool)) {
      addError("invalid-role-pool", "The role pool must be an array.");
    } else {
      if (rolePool.length !== playerCount) {
        addError("pool-size-mismatch", "The role pool must contain exactly one character per seat.", {
          expected: playerCount,
          actual: rolePool.length
        });
      }
      rolePool.forEach((roleId, poolIndex) => {
        if (typeof roleId !== "string" || !characters?.[roleId]) {
          addError("unknown-pool-role", `The role pool contains an unknown character: ${String(roleId)}.`, {
            poolIndex,
            roleId
          });
        }
      });
    }

    const assignmentCounts = countValues(assignedRoleIds);
    const poolCounts = countValues(Array.isArray(rolePool) ? rolePool : []);
    const maximumRoleUses = role => options.allowDuplicateRoles === true ? Number.POSITIVE_INFINITY : roleLimit(role);
    for (const [roleId, count] of assignmentCounts) {
      const role = characters?.[roleId];
      if (role && count > maximumRoleUses(role)) {
        addError("duplicate-unique-role", `${role.name ?? roleId} is assigned more than once.`, {
          roleId,
          count
        });
      }
    }
    for (const [roleId, count] of poolCounts) {
      const role = characters?.[roleId];
      if (role && count > maximumRoleUses(role)) {
        addError("duplicate-pool-role", `${role.name ?? roleId} appears too many times in the role pool.`, {
          roleId,
          count
        });
      }
    }
    if (Array.isArray(rolePool) && !sameCounts(assignmentCounts, poolCounts)) {
      addError("pool-assignment-mismatch", "Assignments must use exactly the characters in the role pool.");
    }

    const distributionSource = options.distribution ?? script?.DIST?.[playerCount];
    const expectedDistribution = normalizeDistribution(distributionSource);
    const actualDistribution = { t: 0, o: 0, m: 0, d: 0 };
    assignedRoleIds.forEach(roleId => {
      const typeKey = TYPE_KEYS[characters?.[roleId]?.type];
      if (typeKey) actualDistribution[typeKey]++;
    });
    if (!expectedDistribution) {
      addError("missing-distribution", `No valid distribution is defined for ${playerCount} players.`);
    } else {
      Object.keys(actualDistribution).forEach(typeKey => {
        if (actualDistribution[typeKey] !== expectedDistribution[typeKey]) {
          addError("distribution-mismatch", `Character type ${typeKey} must total ${expectedDistribution[typeKey]}.`, {
            type: typeKey,
            expected: expectedDistribution[typeKey],
            actual: actualDistribution[typeKey]
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      expectedDistribution,
      actualDistribution
    };
  }

  const BMR_WAKE_ALIASES = Object.freeze({
    lunatic_info: "lunatic",
    lunatic_action: "lunatic"
  });

  const SYNTHETIC_REQUIREMENTS = Object.freeze({
    _minioninfo: { type: "minion", minimumPlayers: 7 },
    _demoninfo: { type: "demon", minimumPlayers: 7 },
    _lunatic_identity: { roleId: "lunatic", maximumPlayers: 6 },
    _minstrel: { roleId: "minstrel" },
    _goon: { roleId: "goon" },
    _grandmother: { roleId: "grandmother" }
  });

  function orderedAssignments(assignments) {
    if (!assignments || typeof assignments !== "object") return [];
    return Object.entries(assignments)
      .map(([seat, roleId]) => ({ seat: Number(seat), roleId }))
      .filter(entry => Number.isInteger(entry.seat) && typeof entry.roleId === "string")
      .sort((left, right) => left.seat - right.seat);
  }

  function isLiving(alive, seat) {
    return alive?.[seat] !== false;
  }

  function syntheticReminderIsRelevant(nodeId, context) {
    const requirement = SYNTHETIC_REQUIREMENTS[nodeId];
    const playerCount = Number.isInteger(Number(context.playerCount))
      ? Number(context.playerCount)
      : context.assignmentEntries.length;
    if (requirement?.minimumPlayers && playerCount < requirement.minimumPlayers) return false;
    if (requirement?.maximumPlayers && playerCount > requirement.maximumPlayers) return false;

    if (requirement?.type) {
      return context.assignmentEntries.some(({ seat, roleId }) =>
        isLiving(context.alive, seat) && context.characters?.[roleId]?.type === requirement.type
      );
    }
    const requiredRoleId = requirement?.roleId ?? nodeId.slice(1);
    return context.assignmentEntries.some(({ seat, roleId }) =>
      isLiving(context.alive, seat) && roleId === requiredRoleId
    );
  }

  function expandWakeList(options = {}) {
    const nightOrder = Array.isArray(options.nightOrder) ? options.nightOrder : [];
    const characters = options.characters ?? options.script?.C ?? {};
    const scriptId = String(options.scriptId ?? options.script?.id ?? "").toLowerCase();
    const assignmentEntries = orderedAssignments(options.assignments);
    const context = {
      alive: options.alive ?? {},
      assignmentEntries,
      characters,
      playerCount: options.playerCount
    };
    const expanded = [];

    nightOrder.forEach(node => {
      if (!node || typeof node.id !== "string") return;
      const sourceId = node.id;

      if (scriptId === "bmr" && sourceId === "lunatic_info" && Number(context.playerCount) < 7) return;

      if (sourceId === "_demon") {
        assignmentEntries.forEach(({ seat, roleId }) => {
          if (isLiving(context.alive, seat) && characters[roleId]?.type === "demon") {
            expanded.push({ ...node, id: roleId, sourceId, playerIndex: seat, isSynthetic: false });
          }
        });
        return;
      }

      if (sourceId.startsWith("_")) {
        if (syntheticReminderIsRelevant(sourceId, context)) {
          expanded.push({ ...node, sourceId, playerIndex: null, isSynthetic: true });
        }
        return;
      }

      const roleId = scriptId === "bmr" ? (BMR_WAKE_ALIASES[sourceId] ?? sourceId) : sourceId;
      assignmentEntries.forEach(({ seat, roleId: assignedRoleId }) => {
        if (assignedRoleId === roleId && isLiving(context.alive, seat)) {
          expanded.push({
            ...node,
            id: roleId,
            sourceId,
            playerIndex: seat,
            isAlias: sourceId !== roleId,
            isSynthetic: false
          });
        }
      });
    });

    return expanded;
  }

  function actionSpec(minTargets, maxTargets, options = {}) {
    const hasTargets = maxTargets > 0;
    return {
      minTargets,
      maxTargets,
      targetEligibility: {
        self: hasTargets && options.self !== false,
        alive: hasTargets && options.alive !== false,
        dead: hasTargets && options.dead !== false
      },
      optional: options.optional === true,
      allowedTargetCounts: Array.isArray(options.allowedTargetCounts)
        ? [...new Set(options.allowedTargetCounts.map(Number).filter(Number.isInteger))]
        : null,
      requiresCharacterChoice: options.requiresCharacterChoice === true,
      allowedCharacterTypes: Array.isArray(options.allowedCharacterTypes) ? [...options.allowedCharacterTypes] : null,
      excludeInPlayCharacter: options.excludeInPlayCharacter === true,
      targetTeams: Array.isArray(options.targetTeams) ? [...options.targetTeams] : null,
      excludedOtherTargetTypes: Array.isArray(options.excludedOtherTargetTypes) ? [...options.excludedOtherTargetTypes] : null,
      playerChoosesTargets: options.playerChoosesTargets === true,
      manualResolution: options.manualResolution === true,
      oncePerGame: options.oncePerGame === true
    };
  }

  const NONE = actionSpec(0, 0, { manualResolution: true });
  const ONE_ANY = actionSpec(1, 1);
  const ACTION_SPECS = deepFreeze({
    tb: {
      _minioninfo: NONE,
      _demoninfo: NONE,
      poisoner: ONE_ANY,
      spy: NONE,
      washerwoman: actionSpec(2, 2, { manualResolution: true }),
      librarian: actionSpec(0, 2, { optional: true, allowedTargetCounts: [0, 2], manualResolution: true }),
      investigator: actionSpec(2, 2, { manualResolution: true }),
      chef: NONE,
      empath: NONE,
      fortuneteller: actionSpec(2, 2, { manualResolution: true }),
      undertaker: actionSpec(0, 0, { optional: true, manualResolution: true }),
      monk: actionSpec(1, 1, { self: false }),
      ravenkeeper: actionSpec(1, 1, { manualResolution: true }),
      scarletwoman: actionSpec(0, 0, { optional: true, manualResolution: true }),
      butler: actionSpec(1, 1, { self: false }),
      imp: ONE_ANY
    },
    bmr: {
      _minioninfo: NONE,
      _demoninfo: NONE,
      _minstrel: NONE,
      _goon: NONE,
      _grandmother: NONE,
      lunatic_info: NONE,
      lunatic_action: actionSpec(0, 0, { optional: true, manualResolution: true }),
      lunatic: actionSpec(0, 0, { optional: true, manualResolution: true }),
      sailor: actionSpec(1, 1, { dead: false, playerChoosesTargets: true, manualResolution: true }),
      chambermaid: actionSpec(2, 2, { self: false, dead: false, playerChoosesTargets: true, manualResolution: true }),
      exorcist: actionSpec(1, 1, { playerChoosesTargets: true, manualResolution: true }),
      innkeeper: actionSpec(2, 2, { playerChoosesTargets: true, manualResolution: true }),
      gambler: actionSpec(1, 1, { requiresCharacterChoice: true, playerChoosesTargets: true, manualResolution: true }),
      gossip: actionSpec(1, 1, { optional: true, manualResolution: true }),
      courtier: actionSpec(0, 0, { optional: true, requiresCharacterChoice: true, manualResolution: true, oncePerGame: true }),
      professor: actionSpec(1, 1, { self: false, alive: false, optional: true, playerChoosesTargets: true, manualResolution: true, oncePerGame: true }),
      tinker: actionSpec(0, 0, { optional: true, manualResolution: true }),
      moonchild: actionSpec(1, 1, { self: false, alive: true, dead: false, manualResolution: true }),
      grandmother: actionSpec(1, 1, { self: false, dead: false, targetTeams: ["good"], manualResolution: true }),
      godfather: {
        firstNight: NONE,
        otherNight: actionSpec(1, 1, { optional: true, playerChoosesTargets: true, manualResolution: true })
      },
      devilsadvocate: actionSpec(1, 1, { dead: false, playerChoosesTargets: true, manualResolution: true }),
      assassin: actionSpec(1, 1, { optional: true, playerChoosesTargets: true, manualResolution: true, oncePerGame: true }),
      zombuul: actionSpec(1, 1, { optional: true, playerChoosesTargets: true, manualResolution: true }),
      pukka: actionSpec(1, 1, { playerChoosesTargets: true, manualResolution: true }),
      shabaloth: actionSpec(2, 2, { playerChoosesTargets: true, manualResolution: true }),
      po: actionSpec(0, 1, { optional: true, allowedTargetCounts: [0, 1], playerChoosesTargets: true, manualResolution: true })
    },
    sv: {
      _minioninfo: NONE,
      _demoninfo: NONE,
      eviltwin: actionSpec(1, 1, { self: false, dead: false, targetTeams: ["good"], manualResolution: true }),
      clockmaker: NONE,
      snakecharmer: actionSpec(1, 1, { dead: false, manualResolution: true }),
      philosopher: actionSpec(0, 0, { optional: true, requiresCharacterChoice: true, allowedCharacterTypes: ["townsfolk", "outsider"], manualResolution: true, oncePerGame: true }),
      seamstress: actionSpec(2, 2, { self: false, optional: true, manualResolution: true, oncePerGame: true }),
      cerenovus: actionSpec(1, 1, { requiresCharacterChoice: true, allowedCharacterTypes: ["townsfolk", "outsider"], manualResolution: true }),
      witch: actionSpec(1, 1, { manualResolution: true }),
      dreamer: actionSpec(1, 1, { self: false, manualResolution: true }),
      mathematician: NONE,
      pithag: actionSpec(1, 1, { requiresCharacterChoice: true, excludeInPlayCharacter: true, manualResolution: true }),
      barber: actionSpec(2, 2, { optional: true, excludedOtherTargetTypes: ["demon"], manualResolution: true }),
      sweetheart: actionSpec(0, 0, { optional: true, manualResolution: true }),
      sage: actionSpec(2, 2, { manualResolution: true }),
      flowergirl: NONE,
      towncrier: NONE,
      oracle: NONE,
      juggler: actionSpec(0, 0, { optional: true, manualResolution: true }),
      fanggu: actionSpec(1, 1, { manualResolution: true }),
      vigormortis: actionSpec(1, 1, { manualResolution: true }),
      nodashi: actionSpec(1, 1, { manualResolution: true }),
      vortox: actionSpec(1, 1, { manualResolution: true })
    }
  });

  function getActionSpec(scriptId, actionId, options = {}) {
    const scriptSpecs = ACTION_SPECS[String(scriptId ?? "").toLowerCase()];
    if (!scriptSpecs) return null;
    const rawSpec = scriptSpecs[actionId];
    if (!rawSpec) return null;
    if (rawSpec.firstNight || rawSpec.otherNight) {
      return options.firstNight === true ? rawSpec.firstNight : rawSpec.otherNight;
    }
    return rawSpec;
  }

  function isTargetEligible(spec, options = {}) {
    if (!spec || spec.maxTargets < 1) return false;
    const actorIndex = Number(options.actorIndex);
    const targetIndex = Number(options.targetIndex);
    if (!Number.isInteger(targetIndex) || targetIndex < 0) return false;
    if (Number.isInteger(actorIndex) && actorIndex === targetIndex && !spec.targetEligibility.self) return false;
    const targetIsAlive = options.alive?.[targetIndex] !== false;
    if (!(targetIsAlive ? spec.targetEligibility.alive : spec.targetEligibility.dead)) return false;
    const targetRole = options.targetRole;
    if (spec.targetTeams && !spec.targetTeams.includes(targetRole?.team)) return false;
    if (
      Number.isInteger(actorIndex)
      && actorIndex !== targetIndex
      && spec.excludedOtherTargetTypes?.includes(targetRole?.type)
    ) return false;
    return true;
  }

  function isCharacterChoiceEligible(spec, options = {}) {
    if (!spec?.requiresCharacterChoice || !options.character) return false;
    if (spec.allowedCharacterTypes && !spec.allowedCharacterTypes.includes(options.character.type)) return false;
    if (spec.excludeInPlayCharacter && options.inPlayRoleIds?.includes(options.character.id)) return false;
    return true;
  }

  return Object.freeze({
    TIMER_SCRIPT_IDS,
    TYPE_KEYS,
    ACTION_SPECS,
    isTimerEligibleScript,
    validateSetup,
    expandWakeList,
    getActionSpec,
    isTargetEligible,
    isCharacterChoiceEligible
  });
});
