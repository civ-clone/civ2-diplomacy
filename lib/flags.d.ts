import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
export declare const HOSTILE_INTENT: number;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
export declare const SNEAK_ATTACK: number;
/** An incident between them (`TREATY_INCIDENT`): the computer player comes to talk at once. */
export declare const INCIDENT: number;
/** `holder` started a war with `toward` (`TREATY_AGGRESSOR`). */
export declare const AGGRESSOR: number;
/** Tribute was paid, or advances given, this round (`TREATY_TRIBUTE`). */
export declare const TRIBUTE: number;
/** A treaty was signed between them this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
export declare const CHANGED_THIS_TURN: number;
/** Peace was signed while a ceasefire was still in force, and no audience has cleared it since (the ceasefire bit). */
export declare const CEASEFIRE_LINGERS: number;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
export declare const WAR_THIS_TURN: number;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
export declare const MET_THIS_TURN: number;
/** `toward` struck `holder` with a nuclear weapon (`TREATY_NUKED`). */
export declare const NUKED: number;
/** `holder` fights `toward` at another's request (`TREATY_MERCENARY`). */
export declare const MERCENARY: number;
/** The bits cleared at the start of every turn. */
export declare const TURN_BITS: number;
export interface FlagRegistries {
  interactionRegistry: InteractionRegistry;
  ruleRegistry?: RuleRegistry;
  turn?: Turn;
}
/** Every bit `holder` keeps about `toward`. */
export declare const flagsOf: (
  registries: FlagRegistries,
  holder: Player,
  toward: Player
) => number;
/** Whether `holder` keeps `flag` about `toward`. */
export declare const hasFlag: (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
) => boolean;
/** `holder` keeps `flag` about `toward`. */
export declare const setFlag: (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
) => void;
/** `holder` no longer keeps `flag` about `toward`. */
export declare const clearFlag: (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
) => void;
/** Both ways (`diplo_set_treaty_flags`). */
export declare const setBoth: (
  registries: FlagRegistries,
  player: Player,
  other: Player,
  flag: number
) => void;
/** Both ways (`diplo_clear_treaty_flags`). */
export declare const clearBoth: (
  registries: FlagRegistries,
  player: Player,
  other: Player,
  flag: number
) => void;
/** Every record's turn bits (`TURN_BITS`) cleared, at the start of a turn. */
export declare const clearTurnBits: ({
  interactionRegistry,
}: FlagRegistries) => void;
