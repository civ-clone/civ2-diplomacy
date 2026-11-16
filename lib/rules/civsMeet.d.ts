import { TurnStartRules } from './turnStart';
import Dependencies from '../Dependencies';
import Moved from '@civ-clone/core-unit/Rules/Moved';
/**
 * Units meeting (`Moved`):
 *
 * - `<prefix>:unit/moved/computers-meet`: two computer players meet when one's land unit ends a move on land next to
 *   the other's (`diplo_civs_meet`, called as land units meet): `civsMeet`, which makes their contact. Once for each
 *   pair each turn (`COMPUTERS_MET`, a turn bit, so a reload keeps it): the original may decide again at each meeting,
 *   with no more to go on.
 * - `<prefix>:unit/moved/contact`: a person's unit meeting anyone makes contact, as base-diplomacy's rule does
 *   (`contactOnMove`).
 * - `<prefix>:unit/moved/contact-person`: a computer player's unit meeting a person's makes contact, looked up in the
 *   registry each time, so contact lost is made again.
 *
 * Computer players make contact only through `civsMeet`.
 */
export declare const movedRules: (
  prefix: string,
  dependencies: Dependencies,
  rules: TurnStartRules
) => Moved[];
export default movedRules;
