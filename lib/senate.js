"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.senateScandal = exports.senateBlocks = exports.civ2SenateIntervenes = exports.rollSenate = exports.senateRecord = exports.senateGovernment = void 0;
const flags_1 = require("./flags");
const formulas_1 = require("./formulas");
const Democracy_1 = require("@civ-clone/base-government-democracy/Democracy");
const Republic_1 = require("@civ-clone/base-government-republic/Republic");
const SenateRecord_1 = require("../Records/SenateRecord");
const SenateScandal_1 = require("../Rules/SenateScandal");
const wonders_1 = require("./wonders");
const relations_1 = require("./relations");
const senate_1 = require("@civ-clone/base-government-senate/lib/senate");
// Civilization II's Senate (OpenCiv2 `diplo_senate_intervenes`, `diplomacy.cpp:5410`): a Republic's or a Democracy's
//  Senate stands aside when the turn's roll is under 15 × the other's reputation (25 more if the other sneak-attacked,
//  50 if we own the United Nations, at most 75); otherwise a Democracy's always steps in and a Republic's only while it
//  is in session, which changes one turn in three. The roll and the session are rolled at the start of each of the
//  player's turns and saved (`SenateRecord`), so the answer is the same however often it's asked.
/** The player's government, as far as a Senate goes. */
const senateGovernment = (dependencies, player) => {
    try {
        const government = dependencies.playerGovernmentRegistry.getByPlayer(player);
        if (government.is(Democracy_1.default)) {
            return 'democracy';
        }
        if (government.is(Republic_1.default)) {
            return 'republic';
        }
    }
    catch (e) {
        // No government yet: no Senate.
    }
    return 'none';
};
exports.senateGovernment = senateGovernment;
const senateRecord = (dependencies, player) => dependencies.interactionRegistry
    .getByPlayers(player)
    .find((interaction) => interaction instanceof SenateRecord_1.default && interaction.player() === player);
exports.senateRecord = senateRecord;
/**
 * The start of `player`'s turn: a new roll, 0 to 99, and one turn in three the Senate goes in or out of session
 *  (`civ.cpp:7069-7073`), whatever the government, so the session is the same walk from the start of the game as the
 *  original's.
 */
const rollSenate = (dependencies, player, random) => {
    const roll = Math.floor(random() * 100), toggle = Math.floor(random() * 3) === 0, record = (0, exports.senateRecord)(dependencies, player);
    if (record !== undefined) {
        record.set(roll, toggle ? !record.inSession() : record.inSession());
        return;
    }
    dependencies.interactionRegistry.register(new SenateRecord_1.default(player, roll, toggle, dependencies.ruleRegistry, dependencies.turn));
};
exports.rollSenate = rollSenate;
/**
 * Whether `player`'s Senate steps in about `other` (the `SenateIntervenes` rule's answer). `context.roll` overrides the
 *  saved roll, `context.reputation` the other's reputation, `context.sneakAttack` the saved sneak attack and
 *  `context.bonus` the wonder bonus, for a caller that knows better.
 */
const civ2SenateIntervenes = (dependencies, player, other, context = {}) => {
    var _a, _b, _c, _d, _e;
    const government = (0, exports.senateGovernment)(dependencies, player);
    if (government === 'none') {
        return false;
    }
    const record = (0, exports.senateRecord)(dependencies, player), roll = (_b = (_a = context.roll) !== null && _a !== void 0 ? _a : record === null || record === void 0 ? void 0 : record.value()) !== null && _b !== void 0 ? _b : 0, otherReputation = (_c = context.reputation) !== null && _c !== void 0 ? _c : (other === null ? 0 : (0, relations_1.reputation)(dependencies).get(other)), sneakAttack = (_d = context.sneakAttack) !== null && _d !== void 0 ? _d : (other !== null && (0, flags_1.hasFlag)(dependencies, other, player, flags_1.SNEAK_ATTACK)), threshold = context.bonus !== undefined
        ? Math.min(75, Math.max(0, context.bonus + otherReputation * 15))
        : (0, formulas_1.senateThreshold)(sneakAttack, (0, wonders_1.ownsWonder)(dependencies, player, 'united-nations'), otherReputation);
    return (0, formulas_1.senateSteps)(government, roll, threshold, (_e = record === null || record === void 0 ? void 0 : record.inSession()) !== null && _e !== void 0 ? _e : false);
};
exports.civ2SenateIntervenes = civ2SenateIntervenes;
/** Whether `player`'s Senate steps in, through the game's `SenateIntervenes` rules. */
const senateBlocks = (dependencies, player, other, reason) => (0, senate_1.default)(player, other, { reason }, dependencies.ruleRegistry);
exports.senateBlocks = senateBlocks;
/**
 * A scandal (`diplomacy.cpp:6400`): a Democracy always falls, a Republic one time in two. Tells the `SenateScandal`
 *  rules, and answers whether there was one.
 */
const senateScandal = (dependencies, player, other, random) => {
    const government = (0, exports.senateGovernment)(dependencies, player);
    if (government === 'democracy' ||
        (government === 'republic' && random() < 0.5)) {
        dependencies.ruleRegistry.process(SenateScandal_1.default, player, other);
        return true;
    }
    return false;
};
exports.senateScandal = senateScandal;
//# sourceMappingURL=senate.js.map