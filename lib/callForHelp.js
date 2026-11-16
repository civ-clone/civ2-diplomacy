"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.answered = exports.callAlly = exports.callForHelp = void 0;
const CallForHelpRecord_1 = require("../Records/CallForHelpRecord");
const recordOf = (dependencies, caller, ally) => dependencies.interactionRegistry
    .getByPlayers(caller, ally)
    .find((interaction) => interaction instanceof CallForHelpRecord_1.default &&
    interaction.caller() === caller &&
    interaction.ally() === ally);
/** The war `caller` will ask its ally `ally` to join at its next audience, or `null`. */
const callForHelp = (dependencies, caller, ally) => { var _a, _b; return (_b = (_a = recordOf(dependencies, caller, ally)) === null || _a === void 0 ? void 0 : _a.against()) !== null && _b !== void 0 ? _b : null; };
exports.callForHelp = callForHelp;
/** `caller` will ask `ally` to join its war on `against` (one call at a time; a new one replaces it). */
const callAlly = (dependencies, caller, ally, against) => {
    (0, exports.answered)(dependencies, caller, ally);
    dependencies.interactionRegistry.register(new CallForHelpRecord_1.default(caller, ally, against, dependencies.ruleRegistry, dependencies.turn));
};
exports.callAlly = callAlly;
/** The call has been answered. */
const answered = (dependencies, caller, ally) => {
    const record = recordOf(dependencies, caller, ally);
    if (record !== undefined) {
        dependencies.interactionRegistry.unregister(record);
    }
};
exports.answered = answered;
exports.default = exports.callForHelp;
//# sourceMappingURL=callForHelp.js.map