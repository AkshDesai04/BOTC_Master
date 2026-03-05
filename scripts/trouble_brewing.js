// ══════════════════════════════════════════════════════════════════════════
// TB DATA — Trouble Brewing
// ══════════════════════════════════════════════════════════════════════════
const TB_DIST = {
  5:{t:3,o:0,m:1,d:1}, 6:{t:3,o:1,m:1,d:1},
  7:{t:5,o:0,m:1,d:1}, 8:{t:5,o:1,m:1,d:1}, 9:{t:5,o:2,m:1,d:1},
  10:{t:7,o:0,m:2,d:1}, 11:{t:7,o:1,m:2,d:1}, 12:{t:7,o:2,m:2,d:1},
  13:{t:9,o:0,m:3,d:1}, 14:{t:9,o:1,m:3,d:1}, 15:{t:9,o:2,m:3,d:1},
};

const TB_C = {
  washerwoman:{id:"washerwoman",name:"Washerwoman",team:"good",type:"townsfolk",fn:33,on:0,
    ab:"You start knowing that 1 of 2 players is a particular Townsfolk.",
    fn_r:"Show 2 players. Point to each. Show a Townsfolk character token — one of those 2 players is that character.",on_r:""},
  librarian:{id:"librarian",name:"Librarian",team:"good",type:"townsfolk",fn:34,on:0,
    ab:"You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)",
    fn_r:"Show 2 players and an Outsider token (one of them is that Outsider). OR show a '0' if no Outsiders in play.",on_r:""},
  investigator:{id:"investigator",name:"Investigator",team:"good",type:"townsfolk",fn:35,on:0,
    ab:"You start knowing that 1 of 2 players is a particular Minion.",
    fn_r:"Show 2 players and a Minion token — one of them is that Minion.",on_r:""},
  chef:{id:"chef",name:"Chef",team:"good",type:"townsfolk",fn:36,on:0,
    ab:"You start knowing how many pairs of evil players there are.",
    fn_r:"Show fingers (0, 1, 2, etc.) for the number of pairs of evil players who are sitting adjacent to each other.",on_r:""},
  empath:{id:"empath",name:"Empath",team:"good",type:"townsfolk",fn:37,on:52,
    ab:"Each night, you learn how many of your 2 alive neighbours are evil.",
    fn_r:"Show fingers (0, 1, or 2) for the number of their alive neighbours who are evil.",
    on_r:"Show fingers (0, 1, or 2) for alive evil neighbours. Skip dead neighbours — count closest alive in each direction."},
  fortuneteller:{id:"fortuneteller",name:"Fortune Teller",team:"good",type:"townsfolk",fn:38,on:53,
    ab:"Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
    fn_r:"They point at 2 players. Nod YES if either is the Demon (or the Red Herring). Shake NO otherwise.",
    on_r:"They point at 2 players. Nod YES or shake NO. Remember the Red Herring!"},
  undertaker:{id:"undertaker",name:"Undertaker",team:"good",type:"townsfolk",fn:0,on:51,
    ab:"Each night*, you learn which character died by execution today.",fn_r:"",
    on_r:"If a player was executed today, show their CHARACTER token. If no execution, do not wake."},
  monk:{id:"monk",name:"Monk",team:"good",type:"townsfolk",fn:0,on:21,
    ab:"Each night*, choose a player (not yourself): they are safe from the Demon tonight.",fn_r:"",
    on_r:"Monk points to a player (NOT themselves). That player cannot be killed by the Demon tonight."},
  ravenkeeper:{id:"ravenkeeper",name:"Ravenkeeper",team:"good",type:"townsfolk",fn:0,on:46,
    ab:"If you die at night, you are woken to choose a player: you learn their character.",fn_r:"",
    on_r:"ONLY if the Ravenkeeper died TONIGHT: wake them. They point at any player. Show that player's character token."},
  virgin:{id:"virgin",name:"Virgin",team:"good",type:"townsfolk",fn:0,on:0,
    ab:"The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.",fn_r:"",on_r:""},
  slayer:{id:"slayer",name:"Slayer",team:"good",type:"townsfolk",fn:0,on:0,
    ab:"Once per game, during the day, publicly choose a player: if they are the Demon, they die.",fn_r:"",on_r:""},
  soldier:{id:"soldier",name:"Soldier",team:"good",type:"townsfolk",fn:0,on:0,
    ab:"You are safe from the Demon.",fn_r:"",on_r:""},
  mayor:{id:"mayor",name:"Mayor",team:"good",type:"townsfolk",fn:0,on:0,
    ab:"If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.",fn_r:"",on_r:""},
  butler:{id:"butler",name:"Butler",team:"good",type:"outsider",fn:39,on:54,
    ab:"Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.",
    fn_r:"Butler points to a player (NOT themselves). That player is their Master.",
    on_r:"Butler points to a player (NOT themselves). That is their new Master."},
  drunk:{id:"drunk",name:"Drunk",team:"good",type:"outsider",fn:0,on:0,setup:true,
    ab:"You do not know you are the Drunk. You think you are a Townsfolk, but you are not.",fn_r:"",on_r:""},
  recluse:{id:"recluse",name:"Recluse",team:"good",type:"outsider",fn:0,on:0,
    ab:"You might register as evil & as a Minion or Demon, even if dead.",fn_r:"",on_r:""},
  saint:{id:"saint",name:"Saint",team:"good",type:"outsider",fn:0,on:0,
    ab:"If you die by execution, your team loses.",fn_r:"",on_r:""},
  poisoner:{id:"poisoner",name:"Poisoner",team:"evil",type:"minion",fn:17,on:7,
    ab:"Each night, choose a player: they are poisoned tonight and tomorrow day.",
    fn_r:"Poisoner points to a player. That player is poisoned tonight and all of tomorrow day.",
    on_r:"Clear previous poison first. Poisoner points to a new target. That player is poisoned tonight and tomorrow day."},
  spy:{id:"spy",name:"Spy",team:"evil",type:"minion",fn:18,on:22,
    ab:"Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.",
    fn_r:"Show the Spy the Grimoire (your phone screen with all roles visible).",
    on_r:"Show the Spy the Grimoire."},
  scarletwoman:{id:"scarletwoman",name:"Scarlet Woman",team:"evil",type:"minion",fn:0,on:25,
    ab:"If there are 5 or more players alive & the Demon dies, you become the Demon.",fn_r:"",
    on_r:"ONLY if the Demon died today AND 5+ alive: wake Scarlet Woman. Show 'You are' then Imp token."},
  baron:{id:"baron",name:"Baron",team:"evil",type:"minion",fn:0,on:0,setup:true,
    ab:"There are extra Outsiders in play. [+2 Outsiders]",fn_r:"",on_r:""},
  imp:{id:"imp",name:"Imp",team:"evil",type:"demon",fn:0,on:30,
    ab:"Each night*, choose a player: they die. If you kill yourself, a Minion becomes the Imp.",fn_r:"",
    on_r:"Imp points to a player — that player DIES. If Imp points to THEMSELVES: Imp dies, choose an alive Minion to become the new Imp."},
};

