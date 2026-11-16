import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
import TreatyFlagsRecord from '../Records/TreatyFlagsRecord';

// The original's treaty bits that the declarations don't carry, each one way, with the original's values
//  (OpenCiv2 `src/include/enums.h` `TreatyFlag`): what `holder` keeps about `toward`. Contact, ceasefire, peace,
//  alliance, war, vendetta and embassy are declarations and interactions here, not bits.

/** Peace was signed while a ceasefire was in force, and no audience has cleared it since: the original's ceasefire bit
 *  (`TREATY_CEASEFIRE`) left set beside the peace one. */
export const CEASEFIRE_LINGERS = 0x2;
/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
export const HOSTILE_INTENT = 0x20;
/** `holder` cancelled its treaty with `toward`: war is near (`TREATY_BROKEN`). */
export const BROKEN = 0x40;
/** `holder` showed `toward` its nukes, or was nuked by it (`TREATY_NUCLEAR_THREAT`). */
export const NUCLEAR_THREAT = 0x100;
/** Their units have fought (`TREATY_FIGHTING`). */
export const FIGHTING = 0x200;
/** They met lately; lapses every 16 turns (`TREATY_RECENT_CONTACT`). */
export const RECENT_CONTACT = 0x400;
/** `holder` started a war with `toward`; decays after 32 turns (`TREATY_AGGRESSOR`). */
export const AGGRESSOR = 0x800;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
export const SNEAK_ATTACK = 0x1000;
/** A ceasefire, peace or first contact this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
export const CHANGED_THIS_TURN = 0x4000;
/** `holder` will demand at its next audience that `toward`'s units leave its land, or face war: our own bit, for the
 *  original's `diplo_review_violators`, which asks at once. */
export const WITHDRAWAL_DEMANDED = 0x8000;
/** `holder` has a reason to summon `toward` to talks (`TREATY_INCIDENT`). */
export const INCIDENT = 0x10000;
/** `holder` has nuked `toward` (`TREATY_NUKED`). */
export const NUKED = 0x20000;
/** `holder` paid tribute to `toward` this round (`TREATY_TRIBUTE`). */
export const TRIBUTE = 0x40000;
/** Extends `AGGRESSOR` by 32 turns (`TREATY_AGGRESSOR_LONG`). */
export const AGGRESSOR_LONG = 0x80000;
/** `holder` fights at `toward`'s request (`TREATY_MERCENARY`). */
export const MERCENARY = 0x100000;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
export const WAR_THIS_TURN = 0x200000;
/** `toward` took a city of `holder`'s (`TREATY_CITY_CAPTURED`). */
export const CITY_CAPTURED = 0x400000;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
export const MET_THIS_TURN = 0x800000;

/** Two computer players' units met this turn and they decided what to do (`diplo_civs_meet`): our own bit, so a pair
 *  decides once a turn, kept in a save. */
export const COMPUTERS_MET = 0x2000000;

/** The bits cleared at the start of every turn (`civ.cpp:7080`, `& 0xff5fbfff`), and our own `COMPUTERS_MET`. */
export const TURN_BITS =
  CHANGED_THIS_TURN | WAR_THIS_TURN | MET_THIS_TURN | COMPUTERS_MET;

/** What signing a ceasefire, a peace or an alliance clears both ways (`diplo_set_treaty_flags`, `0x2a60`, less war). */
export const SIGNING_CLEARS = AGGRESSOR | FIGHTING | BROKEN | HOSTILE_INTENT;

/** What a war's end clears both ways (`diplo_clear_treaty_flags`, `0x1800`). */
export const WAR_END_CLEARS = AGGRESSOR | SNEAK_ATTACK;

export interface FlagRegistries {
  interactionRegistry: InteractionRegistry;
  ruleRegistry?: RuleRegistry;
  turn?: Turn;
}

const recordOf = (
  { interactionRegistry }: FlagRegistries,
  holder: Player,
  toward: Player
): TreatyFlagsRecord | undefined =>
  interactionRegistry
    .getByPlayers(holder, toward)
    .find(
      (interaction): interaction is TreatyFlagsRecord =>
        interaction instanceof TreatyFlagsRecord &&
        interaction.holder() === holder &&
        interaction.toward() === toward
    );

/** Every bit `holder` keeps about `toward`. */
export const flagsOf = (
  registries: FlagRegistries,
  holder: Player,
  toward: Player
): number => recordOf(registries, holder, toward)?.value() ?? 0;

/** Whether `holder` keeps `flag` about `toward`. */
export const hasFlag = (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
): boolean => (flagsOf(registries, holder, toward) & flag) !== 0;

const write = (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  value: number
): void => {
  const record = recordOf(registries, holder, toward);

  if (record !== undefined) {
    record.setValue(value);

    return;
  }

  if (value === 0) {
    return;
  }

  registries.interactionRegistry.register(
    new TreatyFlagsRecord(
      holder,
      toward,
      value,
      ...([registries.ruleRegistry, registries.turn].filter(
        (arg) => arg !== undefined
      ) as (RuleRegistry | Turn)[])
    )
  );
};

/** `holder` keeps `flag` about `toward`. */
export const setFlag = (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
): void =>
  write(registries, holder, toward, flagsOf(registries, holder, toward) | flag);

/** `holder` no longer keeps `flag` about `toward`. */
export const clearFlag = (
  registries: FlagRegistries,
  holder: Player,
  toward: Player,
  flag: number
): void => {
  const flags = flagsOf(registries, holder, toward);

  if ((flags & flag) !== 0) {
    write(registries, holder, toward, flags & ~flag);
  }
};

/** Both ways (`diplo_set_treaty_flags`). */
export const setBoth = (
  registries: FlagRegistries,
  player: Player,
  other: Player,
  flag: number
): void => {
  setFlag(registries, player, other, flag);
  setFlag(registries, other, player, flag);
};

/** Both ways (`diplo_clear_treaty_flags`). */
export const clearBoth = (
  registries: FlagRegistries,
  player: Player,
  other: Player,
  flag: number
): void => {
  clearFlag(registries, player, other, flag);
  clearFlag(registries, other, player, flag);
};

/** Every record's turn bits (`TURN_BITS`) cleared, at the start of a turn. */
export const clearTurnBits = ({ interactionRegistry }: FlagRegistries): void =>
  interactionRegistry
    .entries()
    .filter(
      (interaction): interaction is TreatyFlagsRecord =>
        interaction instanceof TreatyFlagsRecord
    )
    .forEach((record) => {
      if ((record.value() & TURN_BITS) !== 0) {
        record.setValue(record.value() & ~TURN_BITS);
      }
    });
