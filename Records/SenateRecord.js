"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenateRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * A player's Senate this turn: the roll, 0 to 99, made at the start of each of its turns (OpenCiv2 `civ.cpp:7069`,
 *  `civs[civ].diplo_random`), and whether a Republic's Senate is in session (`CIVF_SENATE_ACTIVE`, toggled one turn in
 *  three). Kept in the `InteractionRegistry` so a reloaded game doesn't roll again.
 */
class SenateRecord extends RelationRecord_1.RelationRecord {
    constructor(player, roll, inSession, ...args) {
        super(player, ...args);
        this._inSession = inSession;
        this._player = player;
        this._roll = roll;
        this.addKey('player', 'value', 'inSession');
    }
    inSession() {
        return this._inSession;
    }
    player() {
        return this._player;
    }
    set(roll, inSession) {
        this._roll = roll;
        this._inSession = inSession;
    }
    value() {
        return this._roll;
    }
}
exports.SenateRecord = SenateRecord;
exports.default = SenateRecord;
//# sourceMappingURL=SenateRecord.js.map