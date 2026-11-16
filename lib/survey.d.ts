import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
/** `advance_has_prereq(advance, prerequisite)`: whether `prerequisite` leads to `advance`, however far back. */
export declare const leadsTo: (
  prerequisite: typeof Advance,
  advance: typeof Advance
) => boolean;
/**
 * `ai_advance_value(player, advance)`, in part: RULES.TXT's value plus its civilized modifier times the leader's
 *  civilize attitude (a computer player at war with a person ahead of it on a shared land mass leans less civilized:
 *  not ported); +1 or +2 toward Computers once it knows University; +1 toward Industrialization once it knows
 *  Invention, +2 with Navigation; +1 if nobody knows it; −1 for each known advance it leads to; at least 1. Left out:
 *  the terms for the player's cities and units (expansion by sea, the Port Facility, the Aqueduct and Sewer, its
 *  tribe's own preferences and the computer players' bonus terms).
 */
export declare const advanceValue: (
  dependencies: Dependencies,
  player: Player,
  advance: Advance | typeof Advance
) => number;
export interface Survey {
  best: Advance | null;
  second: Advance | null;
  bestValue: number;
  secondValue: number;
  wanted: Advance | null;
  personCount: number;
  computerCount: number;
}
/** `diplo_exchange_survey`: walks the advances in RULES.TXT's order, as the original does. */
export declare const survey: (
  dependencies: Dependencies,
  computer: Player,
  person: Player
) => Survey;
