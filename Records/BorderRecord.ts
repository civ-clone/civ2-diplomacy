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
export class BorderRecord extends RelationRecord implements IBorderRecord {
  private _holder: Player;
  private _intruders: string[];
  private _toward: Player;

  constructor(
    holder: Player,
    toward: Player,
    intruders: string[],
    ...args: (RuleRegistry | Turn)[]
  ) {
    super(holder, toward, ...args);

    this._holder = holder;
    this._intruders = intruders;
    this._toward = toward;

    this.addKey('holder', 'toward', 'intruders', 'value');
  }

  holder(): Player {
    return this._holder;
  }

  intruders(): string[] {
    return this._intruders;
  }

  setIntruders(intruders: string[]): void {
    this._intruders = intruders;
  }

  toward(): Player {
    return this._toward;
  }

  value(): number {
    return this._intruders.length;
  }
}

export default BorderRecord;
