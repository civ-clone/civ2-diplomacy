"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchRules = void 0;
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const spaceRace_1 = require("../spaceRace");
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Launch_1 = require("@civ-clone/core-spaceship/Rules/Launch");
const Peace_1 = require("@civ-clone/base-diplomacy-declaration-peace/Peace");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const effects_1 = require("../effects");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const relations_1 = require("../relations");
/** Warlord and below: a computer player overtaken summons the person to talks rather than meaning harm. */
const WARLORD = 1;
/** Emperor and above: a computer player overtaken breaks its treaty with the person at once. */
const EMPEROR = 4;
/**
 * A person's ship launches and will arrive before a computer player's already in flight (OpenCiv2
 *  `src/auto/spaceship.cpp` `spaceship_launch` ~1600, richardpenman/civ2@49f26ec). That computer player:
 *
 * - below Emperor: summons the person to talks (`INCIDENT`, both ways) on Chieftain or Warlord, or when the person's
 *   reputation is spotless; otherwise means to break its treaty (`HOSTILE_INTENT`);
 * - from Emperor, not allied: breaks its ceasefire or peace there and then, without a word (as a treaty broken, B37),
 *   and is the aggressor, for long;
 * - from Emperor, allied: means to break the alliance.
 *
 * The computer players' gang-up on a person who launched, above King, is the turn start's (`gangUpLeader`).
 */
const launchRules = (prefix, dependencies) => [
    new Launch_1.default(`${prefix}:spaceship/launch/overtaken`, new Effect_1.default((spaceship) => {
        const person = spaceship.player();
        if (!(0, standing_1.human)(dependencies, person)) {
            return;
        }
        const arrival = (0, spaceRace_1.arrivalOf)(dependencies, spaceship), difficulty = (0, standing_1.level)(dependencies);
        dependencies.playerRegistry
            .entries()
            .filter((other) => other !== person &&
            !(0, isBarbarian_1.default)(other) &&
            !(0, standing_1.human)(dependencies, other))
            .forEach((computer) => {
            const theirs = (0, spaceRace_1.launchedShip)(dependencies, computer);
            if (theirs === null || !(arrival < (0, spaceRace_1.arrivalOf)(dependencies, theirs))) {
                return;
            }
            if (difficulty < EMPEROR) {
                if (difficulty <= WARLORD ||
                    (0, relations_1.reputation)(dependencies).get(person) === 0) {
                    (0, flags_1.setBoth)(dependencies, person, computer, flags_1.INCIDENT);
                    return;
                }
                (0, flags_1.setFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
                return;
            }
            if ((0, standing_1.allied)(dependencies, person, computer)) {
                (0, flags_1.setFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
                return;
            }
            // `& ~0x26`, then `| 0x80840`.
            (0, flags_1.clearFlag)(dependencies, computer, person, flags_1.CEASEFIRE_LINGERS | flags_1.HOSTILE_INTENT);
            (0, flags_1.setFlag)(dependencies, computer, person, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG | flags_1.BROKEN);
            [Ceasefire_1.default, Peace_1.default].forEach((Type) => (0, declareWar_1.activeDeclarations)(dependencies, Type, computer, person).forEach((declaration) => (0, effects_1.expireSilently)(declaration, computer)));
        });
    })),
];
exports.launchRules = launchRules;
exports.default = exports.launchRules;
//# sourceMappingURL=launch.js.map