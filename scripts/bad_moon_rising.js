// ══════════════════════════════════════════════════════════════════════════
// BMR DATA — Bad Moon Rising
// ══════════════════════════════════════════════════════════════════════════
const BMR_DIST = {
  5:{t:3,o:0,m:1,d:1}, 6:{t:3,o:1,m:1,d:1},
  7:{t:5,o:0,m:1,d:1}, 8:{t:5,o:1,m:1,d:1}, 9:{t:5,o:2,m:1,d:1},
  10:{t:7,o:0,m:2,d:1}, 11:{t:7,o:1,m:2,d:1}, 12:{t:7,o:2,m:2,d:1},
  13:{t:9,o:0,m:3,d:1}, 14:{t:9,o:1,m:3,d:1}, 15:{t:9,o:2,m:3,d:1},
};

const BMR_C = {
  // ─── TOWNSFOLK (13) ───
  grandmother:{
    id:"grandmother", name:"Grandmother", team:"good", type:"townsfolk", fn:9, on:0,
    ab:"You start knowing a good player & their character. If the Demon kills them, you die too.",
    fn_r:"Show the Grandmother their grandchild player and that player's character token.",on_r:""},
  sailor:{
    id:"sailor", name:"Sailor", team:"good", type:"townsfolk", fn:4, on:2,
    ab:"Each night, choose an alive player: either you or they are drunk until dusk. You can't die.",
    fn_r:"Sailor points to a living player. Either the Sailor, or the chosen player, is drunk — you decide.",
    on_r:"The previously Sailor-drunk player is sober. Sailor points to a living player. Either the Sailor or their choice is drunk."},
  chambermaid:{
    id:"chambermaid", name:"Chambermaid", team:"good", type:"townsfolk", fn:11, on:17,
    ab:"Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability.",
    fn_r:"Chambermaid points to 2 players. Show fingers for how many of them woke tonight due to their ability.",
    on_r:"Chambermaid points to 2 players. Show fingers for how many of them woke tonight due to their ability."},
  exorcist:{
    id:"exorcist", name:"Exorcist", team:"good", type:"townsfolk", fn:0, on:8,
    ab:"Each night*, choose a player (different from last night): if they are the Demon, they don't wake tonight.",
    fn_r:"",
    on_r:"Exorcist points to a player. If the Demon: they do not wake tonight."},
  innkeeper:{
    id:"innkeeper", name:"Innkeeper", team:"good", type:"townsfolk", fn:0, on:3,
    ab:"Each night*, choose 2 players: they can't die tonight, but 1 is drunk until dusk.",
    fn_r:"",
    on_r:"Remove existing Innkeeper protections. Innkeeper points to 2 players — safe from death tonight. One is drunk — you decide."},
  gambler:{
    id:"gambler", name:"Gambler", team:"good", type:"townsfolk", fn:0, on:5,
    ab:"Each night*, choose a player & guess their character: if you guess wrong, you die.",
    fn_r:"",
    on_r:"Gambler points to a player and a character on their sheet. If wrong, Gambler dies."},
  gossip:{
    id:"gossip", name:"Gossip", team:"good", type:"townsfolk", fn:0, on:13,
    ab:"Each day, you may make a public statement. Tonight, if it was true, a player dies.",
    fn_r:"",
    on_r:"If the Gossip's public statement today was true, choose a player — they die tonight."},
  courtier:{
    id:"courtier", name:"Courtier", team:"good", type:"townsfolk", fn:5, on:4,
    ab:"Once per game, at night, choose a character: they are drunk for 3 nights & 3 days.",
    fn_r:"Courtier may choose a character. That character is drunk 3N/3D.",
    on_r:"Reduce courtier timer. If not used: Courtier may choose a character — drunk 3N/3D."},
  professor:{
    id:"professor", name:"Professor", team:"good", type:"townsfolk", fn:0, on:12,
    ab:"Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected.",
    fn_r:"",
    on_r:"Professor may choose a dead player. If Townsfolk, they are resurrected."},
  minstrel:{
    id:"minstrel", name:"Minstrel", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow.",
    fn_r:"",on_r:""},
  tealady:{
    id:"tealady", name:"Tea Lady", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"If both your alive neighbours are good, they can't die.",
    fn_r:"",on_r:""},
  pacifist:{
    id:"pacifist", name:"Pacifist", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"Executed good players might not die.",
    fn_r:"",on_r:""},
  fool:{
    id:"fool", name:"Fool", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"The first time you die, you don't.",
    fn_r:"",on_r:""},
  // ─── OUTSIDERS (4) ───
  tinker:{
    id:"tinker", name:"Tinker", team:"good", type:"outsider", fn:0, on:14,
    ab:"You might die at any time.",
    fn_r:"",
    on_r:"The Storyteller may kill the Tinker at any time. You decide."},
  moonchild:{
    id:"moonchild", name:"Moonchild", team:"good", type:"outsider", fn:0, on:15,
    ab:"When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die.",
    fn_r:"",
    on_r:"If Moonchild chose a GOOD player today, that player dies."},
  goon:{
    id:"goon", name:"Goon", team:"good", type:"outsider", fn:0, on:0,
    ab:"Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment.",
    fn_r:"",on_r:""},
  lunatic:{
    id:"lunatic", name:"Lunatic", team:"good", type:"outsider", fn:1, on:7,
    ab:"You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night.",
    fn_r:"Show fake Minion info + 3 bluffs as if they are the Demon.",
    on_r:"Let the Lunatic act as the Demon. Show choices to real Demon."},
  // ─── MINIONS (4) ───
  godfather:{
    id:"godfather", name:"Godfather", team:"evil", type:"minion", fn:6, on:11,
    ab:"You start knowing which Outsiders are in play. If 1 died today, choose a player tonight: they die. [-1 or +1 Outsider]",
    fn_r:"Show the Godfather which Outsiders are in play.",
    on_r:"If an Outsider died today: Godfather points to a player — they die."},
  devilsadvocate:{
    id:"devilsadvocate", name:"Devil's Advocate", team:"evil", type:"minion", fn:7, on:6,
    ab:"Each night, choose a living player (different from last night): if they are executed tomorrow, they don't die.",
    fn_r:"Devil's Advocate points to a player — that player is safe from execution tomorrow.",
    on_r:"Devil's Advocate points to a player (different from last night) — safe from execution tomorrow."},
  assassin:{
    id:"assassin", name:"Assassin", team:"evil", type:"minion", fn:0, on:10,
    ab:"Once per game, at night*, choose a player: they die, even if for some reason they could not.",
    fn_r:"",
    on_r:"Once per game: Assassin may choose a player — they die. Bypasses ALL protection."},
  mastermind:{
    id:"mastermind", name:"Mastermind", team:"evil", type:"minion", fn:0, on:0,
    ab:"If the Demon dies by execution (not the Imp), play for 1 more day. If a player is then executed, their team loses.",
    fn_r:"",on_r:""},
  // ─── DEMONS (4) ───
  zombuul:{
    id:"zombuul", name:"Zombuul", team:"evil", type:"demon", fn:0, on:9,
    ab:"Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead.",
    fn_r:"",
    on_r:"If nobody died today: Zombuul points to a player — they die."},
  pukka:{
    id:"pukka", name:"Pukka", team:"evil", type:"demon", fn:8, on:9,
    ab:"Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy.",
    fn_r:"Pukka points to a player — that player is poisoned.",
    on_r:"The previously poisoned player dies. Pukka points to a new player — they are poisoned."},
  shabaloth:{
    id:"shabaloth", name:"Shabaloth", team:"evil", type:"demon", fn:0, on:9,
    ab:"Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated.",
    fn_r:"",
    on_r:"May regurgitate a player killed last night (they come back to life). Then choose 2 players — they die."},
  po:{
    id:"po", name:"Po", team:"evil", type:"demon", fn:0, on:9,
    ab:"Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight.",
    fn_r:"",
    on_r:"Po may choose a player — they die. If Po chose nobody last night, Po MUST choose 3 — they die."},
};

