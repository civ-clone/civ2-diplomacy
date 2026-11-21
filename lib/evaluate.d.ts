import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
export interface Evaluation {
  attitude: number;
  fear: number;
  tribute: number;
  aggressive: boolean;
  initialAggressive: boolean;
  suppressedAggression: boolean;
  requestMode: 0 | 1 | 2;
  targetIsLeader: boolean;
  warTarget: Player | null;
  peaceInclination: number;
  declareWar: boolean;
  capturedCities: number;
  unitsNearCities: boolean;
  reputation: number;
  turnsSinceContact: number;
}
/** How much warmer (lower) a computer player's attitude in talks is to the owner of the Great Wall or the United Nations. */
export declare const PACIFYING_ATTITUDE = 10;
/** How many more of the Eiffel Tower's owner's proposals a computer player hears before it ends the meeting. */
export declare const EIFFEL_TOWER_PATIENCE = 1;
/** `holder`'s attitude toward `toward`, 50 before one is seeded. */
export declare const attitudeOf: (
  dependencies: Dependencies
) => (holder: Player, toward: Player) => number;
export declare const evaluate: (
  dependencies: Dependencies,
  computer: Player,
  other: Player
) => Evaluation;
/** `diplo_patience_limit`: how many proposals the computer player hears from `other` before it ends the meeting. */
export declare const patienceLimit: (
  dependencies: Dependencies,
  computer: Player,
  other: Player,
  talksAttitude: number
) => number;
