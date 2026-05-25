// ══════════════════════════════════════════════════════════════════════════
// SV DATA — Sects & Violets
// ══════════════════════════════════════════════════════════════════════════
const SV_DIST = {
  5:{t:3,o:0,m:1,d:1}, 6:{t:3,o:1,m:1,d:1},
  7:{t:5,o:0,m:1,d:1}, 8:{t:5,o:1,m:1,d:1}, 9:{t:5,o:2,m:1,d:1},
  10:{t:7,o:0,m:2,d:1}, 11:{t:7,o:1,m:2,d:1}, 12:{t:7,o:2,m:2,d:1},
  13:{t:9,o:0,m:3,d:1}, 14:{t:9,o:1,m:3,d:1}, 15:{t:9,o:2,m:3,d:1},
};

const SV_C = {
  // ─── TOWNSFOLK (13) ───
  clockmaker:{
    id:"clockmaker", name:"Clockmaker", team:"good", type:"townsfolk", fn:14, on:0,
    ab:"You start knowing how many steps from the Demon the closest Minion is.",
    fn_r:"Show fingers (0, 1, 2, etc.) for the number of seats between the Demon and the closest Minion.",on_r:""},
  dreamer:{
    id:"dreamer", name:"Dreamer", team:"good", type:"townsfolk", fn:19, on:21,
    ab:"Each night, choose a player (not yourself or the Demon): you learn 1 good character and 1 evil character, one of which is their true character.",
    fn_r:"Dreamer points to a player (not self/Demon). Show them 1 good and 1 evil character token, one of which is true.",
    on_r:"Dreamer points to a player. Show them 1 good and 1 evil character token, one of which is true."},
  snakecharmer:{
    id:"snakecharmer", name:"Snake Charmer", team:"good", type:"townsfolk", fn:15, on:10,
    ab:"Each night, choose a alive player: a chosen Demon swaps characters & alignments with you, then you become poisoned.",
    fn_r:"Snake Charmer points to a player. If Demon: they swap roles/alignments; new Demon is poisoned.",
    on_r:"Snake Charmer points to a player. If Demon: they swap roles/alignments; new Demon is poisoned."},
  mathematician:{
    id:"mathematician", name:"Mathematician", team:"good", type:"townsfolk", fn:21, on:23,
    ab:"Each night, you learn how many players' abilities worked abnormally (due to poison/drunkenness) since dusk.",
    fn_r:"Show fingers for how many times abilities worked abnormally tonight/today.",
    on_r:"Show fingers for how many times abilities worked abnormally tonight/today."},
  flowergirl:{
    id:"flowergirl", name:"Flowergirl", team:"good", type:"townsfolk", fn:0, on:18,
    ab:"Each night*, you learn if the Demon voted today.",
    fn_r:"",
    on_r:"Nod YES if the Demon voted today, or shake NO otherwise."},
  towncrier:{
    id:"towncrier", name:"Town Crier", team:"good", type:"townsfolk", fn:0, on:19,
    ab:"Each night*, you learn if a Minion nominated today.",
    fn_r:"",
    on_r:"Nod YES if any Minion nominated today, or shake NO otherwise."},
  oracle:{
    id:"oracle", name:"Oracle", team:"good", type:"townsfolk", fn:0, on:20,
    ab:"Each night*, you learn how many dead players are evil.",
    fn_r:"",
    on_r:"Show fingers for the number of dead players who are evil."},
  savant:{
    id:"savant", name:"Savant", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"Each day, you may visit the Storyteller to learn 2 pieces of information: 1 true and 1 false.",fn_r:"",on_r:""},
  artist:{
    id:"artist", name:"Artist", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"Once per game, during the day, privately ask the Storyteller any question that can be answered with a 'yes', 'no', or 'don't know'.",fn_r:"",on_r:""},
  juggler:{
    id:"juggler", name:"Juggler", team:"good", type:"townsfolk", fn:0, on:22,
    ab:"On your 1st day, publicly guess up to 5 players' characters. Tonight, you learn how many you got correct.",
    fn_r:"",
    on_r:"If the Juggler juggled today: show them fingers (0 to 5) for correct guesses."},
  sage:{
    id:"sage", name:"Sage", team:"good", type:"townsfolk", fn:0, on:9,
    ab:"If the Demon kills you at night, you are woken to choose 2 players: 1 of them is the Demon.",
    fn_r:"",
    on_r:"If the Sage was killed by the Demon tonight: wake them. They point to 2 players. Nod to show one is the Demon."},
  philosopher:{
    id:"philosopher", name:"Philosopher", team:"good", type:"townsfolk", fn:16, on:2,
    ab:"Once per game, at night, choose a good character: you gain their ability. If they are in play, they are drunk.",
    fn_r:"Philosopher may choose a good character to copy. If in play, that player is drunk.",
    on_r:"If not used: Philosopher may choose a good character to copy."},
  pixie:{
    id:"pixie", name:"Pixie", team:"good", type:"townsfolk", fn:13, on:0,
    ab:"You start knowing 1 in-play Townsfolk character. If you madly play as them and they are not in play or dead, you might gain their ability.",
    fn_r:"Show the Pixie 1 in-play Townsfolk character token.",on_r:""},

  // ─── OUTSIDERS (4) ───
  mutant:{
    id:"mutant", name:"Mutant", team:"good", type:"outsider", fn:0, on:0,
    ab:"You must play as if you are a Townsfolk or Outsider (depending on what you are). If the Storyteller thinks you are breaking this rule, you might be executed.",fn_r:"",on_r:""},
  sweetheart:{
    id:"sweetheart", name:"Sweetheart", team:"good", type:"outsider", fn:0, on:0,
    ab:"When you die, 1 player is drunk from now on.",fn_r:"",on_r:""},
  barber:{
    id:"barber", name:"Barber", team:"good", type:"outsider", fn:0, on:13,
    ab:"If you die, the Demon may choose 2 players (not themselves) to swap characters.",
    fn_r:"",
    on_r:"If Barber died today/tonight: wake Demon. They can choose 2 players to swap roles."},
  klutz:{
    id:"klutz", name:"Klutz", team:"good", type:"outsider", fn:0, on:0,
    ab:"If you die by execution, you must choose a player: if they are not good, your team loses.",fn_r:"",on_r:""},

  // ─── MINIONS (4) ───
  eviltwin:{
    id:"eviltwin", name:"Evil Twin", team:"evil", type:"minion", fn:12, on:0,
    ab:"You & an opposing player know each other. If you are alive, good cannot win. If you die, good wins if Demon dead.",
    fn_r:"Wake Evil Twin and their good twin. They see each other and know who the other is.",on_r:""},
  witch:{
    id:"witch", name:"Witch", team:"evil", type:"minion", fn:17, on:3,
    ab:"Each night, choose a player: if they nominate tomorrow, they die.",
    fn_r:"Witch points to a player. If they nominate tomorrow, they die.",
    on_r:"Witch points to a player. If they nominate tomorrow, they die."},
  cerenovus:{
    id:"cerenovus", name:"Cerenovus", team:"evil", type:"minion", fn:18, on:4,
    ab:"Each night, choose a player & a character: they must madly play as this character tomorrow or might be executed.",
    fn_r:"Cerenovus points to a player and a character token. That player must play madly as that role.",
    on_r:"Cerenovus points to a player and a character token."},
  pithag: {
    id:"pithag", name:"Pit-Hag", team:"evil", type:"minion", fn:0, on:5,
    ab:"Each night*, choose a player & a character: they become that character. If the Demon changes, deaths tonight might be altered.",
    fn_r:"",
    on_r:"Pit-Hag points to a player and a character. They become that character. If Demon changes, adjust deaths."},

  // ─── DEMONS (4) ───
  fanggu:{
    id:"fanggu", name:"Fang Gu", team:"evil", type:"demon", fn:0, on:12,
    ab:"Each night*, choose a player: they die. The first time you choose an Outsider, they become Fang Gu and you die instead. [+1 Outsider]",
    fn_r:"",
    on_r:"Fang Gu points to a player — they die. If Outsider: they become Fang Gu (evil) and original Fang Gu dies."},
  vigormortis:{
    id:"vigormortis", name:"Vigormortis", team:"evil", type:"demon", fn:0, on:12,
    ab:"Each night*, choose a player: they die. Minions you kill keep their abilities but register as dead. [-1 Outsider]",
    fn_r:"",
    on_r:"Vigormortis points to a player — they die. If a Minion is killed this way, they keep ability but register as dead."},
  nodashi:{
    id:"nodashi", name:"No-Dashi", team:"evil", type:"demon", fn:0, on:12,
    ab:"Each night*, choose a player: they die. Your 2 closest alive Townsfolk neighbours are poisoned.",
    fn_r:"",
    on_r:"No-Dashi points to a player — they die. Note: nearest living Townsfolk neighbors are poisoned."},
  vortox:{
    id:"vortox", name:"Vortox", team:"evil", type:"demon", fn:0, on:12,
    ab:"Each night*, choose a player: they die. Townsfolk abilities yield false information. Townsfolk must nominate each day or game ends and evil wins.",
    fn_r:"",
    on_r:"Vortox points to a player — they die. All Townsfolk info MUST be false."},
};

