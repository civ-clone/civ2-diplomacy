import { CHIEFTAIN, PRINCE, WARLORD } from './standing';
import { attitudeLevel } from './relations';

// Civilization II's talks as plain arithmetic, from OpenCiv2 `src/auto/diplomacy.cpp` (Classic), each a function of
//  plain numbers so a test can sit either side of every threshold. The rows (`lib/talks`) gather the numbers from the
//  game. In the original's code `civ` is the computer player and `civ2` the person; here they are `computer` and
//  `person`, and "reputation" is the person's less the computer player's credit, unless it says otherwise.

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const div = (value: number, by: number): number => Math.trunc(value / by);

/** `diplo_gold_attitude_value` (`:1352`): what gold is worth in attitude, the first 50 at 1 in 10, then each 100 less. */
export const goldAttitudeValue = (gold: number): number => {
  let value = 0,
    divisor = 10,
    step = 50;

  while (gold > 0) {
    value += div(clamp(gold, 0, step), divisor);
    divisor += 5;
    gold -= step;
    step = 100;
  }

  return value;
};

export interface AllianceInputs {
  level: number;
  // How many allies the person has.
  personAllies: number;
  // Whether the computer player has a war target in mind.
  hasWarTarget: boolean;
  computerRank: number;
  personRank: number;
  computerStrength: number;
  personStrength: number;
  targetIsLeader: boolean;
  fear: number;
  peaceInclination: number;
  attitude: number;
  reputation: number;
  turn: number;
  // The war target is fighting the computer player and is at least this strong (`(3/2 or 2) × strength`): reason 2.
  targetFightingAndStrong: boolean;
  // A common enemy it could pick, after turn 99 (reason 4).
  commonEnemy: boolean;
  vendetta: boolean;
  // The war target is the person's ally (reason 1).
  targetIsPersonsAlly: boolean;
  patienceSpent: number;
}

/**
 * `diplo_alliance_willing` (`:1374`): whether the computer player will ally with the person, and why (bits: 1 the war
 *  target is the person's ally, 2 the target is fighting it and strong, 4 a common enemy).
 */
export const allianceWilling = (
  inputs: AllianceInputs
): { agree: boolean; reasons: number } => {
  let score = inputs.hasWarTarget ? 0 : 1,
    reasons = 0;

  if (inputs.level < PRINCE) {
    score--;
  }

  if (inputs.computerRank < 5 && inputs.personRank < 5) {
    if (inputs.level > WARLORD && inputs.personAllies === 0) {
      score--;
    }

    score--;
  }

  if (inputs.personRank < inputs.computerRank) {
    if (inputs.computerRank > 5) {
      score++;
    }

    if (inputs.computerRank > 6) {
      score++;
    }

    if (
      inputs.personRank < 6 &&
      inputs.computerStrength < inputs.personStrength
    ) {
      score--;
    }
  }

  if (!inputs.targetIsLeader) {
    if (inputs.personRank - inputs.computerRank > 2) {
      score--;
    }
  } else {
    score++;
  }

  if (inputs.fear !== 0) {
    score--;
  }

  let agree =
    inputs.level === CHIEFTAIN ||
    (attitudeLevel(inputs.attitude) < 4 && score < inputs.peaceInclination);

  if (inputs.personRank === 7 && inputs.personAllies !== 0) {
    agree = false;
  }

  if (inputs.reputation > (inputs.level === CHIEFTAIN ? 4 : 2)) {
    agree = false;
  }

  if (inputs.personRank < 4 && inputs.personRank * 20 < inputs.turn) {
    agree = true;
  }

  if (inputs.targetFightingAndStrong) {
    agree = true;
    reasons = 2;
  }

  if (
    reasons === 0 &&
    inputs.commonEnemy &&
    inputs.personRank < 7 &&
    inputs.computerRank < 7 &&
    inputs.turn > 99 &&
    inputs.personAllies < 7 - inputs.personRank &&
    attitudeLevel(inputs.attitude) < 5
  ) {
    agree = true;
    reasons |= 4;
  }

  if (inputs.vendetta || inputs.reputation > 4) {
    agree = false;
  }

  if (inputs.targetIsPersonsAlly) {
    agree = true;
    reasons |= 1;
  }

  if (inputs.attitude > 75) {
    agree = false;
  }

  if (inputs.patienceSpent > 4 && inputs.level !== CHIEFTAIN) {
    agree = false;
  }

  return { agree, reasons };
};

