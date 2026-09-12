# Storyteller's Grimoire

A mobile-first, browser-based companion for running Trouble Brewing, Bad Moon Rising, and Sects & Violets sessions.

The app helps a Storyteller prepare a roster, assign characters, guide private reveals and night steps, track state changes, time discussions, record a chronicle, and transfer a live session to another device. It is a facilitator rather than a complete rules engine: the Storyteller remains responsible for applying the official rules and resolving interactions marked for manual handling.

> This is an unofficial fan-made companion. Blood on the Clocktower, character names, and associated artwork or trademarks belong to their respective owners. No affiliation or endorsement is claimed.

## Supported games

| Game | Setup | Player range | Discussion timers |
| --- | --- | ---: | --- |
| Trouble Brewing | Standard character distribution | 5–20 | Public and private |
| Bad Moon Rising | Standard character distribution | 5–20 | Public and private |
| Sects & Violets | Standard character distribution | 5–20 | Public and private |

The three Blood on the Clocktower scripts include their complete base character rosters, Traveller reference data, and first-night and other-night orders. Sects & Violets uses Seamstress in its official 13-Townsfolk roster. Trouble Brewing applies the Baron's setup adjustment; Bad Moon Rising prompts for the Godfather's legal choice of one fewer or one additional Outsider; Sects & Violets applies the Fang Gu and Vigormortis setup adjustments.

## What the app handles

- Script selection and player-count limits through 20 players.
- CSV and image roster import, with editable seating after import.
- Nonblank, unique player names entered in seating order.
- Standard Blood on the Clocktower distributions, editable character pools, random assignment, and manual assignment.
- Strict setup checks before a Blood on the Clocktower game begins, including seat coverage, unique character limits, pool consistency, and effective type counts.
- Trouble Brewing Drunk setup, including the believed Townsfolk and Fortune Teller Red Herring.
- Covered, one-player-at-a-time private role reveals.
- Script-aware first-night and other-night sequences, including relevant reminder steps, dead-character filtering, reactive wake steps, and once-per-game tracking.
- Role-aware target counts and character choices for supported night prompts.
- Direct state effects for the small set explicitly implemented in the engine, with clear manual-resolution messaging for other character interactions.
- Alive/dead state, a single recorded execution per day, vote-token state, ghost votes, and the Trouble Brewing Imp starpass.
- A local chronicle of setup, night actions, phase changes, executions, status changes, and the declared result.
- Confirmed game conclusion and winner recording.
- Contextual Back controls and persistent Undo history for meaningful state changes.
- Live-session handoff by link, QR, or JSON.
- Three optional email events: Game Start, Night Complete, and Game End.

The app does not replace the official rulebook, tokens, night sheets, or a knowledgeable Storyteller. It does not provide a full nomination and vote-counting system, and it does not resolve every poisoning, drunkenness, protection, registration, madness, resurrection, character-change, alignment-change, or victory interaction.

## Running a game

1. Open the app and choose a game.
2. Choose the player count.
3. Enter every player clockwise. Names must be filled in and unique.
4. Prepare the characters.
   - For a Blood on the Clocktower script, review the generated pool, adjust it if needed, and assign each seat.
5. Resolve any script-specific setup fields shown by the app, then finalize the setup.
6. For Blood on the Clocktower, pass the device to each player for the covered private reveal. The Storyteller then unlocks the next reveal.
7. During play, use:
   - **Grimoire** for seats, characters, abilities, status, executions, and vote state.
   - **Night Sequence** for the current wake step and action record.
   - **Town Square** for announcements, timer setup, and the next-night transition.
   - **Chronicle** for the session record.
8. Use the Storyteller menu for Undo, handoff, the rules reference, pending email delivery, or a confirmed reset.

Controls that modify consequential state create a labeled history entry. Undo restores the saved snapshot, stops any running timer, and tells the Storyteller what was reverted. Back controls move between setup screens without silently erasing the active session.

## Discussion timers

Discussion timers are available in Trouble Brewing, Bad Moon Rising, and Sects & Violets.

Each Blood on the Clocktower day has independent **Public** and **Private** timer settings:

