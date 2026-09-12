(function initializeEmailModule(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.BOTCEmail = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createEmailModule() {
  "use strict";

  const EMAIL_EVENT_TYPES = Object.freeze([
    "game-start",
    "night-complete",
    "game-end"
  ]);
  const EMAIL_EVENT_TYPE_SET = new Set(EMAIL_EVENT_TYPES);

  const EMAIL_LIMITS = Object.freeze({
    maxDispatchChars: 60000,
    maxHtmlChars: 48000,
    maxTextChars: 30000,
    maxPlayers: 75,
    maxResults: 12,
    maxWinners: 20,
    maxNotes: 12,
    maxHandoverUrls: 12,
    maxHandoverUrlChars: 2200,
    maxHandoverUrlTotalChars: 12000,
    maxHandoverJsonChars: 12000
  });

  const EVENT_DETAILS = Object.freeze({
    "game-start": Object.freeze({
      label: "Game Start",
      subjectSuffix: "game started",
      defaultSummary: "The game is ready. Keep this message as a concise reference for the current session."
    }),
    "night-complete": Object.freeze({
      label: "Night Complete",
      subjectSuffix: "night complete",
      defaultSummary: "The night sequence is complete. Review the recorded outcomes before beginning the day."
    }),
    "game-end": Object.freeze({
      label: "Game End",
      subjectSuffix: "game concluded",
      defaultSummary: "The game has concluded. The final result and recorded session details are below."
    })
  });

  const SCRIPT_ACCENTS = Object.freeze({
    tb: "#c53a40",
    bmr: "#e29a45",
    sv: "#aa7bd1"
  });

  const RESULT_TONES = Object.freeze({
    neutral: Object.freeze({ color: "#f1ece3", border: "#4a4542", background: "#1d1b1a" }),
    good: Object.freeze({ color: "#a8dda0", border: "#477b40", background: "#142014" }),
    bad: Object.freeze({ color: "#ef9b9f", border: "#96363b", background: "#241315" }),
    warning: Object.freeze({ color: "#f3c58d", border: "#9b6932", background: "#241b12" })
  });

  function normalizeInlineText(value, fallback = "", maxLength = 500) {
    const normalized = String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return (normalized || fallback).slice(0, maxLength);
  }

  function normalizeBlockText(value, fallback = "", maxLength = 12000) {
    const normalized = String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .split("\n")
      .map(line => line.replace(/[\t ]+/g, " ").trimEnd())
      .join("\n")
      .trim();
    return (normalized || fallback).slice(0, maxLength);
  }

  function normalizeInteger(value, fallback = 0, minimum = 0, maximum = 999) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
  }

  function normalizeIsoDate(value) {
    if (value === null || value === undefined || value === "") return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlWithBreaks(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function normalizeHandoverUrl(value) {
    if (value !== undefined && value !== null && value !== "" && typeof value !== "string") {
      throw new TypeError("Handover URLs must be strings.");
    }
    const candidate = normalizeInlineText(value, "", EMAIL_LIMITS.maxHandoverUrlChars + 1);
    if (!candidate) return "";

    if (candidate.length > EMAIL_LIMITS.maxHandoverUrlChars) {
      throw new RangeError(`Handover URLs must be ${EMAIL_LIMITS.maxHandoverUrlChars} characters or fewer.`);
    }

    try {
      const parsed = new URL(candidate);
      if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) return "";
      return parsed.href;
    } catch (_error) {
      return "";
    }
  }

  function canonicalize(value, ancestors = new WeakSet()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("Handover JSON may only contain finite numbers.");
      return value;
    }
    if (Array.isArray(value)) {
      if (ancestors.has(value)) throw new TypeError("Handover JSON must not contain circular references.");
      ancestors.add(value);
      const result = value.map(item => canonicalize(item, ancestors));
      ancestors.delete(value);
      return result;
    }
    if (typeof value === "object") {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError("Handover JSON must contain only plain objects and arrays.");
      }
      if (ancestors.has(value)) throw new TypeError("Handover JSON must not contain circular references.");
      ancestors.add(value);
      const result = Object.create(null);
      Object.keys(value).sort().forEach(key => {
        const item = value[key];
        if (item === undefined || typeof item === "function" || typeof item === "symbol") return;
        result[key] = canonicalize(item, ancestors);
      });
      ancestors.delete(value);
      return result;
    }
    throw new TypeError("Handover JSON contains an unsupported value.");
  }

  function normalizeHandoverJson(value) {
    if (value === null || value === undefined || value === "") return "";
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch (_error) {
        throw new TypeError("Handover JSON must be valid JSON.");
      }
    }
    const serialized = JSON.stringify(canonicalize(parsed), null, 2);
    if (serialized.length > EMAIL_LIMITS.maxHandoverJsonChars) {
      throw new RangeError(`Handover JSON must be ${EMAIL_LIMITS.maxHandoverJsonChars} characters or fewer.`);
    }
    return serialized;
  }

  function normalizeHandoverUrls(value, fallbackUrl = "") {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      throw new TypeError("Handover URLs must be an array.");
    }

    const source = Array.isArray(value) ? value : (fallbackUrl ? [fallbackUrl] : []);
    if (source.length > EMAIL_LIMITS.maxHandoverUrls) {
      throw new RangeError(`At most ${EMAIL_LIMITS.maxHandoverUrls} handover URLs may be included.`);
    }

    const urls = [];
    const seen = new Set();
    for (const candidate of source) {
      const url = normalizeHandoverUrl(candidate);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }

    const totalLength = urls.reduce((total, url) => total + url.length, 0);
    if (totalLength > EMAIL_LIMITS.maxHandoverUrlTotalChars) {
      throw new RangeError(`Handover URLs must total ${EMAIL_LIMITS.maxHandoverUrlTotalChars} characters or fewer.`);
    }
    return urls;
  }

  function normalizePlayers(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, EMAIL_LIMITS.maxPlayers).map((player, index) => {
      const source = player && typeof player === "object" ? player : { name: player };
      const seat = normalizeInteger(source.seat, index + 1, 1, 100);
      let status = normalizeInlineText(source.status, "", 32);
      if (typeof source.alive === "boolean") status = source.alive ? "Alive" : "Dead";
      return {
        seat,
        name: normalizeInlineText(source.name, `Player ${seat}`, 80),
        role: normalizeInlineText(source.role, "Not recorded", 80),
        alignment: normalizeInlineText(source.alignment, "", 32),
        status
      };
    }).sort((first, second) => first.seat - second.seat);
  }

  function normalizeResults(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, EMAIL_LIMITS.maxResults).map((result, index) => {
      const source = result && typeof result === "object" ? result : { value: result };
      const tone = Object.prototype.hasOwnProperty.call(RESULT_TONES, source.tone)
        ? source.tone
        : "neutral";
      return {
        label: normalizeInlineText(source.label, `Result ${index + 1}`, 120),
        value: normalizeBlockText(source.value, "Not recorded", 1200),
        tone
      };
    });
  }

  function normalizeWinners(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, EMAIL_LIMITS.maxWinners).map(winner => {
      const source = winner && typeof winner === "object" ? winner : { name: winner };
      return {
        name: normalizeInlineText(source.name, "Winner", 120),
        detail: normalizeInlineText(source.detail, "", 240)
      };
    });
  }

  function normalizeNotes(value) {
    if (!Array.isArray(value)) return [];
    return value
      .slice(0, EMAIL_LIMITS.maxNotes)
      .map(note => normalizeBlockText(note, "", 1200))
      .filter(Boolean);
  }

  function normalizeEmailPayload(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("Email payload must be an object.");
    }

    const eventType = normalizeInlineText(input.eventType, "", 40);
    if (!EMAIL_EVENT_TYPE_SET.has(eventType)) {
      throw new RangeError(`Unsupported email event type: ${eventType || "(empty)"}.`);
    }

    const scriptSource = input.script && typeof input.script === "object" ? input.script : {};
    const sessionSource = input.session && typeof input.session === "object" ? input.session : {};
    const handoverSource = input.handover && typeof input.handover === "object" ? input.handover : {};
    const players = normalizePlayers(input.players);
    const declaredPlayerCount = sessionSource.playerCount ?? input.playerCount;
    const playerCount = normalizeInteger(declaredPlayerCount, players.length, 0, 100);
    const primaryHandoverUrl = normalizeHandoverUrl(handoverSource.url ?? input.handoverUrl);
    const handoverUrls = normalizeHandoverUrls(
      handoverSource.urls ?? input.handoverUrls,
      primaryHandoverUrl
    );

    return {
      eventType,
      script: {
        id: normalizeInlineText(scriptSource.id ?? input.scriptId, "custom", 40).toLowerCase(),
        name: normalizeInlineText(scriptSource.name ?? input.scriptName, "Storyteller's Grimoire", 120)
      },
      session: {
        id: normalizeInlineText(sessionSource.id ?? input.sessionId, "", 160),
        phase: normalizeInlineText(sessionSource.phase ?? input.phase, "", 40),
        dayNumber: normalizeInteger(sessionSource.dayNumber ?? input.dayNumber ?? input.dayNum, 0, 0, 999),
        nightNumber: normalizeInteger(sessionSource.nightNumber ?? input.nightNumber ?? input.nightNum, 0, 0, 999),
        playerCount,
        occurredAt: normalizeIsoDate(sessionSource.occurredAt ?? input.occurredAt)
      },
      headline: normalizeInlineText(input.headline, "", 180),
      summary: normalizeBlockText(input.summary, "", 2000),
      players,
      results: normalizeResults(input.results),
      winners: normalizeWinners(input.winners),
      notes: normalizeNotes(input.notes),
      handover: {
        url: primaryHandoverUrl || (handoverUrls.length === 1 ? handoverUrls[0] : ""),
        urls: handoverUrls,
        json: normalizeHandoverJson(handoverSource.json ?? input.handoverJson)
      }
    };
  }

  function stableStringify(value) {
    return JSON.stringify(canonicalize(value));
  }

  function hashString(value) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      first ^= code;
      first = Math.imul(first, 0x01000193);
      second ^= code + 0x9e3779b9 + (second << 6) + (second >>> 2);
      second = Math.imul(second, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
  }

  function createIdempotencyKey(input) {
    const payload = normalizeEmailPayload(input);
    return `botc-${payload.eventType}-${hashString(stableStringify(payload))}`;
  }

  function eventHeadline(payload) {
    if (payload.headline) return payload.headline;
    if (payload.eventType === "night-complete") {
      return payload.session.nightNumber > 0
        ? `Night ${payload.session.nightNumber} is complete`
        : "The night is complete";
    }
    if (payload.eventType === "game-end") return `${payload.script.name} has concluded`;
    return `${payload.script.name} has started`;
  }

  function emailSubject(payload) {
    const detail = EVENT_DETAILS[payload.eventType];
    if (payload.eventType === "night-complete" && payload.session.nightNumber > 0) {
      return `${payload.script.name} — Night ${payload.session.nightNumber} complete`;
    }
    return `${payload.script.name} — ${detail.subjectSuffix}`;
  }

  function phaseLabel(payload) {
    const explicitPhase = payload.session.phase;
    if (explicitPhase) return explicitPhase;
    if (payload.eventType === "night-complete" && payload.session.nightNumber > 0) {
      return `Night ${payload.session.nightNumber}`;
    }
    if (payload.session.dayNumber > 0) return `Day ${payload.session.dayNumber}`;
    return "Not recorded";
  }

  function formatOccurredAt(value) {
    if (!value) return "";
    const date = new Date(value);
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    }).format(date) + " UTC";
  }

  function metadataCell(label, value) {
    return `
      <td class="stack-cell" width="50%" valign="top" style="padding:12px 14px;border:1px solid #35312f;background:#171717;">
        <div style="margin:0 0 4px;color:#9f918d;font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(label)}</div>
        <div style="margin:0;color:#f1ece3;font-size:15px;line-height:22px;font-weight:700;">${escapeHtml(value)}</div>
      </td>`;
  }

  function sectionHeading(title) {
    return `<h2 style="margin:0 0 12px;color:#f1ece3;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:28px;font-weight:600;">${escapeHtml(title)}</h2>`;
  }

  function renderRosterHtml(players, finalState = false) {
    if (players.length === 0) return "";
    const rows = players.map(player => {
      const details = [player.role, player.alignment].filter(Boolean).join(" · ");
      const status = player.status
        ? `<div style="margin-top:3px;color:${player.status.toLowerCase() === "dead" ? "#ef9b9f" : "#a8dda0"};font-size:11px;line-height:16px;font-weight:700;text-transform:uppercase;">${escapeHtml(player.status)}</div>`
        : "";
      return `
        <tr>
          <td width="42" valign="top" style="padding:11px 8px;border-top:1px solid #35312f;color:#c8bbb5;font-size:12px;line-height:18px;text-align:center;">${player.seat}</td>
          <td valign="top" style="padding:11px 8px;border-top:1px solid #35312f;color:#f1ece3;font-size:14px;line-height:20px;font-weight:700;">${escapeHtml(player.name)}</td>
          <td valign="top" style="padding:11px 8px;border-top:1px solid #35312f;color:#c8bbb5;font-size:13px;line-height:20px;">${escapeHtml(details || "Not recorded")}${finalState ? status : ""}</td>
        </tr>`;
    }).join("");

    return `
      <tr>
        <td style="padding:0 28px 26px;">
          ${sectionHeading(finalState ? "Final roster" : "Roster")}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #35312f;background:#121212;">
            <tr>
              <th width="42" align="center" style="padding:9px 8px;color:#9f918d;font-size:10px;line-height:14px;letter-spacing:0.08em;text-transform:uppercase;">Seat</th>
              <th align="left" style="padding:9px 8px;color:#9f918d;font-size:10px;line-height:14px;letter-spacing:0.08em;text-transform:uppercase;">Player</th>
              <th align="left" style="padding:9px 8px;color:#9f918d;font-size:10px;line-height:14px;letter-spacing:0.08em;text-transform:uppercase;">${finalState ? "Role / status" : "Role"}</th>
            </tr>
            ${rows}
          </table>
        </td>
      </tr>`;
  }

  function renderResultsHtml(results) {
    if (results.length === 0) return "";
    const rows = results.map(result => {
      const tone = RESULT_TONES[result.tone];
      return `
        <tr>
          <td style="padding:0 0 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid ${tone.border};background:${tone.background};">
              <tr>
                <td style="padding:13px 14px;">
                  <div style="margin:0 0 4px;color:${tone.color};font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(result.label)}</div>
                  <div style="margin:0;color:#f1ece3;font-size:14px;line-height:21px;">${escapeHtmlWithBreaks(result.value)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }).join("");

    return `
      <tr>
        <td style="padding:0 28px 26px;">
          ${sectionHeading("Night results")}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${rows}</table>
        </td>
      </tr>`;
  }

  function renderWinnersHtml(winners, accent) {
    if (winners.length === 0) return "";
    const rows = winners.map(winner => `
      <tr>
        <td style="padding:11px 14px;border-top:1px solid #35312f;color:#f1ece3;font-size:15px;line-height:21px;font-weight:700;">
          ${escapeHtml(winner.name)}
          ${winner.detail ? `<div style="margin-top:3px;color:#b8aaa6;font-size:12px;line-height:18px;font-weight:400;">${escapeHtml(winner.detail)}</div>` : ""}
        </td>
      </tr>`).join("");

    return `
      <tr>
        <td style="padding:0 28px 26px;">
          ${sectionHeading(`Winner${winners.length === 1 ? "" : "s"}`)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid ${accent};background:#171717;">${rows}</table>
        </td>
      </tr>`;
  }

  function renderNotesHtml(notes) {
    if (notes.length === 0) return "";
    return `
      <tr>
        <td style="padding:0 28px 26px;">
          ${sectionHeading("Notes")}
          <ul style="margin:0;padding:0 0 0 20px;color:#c8bbb5;font-size:13px;line-height:20px;">
            ${notes.map(note => `<li style="margin:0 0 7px;">${escapeHtmlWithBreaks(note)}</li>`).join("")}
          </ul>
        </td>
      </tr>`;
  }

  function renderDeliveryNoticeHtml(message) {
    if (!message) return "";
    return `
      <tr>
        <td style="padding:0 28px 26px;">
          <div style="padding:11px 13px;border:1px solid #9b6932;background:#241b12;color:#f3c58d;font-size:12px;line-height:18px;">${escapeHtml(message)}</div>
        </td>
      </tr>`;
  }

  function renderHandoverHtml(handover, accent) {
    if (handover.urls.length === 0 && !handover.json) return "";
    const action = handover.urls.length === 1
      ? `<a href="${escapeHtml(handover.urls[0])}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:${accent};color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;">Take over this game</a>
         <div style="margin-top:10px;color:#9f918d;font-size:11px;line-height:17px;word-break:break-all;">${escapeHtml(handover.urls[0])}</div>
         <div style="margin-top:16px;"><img src="cid:handover-qr" width="220" height="220" alt="Handover QR code" style="display:block;width:220px;max-width:100%;height:auto;padding:8px;background:#ffffff;border:0;" /></div>`
      : handover.urls.length > 1
        ? `<p style="margin:0 0 14px;color:#b8aaa6;font-size:13px;line-height:20px;">Scan every QR code in order. Each code is one part of the same handover.</p>
           ${handover.urls.map((_url, index) => `
             <div style="display:inline-block;margin:0 12px 16px 0;vertical-align:top;text-align:center;">
               <img src="cid:handover-qr-${index + 1}" width="180" height="180" alt="Handover QR code ${index + 1} of ${handover.urls.length}" style="display:block;width:180px;max-width:100%;height:auto;padding:8px;background:#ffffff;border:0;" />
               <div style="margin-top:6px;color:#c8bbb5;font-size:11px;line-height:16px;">Part ${index + 1} of ${handover.urls.length}</div>
             </div>`).join("")}`
        : "";
    const data = handover.json
      ? `<div style="margin-top:${handover.urls.length > 0 ? "18px" : "0"};color:#9f918d;font-size:11px;line-height:17px;">Handover data</div>
         <pre style="margin:7px 0 0;padding:12px;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-word;border:1px solid #35312f;border-radius:6px;background:#0d0d0d;color:#d8d0ca;font-family:Consolas,Monaco,monospace;font-size:10px;line-height:16px;text-align:left;">${escapeHtml(handover.json)}</pre>`
      : "";

    return `
      <tr>
        <td style="padding:0 28px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #4a4542;background:#171717;">
            <tr>
              <td style="padding:18px;">
                ${sectionHeading("Continue this game")}
                <p style="margin:0 0 14px;color:#b8aaa6;font-size:13px;line-height:20px;">Use the handover details below to restore this session on another device.</p>
                ${action}${data}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  function buildHtml(payload, subject) {
    const detail = EVENT_DETAILS[payload.eventType];
    const accent = SCRIPT_ACCENTS[payload.script.id] || SCRIPT_ACCENTS.tb;
    const summary = payload.summary || detail.defaultSummary;
    const occurredAt = formatOccurredAt(payload.session.occurredAt);
    const roster = payload.eventType === "game-start"
      ? renderRosterHtml(payload.players, false)
      : payload.eventType === "game-end"
        ? renderRosterHtml(payload.players, true)
        : "";
    const results = payload.eventType === "night-complete" ? renderResultsHtml(payload.results) : "";
    const winners = payload.eventType === "game-end" ? renderWinnersHtml(payload.winners, accent) : "";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .stack-cell { display: block !important; width: auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#090909;color:#f1ece3;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#090909;">
    <tr>
      <td align="center" style="padding:24px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" class="email-shell" style="width:600px;max-width:600px;border-collapse:collapse;border:1px solid #35312f;background:#111111;">
          <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td class="email-pad" style="padding:26px 28px 20px;">
              <div style="margin:0 0 18px;color:#b8aaa6;font-size:10px;line-height:15px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Storyteller&#39;s Grimoire</div>
              <div style="display:inline-block;margin:0 0 12px;padding:5px 9px;border:1px solid ${accent};border-radius:999px;color:${accent};font-size:10px;line-height:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(detail.label)}</div>
              <h1 style="margin:0 0 10px;color:#f1ece3;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:38px;font-weight:600;">${escapeHtml(eventHeadline(payload))}</h1>
              <p style="margin:0;color:#b8aaa6;font-size:14px;line-height:22px;">${escapeHtmlWithBreaks(summary)}</p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:0 28px 26px;">
              <table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-left:-8px;">
                <tr>
                  ${metadataCell("Script", payload.script.name)}
                  ${metadataCell("Session", phaseLabel(payload))}
                </tr>
                <tr>
                  ${metadataCell("Players", String(payload.session.playerCount))}
                  ${metadataCell("Recorded", occurredAt || "Not recorded")}
                </tr>
              </table>
            </td>
          </tr>
          ${results}
          ${winners}
          ${roster}
          ${renderNotesHtml(payload.notes)}
          ${renderDeliveryNoticeHtml(payload.deliveryNotice)}
          ${renderHandoverHtml(payload.handover, accent)}
          <tr>
            <td class="email-pad" style="padding:18px 28px;border-top:1px solid #35312f;color:#827875;font-size:10px;line-height:16px;">
              This message was created from the Storyteller&#39;s Grimoire session record. Verify game-critical details against the physical grimoire before announcing them.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  function buildText(payload) {
    const detail = EVENT_DETAILS[payload.eventType];
    const lines = [
      "STORYTELLER'S GRIMOIRE",
      detail.label.toUpperCase(),
      "",
      eventHeadline(payload),
      payload.summary || detail.defaultSummary,
      "",
      `Script: ${payload.script.name}`,
      `Session: ${phaseLabel(payload)}`,
      `Players: ${payload.session.playerCount}`
    ];
    const occurredAt = formatOccurredAt(payload.session.occurredAt);
    if (occurredAt) lines.push(`Recorded: ${occurredAt}`);
    if (payload.session.id) lines.push(`Session ID: ${payload.session.id}`);

    if (payload.eventType === "night-complete" && payload.results.length > 0) {
      lines.push("", "NIGHT RESULTS");
      payload.results.forEach(result => lines.push(`${result.label}: ${result.value}`));
    }

    if (payload.eventType === "game-end" && payload.winners.length > 0) {
      lines.push("", `WINNER${payload.winners.length === 1 ? "" : "S"}`);
      payload.winners.forEach(winner => lines.push(`- ${winner.name}${winner.detail ? ` — ${winner.detail}` : ""}`));
    }

    if ((payload.eventType === "game-start" || payload.eventType === "game-end") && payload.players.length > 0) {
      lines.push("", payload.eventType === "game-end" ? "FINAL ROSTER" : "ROSTER");
      payload.players.forEach(player => {
        const details = [player.role, player.alignment, payload.eventType === "game-end" ? player.status : ""]
          .filter(Boolean)
          .join(" — ");
        lines.push(`${player.seat}. ${player.name}${details ? ` — ${details}` : ""}`);
      });
    }

    if (payload.notes.length > 0) {
      lines.push("", "NOTES");
      payload.notes.forEach(note => lines.push(`- ${note}`));
    }

    if (payload.deliveryNotice) lines.push("", payload.deliveryNotice);

    if (payload.handover.urls.length > 0 || payload.handover.json) {
      lines.push("", "CONTINUE THIS GAME");
      if (payload.handover.urls.length === 1) {
        lines.push(`Take over: ${payload.handover.urls[0]}`);
      } else if (payload.handover.urls.length > 1) {
        lines.push("Open or scan every handover part in order:");
        payload.handover.urls.forEach((url, index) => lines.push(`Part ${index + 1} of ${payload.handover.urls.length}: ${url}`));
      }
      if (payload.handover.json) lines.push("Handover JSON:", payload.handover.json);
    }

    return lines.join("\n");
  }

  function cloneDeliveryPayload(payload) {
    return {
      ...payload,
      script: { ...payload.script },
      session: { ...payload.session },
      players: payload.players.map(player => ({ ...player })),
      results: payload.results.map(result => ({ ...result })),
      winners: payload.winners.map(winner => ({ ...winner })),
      notes: [...payload.notes],
      deliveryNotice: "",
      handover: {
        ...payload.handover,
        urls: [...payload.handover.urls]
      }
    };
  }

  function deliveryEnvelopeSize(email) {
    return JSON.stringify({
      eventType: email.eventType,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: email.idempotencyKey,
      handoverUrls: email.handoverUrls
    }).length;
  }

  function renderDeliveryEmail(payload, subject, idempotencyKey) {
    return {
      eventType: payload.eventType,
      subject,
      html: buildHtml(payload, subject),
      text: buildText(payload),
      idempotencyKey,
      handoverUrls: [...payload.handover.urls]
    };
  }

  function fitDeliveryEmail(payload, subject, idempotencyKey) {
    const deliveryPayload = cloneDeliveryPayload(payload);
    const omitted = [];

    while (true) {
      const email = renderDeliveryEmail(deliveryPayload, subject, idempotencyKey);
      const withinLimits = email.html.length <= EMAIL_LIMITS.maxHtmlChars
        && email.text.length <= EMAIL_LIMITS.maxTextChars
        && deliveryEnvelopeSize(email) <= EMAIL_LIMITS.maxDispatchChars;
      if (withinLimits) return { email, deliveryPayload, omitted };

      if (deliveryPayload.handover.json) {
        deliveryPayload.handover.json = "";
        omitted.push("handover-json");
      } else if (deliveryPayload.notes.length > 0) {
        deliveryPayload.notes.pop();
        if (!omitted.includes("notes")) omitted.push("notes");
      } else if (deliveryPayload.results.length > 1) {
        deliveryPayload.results.pop();
        if (!omitted.includes("results")) omitted.push("results");
      } else if (deliveryPayload.players.length > 0) {
        deliveryPayload.players.pop();
        if (!omitted.includes("players")) omitted.push("players");
      } else if (deliveryPayload.winners.length > 1) {
        deliveryPayload.winners.pop();
        if (!omitted.includes("winners")) omitted.push("winners");
      } else {
        throw new RangeError("Email content exceeds the safe delivery limit.");
      }
      deliveryPayload.deliveryNotice = "Some supplemental details were omitted to keep this message within its delivery size limit.";
    }
  }

  function buildEmail(input) {
    const payload = normalizeEmailPayload(input);
    const subject = emailSubject(payload);
    const idempotencyKey = `botc-${payload.eventType}-${hashString(stableStringify(payload))}`;
    const fitted = fitDeliveryEmail(payload, subject, idempotencyKey);
    return {
      ...fitted.email,
      payload: fitted.deliveryPayload,
      omitted: Object.freeze([...fitted.omitted])
    };
  }

  return Object.freeze({
    EMAIL_EVENT_TYPES,
    EMAIL_LIMITS,
    normalizeEmailPayload,
    createIdempotencyKey,
    buildEmail,
    escapeHtml
  });
});
