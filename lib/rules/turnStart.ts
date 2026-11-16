import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  BROKEN,
  CHANGED_THIS_TURN,
  RECENT_CONTACT,
  TRIBUTE,
  WITHDRAWAL_DEMANDED,
  setBoth,
  clearBoth,
  CEASEFIRE_LINGERS,
  SNEAK_ATTACK,
  HOSTILE_INTENT,
  INCIDENT,
  TURN_BITS,
  clearFlag,
  hasFlag,
  setFlag,
} from '../flags';
import {
  CHIEFTAIN,
  advanceCount,
  allied,
  atPeace,
  atWar,
  attack,
  cities,
  civilize,
  expand,
  gangUpLeader,
  hostile,
  human,
  inContact,
  knows,
  level,
  rank,
  strength,
  vendetta,
} from '../standing';
import {
  TreatyLevel,
  hasTreatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import { activeDeclarations } from '@civ-clone/base-diplomacy/lib/declareWar';
import { declareWarQuietly, expireSilently, makeTreatyPeace } from '../effects';
import { attitude, reputation } from '../relations';
import { breakChance, gangsUp, reputationRecovers, roll } from '../formulas';
import {
  gold,
  landMassesOf,
  presence,
  presenceOn,
} from '@civ-clone/base-diplomacy/lib/standing';
import {
  lastContact,
  recordContact,
} from '@civ-clone/base-diplomacy/lib/lastContact';
import { ownsWonder, pacifies } from '../wonders';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import { callAlly } from '../callForHelp';
import { hasEmbassy } from '@civ-clone/base-diplomacy/lib/embassy';
import {
  cancelAlliance,
  makeAlliance,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Engine from '@civ-clone/core-engine/Engine';
import High from '@civ-clone/core-rule/Priorities/High';
import Peace from '@civ-clone/base-diplomacy-declaration-peace/Peace';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import TreatyFlagsRecord from '../../Records/TreatyFlagsRecord';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import Unit from '@civ-clone/core-unit/Unit';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import { attitudeOf } from '../evaluate';
import { give } from '@civ-clone/base-diplomacy/lib/knowledge';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { rollSenate } from '../senate';
import { NEVER, advances } from '@civ-clone/civ2-science/data/advances';
import Advance from '@civ-clone/core-science/Advance';
import { advanceValue } from '../survey';
import readers from '../readers';
import { forgetWarnings, noteIntruders, warn, warned } from '../border';

// The start of each player's turn (OpenCiv2 `civ_turn_update_diplomacy`, `civ.cpp:7040-7245`; `game.cpp:1689-1704`).

/** The rule ids that civ2-enhanced supersedes. */
export const RuleIds = {
  attitudeDrift: 'civ2-diplomacy:player/turn-start/attitude-drift',
  borderIntruders: 'civ2-diplomacy:player/turn-start/border-intruders',
  treatyBreaking: 'civ2-diplomacy:player/turn-start/treaty-breaking',
};

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

/** Every other player of the game, but the barbarians. */
const othersOf = (dependencies: Dependencies, player: Player): Player[] =>
  dependencies.playerRegistry
    .entries()
    .filter((other: Player) => other !== player && !barbarian(other));

// The border incidents counted at the start of a computer player's turn, for its attitude drift: the weight toward
//  each person, kept for the turn (`diplo_count_border_intruders`, `diplo_review_border_incident`).
const incidents = new WeakMap<Player, Map<Player, number>>();

// The units counted as intruders (`UNITF_BORDER_INTRUDER`): one counts once, whoever's borders it is in, until its
//  owner's next turn (`unit.cpp:978`) or until a review with no incident clears every mark (`diplomacy.cpp:6695-6702`).
//  The mark lasts a round at most, so it isn't saved; it is kept per game (by its unit registry).
interface Marks {
  units: WeakMap<Unit, number>;
  generation: number;
}

const marksByGame = new WeakMap<object, Marks>();

const marksOf = (dependencies: Dependencies): Marks => {
  const key = dependencies.unitRegistry as unknown as object,
    marks = marksByGame.get(key) ?? { units: new WeakMap(), generation: 0 };

  marksByGame.set(key, marks);

  return marks;
};

const marked = (dependencies: Dependencies, unit: Unit): boolean => {
  const marks = marksOf(dependencies);

  return marks.units.get(unit) === marks.generation;
};

const mark = (dependencies: Dependencies, unit: Unit): void => {
  const marks = marksOf(dependencies);

  marks.units.set(unit, marks.generation);
};

/** Whether the unit with `id` of `player`'s is marked as intruding now. */
export const intruding = (
  dependencies: Dependencies,
  player: Player
): ((id: string) => boolean) => {
  const units = dependencies.unitRegistry.getByPlayer(player);

  return (id: string) =>
    units.some((unit: Unit) => unit.id() === id && marked(dependencies, unit));
};

// A review with no incident clears every unit's mark.
const clearMarks = (dependencies: Dependencies): void => {
  marksOf(dependencies).generation++;
};

/** The start of `player`'s turn clears its own units' marks (`units_reset_for_turn`, `unit.cpp:978`). */
export const clearOwnMarks = (
  dependencies: Dependencies,
  player: Player
): void => {
  const marks = marksOf(dependencies);

  dependencies.unitRegistry
    .getByPlayer(player)
    .forEach((unit: Unit) => marks.units.delete(unit));
};

/** The drift's starting value for `computer` toward `intruder` this turn, if `border-intruders` counted an incident. */
export const incidentWeight = (
  computer: Player,
  intruder: Player
): number | undefined => incidents.get(computer)?.get(intruder);

export interface Intrusion {
  // The incident's weight: each unit 1, 1 more on a road, a railroad, a mine or irrigation, 2 more in a fortress.
  weight: number;
  // Repeat offences: units warned before, and cities with more than 3 intruders.
  repeat: number;
  // The units counted.
  units: Unit[];
}

/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): `intruder`'s units on the land squares of `holder`'s cities'
 *  radius, out of a city, on a square whose first unit is `intruder`'s. Each military unit counts (settlers,
 *  diplomats and trade units don't), once (`UNITF_BORDER_INTRUDER`); a unit warned before (`UNITF_BORDER_WARNED`,
 *  saved: `lib/border`) is a repeat offence, as is a city with more than 3. Allies don't count. With `everySquare`
 *  false (the original, B4) only the first such square of each city is looked at.
 */
