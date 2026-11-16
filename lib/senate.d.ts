import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import { SenateContext } from '@civ-clone/base-government-senate/Rules/SenateIntervenes';
import SenateRecord from '../Records/SenateRecord';
/** The player's government, as far as a Senate goes. */
export declare const senateGovernment: (
  dependencies: Dependencies,
  player: Player
) => 'none' | 'republic' | 'democracy';
export declare const senateRecord: (
  dependencies: Dependencies,
  player: Player
) => SenateRecord | undefined;
/**
 * The start of `player`'s turn: a new roll, 0 to 99, and one turn in three the Republic's Senate goes in or out of
 *  session (`civ.cpp:7069-7073`). Nothing is kept for a player whose government has never had a Senate.
 */
export declare const rollSenate: (
  dependencies: Dependencies,
  player: Player,
  random: () => number
) => void;
/**
 * Whether `player`'s Senate steps in about `other` (the `SenateIntervenes` rule's answer). `context.roll` overrides the
 *  saved roll, `context.reputation` the other's reputation, `context.sneakAttack` the saved sneak attack and
 *  `context.bonus` the wonder bonus, for a caller that knows better.
 */
export declare const civ2SenateIntervenes: (
  dependencies: Dependencies,
  player: Player,
  other: Player | null,
  context?: SenateContext
) => boolean;
/** Whether `player`'s Senate steps in, through the game's `SenateIntervenes` rules. */
export declare const senateBlocks: (
  dependencies: Dependencies,
  player: Player,
  other: Player | null,
  reason: string
) => boolean;
/**
 * A scandal (`diplomacy.cpp:6400`): a Democracy always falls, a Republic one time in two. Tells the `SenateScandal`
 *  rules, and answers whether there was one.
 */
export declare const senateScandal: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number
) => boolean;
