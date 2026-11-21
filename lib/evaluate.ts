import { AGGRESSOR, INCIDENT, hasFlag } from './flags';
import {
  CHIEFTAIN,
  allied,
  attack,
  atPeace,
  atWar,
  cities,
  hostile,
  inContact,
  level,
  rank,
  strength,
  vendetta,
} from './standing';
import {
  landMassesOf,
  presence,
  presenceOn,
} from '@civ-clone/base-diplomacy/lib/standing';
import { attitude, attitudeLevel, reputation } from './relations';
import City from '@civ-clone/core-city/City';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import { ownsWonder, pacifies } from './wonders';
import { lastContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { readers } from './readers';

// How a computer player comes to talks with another (OpenCiv2 `diplo_eval_ai_stance`, `diplomacy.cpp:227-484`), worked
//  out from the game as it stands. Pure: it changes nothing and draws no number, so rows can ask it as often as they
//  like. Left out: the space race, scenarios, the bloodlust rule, the aggression counter and the government change it
//  can call for (the computer players' own business, stage S).

export interface Evaluation {
  // The computer player's attitude to the other in talks (`diplo_eval.cur_attitude`), with the talks' adjustments.
  attitude: number;
  // How much it fears the other (`ai_fear_level`).
  fear: number;
  // The gold it would demand (`tribute_demand`), a whole number of 50s, at most 1000.
  tribute: number;
  // Whether it means to threaten (`ai_aggressive`).
  aggressive: boolean;
  // `aggressive` before the other players were weighed (`ai_initial_aggressive`).
  initialAggressive: boolean;
  // `ai_aggressive` before the Great Wall or the United Nations suppressed it.
  suppressedAggression: boolean;
  // 0 asks for nothing, 1 asks, 2 demands (`ai_request_mode`).
  requestMode: 0 | 1 | 2;
  // The other is the world's leader (`target_is_leader`).
  targetIsLeader: boolean;
  // The third player it would have the other fight (`war_target_civ`).
  warTarget: Player | null;
  // How much it wants peace (`peace_inclination`).
  peaceInclination: number;
  // Whether it means to declare war at this meeting (`ai_declare_war`).
  declareWar: boolean;
  // How many of its cities the other holds (`captured_city_count`).
  capturedCities: number;
  // Whether its units are near one of the other's cities (`ai_units_near_cities`).
  unitsNearCities: boolean;
  // The other's reputation less its credit (`reputation - reputation_credit`).
  reputation: number;
  // How many turns since they were last in contact, as the meeting began (`diplo_eval.last_contact_turn`): Infinity
  //  if never.
  turnsSinceContact: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const div = (value: number, by: number): number => Math.trunc(value / by);

/** How much warmer (lower) a computer player's attitude in talks is to the owner of the Great Wall or the United Nations. */
export const PACIFYING_ATTITUDE = 10;

/** How many more of the Eiffel Tower's owner's proposals a computer player hears before it ends the meeting. */
export const EIFFEL_TOWER_PATIENCE = 1;

/** `holder`'s attitude toward `toward`, 50 before one is seeded. */
export const attitudeOf =
  (dependencies: Dependencies) =>
  (holder: Player, toward: Player): number =>
    attitude(dependencies).get(holder, toward) ?? 50;

export const evaluate = (
  dependencies: Dependencies,
  computer: Player,
  other: Player
): Evaluation => {
  const read = readers(dependencies),
    feelings = attitudeOf(dependencies),
    reputations = reputation(dependencies),
    theirReputation = reputations.get(other),
    credit = reputations.credit(computer, other),
    effective = theirReputation - credit,
    difficulty = level(dependencies),
    ourRank = rank(dependencies, computer),
    theirRank = rank(dependencies, other),
    ourStrength = strength(dependencies, computer),
    theirStrength = strength(dependencies, other),
    ourNukes = read.nuclear(computer),
    theirNukes = read.nuclear(other),
    alliance = allied(dependencies, computer, other),
    war = atWar(dependencies, computer, other),
    holdsVendetta = vendetta(dependencies, computer, other),
    others = dependencies.playerRegistry
      .entries()
      .filter((player) => player !== computer && player !== other);

  let fear = 0,
    tribute = 0,
    aggressive = false,
    requestMode: 0 | 1 | 2 = 1,
    targetIsLeader = false,
    suppressedAggression = false,
    warTarget: Player | null = null,
    peaceInclination = 0,
    declareWar = false,
    current = feelings(computer, other);

  // Each land mass (`diplo_stance_continents`).
  const presences = presence(dependencies, computer, other),
    ours = presences.get(computer)!,
    theirs = presences.get(other)!,
    ourCities = cities(dependencies, computer),
    wars = dependencies.playerRegistry
      .entries()
      .filter((player) => atWar(dependencies, other, player)).length,
    turn = dependencies.turn.value();

  landMassesOf(ours, theirs).forEach((landMass) => {
    const us = presenceOn(ours, landMass),
      them = presenceOn(theirs, landMass);

    if (us.cities > (ourCities > 1 ? 1 : 0) && us.defence < them.attack) {
      fear += div(
        them.attack * (difficulty === CHIEFTAIN ? 4 : 2),
        us.defence + 1
      );

      return;
    }

    if (us.defence !== 0 && them.defence !== 0) {
      aggressive = true;
    }

    if (them.cities === 0) {
      tribute +=
        us.cities === 0
          ? div(us.attack - them.attack, 4)
          : div(us.defence - them.attack, 2);

      return;
    }

    tribute +=
      us.cities < 2 && (turn <= 200 - wars * 50 || theirRank > 6 || ourRank > 6)
        ? us.attack
        : us.attack - them.attack;
  });

  // Marco Polo's computer owner asks a quarter more.
  if (ownsWonder(dependencies, computer, 'marco-polos-embassy')) {
    tribute += div(tribute, 4);
  }

  if (
    theirRank === 7 &&
    cities(dependencies, other) > 4 &&
    ourCities > 1 &&
    theirNukes === 0 &&
    difficulty !== CHIEFTAIN &&
    turn > 200
  ) {
    targetIsLeader = true;
  }

  if (
    (targetIsLeader || (holdsVendetta && theirStrength < ourStrength * 3)) &&
    theirNukes === 0
  ) {
    tribute = clamp(tribute, ourRank * 2, 9999);

    if (!aggressive) {
      tribute = clamp(
        tribute,
        0,
        div(div(gold(dependencies, other), 50), 8 - ourRank || 1)
      );
    }

    aggressive = true;
    fear = 0;

    if (current < 76) {
      current = 75;
    }
  }

  if (ourNukes !== 0 && theirNukes === 0) {
    aggressive = true;
    tribute = clamp(tribute, 100, 9999);
  }

  if (theirNukes !== 0 && !alliance) {
    if (ourNukes === 0) {
      fear = (theirReputation >> 1) + 1;

      if (fear < 5) {
        fear = 4;
      }
    } else {
      tribute = div(ourNukes * div(tribute, 2), theirNukes);
    }
  }

  fear = div(fear, div(theirReputation - 1, 2) + 1);

  if (alliance) {
    current -= 25;
  }

  if (war) {
    current += 25;
  }

  if (theirReputation !== 0) {
    current += (theirReputation - 1 - credit) * 5;
  }

  if (current < 26) {
    tribute = div(tribute, 2);
    aggressive = false;
  } else if (attitudeLevel(current) < 4) {
    tribute = div(tribute * 2, 3);
  } else if (current > 74) {
    tribute = div(tribute * 3, 2);
    aggressive = true;
  }

  if (hasFlag(dependencies, computer, other, AGGRESSOR)) {
    aggressive = true;
  }

  if (fear !== 0) {
    aggressive = false;
    requestMode = 0;
  }

  if (pacifies(dependencies, other)) {
    targetIsLeader = false;
    suppressedAggression = aggressive;
    aggressive = false;
    current -= PACIFYING_ATTITUDE;
  }

  if (theirReputation !== 0) {
    tribute += div(theirReputation * tribute, 2);
  }

  if (holdsVendetta) {
    tribute *= 2;
  } else if (hasFlag(dependencies, computer, other, INCIDENT)) {
    tribute = div(tribute, 4);
  }

  const unitsNearCities = dependencies.cityRegistry
    .getByPlayer(other)
    .some((city: City) =>
      dependencies.unitRegistry
        .getByPlayer(computer)
        .some((unit) => unit.tile().distanceFrom(city.tile()) < 3)
    );

  if (unitsNearCities) {
    tribute *= 2;
  }

  tribute = clamp(div((difficulty + 1) * tribute, 32), 0, 20) * 50;

  const theirGold = gold(dependencies, other);

  if (tribute > theirGold && tribute < theirGold * 2 && theirGold > 49) {
    tribute = div(theirGold, 50) * 50;
  }

  if (tribute === 0 || ourStrength * 3 < theirStrength) {
    aggressive = false;
  }

  if (!aggressive) {
    if (alliance) {
      requestMode = 0;
    }
  } else {
    requestMode = 2;
  }

  const initialAggressive = aggressive;

  if (holdsVendetta) {
    peaceInclination = -2;
  }

  if (theirReputation !== 0) {
    peaceInclination -= div(theirReputation - 1, 2);
  }

  // The other players (`diplo_stance_other_civs`).
  let strongest = -1;

  others.forEach((third) => {
    if (allied(dependencies, computer, third)) {
      if (ourRank < theirRank) {
        peaceInclination--;
      }

      if (
        theirRank === 7 &&
        cities(dependencies, other) > 4 &&
        turn > 200 &&
        difficulty !== CHIEFTAIN &&
        inContact(dependencies, third, other)
      ) {
        if (fear === 0) {
          if (
            atWar(dependencies, third, other) &&
            !pacifies(dependencies, other)
          ) {
            aggressive = true;
          }
        } else {
          fear = clamp(fear - 4, 0, 99);
        }
      }
    }

    if (hostile(dependencies, computer, third, feelings)) {
      const thirdStrength = strength(dependencies, third);

      if (
        thirdStrength * 4 - ourStrength !== 0 &&
        ourStrength <= thirdStrength * 4
      ) {
        peaceInclination++;
      }

      if (ourStrength < thirdStrength) {
        peaceInclination++;
      }

      if (
        inContact(dependencies, other, third) &&
        !atWar(dependencies, other, third)
      ) {
        warTarget = third;
      }

      if (atWar(dependencies, computer, third) && thirdStrength > strongest) {
        strongest = thirdStrength;
      }
    }
  });

  peaceInclination -= attack(dependencies, computer);

  if (theirStrength < ourStrength) {
    peaceInclination--;
  }

  if (
    (hostile(dependencies, computer, other, feelings) ? 1 : 0) <
      peaceInclination &&
    !targetIsLeader &&
    !alliance &&
    !hasFlag(dependencies, computer, other, AGGRESSOR)
  ) {
    aggressive = false;
  }

  const capturedCities = dependencies.cityRegistry
    .getByPlayer(other)
    .filter((city: City) => city.originalPlayer() === computer).length;

  if (
    (!war || capturedCities > 4) &&
    !alliance &&
    (aggressive || (suppressedAggression && effective > 6 && holdsVendetta)) &&
    (ourStrength < theirStrength || holdsVendetta || effective > 6)
  ) {
    declareWar = true;
  }

  if (declareWar) {
    aggressive = false;
    requestMode = 0;

    if (current > 29) {
      current = 30;
    }
  }

  if (fear === 0 && current < 2) {
    current = 1;
  }

  if (!war && current > 98) {
    current = 99;
  }

  if ((alliance || requestMode === 0) && current > 73) {
    current = 74;
  }

  if (war && current < 27) {
    current = 26;
  }

  return {
    attitude: current,
    fear,
    tribute,
    aggressive,
    suppressedAggression,
    requestMode,
    targetIsLeader,
    warTarget,
    peaceInclination,
    declareWar,
    capturedCities,
    unitsNearCities,
    reputation: effective,
    initialAggressive,
    turnsSinceContact: (() => {
      const last = lastContact(dependencies, computer, other);

      return last === undefined ? Infinity : turn - last;
    })(),
  };
};

/** `diplo_patience_limit`: how many proposals the computer player hears from `other` before it ends the meeting. */
export const patienceLimit = (
  dependencies: Dependencies,
  computer: Player,
  other: Player,
  talksAttitude: number
): number => {
  let limit = 2;

  if (talksAttitude < 25) {
    limit = 3;
  }

  if (talksAttitude > 60) {
    limit--;
  }

  if (ownsWonder(dependencies, other, 'eiffel-tower')) {
    limit += EIFFEL_TOWER_PATIENCE;
  }

  if (atPeace(dependencies, computer, other)) {
    limit++;
  }

  if (allied(dependencies, computer, other)) {
    limit += 2;
  }

  if (atWar(dependencies, computer, other)) {
    limit = 2;
  }

  return limit;
};

const gold = (dependencies: Dependencies, player: Player): number => {
  try {
    return dependencies.playerTreasuryRegistry
      .getByPlayerAndType(player, Gold)
      .value();
  } catch (e) {
    return 0;
  }
};