// BMR Night Orders (matches official night sheet)
const BMR_FIRST_NIGHT = [
  {id:"_minioninfo",      order:1,  title:"🤝 Minion Info"},
  {id:"lunatic_info",     order:2,  title:"🌙 Lunatic (Info)"},
  {id:"_demoninfo",       order:3,  title:"😈 Demon Info"},
  {id:"sailor",           order:4,  title:"⛵ Sailor"},
  {id:"courtier",         order:5,  title:"🍷 Courtier"},
  {id:"godfather",        order:6,  title:"🎩 Godfather"},
  {id:"devilsadvocate",   order:7,  title:"⚖️ Devil's Advocate"},
  {id:"lunatic_action",   order:8,  title:"🌙 Lunatic (Action)"},
  {id:"pukka",            order:9,  title:"🐍 Pukka"},
  {id:"grandmother",      order:10, title:"👵 Grandmother"},
  {id:"chambermaid",      order:11, title:"🛏️ Chambermaid"},
  {id:"_goon",            order:12, title:"🔄 Goon (passive)"},
];
const BMR_OTHER_NIGHT = [
  {id:"_minstrel",        order:1,  title:"🎵 Minstrel (cleanup)"},
  {id:"sailor",           order:2,  title:"⛵ Sailor"},
  {id:"innkeeper",        order:3,  title:"🍺 Innkeeper"},
  {id:"courtier",         order:4,  title:"🍷 Courtier"},
  {id:"gambler",          order:5,  title:"🎲 Gambler"},
  {id:"devilsadvocate",   order:6,  title:"⚖️ Devil's Advocate"},
  {id:"lunatic",          order:7,  title:"🌙 Lunatic"},
  {id:"exorcist",         order:8,  title:"✝️ Exorcist"},
  {id:"_demon",           order:9,  title:"👹 Demon"},
  {id:"assassin",         order:10, title:"🗡️ Assassin"},
  {id:"godfather",        order:11, title:"🎩 Godfather"},
  {id:"professor",        order:12, title:"📚 Professor"},
  {id:"gossip",           order:13, title:"💬 Gossip"},
  {id:"tinker",           order:14, title:"🔧 Tinker"},
  {id:"moonchild",        order:15, title:"🌙 Moonchild"},
  {id:"_grandmother",     order:16, title:"👵 Grandmother (passive)"},
  {id:"chambermaid",      order:17, title:"🛏️ Chambermaid"},
  {id:"_goon",            order:18, title:"🔄 Goon (passive)"},
];

const BMR = {
  id: "bmr",
  name: "Bad Moon Rising",
  emoji: "🌙",
  color: "#f39c12",
  tagline: "More complex — experienced players",
  desc: "13 Townsfolk • 4 Outsiders • 4 Minions • 4 Demons",
  C: BMR_C,
  DIST: BMR_DIST,
  FIRST_NIGHT: BMR_FIRST_NIGHT,
  OTHER_NIGHT: BMR_OTHER_NIGHT,
  demonFixed: false,      // Choose from 4 demons
  defaultDemon: [],
  hasDrunk: false,
};
