# Storyteller's Grimoire

A mobile-friendly, browser-based companion for running **Trouble Brewing**, **Bad Moon Rising**, **Sects & Violets**, and a physical-card **Ultimate Werewolf** session.

The application helps a Storyteller or moderator record a roster, prepare or enter roles, follow a night order, track deaths, run a discussion timer, and keep a local chronicle. It is a facilitator, not a complete rules engine: unless a behavior is listed under [What the application automates](#what-the-application-automates), the Storyteller or moderator must apply the role text and resolve interactions.

> This is an unofficial fan-made companion. Blood on the Clocktower, Ultimate Werewolf, character names, and associated artwork or trademarks belong to their respective owners. No affiliation or endorsement is claimed.

## Table of contents

- [Supported games](#supported-games)
- [What the application automates](#what-the-application-automates)
- [Using the website](#using-the-website)
- [Blood on the Clocktower rules represented here](#blood-on-the-clocktower-rules-represented-here)
- [Trouble Brewing roles](#trouble-brewing-roles)
- [Bad Moon Rising roles](#bad-moon-rising-roles)
- [Sects & Violets roles](#sects--violets-roles)
- [Ultimate Werewolf rules and inventory](#ultimate-werewolf-rules-and-inventory)
- [Ultimate Werewolf roles](#ultimate-werewolf-roles)
- [Persistence and privacy](#persistence-and-privacy)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Artwork](#artwork)
- [Browser support](#browser-support)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)

## Supported games

### Trouble Brewing

The introductory Blood on the Clocktower script. The app contains 13 Townsfolk, 4 Outsiders, 4 Minions, the Imp, the standard 5–15-player distributions, first/other-night guidance, and five Traveller records.

### Bad Moon Rising

A Blood on the Clocktower script centered on death, survival, protection, and multiple possible night deaths. The app contains 13 Townsfolk, 4 Outsiders, 4 Minions, 4 Demons, standard 5–15-player distributions, first/other-night guidance, and five Traveller records.

### Sects & Violets

A Blood on the Clocktower script centered on information, character changes, poisoning, and madness-like role requirements. The app contains 13 Townsfolk, 4 Outsiders, 4 Minions, 4 Demons, standard 5–15-player distributions, first/other-night guidance, and five Traveller records.

### Ultimate Werewolf

A moderator-led physical-card mode for 5–75 recorded seats. The app does not create or randomize the deck. The moderator enters each dealt card in clockwise order, subject to the inventory quantities in the script data, and manually resolves role interactions and winners.

## What the application automates

### The app does

- Select one of the four supported games.
- Enforce each mode's configured player-count range.
- Load and allow editing of the standard Blood on the Clocktower role-type distribution.
- Randomly create an initial Blood on the Clocktower role pool and randomize its seat assignments.
- Allow the Storyteller to customize the pool and manually change assignments.
- Record Ultimate Werewolf physical cards by seat and enforce each card's inventory quantity.
- Present Blood on the Clocktower roles in a private hand-off reveal flow.
- For Trouble Brewing's Drunk, require an out-of-play believed Townsfolk, reveal only that role, label it for the Storyteller as `(Drunk)`, and insert its fake wake at the believed role's normal night position.
- Maintain a Trouble Brewing Fortune Teller Red Herring when either a real Fortune Teller or a Drunk believing they are the Fortune Teller is present.
- Show sober truth references for a Drunk believing they are an information role, while prominently instructing the Storyteller to give incorrect information.
- Filter the configured first-night or other-night order to roles recorded in play.
- Offer one-target night-action logging and add entries to a local chronicle.
- Automatically mark a target for death only when a submitted target belongs to the Poisoner or one of the explicitly handled Demons: Imp, Fang Gu, Vigormortis, No-Dashi, or Vortox. Poisoner selection is logged but does not alter later information.
- Apply queued night deaths when proceeding to day.
- Let the operator manually mark a player dead or alive.
- Offer a manual Blood on the Clocktower starpass control that moves the current Demon role to a selected living Minion.
- Run a five-minute discussion timer, with pause, reset, and add-30-seconds controls, and attempt to sound a short Web Audio alarm at zero.
- Let the operator manually declare good/evil victory in Blood on the Clocktower.
- Let the moderator manually select one or more team and eligible individual winners in Ultimate Werewolf.
- Save the current session in the browser and offer to resume it after reload.

### The app does not

- Validate that a selected role pool is a legal or balanced setup.
- Apply setup modifiers such as Baron, Godfather, Fang Gu, or Vigormortis automatically.
- Resolve poisoning, drunkenness, protection, registration, madness, nominations, executions, voting powers, resurrection, character changes, alignment changes, or most death prevention/causes.
- Determine whether a target is legal for most roles, collect two-player/character choices, or calculate information outside the specific Trouble Brewing Drunk references described above.
- Automatically determine victory conditions.
- Replace the official rulebook, tokens, night sheets, or a knowledgeable Storyteller/moderator.

Night prompts and role text are references. Pressing **Submit** records one selected living target; pressing **Next Step** advances even when no target is recorded. The operator remains responsible for all game consequences.

## Using the website

1. Open the site and select a game.
2. Set the player count.
   - Blood on the Clocktower shows an editable type distribution. Its total must match the player count before continuing.
   - Ultimate Werewolf uses physical-card setup and does not show a generated distribution.
3. Enter players clockwise. Blank names become `Player 1`, `Player 2`, and so on.
4. Prepare roles.
   - **Blood on the Clocktower:** review the generated role pool, customize it if needed, then assign or randomize all seats.
   - **Trouble Brewing Drunk:** after the Drunk is assigned to a seat, choose the out-of-play Townsfolk they believe they are. If Fortune Teller is real or believed, also choose a good Red Herring. Both choices are required before finalization.
   - **Ultimate Werewolf:** search for and record the card actually dealt to each seat. Cards at their inventory limit become unavailable.
5. Finalize.
   - **Blood on the Clocktower:** hand the device to each player in turn for their private role reveal, then begin Night 1.
   - **Ultimate Werewolf:** the app opens directly on the guided night sequence; card reveal remains part of the physical game.
6. During play, use:
   - **Grimoire** for seats, roles, abilities, and manual alive/dead status.
   - **Night Sequence** for the configured wake order and action log.
   - **Town Square** for morning announcements and the discussion timer.
   - **Chronicle** for recorded setup, targets, status changes, day transitions, and declared winners.
7. Use the menu for the short rules reference or to reset the session. Resetting clears the saved game.

Keep the device screen hidden whenever it displays the complete Grimoire, role assignments, night prompts, or chronicle.

## Blood on the Clocktower rules represented here

These are the general concepts explicitly presented by the current UI:

- Good wins when the Demon dies and cannot pass demonhood to a Minion.
- Evil wins when only two players remain alive and the Demon survives.
- Day play supports public/private discussion and public nominations.
- A dead player retains one vote token; the UI records whether that ghost vote has been used, although it does not provide a complete nomination/vote-resolution flow.
- The Storyteller decides all role interactions and manually declares the winner.

The three scripts use the same standard base distribution:

| Players | Townsfolk | Outsiders | Minions | Demons |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 3 | 0 | 1 | 1 |
| 6 | 3 | 1 | 1 | 1 |
| 7 | 5 | 0 | 1 | 1 |
| 8 | 5 | 1 | 1 | 1 |
| 9 | 5 | 2 | 1 | 1 |
| 10 | 7 | 0 | 2 | 1 |
| 11 | 7 | 1 | 2 | 1 |
| 12 | 7 | 2 | 2 | 1 |
| 13 | 9 | 0 | 3 | 1 |
| 14 | 9 | 1 | 3 | 1 |
| 15 | 9 | 2 | 3 | 1 |

The distribution is editable in the UI. Setup abilities can require changes, but the app does not apply those changes for you.

### Travellers

Traveller definitions exist in each Blood on the Clocktower script file, but the active engine reads only the main `C` character map. Travellers therefore do **not** appear in role-pool generation, assignment, reveal, Grimoire, or night-order flows. They are documented below as data-only references.

## Trouble Brewing roles

### Townsfolk

| Role | Ability |
| --- | --- |
| Washerwoman | You start knowing that 1 of 2 players is a particular Townsfolk. |
| Librarian | You start knowing that 1 of 2 players is a particular Outsider, or that zero are in play. |
| Investigator | You start knowing that 1 of 2 players is a particular Minion. |
| Chef | You start knowing how many pairs of evil players there are. |
| Empath | Each night, learn how many of your 2 alive neighbours are evil. |
| Fortune Teller | Each night, choose 2 players and learn whether either is a Demon; one good Red Herring registers as a Demon. |
| Undertaker | Each night except the first, learn which character died by execution that day. |
| Monk | Each night except the first, choose another player; they are safe from the Demon that night. |
| Ravenkeeper | If you die at night, choose a player and learn their character. |
| Virgin | The first time you are nominated, if the nominator is a Townsfolk, they are executed immediately. |
| Slayer | Once per game during the day, publicly choose a player; if they are the Demon, they die. |
| Soldier | You are safe from the Demon. |
| Mayor | If only 3 players live and no execution occurs, your team wins; if you die at night, another player might die instead. |

### Outsiders

| Role | Ability |
| --- | --- |
| Butler | Each night, choose another player; tomorrow you may vote only when they are voting too. |
| Drunk | You do not know you are the Drunk; you think you are a Townsfolk, but you are not. |
| Recluse | You might register as evil and as a Minion or Demon, even if dead. |
| Saint | If you die by execution, your team loses. |

### Minions

| Role | Ability |
| --- | --- |
| Poisoner | Each night, choose a player; they are poisoned that night and the following day. |
| Spy | Each night, see the Grimoire; you might register as good and as a Townsfolk or Outsider, even if dead. |
| Scarlet Woman | If 5 or more players are alive when the Demon dies, you become the Demon. |
| Baron | There are 2 extra Outsiders in play. |

### Demon

| Role | Ability |
| --- | --- |
| Imp | Each night except the first, choose a player; they die. If you kill yourself, a Minion becomes the Imp. |

### Travellers (data-only)

| Role | Ability |
| --- | --- |
| Scapegoat | If a player of your alignment is executed, you might be executed instead. |
| Gunslinger | Each day after the first vote is tallied, you may choose a player who voted; they die. |
| Beggar | You must use a vote token to vote. If a dead player gives you theirs, learn their alignment. You are sober and healthy. |
| Bureaucrat | Each night, choose another player; their vote counts as 3 votes tomorrow. |
| Thief | Each night, choose another player; their vote counts negatively tomorrow. |

## Bad Moon Rising roles

### Townsfolk

| Role | Ability |
| --- | --- |
| Grandmother | Start knowing a good player and their character; if the Demon kills them, you die too. |
| Sailor | Each night, choose an alive player; either you or they are drunk until dusk. You cannot die. |
| Chambermaid | Each night, choose 2 alive players other than yourself; learn how many woke due to their ability that night. |
| Exorcist | Each night except the first, choose a player different from last night; if they are the Demon, they do not wake that night. |
| Innkeeper | Each night except the first, choose 2 players; they cannot die that night, but 1 is drunk until dusk. |
| Gambler | Each night except the first, choose a player and guess their character; if wrong, you die. |
| Gossip | Each day, you may make a public statement; that night, if it was true, a player dies. |
| Courtier | Once per game at night, choose a character; they are drunk for 3 nights and 3 days. |
| Professor | Once per game at night except the first, choose a dead player; if they are a Townsfolk, they are resurrected. |
| Minstrel | When a Minion dies by execution, all other players except Travellers are drunk until dusk tomorrow. |
| Tea Lady | If both your alive neighbours are good, they cannot die. |
| Pacifist | Executed good players might not die. |
| Fool | The first time you die, you do not. |

### Outsiders

| Role | Ability |
| --- | --- |
| Tinker | You might die at any time. |
| Moonchild | When you learn that you died, publicly choose an alive player; that night, if they are good, they die. |
| Goon | Each night, the first player to choose you with their ability is drunk until dusk; you become their alignment. |
| Lunatic | You think you are a Demon, but are not; the Demon knows who you are and whom you choose at night. |

### Minions

| Role | Ability |
| --- | --- |
| Godfather | Start knowing which Outsiders are in play. If one died today, choose a player that night; they die. The setup has 1 fewer or 1 extra Outsider. |
| Devil's Advocate | Each night, choose a living player different from last night; if executed tomorrow, they do not die. |
| Assassin | Once per game at night except the first, choose a player; they die even if they otherwise could not. |
| Mastermind | If the Demon dies by execution, play for 1 more day; if a player is then executed, their team loses. |

### Demons

| Role | Ability |
| --- | --- |
| Zombuul | Each night except the first, if nobody died today, choose a player; they die. The first time you die, you live but register as dead. |
| Pukka | Each night, choose a player; they are poisoned. The previously poisoned player dies, then becomes healthy. |
| Shabaloth | Each night except the first, choose 2 players; they die. A dead player chosen last night might be regurgitated. |
| Po | Each night except the first, you may choose a player; they die. If your last choice was nobody, choose 3 players tonight. |

### Travellers (data-only)

| Role | Ability |
| --- | --- |
| Apprentice | On your first night, gain a Townsfolk ability if good or a Minion ability if evil. |
| Matron | Players may not leave their seats for private talks. Each day, choose up to 3 pairs of players to swap seats. |
| Voudon | Only you and dead players can vote; dead players need no vote token, and a 50% majority is not required. |
| Judge | Once per game, if another player nominated, force the current execution to pass or fail. |
| Bishop | Only the Storyteller can nominate; at least 1 opposing player must be nominated each day. |

## Sects & Violets roles

### Townsfolk

| Role | Ability |
| --- | --- |
| Clockmaker | Start knowing how many steps from the Demon the closest Minion is. |
| Dreamer | Each night, choose a player other than yourself or the Demon; learn 1 good and 1 evil character, one of which is their true character. |
| Snake Charmer | Each night, choose an alive player; a chosen Demon swaps characters and alignments with you, then you become poisoned. |
| Mathematician | Each night, learn how many players' abilities worked abnormally due to poison or drunkenness since dusk. |
| Flowergirl | Each night except the first, learn whether the Demon voted today. |
| Town Crier | Each night except the first, learn whether a Minion nominated today. |
| Oracle | Each night except the first, learn how many dead players are evil. |
| Savant | Each day, visit the Storyteller to learn 2 pieces of information: 1 true and 1 false. |
| Artist | Once per game during the day, privately ask the Storyteller a question answerable with yes, no, or do not know. |
| Juggler | On your first day, publicly guess up to 5 players' characters; that night, learn how many were correct. |
| Sage | If the Demon kills you at night, wake and choose 2 players; 1 is the Demon. |
| Philosopher | Once per game at night, choose a good character and gain their ability; if in play, that player is drunk. |
| Pixie | Start knowing 1 in-play Townsfolk character. If you madly play as them and they are not in play or are dead, you might gain their ability. |

### Outsiders

| Role | Ability |
| --- | --- |
| Mutant | You must play as if you are a Townsfolk or Outsider, as applicable; if the Storyteller thinks you break this rule, you might be executed. |
| Sweetheart | When you die, 1 player is drunk from then on. |
| Barber | If you die, the Demon may choose 2 other players to swap characters. |
| Klutz | If you die by execution, choose a player; if they are not good, your team loses. |

### Minions

| Role | Ability |
| --- | --- |
| Evil Twin | You and an opposing player know each other. While you live, good cannot win; if you die, good wins if the Demon is dead. |
| Witch | Each night, choose a player; if they nominate tomorrow, they die. |
| Cerenovus | Each night, choose a player and character; tomorrow they must madly play as that character or might be executed. |
| Pit-Hag | Each night except the first, choose a player and character; they become that character. If the Demon changes, deaths that night might be altered. |

### Demons

| Role | Ability |
| --- | --- |
| Fang Gu | Each night except the first, choose a player; they die. The first Outsider chosen becomes an evil Fang Gu and you die instead. Setup has 1 extra Outsider. |
| Vigormortis | Each night except the first, choose a player; they die. Minions you kill keep their abilities but register as dead. Setup has 1 fewer Outsider. |
| No-Dashi | Each night except the first, choose a player; they die. Your 2 closest alive Townsfolk neighbours are poisoned. |
| Vortox | Each night except the first, choose a player; they die. Townsfolk information is false, and Townsfolk must nominate each day or evil wins. |

### Travellers (data-only)

| Role | Ability |
| --- | --- |
| Barista | Each night, choose a player; they are sober, healthy, and receive true information, or their ability activates twice that night. |
| Harlot | Each night except the first, choose a player; if they agree, you learn each other's alignment, but 1 of you might die. |
| Butcher | Each day, you may start a double execution. |
| Bone Collector | Once per game at night, choose a dead player; they regain their ability that night and tomorrow. |
| Deviant | If you are executed, you might not die. |

## Ultimate Werewolf rules and inventory

The repository defines this as a physical-card, moderator-run mode:

- Record 5–75 players clockwise.
- Build and deal the physical deck outside the app. The app does not suggest a composition, shuffle, deal, or infer team counts.
- Do not record more copies of a card than the inventory permits.
- Discussion is public only.
- Dead players cannot vote.
- At night, dead players may keep their eyes open and silently watch, but they do not act, wake for their role, or become valid targets.
- The moderator applies every role interaction and decides all deaths, conversions, protections, information, and other consequences.
- The moderator may declare any combination of Village, Werewolves, Vampires, and Cult winners, plus eligible in-play solo/conditional role winners.

Every role has 1 card unless listed here:

| Card | Quantity |
| --- | ---: |
| Villager | 20 |
| Werewolf | 12 |
| Vampire | 8 |
| Mason | 3 |
| Every other listed role | 1 each |

The inventory contains 97 cards in total, while the configured session maximum is 75 players.

Some definitions include a separate reference variation. The tables show the primary ability first and preserve each variation where the data supplies one.

## Ultimate Werewolf roles

### Village

| Role | Ability |
| --- | --- |
| Apprentice Seer | Become the Seer if the Seer is killed. |
| Aura Seer | At night, find the team of one player. **Variation:** learn whether someone has a non-ordinary role and what it is. |
| Beholder | Open your eyes on the first night to see who the Seer is. |
| Bodyguard | Choose a different player each night to protect; that player cannot be killed that night. |
| Cupid | Choose two lovers; if one dies, the other dies from a broken heart. |
| The Count | On the first night, learn how many werewolves are in each half of the village. |
| Diseased | If attacked by werewolves, the werewolves do not get fed the following night. |
| Ghost | Die on the first night, then each day write one-letter clues as a message from beyond, with no names or initials. |
| Hunter | If killed, take someone down with you. |
| Village Idiot | Always vote for players to die. |
| Insomniac | Each night, learn whether at least one neighbour woke during the night. |
| Lycan | You are a villager but appear to Seers and the P.I. as a werewolf. |
| Martyr | Take the place of someone killed before their role is revealed. |
| Mason | Know the other Masons. Inventory: 3. |
| Mayor | If you reveal yourself, your elimination vote counts twice. |
| Old Hag | At night, choose a player who must leave the village the next day. |
| Old Man | Die on night X, where X is the number of werewolves plus one. |
| P.I. | Inspect three adjacent players each night; learn only whether at least one is malicious. **Variation:** inspect on one night. |
| Pacifist | You cannot vote when eliminating a player. |
| Priest | On the first night, protect a player; the next attempt to kill them fails, then on the following night protect someone different. **Variation:** protect one player from a night-caused death, including vampire attacks. |
| Prince | You cannot be killed during the day. |
| Seer | Each night, choose a player and learn whether they are on the villager team, a vampire, or—if a werewolf—their exact powers. |
| Spellcaster | At night, choose a player who must not use their voice the following day. |
| Tough Guy | Survive an extra day if attacked by werewolves at night. |
| Troublemaker | Once per game, choose to have two elimination attempts in one day; a tied vote wastes the chance. |
| Thing | Each night, tap a player sitting immediately next to you. |
| Villager | Find and eliminate the werewolves during the day. Inventory: 20. |
| Witch | Once each per game, kill or save a player. |
| Cursed | You are a villager until attacked by werewolves, then become a werewolf. **Variation:** become a vampire when attacked by vampires. |
| Drunk | You are a villager until the third night, when you remember your real role. |
| Little Girl | You may discreetly peek each night; you die if the wolves correctly signal that you are the Little Girl. |
| Wild Child | On the first night, choose a role model; if they die, become a werewolf. Until then, you are a normal villager. |
| Sasquatch | You are a villager until a day ends without an elimination, then become a werewolf. |
| Leprechaun | You may redirect a werewolf attack to a player adjacent to its target. |
| Fortune Teller (Miller's Hollow) | Learn an inspectee's exact role except for Wolf Man and Lycan; the inspected player is not told. |

### Werewolf team

| Role | Ability |
| --- | --- |
| Big Bad Wolf | If the pack's target is beside you, you may kill any combination of your adjacent players; if the Leprechaun redirects the initial attack, none of them die. **Variation:** attack one person beside the initial target. |
| Fruit Brute | If you are the last wolf alive, you cannot feed, but still try to root out all villagers. |
| Wolf man | The opposite of a Lycan: you are a werewolf but Seers and the P.I. see you as a villager. |
| White Wolf (Miller's Hollow) | Wake nightly with the werewolves and every other night alone to kill anyone; win only as the lone survivor. |
| Sorcerer | You are a Seer on the Werewolf team; learn only whether you found a werewolf, another Seer, or something else. |
| Minion | Work with the werewolves or vampires to kill villagers; the moderator decides which team you support. |
| Werewolf | Eat a villager each night. Inventory: 12. |
| Wolf Cub | If you die, the werewolves receive two kills the following night. |
| Dream Wolf | Replace a dead werewolf; do not wake until a werewolf dies. |
| Lone Wolf | You are a werewolf but win only if you are the last wolf-team member alive. |
| Dire Wolf | On the first night, choose a companion; you die if they die, but they do not die if you do. **Variation:** put yourself in love on the first night. |
| Black Wolf | Combines Spellcaster and Werewolf abilities. |

### Vampire team

| Role | Ability |
| --- | --- |
| Vampire | Attack another player each night; they die if there is a nomination the next day. Inventory: 8. |

### Cult

| Role | Ability |
| --- | --- |
| Cult Leader | Each night, add a player to your cult; win if every living player is in it. |

### Solo and conditional winners

| Role | Ability |
| --- | --- |
| Bogeyman | If the wolves cannot decide whom to kill, decide for them; win if all night-active players are dead. |
| Doppelgänger | Choose a player on the first night; if they die, secretly take their role. |
| Hoodlum | Choose two players on the first night; win if both die and you are alive at game end. |
| Tanner | Win only if you are killed. |
| Bloody Mary | If you die, each night kill someone from the team that killed you. |
| Chupacabra | Each night, choose a player; if they are a werewolf, they die. If all wolves are dead, kill a player each night. |
| Nostradamus | Predict the winning team on the first night; if it wins and you survive, gain a solo win, acting as a villager otherwise. |

White Wolf and Lone Wolf are grouped with the Werewolf team above but are also available as individual winners in the app. The app's individual-winner picker includes Bogeyman, White Wolf, Doppelgänger, Hoodlum, Tanner, Lone Wolf, Bloody Mary, Chupacabra, and Nostradamus.

### Artifact

| Role | Ability |
| --- | --- |
| The Amulet of Protection | Its holder does not die; pass it to another player each day or it is destroyed. |

### Moderator

| Role | Ability |
| --- | --- |
| Moderator | Moderates the game; the role data says the game cannot be played without this role. |

## Persistence and privacy

- Session state is serialized as JSON in the current browser's `localStorage` under `botc_storyteller_v2`.
- Saved data includes player names, script, distribution, assignments, alive/dead status, night targets, chronicle entries, timer values, and declared winners.
- Trouble Brewing saves also include each Drunk seat's believed Townsfolk and the Fortune Teller Red Herring. Older saves without these fields load with safe empty defaults; an active legacy Drunk game returns to role setup so the Storyteller can make the required secret choice.
- Reloading the main page offers to resume a saved session.
- The timer is paused after a resumed reload for safety.
- **Reset Session** and **Reset & New Game** remove the saved session.
- There is no application server, account system, analytics code, network API, cloud synchronization, or cross-device transfer in this repository.
- Data therefore stays in that browser storage unless the hosting environment, browser extensions, developer tools, device backups, or browser synchronization expose or copy it.
- Anyone using the same browser profile can potentially inspect the stored JSON. Do not enter sensitive personal information, and clear the session on shared devices.

## Running locally

No build step or package installation is required.

### Directly

Open [`index.html`](index.html) in a modern browser. The app uses only relative static assets and does not fetch data.

Some browser security policies behave more consistently over HTTP. If direct `file://` loading causes storage, audio, or asset issues, serve the repository locally, for example:

```powershell
py -m http.server 8000
```

Then visit `http://localhost:8000/`.

[`trouble_brewing.html`](trouble_brewing.html) and [`bad_moon_rising.html`](bad_moon_rising.html) are convenience redirects that preselect their respective scripts before loading the main page.

## Deployment

Deploy the repository root to any static-file host:

1. Preserve the directory structure.
2. Make [`index.html`](index.html) the entry document.
3. Publish `scripts/`, `styles/`, `assets/`, and the optional script-specific redirect pages together.
4. Use HTTPS when possible so browser storage and audio run in a normal secure context.

There are no server routes, environment variables, secrets, package dependencies, or build artifacts to configure. Persistence remains browser-local; deploying a new version does not migrate or centrally back up sessions.

## Architecture

The project is a small global-script single-page application:

```text
.
├── index.html                      # Loads data, engine, and starts rendering
├── trouble_brewing.html            # Trouble Brewing preselection redirect
├── bad_moon_rising.html            # Bad Moon Rising preselection redirect
├── scripts/
│   ├── trouble_brewing.js          # TB roles, distribution, travellers, night order
│   ├── bad_moon_rising.js          # BMR roles, distribution, travellers, night order
│   ├── sects_and_violets.js        # S&V roles, distribution, travellers, night order
│   ├── ultimate_werewolf.js        # UW roles, inventory, mode rules, night order
│   └── common.js                   # State, persistence, event handlers, and rendering
├── styles/
│   └── main.css                    # Responsive visual design
└── assets/
    └── images/
        └── README.md               # Artwork naming and directory guidance
```

### Data model

Each game exposes a global object consumed by `common.js`:

- `C`: active character records keyed by role ID.
- `DIST`: player-count distributions; empty for Ultimate Werewolf.
- `FIRST_NIGHT` and `OTHER_NIGHT`: ordered wake/reference nodes.
- Script metadata such as ID, name, color, and setup behavior.
- Blood on the Clocktower scripts additionally define `TRAVELLERS`, currently unused by the engine.
- Ultimate Werewolf additionally defines physical-card mode, player limits, discussion/death rules, winner groups, and individual-winner role IDs.

Each character supplies an ID, display name, category/type, team, ability text, and optional first/other-night instructions. Ultimate Werewolf also supplies inventory quantity and optional variation text.

### Rendering and state

`scripts/common.js` owns a single mutable `state` object and renders HTML strings into `#app`. Inline event handlers call global functions, mutate state, save relevant changes, and render again. The main screens are script selection, count, roster, role setup, private reveal, active game, and victory. Active-game tabs render the Grimoire, night sequence, day brief/timer, and chronicle.

Load order matters: all four game-data scripts must execute before `common.js`.

## Artwork

Role images are expected at:

```text
assets/images/<category>/<role-id>.png
```

The engine maps Townsfolk/Village to `townsfolk`, Outsiders/Solo to `outsiders`, Minions/Cult to `minions`, Demons/Werewolves/Vampires to `demons`, and Travellers/Artifacts/Moderator to `travellers`. If an image fails to load, the UI replaces it with a category emoji.

The current repository contains the artwork guidance file but no role PNGs in the expected category directories, so emoji fallbacks are the effective default. See [`assets/images/README.md`](assets/images/README.md) for naming guidance. Contributors are responsible for ensuring that any added artwork may legally be redistributed.

## Browser support

There is no automated compatibility matrix. The source requires a modern browser with:

- JavaScript enabled.
- `const`, `let`, template literals, object spread, optional chaining, and nullish coalescing.
- `Object.fromEntries`, `Object.entries`, `Set`, and standard array methods.
- DOM APIs and inline event-handler support.
- `localStorage` for save/resume behavior.
- Web Audio (`AudioContext` or `webkitAudioContext`) for the timer alarm.
- CSS custom properties, Grid/Flexbox, animations, and `backdrop-filter` for the intended presentation.

Current Chromium, Firefox, and Safari-family browsers are reasonable targets based on those APIs, but the repository contains no browser test suite. If storage is unavailable, the app continues without reliable persistence. If Web Audio is unavailable or blocked until user interaction, the timer still runs but the alarm may be silent.

## Known limitations

- The app is a reference and tracker, not a rules adjudicator.
- Role prompts can be incomplete for abilities requiring multiple players, character choices, arbitrary information, secret state, or daytime actions.
- A Trouble Brewing Drunk's believed action is only logged as fake/no-effect. The Storyteller must manually ignore passive/day abilities and deliberately provide misinformation. Fortune Teller still has a one-target logger rather than a two-target chooser.
- Drunk truth references calculate Chef pairs and Empath neighbours from current seating/alive state and list relevant recorded roles for Washerwoman, Librarian, and Investigator. They show Demon/Red Herring context for Fortune Teller and true target roles in the target menu for Ravenkeeper. Executions are not tracked, so Undertaker truth must be checked manually.
- Only a small hard-coded subset of submitted night targets receives special death/log handling.
- Night order entries beginning with `_` are always displayed as reminders; some BMR entries use non-character IDs without that prefix and may be omitted because they are not seat assignments.
- Blood on the Clocktower role assignment can be manually changed outside the generated pool, and the app does not prevent duplicate unique roles.
- The role-pool editor does not itself enforce that the pool size or type makeup matches the selected distribution.
- Setup modifiers are text-only.
- Traveller data is not connected to active play.
- The app does not offer a complete nomination or vote-counting interface.
- Ultimate Werewolf has no deck-building recommendations or automated team/role resolution.
- Ultimate Werewolf night prompts accept one generic living target even when an ability needs no target, multiple targets, an adjacent target, a role/team choice, or a non-target response.
- Manual resurrection is available even when no role permits it.
- The chronicle records selected actions and manual status changes, not a complete audit of everything that occurred.
- Saved sessions have no schema version migration or import/export flow.
- Some older standalone/reference files remain in the repository; [`index.html`](index.html) plus the five active scripts and main stylesheet are authoritative for current behavior.

## Contributing

### Keep data and engine behavior separate

- Put game definitions, exact role IDs, ability text, inventory, and wake order in the appropriate script file.
- Put shared UI, state transitions, persistence, and automation in `scripts/common.js`.
- Treat role IDs as stable keys: they drive assignments, night filtering, saved sessions, and artwork filenames.
- When adding a role, decide explicitly whether it belongs in the active `C` map or in data-only metadata such as `TRAVELLERS`.

### Do not imply automation that is not implemented

If documentation or UI says an effect occurs automatically, add and test the corresponding state transition. Otherwise describe it as a prompt, record, reminder, or manual moderator action. Role ability text alone does not mean the engine implements that ability.

### Preserve compatibility

- Keep `index.html` script order: game data first, shared engine last.
- Keep static hosting and relative paths working.
- Consider existing saves before renaming IDs or changing state shapes.
- Test with missing artwork so emoji fallbacks still work.
- Avoid adding dependencies or a build requirement unless the benefit justifies changing the project's deployment model.

### Suggested manual test pass

1. Start each game and verify its player limits.
2. Check every standard Blood on the Clocktower distribution from 5 through 15 players.
3. Complete roster and role setup, including manual pool edits and assignments.
4. For Blood on the Clocktower, complete every private reveal and both first/other-night transitions.
5. For Ultimate Werewolf, assign cards up to their quantities and verify the next copy is disabled.
6. Mark players dead/alive and confirm night filtering and voting reminders match the selected mode.
7. Run, pause, extend, reset, and finish the timer.
8. Declare winners and inspect the chronicle.
9. Reload, resume, then reset and confirm the saved session is removed.
10. Test both with and without role image files.

When changing role data, compare the README role lists against every key in `TB_C`, `BMR_C`, `SV_C`, and `UW_C`, and compare Traveller sections against each `TRAVELLERS` object.
