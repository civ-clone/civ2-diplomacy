"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warThreshold = exports.waiveTributeChance = exports.dropShamPeaceChance = exports.spacing = exports.stepNumbers = exports.stanceNumbers = void 0;
// The meeting's numbers. Civilization II's computer players negotiate by rules of their own (OpenCiv2
//  `src/auto/diplomacy.cpp`, richardpenman/civ2@49f26ec), which aren't read yet: until they are, these are
//  Civilization's (v474.05, as civ1-diplomacy has them), so two Civ2 players meet and make war or peace as Civ1's do.
exports.stanceNumbers = {
    fearWeight: (level) => (level === 0 ? 4 : 2),
    ultimatumTurn: 200,
    ultimatumCities: 4,
    topRanking: 7,
    nuclearTribute: 100,
    nuclearFear: 4,
    tributeDivisor: 32,
    tributeUnit: 50,
    tributeUnits: 20,
};
exports.stepNumbers = {
    openKnowledge: 6,
    provokingTribute: 50,
    goldUnit: 50,
    advanceGiftFear: 4,
    goldGift: (fear) => 2 * fear - 4,
};
exports.spacing = {
    withPerson: 16,
    withPersonAfterTreaty: 32,
    computers: 4,
};
/** How often a computer player keeping a peace it means to break drops it, each turn. */
exports.dropShamPeaceChance = 1 / 3;
/** How often a computer player waives its tribute when the other cancels a treaty with its enemy. */
exports.waiveTributeChance = 0.5;
/** Four times the ratio of attack to strength must reach this, plus reluctance, for two computer players to fight. */
exports.warThreshold = 4;
//# sourceMappingURL=numbers.js.map