export const borderIntruders = (
  dependencies: Dependencies,
  holder: Player,
  intruder: Player,
  everySquare: boolean
): Intrusion => {
  const intrusion: Intrusion = { weight: 0, repeat: 0, units: [] };

  if (allied(dependencies, holder, intruder)) {
    return intrusion;
  }

  const improvementWeight = (tile: Tile): number =>
    (dependencies.tileImprovementRegistry?.getByTile(tile) ?? []).reduce(
      (weight: number, improvement) => {
        const name = improvement.constructor.name;

        return (
          weight +
          (name === 'Fortress'
            ? 2
            : ['Road', 'Railroad', 'Mine', 'Irrigation'].includes(name)
            ? 1
            : 0)
        );
      },
      0
    );

  dependencies.cityRegistry.getByPlayer(holder).forEach((city: City) => {
    const squares = (() => {
      try {
        return city.tiles().entries() as Tile[];
      } catch (e) {
        return [] as Tile[];
      }
    })();

    let intruders = 0;

    for (const tile of squares) {
      if (
        tile === city.tile() ||
        tile.isWater() ||
        dependencies.cityRegistry.getByTile(tile) !== null
      ) {
        continue;
      }

      const [first] = dependencies.unitRegistry.getByTile(tile);

      if (first === undefined || first.player() !== intruder) {
        continue;
      }

      dependencies.unitRegistry
        .getByTile(tile)
        .filter(
          (unit: Unit) =>
            unit.player() === intruder &&
            unit.attack().value() > 0 &&
            !marked(dependencies, unit)
        )
        .forEach((unit: Unit) => {
          if (warned(dependencies, unit)) {
            intrusion.repeat++;
          } else {
            warn(dependencies, unit);
          }

          mark(dependencies, unit);
          intrusion.units.push(unit);
          intruders++;
          intrusion.weight += 1 + improvementWeight(tile);
        });

      if (!everySquare) {
        break;
      }
    }

    if (intruders > 3) {
      intrusion.repeat++;
    }
  });

  return intrusion;
};

// The treaties signed last turn, noted at the start of a computer player's turn before its marks are cleared
//  (`diplo_recent_peace_table`, `civ.cpp:7077-7079`).
const recentPeace = new WeakMap<Player, Set<Player>>();

/**
 * The border incidents `computer` counts at the start of its turn (`diplo_review_border_incident`, `:6418-6515`),
 *  toward each person it is in contact with (counted, marking and warning units, even at war, but only
 *  reviewed when neither):
 *
 * - without peace: the incident's weight starts the drift; with repeat offences (and a vendetta counting as one) above
 *   2 less the person's reputation, a roll of the reputation + repeats over 1 sets hostile intent both ways;
 * - at peace: a first offence starts the drift at the weight less 1; a repeat makes it demand at its next audience
 *   that the units counted leave, or war (`WITHDRAWAL_DEMANDED`, an incident, `civ2-diplomacy:audience-due`);
 * - a treaty signed last turn, or (at peace) contact in the last 2 turns, counts no incident.
 *
 * With a person reviewed and no incident, every unit's intruder mark is cleared. `everySquare` as `borderIntruders`.
 */
export const countIncidents = (
  dependencies: Dependencies,
  computer: Player,
  everySquare: boolean,
  random: () => number = Math.random,
  engine: Engine | null = null
): void => {
  const counted = new Map<Player, number>(),
    turn = dependencies.turn.value(),
    recent = (person: Player): boolean =>
      recentPeace.get(computer)?.has(person) ??
      hasFlag(dependencies, computer, person, CHANGED_THIS_TURN);

  let incident = false;

  // Every person it is in contact with is reviewed (`civ.cpp:7202-7205`); the count marks and warns their units even
  //  at war (not an ally's: `borderIntruders`), and is then set aside (`diplo_review_border_incident`, `:6430-6432`).
  const reviewed = othersOf(dependencies, computer).filter(
    (person: Player) =>
      human(dependencies, person) && inContact(dependencies, computer, person)
  );

  reviewed.forEach((person: Player) => {
    const intrusion = borderIntruders(
      dependencies,
      computer,
      person,
      everySquare
    );

    if (
      intrusion.weight === 0 ||
      allied(dependencies, computer, person) ||
      atWar(dependencies, computer, person)
    ) {
      return;
    }

    if (!hasTreatyLevel(dependencies, computer, person, TreatyLevel.Peace)) {
      if (recent(person)) {
        incident = true;

        return;
      }

      let repeat = intrusion.repeat;

      if (vendetta(dependencies, computer, person)) {
        repeat++;
      }

      const odds = reputation(dependencies).get(person) + repeat;

      if (odds > 2 && roll(random, odds) > 1) {
        setBoth(dependencies, computer, person, HOSTILE_INTENT);
      }

      counted.set(person, intrusion.weight);

      return;
    }

    const last = lastContact(dependencies, computer, person);

    if (
      recent(person) ||
      (last !== undefined && last < turn && turn - last < 3)
    ) {
      incident = true;

      return;
    }

    if (intrusion.repeat === 0) {
      incident = true;
      counted.set(person, intrusion.weight - 1);

      return;
    }

    noteIntruders(dependencies, computer, person, intrusion.units);
    setFlag(dependencies, computer, person, WITHDRAWAL_DEMANDED | INCIDENT);
    engine?.emit('civ2-diplomacy:audience-due', computer, person);
  });

  // A review with no incident clears the marks; with no person to review, there was no review.
  if (reviewed.length > 0 && !incident) {
    clearMarks(dependencies);
  }

  incidents.set(computer, counted);
};

