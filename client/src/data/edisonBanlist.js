// Edison Format — March 2010 TCG Banlist
// Forbidden = 0 copies, Limited = 1, Semi-Limited = 2

export const EDISON_BANLIST = {
  forbidden: new Set([
    "Black Luster Soldier - Envoy of the Beginning",
    "Butterfly Dagger - Elma",
    "Card of Safe Return",
    "Change of Heart",
    "Chaos Emperor Dragon - Envoy of the End",
    "Confiscation",
    "Crush Card Virus",
    "Cyber Jar",
    "Cyber-Stein",
    "Dark Hole",
    "Dark Magician of Chaos",
    "Dark Strike Fighter",
    "Delinquent Duo",
    "Destiny HERO - Disk Commander",
    "Dimension Fusion",
    "Exchange of the Spirit",
    "Fiber Jar",
    "Graceful Charity",
    "Harpie's Feather Duster",
    "Imperial Order",
    "Last Turn",
    "Last Will",
    "Magical Scientist",
    "Magician of Faith",
    "Makyura the Destructor",
    "Metamorphosis",
    "Mirage of Nightmare",
    "Monster Reborn",
    "Painful Choice",
    "Pot of Greed",
    "Premature Burial",
    "Raigeki",
    "Ring of Destruction",
    "Sinister Serpent",
    "Snatch Steal",
    "The Forceful Sentry",
    "Thousand-Eyes Restrict",
    "Time Seal",
    "Tribe-Infecting Virus",
    "Tsukuyomi",
    "Victory Dragon",
    "Witch of the Black Forest",
    "Yata-Garasu",
  ]),

  limited: new Set([
    "Advanced Ritual Art",
    "Allure of Darkness",
    "Black Rose Dragon",
    "Blackwing - Gale the Whirlwind",
    "Brain Control",
    "Brionac, Dragon of the Ice Barrier",
    "Burial from a Different Dimension",
    "Call of the Haunted",
    "Card Destruction",
    "Card Trooper",
    "Ceasefire",
    "Chaos Sorcerer",
    "Charge of the Light Brigade",
    "Cold Wave",
    "Dark Armed Dragon",
    "Destiny Draw",
    "Elemental HERO Stratos",
    "Emergency Teleport",
    "Exodia the Forbidden One",
    "Foolish Burial",
    "Future Fusion",
    "Giant Trunade",
    "Gladiator Beast Bestiari",
    "Gorz the Emissary of Darkness",
    "Goyo Guardian",
    "Gravity Bind",
    "Heavy Storm",
    "Left Arm of the Forbidden One",
    "Left Leg of the Forbidden One",
    "Level Limit - Area B",
    "Limiter Removal",
    "Lumina, Lightsworn Summoner",
    "Magic Cylinder",
    "Magical Explosion",
    "Marshmallon",
    "Megamorph",
    "Mezuki",
    "Mind Control",
    "Mind Crush",
    "Mind Master",
    "Mirror Force",
    "Monster Gate",
    "Morphing Jar",
    "Mystical Space Typhoon",
    "Necro Gardna",
    "Necroface",
    "Neo-Spacian Grand Mole",
    "Night Assailant",
    "Ojama Trio",
    "One for One",
    "Overload Fusion",
    "Plaguespreader Zombie",
    "Reasoning",
    "Reinforcement of the Army",
    "Rescue Cat",
    "Return from the Different Dimension",
    "Right Arm of the Forbidden One",
    "Right Leg of the Forbidden One",
    "Sangan",
    "Scapegoat",
    "Snipe Hunter",
    "Solemn Judgment",
    "Spirit Reaper",
    "Summoner Monk",
    "Swords of Revealing Light",
    "The Transmigration Prophecy",
    "Torrential Tribute",
    "Tragoedia",
    "Trap Dustshoot",
    "Wall of Revealing Light",
  ]),

  semiLimited: new Set([
    "Black Whirlwind",
    "Bottomless Trap Hole",
    "Chain Strike",
    "Cyber Dragon",
    "Dandylion",
    "Demise, King of Armageddon",
    "Destiny HERO - Malicious",
    "Goblin Zombie",
    "Gold Sarcophagus",
    "Honest",
    "Judgment Dragon",
    "Lonefire Blossom",
    "Magical Stone Excavation",
    "Royal Decree",
    "Royal Oppression",
    "Skill Drain",
    "Treeborn Frog",
    "Ultimate Offering",
    "United We Stand",
  ]),
};

export const EDISON_CUTOFF_DATE = new Date(2010, 3, 25); // April 25, 2010

/**
 * Returns 'forbidden' | 'limited' | 'semi-limited' | 'unlimited' | 'not-legal'
 * 'not-legal' means the card's earliest print date is after the Edison cutoff.
 */
export function getEdisonStatus(cardName, earliestDateStr) {
  if (EDISON_BANLIST.forbidden.has(cardName)) return "forbidden";
  if (EDISON_BANLIST.limited.has(cardName)) return "limited";
  if (EDISON_BANLIST.semiLimited.has(cardName)) return "semi-limited";

  if (earliestDateStr) {
    const [day, month, year] = earliestDateStr.split("/");
    const date = new Date(year, month - 1, day);
    if (date >= EDISON_CUTOFF_DATE) return "not-legal";
  }

  return "unlimited";
}

export function maxCopiesInEdison(cardName) {
  if (EDISON_BANLIST.forbidden.has(cardName)) return 0;
  if (EDISON_BANLIST.limited.has(cardName)) return 1;
  if (EDISON_BANLIST.semiLimited.has(cardName)) return 2;
  return 3;
}
