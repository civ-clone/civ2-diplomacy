"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarnedUnitsRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * `player`'s units warned once already for intruding on another's borders (the original's `UNITF_BORDER_WARNED`), by
 *  id, kept in the `InteractionRegistry` so a reloaded game still counts a second offence.
 */
class WarnedUnitsRecord extends RelationRecord_1.RelationRecord {
    constructor(player, units, ...args) {
        super(player, ...args);
        this._player = player;
        this._units = units;
        this.addKey('player', 'units', 'value');
    }
    player() {
        return this._player;
    }
    setUnits(units) {
        this._units = units;
    }
    units() {
        return this._units;
    }
    value() {
        return this._units.length;
    }
}
exports.WarnedUnitsRecord = WarnedUnitsRecord;
exports.default = WarnedUnitsRecord;
//# sourceMappingURL=WarnedUnitsRecord.js.map