const TB_FIRST_NIGHT = [
  {id:"_minioninfo",order:10,title:"🤝 Minion Info"},
  {id:"_demoninfo",order:11,title:"😈 Demon Info"},
  {id:"poisoner",order:17},{id:"spy",order:18},
  {id:"washerwoman",order:33},{id:"librarian",order:34},{id:"investigator",order:35},
  {id:"chef",order:36},{id:"empath",order:37},{id:"fortuneteller",order:38},{id:"butler",order:39},
];
const TB_OTHER_NIGHT = [
  {id:"poisoner",order:7},{id:"monk",order:21},{id:"spy",order:22},
  {id:"scarletwoman",order:25},{id:"imp",order:30},{id:"ravenkeeper",order:46},
  {id:"undertaker",order:51},{id:"empath",order:52},{id:"fortuneteller",order:53},{id:"butler",order:54},
];

// Travellers for Trouble Brewing
const TB_TRAVELLERS = {
  scapegoat: {
    id: "scapegoat", name: "Scapegoat", team: "traveller", type: "traveller",
    ab: "If a player of your alignment is executed, you might be executed instead.",
    script: "tb"
  },
  gunslinger: {
    id: "gunslinger", name: "Gunslinger", team: "traveller", type: "traveller",
    ab: "Each day, after the 1st vote has been tallied, you may choose a player that voted: they die.",
    script: "tb"
  },
  beggar: {
    id: "beggar", name: "Beggar", team: "traveller", type: "traveller",
    ab: "You must use a vote token to vote. If a dead player gives you theirs, you learn their alignment. You are sober & healthy.",
    script: "tb"
  },
  bureaucrat: {
    id: "bureaucrat", name: "Bureaucrat", team: "traveller", type: "traveller",
    ab: "Each night, choose a player (not yourself): their vote counts as 3 votes tomorrow.",
    script: "tb"
  },
  thief: {
    id: "thief", name: "Thief", team: "traveller", type: "traveller",
    ab: "Each night, choose a player (not yourself): their vote counts negatively tomorrow.",
    script: "tb"
  },
};

const TB = {
  id: "tb",
  name: "Trouble Brewing",
  emoji: "🩸",
  color: "#e74c3c",
  tagline: "Recommended for new players",
  desc: "13 Townsfolk • 4 Outsiders • 4 Minions • Imp",
  C: TB_C,
  DIST: TB_DIST,
  FIRST_NIGHT: TB_FIRST_NIGHT,
  OTHER_NIGHT: TB_OTHER_NIGHT,
  demonFixed: true,       // Imp is the only demon
  defaultDemon: ["imp"],
  hasDrunk: true,         // Needs Drunk-believes-as picker
  TRAVELLERS: TB_TRAVELLERS,
};
