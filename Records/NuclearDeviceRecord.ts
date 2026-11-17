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
export class NuclearDeviceRecord extends RelationRecord {
  private _holder: Player;
  private _planter: Player;

  constructor(
    holder: Player,
    planter: Player,
    ...args: (RuleRegistry | Turn)[]
  ) {
    super(holder, ...args);

    this._holder = holder;
    this._planter = planter;

    this.addKey('holder', 'planter', 'value');
  }

  holder(): Player {
    return this._holder;
  }

  planter(): Player {
    return this._planter;
  }

  value(): number {
    return 1;
  }
}

export default NuclearDeviceRecord;
