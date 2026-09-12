(function attachHandoff(root, factory) {
  "use strict";

  const codec = factory();
  if (typeof module === "object" && module.exports) module.exports = codec;
  if (root) root.BOTCHandoffCodec = codec;
  if (root && typeof document !== "undefined") installBrowserHandoff(root, codec);

  function installBrowserHandoff(browserRoot, api) {
    const runtime = {
      stream: null,
      scanTimer: null,
      cameraOn: false,
      parts: {},
      qrText: "",
      qrError: "",
      qrCache: null,
      qrParts: [],
      qrPartIndex: 0,
      snapshot: null,
      takeoverUrl: "",
      receiveMessage: "",
      receiveError: "",
      pendingSnapshot: null,
      collector: null,
      fragmentHandled: false
    };

    const COLLECTOR_STORAGE_KEY = "botc_handoff_parts_v2";
    const decodedSnapshots = new WeakSet();

    function browserCharacters(scriptId) {
      if (scriptId === "tb" && typeof TB !== "undefined") return TB.C;
      if (scriptId === "bmr" && typeof BMR !== "undefined") return BMR.C;
      if (scriptId === "sv" && typeof SV !== "undefined") return SV.C;
      if (scriptId === "uw" && typeof UW !== "undefined") return UW.C;
      return null;
    }

    function codecOptions(extra = {}) {
      return { getCharacters: browserCharacters, ...extra };
    }

    function restoreCollector() {
      let saved = null;
      try {
        const raw = sessionStorage.getItem(COLLECTOR_STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (error) {}
      try {
        return api.createMultipartCollector({ state: saved });
      } catch (error) {
        try { sessionStorage.removeItem(COLLECTOR_STORAGE_KEY); } catch (storageError) {}
        return api.createMultipartCollector();
      }
    }

    function persistCollector() {
      try {
        const saved = runtime.collector.exportState();
        if (saved) sessionStorage.setItem(COLLECTOR_STORAGE_KEY, JSON.stringify(saved));
        else sessionStorage.removeItem(COLLECTOR_STORAGE_KEY);
      } catch (error) {}
    }

    runtime.collector = restoreCollector();
    browserRoot.handoffRuntime = runtime;

    function scriptLabel(scriptId) {
      const labels = {
        tb: "Trouble Brewing",
        bmr: "Bad Moon Rising",
        sv: "Sects & Violets",
        uw: "Ultimate Werewolf"
      };
      return labels[scriptId] || "Grimoire";
    }

    function handoffIcon(name, size = 18) {
      return typeof iconSvg === "function" ? iconSvg(name, size) : "";
    }

    function canGiveHandoff() {
      return api.HANDOFF_SCRIPT_IDS.includes(state.scriptId)
        && ["reveal", "game", "victory"].includes(state.screen);
    }

    function isHandoffMenuGame() {
      return api.HANDOFF_SCRIPT_IDS.includes(state.scriptId)
        && ["game", "reveal", "victory"].includes(state.screen);
    }

    function getHandoffSnapshot(source = getSerializableState()) {
      return {
        kind: api.HANDOFF_KIND,
        v: api.HANDOFF_VERSION,
        scriptId: source.scriptId,
        capturedAt: Date.now(),
        game: {
          ...source,
          scriptId: source.scriptId,
          poisonedIndex: source.poisonedIndex ?? null
        }
      };
    }

    async function buildHandoffUrl(snapshot = getHandoffSnapshot(), options = {}) {
      return api.buildTakeoverUrl(snapshot, codecOptions({
        baseUrl: options.baseUrl || browserRoot.location?.href,
        ...options
      }));
    }

    async function buildHandoffQrParts(snapshot = getHandoffSnapshot(), options = {}) {
      return api.buildHandoffQrParts(snapshot, codecOptions({
        baseUrl: options.baseUrl || browserRoot.location?.href,
        ...options
      }));
    }

    async function parseHandoffPayload(raw) {
      const snapshot = await api.decodeHandoffPayload(raw, codecOptions({
        collector: runtime.collector
      }));
      persistCollector();
      const progress = runtime.collector.getProgress();
      runtime.parts = progress?.parts || {};
      if (!snapshot && progress) {
        runtime.receiveMessage = `Received part ${progress.received} of ${progress.total}. Scan the remaining ${progress.total - progress.received}.`;
      }
      if (snapshot) {
        decodedSnapshots.add(snapshot);
        runtime.receiveMessage = "";
      }
      return snapshot;
    }

    async function assembleHandoffText(raw) {
      const token = api.extractHandoffToken(raw);
      const result = runtime.collector.add(token);
      persistCollector();
      if (!result.complete) {
        runtime.receiveMessage = `Received part ${result.received} of ${result.total}. Scan the remaining ${result.total - result.received}.`;
        if (typeof render === "function") render();
        return null;
      }
      runtime.receiveMessage = "";
      return result.payload;
    }

    function renderHandoffMenuButtons() {
      const receiveBtn = `<button class="btn btn-blue" style="justify-content:flex-start" onclick="openReceiveHandoff()">${handoffIcon("receive")} Receive Handoff</button>`;
      if (!isHandoffMenuGame()) return receiveBtn;
      const giveBtn = `<button class="btn btn-blue" style="justify-content:flex-start" onclick="openGiveHandoff()">${handoffIcon("share")} Give Handoff</button>`;
      return `${giveBtn}${receiveBtn}`;
    }

    function closeGiveHandoff() {
      state.showHandoffGive = false;
      runtime.qrText = "";
      runtime.qrError = "";
      runtime.qrCache = null;
      runtime.qrParts = [];
      runtime.snapshot = null;
      runtime.takeoverUrl = "";
      render();
    }

    function qrCssSize() {
      return Math.min(320, Math.max(220, (browserRoot.innerWidth || 420) - 96));
    }

    function prepareCurrentQr() {
      runtime.qrText = runtime.qrParts[runtime.qrPartIndex] || "";
      runtime.qrCache = null;
      if (!runtime.qrText) return;
      const offscreen = document.createElement("canvas");
      drawQrOnCanvas(offscreen, runtime.qrText, qrCssSize());
      runtime.qrCache = offscreen;
    }

    function paintGiveHandoffQr() {
      const canvas = document.getElementById("handoff-qr-canvas");
      const status = document.getElementById("handoff-qr-status");
      if (status) status.textContent = runtime.qrError;
      if (!canvas || !runtime.qrCache) return;
      canvas.width = runtime.qrCache.width;
      canvas.height = runtime.qrCache.height;
      canvas.style.width = runtime.qrCache.style.width;
      canvas.style.height = runtime.qrCache.style.height;
      const context = canvas.getContext("2d");
      if (context) context.drawImage(runtime.qrCache, 0, 0);
    }

    async function openGiveHandoff() {
      state.drawerOpen = false;
      if (!canGiveHandoff()) {
        showToast("Finish assigning roles before creating a handoff.", "error");
        return;
      }
      state.showHandoffGive = true;
      runtime.qrError = "Preparing handoff...";
      runtime.qrParts = [];
      runtime.qrPartIndex = 0;
      runtime.qrCache = null;
      render();
      try {
        runtime.snapshot = getHandoffSnapshot();
        runtime.takeoverUrl = await buildHandoffUrl(runtime.snapshot);
        runtime.qrParts = api.splitHandoffChunks(api.extractHandoffToken(runtime.takeoverUrl), {
          baseUrl: browserRoot.location?.href
        });
        runtime.qrPartIndex = 0;
        runtime.qrError = runtime.qrParts.length > 1
          ? `Scan every QR in order. Part 1 of ${runtime.qrParts.length} is shown.`
          : "Scan to open this session on the receiving device.";
        prepareCurrentQr();
        render();
      } catch (error) {
        runtime.qrError = error?.message || "Could not build the handoff.";
        runtime.qrParts = [];
        runtime.qrCache = null;
        render();
      }
    }

    function changeHandoffQrPart(delta) {
      if (runtime.qrParts.length < 2) return;
      const next = Math.max(0, Math.min(runtime.qrParts.length - 1, runtime.qrPartIndex + Number(delta || 0)));
      if (next === runtime.qrPartIndex) return;
      runtime.qrPartIndex = next;
      runtime.qrError = `Scan every QR in order. Part ${next + 1} of ${runtime.qrParts.length} is shown.`;
      try {
        prepareCurrentQr();
        render();
      } catch (error) {
        runtime.qrError = error?.message || "Could not draw this QR.";
        render();
      }
    }

    function downloadHandoffQr() {
      const source = runtime.qrCache || document.getElementById("handoff-qr-canvas");
      if (!source) return;
      const link = document.createElement("a");
      const suffix = runtime.qrParts.length > 1 ? `-part-${runtime.qrPartIndex + 1}-of-${runtime.qrParts.length}` : "";
      link.download = `botc-handoff-${state.scriptId}-day-${state.dayNum}${suffix}.png`;
      link.href = source.toDataURL("image/png");
      link.click();
    }

    function handoffJsonText() {
      const snapshot = runtime.snapshot || getHandoffSnapshot();
      return JSON.stringify(snapshot, null, 2);
    }

    async function copyHandoffJson() {
      try {
        await navigator.clipboard.writeText(handoffJsonText());
        showToast("Handoff JSON copied.", "success");
      } catch (error) {
        showToast("Could not copy JSON. Download it instead.", "error");
      }
    }

    function downloadHandoffJson() {
      try {
        const blob = new Blob([handoffJsonText()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `botc-handoff-${state.scriptId}-day-${state.dayNum}.json`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (error) {
        showToast("Could not download the JSON file.", "error");
      }
    }

    async function copyHandoffUrl() {
      try {
        const url = runtime.takeoverUrl || await buildHandoffUrl(runtime.snapshot || getHandoffSnapshot());
        await navigator.clipboard.writeText(url);
        showToast("Handoff link copied.", "success");
      } catch (error) {
        showToast("Could not copy the handoff link.", "error");
      }
    }

    function renderGiveHandoffOverlay() {
      if (!state.showHandoffGive) return "";
      const total = runtime.qrParts.length;
      const current = total ? runtime.qrPartIndex + 1 : 0;
      const phaseLabel = state.phase === "night" ? `Night ${state.dayNum}` : `Day ${state.dayNum}`;
      return `
        <div class="overlay" style="z-index:320" onclick="closeGiveHandoff()">
          <div class="handoff-card" role="dialog" aria-modal="true" aria-labelledby="handoff-give-title" tabindex="-1" onkeydown="trapDialogFocus(event)" onclick="event.stopPropagation()">
            <h3 id="handoff-give-title" style="font-family:var(--font-serif);font-size:24px;margin-bottom:6px">Give Handoff</h3>
            <p style="font-size:12px;color:var(--text3);margin-bottom:14px">
              Transfer the live ${esc(scriptLabel(state.scriptId))} session (${esc(phaseLabel)}). Link fragments are processed on this device and are not sent with the page request.
            </p>
            <div class="handoff-qr-wrap">
              <canvas id="handoff-qr-canvas" role="img" aria-label="Handoff QR${total > 1 ? ` part ${current} of ${total}` : ""}">Handoff QR code${total > 1 ? ` part ${current} of ${total}` : ""}</canvas>
            </div>
            ${total > 1 ? `
              <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
                <button class="btn btn-outline" style="flex:1;margin:0" onclick="changeHandoffQrPart(-1)" ${current <= 1 ? "disabled" : ""}>${handoffIcon("back", 16)} Previous</button>
                <span style="font-size:12px;color:var(--text2);white-space:nowrap">${current} / ${total}</span>
                <button class="btn btn-outline" style="flex:1;margin:0" onclick="changeHandoffQrPart(1)" ${current >= total ? "disabled" : ""}>Next ${handoffIcon("forward", 16)}</button>
              </div>` : ""}
            <div id="handoff-qr-status" role="status" style="font-size:12px;color:var(--orange);min-height:18px;margin:8px 0">${esc(runtime.qrError)}</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-primary" onclick="downloadHandoffQr()" ${runtime.qrCache ? "" : "disabled"}>Download current QR</button>
              <button class="btn btn-outline" onclick="copyHandoffUrl()" ${runtime.takeoverUrl ? "" : "disabled"}>Copy takeover link</button>
              <button class="btn btn-outline" onclick="copyHandoffJson()" ${runtime.snapshot ? "" : "disabled"}>Copy JSON</button>
              <button class="btn btn-outline" onclick="downloadHandoffJson()" ${runtime.snapshot ? "" : "disabled"}>Download JSON</button>
              <button class="btn btn-outline" onclick="closeGiveHandoff()">Close</button>
            </div>
          </div>
        </div>`;
    }

    function stopHandoffScanner() {
      runtime.cameraOn = false;
      if (runtime.scanTimer) {
        clearTimeout(runtime.scanTimer);
        runtime.scanTimer = null;
      }
      if (runtime.stream) {
        runtime.stream.getTracks().forEach(track => track.stop());
        runtime.stream = null;
      }
      const video = document.getElementById("handoff-video");
      if (video) video.srcObject = null;
    }

    function resetHandoffCollector() {
      runtime.collector.reset();
      runtime.parts = {};
      runtime.receiveMessage = "";
      persistCollector();
    }

    function openReceiveHandoff(options = {}) {
      stopHandoffScanner();
      state.drawerOpen = false;
      state.showHandoffGive = false;
      state.showResume = false;
      state.handoffReturnScreen = state.screen === "handoffReceive" ? "select" : state.screen;
      state.screen = "handoffReceive";
      runtime.receiveMessage = "";
      runtime.receiveError = "";
      if (options.keepParts !== true) resetHandoffCollector();
      render();
    }

    function closeReceiveHandoff() {
      stopHandoffScanner();
      resetHandoffCollector();
      state.screen = state.handoffReturnScreen || "select";
      state.handoffReturnScreen = null;
      render();
    }

    function hasReplaceableSession() {
      return Boolean(state.scriptId) && state.screen !== "select" && state.screen !== "handoffReceive";
    }

    function qrScanningSupported() {
      return typeof BarcodeDetector === "function";
    }

    async function detectQrValue(source) {
      if (!qrScanningSupported()) throw new Error("QR scanning is not available in this browser. Upload or paste the handoff instead.");
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(source);
      return codes[0]?.rawValue || "";
    }

    function commitHandoffSnapshot(snapshot) {
      const isDecoded = isObjectSnapshot(snapshot) && decodedSnapshots.has(snapshot);
      const clean = isDecoded ? snapshot : null;
      const game = clean?.game || snapshot?.game;
      if (!game || typeof game !== "object" || Array.isArray(game)) throw new Error("Handoff data is missing the game snapshot.");
      const scriptId = clean?.scriptId || snapshot.scriptId || game.scriptId;
      const hasDiscussionTimerState = Object.prototype.hasOwnProperty.call(game, "discussionTimerDefaults")
        || Object.prototype.hasOwnProperty.call(game, "discussionTimerSessions");
      const nextState = isDecoded
        ? api.createTakeoverState(state, clean, codecOptions())
        : {
            ...state,
            ...game,
            scriptId,
            nameInput: "",
            drawerOpen: false,
            confirm: null,
            showCard: null,
            toast: null,
            showResume: false,
            showHandoffGive: false,
            showWinnerPicker: false,
            timerRunning: false,
            timerIntervalId: null,
            timerDeadline: null,
            timerSessionDay: game.dayNum,
            expandedPlayer: -1,
            handoffReturnScreen: null
          };
      stopTimer();
      stopHandoffScanner();
      state = nextState;
      state.pendingEmails = [];
      if (typeof writeEmailOutbox === "function") writeEmailOutbox([]);
      normalizeDiscussionTimerState({ migrateLegacyTimer: !hasDiscussionTimerState });
      if (typeof historyController !== "undefined" && typeof historyController.clearForTakeover === "function") {
        historyController.clearForTakeover();
      }
      runtime.pendingSnapshot = null;
      resetHandoffCollector();
      autoSave();
      render();
      showToast("Handoff received. The game is restored on this device.", "success");
    }

    function isObjectSnapshot(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function confirmPendingHandoff() {
      if (!runtime.pendingSnapshot) return;
      const snapshot = runtime.pendingSnapshot;
      runtime.pendingSnapshot = null;
      state.confirm = null;
      commitHandoffSnapshot(snapshot);
    }

    async function applyDecodedHandoff(raw) {
      const snapshot = await parseHandoffPayload(raw);
      if (!snapshot) return null;
      if (hasReplaceableSession()) {
        runtime.pendingSnapshot = snapshot;
        state.confirm = {
          msg: `Replace the current session with the received ${scriptLabel(snapshot.scriptId)} game?`,
          onYes: "confirmPendingHandoff"
        };
        stopHandoffScanner();
        render();
        return snapshot;
      }
      commitHandoffSnapshot(snapshot);
      return snapshot;
    }

    async function startHandoffCamera() {
      runtime.receiveError = "";
      if (!qrScanningSupported() || !navigator.mediaDevices?.getUserMedia) {
        runtime.receiveError = "Camera QR scanning is not available. Upload a QR image or paste the handoff.";
        render();
        return;
      }
      try {
        runtime.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        runtime.cameraOn = true;
        render();
      } catch (error) {
        runtime.cameraOn = false;
        runtime.receiveError = "Could not open the camera. Allow camera access or upload a QR image.";
        render();
      }
    }

    function scheduleHandoffScan() {
      if (runtime.scanTimer) clearTimeout(runtime.scanTimer);
      runtime.scanTimer = setTimeout(scanHandoffFrame, 220);
    }

    async function scanHandoffFrame() {
      if (!runtime.cameraOn || state.screen !== "handoffReceive") return;
      const video = document.getElementById("handoff-video");
      if (video && video.readyState >= 2) {
        try {
          const value = await detectQrValue(video);
          if (value) {
            try {
              await applyDecodedHandoff(value);
              if (!runtime.cameraOn) return;
            } catch (error) {
              runtime.receiveError = error?.message || "Could not read that QR.";
              render();
            }
          }
        } catch (error) {}
      }
      scheduleHandoffScan();
    }

    async function onHandoffFileSelected(input) {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      runtime.receiveError = "";
      try {
        if (file.size > api.HANDOFF_LIMITS.maxUploadBytes) throw new Error("That file is too large for a handoff.");
        if (file.type === "application/json" || file.type === "text/plain" || file.name.toLowerCase().endsWith(".json")) {
          await applyDecodedHandoff(await file.text());
          return;
        }
        const bitmap = await createImageBitmap(file);
        try {
          const value = await detectQrValue(bitmap);
          if (!value) throw new Error("No QR code was found in that image.");
          await applyDecodedHandoff(value);
        } finally {
          if (typeof bitmap.close === "function") bitmap.close();
        }
      } catch (error) {
        runtime.receiveError = error?.message || "Could not read that file.";
        render();
      }
    }

    async function applyPastedHandoff() {
      const area = document.getElementById("handoff-json-paste");
      const text = area?.value?.trim() || "";
      if (!text) {
        runtime.receiveError = "Paste a handoff link, payload, or JSON first.";
        render();
        return;
      }
      try {
        runtime.receiveError = "";
        await applyDecodedHandoff(text);
      } catch (error) {
        runtime.receiveError = error?.message || "Could not read that handoff.";
        render();
      }
    }

    function renderHandoffReceiveScreen() {
      const cameraHint = qrScanningSupported()
        ? "Point the camera at each QR, upload an image or JSON file, or paste a handoff link."
        : "Upload a JSON file or paste a handoff link. QR image decoding is not available in this browser.";
      return `
        <div class="screen fade-in" style="padding-top:16px">
          <div style="margin-bottom:20px">
            <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Receive Handoff</h2>
            <p style="color:var(--text3);font-size:13px">${esc(cameraHint)}</p>
          </div>
          ${runtime.cameraOn ? `
            <div class="handoff-video-wrap"><video id="handoff-video" autoplay playsinline muted></video></div>
          ` : `<button class="btn btn-primary" onclick="startHandoffCamera()" ${qrScanningSupported() ? "" : "disabled"}>${handoffIcon("camera")} Open camera</button>`}
          <label class="btn btn-outline" style="margin-top:10px;cursor:pointer">
            Upload QR or JSON
            <input id="handoff-file-input" type="file" accept="image/*,.json,application/json,text/plain" class="handoff-file-input" onchange="onHandoffFileSelected(this)">
          </label>
          <div style="margin-top:16px;text-align:left">
            <label for="handoff-json-paste" style="display:block;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Paste handoff</label>
            <textarea id="handoff-json-paste" class="input" rows="5" style="width:100%;resize:vertical" placeholder="Paste a takeover link, encoded payload, or JSON"></textarea>
            <button class="btn btn-blue" style="margin-top:8px" onclick="applyPastedHandoff()">Apply handoff</button>
          </div>
          ${runtime.receiveMessage ? `<div role="status" style="margin-top:12px;font-size:13px;color:var(--text2)">${esc(runtime.receiveMessage)}</div>` : ""}
          ${runtime.receiveError ? `<div role="alert" class="warn warn-orange" style="margin-top:12px">${esc(runtime.receiveError)}</div>` : ""}
          <button class="btn btn-outline" style="margin-top:18px" onclick="closeReceiveHandoff()">${handoffIcon("back")} Back</button>
        </div>`;
    }

    function afterRenderHandoff() {
      if (state.showHandoffGive) paintGiveHandoffQr();
      if (state.screen === "handoffReceive" && runtime.cameraOn) {
        const video = document.getElementById("handoff-video");
        if (video && runtime.stream) {
          video.srcObject = runtime.stream;
          video.play().then(scheduleHandoffScan).catch(() => {});
        }
      }
    }

    async function consumeLocationHandoff() {
      if (runtime.fragmentHandled || !(browserRoot.location?.hash.includes("handoff=") || browserRoot.location?.hash.includes("handoff-part="))) return;
      runtime.fragmentHandled = true;
      const currentUrl = browserRoot.location.href;
      try {
        if (browserRoot.history?.replaceState) {
          browserRoot.history.replaceState(null, "", `${browserRoot.location.pathname}${browserRoot.location.search}`);
        }
        state.showResume = false;
        const snapshot = await parseHandoffPayload(currentUrl);
        if (!snapshot) {
          state.handoffReturnScreen = state.screen;
          state.screen = "handoffReceive";
          render();
          return;
        }
        if (hasReplaceableSession()) {
          runtime.pendingSnapshot = snapshot;
          state.confirm = {
            msg: `Replace the current session with the received ${scriptLabel(snapshot.scriptId)} game?`,
            onYes: "confirmPendingHandoff"
          };
          render();
        } else {
          commitHandoffSnapshot(snapshot);
        }
      } catch (error) {
        state.showResume = false;
        state.handoffReturnScreen = state.screen;
        state.screen = "handoffReceive";
        runtime.receiveError = error?.message || "Could not read the handoff link.";
        render();
      }
    }

    Object.assign(browserRoot, {
      canGiveHandoff,
      isHandoffMenuGame,
      getHandoffSnapshot,
      buildHandoffUrl,
      buildTakeoverUrl: buildHandoffUrl,
      buildHandoffQrParts,
      parseHandoffPayload,
      assembleHandoffText,
      renderHandoffMenuButtons,
      closeGiveHandoff,
      paintGiveHandoffQr,
      openGiveHandoff,
      changeHandoffQrPart,
      downloadHandoffQr,
      copyHandoffJson,
      downloadHandoffJson,
      copyHandoffUrl,
      renderGiveHandoffOverlay,
      stopHandoffScanner,
      resetHandoffCollector,
      openReceiveHandoff,
      closeReceiveHandoff,
      hasReplaceableSession,
      qrScanningSupported,
      detectQrValue,
      commitHandoffSnapshot,
      confirmPendingHandoff,
      applyDecodedHandoff,
      startHandoffCamera,
      scheduleHandoffScan,
      scanHandoffFrame,
      onHandoffFileSelected,
      applyPastedHandoff,
      renderHandoffReceiveScreen,
      afterRenderHandoff,
      consumeLocationHandoff
    });

    setTimeout(consumeLocationHandoff, 0);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createHandoffCodec() {
  "use strict";

  const HANDOFF_KIND = "botc-handoff";
  const HANDOFF_VERSION = 2;
  const HANDOFF_SCRIPT_IDS = Object.freeze(["tb", "bmr", "sv", "uw"]);
  const V1_COMPRESSED_PREFIX = "BOTC1.";
  const V1_PART_PREFIX = "BOTCP:";
  const V2_JSON_PREFIX = "BOTC2.J.";
  const V2_GZIP_PREFIX = "BOTC2.G.";
  const V2_PART_PREFIX = "BOTCP2.";

  const HANDOFF_LIMITS = Object.freeze({
    maxRawBytes: 393216,
    maxDecodedBytes: 262144,
    maxEncodedBytes: 131072,
    maxUploadBytes: 10485760,
    qrPartBytes: 2200,
    maxParts: 64,
    maxPlayers: 75,
    maxNameLength: 80,
    maxRoleIdLength: 64,
    maxChronicleEntries: 500,
    maxLogEntries: 500,
    maxTextLength: 4000,
    maxDay: 9999,
    maxWakeIndex: 1000,
    maxTimerSeconds: 3600,
    minTimerSeconds: 30
  });

  const GAME_KEYS = new Set([
    "_saved", "screen", "scriptId", "playerCount", "dist", "names", "rolePool", "assignments", "alignments", "setupChoices",
    "drunkBelievedRoles", "lunaticBelievedRoles", "lunaticPoCharged", "redHerringIndex", "roleEntryIndex", "revealIndex", "revealCovered",
    "dayNum", "phase", "activeWakeIdx", "nightLog", "alive", "registeredDead", "nominations", "votes", "ghostVotes",
    "deathsLastNight", "deathsToday", "poisonedIndex", "nightProtected", "executedTodayIndex", "usedAbilities", "poCharged",
    "pendingMoonchildIndexes", "vigormortisRetainedMinions", "previousNightTargets", "permanentlyPoisoned", "gainedAbilities", "fangGuJumpUsed", "courtierEffect",
    "chronicle", "winTeam", "winnerSelection", "sessionId", "emailEventTimes", "emailDispatchedKeys",
    "pendingEmails", "timerSeconds", "timerTotal", "timerRunning", "timerDeadline",
    "discussionTimerDefaults", "discussionTimerSessions", "activeDiscussionType", "tab"
  ]);

  function handoffError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function utf8ByteLength(value) {
    return new TextEncoder().encode(String(value)).length;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function rejectUnknownKeys(value, allowed, path) {
    if (!isRecord(value)) throw handoffError("invalid-shape", `${path} must be an object.`);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) throw handoffError("unknown-field", `${path}.${key} is not supported.`);
    }
  }

  function finiteInteger(value, path, minimum, maximum, fallback) {
    if ((value === undefined || value === null) && fallback !== undefined) return fallback;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw handoffError("invalid-number", `${path} must be an integer from ${minimum} to ${maximum}.`);
    }
    return value;
  }

  function booleanValue(value, path, fallback) {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== "boolean") throw handoffError("invalid-boolean", `${path} must be true or false.`);
    return value;
  }

  function boundedString(value, path, maximum, options = {}) {
    if ((value === undefined || value === null) && options.fallback !== undefined) return options.fallback;
    if (typeof value !== "string") throw handoffError("invalid-text", `${path} must be text.`);
    const normalized = value.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    const result = options.trim === false ? normalized : normalized.trim();
    if (!options.allowEmpty && !result) throw handoffError("empty-text", `${path} cannot be empty.`);
    if (result.length > maximum) throw handoffError("text-too-long", `${path} is too long.`);
    return result;
  }

  function safeImportedHtmlText(value, path, maximum) {
    return boundedString(value, path, maximum, { allowEmpty: true, fallback: "" })
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+\n/g, "\n")
      .trim();
  }

  function scriptRange(scriptId) {
    if (scriptId === "uw") return { min: 5, max: 75 };
    if (["tb", "bmr", "sv"].includes(scriptId)) return { min: 5, max: 20 };
    return { min: 5, max: 15 };
  }

  function getCharacters(scriptId, options) {
    if (typeof options.getCharacters === "function") return options.getCharacters(scriptId);
    return options.characters || null;
  }

  function roleId(value, path, characters, options = {}) {
    const text = boundedString(value, path, HANDOFF_LIMITS.maxRoleIdLength);
    const expression = options.allowSynthetic ? /^_?[a-z0-9][a-z0-9_-]*$/ : /^[a-z0-9][a-z0-9_-]*$/;
    if (!expression.test(text)) throw handoffError("invalid-role", `${path} is not a valid character id.`);
    const isSynthetic = options.allowSynthetic
      && (text.startsWith("_") || text === "lunatic_info" || text === "lunatic_action");
    if (!isSynthetic && characters && !own(characters, text)) {
      throw handoffError("unknown-role", `${path} is not part of this script.`);
    }
    return text;
  }

  function seatKey(key, playerCount, path) {
    const seat = Number(key);
    if (!Number.isInteger(seat) || String(seat) !== key || seat < 0 || seat >= playerCount) {
      throw handoffError("invalid-seat", `${path}.${key} is outside the roster.`);
    }
    return seat;
  }

  function nullableSeat(value, path, playerCount, fallback = null) {
    if (value === undefined || value === null) return fallback;
    return finiteInteger(value, path, 0, playerCount - 1);
  }

  function sanitizeNames(value, playerCount) {
    if (!Array.isArray(value) || value.length !== playerCount) {
      throw handoffError("invalid-roster", "game.names must contain exactly one name per seat.");
    }
    const seen = new Set();
    return value.map((name, index) => {
      const clean = boundedString(name, `game.names[${index}]`, HANDOFF_LIMITS.maxNameLength);
      const identity = clean.normalize("NFKC").toLocaleLowerCase();
      if (seen.has(identity)) throw handoffError("duplicate-name", "Player names must be unique.");
      seen.add(identity);
      return clean;
    });
  }

  function sanitizeDistribution(value, scriptId, playerCount) {
    if (value === undefined && scriptId === "uw") return { t: 0, o: 0, m: 0, d: 0 };
    rejectUnknownKeys(value, new Set(["t", "o", "m", "d"]), "game.dist");
    const clean = {};
    for (const key of ["t", "o", "m", "d"]) clean[key] = finiteInteger(value[key], `game.dist.${key}`, 0, playerCount, 0);
    if (scriptId !== "uw" && clean.t + clean.o + clean.m + clean.d !== playerCount) {
      throw handoffError("invalid-distribution", "The character distribution must equal the player count.");
    }
    return clean;
  }

  function sanitizeAssignments(value, playerCount, characters) {
    if (!isRecord(value)) throw handoffError("invalid-assignments", "game.assignments must be an object.");
    const clean = {};
    for (const key of Object.keys(value)) seatKey(key, playerCount, "game.assignments");
    for (let index = 0; index < playerCount; index++) {
      if (!own(value, String(index))) throw handoffError("missing-assignment", `Seat ${index + 1} has no character.`);
      clean[index] = roleId(value[index], `game.assignments.${index}`, characters);
    }
    return clean;
  }

  function sanitizeRolePool(value, assignments, playerCount, characters) {
    const source = value === undefined ? Object.values(assignments) : value;
    if (!Array.isArray(source) || source.length !== playerCount) {
      throw handoffError("invalid-role-pool", "game.rolePool must contain exactly one character per seat.");
    }
    return source.map((id, index) => roleId(id, `game.rolePool[${index}]`, characters));
  }

  function sanitizeRoleMap(value, playerCount, characters, path) {
    if (value === undefined || value === null) return {};
    if (!isRecord(value)) throw handoffError("invalid-map", `${path} must be an object.`);
    const clean = {};
    for (const key of Object.keys(value)) {
      const seat = seatKey(key, playerCount, path);
      clean[seat] = roleId(value[key], `${path}.${key}`, characters);
    }
    return clean;
  }

  function sanitizeAlignments(value, playerCount, assignments, characters, scriptId) {
    if (value !== undefined && value !== null && !isRecord(value)) {
      throw handoffError("invalid-alignments", "game.alignments must be an object.");
    }
    const source = value || {};
    for (const key of Object.keys(source)) seatKey(key, playerCount, "game.alignments");
    const clean = {};
    for (let seat = 0; seat < playerCount; seat++) {
      const character = characters?.[assignments[seat]];
      const roleTeam = character?.team
        ?? (["minion", "demon"].includes(character?.type) ? "evil" : (["townsfolk", "outsider"].includes(character?.type) ? "good" : null));
      const hasExplicitAlignment = own(source, String(seat));
      const alignment = hasExplicitAlignment
        ? boundedString(source[seat], `game.alignments.${seat}`, 32)
        : roleTeam;
      if (scriptId === "uw") {
        if (roleTeam !== null) clean[seat] = roleTeam;
      } else {
        if (alignment !== null && !["good", "evil"].includes(alignment)) {
          throw handoffError("invalid-alignment", "A player alignment is invalid for this script.");
        }
        if (alignment !== null) clean[seat] = alignment;
      }
    }
    return clean;
  }

  function sanitizeUsedAbilities(value, playerCount, characters) {
    if (value === undefined || value === null) return {};
    if (!isRecord(value) || Object.keys(value).length > playerCount * 4) {
      throw handoffError("invalid-used-abilities", "game.usedAbilities is invalid.");
    }
    const clean = {};
    for (const [key, used] of Object.entries(value)) {
      const match = key.match(/^(0|[1-9]\d*):([a-z0-9][a-z0-9_-]{0,63})$/);
      if (!match) throw handoffError("invalid-ability-key", "A used ability key is invalid.");
      const seat = finiteInteger(Number(match[1]), `game.usedAbilities.${key}`, 0, playerCount - 1);
      const characterId = roleId(match[2], `game.usedAbilities.${key}`, characters);
      if (used !== true) throw handoffError("invalid-used-ability", "Used ability entries must be true.");
      clean[`${seat}:${characterId}`] = true;
    }
    return clean;
  }

  function sanitizePreviousNightTargets(value, playerCount, assignments, characters, scriptId) {
    if (value === undefined || value === null || scriptId !== "bmr") return {};
    if (!isRecord(value) || Object.keys(value).length > playerCount * 2) {
      throw handoffError("invalid-previous-targets", "game.previousNightTargets is invalid.");
    }
    const clean = {};
    for (const [key, previous] of Object.entries(value)) {
      const match = key.match(/^(0|[1-9]\d*):(exorcist|devilsadvocate)$/);
      if (!match) throw handoffError("invalid-previous-target", "A previous target key is invalid.");
      const seat = finiteInteger(Number(match[1]), `game.previousNightTargets.${key}`, 0, playerCount - 1);
      const characterId = roleId(match[2], `game.previousNightTargets.${key}`, characters);
      rejectUnknownKeys(previous, new Set(["targetIndex", "nightNumber"]), `game.previousNightTargets.${key}`);
      const targetIndex = finiteInteger(previous.targetIndex, `game.previousNightTargets.${key}.targetIndex`, 0, playerCount - 1);
      const nightNumber = finiteInteger(previous.nightNumber, `game.previousNightTargets.${key}.nightNumber`, 1, HANDOFF_LIMITS.maxDay);
      if (assignments[seat] === characterId) clean[`${seat}:${characterId}`] = { targetIndex, nightNumber };
    }
    return clean;
  }

  function sanitizeCourtierEffect(value, characters, scriptId) {
    if (value === undefined || value === null || scriptId !== "bmr") return null;
    rejectUnknownKeys(value, new Set(["characterId", "expiresAfterDay"]), "game.courtierEffect");
    return {
      characterId: roleId(value.characterId, "game.courtierEffect.characterId", characters),
      expiresAfterDay: finiteInteger(value.expiresAfterDay, "game.courtierEffect.expiresAfterDay", 1, HANDOFF_LIMITS.maxDay)
    };
  }

  function sanitizeSetupChoices(value, scriptId) {
    if (value === undefined || value === null) return {};
    if (!isRecord(value)) throw handoffError("invalid-setup-choices", "game.setupChoices must be an object.");
    rejectUnknownKeys(value, new Set(["godfatherOutsiderDelta"]), "game.setupChoices");
    if (!own(value, "godfatherOutsiderDelta")) return {};
    const delta = Number(value.godfatherOutsiderDelta);
    if (scriptId !== "bmr" || ![-1, 1].includes(delta)) {
      throw handoffError("invalid-setup-choice", "game.setupChoices.godfatherOutsiderDelta must be -1 or 1 for Bad Moon Rising.");
    }
    return { godfatherOutsiderDelta: delta };
  }

  function sanitizeSeatBooleanMap(value, playerCount, path, fallback) {
    if (value !== undefined && !isRecord(value)) throw handoffError("invalid-map", `${path} must be an object.`);
    const clean = {};
    const source = value || {};
    for (const key of Object.keys(source)) seatKey(key, playerCount, path);
    for (let index = 0; index < playerCount; index++) {
      clean[index] = own(source, String(index)) ? booleanValue(source[index], `${path}.${index}`) : fallback;
    }
    return clean;
  }

  function sanitizeVotes(value, playerCount) {
    if (value !== undefined && !isRecord(value)) throw handoffError("invalid-votes", "game.votes must be an object.");
    const source = value || {};
    const clean = {};
    for (const key of Object.keys(source)) seatKey(key, playerCount, "game.votes");
    for (let index = 0; index < playerCount; index++) {
      clean[index] = own(source, String(index)) ? finiteInteger(source[index], `game.votes.${index}`, 0, 99) : 1;
    }
    return clean;
  }

  function sanitizeSeatList(value, playerCount, path) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > playerCount) throw handoffError("invalid-seat-list", `${path} is invalid.`);
    const clean = value.map((seat, index) => finiteInteger(seat, `${path}[${index}]`, 0, playerCount - 1));
    if (new Set(clean).size !== clean.length) throw handoffError("duplicate-seat", `${path} contains duplicate seats.`);
    return clean;
  }

  function sanitizeNightLog(value, playerCount, characters) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > HANDOFF_LIMITS.maxLogEntries) {
      throw handoffError("invalid-night-log", "game.nightLog is too large or invalid.");
    }
    const allowed = new Set([
      "roleId", "sourceId", "targetIndex", "targetIndexes", "characterId", "actingPlayerIndex",
      "fakeNoEffect", "manualResolution", "skipped", "nightNumber", "stepIndex"
    ]);
    return value.map((entry, index) => {
      rejectUnknownKeys(entry, allowed, `game.nightLog[${index}]`);
      const targetIndexes = entry.targetIndexes === undefined
        ? (entry.targetIndex === undefined || entry.targetIndex === null ? [] : [nullableSeat(entry.targetIndex, `game.nightLog[${index}].targetIndex`, playerCount)])
        : sanitizeSeatList(entry.targetIndexes, playerCount, `game.nightLog[${index}].targetIndexes`);
      return {
        roleId: roleId(entry.roleId, `game.nightLog[${index}].roleId`, characters, { allowSynthetic: true }),
        sourceId: entry.sourceId === undefined || entry.sourceId === null ? null : roleId(entry.sourceId, `game.nightLog[${index}].sourceId`, characters, { allowSynthetic: true }),
        targetIndexes,
        targetIndex: targetIndexes[0] ?? null,
        characterId: entry.characterId === undefined || entry.characterId === null ? null : roleId(entry.characterId, `game.nightLog[${index}].characterId`, characters),
        actingPlayerIndex: nullableSeat(entry.actingPlayerIndex, `game.nightLog[${index}].actingPlayerIndex`, playerCount),
        fakeNoEffect: booleanValue(entry.fakeNoEffect, `game.nightLog[${index}].fakeNoEffect`, false),
        manualResolution: booleanValue(entry.manualResolution, `game.nightLog[${index}].manualResolution`, false),
        skipped: booleanValue(entry.skipped, `game.nightLog[${index}].skipped`, false),
        nightNumber: finiteInteger(entry.nightNumber, `game.nightLog[${index}].nightNumber`, 1, HANDOFF_LIMITS.maxDay, 1),
        stepIndex: finiteInteger(entry.stepIndex, `game.nightLog[${index}].stepIndex`, 0, HANDOFF_LIMITS.maxWakeIndex, 0)
      };
    });
  }

  function sanitizeNominations(value, playerCount) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > HANDOFF_LIMITS.maxLogEntries) {
      throw handoffError("invalid-nominations", "game.nominations is too large or invalid.");
    }
    const allowed = new Set(["nominatorIndex", "nomineeIndex", "votes", "voteCount", "executed", "dayNum"]);
    return value.map((entry, index) => {
      rejectUnknownKeys(entry, allowed, `game.nominations[${index}]`);
      return {
        nominatorIndex: nullableSeat(entry.nominatorIndex, `game.nominations[${index}].nominatorIndex`, playerCount),
        nomineeIndex: nullableSeat(entry.nomineeIndex, `game.nominations[${index}].nomineeIndex`, playerCount),
        votes: Array.isArray(entry.votes) ? sanitizeSeatList(entry.votes, playerCount, `game.nominations[${index}].votes`) : [],
        voteCount: finiteInteger(entry.voteCount, `game.nominations[${index}].voteCount`, 0, playerCount, 0),
        executed: booleanValue(entry.executed, `game.nominations[${index}].executed`, false),
        dayNum: finiteInteger(entry.dayNum, `game.nominations[${index}].dayNum`, 1, HANDOFF_LIMITS.maxDay, 1)
      };
    });
  }

  function safeBadgeColor(value) {
    if (typeof value !== "string") return "var(--border)";
    const color = value.trim();
    if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
    if (/^var\(--(?:border|red|orange|green|blue|purple|text|text2|text3)\)$/.test(color)) return color;
    return "var(--border)";
  }

  function sanitizeChronicle(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > HANDOFF_LIMITS.maxChronicleEntries) {
      throw handoffError("invalid-chronicle", "game.chronicle is too large or invalid.");
    }
    const allowed = new Set(["type", "nightNum", "dayNum", "title", "details", "badgeColor"]);
    return value.map((entry, index) => {
      rejectUnknownKeys(entry, allowed, `game.chronicle[${index}]`);
      const type = entry.type === undefined ? "system" : boundedString(entry.type, `game.chronicle[${index}].type`, 12);
      if (!["system", "night", "day"].includes(type)) throw handoffError("invalid-chronicle-type", "A chronicle entry has an invalid type.");
      return {
        type,
        nightNum: entry.nightNum === undefined || entry.nightNum === null ? null : finiteInteger(entry.nightNum, `game.chronicle[${index}].nightNum`, 1, HANDOFF_LIMITS.maxDay),
        dayNum: entry.dayNum === undefined || entry.dayNum === null ? null : finiteInteger(entry.dayNum, `game.chronicle[${index}].dayNum`, 1, HANDOFF_LIMITS.maxDay),
        title: safeImportedHtmlText(entry.title, `game.chronicle[${index}].title`, 200),
        details: safeImportedHtmlText(entry.details, `game.chronicle[${index}].details`, HANDOFF_LIMITS.maxTextLength),
        badgeColor: safeBadgeColor(entry.badgeColor)
      };
    });
  }

  function normalizeTimerDuration(value, fallback = 300) {
    return finiteInteger(value, "timer duration", HANDOFF_LIMITS.minTimerSeconds, HANDOFF_LIMITS.maxTimerSeconds, fallback);
  }

  function sanitizeTimerDefaults(value, legacyTotal) {
    if (value === undefined || value === null) return { public: legacyTotal, private: legacyTotal };
    rejectUnknownKeys(value, new Set(["public", "private"]), "game.discussionTimerDefaults");
    return {
      public: normalizeTimerDuration(value.public, legacyTotal),
      private: normalizeTimerDuration(value.private, legacyTotal)
    };
  }

  function sanitizeTimer(value, path, defaultDuration, allowTimer) {
    if (value === undefined || value === null) {
      return { enabled: allowTimer, durationSeconds: defaultDuration, remainingSeconds: defaultDuration };
    }
    rejectUnknownKeys(value, new Set(["enabled", "durationSeconds", "remainingSeconds"]), path);
    const durationSeconds = normalizeTimerDuration(value.durationSeconds, defaultDuration);
    return {
      enabled: allowTimer && booleanValue(value.enabled, `${path}.enabled`, true),
      durationSeconds,
      remainingSeconds: finiteInteger(value.remainingSeconds, `${path}.remainingSeconds`, 0, durationSeconds, durationSeconds)
    };
  }

  function sanitizeTimerSessions(value, defaults, currentDay, allowTimer) {
    if (value !== undefined && !isRecord(value)) throw handoffError("invalid-timer-sessions", "game.discussionTimerSessions must be an object.");
    const clean = {};
    const source = value || {};
    const keys = Object.keys(source);
    if (keys.length > 512) throw handoffError("too-many-timer-sessions", "Too many discussion timer sessions were supplied.");
    for (const key of keys) {
      const day = Number(key);
      if (!Number.isInteger(day) || String(day) !== key || day < 1 || day > HANDOFF_LIMITS.maxDay) {
        throw handoffError("invalid-timer-day", `game.discussionTimerSessions.${key} is invalid.`);
      }
      rejectUnknownKeys(source[key], new Set(["public", "private"]), `game.discussionTimerSessions.${key}`);
      clean[key] = {
        public: sanitizeTimer(source[key].public, `game.discussionTimerSessions.${key}.public`, defaults.public, allowTimer),
        private: sanitizeTimer(source[key].private, `game.discussionTimerSessions.${key}.private`, defaults.private, allowTimer)
      };
    }
    if (!clean[String(currentDay)]) {
      clean[String(currentDay)] = {
        public: sanitizeTimer(undefined, "public timer", defaults.public, allowTimer),
        private: sanitizeTimer(undefined, "private timer", defaults.private, allowTimer)
      };
    }
    return clean;
  }

  function sanitizeWinnerSelection(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 100) throw handoffError("invalid-winners", "game.winnerSelection is invalid.");
    const clean = value.map((item, index) => boundedString(item, `game.winnerSelection[${index}]`, 80));
    return [...new Set(clean)];
  }

  function sanitizeEmailTimes(value) {
    if (value === undefined || value === null) return {};
    if (!isRecord(value) || Object.keys(value).length > 100) throw handoffError("invalid-event-times", "game.emailEventTimes is invalid.");
    const clean = {};
    for (const [key, time] of Object.entries(value)) {
      const cleanKey = boundedString(key, "email event key", 160);
      if (!isValidEmailInstanceKey(cleanKey)) {
        throw handoffError("invalid-event-key", "An email event key is invalid.");
      }
      clean[cleanKey] = isoTimestamp(time, `game.emailEventTimes.${cleanKey}`);
    }
    return clean;
  }

  function sanitizeStringList(value, path, maximumItems, maximumLength) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > maximumItems) throw handoffError("invalid-list", `${path} is invalid.`);
    return [...new Set(value.map((item, index) => boundedString(item, `${path}[${index}]`, maximumLength)))];
  }

  function sanitizeEmailKeys(value) {
    const keys = sanitizeStringList(value, "game.emailDispatchedKeys", 100, 160);
    if (keys.some(key => !isValidEmailInstanceKey(key))) {
      throw handoffError("invalid-event-key", "An email dispatch key is invalid.");
    }
    return keys;
  }

  function sanitizePendingEmails(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 100) throw handoffError("invalid-pending-emails", "game.pendingEmails is invalid.");
    const allowed = new Set(["eventType", "instanceKey", "occurredAt"]);
    return value.map((entry, index) => {
      rejectUnknownKeys(entry, allowed, `game.pendingEmails[${index}]`);
      const eventType = boundedString(entry.eventType, `game.pendingEmails[${index}].eventType`, 40);
      if (!["game-start", "night-complete", "game-end"].includes(eventType)) {
        throw handoffError("invalid-email-event", "A pending email event type is invalid.");
      }
      const instanceKey = boundedString(entry.instanceKey, `game.pendingEmails[${index}].instanceKey`, 160);
      const escapedEvent = eventType === "night-complete" ? "night-complete:[1-9]\\d{0,3}" : eventType;
      const validInstance = new RegExp(`^(?:[^:\\r\\n]{1,120}:)?${escapedEvent}$`).test(instanceKey);
      if (!validInstance) throw handoffError("invalid-event-key", "A pending email instance key is invalid.");
      return { eventType, instanceKey, occurredAt: isoTimestamp(entry.occurredAt, `game.pendingEmails[${index}].occurredAt`) };
    });
  }

  function isValidEmailInstanceKey(value) {
    return /^(?:[^:\r\n]{1,120}:)?(?:game-start|game-end|night-complete:[1-9]\d{0,3})$/.test(value);
  }

  function isoTimestamp(value, path) {
    const text = boundedString(value, path, 40);
    const milliseconds = Date.parse(text);
    if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
      throw handoffError("invalid-timestamp", `${path} must be an ISO timestamp.`);
    }
    return text;
  }

  function sanitizeGame(game, scriptId, capturedAt, options) {
    rejectUnknownKeys(game, GAME_KEYS, "game");
    if (game.scriptId !== undefined && game.scriptId !== scriptId) {
      throw handoffError("script-mismatch", "The handoff contains conflicting script identifiers.");
    }
    const range = scriptRange(scriptId);
    const playerCount = finiteInteger(game.playerCount, "game.playerCount", range.min, range.max);
    const characters = getCharacters(scriptId, options);
    const dayNum = finiteInteger(game.dayNum, "game.dayNum", 1, HANDOFF_LIMITS.maxDay, 1);
    const phase = game.phase === undefined ? "night" : game.phase;
    if (!["night", "day"].includes(phase)) throw handoffError("invalid-phase", "game.phase must be night or day.");
    const screen = game.screen === undefined ? "game" : game.screen;
    if (!["count", "names", "roles", "reveal", "game", "victory"].includes(screen)) {
      throw handoffError("invalid-screen", "game.screen cannot be restored.");
    }
    const requestedTab = game.tab === undefined ? (phase === "night" ? "night" : "day") : game.tab;
    if (!["grimoire", "night", "day", "timer", "chronicle"].includes(requestedTab)) throw handoffError("invalid-tab", "game.tab is invalid.");
    const tab = ["grimoire", "chronicle"].includes(requestedTab)
      ? requestedTab
      : (phase === "night" ? "night" : (requestedTab === "timer" ? "timer" : "day"));
    const names = sanitizeNames(game.names, playerCount);
    const assignments = sanitizeAssignments(game.assignments, playerCount, characters);
    const alignments = sanitizeAlignments(game.alignments, playerCount, assignments, characters, scriptId);
    const rolePool = sanitizeRolePool(game.rolePool, assignments, playerCount, characters);
    const timerTotal = normalizeTimerDuration(game.timerTotal, 300);
    const timerSecondsAtCapture = finiteInteger(game.timerSeconds, "game.timerSeconds", 0, HANDOFF_LIMITS.maxTimerSeconds, timerTotal);
    const timerRunning = booleanValue(game.timerRunning, "game.timerRunning", false);
    const deadline = game.timerDeadline === undefined || game.timerDeadline === null
      ? null
      : finiteInteger(game.timerDeadline, "game.timerDeadline", 0, Number.MAX_SAFE_INTEGER);
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const timerSeconds = timerRunning && deadline !== null
      ? Math.max(0, Math.min(timerTotal, Math.ceil((deadline - now) / 1000)))
      : Math.min(timerTotal, timerSecondsAtCapture);
    const defaults = sanitizeTimerDefaults(game.discussionTimerDefaults, timerTotal);
    const allowTimer = scriptId !== "uw";
    const hadCurrentTimerSession = isRecord(game.discussionTimerSessions)
      && own(game.discussionTimerSessions, String(dayNum));
    const sessions = sanitizeTimerSessions(game.discussionTimerSessions, defaults, dayNum, allowTimer);
    const activeDiscussionType = game.activeDiscussionType === undefined ? "public" : game.activeDiscussionType;
    if (!["public", "private"].includes(activeDiscussionType)) throw handoffError("invalid-timer-type", "game.activeDiscussionType is invalid.");
    if (phase === "day" || hadCurrentTimerSession) {
      sessions[String(dayNum)][activeDiscussionType].remainingSeconds = timerSeconds;
      sessions[String(dayNum)][activeDiscussionType].durationSeconds = timerTotal;
    }

    const savedAt = game._saved === undefined
      ? capturedAt
      : finiteInteger(game._saved, "game._saved", 0, Number.MAX_SAFE_INTEGER, capturedAt);
    const winTeam = game.winTeam === undefined || game.winTeam === null ? null : game.winTeam;
    const allowedWinTeams = scriptId === "uw" ? ["manual"] : ["good", "evil"];
    if (winTeam !== null && !allowedWinTeams.includes(winTeam)) throw handoffError("invalid-winner", "game.winTeam is invalid.");

    const alive = sanitizeSeatBooleanMap(game.alive, playerCount, "game.alive", true);
    const rawRegisteredDead = sanitizeSeatBooleanMap(game.registeredDead, playerCount, "game.registeredDead", false);
    const registeredDead = Object.fromEntries(Array.from({ length: playerCount }, (_, seat) => [
      seat,
      scriptId === "bmr"
        && assignments[seat] === "zombuul"
        && alive[seat] !== false
        && rawRegisteredDead[seat] === true
    ]));
    const hasPo = scriptId === "bmr" && Object.values(assignments).includes("po");
    const pendingMoonchildIndexes = scriptId === "bmr"
      ? sanitizeSeatList(game.pendingMoonchildIndexes, playerCount, "game.pendingMoonchildIndexes")
        .filter(seat => assignments[seat] === "moonchild")
      : [];
    const hasVigormortis = scriptId === "sv" && Object.values(assignments).includes("vigormortis");
    const vigormortisRetainedMinions = hasVigormortis
      ? sanitizeSeatList(game.vigormortisRetainedMinions, playerCount, "game.vigormortisRetainedMinions")
        .filter(seat => alive[seat] === false && characters[assignments[seat]]?.type === "minion")
      : [];
    const rawPermanentPoison = sanitizeSeatBooleanMap(game.permanentlyPoisoned, playerCount, "game.permanentlyPoisoned", false);
    const permanentlyPoisoned = Object.fromEntries(Array.from({ length: playerCount }, (_, seat) => [
      seat,
      scriptId === "sv" && rawPermanentPoison[seat] === true
    ]));
    const rawGainedAbilities = sanitizeRoleMap(game.gainedAbilities, playerCount, characters, "game.gainedAbilities");
    const gainedAbilities = Object.fromEntries(Object.entries(rawGainedAbilities).filter(([seat, roleId]) => (
      scriptId === "sv"
      && assignments[seat] === "philosopher"
      && ["townsfolk", "outsider"].includes(characters[roleId]?.type)
    )));
    const fangGuCount = Object.values(assignments).filter(roleId => roleId === "fanggu").length;
    const rawFangGuJumpUsed = booleanValue(game.fangGuJumpUsed, "game.fangGuJumpUsed", false);
    const rawLunaticBeliefs = sanitizeRoleMap(game.lunaticBelievedRoles, playerCount, characters, "game.lunaticBelievedRoles");
    const lunaticBelievedRoles = Object.fromEntries(Object.entries(rawLunaticBeliefs).filter(([seat, roleId]) => (
      scriptId === "bmr" && assignments[seat] === "lunatic" && characters?.[roleId]?.type === "demon"
    )));
    const rawLunaticPoCharged = sanitizeSeatBooleanMap(game.lunaticPoCharged, playerCount, "game.lunaticPoCharged", false);
    const lunaticPoCharged = Object.fromEntries(Array.from({ length: playerCount }, (_, seat) => [
      seat,
      scriptId === "bmr" && lunaticBelievedRoles[seat] === "po" && rawLunaticPoCharged[seat] === true
    ]));
    const sessionId = game.sessionId === undefined || game.sessionId === null
      ? null
      : boundedString(game.sessionId, "game.sessionId", 120);
    if (sessionId !== null && !/^[A-Za-z0-9._-]+$/.test(sessionId)) {
      throw handoffError("invalid-session-id", "game.sessionId contains unsupported characters.");
    }

    return {
      _saved: savedAt,
      screen,
      scriptId,
      playerCount,
      dist: sanitizeDistribution(game.dist, scriptId, playerCount),
      names,
      rolePool,
      assignments,
      alignments,
      setupChoices: sanitizeSetupChoices(game.setupChoices, scriptId),
      drunkBelievedRoles: sanitizeRoleMap(game.drunkBelievedRoles, playerCount, characters, "game.drunkBelievedRoles"),
      lunaticBelievedRoles,
      lunaticPoCharged,
      redHerringIndex: nullableSeat(game.redHerringIndex, "game.redHerringIndex", playerCount),
      roleEntryIndex: finiteInteger(game.roleEntryIndex, "game.roleEntryIndex", 0, playerCount, 0),
      revealIndex: finiteInteger(game.revealIndex, "game.revealIndex", 0, playerCount, 0),
      revealCovered: booleanValue(game.revealCovered, "game.revealCovered", true),
      dayNum,
      phase,
      activeWakeIdx: finiteInteger(game.activeWakeIdx, "game.activeWakeIdx", 0, HANDOFF_LIMITS.maxWakeIndex, 0),
      nightLog: sanitizeNightLog(game.nightLog, playerCount, characters),
      alive,
      registeredDead,
      nominations: sanitizeNominations(game.nominations, playerCount),
      votes: sanitizeVotes(game.votes, playerCount),
      ghostVotes: sanitizeSeatBooleanMap(game.ghostVotes, playerCount, "game.ghostVotes", false),
      deathsLastNight: sanitizeSeatList(game.deathsLastNight, playerCount, "game.deathsLastNight"),
      deathsToday: sanitizeSeatList(game.deathsToday, playerCount, "game.deathsToday"),
      poisonedIndex: scriptId === "tb" ? nullableSeat(game.poisonedIndex, "game.poisonedIndex", playerCount) : null,
      nightProtected: sanitizeSeatList(game.nightProtected, playerCount, "game.nightProtected"),
      executedTodayIndex: nullableSeat(game.executedTodayIndex, "game.executedTodayIndex", playerCount),
      usedAbilities: sanitizeUsedAbilities(game.usedAbilities, playerCount, characters),
      poCharged: hasPo && booleanValue(game.poCharged, "game.poCharged", false),
      pendingMoonchildIndexes,
      vigormortisRetainedMinions,
      previousNightTargets: sanitizePreviousNightTargets(game.previousNightTargets, playerCount, assignments, characters, scriptId),
      courtierEffect: sanitizeCourtierEffect(game.courtierEffect, characters, scriptId),
      permanentlyPoisoned,
      gainedAbilities,
      fangGuJumpUsed: scriptId === "sv" && fangGuCount > 0 && rawFangGuJumpUsed,
      chronicle: sanitizeChronicle(game.chronicle),
      winTeam,
      winnerSelection: sanitizeWinnerSelection(game.winnerSelection),
      sessionId,
      emailEventTimes: sanitizeEmailTimes(game.emailEventTimes),
      emailDispatchedKeys: sanitizeEmailKeys(game.emailDispatchedKeys),
      pendingEmails: sanitizePendingEmails(game.pendingEmails),
      timerSeconds,
      timerTotal,
      timerRunning: false,
      timerDeadline: null,
      discussionTimerDefaults: defaults,
      discussionTimerSessions: sessions,
      activeDiscussionType,
      tab
    };
  }

  function sanitizeHandoffSnapshot(input, options = {}) {
    if (!isRecord(input)) throw handoffError("invalid-envelope", "Handoff data must be an object.");
    const version = input.v;
    const allowedEnvelope = version === 1
      ? new Set(["kind", "v", "scriptId", "game"])
      : new Set(["kind", "v", "scriptId", "capturedAt", "game"]);
    rejectUnknownKeys(input, allowedEnvelope, "handoff");
    if (input.kind !== HANDOFF_KIND) throw handoffError("wrong-kind", "This is not a Grimoire handoff.");
    if (version !== 1 && version !== HANDOFF_VERSION) throw handoffError("unsupported-version", "This handoff version is not supported.");
    if (!isRecord(input.game)) throw handoffError("missing-game", "Handoff data is missing the game snapshot.");
    const topScript = input.scriptId;
    const gameScript = input.game.scriptId;
    const scriptId = boundedString(topScript ?? gameScript, "handoff.scriptId", 8).toLowerCase();
    if (!HANDOFF_SCRIPT_IDS.includes(scriptId)) throw handoffError("unsupported-script", "This script is not supported for handoff.");
    if (version === 1 && scriptId !== "tb") throw handoffError("legacy-script", "Version 1 handoffs support Trouble Brewing only.");
    if (topScript !== undefined && gameScript !== undefined && topScript !== gameScript) {
      throw handoffError("script-mismatch", "The handoff contains conflicting script identifiers.");
    }
    const capturedAt = version === 1
      ? finiteInteger(input.game._saved, "game._saved", 0, Number.MAX_SAFE_INTEGER, Date.now())
      : finiteInteger(input.capturedAt, "handoff.capturedAt", 0, Number.MAX_SAFE_INTEGER, Date.now());
    return {
      kind: HANDOFF_KIND,
      v: HANDOFF_VERSION,
      scriptId,
      capturedAt,
      game: sanitizeGame(input.game, scriptId, capturedAt, options)
    };
  }

  function bytesToBase64Url(bytes) {
    let base64;
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(bytes).toString("base64");
    } else {
      let binary = "";
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      base64 = btoa(binary);
    }
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value, maximumBytes = HANDOFF_LIMITS.maxEncodedBytes) {
    if (typeof value !== "string" || !value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw handoffError("invalid-base64", "The handoff encoding is invalid.");
    }
    if (value.length > Math.ceil(maximumBytes * 4 / 3) + 4) throw handoffError("encoded-too-large", "The handoff payload is too large.");
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    try {
      if (typeof Buffer !== "undefined") {
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length > maximumBytes) throw handoffError("encoded-too-large", "The handoff payload is too large.");
        return new Uint8Array(buffer);
      }
      const binary = atob(base64);
      if (binary.length > maximumBytes) throw handoffError("encoded-too-large", "The handoff payload is too large.");
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (error) {
      if (error?.code) throw error;
      throw handoffError("invalid-base64", "The handoff encoding is invalid.");
    }
  }

  function legacyBase64ToBytes(value) {
    if (typeof value !== "string" || !value || value.length > Math.ceil(HANDOFF_LIMITS.maxEncodedBytes * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
      throw handoffError("invalid-base64", "The legacy handoff encoding is invalid.");
    }
    try {
      if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
      const binary = atob(value);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (error) {
      throw handoffError("invalid-base64", "The legacy handoff encoding is invalid.");
    }
  }

  async function readStreamWithLimit(stream, maximumBytes) {
    const reader = stream.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        const chunk = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value);
        length += chunk.length;
        if (length > maximumBytes) {
          await reader.cancel();
          throw handoffError("decoded-too-large", "The expanded handoff is too large.");
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  async function gzipBytes(bytes) {
    if (typeof CompressionStream === "undefined") return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    return readStreamWithLimit(stream, HANDOFF_LIMITS.maxEncodedBytes);
  }

  async function gunzipBytes(bytes) {
    if (typeof DecompressionStream === "undefined") throw handoffError("decompression-unavailable", "This browser cannot open a compressed handoff.");
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return await readStreamWithLimit(stream, HANDOFF_LIMITS.maxDecodedBytes);
    } catch (error) {
      if (error?.code) throw error;
      throw handoffError("invalid-compression", "The compressed handoff is invalid.");
    }
  }

  function decodeUtf8(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      throw handoffError("invalid-text-encoding", "The handoff text encoding is invalid.");
    }
  }

  function hashPayload(value) {
    const bytes = new TextEncoder().encode(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (const byte of bytes) {
      first ^= byte;
      first = Math.imul(first, 0x01000193) >>> 0;
      second ^= byte + ((second << 6) >>> 0) + (second >>> 2);
      second = Math.imul(second, 0x85ebca6b) >>> 0;
    }
    return first.toString(16).padStart(8, "0") + second.toString(16).padStart(8, "0");
  }

  async function encodeHandoffPayload(snapshot, options = {}) {
    const clean = sanitizeHandoffSnapshot(snapshot, options);
    const json = JSON.stringify(clean);
    const raw = new TextEncoder().encode(json);
    if (raw.length > HANDOFF_LIMITS.maxDecodedBytes) throw handoffError("snapshot-too-large", "The handoff snapshot is too large.");
    let compressed = null;
    if (options.compress !== false) {
      try { compressed = await gzipBytes(raw); } catch (error) { compressed = null; }
    }
    if (compressed && compressed.length < raw.length) return V2_GZIP_PREFIX + bytesToBase64Url(compressed);
    return V2_JSON_PREFIX + bytesToBase64Url(raw);
  }

  async function parseJsonSnapshot(json, options) {
    if (utf8ByteLength(json) > HANDOFF_LIMITS.maxDecodedBytes) throw handoffError("snapshot-too-large", "The handoff snapshot is too large.");
    let parsed;
    try { parsed = JSON.parse(json); } catch (error) { throw handoffError("invalid-json", "The handoff JSON is invalid."); }
    return sanitizeHandoffSnapshot(parsed, options);
  }

  function extractHandoffToken(raw) {
    if (typeof raw !== "string") throw handoffError("invalid-input", "Handoff input must be text.");
    const text = raw.trim();
    if (!text) throw handoffError("empty-input", "No handoff data was found.");
    if (utf8ByteLength(text) > HANDOFF_LIMITS.maxRawBytes) throw handoffError("input-too-large", "The handoff input is too large.");
    const fragmentMarkers = ["#handoff=", "#handoff-part="];
    const fragmentMatch = fragmentMarkers
      .map(marker => ({ marker, index: text.indexOf(marker) }))
      .filter(item => item.index >= 0)
      .sort((left, right) => left.index - right.index)[0];
    if (fragmentMatch) {
      const fragment = text.slice(fragmentMatch.index + 1);
      const pair = fragment.split("&").find(item => item.startsWith("handoff=") || item.startsWith("handoff-part="));
      if (!pair) throw handoffError("missing-fragment", "The link does not contain a handoff.");
      const separator = pair.indexOf("=");
      try { return decodeURIComponent(pair.slice(separator + 1)); }
      catch (error) { throw handoffError("invalid-fragment", "The handoff link is malformed."); }
    }
    if (text.startsWith("handoff=") || text.startsWith("handoff-part=")) {
      const separator = text.indexOf("=");
      try { return decodeURIComponent(text.slice(separator + 1)); }
      catch (error) { throw handoffError("invalid-fragment", "The handoff link is malformed."); }
    }
    return text;
  }

  function createMultipartCollector(options = {}) {
    let active = null;
    const maximumParts = finiteInteger(options.maxParts, "maxParts", 1, HANDOFF_LIMITS.maxParts, HANDOFF_LIMITS.maxParts);

    function importState(saved) {
      if (saved === undefined || saved === null) return;
      if (!isRecord(saved)) throw handoffError("invalid-part-state", "Saved handoff parts are invalid.");
      rejectUnknownKeys(saved, new Set(["version", "transferId", "total", "digest", "parts"]), "parts");
      const version = saved.version === 1 ? 1 : 2;
      const transferId = boundedString(saved.transferId, "parts.transferId", 32);
      const total = finiteInteger(saved.total, "parts.total", 1, maximumParts);
      const digest = version === 2 ? boundedString(saved.digest, "parts.digest", 16) : "";
      if (version === 2 && !/^[0-9a-f]{16}$/.test(digest)) throw handoffError("invalid-digest", "Saved handoff parts are invalid.");
      if (!isRecord(saved.parts)) throw handoffError("invalid-part-state", "Saved handoff parts are invalid.");
      const parts = {};
      for (const [key, value] of Object.entries(saved.parts)) {
        const index = finiteInteger(Number(key), `parts.${key}`, 1, total);
        if (String(index) !== key) throw handoffError("invalid-part-index", "Saved handoff parts are invalid.");
        parts[index] = boundedString(value, `parts.${key}`, HANDOFF_LIMITS.qrPartBytes, { trim: false });
      }
      active = { version, transferId, total, digest, parts };
    }

    function reset() {
      active = null;
    }

    function parsePart(token) {
      if (token.startsWith(V2_PART_PREFIX)) {
        const match = token.match(/^BOTCP2\.([A-Za-z0-9_-]{8,32})\.(\d{1,3})\.(\d{1,3})\.([0-9a-f]{16})\.(.+)$/s);
        if (!match) throw handoffError("invalid-part", "This handoff QR part is invalid.");
        return {
          version: 2,
          transferId: match[1],
          index: Number(match[2]),
          total: Number(match[3]),
          digest: match[4],
          chunk: match[5]
        };
      }
      if (token.startsWith(V1_PART_PREFIX)) {
        const match = token.match(/^BOTCP:(\d{1,3})\/(\d{1,3}):(.*)$/s);
        if (!match) throw handoffError("invalid-part", "This legacy handoff QR part is invalid.");
        return {
          version: 1,
          transferId: "legacy-v1",
          index: Number(match[1]),
          total: Number(match[2]),
          digest: "",
          chunk: match[3]
        };
      }
      return null;
    }

    function add(token) {
      const part = parsePart(token);
      if (!part) return { complete: true, payload: token, received: 1, total: 1 };
      if (!Number.isInteger(part.index) || !Number.isInteger(part.total) || part.total < 1 || part.total > maximumParts || part.index < 1 || part.index > part.total) {
        throw handoffError("invalid-part-range", "The handoff QR part number is invalid.");
      }
      if (!part.chunk || utf8ByteLength(part.chunk) > HANDOFF_LIMITS.qrPartBytes) {
        throw handoffError("invalid-part-size", "The handoff QR part is empty or too large.");
      }
      if (!active) active = { version: part.version, transferId: part.transferId, total: part.total, digest: part.digest, parts: {} };
      if (active.version !== part.version || active.transferId !== part.transferId || active.total !== part.total || active.digest !== part.digest) {
        throw handoffError("mixed-transfer", "This QR belongs to a different handoff. Cancel and start again.");
      }
      if (own(active.parts, String(part.index)) && active.parts[part.index] !== part.chunk) {
        throw handoffError("conflicting-part", "This QR conflicts with an earlier part.");
      }
      active.parts[part.index] = part.chunk;
      const received = Object.keys(active.parts).length;
      if (received < active.total) return { complete: false, payload: null, received, total: active.total };
      let payload = "";
      for (let index = 1; index <= active.total; index++) {
        if (!own(active.parts, String(index))) throw handoffError("missing-part", "A handoff QR part is missing.");
        payload += active.parts[index];
        if (utf8ByteLength(payload) > HANDOFF_LIMITS.maxRawBytes) throw handoffError("encoded-too-large", "The handoff payload is too large.");
      }
      if (active.version === 2 && hashPayload(payload) !== active.digest) {
        throw handoffError("digest-mismatch", "The handoff QR parts did not pass the integrity check.");
      }
      const total = active.total;
      reset();
      return { complete: true, payload, received: total, total };
    }

    function getProgress() {
      if (!active) return null;
      return {
        transferId: active.transferId,
        received: Object.keys(active.parts).length,
        total: active.total,
        parts: { ...active.parts }
      };
    }

    function exportState() {
      if (!active) return null;
      return {
        version: active.version,
        transferId: active.transferId,
        total: active.total,
        digest: active.digest,
        parts: { ...active.parts }
      };
    }

    importState(options.state);
    return Object.freeze({ add, reset, getProgress, exportState });
  }

  async function decodeHandoffPayload(raw, options = {}) {
    const token = extractHandoffToken(raw);
    const collector = options.collector || createMultipartCollector(options);
    const collected = collector.add(token);
    if (!collected.complete) return null;
    const payload = collected.payload;
    let json;
    if (payload.startsWith(V2_GZIP_PREFIX)) {
      const bytes = base64UrlToBytes(payload.slice(V2_GZIP_PREFIX.length));
      json = decodeUtf8(await gunzipBytes(bytes));
    } else if (payload.startsWith(V2_JSON_PREFIX)) {
      json = decodeUtf8(base64UrlToBytes(payload.slice(V2_JSON_PREFIX.length), HANDOFF_LIMITS.maxDecodedBytes));
    } else if (payload.startsWith(V1_COMPRESSED_PREFIX)) {
      json = decodeUtf8(await gunzipBytes(legacyBase64ToBytes(payload.slice(V1_COMPRESSED_PREFIX.length))));
    } else if (payload.startsWith("{")) {
      json = payload;
    } else {
      throw handoffError("unknown-encoding", "This handoff encoding is not supported.");
    }
    return parseJsonSnapshot(json, options);
  }

  function baseUrlWithoutFragment(value) {
    const fallback = "https://grimoire.invalid/";
    const raw = typeof value === "string" && value ? value : fallback;
    const index = raw.indexOf("#");
    return index >= 0 ? raw.slice(0, index) : raw;
  }

  function takeoverUrlForPayload(payload, baseUrl, fragmentKey = "handoff") {
    return `${baseUrlWithoutFragment(baseUrl)}#${fragmentKey}=${encodeURIComponent(payload)}`;
  }

  async function buildTakeoverUrl(snapshot, options = {}) {
    const payload = await encodeHandoffPayload(snapshot, options);
    const url = takeoverUrlForPayload(payload, options.baseUrl);
    if (utf8ByteLength(url) > HANDOFF_LIMITS.maxRawBytes) throw handoffError("url-too-large", "The takeover link is too large.");
    return url;
  }

  function sanitizeTransferId(value, digest) {
    if (value === undefined || value === null) {
      const random = new Uint8Array(4);
      if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(random);
      } else {
        const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
        for (let index = 0; index < random.length; index++) random[index] = (seed >>> (index * 8)) & 0xff;
      }
      const suffix = Array.from(random, byte => byte.toString(16).padStart(2, "0")).join("");
      return `h${digest.slice(0, 8)}${suffix}`;
    }
    const clean = boundedString(value, "transferId", 32);
    if (!/^[A-Za-z0-9_-]{8,32}$/.test(clean)) throw handoffError("invalid-transfer-id", "The transfer id is invalid.");
    return clean;
  }

  function splitHandoffChunks(payload, options = {}) {
    if (typeof payload !== "string" || !/^[\x20-\x7E]+$/.test(payload)) {
      throw handoffError("invalid-encoded-payload", "QR payloads must use the encoded handoff format.");
    }
    const maximumBytes = finiteInteger(options.maxPartBytes, "maxPartBytes", 256, 2953, HANDOFF_LIMITS.qrPartBytes);
    const baseUrl = baseUrlWithoutFragment(options.baseUrl);
    const single = takeoverUrlForPayload(payload, baseUrl);
    if (utf8ByteLength(single) <= maximumBytes) return [single];
    const digest = hashPayload(payload);
    const transferId = sanitizeTransferId(options.transferId, digest);
    let total = 2;
    let chunkSize = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const digits = String(total).length;
      const sampleHeader = `${V2_PART_PREFIX}${transferId}.${"9".repeat(digits)}.${"9".repeat(digits)}.${digest}.`;
      chunkSize = maximumBytes - utf8ByteLength(takeoverUrlForPayload(sampleHeader, baseUrl, "handoff-part"));
      if (chunkSize < 32) throw handoffError("qr-base-too-long", "The page address leaves too little room for QR data.");
      const nextTotal = Math.ceil(payload.length / chunkSize);
      if (nextTotal === total) break;
      total = nextTotal;
    }
    if (total < 2 || total > HANDOFF_LIMITS.maxParts) throw handoffError("too-many-parts", "This handoff needs too many QR codes.");
    const parts = [];
    for (let index = 1; index <= total; index++) {
      const chunk = payload.slice((index - 1) * chunkSize, index * chunkSize);
      const token = `${V2_PART_PREFIX}${transferId}.${index}.${total}.${digest}.${chunk}`;
      const url = takeoverUrlForPayload(token, baseUrl, "handoff-part");
      if (utf8ByteLength(url) > maximumBytes) throw handoffError("part-too-large", "A generated QR part exceeds the configured limit.");
      parts.push(url);
    }
    return parts;
  }

  async function buildHandoffQrParts(snapshot, options = {}) {
    const payload = await encodeHandoffPayload(snapshot, options);
    return splitHandoffChunks(payload, options);
  }

  function createTakeoverState(currentState, snapshot, options = {}) {
    const clean = sanitizeHandoffSnapshot(snapshot, options);
    const next = {
      ...(isRecord(currentState) ? currentState : {}),
      ...clean.game,
      scriptId: clean.scriptId,
      nameInput: "",
      drawerOpen: false,
      confirm: null,
      showCard: null,
      toast: null,
      showResume: false,
      showHandoffGive: false,
      showWinnerPicker: false,
      timerRunning: false,
      timerIntervalId: null,
      timerDeadline: null,
      timerSessionDay: clean.game.dayNum,
      expandedPlayer: -1,
      handoffReturnScreen: null
    };
    if (typeof options.clearHistory === "function") options.clearHistory();
    return next;
  }

  return Object.freeze({
    HANDOFF_KIND,
    HANDOFF_VERSION,
    HANDOFF_SCRIPT_IDS,
    HANDOFF_LIMITS,
    V1_COMPRESSED_PREFIX,
    V1_PART_PREFIX,
    V2_JSON_PREFIX,
    V2_GZIP_PREFIX,
    V2_PART_PREFIX,
    utf8ByteLength,
    sanitizeHandoffSnapshot,
    encodeHandoffPayload,
    decodeHandoffPayload,
    extractHandoffToken,
    createMultipartCollector,
    buildTakeoverUrl,
    splitHandoffChunks,
    buildHandoffQrParts,
    createTakeoverState,
    applyTakeoverState: createTakeoverState,
    hashPayload
  });
});
