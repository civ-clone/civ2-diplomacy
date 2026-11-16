import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
/** `holder`'s attitude toward `toward` kept at `cap` or below. */
export declare const capAttitude: (
  dependencies: Dependencies,
  holder: Player,
  toward: Player,
  cap: number,
  reason: string
) => void;
/**
 * `diplo_civs_meet_peace` (`:5833`), two computer players making peace: the treaty and nothing else
 *  (`diplo_set_treaty_flags(civ, civ2, 4)`).
 */
export declare const makeTreatyPeace: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
/**
 * `diplo_sign_peace_treaty` (`:1074`): peace signed this turn (`0x4004`), any war ended, the computer player's attitude
 *  50 or below, its patience reset, contact now.
 */
export declare const signPeace: (
  dependencies: Dependencies,
  computer: Player,
  person: Player
) => void;
/**
 * `diplo_agree_ceasefire` (`:1101`): a ceasefire signed this turn (`0x4002`), no tribute owed, the computer player's
 *  attitude 50 or below, contact now, and nobody is the aggressor against the person any more.
 */
export declare const signCeasefire: (
  dependencies: Dependencies,
  computer: Player,
  person: Player
) => void;
/**
 * `diplo_form_alliance` (`:1050`): an alliance (and so peace), the computer player 25 warmer, its patience reset,
 *  contact now.
 */
export declare const formAlliance: (
  dependencies: Dependencies,
  computer: Player,
  other: Player
) => void;
/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own leaves: one at sea,
 *  or a land unit (not a trade unit) on a land mass where `host` has cities, goes to `player`'s nearest city (a unit at
 *  sea, its nearest city on the coast). Units are moved, not walked, as the original's are.
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
/** Whether `declaration` was ended without a word. */
export declare const endedSilently: (declaration: object) => boolean;
/** `declaration` ends, `by` saying nothing of it: no notice is given (`Rules/relations`' announcement skips it). */
export declare const expireSilently: (
  declaration: {
    expire(by: Player): void;
  },
  by: Player
) => void;
/**
 * `unit` goes to its player's nearest city, if it has one: moved, its orders dropped (`unit_relocate`). One in that
 *  city already stays there, its orders dropped, and counts as sent, as the original's does.
 */
export declare const sendHome: (
  dependencies: Dependencies,
  unit: Unit
) => boolean;
/**
 * A computer player withdraws its units from a person's land (`diplo_answer_demand`, `:1907-1935`): each of its land
 *  units on land, not a diplomat or trade unit, within 2 squares of one of the person's cities goes to its own nearest
 *  city. Answers how many moved.
 */
export declare const withdrawUnits: (
  dependencies: Dependencies,
  computer: Player,
  person: Player
) => number;