// SV Night Orders
const SV_FIRST_NIGHT = [
  {id:"_minioninfo",      order:1,  title:"🤝 Minion Info"},
  {id:"_demoninfo",       order:2,  title:"😈 Demon Info"},
  {id:"eviltwin",         order:12, title:"👥 Evil Twin"},
  {id:"pixie",            order:13, title:"🧚 Pixie"},
  {id:"clockmaker",       order:14, title:"🕰️ Clockmaker"},
  {id:"snakecharmer",     order:15, title:"🐍 Snake Charmer"},
  {id:"philosopher",      order:16, title:"📖 Philosopher"},
  {id:"cerenovus",        order:18, title:"🎭 Cerenovus"},
  {id:"witch",            order:17, title:"🧙 Witch"},
  {id:"dreamer",          order:19, title:"💭 Dreamer"},
  {id:"mathematician",    order:21, title:"➕ Mathematician"},
];
const SV_OTHER_NIGHT = [
  {id:"philosopher",      order:2,  title:"📖 Philosopher"},
  {id:"witch",            order:3,  title:"🧙 Witch"},
  {id:"cerenovus",        order:4,  title:"🎭 Cerenovus"},
  {id:"pithag",           order:5,  title:"🧙‍♀️ Pit-Hag"},
  {id:"snakecharmer",     order:10, title:"🐍 Snake Charmer"},
  {id:"_demon",           order:12, title:"👹 Demon"},
  {id:"barber",           order:13, title:"💈 Barber"},
  {id:"sage",             order:9,  title:"🦉 Sage"},
  {id:"dreamer",          order:21, title:"💭 Dreamer"},
  {id:"flowergirl",       order:18, title:"🌸 Flowergirl"},
  {id:"towncrier",        order:19, title:"📢 Town Crier"},
  {id:"oracle",           order:20, title:"🔮 Oracle"},
  {id:"juggler",          order:22, title:"🤹 Juggler"},
  {id:"mathematician",    order:23, title:"➕ Mathematician"},
];

