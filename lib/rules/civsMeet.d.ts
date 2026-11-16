import { TurnStartRules } from './turnStart';
import Dependencies from '../Dependencies';
import Moved from '@civ-clone/core-unit/Rules/Moved';
/**
 * Two computer players meet when one's unit ends a move next to the other's (`diplo_civs_meet`, called as units meet):
 *  `civsMeet`, before base-diplomacy's contact rule makes contact. Once for each pair each turn, kept for the session
 *  (a game reloaded mid-turn may meet a pair once more): the original may decide again at each meeting, with no more to
 *  go on.
 */
export declare const movedRules: (
  prefix: string,
  dependencies: Dependencies,
  rules: TurnStartRules
) => Moved[];
export default movedRules;