- Each type can be enabled or left off for that day.
- Each type has its own duration and remaining time.
- Durations range from 30 seconds to 60 minutes in 30-second steps.
- Changing a duration also makes that value the starting default for the same discussion type on the next day.
- The next day starts with the full carried duration, not the previous day's remaining time.
- Starting, pausing, adding 30 seconds, resetting, and switching discussion type preserve stable clock rendering.
- A restored save, handoff, or Undo result never resumes a timer in a running state.

## Undo and recovery

The history module keeps up to 30 labeled snapshots in browser storage. It covers night actions and step changes, phase transitions, timer settings and adjustments, executions, alive/dead changes, vote changes, starpasses, and game conclusion.

Undo is available from the Storyteller menu when a recoverable snapshot exists. Beginning a new game or accepting a handoff clears the previous history so an old session cannot be restored into the new one.

## Host handoff

Handoff is available for all four supported games once setup has reached private reveal or active play. It is designed for a single current host:

1. The current host opens **Give Handoff**.
2. The app creates a takeover link, one or more QR codes, and downloadable/copyable JSON.
3. The receiving host opens the link, scans every QR part, uploads a QR/JSON file, or pastes the link or JSON.
4. The receiving device validates the payload and asks before replacing an existing session.
5. The restored timer is paused, transient dialogs are cleared, and the receiving host continues from the captured phase and wake step.

Version 2 handoffs use a bounded, validated schema for roster, assignments, phase, night log, chronicle, timer state, and other durable session fields. Older Trouble Brewing version 1 handoffs remain readable. Large payloads may be split across several numbered QR codes.

Handoff links store the encoded session in the URL fragment. The fragment is removed from the receiving address bar before import and is not part of the page request. Encoding and compression are not encryption: a link, QR, or JSON file contains private player names, character assignments, and Storyteller records. Share it only with the next trusted host and delete exported files when they are no longer needed.

Handoff is a snapshot transfer, not live synchronization. After takeover, use only the intended host device.

## Email events

The email module supports exactly these event types:

1. **Game Start** — created after setup is finalized; includes session details and the roster.
2. **Night Complete** — created after each completed night; includes the recorded night results.
3. **Game End** — created after the winner is confirmed; includes the result and final roster.

Each event has a responsive dark HTML document and a plain-text fallback. Game Start and Night Complete messages can include a takeover link, handoff JSON, and an inline QR attachment so a trusted recipient can continue the session.

### Delivery is opt-in

Remote delivery is off by default. [`scripts/runtime-config.js`](scripts/runtime-config.js) contains an empty `emailEndpoint`, so the static app has no browser-held mail credential and does not generate or send email. After an operator deliberately configures an HTTPS relay, a failed delivery is retained in the local pending outbox for retry.

Copy the shape from [`scripts/runtime-config.example.js`](scripts/runtime-config.example.js) and set only a public HTTPS endpoint URL:

```js
window.GRIMOIRE_RUNTIME_CONFIG = {
  emailEndpoint: "https://mail-relay.example/grimoire-email"
};
```

Never place an SMTP password, repository credential, or private service key in a file delivered by GitHub Pages.

The browser sends this JSON envelope to the configured endpoint:

```json
{
  "eventType": "game-start | night-complete | game-end",
  "subject": "Rendered subject",
  "html": "Self-contained HTML document",
  "text": "Plain-text fallback",
  "idempotencyKey": "Stable event identifier",
  "handoverUrls": ["Optional ordered takeover URL parts"]
}
```

A production relay must:

- accept HTTPS only;
- allow the deployed site origin through CORS;
- authenticate or otherwise authorize requests without exposing a private credential to the browser;
- reject every event type except the three listed above;
- enforce request-size and rate limits;
- validate and sanitize all supplied content;
- deduplicate accepted requests by `idempotencyKey`;
- return a successful status only after the message is durably accepted; and
- keep every delivery credential outside the browser.

