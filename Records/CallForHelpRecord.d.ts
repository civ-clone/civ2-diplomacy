import Player from '@civ-clone/core-player/Player';
import RelationRecord from '@civ-clone/core-diplomacy/Records/RelationRecord';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/**
 * A computer player's call to its ally, a person, to join its war on `against` (`diplo_ally_demand_help`), waiting for
 *  its next audience with the person. Kept in the `InteractionRegistry` so it's saved; removed once the person has
 *  answered.
 */
export declare class CallForHelpRecord extends RelationRecord {
  private _against;
  private _ally;
  private _caller;
  constructor(
    caller: Player,
    ally: Player,
    against: Player,
    ...args: (RuleRegistry | Turn)[]
  );
  against(): Player;
  ally(): Player;
  caller(): Player;
  value(): number;
}
export default CallForHelpRecord;
