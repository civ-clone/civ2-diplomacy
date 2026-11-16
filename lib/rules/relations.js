"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiredRules = exports.detonatedRules = exports.declaredWarRules = exports.createdRules = void 0;
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const effects_1 = require("../effects");
const relations_1 = require("../relations");
const formulas_1 = require("../formulas");
const Contact_1 = require("@civ-clone/base-diplomacy-interaction-contact/Contact");
const Created_1 = require("@civ-clone/core-diplomacy/Rules/Interaction/Created");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const DeclaredWar_1 = require("@civ-clone/base-diplomacy/Rules/DeclaredWar");
const Detonated_1 = require("@civ-clone/base-unit-action-nuclear-attack/Rules/Detonated");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Embassy_1 = require("@civ-clone/base-unit-action-establish-embassy/Embassy");
const Expired_1 = require("@civ-clone/core-diplomacy/Rules/Declaration/Expired");
const Never_1 = require("@civ-clone/core-diplomacy/Expiries/Never");
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const Vendetta_1 = require("@civ-clone/library-diplomacy/Declarations/Vendetta");
const holds_1 = require("@civ-clone/library-diplomacy/lib/holds");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const wonders_1 = require("../wonders");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const barbarian = (player) => {
    try {
        return (0, isBarbarian_1.default)(player);
    }
    catch (e) {
        return false;
    }
};
/**
 * When two players make contact (`Created` for a `Contact`), each starts with an attitude to the other, as the original
 *  gives each civilization when it is made (`civ.cpp:4642-4660`): between computer players 10 to 89; between a computer
 *  player and a person 10 to 75, colder the harder the game; 100 toward the barbarians. And an embassy (`Embassy`)
 *  makes contact.
 */
