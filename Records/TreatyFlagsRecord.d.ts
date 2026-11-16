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
export declare class TreatyFlagsRecord
  extends RelationRecord
  implements ITreatyFlagsRecord
{
  private _holder;
  private _toward;
  private _value;
  constructor(
    holder: Player,
    toward: Player,
    value: number,
    ...args: (RuleRegistry | Turn)[]
  );
  holder(): Player;
  setValue(value: number): void;
  toward(): Player;
  value(): number;
}
export default TreatyFlagsRecord;
