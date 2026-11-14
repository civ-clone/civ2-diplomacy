"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.getRules = exports.dependenciesOf = exports.PREFIX = void 0;
const numbers_1 = require("./lib/numbers");
const core_game_1 = require("@civ-clone/core-game");
const detonated_1 = require("@civ-clone/base-diplomacy/lib/rules/detonated");
const expired_1 = require("@civ-clone/base-diplomacy/lib/rules/expired");
const interaction_1 = require("@civ-clone/base-diplomacy/lib/rules/interaction");
const mayNegotiate_1 = require("@civ-clone/base-diplomacy/lib/rules/mayNegotiate");
const meeting_1 = require("./lib/meeting");
const moved_1 = require("@civ-clone/base-diplomacy/lib/rules/moved");
const readers_1 = require("./lib/readers");
const resolved_1 = require("@civ-clone/base-diplomacy/lib/rules/resolved");
const step_1 = require("@civ-clone/base-diplomacy/lib/rules/step");
const turnStart_1 = require("@civ-clone/base-diplomacy/lib/rules/turnStart");
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
    ruleRegistry: game.rules,
    traitRegistry: game.traits,
    turn: game.turn,
    unitRegistry: game.units,
});
exports.dependenciesOf = dependenciesOf;
/**
 * Civilization II's diplomacy rules on `base-diplomacy`: contact when units meet, how often players meet, the meeting
 *  and what each answer does (peace, tribute, cancelled treaties, exchanged knowledge, war), sham peace, treaties ending
 *  and the vendetta a nuclear strike leaves. With no Senate. No thefts are forgotten when a city is captured: Civ2's
 *  units here offer no Steal Technology.
 */
const getRules = (dependencies, game) => {
    const read = (0, readers_1.default)(dependencies);
    return [
        ...(0, expired_1.default)(exports.PREFIX, game.engine, dependencies.interactionRegistry),
        ...(0, interaction_1.default)(exports.PREFIX, dependencies),
        ...(0, step_1.default)(dependencies, {
            meeting: (negotiation) => (0, meeting_1.default)(dependencies, negotiation, game.rng),
            hasSenate: read.hasSenate,
        }, numbers_1.stepNumbers),
        ...(0, mayNegotiate_1.default)(exports.PREFIX, dependencies, read.isHuman, numbers_1.spacing),
        ...(0, turnStart_1.default)(exports.PREFIX, dependencies, game.rng, numbers_1.dropShamPeaceChance),
        ...(0, resolved_1.default)(exports.PREFIX, dependencies, game.rng, numbers_1.waiveTributeChance),
        ...(0, detonated_1.default)(exports.PREFIX, dependencies),
        ...(0, moved_1.default)(dependencies.interactionRegistry, dependencies.unitRegistry),
    ];
};
exports.getRules = getRules;
const register = (game) => game.rules.register(...(0, exports.getRules)((0, exports.dependenciesOf)(game), game));
exports.register = register;
// The plugin loader imports each package for this side effect, as civ1-diplomacy's.
(0, exports.register)(core_game_1.defaultGame);
exports.default = exports.register;
//# sourceMappingURL=registerRules.js.map