import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Readers from '@civ-clone/base-diplomacy/lib/Readers';
/** Units that `Detonates`: Civilization II's nuclear missiles. */
export declare const nukes: (
  dependencies: Dependencies,
  player: Player
) => number;
/**
 * The leader's attack attitude from @LEADERS, as civ2-civilization gives it: 1 Aggressive, −1 Friendly (rational), 0
 *  otherwise.
 */
export declare const mood: (
  dependencies: Dependencies,
  player: Player
) => number;
/**
 * What `base-diplomacy` reads about Civilization II's content: the human, nuclear units, the leader's attack attitude,
 *  the difficulty level, and the Senate: whether `player`'s Senate stops it breaking a treaty with `other`, through the
 *  game's `SenateIntervenes` rules (civ2-diplomacy's own answers with Civilization II's roll, `lib/senate`).
 */
export declare const readers: (dependencies: Dependencies) => Readers;
export default readers;
