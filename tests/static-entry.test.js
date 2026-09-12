"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function extractBootstrap(html) {
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(inlineScripts.length > 0, "index has an inline bootstrap");
  return inlineScripts.at(-1)[1];
}

function runBootstrap(search, saved) {
  const calls = { picked: [], hydrated: [], renders: 0 };
  const app = { innerHTML: "" };
  const state = {};
  const context = vm.createContext({
    URLSearchParams,
    console: { error() {} },
    document: { getElementById: id => id === "app" ? app : null },
    hydrateState(value) { calls.hydrated.push(value); },
    loadFromStorage() { return saved; },
    pickScript(id) { calls.picked.push(id); },
    render() { calls.renders += 1; },
    state,
    window: { location: { search } }
  });
  vm.runInContext(extractBootstrap(read("index.html")), context, { filename: "index.html#bootstrap" });
  return { app, calls, state };
}

test("the main static entry loads dependencies in application order and keeps browser zoom available", () => {
  const html = read("index.html");
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i)?.[1] ?? "";
  assert.match(viewport, /width=device-width/i);
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
  assert.match(html, /<main\s+id="app"><\/main>/i);

  const sources = [...html.matchAll(/<script\s+src="([^"]+)"/gi)].map(match => match[1]);
  assert.deepEqual(sources, [
    "scripts/runtime-config.js",
    "scripts/icons.js",
    "scripts/history.js",
    "scripts/game-rules.js",
    "scripts/email.js",
    "scripts/trouble_brewing.js",
    "scripts/bad_moon_rising.js",
    "scripts/sects_and_violets.js",
    "scripts/ultimate_werewolf.js",
    "scripts/handoff-qr.js",
    "scripts/common.js",
    "scripts/handoff.js"
  ]);
});

test("script query routes are allow-listed and never replace a saved session", () => {
  for (const scriptId of ["tb", "bmr", "sv", "uw"]) {
    const result = runBootstrap(`?script=${scriptId}`, null);
    assert.deepEqual(result.calls.picked, [scriptId]);
    assert.deepEqual(result.calls.hydrated, []);
    assert.equal(result.calls.renders, 0);
  }

  const invalid = runBootstrap("?script=../../unexpected", null);
  assert.deepEqual(invalid.calls.picked, []);
  assert.equal(invalid.state.screen, "select");
  assert.equal(invalid.calls.renders, 1);

  const saved = { _saved: 123, scriptId: "bmr", screen: "game" };
  const resume = runBootstrap("?script=tb", saved);
  assert.deepEqual(resume.calls.picked, []);
  assert.deepEqual(resume.calls.hydrated, [saved]);
  assert.equal(resume.state.showResume, true);
  assert.equal(resume.calls.renders, 1);
});

test("legacy script entry pages redirect without touching persisted game data", () => {
  const expected = {
    "trouble_brewing.html": "tb",
    "bad_moon_rising.html": "bmr",
    "sects_and_violets.html": "sv"
  };

  for (const [fileName, scriptId] of Object.entries(expected)) {
    const html = read(fileName);
    const target = `index.html?script=${scriptId}`;
    assert.match(html, new RegExp(`href="${target.replace("?", "\\?")}"`, "i"));
    assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB/i);

    const redirectScript = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1];
    const redirects = [];
    vm.runInNewContext(redirectScript, {
      URLSearchParams,
      window: {
        location: {
          search: "?qa=mobile&script=stale",
          hash: "#handoff=payload",
          replace(value) { redirects.push(value); }
        }
      }
    });
    assert.deepEqual(redirects, [`index.html?qa=mobile&script=${scriptId}#handoff=payload`]);
  }
});

test("responsive styles cover narrow screens, safe areas, motion preferences, and touch targets", () => {
  const css = read("styles/main.css");
  assert.match(css, /--tap-target:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /env\(safe-area-inset-(?:top|right|bottom|left)\)/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.doesNotMatch(css, /@import\s+url|https?:\/\/fonts\./i);
});

test("the delivery workflow accepts exactly the three supported email events", () => {
  const workflow = read(".github/workflows/send-game-email.yml");
  const supported = workflow.match(/supportedTypes\s*=\s*new Set\(\[([^\]]+)\]\)/)?.[1] ?? "";
  const eventTypes = [...supported.matchAll(/["']([^"']+)["']/g)].map(match => match[1]);

  assert.deepEqual(eventTypes, ["game-start", "night-complete", "game-end"]);
  assert.match(workflow, /types:\s*\[send-game-email\]/);
  assert.equal(fs.existsSync(path.join(ROOT, ".github", "workflows", "send-roster-email.yml")), false);
});

test("the Pages workflow publishes only the curated static runtime", () => {
  const html = read("index.html");
  const workflow = read(".github/workflows/pages.yml");
  const assembly = workflow.match(/- name: Assemble static site([\s\S]*?)(?=\n\s+- name: Setup Pages)/)?.[1] ?? "";
  const sources = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)]
    .map(match => match[1]);

  assert.ok(assembly, "Pages workflow has a bounded assembly step");
  const actionReferences = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map(match => match[1]);
  assert.ok(actionReferences.length > 0);
  assert.equal(actionReferences.every(reference => /@[0-9a-f]{40}$/.test(reference)), true);
  assert.match(workflow, /path:\s*_site\b/);
  assert.doesNotMatch(assembly, /\bcp\s+(?:-[^\s]+\s+)*\.\s/);
  assert.match(assembly, /find assets\/images -type f -name '\*\.png'/);
  assert.match(assembly, /test ! -e _site\/old_code_for_reference\.html/);
  assert.match(assembly, /test ! -e _site\/tests/);
  assert.match(assembly, /test ! -e _site\/assets\/handoff-previews/);
  assert.match(assembly, /test ! -e _site\/README\.md/);
  assert.match(assembly, /test ! -e _site\/PLAN\.md/);
  assert.match(assembly, /test ! -e _site\/scripts\/runtime-config\.example\.js/);
  assert.match(assembly, /test ! -e _site\/\.git/);

  for (const source of sources) {
    assert.match(assembly, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(ROOT, ...source.split("/"))), true, `${source} exists`);
  }

  assert.match(read("scripts/runtime-config.js"), /emailEndpoint:\s*["']{2}/);
});
