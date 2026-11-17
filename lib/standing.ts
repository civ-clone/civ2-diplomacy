import {
  TreatyLevel,
  hasTreatyLevel,
  treatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  cityCount,
  power,
  rankFromTop,
  traitScore,
} from '@civ-clone/base-diplomacy/lib/standing';
import Advance from '@civ-clone/core-science/Advance';
import Aggressive from '@civ-clone/base-leader-trait-aggression/Aggression/Aggressive';
import Civilized from '@civ-clone/base-leader-trait-militarism/Militarism/Civilized';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import Dependencies from './Dependencies';
import Expansionist from '@civ-clone/base-leader-trait-development/Development/Expansionist';
import Friendly from '@civ-clone/base-leader-trait-aggression/Aggression/Friendly';
import Militaristic from '@civ-clone/base-leader-trait-militarism/Militarism/Militaristic';
import Perfectionist from '@civ-clone/base-leader-trait-development/Development/Perfectionist';
import Player from '@civ-clone/core-player/Player';
import Trait from '@civ-clone/core-civilization/Trait';
import { hasVendetta } from '@civ-clone/library-diplomacy/lib/holds';
import isHuman from '@civ-clone/civ2-difficulty/isHuman';
import { launchedPerson } from './spaceRace';
import { rankings } from '@civ-clone/core-power/lib/rank';
import { levelOf } from '@civ-clone/civ2-difficulty/level';

// What Civilization II's talks read about the players, in the original's terms (OpenCiv2 `diplomacy.cpp`): the power
//  rank (7 the strongest), military strength, advances known, the leader's three @LEADERS attitudes, and the treaty
//  between two players.

/** Chieftain, the easiest level. */
export const CHIEFTAIN = 0;
export const WARLORD = 1;
export const PRINCE = 2;
export const KING = 3;

/** The game's level, 0 (Chieftain) to 5 (Deity). */
export const level = (dependencies: Dependencies): number =>
  levelOf(dependencies.gameDifficultyRegistry);

/** Whether a person plays `player`. */
export const human = (dependencies: Dependencies, player: Player): boolean =>
  isHuman(player, dependencies.clientRegistry);

/** `game.power_rank`: 7 for the strongest civilization, one less for each below it. */
export const rank = (dependencies: Dependencies, player: Player): number =>
  rankFromTop(dependencies, player, 7);

/** `military_strength`: the attack and defence of every unit. */
export const strength = (dependencies: Dependencies, player: Player): number =>
  power(dependencies, player);

/** `num_advances`. */
export const advanceCount = (
  dependencies: Dependencies,
  player: Player
): number => {
  try {
    return dependencies.playerResearchRegistry.getByPlayer(player).complete()
      .length;
  } catch (e) {
    return 0;
  }
};

/** Whether `player` knows `AdvanceType`. */
export const knows = (
  dependencies: Dependencies,
  player: Player,
  AdvanceType: typeof Advance
): boolean => {
  try {
    return dependencies.playerResearchRegistry
      .getByPlayer(player)
      .completed(AdvanceType);
  } catch (e) {
    return false;
  }
};

export const cities = cityCount;

/** The leader's attack attitude: 1 aggressive, −1 friendly (rational), 0 otherwise. */
export const attack = (dependencies: Dependencies, player: Player): number =>
  traitScore(dependencies, player, (trait: Trait) =>
    trait instanceof Aggressive ? 1 : trait instanceof Friendly ? -1 : 0
  );

/** The leader's expansion attitude: 1 expansionist, −1 perfectionist, 0 otherwise. */
export const expand = (dependencies: Dependencies, player: Player): number =>
  traitScore(dependencies, player, (trait: Trait) =>
    trait instanceof Expansionist ? 1 : trait instanceof Perfectionist ? -1 : 0
  );

/** The leader's civilization attitude: 1 civilized, −1 militaristic, 0 otherwise. */
export const civilize = (dependencies: Dependencies, player: Player): number =>
  traitScore(dependencies, player, (trait: Trait) =>
    trait instanceof Civilized ? 1 : trait instanceof Militaristic ? -1 : 0
  );

/** The treaty between the two (`base-diplomacy`'s `TreatyLevel`). */
export const treaty = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): TreatyLevel => treatyLevel(dependencies, player, other);

export const allied = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): boolean => hasTreatyLevel(dependencies, player, other, TreatyLevel.Alliance);

export const atPeace = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): boolean => hasTreatyLevel(dependencies, player, other, TreatyLevel.Peace);

/** At war: a `War` in force and no treaty (`TREATY_WAR`). */
export const atWar = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): boolean => treaty(dependencies, player, other) === TreatyLevel.War;

/** Whether the two have made contact (`TREATY_CONTACT`): a `Contact` between them. */
export const inContact = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): boolean =>
  dependencies.interactionRegistry
    .getByPlayers(player, other)
    .some((interaction) => interaction instanceof Contact);

/** Whether `holder` holds a vendetta against `against` (`TREATY_VENDETTA`). */
export const vendetta = (
  dependencies: Dependencies,
  holder: Player,
  against: Player
): boolean => hasVendetta(holder, against, dependencies.interactionRegistry);

/**
 * `diplo_is_hostile` (`diplomacy.cpp:4216`): at war; or, neither allied nor at peace (a ceasefire counts as neither),
 *  in contact with an attitude above 49.
 */
export const hostile = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  attitudeOf: (holder: Player, toward: Player) => number
): boolean => {
  const level = treaty(dependencies, player, other);

  if (level === TreatyLevel.War) {
    return true;
  }

  return (
    (level === TreatyLevel.Contact || level === TreatyLevel.Ceasefire) &&
    inContact(dependencies, player, other) &&
    attitudeOf(player, other) > 49
  );
};

/** The other players still in the game: every player but `player`. */
export const others = (
  dependencies: Dependencies,
  ...players: Player[]
): Player[] =>
  dependencies.playerRegistry
    .entries()
    .filter((player: Player) => !players.includes(player));

/**
 * The person the computer players gang up on (`civ_update_power_ranks`, `civ.cpp:3108-3129`, `GAME_AI_GANG_UP`): the
 *  top-ranked player, when a person, with more than 4 cities and no nuclear weapons, after turn 200 and above
 *  Chieftain; and above King, whatever the turn, a person whose spaceship has launched instead (`lib/spaceRace`'s
 *  `launchedPerson`); else `null`.
 */
export const gangUpLeader = (
  dependencies: Dependencies,
  nuclear: (player: Player) => number
): Player | null => {
  const launcher = launchedPerson(dependencies);

  if (launcher !== null) {
    return launcher;
  }

  if (dependencies.turn.value() <= 200 || level(dependencies) === CHIEFTAIN) {
    return null;
  }

  const [leader] = rankings(
    dependencies.playerRegistry.entries(),
    dependencies.ruleRegistry
  );

  return leader !== undefined &&
    human(dependencies, leader) &&
    cities(dependencies, leader) > 4 &&
    nuclear(leader) === 0
    ? leader
    : null;
};