The included [`send-game-email.yml`](.github/workflows/send-game-email.yml) job accepts a `repository_dispatch` event named `send-game-email`, checks the three event types, sanitizes the HTML, creates the handoff QR attachment, and sends through Gmail SMTP. A private relay may wrap the browser envelope as `client_payload` for that event. Configure these repository secrets for the job:

- `SMTP_EMAIL`
- `SMTP_APP_PASSWORD`
- `EMAIL_TO`

The workflow's concurrency group only serializes matching requests; it is not durable duplicate suppression. The relay must reject an `idempotencyKey` it has already accepted.

`EMAIL_TO` must identify trusted Storyteller recipients. Game Start, Night Complete, and handoff content can disclose every character assignment and private action. Do not send these messages to a general player list.

The GitHub Pages site remains usable without a relay; only remote email delivery is unavailable.

## Persistence and privacy

The app uses browser storage on the current origin:

| Key | Storage | Contents | Retention |
| --- | --- | --- | --- |
| `botc_storyteller_v2` | `localStorage` | Current durable game state | Until reset, replacement by another session, or site data is cleared |
| `botc_storyteller_history_v1` | `localStorage` | Up to 30 Undo snapshots | Cleared for a new game or accepted handoff |
| `botc_storyteller_email_outbox_v1` | `localStorage` | Up to 20 pending rendered email envelopes | Removed after delivery, session reset, or an accepted takeover |
| `botc_handoff_parts_v2` | `sessionStorage` | Incomplete multipart QR collection | Cleared after completion/cancel or when the tab session ends |

The current state, history, pending mail, and handoff data can include player names, secret characters, alignments, targets, deaths, notes, and winner information. Browser storage is not encrypted. Anyone with access to the same browser profile, browser extensions, developer tools, backups, or synchronization data may be able to inspect it.

Reset clears the active save, Undo history, and pending email outbox. On a shared device, also clear the site's browser data and delete downloaded handoff files after use.

When remote delivery is enabled, the generated email envelope and handoff link leave the device and are handled by the configured relay, GitHub Actions when the included job is used, the mail provider, and the recipient mailbox. Review their privacy and retention policies, restrict repository and mailbox access, and choose an appropriate workflow-log retention period before enabling delivery.

## Running locally

No build step or package installation is required for the site.

Open [`index.html`](index.html) directly, or serve the repository over HTTP for browser features that require a normal origin:

```powershell
py -m http.server 8000
```

Then visit `http://localhost:8000/`.

The convenience entry pages preselect a script without changing an existing saved session:

- [`trouble_brewing.html`](trouble_brewing.html)
- [`bad_moon_rising.html`](bad_moon_rising.html)
- [`sects_and_violets.html`](sects_and_violets.html)

## GitHub Pages deployment

[`pages.yml`](.github/workflows/pages.yml) runs the test suite, checks every JavaScript file, and assembles a minimal static artifact. The artifact contains only:

- `index.html` and the three Blood on the Clocktower convenience entry pages;
- the runtime JavaScript files under `scripts/`;
- `styles/main.css`; and
- the required PNG character artwork under `assets/images/`.

Tests, documentation, handoff fixtures, the legacy reference page, workflow files, and the runtime configuration example are not published.

The deployment runs on pushes to `main` and can also be started from the Actions page. The app uses relative paths, so it remains compatible with a repository subpath on GitHub Pages.

## Architecture

The project is a framework-free, global-script single-page app.

```text
index.html
scripts/
  runtime-config.js       Optional public endpoint URL; never credentials
  icons.js                Reusable inline SVG icon renderer
  history.js              Bounded snapshots and timer-safe Undo restoration
  game-rules.js           Setup checks, wake-list expansion, and action specs
  email.js                Payload normalization and three email templates
  trouble_brewing.js      Trouble Brewing data
  bad_moon_rising.js      Bad Moon Rising data
  sects_and_violets.js    Sects & Violets data
  handoff-qr.js           Local QR encoder
  common.js               State, persistence, workflow handlers, and rendering
  handoff.js              Handoff schema, encoding, transfer UI, and restore
styles/
  main.css                Dark responsive visual system
tests/
  discussion-timers.test.js
  email-system.test.js
  game-rules.test.js
  handoff.test.js
  history.test.js
  script-data.test.js
  static-entry.test.js
  workflow-state.test.js
```

