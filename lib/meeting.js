"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingFor = exports.meetingRules = void 0;
const meeting_1 = require("@civ-clone/base-diplomacy/lib/meeting");
const numbers_1 = require("./numbers");
const stance_1 = require("@civ-clone/base-diplomacy/lib/stance");
const readers_1 = require("./readers");
const wouldGoToWar_1 = require("@civ-clone/base-diplomacy/lib/wouldGoToWar");
// How a meeting is decided: `base-diplomacy`'s, with Civilization II's readers. There is no Senate, so no government
//  ever changes at a meeting.
const rulesFor = (dependencies) => {
    const read = (0, readers_1.default)(dependencies);
    return {
        isHuman: read.isHuman,
        hasSenate: read.hasSenate,
        wouldGoToWar: (player, other) => (0, wouldGoToWar_1.wouldGoToWar)(dependencies, read, numbers_1.warThreshold, player, other),
        stance: (player, other, random, changeGovernment) => (0, stance_1.stance)(dependencies, read, numbers_1.stanceNumbers, player, other, random, changeGovernment),
        changeGovernment: () => { },
    };
};
// Made once for each set of dependencies: a meeting is asked for at every step.
const rulesByDependencies = new WeakMap();
const meetingRules = (dependencies) => {
    if (!rulesByDependencies.has(dependencies)) {
        rulesByDependencies.set(dependencies, rulesFor(dependencies));
    }
    return rulesByDependencies.get(dependencies);
};
exports.meetingRules = meetingRules;
/** The meeting for `negotiation`, worked out the first time it's asked for. */
const meetingFor = (dependencies, negotiation, random) => (0, meeting_1.meetingFor)(dependencies, (0, exports.meetingRules)(dependencies), negotiation, random);
exports.meetingFor = meetingFor;
exports.default = exports.meetingFor;
//# sourceMappingURL=meeting.js.map