/**
 * `diplo_review_attitude_delta` (`diplomacy.cpp:6517`): how much colder `computer` grows toward `person` this turn,
 *  starting from `start` (the border incidents' weight, or, in the original with none, a stale value: see
 *  `attitude-drift`).
 */
export const attitudeDelta = (
  dependencies: Dependencies,
  computer: Player,
  person: Player,
  start: number
): number => {
  const nuclear = (player: Player): number =>
      readers(dependencies).nuclear(player),
    players = dependencies.playerRegistry
      .entries()
      .filter((player: Player) => !barbarian(player)),
    feelings = attitudeOf(dependencies),
    personAdvances = advanceCount(dependencies, person),
    computerAdvances = advanceCount(dependencies, computer),
    personStrength = strength(dependencies, person),
    computerStrength = strength(dependencies, computer),
    personRank = rank(dependencies, person),
    computerRank = rank(dependencies, computer),
    turn = dependencies.turn.value(),
    difficulty = level(dependencies),
    alliance = allied(dependencies, computer, person),
    effectiveReputation =
      reputation(dependencies).get(person) -
      reputation(dependencies).credit(computer, person);

  let delta = start,
    hostileCount = 0,
    aheadCount = 0,
    warScore = 0;

  players.forEach((third: Player) => {
    if (personAdvances < advanceCount(dependencies, third)) {
      aheadCount++;
    }

    if (
      third !== computer &&
      hostile(dependencies, computer, third, feelings)
    ) {
      hostileCount++;
    }

    if (third !== person && atWar(dependencies, third, person)) {
      warScore += personStrength < strength(dependencies, third) ? 2 : 1;
    }
  });

  if (alliance) {
    if (hostileCount === 0) {
      if (gold(dependencies, computer) < gold(dependencies, person)) {
        delta++;
      }

      if (computerAdvances < personAdvances && difficulty !== CHIEFTAIN) {
        delta++;
      }

      if (personAdvances < computerAdvances) {
        delta--;
      }

      if (computerStrength < personStrength) {
        delta++;
      }

      if (personStrength < computerStrength) {
        delta--;
      }
    } else if (attack(dependencies, computer) < 1 || hostileCount > 1) {
      delta -= Math.max(1, hostileCount - attack(dependencies, computer) - 1);
    }

    if (computerAdvances + 8 < personAdvances) {
      delta++;
    }
  }

  if (atPeace(dependencies, computer, person)) {
    delta -= 2;
  }

  if (!atWar(dependencies, computer, person)) {
    delta--;
  }

  if (personRank < 7 && turn > 200) {
    let rankAdjust = 7 - personRank;

    if (turn < 400) {
      rankAdjust = (rankAdjust + 1) >> 1;
    }

    delta -= rankAdjust;
  }

  if (
    personRank === 7 &&
    cities(dependencies, person) > 3 &&
    turn > 200 &&
    difficulty !== CHIEFTAIN
  ) {
    let rankAdjust = Math.trunc(difficulty / 3) + 1;

    if (
      effectiveReputation <= warScore &&
      !vendetta(dependencies, computer, person)
    ) {
      rankAdjust >>= 1;
    }

    delta += rankAdjust;
  }

  // Nuclear weapons: the person's make it warmer, more so to one without (`:6592-6597`).
  if (nuclear(person) > 0) {
    const less = delta - 1;

    delta = nuclear(computer) === 0 && less > 0 ? delta - 2 : less;
  }

  const temper = Math.max(
    -2,
    attack(dependencies, computer) * 3 + expand(dependencies, computer) * 2
  );

  let rankDifference = personRank - computerRank;

  if (rankDifference < 0 || !alliance) {
    rankDifference = Math.trunc(rankDifference / 2);
  }

  delta += temper + rankDifference;

  // Its own weakness, unless the computer players are ganging up on a person who earned it (`:6608-6619`).
  if (
    gangUpLeader(dependencies, nuclear) === null ||
    (effectiveReputation <= warScore &&
      !vendetta(dependencies, computer, person))
  ) {
    if (computerStrength * 4 < personStrength) {
      delta--;
    }

    if (computerStrength * 2 < personStrength) {
      delta--;
    }

    if (Math.trunc((computerStrength * 3) / 2) < personStrength) {
      delta--;
    }
  }

  if (!alliance) {
    if (personStrength < computerStrength) {
      delta++;
    }

    if (personStrength * 2 < computerStrength) {
      delta++;
    }
  }

  if (pacifies(dependencies, person)) {
    delta = delta < 1 ? delta - 1 : delta >> 1;
  }

  if (aheadCount === 0) {
    delta++;
  }

  if (computerAdvances < personAdvances) {
    delta += 1 - civilize(dependencies, computer);
  }

  if (atWar(dependencies, computer, person) && delta < 1) {
    delta = 0;
  }

  if (ownsWonder(dependencies, computer, 'eiffel-tower')) {
    delta++;
  }

  if (ownsWonder(dependencies, person, 'eiffel-tower')) {
    if (delta > 0) {
      delta = Math.trunc(delta / 2);
    }

    delta = delta - 1 > -1 ? delta - 2 : delta - 1;
  }

  if (!inContact(dependencies, computer, person)) {
    delta = 0;
  }

  return delta;
};