export interface PeaceInputs {
  level: number;
  targetIsLeader: boolean;
  attitude: number;
  reputation: number;
  // As `AllianceInputs`: reason 3 (both bits) and reason 4.
  targetFightingAndStrong: boolean;
  targetIsPersonsAlly: boolean;
  vendetta: boolean;
  // The computer leader's attack attitude, −1 to 1.
  attack: number;
  // The person owns the Great Wall or the United Nations: the computer player always accepts.
  personPacifies: boolean;
}

/**
 * `diplo_answer_peace`'s willingness (`:1673-1720`): 0 refuses, otherwise bits: 1 willing, 2 and 4 the war target's
 *  reasons, 8 the person's Great Wall or United Nations.
 */
export const peaceFlags = (inputs: PeaceInputs): number => {
  let flags =
    !inputs.targetIsLeader &&
    inputs.attitude < 51 &&
    inputs.reputation <= (inputs.level === CHIEFTAIN ? 6 : 4)
      ? 1
      : 0;

  if (inputs.targetFightingAndStrong) {
    flags = 3;
  }

  if (inputs.targetIsPersonsAlly) {
    flags |= 4;
  }

  if (
    (inputs.vendetta && inputs.reputation > 2 - inputs.attack) ||
    inputs.reputation > 6
  ) {
    flags = 0;
  }

  if (inputs.attitude > 75) {
    flags = 0;
  }

  if (inputs.personPacifies) {
    flags |= 8;
  }

  return flags;
};

/**
 * The gold a computer player asks before it signs (`:1563-1580` for an alliance, `:1773-1790` for peace): its share of
 *  the person's gold, by strength, plus the reputation (twice over for an alliance), in 50s, doubled when it is the
 *  weaker, then cut to what the person has. 0 for none.
 */
export const sweetenerGold = (
  personGold: number,
  computerStrength: number,
  personStrength: number,
  personReputation: number,
  alliance: boolean
): number => {
  const units =
    div(
      div(personGold, 50) * computerStrength,
      computerStrength + personStrength + 1
    ) +
    personReputation * (alliance ? 2 : 1);

  let offer = units * (computerStrength < personStrength ? 100 : 50);

  while (personGold < offer) {
    offer -= 50;
  }

  return Math.max(offer, 0);
};

/** Whether a sweetener is asked at all: patience spent, a cold attitude, or any reputation (`:1530-1535`, `:1752`). */
export const asksSweetener = (
  patienceSpent: number,
  attitude: number,
  reputation: number,
  declareWar: boolean,
  alliance: boolean
): boolean =>
  alliance
    ? patienceSpent > 1 || attitude > 25 || reputation !== 0 || declareWar
    : patienceSpent > 1 || attitude > 50 || reputation > 1;

export interface TributeInputs {
  // 3 an ally asked for a gift, 4 tribute demanded, 5 withdrawal demanded.
  proposal: 3 | 4 | 5;
  fear: number;
  computerGold: number;
  computerRank: number;
  personRank: number;
  turnsSinceContact: number;
  atPeace: boolean;
  computerPacifies: boolean;
}

/** `diplo_answer_demand`'s tribute (`:1878-1905`): the gold the computer player gives the person, 0 for none. */
export const demandedTribute = (inputs: TributeInputs): number => {
  const fear =
    inputs.proposal === 3 && inputs.personRank < inputs.computerRank
      ? inputs.computerRank - inputs.personRank
      : inputs.fear;

  let tribute = clamp(fear, 0, div(inputs.computerGold, 50)) * 50;

  if (inputs.turnsSinceContact < 8) {
    tribute = 0;
  }

  if (inputs.turnsSinceContact < 16) {
    tribute = div(tribute, 2);
  }

  if (!inputs.atPeace) {
    tribute = div(tribute, 2);
  }

  if (inputs.computerPacifies) {
    tribute = 0;
  }

  return tribute;
};

/** The attitude a demand costs (`:1967-1981`): withdrawal +2; tribute +10; an ally's gift +10, +5, or 0. */
export const demandAttitude = (
  proposal: 3 | 4 | 5,
  computerRank: number,
  personRank: number,
  computerAdvances: number,
  personAdvances: number
): number => {
  if (proposal === 5) {
    return 2;
  }

  if (proposal === 4) {
    return 10;
  }

  let delta = personRank < computerRank ? 5 : 10;

  if (
    (personAdvances < computerAdvances && personRank < computerRank) ||
    personRank < 4
  ) {
    delta = 0;
  }

  return delta;
};

