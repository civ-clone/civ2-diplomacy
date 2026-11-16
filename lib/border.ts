import BorderRecord from '../Records/BorderRecord';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
import WarnedUnitsRecord from '../Records/WarnedUnitsRecord';

// The marks the original keeps on units for border incidents (`UNITF_BORDER_WARNED`, `UNITF_BORDER_INTRUDER`).

const warnedRecord = (
  dependencies: Dependencies,
  player: Player
): WarnedUnitsRecord | undefined =>
  dependencies.interactionRegistry
    .getByPlayers(player)
    .find(
      (interaction): interaction is WarnedUnitsRecord =>
        interaction instanceof WarnedUnitsRecord &&
        interaction.player() === player
    );

/** The ids of `player`'s units warned once for intruding. */
export const warnedUnits = (
  dependencies: Dependencies,
  player: Player
): string[] => warnedRecord(dependencies, player)?.units() ?? [];

/** `unit` is warned (saved). */
export const warn = (dependencies: Dependencies, unit: Unit): void => {
  const player = unit.player(),
    record = warnedRecord(dependencies, player);

  if (record === undefined) {
    dependencies.interactionRegistry.register(
      new WarnedUnitsRecord(
        player,
        [unit.id()],
        dependencies.ruleRegistry,
        dependencies.turn
      )
    );

    return;
  }

  if (!record.units().includes(unit.id())) {
    record.setUnits([...record.units(), unit.id()]);
  }
};

/** Whether `unit` was warned once already. */
export const warned = (dependencies: Dependencies, unit: Unit): boolean =>
  warnedUnits(dependencies, unit.player()).includes(unit.id());

// A unit's slot in the original's unit table stands behind `(turn ^ unit) & 3`; here, a number made from its id.
const slotOf = (id: string): number =>
  Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0);

/**
 * The start of `player`'s turn (`units_reset_for_turn`, `unit.cpp:970-979`): a warned unit not intruding now loses its
 *  warning one turn in four, by `(turn ^ unit) & 3 == 0`.
 */
export const forgetWarnings = (
  dependencies: Dependencies,
  player: Player,
  intruding: (id: string) => boolean
): void => {
  const record = warnedRecord(dependencies, player);

  if (record === undefined) {
    return;
  }

  const turn = dependencies.turn.value(),
    living = new Set(
      dependencies.unitRegistry
        .getByPlayer(player)
        .map((unit: Unit) => unit.id())
    );

  record.setUnits(
    record
      .units()
      .filter(
        (id) =>
          living.has(id) && (intruding(id) || ((turn ^ slotOf(id)) & 3) !== 0)
      )
  );
};

const borderRecord = (
  dependencies: Dependencies,
  holder: Player,
  toward: Player
): BorderRecord | undefined =>
  dependencies.interactionRegistry
    .getByPlayers(holder, toward)
    .find(
      (interaction): interaction is BorderRecord =>
        interaction instanceof BorderRecord &&
        interaction.holder() === holder &&
        interaction.toward() === toward
    );

/** `holder` notes the units of `toward`'s it counted, for the withdrawal it will demand. */
export const noteIntruders = (
  dependencies: Dependencies,
  holder: Player,
  toward: Player,
  units: Unit[]
): void => {
  const ids = units.map((unit) => unit.id()),
    record = borderRecord(dependencies, holder, toward);

  if (record !== undefined) {
    record.setIntruders(ids);

    return;
  }

  dependencies.interactionRegistry.register(
    new BorderRecord(
      holder,
      toward,
      ids,
      dependencies.ruleRegistry,
      dependencies.turn
    )
  );
};

/** The units of `toward`'s `holder` noted, still `toward`'s, and forgets them. */
export const takeIntruders = (
  dependencies: Dependencies,
  holder: Player,
  toward: Player
): Unit[] => {
  const record = borderRecord(dependencies, holder, toward);

  if (record === undefined) {
    return [];
  }

  const ids = record.intruders();

  record.setIntruders([]);

  return dependencies.unitRegistry
    .getByPlayer(toward)
    .filter((unit: Unit) => ids.includes(unit.id()));
};
