"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatyFlagsRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * What `holder` keeps about `toward` beyond the treaty itself, as bits (`lib/flags`): one direction of one pair, kept in
 *  the `InteractionRegistry` so it's saved. The original keeps these in the same word as the treaty (OpenCiv2
 *  `civs[holder].treaties[toward]`). Made the first time a bit is set, so a game that never sets one has none.
 */
class TreatyFlagsRecord extends RelationRecord_1.RelationRecord {
    constructor(holder, toward, value, ...args) {
        super(holder, toward, ...args);
        this._holder = holder;
        this._toward = toward;
        this._value = value;
        this.addKey('holder', 'toward', 'value');
    }
    holder() {
        return this._holder;
    }
    setValue(value) {
        this._value = value;
    }
    toward() {
        return this._toward;
    }
    value() {
        return this._value;
    }
}
exports.TreatyFlagsRecord = TreatyFlagsRecord;
exports.default = TreatyFlagsRecord;
//# sourceMappingURL=TreatyFlagsRecord.js.map