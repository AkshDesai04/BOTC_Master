# Production Engineering Handoff Plan

## Purpose

This document is the working handoff for the unfinished production-quality pass on the Storyteller Grimoire project. It records the exact repository state, what is already implemented, what is still incomplete, known defects, verification evidence, and the recommended order for the next engineer.

The current worktree contains a large, connected set of changes. Do not discard or broadly rewrite it. Continue from the existing files, preserve unrelated user work, and make small, verified patches.

## Non-negotiable constraints

1. Keep the project in plain HTML, CSS, and JavaScript and compatible with static GitHub Pages hosting.
2. Primary layout target is mobile portrait, while retaining usable desktop behavior.
3. Discussion timers apply only to Trouble Brewing, Bad Moon Rising, and Sects & Violets.
4. Ultimate Werewolf must remain completely outside timer configuration and timer selection. Do not show a disabled timer control for it.
5. Preserve the existing dark, restrained visual direction.
6. Do not use emoji as interface icons. Continue using the shared SVG icon module.
7. Do not add prohibited assistant-related terminology to source, comments, documentation, interface copy, emails, commit messages, or Git metadata.
8. Never put browser-consumable service credentials in tracked files. The optional email relay is configured at runtime and remains outside static hosting.
9. Use logical commits only when the relevant group is coherent and its focused tests pass.
10. Attempt to push after logical milestones, but do not rewrite published history or alter remotes merely to bypass an authorization problem.

## Repository and Git state

- Workspace: `E:\Code\Personal\BOTC_Master`
- Branch: `feature/host-handoff`
- Upstream: `origin/feature/host-handoff`
- Branch was four commits ahead of upstream before this plan was created.
- Latest local commits at handoff time:
  - `2405d94 security: keep service credentials out of browser bundle`
  - `a68daed fix: preserve timer defaults across day transitions`
  - `50e786e feat: add per-session discussion timer controls`
  - `185ce9d fix: keep discussion clock stable while ticking`
- Push attempts fail with HTTP 403 because the currently authenticated account does not have write access to `AkshDesai04/BOTC_Master`.
- Do not change the remote or credentials without user direction. Keep committing locally and report the exact push failure.
- Two inherited historical commit subjects contain prohibited terminology. They predate this work. Do not rewrite published history without explicit permission.

Current modified or new files include:

- `.github/workflows/pages.yml`
- `.github/workflows/send-game-email.yml`
- `README.md`
- `assets/images/README.md`
- `index.html`
- `bad_moon_rising.html`
- `trouble_brewing.html`
- `sects_and_violets.html`
- `scripts/common.js`
- `scripts/email.js`
- `scripts/game-rules.js`
- `scripts/handoff.js`
- `scripts/history.js`
- `scripts/icons.js`
- `scripts/trouble_brewing.js`
- `scripts/bad_moon_rising.js`
- `scripts/sects_and_violets.js`
- `scripts/ultimate_werewolf.js`
- `styles/main.css`
- all current files under `tests/`

Do not assume the untracked files are disposable. They are part of this pass.

## Last verification snapshot

At the time this plan was written:

- Every JavaScript file under `scripts/` passed `node --check`.
- `git diff --check` passed.
- The complete test suite ran 109 tests: 108 passed and 1 failed.
- The single failure is the newly added Vigormortis regression test in `tests/workflow-state.test.js`.
- The failure is most likely a bad fixture, not the retained-Minions implementation: the fixture has only three players, so after the Witch dies there are at most three publicly living players and the Witch correctly loses the ability. Change the fixture to at least five players with more than three publicly living players, or use a retained Minion without the Witch's three-living-player restriction.
- The newest Lunatic, Courtier, Goon, Exorcist, and alignment changes were syntax-checked and included in the 108/109 run, but their full intended behavior does not yet have sufficient targeted coverage.

Run the full suite with:

```powershell
$testFiles = Get-ChildItem -LiteralPath tests -Filter '*.test.js' | ForEach-Object { $_.FullName }
node --test $testFiles
```

Run syntax and whitespace checks with:

```powershell
Get-ChildItem -LiteralPath scripts -Filter '*.js' | ForEach-Object { node --check $_.FullName }
git diff --check
```

## Work already implemented

### Timer behavior

