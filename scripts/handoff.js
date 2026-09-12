// Host handoff: encode the live Trouble Brewing session as QR JSON and restore it on another device.
const HANDOFF_KIND = "botc-handoff";
const HANDOFF_VERSION = 1;
const HANDOFF_PREFIX_COMPRESSED = "BOTC1.";
const HANDOFF_CHUNK_PREFIX = "BOTCP:";
const HANDOFF_QR_SAFE_CHARS = 2200;
const HANDOFF_DISPATCH_LIMIT = 8500;

const handoffRuntime = {
  stream: null,
  scanTimer: null,
  cameraOn: false,
  parts: {},
  qrText: "",
  qrError: "",
  receiveMessage: "",
  receiveError: "",
  pendingSnapshot: null
};

function canGiveHandoff() {
  return state.scriptId === "tb"
    && state.screen === "game"
    && (state.dayNum > 1 || state.phase === "day");
}

function isHandoffMenuGame() {
  return state.scriptId === "tb" && (state.screen === "game" || state.screen === "reveal" || state.screen === "victory");
}

function getHandoffSnapshot(source = getSerializableState()) {
  return {
    kind: HANDOFF_KIND,
    v: HANDOFF_VERSION,
    scriptId: "tb",
    game: {
      ...source,
      scriptId: "tb",
      poisonedIndex: source.poisonedIndex ?? null
    }
  };
}

