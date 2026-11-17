"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrivalOf = exports.launchedPerson = exports.raceActive = exports.launchedShip = exports.launched = exports.KING = void 0;
const ship_1 = require("@civ-clone/civ2-spaceship/lib/ship");
const ApolloProgram_1 = require("@civ-clone/base-wonder-apolloprogram/ApolloProgram");
const SpaceFlight_1 = require("@civ-clone/base-science-advance-spaceflight/SpaceFlight");
const wonderHistory_1 = require("@civ-clone/base-wonder/lib/wonderHistory");
const isHuman_1 = require("@civ-clone/civ2-difficulty/isHuman");
const level_1 = require("@civ-clone/civ2-difficulty/level");
const human = (dependencies, player) => (0, isHuman_1.default)(player, dependencies.clientRegistry);
// The space race as diplomacy reads it (OpenCiv2 `src/auto/spaceship.cpp`, `src/auto/civ.cpp`, richardpenman/civ2@49f26ec).
/** The level above which a person's launch sets the computer players on them: King. */
exports.KING = 3;
const shipsOf = (dependencies, player) => { var _a, _b; return (_b = (_a = dependencies.spaceshipRegistry) === null || _a === void 0 ? void 0 : _a.getBy('player', player)) !== null && _b !== void 0 ? _b : []; };
/**
 * Whether `player`'s ship has launched (`civ_spaceship_launched`): in flight or arrived, not lost.
 */
const launched = (dependencies, player) => shipsOf(dependencies, player).some((spaceship) => spaceship.launched() !== false && spaceship.successful() !== false);
exports.launched = launched;
/** `player`'s launched ship, or `null`. */
const launchedShip = (dependencies, player) => {
    var _a;
    return (_a = shipsOf(dependencies, player).find((spaceship) => spaceship.launched() !== false && spaceship.successful() !== false)) !== null && _a !== void 0 ? _a : null;
};
exports.launchedShip = launchedShip;
/**
 * Whether the space race is on (`spaceship_race_active`, `spaceship.cpp:2061`): the Apollo Program built, even if lost
 *  since, or a person knows Space Flight.
 */
const raceActive = (dependencies) => (dependencies.wonderRegistry !== undefined &&
    (0, wonderHistory_1.everBuilt)(ApolloProgram_1.default, dependencies.wonderRegistry, dependencies.cityImprovementRegistry)) ||
    dependencies.playerRegistry.entries().some((player) => {
        if (!human(dependencies, player)) {
            return false;
        }
        try {
            return dependencies.playerResearchRegistry
                .getByPlayer(player)
                .completed(SpaceFlight_1.default);
        }
        catch (e) {
            return false;
        }
    });
exports.raceActive = raceActive;
/**
 * Above King, the person whose ship has launched, the last of them in player order (`civ_update_power_ranks`,
 *  `civ.cpp:3119-3125`), or `null`.
 */
const launchedPerson = (dependencies) => {
    var _a;
    return (0, level_1.levelOf)(dependencies.gameDifficultyRegistry) <= exports.KING
        ? null
        : (_a = dependencies.playerRegistry
            .entries()
            .filter((player) => human(dependencies, player) && (0, exports.launched)(dependencies, player))
            .pop()) !== null && _a !== void 0 ? _a : null;
};
exports.launchedPerson = launchedPerson;
/** The year `spaceship` arrives: as recorded at its launch, or as it would if it launched this year. */
const arrivalOf = (dependencies, spaceship) => {
    var _a, _b;
    return (0, ship_1.launchRecord)(spaceship, dependencies.pendingEffectRegistry) !== null
        ? (0, ship_1.launchRecord)(spaceship, dependencies.pendingEffectRegistry).arrivalYear
        : (0, ship_1.arrivalYear)(spaceship, (_b = (_a = dependencies.year) === null || _a === void 0 ? void 0 : _a.value()) !== null && _b !== void 0 ? _b : 0, {
            clientRegistry: dependencies.clientRegistry,
            pendingEffectRegistry: dependencies.pendingEffectRegistry,
            playerResearchRegistry: dependencies.playerResearchRegistry,
            spaceshipRegistry: dependencies.spaceshipRegistry,
        });
};
exports.arrivalOf = arrivalOf;
//# sourceMappingURL=spaceRace.js.map