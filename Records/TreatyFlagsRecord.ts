import {
  IRelationRecord,
  RelationRecord,
} from '@civ-clone/core-diplomacy/Records/RelationRecord';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';

export interface ITreatyFlagsRecord extends IRelationRecord {
  holder(): Player;
  setValue(value: number): void;
  toward(): Player;
  value(): number;
}

/**
 * What `holder` keeps about `toward` beyond the treaty itself, as bits (`lib/flags`): one direction of one pair, kept in
 *  the `InteractionRegistry` so it's saved. The original keeps these in the same word as the treaty (OpenCiv2
 *  `civs[holder].treaties[toward]`). Made the first time a bit is set, so a game that never sets one has none.
 */
export class TreatyFlagsRecord
  extends RelationRecord
  implements ITreatyFlagsRecord
{
  private _holder: Player;
  private _toward: Player;
  private _value: number;

  constructor(
    holder: Player,
    toward: Player,
    value: number,
    ...args: (RuleRegistry | Turn)[]
  ) {
    super(holder, toward, ...args);

    this._holder = holder;
    this._toward = toward;
    this._value = value;

    this.addKey('holder', 'toward', 'value');
  }

  holder(): Player {
    return this._holder;
  }

  setValue(value: number): void {
    this._value = value;
  }

  toward(): Player {
    return this._toward;
  }

  value(): number {
    return this._value;
  }
}

export default TreatyFlagsRecord;