- Stable timer display updates individual DOM nodes instead of re-rendering the full screen every second.
- The clock uses tabular numerals and does not visually blink during normal ticks.
- Public and private discussion timers have independent enablement, duration, and remaining time.
- Each day has its own timer session.
- A changed duration becomes the default for the next newly created day timer of the same discussion type.
- Public and private defaults remain independent.
- Timers are available only for Trouble Brewing, Bad Moon Rising, and Sects & Violets.
- Ultimate Werewolf timer controls are omitted entirely.
- Timer mutation handlers now check phase and script eligibility.
- Imported handoff tabs are canonicalized by phase.
- Timer output is marked as a timer with live announcements disabled, and a separate completion status is used at zero.
- Timer tests cover carry-forward, independent types, disablement, handoff, legacy migration, and stable ticking.

### Undo and navigation

- `scripts/history.js` provides bounded durable undo history.
- Transient controls, interval handles, and delivery metadata are excluded from snapshots.
- Running timers restore paused with deadline-adjusted remaining time.
- Meaningful game mutations record a clear undo label.
- Setup and reveal flows contain context-appropriate Back actions.
- Accepted handoff and new-game reset clear old history.

### Shared interface system

- `scripts/icons.js` centralizes reusable SVG icons.
- Active interface emoji were replaced with shared SVG icons.
- Dark-theme contrast, touch sizes, mobile portrait layout, safe-area spacing, reduced motion, and forced-colors behavior were improved.
- Roster and night controls have clearer labels and larger hit areas.
- Dialogs support Escape and focus trapping.
- The drawer focus trap was fixed to focus the first control and wrap Shift+Tab correctly.
- Toasts render above bottom navigation.
- Startup failure output no longer injects raw exception text.

### Game setup and workflow

- Setup validation uses the distribution selected in state.
- Setup modifiers are applied atomically.
- Bad Moon Rising Godfather supports the legal `-1` and `+1` Outsider choices.
- Vigormortis does not create impossible negative-Outsider setup distributions.
- Editing a player name preserves the role pool and assignments.
- Empty seats cannot silently add out-of-pool characters.
- Trouble Brewing Drunk believed-role and Fortune Teller Red Herring state are explicit and persisted.
- First-night Minion and Demon instructions show player identities without leaking exact character names.
- Required night actions cannot be skipped silently; unresolved steps are logged.
- Once-per-game actions keep wake-list cursor behavior stable when their node disappears.
- In-game character replacement and swap controls were added.
- Character alignment is now stored independently from the character token.
- Pit-Hag-style replacement preserves alignment.
- Barber-style swap can preserve alignments.
- Snake Charmer-style swap can swap alignments and poison the former Demon.
- Fang Gu jump state and evil alignment are partly modeled.
- Philosopher gained abilities are partly modeled in the wake list.

### Rule-state fixes already present

- Poison markers no longer coerce null to seat zero.
- Poisoned Soldier and Mayor abilities no longer block an Imp kill.
- Protected Imp self-target does not unlock starpass.
- Pending legal starpass prevents dawn.
- Librarian and Po target counts are enforced.
- Character-choice restrictions cover Philosopher, Cerenovus, and Pit-Hag.
- Witch stops waking with three publicly living players.
- Sage only wakes after a Demon-caused death.
- Ravenkeeper uses overnight deaths only.
- Undertaker and Minstrel require an actual execution death.
- Registered-dead Zombuul is excluded from public living-player rules.
- Zombuul's first execution keeps it mechanically alive, marks it registered dead, and does not count as a death that suppresses its attack.
- Zombuul does not attack following an actual daytime death.
- Moonchild resolution is queued for the following night rather than the same night.
- Vigormortis-retained dead Minions are represented in durable state.
- Exorcist and Devil's Advocate prior targets are stored with a night number and follow a moved character.
- Exorcist now suppresses a correctly selected Demon's later attack node.
- Courtier effect state was started, including a cleanup reminder and expiry.
- Goon first-target handling was started.
- Reminder-only wake nodes were visually distinguished from player wake actions.

### Email system

