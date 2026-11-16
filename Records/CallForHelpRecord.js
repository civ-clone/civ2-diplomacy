"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallForHelpRecord = void 0;
const RelationRecord_1 = require("@civ-clone/core-diplomacy/Records/RelationRecord");
/**
 * A computer player's call to its ally, a person, to join its war on `against` (`diplo_ally_demand_help`), waiting for
 *  its next audience with the person. Kept in the `InteractionRegistry` so it's saved; removed once the person has
 *  answered.
 */
class CallForHelpRecord extends RelationRecord_1.default {
    constructor(caller, ally, against, ...args) {
        super(caller, ally, ...args);
        this._against = against;
        this._ally = ally;
        this._caller = caller;
        this.addKey('caller', 'ally', 'against', 'value');
    }
    against() {
        return this._against;
    }
    ally() {
        return this._ally;
    }
    caller() {
        return this._caller;
    }
    value() {
        return 1;
    }
}
exports.CallForHelpRecord = CallForHelpRecord;
exports.default = CallForHelpRecord;
//# sourceMappingURL=CallForHelpRecord.js.map