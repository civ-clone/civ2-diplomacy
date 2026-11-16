import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
/** Every attitude between the two kept at `cap` or below (`diplo_sign_peace_treaty`, `diplo_agree_ceasefire`). */
export declare const capAttitudes: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  cap: number,
  reason: string
) => void;
/** `diplo_sign_peace_treaty` (`:1074`): peace, signed this turn, attitudes 50 or below. */
export declare const signPeace: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
/** `diplo_agree_ceasefire` (`:1101`): a ceasefire, attitudes 50 or below, no tribute owed. */
export declare const signCeasefire: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
/** `diplo_form_alliance` (`:1050`): an alliance, and the computer player's attitude 25 warmer. */
export declare const formAlliance: (
  dependencies: Dependencies,
  computer: Player,
  other: Player
) => void;
/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own goes to its own
 *  nearest city (a land unit on a land mass where `host` has cities, any unit at sea; trade units stay). Units are
 *  moved, not walked, as the original's are.
 */
export declare const expelUnits: (
  dependencies: Dependencies,
  player: Player,
  host: Player
) => number;
/** `diplo_cancel_alliance` (`:4300`): the alliance ends (they stay at peace), and each side's units go home. */
export declare const endAlliance: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
/** Whether `player` is declaring a war that costs no reputation just now. */
export declare const declaringQuietly: (player: Player) => boolean;
/** `player` declares war on `other`, as the original's threats do: no reputation is lost. */
export declare const declareWarQuietly: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
/** Who asked `player` to declare the war it is declaring just now, if anyone. */
export declare const instigatorOf: (player: Player) => Player | null;
/** `player` declares war on `other` because `instigator` asked it to (`diplo_declare_war(player, other, instigator)`). */
export declare const declareWarFor: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  instigator: Player
) => void;
/**
 * What a computer player thinks `advance` is worth (`ai_advance_value`, in part): RULES.TXT's value for it, plus its
 *  civilized modifier times the leader's civilize attitude, at least 1. The terms for the player's own cities and units
 *  are left out.
 */
export declare const advanceValue: (
  dependencies: Dependencies,
  player: Player,
  advance: Advance | typeof Advance
) => number;
/** `from`'s advances that `by` lacks, the ones `by` values most first. */
export declare const advancesWanted: (
  dependencies: Dependencies,
  from: Player,
  by: Player
) => Advance[];
/** Whether `declaration` was ended without a word. */
export declare const endedSilently: (declaration: object) => boolean;
/** `declaration` ends, `by` saying nothing of it: no notice is given (`Rules/relations`' announcement skips it). */
export declare const expireSilently: (
  declaration: {
    expire(by: Player): void;
  },
  by: Player
) => void;
