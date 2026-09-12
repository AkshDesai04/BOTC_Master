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
    id:"clockmaker", name:"Clockmaker", team:"good", type:"townsfolk", fn:8, on:0,
    ab:"You start knowing how many steps from the Demon to its nearest Minion.",
    fn_r:"Show fingers (1, 2, 3, etc.) for the fewest steps from the Demon to a Minion. Adjacent players are 1 step apart.",on_r:""},
  dreamer:{
    id:"dreamer", name:"Dreamer", team:"good", type:"townsfolk", fn:9, on:13,
    ab:"Each night, choose a player (not yourself or Travellers): you learn 1 good and 1 evil character, 1 of which is correct.",
    fn_r:"Dreamer points to a player (not themselves or a Traveller). Show 1 good and 1 evil character token, 1 of which is correct.",
    on_r:"Dreamer points to a player (not themselves or a Traveller). Show 1 good and 1 evil character token, 1 of which is correct."},
  snakecharmer:{
    id:"snakecharmer", name:"Snake Charmer", team:"good", type:"townsfolk", fn:4, on:2,
    ab:"Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned.",
    fn_r:"Snake Charmer points to an alive player. If they chose the Demon, swap their characters and alignments, then wake both players and show each their new character and alignment. The former Demon is now the poisoned Snake Charmer.",
    on_r:"Snake Charmer points to an alive player. If they chose the Demon, swap their characters and alignments, then wake both players and show each their new character and alignment. The former Demon is now the poisoned Snake Charmer."},
  mathematician:{
    id:"mathematician", name:"Mathematician", team:"good", type:"townsfolk", fn:11, on:19,
    ab:"Each night, you learn how many players' abilities worked abnormally (since dawn) due to another character's ability.",
    fn_r:"Show fingers for how many players' abilities worked abnormally since dawn due to another character's ability.",
    on_r:"Show fingers for how many players' abilities worked abnormally since dawn due to another character's ability."},
  flowergirl:{
    id:"flowergirl", name:"Flowergirl", team:"good", type:"townsfolk", fn:0, on:14,
    ab:"Each night*, you learn if the Demon voted today.",
    fn_r:"",
    on_r:"Nod YES if the Demon voted today, or shake NO otherwise."},
  towncrier:{
    id:"towncrier", name:"Town Crier", team:"good", type:"townsfolk", fn:0, on:15,
    ab:"Each night*, you learn if a Minion nominated today.",
    fn_r:"",
    on_r:"Nod YES if any Minion nominated today, or shake NO otherwise."},
  oracle:{
    id:"oracle", name:"Oracle", team:"good", type:"townsfolk", fn:0, on:16,
    ab:"Each night*, you learn how many dead players are evil.",
    fn_r:"",
    on_r:"Show fingers for the number of dead players who are evil."},
  savant:{
    id:"savant", name:"Savant", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"Each day, you may visit the Storyteller to learn 2 pieces of information: 1 true and 1 false.",fn_r:"",on_r:""},
  seamstress:{
    id:"seamstress", name:"Seamstress", team:"good", type:"townsfolk", fn:10, on:17,
    ab:"Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment.",
    fn_r:"The Seamstress may choose 2 other players. Nod YES if they have the same alignment, or shake NO if they do not.",
    on_r:"If not used: the Seamstress may choose 2 other players. Nod YES if they have the same alignment, or shake NO if they do not."},
  philosopher:{
    id:"philosopher", name:"Philosopher", team:"good", type:"townsfolk", fn:1, on:1,
    ab:"Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk.",
    fn_r:"The Philosopher may choose a good character and gain that ability. If the character is in play, that player is drunk.",
    on_r:"If not used: the Philosopher may choose a good character and gain that ability. If the character is in play, that player is drunk."},
  artist:{
    id:"artist", name:"Artist", team:"good", type:"townsfolk", fn:0, on:0,
    ab:"Once per game, during the day, privately ask the Storyteller any yes/no question.",fn_r:"",on_r:""},
  juggler:{
    id:"juggler", name:"Juggler", team:"good", type:"townsfolk", fn:0, on:18,
    ab:"On your 1st day, publicly guess up to 5 players' characters. Tonight, you learn how many you got correct.",
    fn_r:"",
    on_r:"If the Juggler juggled today: show them fingers (0 to 5) for correct guesses."},
  sage:{
    id:"sage", name:"Sage", team:"good", type:"townsfolk", fn:0, on:12,
    ab:"If the Demon kills you at night, you learn that 1 of 2 players is the Demon.",
    fn_r:"",
    on_r:"If the Sage was killed by the Demon tonight: wake them, then indicate 2 players, 1 of whom is the Demon."},
  // ─── OUTSIDERS (4) ───
  mutant:{
    id:"mutant", name:"Mutant", team:"good", type:"outsider", fn:0, on:0,
    ab:"If you are 'mad' about being an Outsider, you might be executed.",fn_r:"",on_r:""},
  sweetheart:{
    id:"sweetheart", name:"Sweetheart", team:"good", type:"outsider", fn:0, on:11,
    ab:"When you die, 1 player is drunk from now on.",fn_r:"",
    on_r:"If the Sweetheart died and no player has been made drunk yet, choose 1 player: they are drunk from now on."},
  barber:{
    id:"barber", name:"Barber", team:"good", type:"outsider", fn:0, on:10,
    ab:"If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters.",
    fn_r:"",
    on_r:"If the Barber died today or tonight: wake the Demon. They may choose 2 players, neither of whom is another Demon, to swap characters. Wake both affected players and show each their new character; their alignments do not change."},
  klutz:{
    id:"klutz", name:"Klutz", team:"good", type:"outsider", fn:0, on:0,
    ab:"When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses.",fn_r:"",on_r:""},

  // ─── MINIONS (4) ───
  eviltwin:{
    id:"eviltwin", name:"Evil Twin", team:"evil", type:"minion", fn:5, on:0,
    ab:"You & an opposing player know each other. If the good player is executed, evil wins. Good can't win if you both live.",
    fn_r:"Wake Evil Twin and their good twin. They see each other and know who the other is.",on_r:""},
  witch:{
    id:"witch", name:"Witch", team:"evil", type:"minion", fn:6, on:3,
    ab:"Each night, choose a player: if they nominate tomorrow, they die. If just 3 players live, you lose this ability.",
    fn_r:"Witch points to a player. If they nominate tomorrow, they die.",
    on_r:"Witch points to a player. If they nominate tomorrow, they die."},
  cerenovus:{
    id:"cerenovus", name:"Cerenovus", team:"evil", type:"minion", fn:7, on:4,
    ab:"Each night, choose a player & a good character: they are 'mad' they are this character tomorrow, or might be executed.",
    fn_r:"Cerenovus points to a player and a good character token. Wake that player, show the Cerenovus token and the chosen character, then put them to sleep. They must be mad they are that character tomorrow, or might be executed.",
    on_r:"Cerenovus points to a player and a good character token. Wake that player, show the Cerenovus token and the chosen character, then put them to sleep. They must be mad they are that character tomorrow, or might be executed."},
  pithag: {
    id:"pithag", name:"Pit-Hag", team:"evil", type:"minion", fn:0, on:5,
    ab:"Each night*, choose a player & a character they become (if not in play). If a Demon is made, deaths tonight are arbitrary.",
    fn_r:"",
    on_r:"Pit-Hag points to a player and an out-of-play character. They become that character. If the change succeeds, wake that player and show their new character. If a Demon is made, deaths tonight are arbitrary."},

  // ─── DEMONS (4) ───
  fanggu:{
    id:"fanggu", name:"Fang Gu", team:"evil", type:"demon", fn:0, on:6,
    setupModifier:{townsfolkDelta:-1, outsiderDelta:1},
    ab:"Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]",
    fn_r:"",
    on_r:"Fang Gu points to a player — they die. If this is the first Outsider killed this way, they become an evil Fang Gu and the original Fang Gu dies instead; wake the new Fang Gu and show the Fang Gu and evil-alignment tokens."},
  vigormortis:{
    id:"vigormortis", name:"Vigormortis", team:"evil", type:"demon", fn:0, on:9,
    setupModifier:{townsfolkDelta:1, outsiderDelta:-1},
    ab:"Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbour. [-1 Outsider]",
    fn_r:"",
    on_r:"Vigormortis points to a player — they die. A Minion killed this way keeps their ability and poisons 1 Townsfolk neighbour."},
  nodashi:{
    id:"nodashi", name:"No Dashii", team:"evil", type:"demon", fn:0, on:7,
    ab:"Each night*, choose a player: they die. Your 2 Townsfolk neighbours are poisoned.",
    fn_r:"",
    on_r:"No Dashii points to a player — they die. The No Dashii's 2 Townsfolk neighbours are poisoned."},
  vortox:{
    id:"vortox", name:"Vortox", team:"evil", type:"demon", fn:0, on:8,
    ab:"Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins.",
    fn_r:"",
    on_r:"Vortox points to a player — they die. All Townsfolk information must be false. If no-one is executed today, evil wins."},
};

