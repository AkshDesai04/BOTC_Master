const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const commonSource = fs.readFileSync(path.join(__dirname, "..", "scripts", "common.js"), "utf8");

function createHarness() {
  const dom = { activeElement: null, mode: "base", focusLog: [] };

  function element({ text = "", attrs = {}, drawer = false, child = null } = {}) {
    const item = {
      id: attrs.id ?? "",
      tagName: attrs.tagName ?? "BUTTON",
      textContent: text,
      value: attrs.value ?? "",
      hidden: false,
      getAttribute(name) { return attrs[name] ?? null; },
      classList: { contains(name) { return drawer && name === "drawer-menu"; } },
      querySelector() { return child; },
      focus() {
        dom.activeElement = item;
        dom.focusLog.push(item);
      }
    };
    return item;
  }

  const body = element({ attrs: { tagName: "BODY" } });
  let trigger = element({ text: "Open details", attrs: { onclick: "openDetails()" } });
  let dialogControl = element({ text: "Dismiss", attrs: { onclick: "state.showCard=null;render()" } });
  let dialog = element({ attrs: { tagName: "DIV" }, child: dialogControl });
  let drawerControl = element({ text: "Close menu", attrs: { "aria-label": "Close menu" } });
  let drawer = element({ attrs: { tagName: "ASIDE" }, drawer: true, child: drawerControl });

  const app = {
    _innerHTML: "",
    get innerHTML() { return this._innerHTML; },
    set innerHTML(value) {
      this._innerHTML = value;
      dom.activeElement = body;
      trigger = element({ text: "Open details", attrs: { onclick: "openDetails()" } });
      dialogControl = element({ text: "Dismiss", attrs: { onclick: "state.showCard=null;render()" } });
      dialog = element({ attrs: { tagName: "DIV" }, child: dialogControl });
      drawerControl = element({ text: "Close menu", attrs: { "aria-label": "Close menu" } });
      drawer = element({ attrs: { tagName: "ASIDE" }, drawer: true, child: drawerControl });
      dom.mode = value.includes('class="drawer-menu"')
        ? "drawer"
        : (value.includes('id="details-dialog-title"') ? "modal" : "base");
    },
    contains(candidate) {
      return [trigger, dialog, dialogControl, drawer, drawerControl].includes(candidate);
    },
    querySelector(selector) {
      if (!selector.includes('[role="')) return null;
      if (dom.mode === "modal") return dialog;
      if (dom.mode === "drawer") return drawer;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('[role="')) {
        if (dom.mode === "modal") return [dialog];
        if (dom.mode === "drawer") return [drawer];
        return [];
      }
      return dom.mode === "base" ? [trigger] : [];
    }
  };

  const document = {
    body,
    get activeElement() { return dom.activeElement; },
    set activeElement(value) { dom.activeElement = value; },
    getElementById(id) { return id === "app" ? app : null; },
    querySelector(selector) {
      return selector === '[aria-label="Open Storyteller menu"]' ? trigger : null;
    }
  };
  const storage = new Map();
  const sandbox = {
    console,
    document,
    BOTCHistory: {
      createHistoryController: () => ({
        canUndo: () => false,
        peekLabel: () => ""
      })
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.runInContext(commonSource, vm.createContext(sandbox), { filename: "scripts/common.js" });

  return {
    dom,
    evaluate: expression => vm.runInContext(expression, sandbox),
    focusTrigger() { trigger.focus(); },
    get trigger() { return trigger; },
    get dialogControl() { return dialogControl; },
    get drawerControl() { return drawerControl; }
  };
}

test("closing a modal restores focus to the rerendered trigger", () => {
  const harness = createHarness();
  harness.evaluate("render()");
  harness.focusTrigger();
  const openingTrigger = harness.trigger;

  harness.evaluate("state.showCard = { title: 'Details', text: 'Body' }; render()");
  assert.equal(harness.dom.activeElement, harness.dialogControl);
  harness.evaluate("state.showCard = null; render()");

  assert.notEqual(harness.trigger, openingTrigger);
  assert.equal(harness.dom.activeElement, harness.trigger);
});

test("Escape closes the modal and restores focus to its trigger", () => {
  const harness = createHarness();
  harness.evaluate("render()");
  harness.focusTrigger();
  harness.evaluate("state.showCard = { title: 'Details', text: 'Body' }; render()");

  harness.evaluate("globalThis.escapePrevented = false; trapDialogFocus({ key: 'Escape', preventDefault() { escapePrevented = true; } })");

  assert.equal(harness.evaluate("escapePrevented"), true);
  assert.equal(harness.evaluate("state.showCard"), null);
  assert.equal(harness.dom.activeElement, harness.trigger);
});

test("drawer close keeps its existing menu-button focus behavior", () => {
  const harness = createHarness();
  harness.evaluate("render(); toggleDrawer()");
  assert.equal(harness.dom.activeElement, harness.drawerControl);

  harness.evaluate("toggleDrawer()");

  assert.equal(harness.evaluate("state.drawerOpen"), false);
  assert.equal(harness.dom.activeElement, harness.trigger);
});
