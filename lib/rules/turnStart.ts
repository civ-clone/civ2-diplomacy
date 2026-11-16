import {
  AGGRESSOR,
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
  hostile,
  human,
  inContact,
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
import {
  advanceValue,
  advancesWanted,
  declareWarQuietly,
  expireSilently,
  signPeace,
} from '../effects';
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
//  each person, kept for the turn (`diplo_count_border_intruders`).
const incidents = new WeakMap<Player, Map<Player, number>>();

/** The weight of `intruder`'s units inside `computer`'s borders this turn, if `border-intruders` counted any. */
export const incidentWeight = (
  computer: Player,
  intruder: Player
): number | undefined => incidents.get(computer)?.get(intruder);

/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): each military unit of `intruder` on a land square of one of
 *  `holder`'s cities' radius, not in a city, counts 1, 1 more on a road, a railroad, a mine or irrigation, 2 more in a
 *  fortress. Allies don't count. With `everySquare` false (the original, B4) only the first intruded square of each
 *  city is looked at.
 */
export const borderIntruders = (
  dependencies: Dependencies,
  holder: Player,
  intruder: Player,
  everySquare: boolean
): number => {
  if (allied(dependencies, holder, intruder)) {
    return 0;
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

  let count = 0;

  dependencies.cityRegistry.getByPlayer(holder).forEach((city: City) => {
    const squares = (() => {
      try {
        return city.tiles().entries() as Tile[];
      } catch (e) {
        return [] as Tile[];
      }
    })();

    for (const tile of squares) {
      if (
        tile === city.tile() ||
        tile.isWater() ||
        dependencies.cityRegistry.getByTile(tile) !== null
      ) {
        continue;
      }

      const units = dependencies.unitRegistry
        .getByTile(tile)
        .filter(
          (unit: Unit) =>
            unit.player() === intruder && unit.attack().value() > 0
        );

      if (units.length === 0) {
        continue;
      }

      count += units.length * (1 + improvementWeight(tile));

      if (!everySquare) {
        break;
      }
    }
  });

  return count;
};

/**
 * The border incidents `computer` counts at the start of its turn, toward each person it is neither allied with nor at
 *  war with (`borderIntruders`), kept for its attitude drift this turn. `everySquare` as `borderIntruders`.
 */
export const countIncidents = (
  dependencies: Dependencies,
  computer: Player,
  everySquare: boolean
): void => {
  const counted = new Map<Player, number>();

  othersOf(dependencies, computer)
    .filter(
      (person: Player) =>
        human(dependencies, person) &&
        !allied(dependencies, computer, person) &&
        !atWar(dependencies, computer, person)
    )
    .forEach((person: Player) => {
      const weight = borderIntruders(
        dependencies,
        computer,
        person,
        everySquare
      );

      if (weight > 0) {
        counted.set(person, weight);
      }
    });

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
  const players = dependencies.playerRegistry
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

  const temper = Math.max(
    -2,
    attack(dependencies, computer) * 3 + expand(dependencies, computer) * 2
  );

  let rankDifference = personRank - computerRank;

  if (rankDifference < 0 || !alliance) {
    rankDifference = Math.trunc(rankDifference / 2);
  }

  delta += temper + rankDifference;

  if (computerStrength * 4 < personStrength) {
    delta--;
  }

  if (computerStrength * 2 < personStrength) {
    delta--;
  }

  if (Math.trunc((computerStrength * 3) / 2) < personStrength) {
    delta--;
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

      // A peace partner's incident is a first offence, one less (`diplo_review_border_incident`, `:6470`).
      const start =
        weight === undefined
          ? 0
          : hasTreatyLevel(dependencies, computer, person, TreatyLevel.Peace)
          ? weight - 1
          : weight;

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

        return;
      }

      const turn = dependencies.turn.value(),
        last = lastContact(dependencies, computer, other);

      setFlag(dependencies, computer, other, AGGRESSOR);
      recordContact(
        dependencies,
        computer,
        other,
        last === undefined || last > turn - 8 ? turn - 8 : last
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
  const best = (from: Player, to: Player) =>
      advancesWanted(dependencies, from, to)
        .map((advance) => ({
          advance,
          value: advanceValue(dependencies, to, advance) + roll(random, 3),
        }))
        .sort((a, b) => b.value - a.value)[0]?.advance,
    toPlayer = best(other, player),
    toOther = best(player, other),
    difficulty = level(dependencies);

  if (toPlayer !== undefined && toOther !== undefined) {
    give(dependencies, toPlayer, other, player);
    give(dependencies, toOther, player, other);

    return true;
  }

  const farBehind = (behind: Player, ahead: Player): boolean =>
    advanceCount(dependencies, behind) + (6 - difficulty) * 2 <
    advanceCount(dependencies, ahead);

  if (
    toPlayer !== undefined &&
    allied(dependencies, player, other) &&
    farBehind(player, other)
  ) {
    give(dependencies, toPlayer, other, player);

    return true;
  }

  if (
    toOther !== undefined &&
    allied(dependencies, player, other) &&
    farBehind(other, player)
  ) {
    give(dependencies, toOther, player, other);

    return true;
  }

  return false;
};

/**
 * Two computer players meeting (`diplo_civs_meet`, `diplomacy.cpp:6114`), every fourth turn for each pair in contact
 *  (`(turn + a + b) & 3`, here by their order in the game): if either doesn't feel secure from the other, or the other
 *  owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't start it, they swap advances
 *  and make peace; otherwise, unless they're at war already, war.
 */
export const computersMeet = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number,
  nuclear: (player: Player) => number,
  republican: (player: Player) => boolean,
  engine: Engine
): void => {
  const settles = (one: Player, two: Player): boolean =>
    !feelsSecure(dependencies, one, two, nuclear) ||
    pacifies(dependencies, two) ||
    (republican(one) && !hasFlag(dependencies, one, two, AGGRESSOR));

  if (settles(player, other) && settles(other, player)) {
    swapAdvances(dependencies, player, other, random);

    if (!atPeace(dependencies, player, other)) {
      signPeace(dependencies, player, other);
      engine.emit('civ2-diplomacy:computers-made-peace', player, other);
    }

    return;
  }

  if (!atWar(dependencies, player, other)) {
    declareWarQuietly(dependencies, player, other);
    engine.emit('civ2-diplomacy:computers-went-to-war', player, other);
  }
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
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared.
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next audience,
 *   which is due after 15 turns without contact or after an incident; the audience is announced
 *   (`civ2-diplomacy:audience-due`).
 * - `<prefix>:player/turn-start/computers-meet`: two computer players in contact meet (`computersMeet`); every 16 turns
 *   two at war that haven't met lose contact and their war ends; every 8 turns allies swap advances.
 * - `RuleIds.borderIntruders`: the border incidents, the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: a person whose reputation is above three times its wars + 3 is ganged up on.
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
      new Effect((player: Player): void =>
        dependencies.interactionRegistry
          .getByPlayer(player)
          .filter(
            (interaction): interaction is TreatyFlagsRecord =>
              interaction instanceof TreatyFlagsRecord &&
              interaction.holder() === player
          )
          .forEach((record: TreatyFlagsRecord) =>
            clearFlag(dependencies, player, record.toward(), TURN_BITS)
          )
      )
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
              turn() - last <= 15 &&
              !hasFlag(dependencies, player, person, INCIDENT)
            ) {
              return;
            }

            activeDeclarations(dependencies, Ceasefire, player, person).forEach(
              (ceasefire) => ceasefire.expire(player)
            );
            clearFlag(dependencies, player, person, INCIDENT);
            recordContact(dependencies, player, person, turn());
            engine.emit('civ2-diplomacy:ceasefire-expired', player, person);
            engine.emit('civ2-diplomacy:audience-due', player, person);
          })
      )
    ),
    new TurnStart(
      `${prefix}:player/turn-start/computers-meet`,
      computer,
      new Effect((player: Player): void => {
        const players = dependencies.playerRegistry.entries(),
          index = players.indexOf(player);

        othersOf(dependencies, player)
          .filter(
            (other: Player) =>
              !human(dependencies, other) &&
              players.indexOf(other) > index &&
              inContact(dependencies, player, other)
          )
          .forEach((other: Player) => {
            const last = lastContact(dependencies, player, other);

            if (turn() % 16 === 0) {
              // No recent contact: two at war, neither the aggressor, lose touch and their war ends.
              if (
                (last === undefined || turn() - last >= 16) &&
                !allied(dependencies, player, other) &&
                atWar(dependencies, player, other) &&
                !hasFlag(dependencies, player, other, AGGRESSOR) &&
                !hasFlag(dependencies, other, player, AGGRESSOR)
              ) {
                activeDeclarations(dependencies, War, player, other).forEach(
                  (war) => war.expire(player)
                );
                engine.emit('civ2-diplomacy:contact-lapsed', player, other);

                return;
              }

              if (allied(dependencies, player, other)) {
                swapAdvances(dependencies, player, other, random);
              }
            } else if (
              turn() % 8 === 0 &&
              allied(dependencies, player, other) &&
              (last === undefined || turn() - last >= 8)
            ) {
              swapAdvances(dependencies, player, other, random);
            }

            if ((turn() + index + players.indexOf(other)) % 4 !== 0) {
              return;
            }

            computersMeet(
              dependencies,
              player,
              other,
              random,
              nuclear,
              republican,
              engine
            );
            recordContact(dependencies, player, other, turn());
          });
      })
    ),
    new TurnStart(
      RuleIds.borderIntruders,
      // Before the drift, whichever rule set's either is.
      new High(),
      computer,
      new Effect((player: Player): void =>
        countIncidents(dependencies, player, false)
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
      new Criterion((player: Player): boolean => human(dependencies, player)),
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