// SV Night Orders
const SV_FIRST_NIGHT = [
  {id:"philosopher",      order:1,  title:"Philosopher"},
  {id:"_minioninfo",      order:2,  title:"Minion Info"},
  {id:"_demoninfo",       order:3,  title:"Demon Info"},
  {id:"snakecharmer",     order:4,  title:"Snake Charmer"},
  {id:"eviltwin",         order:5,  title:"Evil Twin"},
  {id:"witch",            order:6,  title:"Witch"},
  {id:"cerenovus",        order:7,  title:"Cerenovus"},
  {id:"clockmaker",       order:8,  title:"Clockmaker"},
  {id:"dreamer",          order:9,  title:"Dreamer"},
  {id:"seamstress",       order:10, title:"Seamstress"},
  {id:"mathematician",    order:11, title:"Mathematician"},
];
const SV_OTHER_NIGHT = [
  {id:"philosopher",      order:1,  title:"Philosopher"},
  {id:"snakecharmer",     order:2,  title:"Snake Charmer"},
  {id:"witch",            order:3,  title:"Witch"},
  {id:"cerenovus",        order:4,  title:"Cerenovus"},
  {id:"pithag",           order:5,  title:"Pit-Hag"},
  {id:"fanggu",           order:6,  title:"Fang Gu"},
  {id:"nodashi",          order:7,  title:"No Dashii"},
  {id:"vortox",           order:8,  title:"Vortox"},
  {id:"vigormortis",      order:9,  title:"Vigormortis"},
  {id:"barber",           order:10, title:"Barber"},
  {id:"sweetheart",       order:11, title:"Sweetheart"},
  {id:"sage",             order:12, title:"Sage"},
  {id:"dreamer",          order:13, title:"Dreamer"},
  {id:"flowergirl",       order:14, title:"Flowergirl"},
  {id:"towncrier",        order:15, title:"Town Crier"},
  {id:"oracle",           order:16, title:"Oracle"},
  {id:"seamstress",       order:17, title:"Seamstress"},
  {id:"juggler",          order:18, title:"Juggler"},
  {id:"mathematician",    order:19, title:"Mathematician"},
];

