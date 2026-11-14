"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readers = exports.mood = exports.nukes = void 0;
const standing_1 = require("@civ-clone/base-diplomacy/lib/standing");
const Aggressive_1 = require("@civ-clone/base-leader-trait-aggression/Aggression/Aggressive");
const Detonates_1 = require("@civ-clone/base-unit-trait-detonates/Detonates");
const Friendly_1 = require("@civ-clone/base-leader-trait-aggression/Aggression/Friendly");
const isHuman_1 = require("@civ-clone/civ2-difficulty/isHuman");
const level_1 = require("@civ-clone/civ2-difficulty/level");
/** Units that `Detonates`: Civilization II's nuclear missiles. */
const nukes = (dependencies, player) => (0, standing_1.unitCount)(dependencies, player, (unit) => unit.hasTrait(Detonates_1.default));
exports.nukes = nukes;
/**
 * The leader's attack attitude from @LEADERS, as civ2-civilization gives it: 1 Aggressive, −1 Friendly (rational), 0
 *  otherwise.
 */
const mood = (dependencies, player) => (0, standing_1.traitScore)(dependencies, player, (trait) => trait instanceof Aggressive_1.default ? 1 : trait instanceof Friendly_1.default ? -1 : 0);
exports.mood = mood;
/**
 * What `base-diplomacy` reads about Civilization II's content: the human, nuclear units, the leader's attack attitude
 *  and the difficulty level. No government answers to a senate: Civilization II's Senate isn't here (M2a).
 */
const readers = (dependencies) => ({
    isHuman: (player) => (0, isHuman_1.default)(player, dependencies.clientRegistry),
    nuclear: (player) => (0, exports.nukes)(dependencies, player),
    mood: (player) => (0, exports.mood)(dependencies, player),
    hasSenate: () => false,
    level: () => (0, level_1.levelOf)(dependencies.gameDifficultyRegistry),
});
exports.readers = readers;
exports.default = exports.readers;
//# sourceMappingURL=readers.js.map