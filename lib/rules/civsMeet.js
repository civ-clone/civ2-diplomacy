"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movedRules = void 0;
const turnStart_1 = require("./turnStart");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const High_1 = require("@civ-clone/core-rule/Priorities/High");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Moved_1 = require("@civ-clone/core-unit/Rules/Moved");
const standing_1 = require("../standing");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const barbarian = (player) => {
    try {
        return (0, isBarbarian_1.default)(player);
    }
    catch (e) {
        return false;
    }
};
/**
 * Two computer players meet when one's unit ends a move next to the other's (`diplo_civs_meet`, called as units meet):
 *  `civsMeet`, before base-diplomacy's contact rule makes contact. Once for each pair each turn, kept for the session
 *  (a game reloaded mid-turn may meet a pair once more): the original may decide again at each meeting, with no more to
 *  go on.
 */
const movedRules = (prefix, dependencies, rules) => {
    const met = new WeakMap(), computer = (player) => !(0, standing_1.human)(dependencies, player) && !barbarian(player);
    return [
        new Moved_1.default(`${prefix}:unit/moved/computers-meet`, 
        // Before base-diplomacy's contact rule, so first contact gets its decision here.
        new High_1.default(), 
        // Land units, on land (`ai.cpp`'s land moves call `diplo_civs_meet`).
        new Criterion_1.default((unit) => computer(unit.player()) && !unit.tile().isWater()), new Effect_1.default((unit) => {
            const player = unit.player(), turn = dependencies.turn.value(), others = new Set();
            unit
                .tile()
                .getNeighbours()
                .forEach((tile) => dependencies.unitRegistry
                .getByTile(tile)
                .forEach((neighbour) => {
                const other = neighbour.player();
                if (other !== player && computer(other) && !tile.isWater()) {
                    others.add(other);
                }
            }));
            others.forEach((other) => {
                var _a;
                const [first, second] = [player, other].sort((a, b) => dependencies.playerRegistry.entries().indexOf(a) -
                    dependencies.playerRegistry.entries().indexOf(b)), byFirst = (_a = met.get(first)) !== null && _a !== void 0 ? _a : new Map();
                met.set(first, byFirst);
                if (byFirst.get(second) === turn) {
                    return;
                }
                byFirst.set(second, turn);
                (0, turnStart_1.civsMeet)(dependencies, player, other, rules);
            });
        })),
    ];
};
exports.movedRules = movedRules;
exports.default = exports.movedRules;
//# sourceMappingURL=civsMeet.js.map