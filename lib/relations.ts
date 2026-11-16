import Attitude from '@civ-clone/core-diplomacy/Attitude';
import BaseDependencies from '@civ-clone/base-diplomacy/lib/Dependencies';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import Reputation from '@civ-clone/core-diplomacy/Reputation';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import { declareWar } from '@civ-clone/base-diplomacy/lib/declareWar';

// The one way any civ2-* package reads or changes Civilization II's attitudes and reputations, so every reader keeps
//  them in the same range. The original keeps an attitude per direction of each pair, 0 to 100, higher the worse
//  (OpenCiv2 `civ.cpp:2966-2988`), and a reputation per player, 0 and up, with a credit per observer against it.

/** What the accessors read: the game's interactions, rules and turn. */
export interface RelationRegistries {
  interactionRegistry: InteractionRegistry;
  ruleRegistry: RuleRegistry;
  turn: Turn;
}

/** The lowest attitude: the warmest. */
export const ATTITUDE_MINIMUM = 0;

/** The highest attitude: the coldest. */
export const ATTITUDE_MAXIMUM = 100;

/** The lowest reputation: the best. The original keeps it in a byte with no other limit. */
export const REPUTATION_MINIMUM = 0;

// The talks under way: a computer player's attitude in talks (`diplo_eval.cur_attitude`) moves with every change to
//  its attitude toward the person it is talking to, as `civ_adjust_attitude` moves it (`civ.cpp:2966-2975`).
const inTalks = new Map<Player, { toward: Player; value: number }>();

/**
 * While `holder` talks with `toward`, its attitude in talks is `live.value`, and every `adjust` of its attitude toward
 *  `toward` adds to it, unclamped, as the original's does. `endTalks` stops it.
 */
export const beginTalks = (
  holder: Player,
  toward: Player,
  live: { value: number }
): void => {
  inTalks.set(holder, Object.assign(live, { toward }));
};

/** `holder`'s talks are over. */
export const endTalks = (holder: Player): void => {
  inTalks.delete(holder);
};

class TalksAttitude extends Attitude {
  adjust(
    holder: Player,
    toward: Player,
    delta: number,
    reason?: string
  ): number {
    const live = inTalks.get(holder);

    if (live !== undefined && live.toward === toward) {
      live.value += delta;
    }

    return super.adjust(holder, toward, delta, reason);
  }
}

/**
 * The game's attitudes: `attitude(registries).get(holder, toward)` is how `holder` feels about `toward`, 0 (warmest)
 *  to 100 (coldest), or `undefined` before they've met. A new attitude is seeded when contact is made
 *  (`civ2-diplomacy:interaction/created/seed-attitude`), so change one with `adjust` only once the pair has met. An
 *  `adjust` during talks also moves the computer player's attitude in those talks.
 */
export const attitude = ({
  interactionRegistry,
  ruleRegistry,
  turn,
}: RelationRegistries): Attitude =>
  new TalksAttitude(interactionRegistry, ruleRegistry, turn, {
    minimum: ATTITUDE_MINIMUM,
    maximum: ATTITUDE_MAXIMUM,
  });

/**
 * The game's reputations: `reputation(registries).get(player)`, 0 the best, and the credit an observer gives a player
 *  against it (`credit(observer, player)`).
 */
export const reputation = ({
  interactionRegistry,
  ruleRegistry,
  turn,
}: RelationRegistries): Reputation =>
  new Reputation(interactionRegistry, ruleRegistry, turn, {
    minimum: REPUTATION_MINIMUM,
  });

/**
 * `player`'s reputation as `observer` sees it: the reputation less the credit `observer` gives it. The original reads
 *  this everywhere in talks.
 */
export const effectiveReputation = (
  registries: RelationRegistries,
  player: Player,
  observer: Player
): number => {
  const reputations = reputation(registries);

  return reputations.get(player) - reputations.credit(observer, player);
};

/**
 * The nine attitude bands, warmest first: each is the highest attitude in it (OpenCiv2 `diplo_attitude_level`,
 *  `diplomacy.cpp:4180`). The first holds only attitudes below 0, which the range never reaches; the last holds 100.
 *  What each band is called is the renderer's.
 */
export const attitudeBands: readonly number[] = [
  -1,
  10,
  25,
  38,
  61,
  74,
  89,
  99,
  ATTITUDE_MAXIMUM,
];

/** The band (0 to 8, `attitudeBands`) an attitude is in. */
export const attitudeLevel = (value: number): number => {
  const level = attitudeBands.findIndex((maximum) => value <= maximum);

  return level === -1 ? attitudeBands.length - 1 : level;
};

/**
 * `player` is made to declare war on `other`, by something it did under a treaty (an attack across it, an incident),
 *  rather than choosing to (OpenCiv2 `diplo_force_war`, `diplomacy.cpp:6861`). Any treaty between them ends, and its
 *  reputation suffers as if it had broken the treaty itself (`civ2-diplomacy:declared-war/reputation`).
 */
export const madeToDeclareWar = (
  dependencies: Pick<BaseDependencies, 'interactionRegistry' | 'ruleRegistry'>,
  player: Player,
  other: Player
): void => declareWar(dependencies as BaseDependencies, player, other, true);

/**
 * Every vendetta another player holds against `player` ends (`Vendetta`s in force whose holder, the first of their
 *  players, isn't `player` and whose target is), as completing the Eiffel Tower and a change of government into Anarchy
 *  have it (OpenCiv2 `civ.cpp:6794-6812`, `:6863-6868`). Vendettas `player` holds against others stay.
 */
export const clearVendettasAgainst = (
  player: Player,
  interactionRegistry: InteractionRegistry
): void =>
  interactionRegistry
    .getByPlayer(player)
    .filter(
      (interaction): interaction is Vendetta =>
        interaction instanceof Vendetta &&
        interaction.active() &&
        interaction.players()[0] !== player &&
        interaction.players()[1] === player
    )
    .forEach((vendetta: Vendetta) => vendetta.expire(player));

export default attitude;