/**
 * The attitude drift (`diplo_ai_review_relations`, `diplomacy.cpp:6683`): each turn a computer player's attitude to
 *  each person it is in contact with moves by `attitudeDelta`, starting from the border incidents' weight. With no
 *  incident, the original (Classic) starts from a stale value on the stack that the clamp turns into 100: the attitude
 *  is pinned at its coldest except on turns with an incident (B3). `fromZero` starts it at 0, as OpenCiv2's fix does
 *  (civ2-enhanced).
 */
export const driftAttitude = (
  dependencies: Dependencies,
  computer: Player,
  fromZero: boolean
): void =>
  othersOf(dependencies, computer)
    .filter(
      (person: Player) =>
        human(dependencies, person) && inContact(dependencies, computer, person)
    )
    .forEach((person: Player) => {
      const weight = incidentWeight(computer, person),
        attitudes = attitude(dependencies);

      if (weight === undefined && !fromZero) {
        attitudes.set(computer, person, 100, 'drift');

        return;
      }

      const start = weight ?? 0;

      attitudes.adjust(
        computer,
        person,
        attitudeDelta(dependencies, computer, person, start),
        'drift'
      );
    });

/**
 * A computer player that means to break its treaty with another (`HOSTILE_INTENT`) does so one time in
 *  `breakChance(reputation)` (`civ.cpp:7085-7110`): a ceasefire or peace ends; an ally is 100 colder instead. The
 *  original (Classic) ends it on the computer player's side only and says nothing (B37): here it ends without a word.
 *  `openly` announces it, as OpenCiv2's fix does (civ2-enhanced).
 */
export const breakTreaties = (
  dependencies: Dependencies,
  computer: Player,
  random: () => number,
  engine: Engine,
  openly: boolean
): void =>
  othersOf(dependencies, computer)
    .filter((other: Player) =>
      hasFlag(dependencies, computer, other, HOSTILE_INTENT)
    )
    .forEach((other: Player) => {
      if (
        roll(random, breakChance(reputation(dependencies).get(other))) !== 0
      ) {
        return;
      }

      clearFlag(dependencies, computer, other, HOSTILE_INTENT);

      if (allied(dependencies, computer, other)) {
        attitude(dependencies).adjust(computer, other, 100, 'hostile-intent');
        // No contact since: an audience is due (`last_contact_turn = -1`, `civ.cpp:7117`).
        recordContact(dependencies, computer, other, -1);

        return;
      }

      const turn = dependencies.turn.value(),
        last = lastContact(dependencies, computer, other);

      // `0x80840`: the aggressor, for long, and its treaty broken; contact no later than 8 turns ago.
      setFlag(
        dependencies,
        computer,
        other,
        AGGRESSOR | AGGRESSOR_LONG | BROKEN
      );
      recordContact(
        dependencies,
        computer,
        other,
        last === undefined || last < 0 ? turn - 8 : Math.max(last, turn - 8)
      );

      [Ceasefire, Peace].forEach((Type) =>
        activeDeclarations(dependencies, Type, computer, other).forEach(
          (declaration) =>
            openly
              ? declaration.expire(computer)
              : expireSilently(declaration, computer)
        )
      );

      if (openly) {
        engine.emit('civ2-diplomacy:treaty-broken', computer, other);
      }
    });

/** `diplo_ai_feels_secure` (`diplomacy.cpp:5452`), in part: whether `player` feels safe from `other`. */
export const feelsSecure = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  nuclear: (player: Player) => number
): boolean => {
  if (
    hasFlag(dependencies, player, other, AGGRESSOR) ||
    vendetta(dependencies, player, other)
  ) {
    return true;
  }

  const feelings = attitudeOf(dependencies),
    others = othersOf(dependencies, player).filter((third) => third !== other);

  for (const third of others) {
    if (!human(dependencies, third)) {
      continue;
    }

    if (
      hostile(dependencies, player, third, feelings) &&
      strength(dependencies, other) < strength(dependencies, third) &&
      !allied(dependencies, third, other)
    ) {
      return false;
    }

    if (
      hostile(dependencies, other, third, feelings) &&
      strength(dependencies, player) < strength(dependencies, third) &&
      !allied(dependencies, third, player)
    ) {
      return false;
    }
  }

  if (nuclear(player) < nuclear(other)) {
    return false;
  }

  let security = 0;

  others.forEach((third) => {
    if (hostile(dependencies, player, third, feelings)) {
      security++;
    }

    if (
      allied(dependencies, player, third) &&
      allied(dependencies, other, third) &&
      human(dependencies, third)
    ) {
      security +=
        rank(dependencies, player) < rank(dependencies, third) &&
        rank(dependencies, other) < rank(dependencies, third)
          ? 2
          : 1;
    }

    if (
      allied(dependencies, player, third) &&
      atWar(dependencies, other, third) &&
      human(dependencies, third)
    ) {
      security--;
    }

    if (
      rank(dependencies, third) === 7 &&
      dependencies.turn.value() > 199 &&
      atWar(dependencies, other, third)
    ) {
      security--;
    }
  });

  if (!hostile(dependencies, player, other, feelings)) {
    security++;
  }

  if (allied(dependencies, player, other)) {
    security++;
  }

  const presences = presence(dependencies, player, other),
    ours = presences.get(player)!,
    theirs = presences.get(other)!;

  let sharedCities = 0,
    ourAttack = 0,
    theirStrength = 1;

  for (const landMass of landMassesOf(ours, theirs)) {
    const us = presenceOn(ours, landMass),
      them = presenceOn(theirs, landMass);

    if (us.cities !== 0 && us.attack + us.defence < them.attack) {
      return false;
    }

    if (us.attack !== 0 && them.defence !== 0) {
      ourAttack += us.attack;
      theirStrength += (them.attack >> 1) + them.defence;
      sharedCities += us.cities;
    }
  }

  return !(
    Math.trunc((ourAttack << 2) / theirStrength) <
      security - attack(dependencies, player) + 4 && sharedCities !== 0
  );
};