- `scripts/email.js` defines exactly three event types: Game Start, Night Complete, and Game End.
- Each email is a self-contained responsive dark HTML document with a plain-text fallback.
- Inputs are bounded and HTML-escaped.
- Handover links can be multipart and render as ordered embedded QR attachments.
- Browser delivery uses a runtime-configured HTTPS endpoint, with local HTTP allowed only for local development.
- No endpoint means no email is generated, queued, or shown as a false success.
- Event keys are scoped to the game session.
- Undo cannot rewind delivery metadata and resend a lifecycle message.
- Delivery requests now use a 15-second abort timeout where supported.
- Dispatch builds content from one frozen state snapshot and avoids writing completion metadata into a different active session.
- A stale failed request no longer repopulates the outbox after reset or takeover.
- Pending-email retry now stops if the active state object or session changes during an awaited request.
- The delivery workflow has a strict event allowlist, pinned dependencies, least permissions, TLS, input limits, and a five-minute job timeout.

### Handoff and takeover

- Handoff supports Trouble Brewing, Bad Moon Rising, Sects & Violets, and Ultimate Werewolf game state.
- Versioned strict schema validation rejects unknown fields and malformed values.
- Version 1 fixtures remain readable.
- Version 2 supports JSON, compressed URL fragments, and multipart QR payloads.
- QR parts can arrive out of order and reject mixed/conflicting transfers.
- Timers restore paused with deadline-adjusted remaining time.
- Accepted takeover clears local history, transient controls, old email outbox, and imported pending-email references.
- Handoff state sanitizes phase/tab combinations, session identifiers, script-scoped poison state, registered-dead Zombuul state, Po charge state, alignment state, Moonchild queue, Vigormortis retention, prior targets, and several Sects & Violets dynamic fields.
- QR canvas now has an image role, accessible label, and fallback text.

### Deployment and documentation

- Pages deployment now builds a curated `_site` artifact rather than publishing the entire repository.
- The workflow syntax-checks JavaScript and runs tests before publishing.
- Only required static entry pages, scripts, styles, and images are included.
- README was rewritten around architecture, timers, handoff, email opt-in, privacy, limits, and testing.
- Browser runtime configuration contains no checked-in service credential.

## Immediate blockers to fix first

### 1. Restore a fully green test suite

Fix the single Vigormortis test fixture described above, then rerun all tests. Do not weaken the Witch rule merely to satisfy a three-player fixture.

Add targeted tests for the newly added state before changing more behavior:

- Lunatic private reveal shows the believed Demon and evil alignment, never Lunatic.
- Finalization blocks a Lunatic without a believed Demon.
- Lunatic believing Pukka acts on Night 1; other believed Demons do not.
- Lunatic believing Shabaloth uses exactly two targets.
- Lunatic believing Po can choose nobody, then must choose exactly three next night.
- Lunatic believed role and fake Po charge survive save/reload, undo, JSON handoff, URL handoff, and takeover.
- Exorcist suppresses only the selected sober/healthy Demon and still provides the identity notification at the Exorcist step.
- Courtier selected character remains drunk for exactly three nights and three days, survives reload/handoff, and expires.
- Goon first valid player-choice interaction suppresses the acting ability and changes alignment once.
- Storyteller-owned selections do not trigger Goon.
- Alignment-only and character-only transitions survive handoff and email generation.
- Stale delivery failure after reset/takeover does not recreate the outbox.
- A never-settling delivery request is aborted and becomes retryable for the still-active session.
- Pending-email retry cannot mutate a replacement session after its request resolves.

### 2. Finish Lunatic behavior

Files: `scripts/common.js`, `scripts/handoff.js`, `scripts/bad_moon_rising.js`, tests.

The newest Lunatic implementation is incomplete and must be treated as work in progress.

Required fixes:

1. In games with fewer than seven players, `_demoninfo` is suppressed. If the Lunatic believes a night-star Demon, the fake action is also suppressed on Night 1. Add an identity-only first-night notification so the real Demon always learns who the Lunatic is.
2. Other-night instructions should wake the real Demon to show Lunatic choices only when the Lunatic selected one or more players. A fake Po choosing nobody should not wake the real Demon for choices. Night 1 must still communicate Lunatic identity.
3. Confirm `getNightActionSpec` delegates every Lunatic action to the believed Demon and that the effective action identifier is used consistently in logging and state updates.
4. Confirm a believed Zombuul does not act following a real daytime death.
5. Confirm fake Pukka, Shabaloth, Po, and Zombuul target counts and first-night timing.
6. Ensure `lunaticBelievedRoles` and `lunaticPoCharged` are fully validated by handoff. Current schema wiring was added immediately before handoff and lacks dedicated tests.
7. Ensure older saves with a Lunatic are returned to setup before private reveal, without exposing the real role.
8. Review whether random assignment should choose a safe default believed Demon or intentionally require the host's explicit selection. Current behavior requires explicit selection.

