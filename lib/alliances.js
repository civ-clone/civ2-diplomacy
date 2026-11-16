"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alliesJoinWar = void 0;
const flags_1 = require("./flags");
const standing_1 = require("./standing");
const relations_1 = require("./relations");
const effects_1 = require("./effects");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
/**
 * `diplo_allies_join_war(victim, attacker)` (`diplomacy.cpp:1134-1194`): each ally of `victim` in contact with
 *  `attacker`, neither allied with it nor at war with it, goes to war with it (no declaration: no reputation), and
 *  wages that war (`TREATY_AGGRESSOR`, for long). With a computer player attacking, only a person's allies join;
 *  with a person attacking, they join 100 colder toward it, and the victim wages the war too. The original calls it
 *  when a person declares war (`diplo_declare_war`) and after the first attack of a war not declared
 *  (`unit_combat.cpp:1593`, when `diplo_force_war` marked a sneak attack): civ2-unit's forced war calls it then.
 */
const alliesJoinWar = (registries, victim, attacker) => {
    const dependencies = registries, personAttacks = (0, standing_1.human)(dependencies, attacker);
    if (!personAttacks && !(0, standing_1.human)(dependencies, victim)) {
        return [];
    }
    return registries.playerRegistry
        .entries()
        .filter((ally) => ally !== attacker &&
        ally !== victim &&
        (0, standing_1.allied)(dependencies, victim, ally) &&
        !(0, standing_1.allied)(dependencies, ally, attacker) &&
        !(0, standing_1.atWar)(dependencies, ally, attacker) &&
        (0, standing_1.inContact)(dependencies, ally, attacker))
        .map((ally) => {
        if (personAttacks) {
            (0, relations_1.attitude)(registries).adjust(ally, attacker, 100, 'ally-attacked');
        }
        (0, effects_1.declareWarQuietly)(dependencies, ally, attacker);
        (0, flags_1.setBoth)(registries, ally, attacker, flags_1.RECENT_CONTACT);
        (0, flags_1.setFlag)(registries, ally, attacker, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
        if (personAttacks) {
            (0, flags_1.setFlag)(registries, victim, attacker, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
            (0, lastContact_1.recordContact)(registries, attacker, ally, registries.turn.value());
        }
        return ally;
    });
};
exports.alliesJoinWar = alliesJoinWar;
exports.default = exports.alliesJoinWar;
//# sourceMappingURL=alliances.js.map