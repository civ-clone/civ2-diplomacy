import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Spaceship from '@civ-clone/core-spaceship/Spaceship';
/** The level above which a person's launch sets the computer players on them: King. */
export declare const KING = 3;
/**
 * Whether `player`'s ship has launched (`civ_spaceship_launched`): in flight or arrived, not lost.
 */
export declare const launched: (
  dependencies: Dependencies,
  player: Player
) => boolean;
/** `player`'s launched ship, or `null`. */
export declare const launchedShip: (
  dependencies: Dependencies,
  player: Player
) => Spaceship | null;
/**
 * Whether the space race is on (`spaceship_race_active`, `spaceship.cpp:2061`): the Apollo Program built, even if lost
 *  since, or a person knows Space Flight.
 */
export declare const raceActive: (dependencies: Dependencies) => boolean;
/**
 * Above King, the person whose ship has launched, the last of them in player order (`civ_update_power_ranks`,
 *  `civ.cpp:3119-3125`), or `null`.
 */
export declare const launchedPerson: (
  dependencies: Dependencies
) => Player | null;
/** The year `spaceship` arrives: as recorded at its launch, or as it would if it launched this year. */
export declare const arrivalOf: (
  dependencies: Dependencies,
  spaceship: Spaceship
) => number;