Load order in [`index.html`](index.html) is intentional: configuration and shared modules load first, game data follows, then QR support, the main engine, and the browser handoff adapter.

### State and rendering

`scripts/common.js` owns the live `state` object and renders the current screen into `#app`. Durable save and handoff fields are selected by `getSerializableState()`. The history module separately removes short-lived values such as dialogs, intervals, camera streams, and open drawers from Undo snapshots.

`scripts/game-rules.js`, `scripts/history.js`, `scripts/email.js`, and the codec portion of `scripts/handoff.js` expose browser globals and CommonJS exports. This keeps browser loading simple while allowing focused Node tests without a browser framework.

### Visual system

The interface uses a dark, restrained design with touch-sized controls, narrow-screen layouts, safe-area padding, reduced-motion support, forced-color support, and tabular timer numerals. [`scripts/icons.js`](scripts/icons.js) supplies the shared SVG icon language. Missing character artwork falls back to the matching vector category mark.

Character artwork is read from:

```text
assets/images/<category>/<character-id>.png
```

See [`assets/images/README.md`](assets/images/README.md) for naming and licensing guidance.

## Browser support

A current Chromium, Firefox, or Safari-family browser is recommended. Core requirements are JavaScript, DOM APIs, CSS custom properties, Grid/Flexbox, `localStorage`, and `sessionStorage`.

Some features depend on newer browser APIs:

- `BarcodeDetector` for camera and uploaded-image QR decoding. Link/JSON paste and JSON upload remain available without it.
- `getUserMedia` for live camera scanning; this requires HTTPS or localhost.
- `CompressionStream` and `DecompressionStream` for compact handoffs. Plain encoded JSON is used when compression is unavailable, but a browser without decompression support cannot open a compressed transfer.
- Web Audio for the timer alarm. The timer still runs if audio is unavailable or blocked.
- Clipboard access for one-tap copy. Download remains available if clipboard permission is denied.

## Tests

The test suite uses Node's built-in test runner and requires no project dependencies:

```powershell
node --test tests/*.test.js
```

It covers timer isolation and persistence, all three Blood on the Clocktower datasets, setup validation, wake expansion, role-aware action specs, Undo restoration, email safety and content, handoff schema/round trips/multipart transfer, static entry points, responsive CSS expectations, workflow event scope, and key game-state regressions.

Browser-facing paths are exercised through Node VM harnesses and static integration checks rather than a full browser-runner suite, so release verification still includes real browser testing.

For release checks, also complete a mobile portrait pass through setup, reveal, first night, day timers, later-night flow, Undo, winner confirmation, and handoff for each supported script.

## Known limitations

- Many complex character effects are recorded as guided manual steps rather than applied to all downstream state.
- Setup edits, roster edits, reveal navigation, and ordinary tab navigation are not Undo checkpoints.
- Traveller records are available as reference data but are not part of the active setup flow.
- Nominations and vote totals do not form a complete voting subsystem.
- Camera QR decoding depends on browser support; link, JSON paste, and JSON upload are the portable fallbacks.
- Large handoffs may require several QR scans. Copying the takeover link or JSON is usually faster.
- A static GitHub Pages app cannot hold private mail credentials. Remote email therefore requires the optional operator-controlled HTTPS relay described above.
- The handoff model is intentionally single-host and snapshot-based; it does not reconcile edits from two devices.

## Contribution notes

- Keep character definitions, IDs, ability text, inventory, and night order in the matching game-data file.
- Keep shared state transitions and rendering in `scripts/common.js`; put reusable rules, history, email, icon, and handoff behavior in their dedicated modules.
- Treat character IDs and serialized field names as compatibility-sensitive keys.
- If the UI claims that a rule consequence is applied directly, add the matching state transition and regression coverage. Otherwise present it as a prompt, record, reminder, or manual Storyteller decision.
- Preserve relative paths and direct static hosting.
- Consider existing saves and handoff versions before changing state shapes.
- Run the full test command and a mobile portrait walkthrough before release.