### 3. Correct Goon handling

Current `goonTriggers` logic in `submitNightTarget` is too broad.

It currently risks firing for Storyteller-owned selections and information candidates, including Grandmother setup, Sage candidates, Gossip resolution, and Moonchild's public choice. It also needs a precise healthy/sober acting-player rule.

Refactor to distinguish a player using an ability from a Storyteller reminder or information construction. Only the first player who chooses the healthy Goon with their ability that night should become drunk until dusk and cause the Goon to take that player's alignment. Add explicit action metadata if necessary instead of inferring solely from target indexes.

### 4. Finish Courtier duration semantics

Current `courtierEffect` tracks a selected character and `expiresAfterDay`, and `_courtier` renders a cleanup reminder.

Verify and correct:

- Exact start and end boundaries for three nights and three days.
- Behavior if Courtier dies after using the ability.
- Behavior after character swaps or Pit-Hag changes.
- Whether all players with that character are impaired in duplicate-character states.
- Passive abilities such as Soldier, Mayor, Scarlet Woman, Zombuul, and other script effects use the shared impairment helper where appropriate.
- Handoff validation and round-trip coverage.
- Chronicle wording and reminder count.

### 5. Complete alignment and character-transition rules

The independent `alignments` map is the correct direction, but several complex cases remain:

- Philosopher gaining Barber: a dead Philosopher with the Barber ability must wake the Demon for the Barber swap.
- Philosopher gaining Snake Charmer: when the ability swaps with a Demon, the former Demon must become the poisoned Philosopher and both new character/alignment states must be shown correctly.
- Goon alignment changes need the corrected trigger logic above.
- Fang Gu jump must happen only when a living Outsider is actually killed by the ability. Confirm protection and impairment paths cannot trigger it.
- Fang Gu duplicate character state must survive all handoff and email paths.
- Character replacement should clear or move only state that belongs to the character token; player-bound statuses must remain with the player.
- Add tests for prior-target state, gained abilities, one-use state, poison, and Lunatic belief when characters move.

### 6. Fix the retained-Minions test and verify Vigormortis semantics

After correcting the fixture, verify:

- A Minion killed by a functioning Vigormortis continues to wake while a living Vigormortis remains.
- The retained ability stops while no Vigormortis is alive.
- Resurrection removes retained-dead state.
- The state survives save, undo, and handoff.
- A retained Witch still correctly loses the ability at three publicly living players.
- The poisoned Townsfolk-neighbor choice is still not explicitly modeled. Decide whether to add a durable chosen-neighbor status or make the reminder explicitly manual; do not silently imply full resolution.

## Remaining rule and data corrections

### Trouble Brewing night order

`scripts/trouble_brewing.js` still uses an older Spy placement and an older other-night information order.

Review against the current official order and update tests. The current audit finding was:

- First night: Poisoner, Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Butler, Spy.
- Other nights: Poisoner, Monk, Scarlet Woman, Imp, Ravenkeeper, Empath, Fortune Teller, Undertaker, Butler, Spy.

The immediate Scarlet Woman transition card may replace the need for a separate active Scarlet Woman node, but Spy should be last so it sees the updated Grimoire.

### Bad Moon Rising

- Change Exorcist text to the official meaning: the chosen Demon learns who the Exorcist is, then does not wake that night. Avoid the narrower phrase “doesn't attack.”
- Confirm the recently reordered Courtier/Innkeeper and Gossip/Professor positions against the current official source and lock them with tests.
- Ensure starpass shows the new Imp the “You are” and Imp tokens. `confirmStarpass` currently clears the modal without an explicit reveal instruction.
- Ensure Zombuul registration never enters actual death lists.
- Ensure Moonchild day and night timing remains one following-night resolution.

### Sects & Violets

