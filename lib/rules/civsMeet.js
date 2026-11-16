"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movedRules = void 0;
const turnStart_1 = require("./turnStart");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const High_1 = require("@civ-clone/core-rule/Priorities/High");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Moved_1 = require("@civ-clone/core-unit/Rules/Moved");
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const contact_1 = require("@civ-clone/base-diplomacy/lib/contact");
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
 * Units meeting (`Moved`):
 *
 * - `<prefix>:unit/moved/computers-meet`: two computer players meet when one's land unit ends a move on land next to
 *   the other's (`diplo_civs_meet`, called as land units meet): `civsMeet`, which makes their contact. Once for each
 *   pair each turn (`COMPUTERS_MET`, a turn bit, so a reload keeps it): the original may decide again at each meeting,
 *   with no more to go on.
 * - `<prefix>:unit/moved/contact`: a person's unit meeting anyone makes contact, as base-diplomacy's rule does
 *   (`contactOnMove`).
 * - `<prefix>:unit/moved/contact-person`: a computer player's unit meeting a person's makes contact, looked up in the
 *   registry each time, so contact lost is made again.
 *
 * Computer players make contact only through `civsMeet`.
 */
const movedRules = (prefix, dependencies, rules) => {
    const computer = (player) => !(0, standing_1.human)(dependencies, player) && !barbarian(player), person = (player) => (0, standing_1.human)(dependencies, player) && !barbarian(player), neighbours = (unit) => unit
        .tile()
        .getNeighbours()
        .flatMap((tile) => dependencies.unitRegistry.getByTile(tile)), { canMakeContact, besideAnother, makeContact: meetAll, } = (0, contact_1.default)(dependencies.interactionRegistry, dependencies.unitRegistry);
    return [
        new Moved_1.default(`${prefix}:unit/moved/computers-meet`, 
        // Before the contact rules, so first contact gets its decision here.
        new High_1.default(), 
        // Land units, on land (`ai.cpp`'s land moves call `diplo_civs_meet`).
        new Criterion_1.default((unit) => computer(unit.player()) && !unit.tile().isWater()), new Effect_1.default((unit) => {
            const player = unit.player(), others = new Set();
            neighbours(unit).forEach((neighbour) => {
                const other = neighbour.player();
                if (other !== player &&
                    computer(other) &&
                    !neighbour.tile().isWater()) {
                    others.add(other);
                }
            });
            others.forEach((other) => {
                if ((0, flags_1.hasFlag)(dependencies, player, other, flags_1.COMPUTERS_MET) ||
                    (0, flags_1.hasFlag)(dependencies, other, player, flags_1.COMPUTERS_MET)) {
                    return;
                }
                (0, flags_1.setBoth)(dependencies, player, other, flags_1.COMPUTERS_MET);
                (0, turnStart_1.civsMeet)(dependencies, player, other, rules);
            });
        })),
        new Moved_1.default(`${prefix}:unit/moved/contact`, new Criterion_1.default((unit) => person(unit.player())), new Criterion_1.default(canMakeContact), new Criterion_1.default(besideAnother), new Effect_1.default(meetAll)),
        new Moved_1.default(`${prefix}:unit/moved/contact-person`, new Criterion_1.default((unit) => computer(unit.player())), new Effect_1.default((unit) => neighbours(unit)
            .filter((neighbour) => person(neighbour.player()))
            .forEach((neighbour) => {
            if ((0, standing_1.inContact)(dependencies, unit.player(), neighbour.player())) {
                return;
            }
            (0, makeContact_1.default)(dependencies.interactionRegistry, unit.player(), neighbour.player(), dependencies.ruleRegistry, dependencies.turn);
        }))),
    ];
};
exports.movedRules = movedRules;
exports.default = exports.movedRules;
//# sourceMappingURL=civsMeet.js.map