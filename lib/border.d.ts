import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
/** The ids of `player`'s units warned once for intruding. */
export declare const warnedUnits: (
  dependencies: Dependencies,
  player: Player
) => string[];
/** `unit` is warned (saved). */
export declare const warn: (dependencies: Dependencies, unit: Unit) => void;
/** Whether `unit` was warned once already. */
export declare const warned: (
  dependencies: Dependencies,
  unit: Unit
) => boolean;
/**
 * The start of `player`'s turn (`units_reset_for_turn`, `unit.cpp:970-979`): a warned unit not intruding now loses its
 *  warning one turn in four, by `(turn ^ unit) & 3 == 0`.
 */
export declare const forgetWarnings: (
  dependencies: Dependencies,
  player: Player,
  intruding: (id: string) => boolean
) => void;
/** `holder` notes the units of `toward`'s it counted, for the withdrawal it will demand. */
export declare const noteIntruders: (
  dependencies: Dependencies,
  holder: Player,
  toward: Player,
  units: Unit[]
) => void;
/** The units of `toward`'s `holder` noted, still `toward`'s, and forgets them. */
export declare const takeIntruders: (
  dependencies: Dependencies,
  holder: Player,
  toward: Player
) => Unit[];
