import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
/** The unit's cost in rows of shields (`unit_types.cost`), from the game's `BuildCost` rules. */
export declare const unitCost: (
  dependencies: Dependencies,
  unit: Unit
) => number;
export interface UnitTerms {
  attitude: number;
  obsolete: boolean;
  breakthrough: typeof Advance | null;
}
export declare const unitTerms: (
  dependencies: Dependencies,
  computer: Player,
  unit: Unit
) => UnitTerms;
export default unitTerms;