- Update Traveller text:
  - Barista is a Storyteller choice and the target learns which effect applies.
  - Harlot chooses a living player, learns that player's character, and both may die.
  - Butcher may nominate after the first execution.
  - Deviant uses the current exile wording.
- Review all newly expanded procedural reminder text for Snake Charmer, Cerenovus, Pit-Hag, Fang Gu, and Barber.
- Verify Philosopher death-trigger and character-transition interactions described above.

## Email reliability tasks

1. Add deferred-promise tests around `dispatchGameEmail` and `retryPendingEmails`.
2. Confirm the 15-second request abort uses the browser timer safely and that timeout produces a retryable outbox item only when the original session is still active.
3. Confirm no outbox data is recreated after reset or accepted takeover.
4. Confirm only the source session receives sent/pending metadata after awaited work.
5. Review `emailDispatchesInFlight` cleanup on all errors.
6. The included delivery workflow uses the idempotency key as a concurrency group, which serializes duplicates but does not itself provide durable deduplication. The relay must reject previously accepted keys. State that limitation clearly in README unless durable deduplication is added elsewhere.
7. Verify the documented envelope uses `handoverUrls`, not the removed singular field. README was just corrected, but tests should lock this.
8. Re-run delivery budget and multipart QR tests after any handoff schema growth.

## Handoff hardening tasks

1. Add round-trip and adversarial tests for every new durable field:
   - `alignments`
   - `permanentlyPoisoned`
   - `gainedAbilities`
   - `fangGuJumpUsed`
   - `pendingMoonchildIndexes`
   - `vigormortisRetainedMinions`
   - `previousNightTargets`
   - `courtierEffect`
   - `lunaticBelievedRoles`
   - `lunaticPoCharged`
2. Confirm every field is script-scoped and normalized away for unrelated scripts.
3. Confirm malformed nested objects reject cleanly with stable error codes.
4. Confirm legacy version 1 fixtures still restore after schema additions.
5. Confirm accepted takeover clears previous-session delivery state and history.
6. Confirm phase/tab canonicalization and mutation phase guards remain aligned.
7. Confirm large games still fit QR part, email part, and total payload budgets after new fields.

## Interface and accessibility cleanup

1. Re-run a real mobile portrait pass for all three Clocktower scripts after rule changes.
2. Verify the timer clock remains visually stable for at least one full minute and only announces completion, not every tick.
3. Re-test drawer and modal Tab/Shift+Tab/Escape behavior and focus restoration.
4. Search generated template HTML for raw text ampersands and replace with `&amp;` where appropriate. Known examples include Sects & Violets labels, Hide & pass, Record & continue, and Reset & New Game.
5. Verify all icon-only controls have accessible names.
6. Verify dialog HTML added by character/alignment controls remains usable at 390 by 844 and smaller widths.
7. Verify Goon, Lunatic, Courtier, Zombuul, and alignment-override badges are clear without exposing hidden information.
8. Verify QR fallback text and image semantics in a real browser.
9. Close the local browser tab when manual testing is complete.

## Documentation and deployment review

1. Re-read README after the final behavior is settled. Keep it aligned with the actual timer, handoff, relay, retry, retention, and privacy behavior.
2. Confirm no private runtime configuration is copied into `_site` by the Pages workflow.
3. Run the Pages artifact locally or inspect its file list to ensure only intended files are published.
4. Confirm the three legacy entry pages redirect safely and preserve query parameters without reading or overwriting saved game state.
5. Leave `old_code_for_reference.html` alone unless the user explicitly asks for removal. It is excluded from the deployment artifact and should not be deleted as incidental cleanup.

## Security action requiring the user

The currently deployed public runtime configuration still exposes an old repository dispatch token and a provider key. The tracked runtime configuration was cleaned locally, but the public values must be revoked and rotated by the account owner immediately. A feature-branch push would not remove the deployed values because the Pages workflow deploys from the configured production branch.

Do not print those values in logs, commits, tests, screenshots, or documentation.

## Recommended execution order

### Phase 1: Stabilize the current worktree

1. Read this plan completely.
2. Inspect `git status`, recent commits, and the current diffs.
3. Fix the Vigormortis test fixture only; rerun the focused workflow-state test.
4. Run all tests and restore a green baseline.
5. Add tests for the newest Lunatic, Courtier, Goon, alignment, email-race, and handoff fields before further implementation.