export interface ShareMapsInputs {
  allied: boolean;
  // The person owns Marco Polo's Embassy or Magellan's Expedition.
  personOwnsMapWonder: boolean;
  attitude: number;
  personKnowsMapMaking: boolean;
  computerKnowsMapMaking: boolean;
}

/** `diplo_favor_menu`'s map gate (`:2397-2405`): allied (or a map wonder), attitude 25 or less, both with Map Making. */
export const sharesMaps = (inputs: ShareMapsInputs): boolean =>
  !(
    (!inputs.allied && inputs.attitude > 0 && !inputs.personOwnsMapWonder) ||
    inputs.attitude > 25 ||
    !inputs.personKnowsMapMaking ||
    !inputs.computerKnowsMapMaking
  );

export interface WarPriceInputs {
  // The person's reputation, raw, and the target's.
  personReputation: number;
  targetReputation: number;
  credit: number;
  computerGold: number;
  personGold: number;
  targetStrength: number;
  // The computer player's treaty with the target: a ceasefire or peace, an alliance.
  computerTreatyWithTarget: boolean;
  computerAlliedWithTarget: boolean;
  targetIsLeader: boolean;
  personAtWarWithTarget: boolean;
  allied: boolean;
  computerAtWarWithAnyone: boolean;
  targetSneakAttackedPerson: boolean;
  personRank: number;
  computerRank: number;
  targetRank: number;
  targetNukedPerson: boolean;
  personNukedTarget: boolean;
}

/** `diplo_favor_war_price` (`:2215`): the gold the computer player asks to declare war on the target. */
export const warPrice = (inputs: WarPriceInputs): number => {
  let price =
    clamp(
      div(
        (inputs.personReputation +
          div(inputs.computerGold, 100) -
          inputs.targetReputation -
          inputs.credit) *
          (inputs.targetStrength >> 1),
        50
      ),
      2,
      500
    ) * 50;

  if (!inputs.computerTreatyWithTarget) {
    price -= div(price, 3);
  }

  if (inputs.computerGold < inputs.personGold) {
    price += div(price, 3);
  }

  if (inputs.computerAlliedWithTarget) {
    price = clamp(Math.min(price, 7000) * 3, 500, 25000);
  }

  if (inputs.targetIsLeader) {
    price = div(price, 2);
  }

  if (!inputs.personAtWarWithTarget) {
    price += div(price, 3);
  }

  if (inputs.allied) {
    if (!inputs.computerAtWarWithAnyone) {
      price -= div(price, 4);
    }

    if (inputs.targetSneakAttackedPerson) {
      price -= div(price, 4);
    }

    if (inputs.personRank < inputs.computerRank) {
      price -= div(price, 3);
    }
  }

  if (inputs.targetNukedPerson) {
    if (!inputs.personNukedTarget) {
      price = div(price, 2);
    }

    if (inputs.personRank < inputs.targetRank) {
      price = div(price, 2);
    }
  }

  return clamp(div(price, 100), 1, 500) * 50;
};

export interface DistrustInputs {
  reputation: number;
  attack: number;
  vendetta: boolean;
  personAtWarWithTarget: boolean;
  targetRank: number;
  personRank: number;
  computerRank: number;
  allied: boolean;
}

/** `diplo_favor_war_distrust` (`:2276`). */
export const warDistrust = (inputs: DistrustInputs): number => {
  let distrust = inputs.reputation - inputs.attack;

  if (inputs.vendetta) {
    distrust += 2;
  }

  if (!inputs.personAtWarWithTarget) {
    distrust++;
  }

  if (inputs.targetRank < inputs.personRank) {
    distrust++;
  }

  if (inputs.computerRank < inputs.personRank) {
    distrust++;
  }

  if (inputs.allied) {
    distrust = div(distrust, 2);
  }

  return distrust;
};

/**
 * Whether the computer player takes the person's money to declare war on the target (`diplo_favor_menu`): distrust
 *  below 7, or the target is no ally of its, it has no vendetta, the person fights the target and isn't outranked.
 */
export const joinsWar = (
  distrust: number,
  targetIsComputersAlly: boolean,
  vendetta: boolean,
  personAtWarWithTarget: boolean,
  personOutrankedByTarget: boolean
): boolean =>
  distrust < 7 ||
  (!targetIsComputersAlly &&
    !vendetta &&
    personAtWarWithTarget &&
    !personOutrankedByTarget);

