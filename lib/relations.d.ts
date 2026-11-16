import Attitude from '@civ-clone/core-diplomacy/Attitude';
import BaseDependencies from '@civ-clone/base-diplomacy/lib/Dependencies';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import Reputation from '@civ-clone/core-diplomacy/Reputation';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/** What the accessors read: the game's interactions, rules and turn. */
export interface RelationRegistries {
  interactionRegistry: InteractionRegistry;
  ruleRegistry: RuleRegistry;
  turn: Turn;
}
/** The lowest attitude: the warmest. */
export declare const ATTITUDE_MINIMUM = 0;
/** The highest attitude: the coldest. */
export declare const ATTITUDE_MAXIMUM = 100;
/** The lowest reputation: the best. The original keeps it in a byte with no other limit. */
export declare const REPUTATION_MINIMUM = 0;
/**
 * The game's attitudes: `attitude(registries).get(holder, toward)` is how `holder` feels about `toward`, 0 (warmest)
 *  to 100 (coldest), or `undefined` before they've met. A new attitude is seeded when contact is made
 *  (`civ2-diplomacy:interaction/created/seed-attitude`), so change one with `adjust` only once the pair has met.
 */
export declare const attitude: ({
  interactionRegistry,
  ruleRegistry,
  turn,
}: RelationRegistries) => Attitude;
/**
 * The game's reputations: `reputation(registries).get(player)`, 0 the best, and the credit an observer gives a player
 *  against it (`credit(observer, player)`).
 */
export declare const reputation: ({
  interactionRegistry,
  ruleRegistry,
  turn,
}: RelationRegistries) => Reputation;
/**
 * `player`'s reputation as `observer` sees it: the reputation less the credit `observer` gives it. The original reads
 *  this everywhere in talks.
 */
export declare const effectiveReputation: (
  registries: RelationRegistries,
  player: Player,
  observer: Player
) => number;
/**
 * The nine attitude bands, warmest first: each is the highest attitude in it (OpenCiv2 `diplo_attitude_level`,
 *  `diplomacy.cpp:4180`). The first holds only attitudes below 0, which the range never reaches; the last holds 100.
 *  What each band is called is the renderer's.
 */
export declare const attitudeBands: readonly number[];
/** The band (0 to 8, `attitudeBands`) an attitude is in. */
export declare const attitudeLevel: (value: number) => number;
/**
 * `player` is made to declare war on `other`, by something it did under a treaty (an attack across it, an incident),
 *  rather than choosing to (OpenCiv2 `diplo_force_war`, `diplomacy.cpp:6861`). Any treaty between them ends, and its
 *  reputation suffers as if it had broken the treaty itself (`civ2-diplomacy:declared-war/reputation`).
 */
export declare const madeToDeclareWar: (
  dependencies: Pick<BaseDependencies, 'interactionRegistry' | 'ruleRegistry'>,
  player: Player,
  other: Player
) => void;
export default attitude;
