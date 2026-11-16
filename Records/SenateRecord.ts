import {
  IRelationRecord,
  RelationRecord,
} from '@civ-clone/core-diplomacy/Records/RelationRecord';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';

export interface ISenateRecord extends IRelationRecord {
  inSession(): boolean;
  player(): Player;
  set(roll: number, inSession: boolean): void;
  value(): number;
}

/**
 * A player's Senate this turn: the roll, 0 to 99, made at the start of each of its turns (OpenCiv2 `civ.cpp:7069`,
 *  `civs[civ].diplo_random`), and whether a Republic's Senate is in session (`CIVF_SENATE_ACTIVE`, toggled one turn in
 *  three). Kept in the `InteractionRegistry` so a reloaded game doesn't roll again.
 */
export class SenateRecord extends RelationRecord implements ISenateRecord {
  private _inSession: boolean;
  private _player: Player;
  private _roll: number;

  constructor(
    player: Player,
    roll: number,
    inSession: boolean,
    ...args: (RuleRegistry | Turn)[]
  ) {
    super(player, ...args);

    this._inSession = inSession;
    this._player = player;
    this._roll = roll;

    this.addKey('player', 'value', 'inSession');
  }

  inSession(): boolean {
    return this._inSession;
  }

  player(): Player {
    return this._player;
  }

  set(roll: number, inSession: boolean): void {
    this._roll = roll;
    this._inSession = inSession;
  }

  value(): number {
    return this._roll;
  }
}

export default SenateRecord;