export interface SellInputs {
  value: number;
  knowers: number;
  attitude: number;
  personTopPowerAfter200: boolean;
  level: number;
  personGold: number;
  allied: boolean;
  personBehind: boolean;
  personFarBehind: boolean;
}

/** `diplo_offer_sell_tech` (`:647`): the price of an advance. */
export const sellPrice = (inputs: SellInputs): number => {
  let price = div(inputs.value * 200, Math.max(1, inputs.knowers - 1));

  if (inputs.attitude > 50) {
    price = div(price * inputs.attitude, 50);
  }

  if (inputs.personTopPowerAfter200 && inputs.level !== CHIEFTAIN) {
    price *= 2;
  }

  price = div(price * (inputs.personGold > 1500 ? 15 : 10), 10);

  if (inputs.personGold > 3000) {
    price = div(price * 3, 2);
  }

  if (inputs.allied) {
    price = inputs.personBehind ? div(price, 2) : price - div(price, 4);

    if (inputs.personFarBehind) {
      price = div(price, 2);
    }
  }

  if (price < 0) {
    return 30000;
  }

  return Math.max(100, price);
};

/** `diplo_senate_intervenes` (`:5410`): 0 below the Republic; the threshold the roll must reach. */
export const senateThreshold = (
  sneakAttack: boolean,
  ownsUnitedNations: boolean,
  otherReputation: number
): number =>
  clamp(
    (ownsUnitedNations ? 50 : sneakAttack ? 25 : 0) + otherReputation * 15,
    0,
    75
  );

/**
 * Whether the Senate steps in: never below the Republic; otherwise not when the turn's roll is under the threshold;
 *  then always under Democracy, and under the Republic only while its Senate is in session.
 */
export const senateSteps = (
  government: 'none' | 'republic' | 'democracy',
  roll: number,
  threshold: number,
  inSession: boolean
): boolean => {
  if (government === 'none' || roll < threshold) {
    return false;
  }

  return government === 'democracy' || inSession;
};

/**
 * The reputation a declaration of war costs (`diplo_declare_war`, `:1196-1265`). `broken` 'alliance', 'treaty' (a
 *  ceasefire or a peace) or 'none'; `ceasefireLingers` when the peace still carries a ceasefire, which charges twice;
 *  `own` when nobody made it declare (the original's `civ2 < 0`). Chieftain and the Eiffel Tower spare the first point,
 *  not the top power's.
 */
export const reputationCost = (
  broken: 'alliance' | 'treaty' | 'none',
  ceasefireLingers: boolean,
  own: boolean,
  chieftain: boolean,
  eiffel: boolean,
  topPower: boolean
): number => {
  if (broken === 'none') {
    return 0;
  }

  const spared = chieftain || eiffel;

  if (broken === 'alliance') {
    return (spared ? 0 : 1) + (own ? 1 : 0);
  }

  const once = (topPower && own ? 1 : 0) + (spared ? 0 : 1);

  return ceasefireLingers ? once * 2 : once;
};

/**
 * `game.cpp:1689-1704`: whether a player's reputation recovers by 1 this turn: checked every 12 × (level + 1) turns, on
 *  every 24 × (level + 1)th only, and only while above 1; with the Eiffel Tower on every check, down to 0.
 */
export const reputationRecovers = (
  turn: number,
  level: number,
  reputation: number,
  eiffel: boolean
): boolean => {
  if (turn % ((level + 1) * 12) !== 0 || reputation === 0) {
    return false;
  }

  return (
    (turn % ((level + 1) * 24) === 0 || eiffel) && (reputation > 1 || eiffel)
  );
};

/** `civ.cpp:4642-4660`: the attitude a computer player starts with, from a roll of 0 to 79. */
export const startingAttitude = (
  toPerson: boolean,
  level: number,
  roll: number
): number => (toPerson ? clamp(level * 5 + roll + 10, 10, 75) : roll + 10);

/**
 * Whether the computer players gang up on a player with this reputation (`civ.cpp:3141`): above three times its wars
 *  plus 3.
 */
export const gangsUp = (reputation: number, wars: number): boolean =>
  reputation > wars * 3 + 3;

/** `civ.cpp:7090`: the roll that a computer player's hostile intent turns into a broken treaty: 1 in this. */
export const breakChance = (reputation: number): number =>
  clamp(3 - (reputation >> 2), 1, 3);

/** The original's `rand() % n` for `random()` in [0, 1). */
export const roll = (random: () => number, n: number): number =>
  n <= 1 ? 0 : Math.floor(random() * n);