const createdRules = (prefix, dependencies, random) => [
    new Created_1.default(`${prefix}:interaction/created/seed-attitude`, new Criterion_1.default((interaction) => interaction instanceof Contact_1.default), new Effect_1.default((interaction) => {
        const [player, other] = interaction.players();
        if (player === undefined || other === undefined || player === other) {
            return;
        }
        const attitudes = (0, relations_1.attitude)(dependencies);
        if (attitudes.get(player, other) !== undefined ||
            attitudes.get(other, player) !== undefined) {
            return;
        }
        const value = barbarian(player) || barbarian(other)
            ? 100
            : (0, formulas_1.startingAttitude)((0, standing_1.human)(dependencies, player) || (0, standing_1.human)(dependencies, other), (0, standing_1.level)(dependencies), Math.floor(random() * 80));
        attitudes.set(player, other, value, 'contact');
        attitudes.set(other, player, value, 'contact');
        (0, lastContact_1.recordContact)(dependencies, player, other, dependencies.turn.value());
    })),
    new Created_1.default(`${prefix}:interaction/created/embassy-contact`, new Criterion_1.default((interaction) => interaction instanceof Embassy_1.default), new Effect_1.default((interaction) => {
        const embassy = interaction;
        (0, makeContact_1.default)(dependencies.interactionRegistry, embassy.holder(), embassy.host(), dependencies.ruleRegistry, dependencies.turn);
    })),
];
exports.createdRules = createdRules;
/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196`):
 *
 * - `<prefix>:declared-war/reputation`: breaking a ceasefire or a peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower), 1 more for the top power acting on its own, all of it twice when the peace still carries a ceasefire;
 *   breaking an alliance 1 (spared likewise) and 1 more on its own. A war declared at another's request isn't its own;
 *   one it was made to declare is. A computer player's threats cost nothing (`declareWarQuietly`).
 * - `<prefix>:declared-war/attitude`: made to declare war (`diplo_force_war`), each side's attitude to the other is
 *   100; at another's request, the one who asked is 5 warmer to the declarer, 15 if it broke a treaty, 25 an alliance.
 * - `<prefix>:declared-war/standing`: war this turn; a person who declares war is the aggressor and its victim holds a
 *   vendetta; any lingering ceasefire is gone.
 * - `<prefix>:declared-war/allies-join`: a person's victim's allies, computer players in contact with the person and
 *   neither allied with it nor at war with it, join the war, 100 colder (`diplo_allies_join_war`).
 */
const declaredWarRules = (prefix, dependencies, engine) => [
    new DeclaredWar_1.default(`${prefix}:declared-war/reputation`, new Effect_1.default((by, against, forced, broken) => {
        if ((0, effects_1.declaringQuietly)(by)) {
            return;
        }
        const kind = broken === treatyLevel_1.TreatyLevel.Alliance
            ? 'alliance'
            : broken === treatyLevel_1.TreatyLevel.Peace || broken === treatyLevel_1.TreatyLevel.Ceasefire
                ? 'treaty'
                : 'none';
        // Made to declare war, it costs only when a person is one of them (`diplo_force_war`).
        if (forced &&
            !(0, standing_1.human)(dependencies, by) &&
            !(0, standing_1.human)(dependencies, against)) {
            return;
        }
        const cost = (0, formulas_1.reputationCost)(kind, kind === 'treaty' &&
            (0, flags_1.hasFlag)(dependencies, by, against, flags_1.CEASEFIRE_LINGERS), (0, effects_1.instigatorOf)(by) === null, (0, standing_1.level)(dependencies) === standing_1.CHIEFTAIN, (0, wonders_1.ownsWonder)(dependencies, by, 'eiffel-tower'), (0, standing_1.rank)(dependencies, by) === 7 && (0, standing_1.cities)(dependencies, by) > 4);
        if (cost > 0) {
            (0, relations_1.reputation)(dependencies).adjust(by, cost, forced ? 'forced-war' : 'war');
        }
    })),
    new DeclaredWar_1.default(`${prefix}:declared-war/attitude`, new Effect_1.default((by, against, forced, broken) => {
        const attitudes = (0, relations_1.attitude)(dependencies);
        if (forced && (0, standing_1.inContact)(dependencies, by, against)) {
            attitudes.set(by, against, 100, 'forced-war');
            attitudes.set(against, by, 100, 'forced-war');
        }
        const instigator = (0, effects_1.instigatorOf)(by);
        if (instigator !== null &&
            attitudes.get(instigator, by) !== undefined) {
            attitudes.adjust(instigator, by, broken === treatyLevel_1.TreatyLevel.Alliance
                ? -25
                : broken === treatyLevel_1.TreatyLevel.Peace || broken === treatyLevel_1.TreatyLevel.Ceasefire
                    ? -15
                    : -5, 'war-for');
        }
    })),
    new DeclaredWar_1.default(`${prefix}:declared-war/standing`, new Effect_1.default((by, against) => {
        (0, flags_1.setBoth)(dependencies, by, against, flags_1.WAR_THIS_TURN);
        (0, flags_1.clearBoth)(dependencies, by, against, flags_1.CEASEFIRE_LINGERS);
        if (!(0, standing_1.human)(dependencies, by)) {
            return;
        }
        (0, flags_1.setFlag)(dependencies, by, against, flags_1.AGGRESSOR);
        (0, lastContact_1.recordContact)(dependencies, by, against, dependencies.turn.value());
        if (!(0, holds_1.hasVendetta)(against, by, dependencies.interactionRegistry)) {
            dependencies.interactionRegistry.register(new Vendetta_1.default(against, by, new Never_1.default(), dependencies.ruleRegistry));
        }
        engine.emit('civ2-diplomacy:war-declared', by, against);
    })),
    new DeclaredWar_1.default(`${prefix}:declared-war/allies-join`, new Criterion_1.default((by) => (0, standing_1.human)(dependencies, by)), new Effect_1.default((by, against) => dependencies.playerRegistry
        .entries()
        .filter((ally) => ally !== by &&
        ally !== against &&
        !(0, standing_1.human)(dependencies, ally) &&
        (0, standing_1.allied)(dependencies, ally, against) &&
        !(0, standing_1.allied)(dependencies, ally, by) &&
        !(0, standing_1.atWar)(dependencies, ally, by) &&
        (0, standing_1.inContact)(dependencies, ally, by))
        .forEach((ally) => {
        (0, relations_1.attitude)(dependencies).adjust(ally, by, 100, 'ally-attacked');
        (0, effects_1.declareWarQuietly)(dependencies, ally, by);
        (0, lastContact_1.recordContact)(dependencies, ally, by, dependencies.turn.value());
        engine.emit('civ2-diplomacy:ally-joins-war', ally, by, against);
    }))),
];
exports.declaredWarRules = declaredWarRules;
/** A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker (`unit_combat.cpp:306-312`). */
const detonatedRules = (prefix, dependencies) => [
    new Detonated_1.default(`${prefix}:unit/detonated/attitude`, new Effect_1.default((unit, tile) => {
        const attacker = unit.player(), area = [tile, ...tile.getNeighbours()], victims = new Set([
            ...area.flatMap((areaTile) => dependencies.unitRegistry
                .getByTile(areaTile)
                .map((victim) => victim.player())),
            ...area
                .map((areaTile) => dependencies.cityRegistry.getByTile(areaTile))
                .filter((city) => city !== null)
                .map((city) => city.player()),
        ]);
        victims.delete(attacker);
        victims.forEach((victim) => {
            (0, relations_1.attitude)(dependencies).adjust(victim, attacker, 100, 'nuclear');
            (0, flags_1.setFlag)(dependencies, victim, attacker, flags_1.NUKED);
        });
    })),
];
exports.detonatedRules = detonatedRules;
/**
 * A treaty ending is announced (`diplomacy:declaration-expired`, `player:declaration-expired`), as base-diplomacy's
 *  rule does, unless a computer player ended it without a word (`expireSilently`, the original's B37).
 */
const expiredRules = (prefix, engine) => [
    new Expired_1.default(`${prefix}:declaration/expired/announce`, new Criterion_1.default((declaration) => !(0, effects_1.endedSilently)(declaration)), new Effect_1.default((declaration, by = null) => {
        engine.emit('diplomacy:declaration-expired', declaration, by);
        declaration
            .players()
            .forEach((player) => engine.emit('player:declaration-expired', player, declaration, by));
    })),
];
exports.expiredRules = expiredRules;
//# sourceMappingURL=relations.js.map