function utf8ByteLength(text) {
  return new TextEncoder().encode(text).length;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gzipToBase64(text) {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

async function gunzipFromBase64(value) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress a packed handoff.");
  }
  const stream = new Blob([base64ToBytes(value)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function splitHandoffChunks(payload) {
  if (payload.length <= HANDOFF_QR_SAFE_CHARS) return [payload];
  const overhead = `${HANDOFF_CHUNK_PREFIX}99/99:`.length;
  const chunkSize = HANDOFF_QR_SAFE_CHARS - overhead;
  const total = Math.ceil(payload.length / chunkSize);
  const parts = [];
  for (let i = 0; i < total; i++) {
    const slice = payload.slice(i * chunkSize, (i + 1) * chunkSize);
    parts.push(`${HANDOFF_CHUNK_PREFIX}${i + 1}/${total}:${slice}`);
  }
  return parts;
}

async function buildHandoffQrParts(snapshot = getHandoffSnapshot()) {
  const json = JSON.stringify(snapshot);
  let payload = json;
  try {
    if (utf8ByteLength(json) > HANDOFF_QR_SAFE_CHARS) {
      const packed = await gzipToBase64(json);
      if (packed) {
        const compressed = HANDOFF_PREFIX_COMPRESSED + packed;
        if (compressed.length < json.length) payload = compressed;
      }
    }
  } catch (error) {
    console.error("Handoff compression failed:", error);
  }
  return splitHandoffChunks(payload);
}

function currentPoisonedName(snapshot) {
  const poisonedIndex = snapshot.game?.poisonedIndex;
  if (poisonedIndex === null || poisonedIndex === undefined) return "None";
  return snapshot.game.names?.[poisonedIndex] ?? `Seat ${Number(poisonedIndex) + 1}`;
}

function buildHandoffEmailBody(snapshot) {
  const game = snapshot.game ?? {};
  const phaseLabel = game.phase === "night" ? `Night ${game.dayNum}` : `Day ${game.dayNum}`;
  const lines = [
    "Trouble Brewing host handoff",
    `Phase: ${phaseLabel}`,
    `Players: ${game.playerCount ?? (game.names ?? []).length}`,
    `Poisoned: ${currentPoisonedName(snapshot)}`,
    `Wake step: ${(game.activeWakeIdx ?? 0) + 1}`,
    "",
    "Open the Grimoire on the receiving device, then use Storyteller Menu → Receive Handoff and scan the attached QR.",
    "If the QR will not scan, the same payload is attached as text."
  ];
  return lines.join("\n");
}

async function dispatchRepositoryEvent(eventType, clientPayload) {
  const config = window.ROSTER_DISPATCH_CONFIG ?? {};
  const owner = config.owner ?? "AkshDesai04";
  const repo = config.repo ?? "BOTC_Master";
  const token = config.token ?? "";
  if (!token) {
    console.error("Email dispatch is not configured (missing token).");
    return false;
  }
  const serialized = JSON.stringify(clientPayload);
  if (utf8ByteLength(serialized) > HANDOFF_DISPATCH_LIMIT) {
    console.error("Dispatch payload exceeded the GitHub client_payload size limit.");
    return false;
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({
        event_type: eventType,
        client_payload: clientPayload
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Repository dispatch failed:", response.status, detail);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Repository dispatch error:", error);
    return false;
  }
}

function compactHandoffSource(sourceState) {
  return {
    ...sourceState,
    chronicle: (sourceState.chronicle ?? []).map(entry => ({
      ...entry,
      details: String(entry.details ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    }))
  };
}

async function dispatchHandoffEmail(sourceState = getSerializableState()) {
  if ((sourceState.scriptId ?? state.scriptId) !== "tb") return;
  let snapshot = getHandoffSnapshot(sourceState);
  let parts = await buildHandoffQrParts(snapshot);
  let payload = {
    subject: `TB handoff — ${snapshot.game.phase === "night" ? "Night" : "Day"} ${snapshot.game.dayNum}`,
    body: buildHandoffEmailBody(snapshot),
    handoffParts: parts
  };
  if (utf8ByteLength(JSON.stringify(payload)) > HANDOFF_DISPATCH_LIMIT) {
    snapshot = getHandoffSnapshot(compactHandoffSource(sourceState));
    parts = await buildHandoffQrParts(snapshot);
    payload = {
      subject: payload.subject,
      body: buildHandoffEmailBody(snapshot),
      handoffParts: parts
    };
  }
  const queued = await dispatchRepositoryEvent("send-handoff-email", payload);
  if (queued) showToast("Handoff QR email queued.", "success");
  else showToast("Handoff email could not be queued.", "error");
}

function renderHandoffMenuButtons() {
  const receiveBtn = `<button class="btn btn-blue" style="justify-content:flex-start" onclick="openReceiveHandoff()">📥 Receive Handoff</button>`;
  if (!isHandoffMenuGame()) return receiveBtn;
  const giveEnabled = canGiveHandoff();
  const giveBtn = giveEnabled
    ? `<button class="btn btn-blue" style="justify-content:flex-start" onclick="openGiveHandoff()">📤 Give Handoff</button>`
    : `<button class="btn btn-blue btn-disabled" style="justify-content:flex-start" disabled title="Available after Night 1 ends">📤 Give Handoff</button>
       <div style="font-size:11px;color:var(--text3);padding:0 4px">Give Handoff unlocks after Night 1 ends, including later nights.</div>`;
  return `${giveBtn}${receiveBtn}`;
}

function closeGiveHandoff() {
  state.showHandoffGive = false;
  handoffRuntime.qrText = "";
  handoffRuntime.qrError = "";
  render();
}

function paintGiveHandoffQr() {
  const canvas = document.getElementById("handoff-qr-canvas");
  const status = document.getElementById("handoff-qr-status");
  if (status) status.textContent = handoffRuntime.qrError;
  if (!canvas || !handoffRuntime.qrCache) return;
  canvas.width = handoffRuntime.qrCache.width;
  canvas.height = handoffRuntime.qrCache.height;
  canvas.style.width = handoffRuntime.qrCache.style.width;
  canvas.style.height = handoffRuntime.qrCache.style.height;
  canvas.getContext("2d").drawImage(handoffRuntime.qrCache, 0, 0);
}

async function openGiveHandoff() {
  state.drawerOpen = false;
  if (!canGiveHandoff()) {
    showToast("Give Handoff is available after Night 1 ends.", "error");
    return;
  }
  state.showHandoffGive = true;
  handoffRuntime.qrError = "";
  handoffRuntime.qrCache = null;
  render();
  try {
    const parts = await buildHandoffQrParts();
    handoffRuntime.qrText = parts[0] ?? "";
    if (parts.length > 1) {
      handoffRuntime.qrError = `This session needs ${parts.length} QR codes; showing part 1. Use JSON copy if scanning fails.`;
    }
    const offscreen = document.createElement("canvas");
    drawQrOnCanvas(offscreen, handoffRuntime.qrText, Math.min(320, Math.max(220, window.innerWidth - 96)));
    handoffRuntime.qrCache = offscreen;
    paintGiveHandoffQr();
  } catch (error) {
    console.error(error);
    handoffRuntime.qrError = error.message ?? "Could not build the handoff QR.";
    paintGiveHandoffQr();
  }
}

function downloadHandoffQr() {
  const source = handoffRuntime.qrCache || document.getElementById("handoff-qr-canvas");
  if (!source) return;
  const link = document.createElement("a");
  link.download = `botc-handoff-night${state.dayNum}.png`;
  link.href = source.toDataURL("image/png");
  link.click();
}

async function copyHandoffJson() {
  try {
    const json = JSON.stringify(getHandoffSnapshot());
    await navigator.clipboard.writeText(json);
    showToast("Handoff JSON copied.", "success");
  } catch (error) {
    showToast("Could not copy JSON. Download the QR instead.", "error");
  }
}

function renderGiveHandoffOverlay() {
  if (!state.showHandoffGive) return "";
  const phaseLabel = state.phase === "night" ? `Night ${state.dayNum}` : `Day ${state.dayNum}`;
  return `
    <div class="overlay" style="z-index:320" onclick="closeGiveHandoff()">
      <div class="handoff-card" onclick="event.stopPropagation()">
        <h3 style="font-family:var(--font-serif);font-size:24px;margin-bottom:6px">Give Handoff</h3>
        <p style="font-size:12px;color:var(--text3);margin-bottom:14px">
          Scan this QR on the receiving device. It contains the live Trouble Brewing session (${esc(phaseLabel)}), including players, roles, night steps, poison, and chronicle.
        </p>
        <div class="handoff-qr-wrap">
          <canvas id="handoff-qr-canvas" aria-label="Handoff QR code"></canvas>
        </div>
        <div id="handoff-qr-status" role="alert" style="font-size:12px;color:var(--orange);min-height:18px;margin:8px 0">${esc(handoffRuntime.qrError)}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="downloadHandoffQr()">Download QR image</button>
          <button class="btn btn-outline" onclick="copyHandoffJson()">Copy JSON</button>
          <button class="btn btn-outline" onclick="closeGiveHandoff()">Close</button>
        </div>
      </div>
    </div>
  `;
}

function stopHandoffScanner() {
  handoffRuntime.cameraOn = false;
  if (handoffRuntime.scanTimer) {
    clearTimeout(handoffRuntime.scanTimer);
    handoffRuntime.scanTimer = null;
  }
  if (handoffRuntime.stream) {
    handoffRuntime.stream.getTracks().forEach(track => track.stop());
    handoffRuntime.stream = null;
  }
  const video = document.getElementById("handoff-video");
  if (video) video.srcObject = null;
}

function openReceiveHandoff() {
  stopHandoffScanner();
  state.drawerOpen = false;
  state.showHandoffGive = false;
  state.showResume = false;
  state.handoffReturnScreen = state.screen === "handoffReceive" ? "select" : state.screen;
  state.screen = "handoffReceive";
  handoffRuntime.receiveMessage = "";
  handoffRuntime.receiveError = "";
  handoffRuntime.parts = {};
  render();
}

function closeReceiveHandoff() {
  stopHandoffScanner();
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
  if (!qrScanningSupported()) {
    throw new Error("QR scanning needs Chrome, Edge, or Safari. Upload or paste JSON instead.");
  }
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const codes = await detector.detect(source);
  return codes[0]?.rawValue ?? "";
}

async function assembleHandoffText(raw) {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("No QR data found.");
  if (text.startsWith(HANDOFF_CHUNK_PREFIX)) {
    const match = text.match(/^BOTCP:(\d+)\/(\d+):(.*)$/s);
    if (!match) throw new Error("This handoff QR part is invalid.");
    const index = Number(match[1]);
    const total = Number(match[2]);
    handoffRuntime.parts[index] = match[3];
    const received = Object.keys(handoffRuntime.parts).length;
    if (received < total) {
      handoffRuntime.receiveMessage = `Scanned part ${index} of ${total}. Scan the remaining QR${total - received === 1 ? "" : "s"}.`;
      render();
      return null;
    }
    let joined = "";
    for (let i = 1; i <= total; i++) {
      if (!handoffRuntime.parts[i]) throw new Error("A handoff QR part is missing.");
      joined += handoffRuntime.parts[i];
    }
    handoffRuntime.parts = {};
    return joined;
  }
  return text;
}

async function parseHandoffPayload(raw) {
  const assembled = await assembleHandoffText(raw);
  if (assembled === null) return null;
  let jsonText = assembled;
  if (assembled.startsWith(HANDOFF_PREFIX_COMPRESSED)) {
    jsonText = await gunzipFromBase64(assembled.slice(HANDOFF_PREFIX_COMPRESSED.length));
  }
  const snapshot = JSON.parse(jsonText);
  if (snapshot?.kind !== HANDOFF_KIND || snapshot?.v !== HANDOFF_VERSION) {
    throw new Error("This is not a Grimoire handoff QR.");
  }
  if ((snapshot.scriptId ?? snapshot.game?.scriptId) !== "tb") {
    throw new Error("Handoff currently supports Trouble Brewing only.");
  }
  if (!snapshot.game || !Array.isArray(snapshot.game.names)) {
    throw new Error("Handoff data is missing the game snapshot.");
  }
  return snapshot;
}

function commitHandoffSnapshot(snapshot) {
  stopTimer();
  stopHandoffScanner();
  const game = snapshot.game;
  state = {
    ...state,
    ...game,
    scriptId: "tb",
    drunkBelievedRoles: game.drunkBelievedRoles ?? {},
    redHerringIndex: game.redHerringIndex ?? null,
    poisonedIndex: game.poisonedIndex ?? null,
    nominations: game.nominations ?? [],
    winnerSelection: game.winnerSelection ?? [],
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
    discussionTimerDefaults: game.discussionTimerDefaults ?? null,
    discussionTimerSessions: game.discussionTimerSessions ?? {},
    activeDiscussionType: game.activeDiscussionType ?? "public",
    expandedPlayer: -1
  };
  normalizeDiscussionTimerState();
  if (!["game", "reveal", "victory", "roles"].includes(state.screen)) state.screen = "game";
  autoSave();
  render();
  showToast("Handoff received. The game is restored on this device.", "success");
}

function confirmPendingHandoff() {
  if (!handoffRuntime.pendingSnapshot) return;
  const snapshot = handoffRuntime.pendingSnapshot;
  handoffRuntime.pendingSnapshot = null;
  state.confirm = null;
  commitHandoffSnapshot(snapshot);
}

async function applyDecodedHandoff(raw) {
  const snapshot = await parseHandoffPayload(raw);
  if (!snapshot) return;
  if (hasReplaceableSession()) {
    handoffRuntime.pendingSnapshot = snapshot;
    state.confirm = {
      msg: "Replace the current session with the scanned Trouble Brewing game?",
      onYes: "confirmPendingHandoff"
    };
    stopHandoffScanner();
    render();
    return;
  }
  commitHandoffSnapshot(snapshot);
}

async function startHandoffCamera() {
  handoffRuntime.receiveError = "";
  if (!qrScanningSupported()) {
    handoffRuntime.receiveError = "Camera QR scanning needs Chrome, Edge, or Safari. Upload a QR image there, or paste JSON.";
    render();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    handoffRuntime.stream = stream;
    handoffRuntime.cameraOn = true;
    render();
  } catch (error) {
    console.error(error);
    handoffRuntime.cameraOn = false;
    handoffRuntime.receiveError = "Could not open the camera. Allow camera access or upload a QR image.";
    render();
  }
}

function scheduleHandoffScan() {
  if (handoffRuntime.scanTimer) clearTimeout(handoffRuntime.scanTimer);
  handoffRuntime.scanTimer = setTimeout(scanHandoffFrame, 220);
}

async function scanHandoffFrame() {
  if (!handoffRuntime.cameraOn || state.screen !== "handoffReceive") return;
  const video = document.getElementById("handoff-video");
  if (video && video.readyState >= 2) {
    try {
      const value = await detectQrValue(video);
      if (value) {
        try {
          await applyDecodedHandoff(value);
          return;
        } catch (error) {
          handoffRuntime.receiveError = error.message ?? "Could not read that QR.";
          render();
        }
      }
    } catch (error) {
      if (error.name !== "NotSupportedError") console.error(error);
    }
  }
  scheduleHandoffScan();
}

async function onHandoffFileSelected(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  handoffRuntime.receiveError = "";
  try {
    if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
      const text = await file.text();
      await applyDecodedHandoff(text);
      return;
    }
    const bitmap = await createImageBitmap(file);
    const value = await detectQrValue(bitmap);
    if (!value) throw new Error("No QR code was found in that image.");
    await applyDecodedHandoff(value);
  } catch (error) {
    console.error(error);
    handoffRuntime.receiveError = error.message ?? "Could not read that file.";
    render();
  }
}

async function applyPastedHandoff() {
  const area = document.getElementById("handoff-json-paste");
  const text = area?.value?.trim() ?? "";
  if (!text) {
    handoffRuntime.receiveError = "Paste the handoff JSON first.";
    render();
    return;
  }
  try {
    await applyDecodedHandoff(text);
  } catch (error) {
    handoffRuntime.receiveError = error.message ?? "Could not read that JSON.";
    render();
  }
}

function renderHandoffReceiveScreen() {
  const cameraHint = qrScanningSupported()
    ? "Point the camera at the other storyteller's QR, or upload a photo of it."
    : "This browser cannot decode a QR image. Use Chrome, Edge, or Safari, or paste the JSON copied from Give Handoff.";
  return `
    <div class="screen fade-in" style="padding-top:16px">
      <div style="margin-bottom:20px">
        <h2 style="font-family:var(--font-serif);font-size:28px;margin-bottom:4px">Receive Handoff</h2>
        <p style="color:var(--text3);font-size:13px">${esc(cameraHint)}</p>
      </div>
      ${handoffRuntime.cameraOn ? `
        <div class="handoff-video-wrap">
          <video id="handoff-video" autoplay playsinline muted></video>
        </div>
      ` : `
        <button class="btn btn-primary" onclick="startHandoffCamera()">📷 Open camera</button>
      `}
      <label class="btn btn-outline" style="margin-top:10px;cursor:pointer">
        Upload QR or JSON
        <input id="handoff-file-input" type="file" accept="image/*,.json,application/json" class="handoff-file-input" onchange="onHandoffFileSelected(this)">
      </label>
      <div style="margin-top:16px;text-align:left">
        <label for="handoff-json-paste" style="display:block;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Paste JSON</label>
        <textarea id="handoff-json-paste" class="input" rows="5" style="width:100%;resize:vertical" placeholder='{"kind":"botc-handoff", ...}'></textarea>
        <button class="btn btn-blue" style="margin-top:8px" onclick="applyPastedHandoff()">Apply pasted JSON</button>
      </div>
      ${handoffRuntime.receiveMessage ? `<div style="margin-top:12px;font-size:13px;color:var(--text2)">${esc(handoffRuntime.receiveMessage)}</div>` : ""}
      ${handoffRuntime.receiveError ? `<div role="alert" class="warn warn-orange" style="margin-top:12px">${esc(handoffRuntime.receiveError)}</div>` : ""}
      <button class="btn btn-outline" style="margin-top:18px" onclick="closeReceiveHandoff()">← Back</button>
    </div>
  `;
}

function afterRenderHandoff() {
  if (state.showHandoffGive) paintGiveHandoffQr();
  if (state.screen === "handoffReceive" && handoffRuntime.cameraOn) {
    const video = document.getElementById("handoff-video");
    if (video && handoffRuntime.stream) {
      video.srcObject = handoffRuntime.stream;
      video.play().then(() => scheduleHandoffScan()).catch(() => {});
    }
  }
}
