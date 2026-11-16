"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BorderRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * The units of `toward`'s that `holder` last counted inside its borders when it demanded they leave (the original's
 *  `UNITF_BORDER_INTRUDER` units, `diplo_review_violators`), by id, kept in the `InteractionRegistry` so a withdrawal
 *  agreed at a later audience moves those units.
 */
class BorderRecord extends RelationRecord_1.RelationRecord {
    constructor(holder, toward, intruders, ...args) {
        super(holder, toward, ...args);
        this._holder = holder;
        this._intruders = intruders;
        this._toward = toward;
        this.addKey('holder', 'toward', 'intruders', 'value');
    }
    holder() {
        return this._holder;
    }
    intruders() {
        return this._intruders;
    }
    setIntruders(intruders) {
        this._intruders = intruders;
    }
    toward() {
        return this._toward;
    }
    value() {
        return this._intruders.length;
    }
}
exports.BorderRecord = BorderRecord;
exports.default = BorderRecord;
//# sourceMappingURL=BorderRecord.js.map