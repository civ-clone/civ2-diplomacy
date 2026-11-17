import Player from '@civ-clone/core-player/Player';
import RelationRecord from '@civ-clone/core-diplomacy/Records/RelationRecord';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/**
 * `holder` has not met `planter`, whose planted nuclear device was discovered: the original made `holder` 100 colder and
 *  set the war bit anyway (`unit_spy.cpp:707-711`), so both apply when they first meet
 *  (`civ2-diplomacy:interaction/created/nuclear-device`), and the record goes. Keyed on `holder` alone, so it matches
 *  no pair query and nobody counts as having met. Kept in the `InteractionRegistry` so it's saved.
 */
export declare class NuclearDeviceRecord extends RelationRecord {
  private _holder;
  private _planter;
  constructor(
    holder: Player,
    planter: Player,
    ...args: (RuleRegistry | Turn)[]
  );
  holder(): Player;
  planter(): Player;
  value(): number;
}
export default NuclearDeviceRecord;
