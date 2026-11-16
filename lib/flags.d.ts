import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/** Peace was signed while a ceasefire was in force, and no audience has cleared it since: the original's ceasefire bit
 *  (`TREATY_CEASEFIRE`) left set beside the peace one. */
export declare const CEASEFIRE_LINGERS = 2;
/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
export declare const HOSTILE_INTENT = 32;
/** `holder` cancelled its treaty with `toward`: war is near (`TREATY_BROKEN`). */
export declare const BROKEN = 64;
/** `holder` showed `toward` its nukes, or was nuked by it (`TREATY_NUCLEAR_THREAT`). */
export declare const NUCLEAR_THREAT = 256;
/** Their units have fought (`TREATY_FIGHTING`). */
export declare const FIGHTING = 512;
/** They met lately; lapses every 16 turns (`TREATY_RECENT_CONTACT`). */
export declare const RECENT_CONTACT = 1024;
/** `holder` started a war with `toward`; decays after 32 turns (`TREATY_AGGRESSOR`). */
export declare const AGGRESSOR = 2048;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
export declare const SNEAK_ATTACK = 4096;
/** A ceasefire, peace or first contact this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
export declare const CHANGED_THIS_TURN = 16384;
/** `holder` will demand at its next audience that `toward`'s units leave its land, or face war: our own bit, for the
 *  original's `diplo_review_violators`, which asks at once. */
export declare const WITHDRAWAL_DEMANDED = 32768;
/** `holder` has a reason to summon `toward` to talks (`TREATY_INCIDENT`). */
export declare const INCIDENT = 65536;
/** `holder` has nuked `toward` (`TREATY_NUKED`). */
export declare const NUKED = 131072;
/** `holder` paid tribute to `toward` this round (`TREATY_TRIBUTE`). */
export declare const TRIBUTE = 262144;
/** Extends `AGGRESSOR` by 32 turns (`TREATY_AGGRESSOR_LONG`). */
export declare const AGGRESSOR_LONG = 524288;
/** `holder` fights at `toward`'s request (`TREATY_MERCENARY`). */
export declare const MERCENARY = 1048576;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
export declare const WAR_THIS_TURN = 2097152;
/** `toward` took a city of `holder`'s (`TREATY_CITY_CAPTURED`). */
export declare const CITY_CAPTURED = 4194304;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
export declare const MET_THIS_TURN = 8388608;
/** The bits cleared at the start of every turn (`civ.cpp:7080`, `& 0xff5fbfff`). */
export declare const TURN_BITS: number;
/** What signing a ceasefire, a peace or an alliance clears both ways (`diplo_set_treaty_flags`, `0x2a60`, less war). */
export declare const SIGNING_CLEARS: number;
/** What a war's end clears both ways (`diplo_clear_treaty_flags`, `0x1800`). */
export declare const WAR_END_CLEARS: number;
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
