// Edison Format — September 2010 TCG Banlist
// Forbidden = 0 copies, Limited = 1, Semi-Limited = 2

export const EDISON_BANLIST = {
  forbidden: new Set([
    "Chaos Emperor Dragon - Envoy of the End",
    "Dark Magician of Chaos",
    "Fiber Jar",
    "Gale Dogra",
    "Graceful Charity",
    "Harpie's Feather Duster",
    "Imperial Order",
    "Last Turn",
    "Magical Scientist",
    "Makyura the Destructor",
    "Mirage of Nightmare",
    "Morphing Jar #2",
    "Painful Choice",
    "Pot of Greed",
    "Raigeki",
    "Sixth Sense",
    "The Forceful Sentry",
    "Time Seal",
    "Witch of the Black Forest",
    "Exchange of the Spirit",
    "Dark Hole",
    "Cyber Jar",
    "Change of Heart",
  ]),

  limited: new Set([
    "Black Whirlwind",
    "Book of Moon",
    "Brain Control",
    "Burial from a Different Dimension",
    "Card Destruction",
    "Cold Wave",
    "Crush Card Virus",
    "Cyber-Stein",
    "D.D. Crow",
    "Dandylion",
    "Dark Armed Dragon",
    "Demise, King of Armageddon",
    "Future Fusion",
    "Gateway of the Six",
    "Gold Sarcophagus",
    "Heavy Storm",
    "Honest",
    "Infernity Launcher",
    "Limiter Removal",
    "Lumina, Lightsworn Summoner",
    "Mind Control",
    "Mirror Force",
    "Monster Reborn",
    "One for One",
    "Overload Fusion",
    "Phantom of Chaos",
    "Pot of Avarice",
    "Preparation of Rites",
    "Reinforcement of the Army",
    "Royal Oppression",
    "Snipe Hunter",
    "Solemn Judgment",
    "Spell Striker",
    "Starlight Road",
    "Summoner Monk",
    "Swallow's Nest",
    "Trap Dustshoot",
    "Trishula, Dragon of the Ice Barrier",
    "Charge of the Light Brigade",
    "Allure of Darkness",
    "Destiny Draw",
    "Mezuki",
    "Plaguespreader Zombie",
    "Foolish Burial",
    "Giant Trunade",
    "Lightning Vortex",
    "United We Stand",
    "Premature Burial",
  ]),

  semiLimited: new Set([
    "Debris Dragon",
    "Emergency Teleport",
    "Level Eater",
    "Mystical Space Typhoon",
    "Nobleman of Crossout",
    "Overdrive Teleporter",
    "Ultimate Offering",
    "Pulling the Rug",
    "Bottomless Trap Hole",
    "Ojama Trio",
    "Gravity Bind",
    "Upstart Goblin",
    "Magic Cylinder",
    "Ceasefire",
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
