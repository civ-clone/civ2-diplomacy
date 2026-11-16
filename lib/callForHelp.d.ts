import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
/** The war `caller` will ask its ally `ally` to join at its next audience, or `null`. */
export declare const callForHelp: (
  dependencies: Dependencies,
  caller: Player,
  ally: Player
) => Player | null;
/** `caller` will ask `ally` to join its war on `against` (one call at a time; a new one replaces it). */
export declare const callAlly: (
  dependencies: Dependencies,
  caller: Player,
  ally: Player,
  against: Player
) => void;
/** The call has been answered. */
export declare const answered: (
  dependencies: Dependencies,
  caller: Player,
  ally: Player
) => void;
export default callForHelp;
