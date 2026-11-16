"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenateScandal = void 0;
const Rule_1 = require("@civ-clone/core-rule/Rule");
/**
 * `player`'s Senate has caused a scandal that brings the government down into Anarchy (OpenCiv2 `diplomacy.cpp:6400`,
 *  `:5295-5321`): a refused withdrawal from another's land, or, in part 2, an incident of espionage under a treaty.
 *  civ2-diplomacy decides whether there's a scandal (`senateScandal`); what follows (the revolution) is the rules of
 *  whoever registers one of these.
 */
class SenateScandal extends Rule_1.default {
}
exports.SenateScandal = SenateScandal;
exports.default = SenateScandal;
//# sourceMappingURL=SenateScandal.js.map