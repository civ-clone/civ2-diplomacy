"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatyFlagsRecord = exports.SenateRecord = void 0;
// The records civ2-diplomacy keeps in the `InteractionRegistry`: a game that loads a save registers these as saveable
//  classes, with base-diplomacy's `PatienceRecord` and `LastContactRecord` and core-diplomacy's records.
var SenateRecord_1 = require("./Records/SenateRecord");
Object.defineProperty(exports, "SenateRecord", { enumerable: true, get: function () { return SenateRecord_1.SenateRecord; } });
var TreatyFlagsRecord_1 = require("./Records/TreatyFlagsRecord");
Object.defineProperty(exports, "TreatyFlagsRecord", { enumerable: true, get: function () { return TreatyFlagsRecord_1.TreatyFlagsRecord; } });
//# sourceMappingURL=Records.js.map