### Phase 2: Finish highest-risk live-game rules

1. Finish Lunatic setup, first-night identity notification, action delegation, fake Po charge, and handoff coverage.
2. Correct Goon trigger classification.
3. Finish Courtier duration and impairment integration.
4. Complete alignment/character movement cases, including Philosopher interactions.
5. Correct starpass reveal instructions.
6. Fix current official night order and text data.
7. Run focused tests after each rule group.

### Phase 3: Finish reliability and schema work

1. Add delivery timeout/race/retry tests.
2. Add handoff round-trip and adversarial tests for all new fields.
3. Verify multipart and size limits.
4. Verify legacy save and version 1 migration.

### Phase 4: Browser quality pass

1. Start a local static server.
2. Test Trouble Brewing setup, private reveal, first night, day, both timers, execution, undo, starpass, email opt-in, and handoff.
3. Test Bad Moon Rising Godfather setup, Lunatic private reveal, believed-Demon action counts, Exorcist, Courtier, Goon, Zombuul, Moonchild, and timers.
4. Test Sects & Violets Philosopher, Snake Charmer, Pit-Hag, Fang Gu, Vigormortis, Barber, alignment overrides, and timers.
5. Test Ultimate Werewolf and confirm there is no timer configuration or timer navigation.
6. Test handoff by JSON, single QR, multipart QR, invalid input, and accepted takeover.
7. Test mobile portrait focus, touch sizes, scroll behavior, and clock stability.
8. Close the browser tab and stop the local server when finished.

### Phase 5: Final verification and Git milestones

1. Run every test.
2. Run syntax checks for every script.
3. Run `git diff --check`.
4. Run repository scans for prohibited terminology, unexpected emoji in active files, and credential-like values. Exclude `.git` and the intentionally retained reference file where appropriate.
5. Inspect the final diff for unrelated changes.
6. Commit coherent groups with ordinary professional messages, for example:
   - `fix: complete guided night rule state`
   - `feat: harden email delivery and retry state`
   - `fix: preserve dynamic state through handoff`
   - `fix: refine mobile workflow accessibility`
   - `docs: align deployment and relay guidance`
7. Attempt to push after each coherent commit. Record the HTTP 403 if permissions remain unchanged.
8. Report exact test totals, browser scenarios checked, local commits, push status, and the credential-rotation requirement.

## Useful focused commands

```powershell
node --test tests/workflow-state.test.js
node --test tests/discussion-timers.test.js
node --test tests/game-rules.test.js
node --test tests/handoff.test.js
node --test tests/email-system.test.js
node --test tests/history.test.js
node --test tests/script-data.test.js
node --test tests/static-entry.test.js
```

For a local browser pass:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/index.html?qa=core
```

## Current local runtime note

A local static server was started on port 8765 during this pass, and a browser tab was left on the Receive Handoff screen after testing invalid pasted input. If the existing process is still available, it may be reused; otherwise start a fresh server. Close the test tab and stop the server at the end.

## Completion criteria

Do not call the pass complete until all of the following are true:

- Full suite is green.
- All JavaScript syntax checks pass.
- Whitespace/diff checks pass.
- Timer behavior is correct and exclusive to the three Clocktower scripts.
- Clock is stable and completion is accessible without per-second announcements.
- Undo restores relevant state safely.
- Lunatic private reveal and believed-Demon flow cannot expose the real role.
- Zombuul, Moonchild, Exorcist, Courtier, Goon, Fang Gu, Vigormortis, Philosopher, Snake Charmer, Barber, and starpass cases have focused tests.
- Dynamic alignment and character state survives reload, undo, email generation, and handoff.
- All three email event types render and deliver within limits.
- Timeout, retry, stale-session, and outbox-reset behavior is tested.
- JSON, URL, single-QR, multipart-QR, and legacy handoff paths pass.
- Ultimate Werewolf shows no timer controls.
- Mobile portrait browser review passes for novice and experienced workflows.
- Active files contain no prohibited terminology, emoji icons, credentials, or unrelated edits.
- Deployment artifact contains only intended public files.
- User is told to revoke and rotate the publicly exposed legacy credentials.
- Logical commits exist and push status is reported accurately.
