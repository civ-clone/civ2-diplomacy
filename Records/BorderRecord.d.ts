import {
  IRelationRecord,
  RelationRecord,
} from '@civ-clone/core-diplomacy/Records/RelationRecord';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
export interface IBorderRecord extends IRelationRecord {
  holder(): Player;
  toward(): Player;
  intruders(): string[];
  setIntruders(intruders: string[]): void;
}
/**
 * The units of `toward`'s that `holder` last counted inside its borders when it demanded they leave (the original's
 *  `UNITF_BORDER_INTRUDER` units, `diplo_review_violators`), by id, kept in the `InteractionRegistry` so a withdrawal
 *  agreed at a later audience moves those units.
 */
export declare class BorderRecord
  extends RelationRecord
  implements IBorderRecord
{
  private _holder;
  private _intruders;
  private _toward;
  constructor(
    holder: Player,
    toward: Player,
    intruders: string[],
    ...args: (RuleRegistry | Turn)[]
  );
  holder(): Player;
  intruders(): string[];
  setIntruders(intruders: string[]): void;
  toward(): Player;
  value(): number;
}
export default BorderRecord;
