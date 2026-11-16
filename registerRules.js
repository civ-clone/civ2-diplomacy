"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.getRules = exports.dependenciesOf = exports.PREFIX = void 0;
const talks_1 = require("./lib/rules/talks");
const relations_1 = require("./lib/rules/relations");
const core_game_1 = require("@civ-clone/core-game");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const RuleIds_1 = require("./RuleIds");
const SenateIntervenes_1 = require("@civ-clone/base-government-senate/Rules/SenateIntervenes");
const detonated_1 = require("@civ-clone/base-diplomacy/lib/rules/detonated");
const interaction_1 = require("@civ-clone/base-diplomacy/lib/rules/interaction");
const resolved_1 = require("@civ-clone/base-diplomacy/lib/rules/resolved");
const senate_1 = require("./lib/senate");
const mayNegotiate_1 = require("@civ-clone/base-diplomacy/lib/rules/mayNegotiate");
const moved_1 = require("@civ-clone/base-diplomacy/lib/rules/moved");
const readers_1 = require("./lib/readers");
const senate_2 = require("./lib/senate");
const numbers_1 = require("./lib/numbers");
const talks_2 = require("./lib/talks");
const turnStart_1 = require("./lib/rules/turnStart");
exports.PREFIX = 'civ2-diplomacy';
const dependenciesOf = (game) => ({
    cityRegistry: game.cities,
    clientRegistry: game.clients,
    gameDifficultyRegistry: game.difficulty,
    interactionRegistry: game.interactions,
    landMassRegistry: game.landMasses,
    playerGovernmentRegistry: game.playerGovernments,
    playerRegistry: game.players,
    playerResearchRegistry: game.playerResearch,
    playerTreasuryRegistry: game.playerTreasuries,
    playerWorldRegistry: game.playerWorlds,
    requirementRegistry: game.requirements,
    ruleRegistry: game.rules,
    tileImprovementRegistry: game.tileImprovements,
    traitRegistry: game.traits,
    turn: game.turn,
    unitRegistry: game.units,
    wonderRegistry: game.wonders,
});
exports.dependenciesOf = dependenciesOf;
// The rules base-diplomacy's assemblers make that Civilization II keeps: registering each step of a negotiation, and
//  the payment of tribute and the exchange of advances when they're accepted.
const kept = (rules, ...names) => rules.filter((rule) => names.some((name) => rule.id() === `${exports.PREFIX}:${name}`));
/**
 * Civilization II's diplomacy (OpenCiv2 `src/auto/diplomacy.cpp`, Classic):
 *
 * - the talks between a computer player and a person, whoever opens them: the computer player's business in the
 *   original's order, the person's menu of proposals and the computer player's answers (`lib/talks`);
 * - attitude: seeded at contact, changed by what is said and done, and drifting each turn;
 * - reputation: lost by breaking treaties, recovered on schedule;
 * - the Senate, on a roll kept each turn;
 * - ceasefires, alliances and two computer players meeting, at the start of each turn;
 * - contact when units meet, when talks open and when an embassy is made.
 */
const getRules = (dependencies, game) => {
    const read = (0, readers_1.default)(dependencies), random = game.rng, meeting = (0, talks_2.default)({ dependencies, random }), republican = (player) => (0, senate_2.senateGovernment)(dependencies, player) !== 'none';
    return [
        ...(0, relations_1.expiredRules)(exports.PREFIX, game.engine),
        ...kept((0, interaction_1.default)(exports.PREFIX, dependencies), 'negotiation/interaction/register'),
        ...(0, talks_1.interactionRules)(exports.PREFIX, dependencies, meeting),
        ...(0, talks_1.stepRules)(meeting),
        ...(0, talks_1.proposalAvailableRules)(exports.PREFIX, dependencies, republican),
        ...(0, mayNegotiate_1.default)(exports.PREFIX, dependencies, read.isHuman, numbers_1.spacing),
        ...(0, talks_1.resolvedRules)(exports.PREFIX, dependencies, game.engine, random),
        ...kept((0, resolved_1.default)(exports.PREFIX, dependencies, random, 0), 'proposal/resolved/tribute', 'proposal/resolved/exchange-knowledge'),
        ...(0, talks_1.attitudeRules)(exports.PREFIX, dependencies, meeting),
        ...(0, talks_1.dialogueRules)(exports.PREFIX, dependencies, game.engine),
        ...(0, talks_1.terminatedRules)(exports.PREFIX, dependencies, meeting),
        ...(0, detonated_1.default)(exports.PREFIX, dependencies),
        ...(0, relations_1.detonatedRules)(exports.PREFIX, dependencies),
        ...(0, moved_1.default)(dependencies.interactionRegistry, dependencies.unitRegistry),
        ...(0, relations_1.createdRules)(exports.PREFIX, dependencies, random),
        ...(0, relations_1.declaredWarRules)(exports.PREFIX, dependencies, game.engine),
        ...(0, turnStart_1.turnStartRules)(exports.PREFIX, dependencies, {
            random,
            nuclear: read.nuclear,
            republican,
            engine: game.engine,
        }),
        new SenateIntervenes_1.default(RuleIds_1.SENATE_RULE, new Effect_1.default((player, other, context) => (0, senate_1.civ2SenateIntervenes)(dependencies, player, other, context))),
    ];
};
exports.getRules = getRules;
const register = (game) => game.rules.register(...(0, exports.getRules)((0, exports.dependenciesOf)(game), game));
exports.register = register;
// The plugin loader imports each package for this side effect, as civ1-diplomacy's.
(0, exports.register)(core_game_1.defaultGame);
exports.default = exports.register;
//# sourceMappingURL=registerRules.js.map