/**
 * `diplo_ai_swap_advances` (`diplomacy.cpp:5560`): two computer players each give the other the advance it values
 *  most (with a roll of 0 to 2 added), when both have one; an ally far behind gets one for nothing.
 */
export const swapAdvances = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number
): boolean => {
  // The advance `to` values most of those `from` knows and it lacks, a roll of 0 to 2 added to each, in RULES.TXT's
  //  order, the first of the best (`:5590-5620`).
  const best = (from: Player, to: Player): typeof Advance | undefined => {
      let chosen: typeof Advance | undefined,
        chosenValue = -Infinity;

      advances.forEach(([Type, first, second]) => {
        if (
          (first === NEVER && second === NEVER) ||
          knows(dependencies, to, Type) ||
          !knows(dependencies, from, Type)
        ) {
          return;
        }

        const value = advanceValue(dependencies, to, Type) + roll(random, 3);

        if (chosen === undefined || chosenValue < value) {
          chosen = Type;
          chosenValue = value;
        }
      });

      return chosen;
    },
    toPlayer = best(other, player),
    toOther = best(player, other),
    difficulty = level(dependencies),
    learn = (to: Player, Type: typeof Advance): void =>
      dependencies.playerResearchRegistry.getByPlayer(to).addAdvance(Type);

  if (toPlayer !== undefined && toOther !== undefined) {
    learn(player, toPlayer);
    learn(other, toOther);

    return true;
  }

  const farBehind = (behind: Player, ahead: Player): boolean =>
    advanceCount(dependencies, behind) + (6 - difficulty) * 2 <
    advanceCount(dependencies, ahead);

  // One way, to an ally far behind, once a round (`TREATY_TRIBUTE`).
  if (
    toPlayer !== undefined &&
    allied(dependencies, player, other) &&
    farBehind(player, other) &&
    !hasFlag(dependencies, player, other, TRIBUTE)
  ) {
    setBoth(dependencies, player, other, TRIBUTE);
    learn(player, toPlayer);

    return true;
  }

  if (
    toOther !== undefined &&
    allied(dependencies, other, player) &&
    farBehind(other, player) &&
    !hasFlag(dependencies, other, player, TRIBUTE)
  ) {
    setBoth(dependencies, player, other, TRIBUTE);
    learn(other, toOther);

    return true;
  }

  return false;
};

// Whether a person would learn of a pact between `player` and `other` against `target` (`diplomacy.cpp:6003-6011`): an
//  embassy with either, the United Nations or Marco Polo's, or `target` a person in contact with either.
const personKnows = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  target: Player
): boolean =>
  dependencies.playerRegistry
    .entries()
    .some(
      (person: Player) =>
        human(dependencies, person) &&
        (hasEmbassy(dependencies, person, player) ||
          hasEmbassy(dependencies, person, other) ||
          ownsWonder(dependencies, person, 'united-nations') ||
          ownsWonder(dependencies, person, 'marco-polos-embassy'))
    ) ||
  (human(dependencies, target) &&
    (inContact(dependencies, target, player) ||
      inContact(dependencies, target, other)));

/**
 * `diplo_ally_join_war(player, against, ally)` (`diplomacy.cpp:5650`): `player` joins `ally`'s war on `against`,
 *  unless it is allied with or at war with it already. With `ally` not at war with `against`, a shared vendetta becomes
 *  hostile intent for both. Against a person it holds no vendetta against, it joins only when it last met them 6 or
 *  more turns in the future (as the original's sum reads: so in effect never) or, at rank 7, one time in 3.
 */
export const allyJoinWar = (
  dependencies: Dependencies,
  player: Player,
  against: Player,
  ally: Player,
  random: () => number
): boolean => {
  if (
    allied(dependencies, player, against) ||
    atWar(dependencies, player, against)
  ) {
    return false;
  }

  if (!atWar(dependencies, ally, against)) {
    if (
      vendetta(dependencies, player, against) &&
      vendetta(dependencies, ally, against)
    ) {
      setFlag(dependencies, player, against, HOSTILE_INTENT);
      setFlag(dependencies, ally, against, HOSTILE_INTENT);
    }

    return false;
  }

  if (human(dependencies, against)) {
    if (!vendetta(dependencies, player, against)) {
      const last = lastContact(dependencies, against, player) ?? -1;

      if (last - dependencies.turn.value() < 6) {
        return false;
      }

      if (rank(dependencies, against) < 7 && roll(random, 3) !== 0) {
        return false;
      }
    }

    recordContact(dependencies, against, player, dependencies.turn.value());
    recordContact(dependencies, against, ally, dependencies.turn.value());
  }

  declareWarQuietly(dependencies, player, against);

  return true;
};