const SV_TRAVELLERS = {
  barista: {
    id: "barista", name: "Barista", team: "traveller", type: "traveller",
    ab: "Each night, until dusk, 1) a player becomes sober, healthy & gets true info, or 2) their ability works twice. They learn which.",
    script: "sv"
  },
  harlot: {
    id: "harlot", name: "Harlot", team: "traveller", type: "traveller",
    ab: "Each night*, choose a living player: if they agree, you learn their character, but you both might die.",
    script: "sv"
  },
  butcher: {
    id: "butcher", name: "Butcher", team: "traveller", type: "traveller",
    ab: "Each day, after the 1st execution, you may nominate again.",
    script: "sv"
  },
  bonecollector: {
    id: "bonecollector", name: "Bone Collector", team: "traveller", type: "traveller",
    ab: "Once per game, at night, choose a dead player: they regain their ability tonight and tomorrow day.",
    script: "sv"
  },
  deviant: {
    id: "deviant", name: "Deviant", team: "traveller", type: "traveller",
    ab: "If you were funny today, you cannot die by exile.",
    script: "sv"
  },
};

const SV = {
  id: "sv",
  name: "Sects & Violets",
  color: "#c47bd9",
  tagline: "High madness and information control",
  desc: "13 Townsfolk • 4 Outsiders • 4 Minions • 4 Demons",
  C: SV_C,
  DIST: SV_DIST,
  FIRST_NIGHT: SV_FIRST_NIGHT,
  OTHER_NIGHT: SV_OTHER_NIGHT,
  demonFixed: false,
  defaultDemon: [],
  hasDrunk: false,
  playerLimits: { min: 5, max: 15 },
  TRAVELLERS: SV_TRAVELLERS,
};
