import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
import TreatyFlagsRecord from '../Records/TreatyFlagsRecord';

// The original's treaty bits that the declarations don't carry (OpenCiv2 `src/include/enums.h`), each one way: what
//  `holder` keeps about `toward`. Our own numbering; only the meanings are the original's.

/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
export const HOSTILE_INTENT = 1 << 0;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
export const SNEAK_ATTACK = 1 << 1;
/** An incident between them (`TREATY_INCIDENT`): the computer player comes to talk at once. */
export const INCIDENT = 1 << 2;
/** `holder` started a war with `toward` (`TREATY_AGGRESSOR`). */
export const AGGRESSOR = 1 << 3;
/** Tribute was paid, or advances given, this round (`TREATY_TRIBUTE`). */
export const TRIBUTE = 1 << 4;
/** A treaty was signed between them this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
export const CHANGED_THIS_TURN = 1 << 5;
/** Peace was signed while a ceasefire was still in force, and no audience has cleared it since (the ceasefire bit). */
export const CEASEFIRE_LINGERS = 1 << 6;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
export const WAR_THIS_TURN = 1 << 7;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
export const MET_THIS_TURN = 1 << 8;
/** `toward` struck `holder` with a nuclear weapon (`TREATY_NUKED`). */
export const NUKED = 1 << 9;
/** `holder` fights `toward` at another's request (`TREATY_MERCENARY`). */
export const MERCENARY = 1 << 10;

/** The bits cleared at the start of every turn. */
export const TURN_BITS = CHANGED_THIS_TURN | WAR_THIS_TURN | MET_THIS_TURN;

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