const SV_TRAVELLERS = {
  barista: {
    id: "barista", name: "Barista", team: "traveller", type: "traveller",
    ab: "Each night, choose a player: they are sober, healthy and get true info, OR their ability activates twice tonight.",
    script: "sv"
  },
  harlot: {
    id: "harlot", name: "Harlot", team: "traveller", type: "traveller",
    ab: "Each night*, choose a player: if they agree, you learn each other's alignment, but 1 of you might die.",
    script: "sv"
  },
  butcher: {
    id: "butcher", name: "Butcher", team: "traveller", type: "traveller",
    ab: "Each day, you may choose to start a double execution.",
    script: "sv"
  },
  bonecollector: {
    id: "bonecollector", name: "Bone Collector", team: "traveller", type: "traveller",
    ab: "Once per game, at night, choose a dead player: they regain their ability tonight and tomorrow day.",
    script: "sv"
  },
  deviant: {
    id: "deviant", name: "Deviant", team: "traveller", type: "traveller",
    ab: "If you are executed, you might not die.",
    script: "sv"
  },
};

const SV = {
  id: "sv",
  name: "Sects & Violets",
  emoji: "🌸",
  color: "#9b59b6",
  tagline: "High madness and information control",
  desc: "13 Townsfolk • 4 Outsiders • 4 Minions • 4 Demons",
  C: SV_C,
  DIST: SV_DIST,
  FIRST_NIGHT: SV_FIRST_NIGHT,
  OTHER_NIGHT: SV_OTHER_NIGHT,
  demonFixed: false,
  defaultDemon: [],
  hasDrunk: false,
  TRAVELLERS: SV_TRAVELLERS,
};