/**
 * `diplo_civs_meet_alliance` (`diplomacy.cpp:5908`): two computer players at peace ally against a third, or end their
 *  alliance when there's none worth it. The target: a person who leads the world (rank 7, 5 or more cities, after turn
 *  200, not on Chieftain); else, when they were allied already (and neither leads a much weaker one), a player neither
 *  has peace with; else one both are hostile to and rank no higher than. With no target, or other alliances and no
 *  reason, the alliance ends. A new alliance brings both into the target's wars if a person would learn of it; against
 *  a person that doesn't join, the target has an incident with each.
 */
export const civsMeetAlliance = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number,
  engine: Engine
): void => {
  const wasAllied = allied(dependencies, player, other),
    difficulty = level(dependencies),
    feelings = attitudeOf(dependencies),
    playerRank = rank(dependencies, player),
    otherRank = rank(dependencies, other);

  let firstOrAllied = wasAllied,
    leaderGap = false;

  if (
    (playerRank === 7 && otherRank > 3) ||
    (otherRank === 7 && playerRank > 3)
  ) {
    firstOrAllied = false;
    leaderGap = true;
  }

  let alliedCount = 0,
    target: Player | null = null,
    targetLeader = false;

  for (const third of othersOf(dependencies, player).filter(
    (p) => p !== other
  )) {
    if (
      allied(dependencies, player, third) ||
      allied(dependencies, other, third)
    ) {
      alliedCount++;

      continue;
    }

    targetLeader =
      human(dependencies, third) &&
      rank(dependencies, third) === 7 &&
      difficulty !== CHIEFTAIN &&
      cities(dependencies, third) >= 5 &&
      dependencies.turn.value() >= 201;

    if (targetLeader) {
      target = third;

      break;
    }

    if (difficulty === CHIEFTAIN) {
      continue;
    }

    if (firstOrAllied) {
      if (
        !atPeace(dependencies, player, third) &&
        !atPeace(dependencies, other, third)
      ) {
        target = third;

        break;
      }
    } else if (
      !leaderGap &&
      hostile(dependencies, player, third, feelings) &&
      playerRank <= rank(dependencies, third) &&
      hostile(dependencies, other, third, feelings) &&
      otherRank <= rank(dependencies, third)
    ) {
      target = third;

      break;
    }
  }

  if (
    target === null ||
    ((!targetLeader || reputation(dependencies).get(target) < alliedCount) &&
      alliedCount !== 0 &&
      !firstOrAllied)
  ) {
    if (wasAllied) {
      cancelAlliance(dependencies, player, other);
      engine.emit('civ2-diplomacy:computers-ended-alliance', player, other);
    }

    return;
  }

  if (!wasAllied) {
    let joined = false;

    if (personKnows(dependencies, player, other, target)) {
      // Both join, as the original's `|` has them (`:6031-6033`).
      const first = allyJoinWar(dependencies, player, target, other, random),
        second = allyJoinWar(dependencies, other, target, player, random);

      joined = first || second;
    }

    if (human(dependencies, target) && !joined) {
      if (!atWar(dependencies, player, target)) {
        setBoth(dependencies, player, target, INCIDENT);
        // The original tests `player`'s war twice here (`:6039-6044`).
        setBoth(dependencies, other, target, INCIDENT);
      }
    }
  }

  makeTreatyPeace(dependencies, player, other);
  makeAlliance(dependencies, player, other);

  if (!wasAllied) {
    engine.emit('civ2-diplomacy:computers-allied', player, other, target);
  }
};

/**
 * `diplo_civs_meet` for two computer players (`diplomacy.cpp:6114-6200`), when their units meet: contact (first
 *  contact a change this turn); every fourth turn for the pair, or at first contact, if either doesn't feel secure from
 *  the other, or the other owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't
 *  start a war with it, they swap advances and make peace, or, at peace, see to their alliance; otherwise, at first
 *  contact or not at war, war: a person allied with either is called to help (`diplo_ally_demand_help`), and a vendetta
 *  becomes the aggressor's mark.
 */
