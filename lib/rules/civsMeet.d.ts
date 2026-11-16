import { TurnStartRules } from './turnStart';
import Dependencies from '../Dependencies';
import Moved from '@civ-clone/core-unit/Rules/Moved';
/**
 * Two computer players meet when one's unit ends a move next to the other's (`diplo_civs_meet`, called as units meet):
 *  `civsMeet`. Once for each pair each turn: the original may decide again on each meeting, but with no more to go on.
 */
export declare const movedRules: (
  prefix: string,
  dependencies: Dependencies,
  rules: TurnStartRules
) => Moved[];
export default movedRules;
