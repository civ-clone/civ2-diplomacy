"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuclearDeviceRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * `holder` has not met `planter`, whose planted nuclear device was discovered: the original made `holder` 100 colder and
 *  set the war bit anyway (`unit_spy.cpp:707-711`), so both apply when they first meet
 *  (`civ2-diplomacy:interaction/created/nuclear-device`), and the record goes. Keyed on `holder` alone, so it matches
 *  no pair query and nobody counts as having met. Kept in the `InteractionRegistry` so it's saved.
 */
class NuclearDeviceRecord extends RelationRecord_1.default {
    constructor(holder, planter, ...args) {
        super(holder, ...args);
        this._holder = holder;
        this._planter = planter;
        this.addKey('holder', 'planter', 'value');
    }
    holder() {
        return this._holder;
    }
    planter() {
        return this._planter;
    }
    value() {
        return 1;
    }
}
exports.NuclearDeviceRecord = NuclearDeviceRecord;
exports.default = NuclearDeviceRecord;
//# sourceMappingURL=NuclearDeviceRecord.js.map