export const civsMeet = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  { random, nuclear, republican, engine }: TurnStartRules
): void => {
  const first = !inContact(dependencies, player, other),
    players = dependencies.playerRegistry.entries();

  if (first) {
    makeContact(
      dependencies.interactionRegistry,
      player,
      other,
      dependencies.ruleRegistry,
      dependencies.turn
    );
  }

  setBoth(dependencies, player, other, RECENT_CONTACT);

  if (
    (dependencies.turn.value() +
      players.indexOf(player) +
      players.indexOf(other)) %
      4 !==
      0 &&
    !first
  ) {
    return;
  }

  const settles = (one: Player, two: Player): boolean =>
    !feelsSecure(dependencies, one, two, nuclear) ||
    pacifies(dependencies, two) ||
    (republican(one) && !hasFlag(dependencies, one, two, AGGRESSOR));

  if (settles(player, other) && settles(other, player)) {
    swapAdvances(dependencies, player, other, random);

    if (!atPeace(dependencies, player, other)) {
      makeTreatyPeace(dependencies, player, other);
      engine.emit('civ2-diplomacy:computers-made-peace', player, other);
    } else {
      civsMeetAlliance(dependencies, player, other, random, engine);
    }

    return;
  }

  if (atWar(dependencies, player, other) && !first) {
    return;
  }

  // `diplo_civs_meet_war` (`:6050`): a person allied with either, not allied with or at war with the other, is called.
  players
    .filter((person: Player) => human(dependencies, person))
    .forEach((person: Player) => {
      [
        [player, other],
        [other, player],
      ].forEach(([caller, enemy]) => {
        if (
          allied(dependencies, caller, person) &&
          !allied(dependencies, person, enemy) &&
          !atWar(dependencies, person, enemy) &&
          !feelsSecure(dependencies, caller, enemy, nuclear)
        ) {
          callAlly(dependencies, caller, person, enemy);
          engine.emit('civ2-diplomacy:audience-due', caller, person);
        }
      });
    });

  declareWarQuietly(dependencies, player, other);

  // A vendetta is cleared both ways and becomes the aggressor's mark (`:6100-6104`).
  if (vendetta(dependencies, player, other)) {
    activeDeclarations(dependencies, Vendetta, player, other).forEach((held) =>
      held.expire(player)
    );
    setFlag(dependencies, player, other, AGGRESSOR);
  }

  engine.emit('civ2-diplomacy:computers-went-to-war', player, other);
};

export interface TurnStartRules {
  random: () => number;
  nuclear: (player: Player) => number;
  republican: (player: Player) => boolean;
  engine: Engine;
}

/**
 * The start of each player's turn:
 *
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared (`civ.cpp:7080`).
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next
 *   audience, due after 15 turns without contact or after an incident (`civ2-diplomacy:audience-due`). The audience
 *   itself ends any ceasefire too (`Rules/talks`); until the hosts open audiences on that event, this rule ends it.
 * - `<prefix>:player/turn-start/computer-pairs` (`civ.cpp:7130-7240`): toward each other computer player, the tribute
 *   mark is cleared; every 32 turns an aggressor mark lapses unless it was for long; every 16 turns without recent
 *   contact, unallied pairs at peace meet if the computer players are ganging up on someone, allies swap advances, and
 *   contact lapses (and with it any war) between pairs neither of which is the aggressor; every 8 turns allies without
 *   recent contact swap advances.
 * - `RuleIds.borderIntruders`: the border incidents (`countIncidents`), the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: at the start of the turn of the person the computer players gang up on
 *   (`gangUpLeader`), each with more than one city that isn't its ally, if the person's reputation is above three
 *   times its wars + 3 or it holds a vendetta: without a treaty, contact and 1 colder; with one, one time in 32 per
 *   level + 1, hostile intent.
 * - `<prefix>:player/turn-start/reputation-recovery`: a reputation recovers on schedule.
 */
