"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependenciesOf = void 0;
/**
 * Everything civ2-diplomacy reads, from `game`'s registries: what its helpers (`lib/espionage`, `lib/relations`, ...)
 *  take when another package calls them. Importing this registers nothing.
 */
const dependenciesOf = (game) => ({
    cityBuildRegistry: game.cityBuilds,
    cityImprovementRegistry: game.cityImprovements,
    cityRegistry: game.cities,
    clientRegistry: game.clients,
    gameDifficultyRegistry: game.difficulty,
    interactionRegistry: game.interactions,
    landMassRegistry: game.landMasses,
    pendingEffectRegistry: game.pendingEffects,
    playerGovernmentRegistry: game.playerGovernments,
    playerRegistry: game.players,
    playerResearchRegistry: game.playerResearch,
    playerTreasuryRegistry: game.playerTreasuries,
    playerWorldRegistry: game.playerWorlds,
    requirementRegistry: game.requirements,
    ruleRegistry: game.rules,
    spaceshipRegistry: game.spaceships,
    tileImprovementRegistry: game.tileImprovements,
    traitRegistry: game.traits,
    turn: game.turn,
    unitRegistry: game.units,
    wonderRegistry: game.wonders,
    year: game.year,
});
exports.dependenciesOf = dependenciesOf;
exports.default = exports.dependenciesOf;
//# sourceMappingURL=dependenciesOf.js.map