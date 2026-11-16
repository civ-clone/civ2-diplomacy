import {
  IRelationRecord,
  RelationRecord,
} from '@civ-clone/core-diplomacy/Records/RelationRecord';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
export interface IWarnedUnitsRecord extends IRelationRecord {
  player(): Player;
  units(): string[];
  setUnits(units: string[]): void;
}
/**
 * `player`'s units warned once already for intruding on another's borders (the original's `UNITF_BORDER_WARNED`), by
 *  id, kept in the `InteractionRegistry` so a reloaded game still counts a second offence.
 */
export declare class WarnedUnitsRecord
  extends RelationRecord
  implements IWarnedUnitsRecord
{
  private _player;
  private _units;
  constructor(
    player: Player,
    units: string[],
    ...args: (RuleRegistry | Turn)[]
  );
  player(): Player;
  setUnits(units: string[]): void;
  units(): string[];
  value(): number;
}
export default WarnedUnitsRecord;
