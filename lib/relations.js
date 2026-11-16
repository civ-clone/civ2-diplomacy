"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearVendettasAgainst = exports.madeToDeclareWar = exports.attitudeLevel = exports.attitudeBands = exports.effectiveReputation = exports.reputation = exports.attitude = exports.endTalks = exports.beginTalks = exports.REPUTATION_MINIMUM = exports.ATTITUDE_MAXIMUM = exports.ATTITUDE_MINIMUM = void 0;
const Attitude_1 = require("@civ-clone/core-diplomacy/Attitude");
const Reputation_1 = require("@civ-clone/core-diplomacy/Reputation");
const Vendetta_1 = require("@civ-clone/library-diplomacy/Declarations/Vendetta");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
/** The lowest attitude: the warmest. */
exports.ATTITUDE_MINIMUM = 0;
/** The highest attitude: the coldest. */
exports.ATTITUDE_MAXIMUM = 100;
/** The lowest reputation: the best. The original keeps it in a byte with no other limit. */
exports.REPUTATION_MINIMUM = 0;
// The talks under way: a computer player's attitude in talks (`diplo_eval.cur_attitude`) moves with every change to
//  its attitude toward the person it is talking to, as `civ_adjust_attitude` moves it (`civ.cpp:2966-2975`).
const inTalks = new Map();
/**
 * While `holder` talks with `toward`, its attitude in talks is `live.value`, and every `adjust` of its attitude toward
 *  `toward` adds to it, unclamped, as the original's does. `endTalks` stops it.
 */
const beginTalks = (holder, toward, live) => {
    inTalks.set(holder, Object.assign(live, { toward }));
};
exports.beginTalks = beginTalks;
/** `holder`'s talks are over. */
const endTalks = (holder) => {
    inTalks.delete(holder);
};
exports.endTalks = endTalks;
class TalksAttitude extends Attitude_1.default {
    adjust(holder, toward, delta, reason) {
        const live = inTalks.get(holder);
        if (live !== undefined && live.toward === toward) {
            live.value += delta;
        }
        return super.adjust(holder, toward, delta, reason);
    }
}
/**
 * The game's attitudes: `attitude(registries).get(holder, toward)` is how `holder` feels about `toward`, 0 (warmest)
 *  to 100 (coldest), or `undefined` before they've met. A new attitude is seeded when contact is made
 *  (`civ2-diplomacy:interaction/created/seed-attitude`), so change one with `adjust` only once the pair has met. An
 *  `adjust` during talks also moves the computer player's attitude in those talks.
 */
const attitude = ({ interactionRegistry, ruleRegistry, turn, }) => new TalksAttitude(interactionRegistry, ruleRegistry, turn, {
    minimum: exports.ATTITUDE_MINIMUM,
    maximum: exports.ATTITUDE_MAXIMUM,
});
exports.attitude = attitude;
/**
 * The game's reputations: `reputation(registries).get(player)`, 0 the best, and the credit an observer gives a player
 *  against it (`credit(observer, player)`).
 */
const reputation = ({ interactionRegistry, ruleRegistry, turn, }) => new Reputation_1.default(interactionRegistry, ruleRegistry, turn, {
    minimum: exports.REPUTATION_MINIMUM,
});
exports.reputation = reputation;
/**
 * `player`'s reputation as `observer` sees it: the reputation less the credit `observer` gives it. The original reads
 *  this everywhere in talks.
 */
const effectiveReputation = (registries, player, observer) => {
    const reputations = (0, exports.reputation)(registries);
    return reputations.get(player) - reputations.credit(observer, player);
};
exports.effectiveReputation = effectiveReputation;
/**
 * The nine attitude bands, warmest first: each is the highest attitude in it (OpenCiv2 `diplo_attitude_level`,
 *  `diplomacy.cpp:4180`). The first holds only attitudes below 0, which the range never reaches; the last holds 100.
 *  What each band is called is the renderer's.
 */
exports.attitudeBands = [
    -1,
    10,
    25,
    38,
    61,
    74,
    89,
    99,
    exports.ATTITUDE_MAXIMUM,
];
/** The band (0 to 8, `attitudeBands`) an attitude is in. */
const attitudeLevel = (value) => {
    const level = exports.attitudeBands.findIndex((maximum) => value <= maximum);
    return level === -1 ? exports.attitudeBands.length - 1 : level;
};
exports.attitudeLevel = attitudeLevel;
/**
 * `player` is made to declare war on `other`, by something it did under a treaty (an attack across it, an incident),
 *  rather than choosing to (OpenCiv2 `diplo_force_war`, `diplomacy.cpp:6861`). Any treaty between them ends, and its
 *  reputation suffers as if it had broken the treaty itself (`civ2-diplomacy:declared-war/reputation`).
 */
const madeToDeclareWar = (dependencies, player, other) => (0, declareWar_1.declareWar)(dependencies, player, other, true);
exports.madeToDeclareWar = madeToDeclareWar;
/**
 * Every vendetta another player holds against `player` ends (`Vendetta`s in force whose holder, the first of their
 *  players, isn't `player` and whose target is), as completing the Eiffel Tower and a change of government into Anarchy
 *  have it (OpenCiv2 `civ.cpp:6794-6812`, `:6863-6868`). Vendettas `player` holds against others stay.
 */
const clearVendettasAgainst = (player, interactionRegistry) => interactionRegistry
    .getByPlayer(player)
    .filter((interaction) => interaction instanceof Vendetta_1.default &&
    interaction.active() &&
    interaction.players()[0] !== player &&
    interaction.players()[1] === player)
    .forEach((vendetta) => vendetta.expire(player));
exports.clearVendettasAgainst = clearVendettasAgainst;
exports.default = exports.attitude;
//# sourceMappingURL=relations.js.map