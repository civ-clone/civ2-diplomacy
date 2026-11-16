import Player from '@civ-clone/core-player/Player';
import RelationRecord from '@civ-clone/core-diplomacy/Records/RelationRecord';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';

/**
 * A computer player's call to its ally, a person, to join its war on `against` (`diplo_ally_demand_help`), waiting for
 *  its next audience with the person. Kept in the `InteractionRegistry` so it's saved; removed once the person has
 *  answered.
 */
export class CallForHelpRecord extends RelationRecord {
  private _against: Player;
  private _ally: Player;
  private _caller: Player;

  constructor(
    caller: Player,
    ally: Player,
    against: Player,
    ...args: (RuleRegistry | Turn)[]
  ) {
    super(caller, ally, ...args);

    this._against = against;
    this._ally = ally;
    this._caller = caller;

    this.addKey('caller', 'ally', 'against', 'value');
  }

  against(): Player {
    return this._against;
  }

  ally(): Player {
    return this._ally;
  }

  caller(): Player {
    return this._caller;
  }

  value(): number {
    return 1;
  }
}

export default CallForHelpRecord;