export const turnStartRules = (
  prefix: string,
  dependencies: Dependencies,
  { random, nuclear, republican, engine }: TurnStartRules
): TurnStart[] => {
  const computer = new Criterion(
      (player: Player): boolean =>
        !human(dependencies, player) && !barbarian(player)
    ),
    turn = (): number => dependencies.turn.value();

  return [
    new TurnStart(
      `${prefix}:player/turn-start/turn-flags`,
      new Effect((player: Player): void => {
        const records = dependencies.interactionRegistry
          .getByPlayer(player)
          .filter(
            (interaction): interaction is TreatyFlagsRecord =>
              interaction instanceof TreatyFlagsRecord &&
              interaction.holder() === player
          );

        recentPeace.set(
          player,
          new Set(
            records
              .filter((record) => (record.value() & CHANGED_THIS_TURN) !== 0)
              .map((record) => record.toward())
          )
        );
        records.forEach((record: TreatyFlagsRecord) =>
          clearFlag(dependencies, player, record.toward(), TURN_BITS)
        );
        forgetWarnings(dependencies, player, intruding(dependencies, player));
        clearOwnMarks(dependencies, player);
      })
    ),
    new TurnStart(
      `${prefix}:player/turn-start/senate`,
      new Effect((player: Player): void =>
        rollSenate(dependencies, player, random)
      )
    ),
    new TurnStart(
      `${prefix}:player/turn-start/patience`,
      computer,
      new Criterion((): boolean => turn() % 3 === 0),
      new Effect((player: Player): void =>
        othersOf(dependencies, player).forEach((other: Player) => {
          const kept = patience(dependencies, player, other);

          if (kept.spent() > 0) {
            kept.spend(-1);
          }
        })
      )
    ),
    new TurnStart(
      RuleIds.treatyBreaking,
      computer,
      new Effect((player: Player): void =>
        breakTreaties(dependencies, player, random, engine, false)
      )
    ),
    new TurnStart(
      `${prefix}:player/turn-start/ceasefire-expiry`,
      computer,
      new Effect((player: Player): void =>
        othersOf(dependencies, player)
          .filter(
            (person: Player) =>
              human(dependencies, person) &&
              activeDeclarations(dependencies, Ceasefire, player, person)
                .length > 0
          )
          .forEach((person: Player) => {
            const last = lastContact(dependencies, player, person);

            if (
              last !== undefined &&
              last >= 0 &&
              turn() - last <= 15 &&
              !hasFlag(dependencies, player, person, INCIDENT)
            ) {
              return;
            }

            activeDeclarations(dependencies, Ceasefire, player, person).forEach(
              (ceasefire) => ceasefire.expire(player)
            );
            clearBoth(
              dependencies,
              player,
              person,
              CEASEFIRE_LINGERS | TRIBUTE
            );
            recordContact(dependencies, player, person, turn());
            engine.emit('civ2-diplomacy:ceasefire-expired', player, person);
            engine.emit('civ2-diplomacy:audience-due', player, person);
          })
      )
    ),
    new TurnStart(
      `${prefix}:player/turn-start/computer-pairs`,
      computer,
      new Effect((player: Player): void =>
        othersOf(dependencies, player)
          .filter((other: Player) => !human(dependencies, other))
          .forEach((other: Player) => {
            clearFlag(dependencies, player, other, TRIBUTE);

            if (turn() % 32 === 0) {
              if (!hasFlag(dependencies, player, other, AGGRESSOR_LONG)) {
                clearFlag(dependencies, player, other, AGGRESSOR);
              }

              clearFlag(dependencies, player, other, AGGRESSOR_LONG);
            }

            const recent = hasFlag(dependencies, player, other, RECENT_CONTACT);

            if (turn() % 16 === 0) {
              if (recent) {
                clearFlag(dependencies, player, other, RECENT_CONTACT);

                return;
              }

              if (!allied(dependencies, player, other)) {
                if (
                  hasTreatyLevel(
                    dependencies,
                    player,
                    other,
                    TreatyLevel.Peace
                  ) &&
                  gangUpLeader(dependencies, nuclear) !== null
                ) {
                  civsMeet(dependencies, player, other, {
                    random,
                    nuclear,
                    republican,
                    engine,
                  });
                  // The lapse clears the recent mark after (`civ.cpp:7186`).
                  clearFlag(dependencies, player, other, RECENT_CONTACT);
                }
              } else {
                swapAdvances(dependencies, player, other, random);
              }

              if (
                inContact(dependencies, player, other) &&
                !hasFlag(dependencies, player, other, AGGRESSOR) &&
                !hasFlag(dependencies, other, player, AGGRESSOR)
              ) {
                loseContact(dependencies, player, other);
                engine.emit('civ2-diplomacy:contact-lapsed', player, other);
              }

              return;
            }

            if (
              turn() % 8 === 0 &&
              allied(dependencies, player, other) &&
              !recent
            ) {
              swapAdvances(dependencies, player, other, random);
            }
          })
      )
    ),
    new TurnStart(
      RuleIds.borderIntruders,
      computer,
      new Effect((player: Player): void =>
        countIncidents(dependencies, player, false, random, engine)
      )
    ),
    new TurnStart(
      RuleIds.attitudeDrift,
      computer,
      new Effect((player: Player): void =>
        driftAttitude(dependencies, player, false)
      )
    ),
    new TurnStart(
      `${prefix}:player/turn-start/gang-up`,
      new Criterion(
        (player: Player): boolean =>
          gangUpLeader(dependencies, nuclear) === player
      ),
      new Effect((player: Player): void => {
        const wars = othersOf(dependencies, player).filter((other) =>
            atWar(dependencies, player, other)
          ).length,
          bad = gangsUp(reputation(dependencies).get(player), wars),
          difficulty = level(dependencies);

        othersOf(dependencies, player)
          .filter(
            (other: Player) =>
              !human(dependencies, other) &&
              cities(dependencies, other) > 1 &&
              (bad || vendetta(dependencies, other, player)) &&
              !allied(dependencies, other, player)
          )
          .forEach((other: Player) => {
            if (
              !hasTreatyLevel(
                dependencies,
                other,
                player,
                TreatyLevel.Ceasefire
              )
            ) {
              makeContact(
                dependencies.interactionRegistry,
                other,
                player,
                dependencies.ruleRegistry,
                dependencies.turn
              );
              attitude(dependencies).adjust(other, player, 1, 'gang-up');

              return;
            }

            if (roll(random, 32) <= difficulty) {
              setFlag(dependencies, other, player, HOSTILE_INTENT);
            }
          });
      })
    ),
    new TurnStart(
      `${prefix}:player/turn-start/reputation-recovery`,
      new Effect((player: Player): void => {
        const reputations = reputation(dependencies),
          current = reputations.get(player);

        if (
          !reputationRecovers(
            turn(),
            level(dependencies),
            current,
            ownsWonder(dependencies, player, 'eiffel-tower')
          )
        ) {
          return;
        }

        const now = reputations.adjust(player, -1, 'recovery');

        if (human(dependencies, player)) {
          othersOf(dependencies, player).forEach((observer: Player) => {
            const credit = reputations.credit(observer, player);

            if (credit > now || credit < 0) {
              reputations.setCredit(
                observer,
                player,
                Math.min(Math.max(credit, 0), now)
              );
            }
          });
        }
      })
    ),
  ];
};

/**
 * Two players lose contact (`diplo_clear_treaty_flags(civ, civ2, 1)`): their `Contact` goes, and with it any war,
 *  and the marks of one; their treaties stay.
 */
export const loseContact = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  activeDeclarations(dependencies, War, player, other).forEach((war) =>
    expireSilently(war, player)
  );
  clearBoth(dependencies, player, other, AGGRESSOR | SNEAK_ATTACK);
  dependencies.interactionRegistry
    .getByPlayers(player, other)
    .filter((interaction) => interaction instanceof Contact)
    .forEach((contact) => dependencies.interactionRegistry.unregister(contact));
};
