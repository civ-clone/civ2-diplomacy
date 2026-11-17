"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiredRules = exports.detonatedRules = exports.declaredWarRules = exports.createdRules = void 0;
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const effects_1 = require("../effects");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
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
const alliances_1 = require("../alliances");
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
 * When two players make contact (`Created` for a `Contact`), each starts with the attitude to the other the original
 *  gives when it makes each civilization (`civ.cpp:4642-4660`): the one made later rolls for the pair, 10 + 0 to 79,
 *  and when the one made earlier is a person, 5 × the level more, 10 to 75; 100 toward the barbarians. Here the order
 *  they joined the game stands for the order they were made. First contact is a change this turn
 *  (`TREATY_CHANGED_THIS_TURN`) and a recent contact. And an embassy (`Embassy`) makes contact.
 */
const createdRules = (prefix, dependencies, random) => [
    new Created_1.default(`${prefix}:interaction/created/seed-attitude`, new Criterion_1.default((interaction) => interaction instanceof Contact_1.default), new Effect_1.default((interaction) => {
        const [player, other] = interaction.players();
        if (player === undefined || other === undefined || player === other) {
            return;
        }
        (0, flags_1.setBoth)(dependencies, player, other, flags_1.CHANGED_THIS_TURN | flags_1.RECENT_CONTACT);
        const attitudes = (0, relations_1.attitude)(dependencies);
        if (attitudes.get(player, other) !== undefined ||
            attitudes.get(other, player) !== undefined) {
            return;
        }
        const players = dependencies.playerRegistry.entries(), [earlier] = [player, other].sort((a, b) => players.indexOf(a) - players.indexOf(b)), value = barbarian(player) || barbarian(other)
            ? 100
            : (0, formulas_1.startingAttitude)((0, standing_1.human)(dependencies, earlier), (0, standing_1.level)(dependencies), Math.floor(random() * 80));
        attitudes.set(player, other, value, 'contact');
        attitudes.set(other, player, value, 'contact');
    })),
    new Created_1.default(`${prefix}:interaction/created/embassy-contact`, new Criterion_1.default((interaction) => interaction instanceof Embassy_1.default), new Effect_1.default((interaction) => {
        // `Created` runs inside `Interaction`'s constructor, before `Embassy`'s own sets its holder and host: the players
        //  are already there.
        const [holder, host] = interaction.players();
        if (holder === undefined || host === undefined || holder === host) {
            return;
        }
        (0, makeContact_1.default)(dependencies.interactionRegistry, holder, host, dependencies.ruleRegistry, dependencies.turn);
    })),
];
exports.createdRules = createdRules;
/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196-1270`). `own` is the original's
 *  `civ2 < 0`: nobody asked it to (`declareWarFor`). A computer player's threats and wars between computer players set
 *  the war directly in the original, so they hear none of this (`declareWarQuietly`).
 *
 * - `<prefix>:declared-war/ally`: war on an ally is no war: the alliance is cancelled instead (both stay at peace and
 *   go home), and the rest below still applies to it.
 * - `<prefix>:declared-war/reputation`: a broken ceasefire or peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower) and 1 more for the top power on its own initiative, all of it twice when the peace still carries a
 *   ceasefire; a broken alliance 1 (spared likewise) and 1 more on its own. The one who asked gives the declarer 1 credit;
 *   a person declaring of its own accord loses 1 of its credit with its victim each time the cost is counted. Made to
 *   declare it, it costs only with a person on either side.
 * - `<prefix>:declared-war/attitude`: made to declare war, each side's attitude to the other is 100; at another's
 *   request, the one who asked is 5 warmer to the declarer, 15 if it broke a ceasefire or peace, 25 an alliance.
 * - `<prefix>:declared-war/standing`: any incident offer between them is answered (`INCIDENT_OFFERED`); war this turn; a person who declares war is the aggressor for long, its victim
 *   holds a vendetta, they were in contact this turn, and its victim's allies join in.
 */
const declaredWarRules = (prefix, dependencies, engine) => [
    new DeclaredWar_1.default(`${prefix}:declared-war/ally`, new Criterion_1.default((by, against, forced, broken) => broken === treatyLevel_1.TreatyLevel.Alliance && !(0, effects_1.declaringQuietly)(by)), new Effect_1.default((by, against) => {
        (0, declareWar_1.activeDeclarations)(dependencies, War_1.default, by, against).forEach((war) => (0, effects_1.expireSilently)(war, by));
        (0, declareWar_1.makePeace)(dependencies, by, against);
        (0, flags_1.clearBoth)(dependencies, by, against, flags_1.WAR_THIS_TURN);
        (0, effects_1.expelUnits)(dependencies, by, against);
        (0, effects_1.expelUnits)(dependencies, against, by);
        engine.emit('civ2-diplomacy:alliance-cancelled', by, against);
    })),
    new DeclaredWar_1.default(`${prefix}:declared-war/reputation`, new Effect_1.default((by, against, forced, broken) => {
        if ((0, effects_1.declaringQuietly)(by)) {
            return;
        }
        const reputations = (0, relations_1.reputation)(dependencies), instigator = (0, effects_1.instigatorOf)(by), own = instigator === null, person = (0, standing_1.human)(dependencies, by);
        if (instigator !== null) {
            reputations.setCredit(instigator, by, reputations.credit(instigator, by) + 1);
        }
        const kind = broken === treatyLevel_1.TreatyLevel.Alliance
            ? 'alliance'
            : broken === treatyLevel_1.TreatyLevel.Peace || broken === treatyLevel_1.TreatyLevel.Ceasefire
                ? 'treaty'
                : 'none';
        // Made to declare war, it costs only when a person is one of them (`diplo_force_war`).
        if (forced && !person && !(0, standing_1.human)(dependencies, against)) {
            return;
        }
        const lingering = kind === 'treaty' &&
            (0, flags_1.hasFlag)(dependencies, by, against, flags_1.CEASEFIRE_LINGERS), cost = (0, formulas_1.reputationCost)(kind, lingering, own, (0, standing_1.level)(dependencies) === standing_1.CHIEFTAIN, (0, wonders_1.ownsWonder)(dependencies, by, 'eiffel-tower'), (0, standing_1.rank)(dependencies, by) === 7 && (0, standing_1.cities)(dependencies, by) > 4);
        if (cost > 0) {
            reputations.adjust(by, cost, forced ? 'forced-war' : 'war');
        }
        if (own && person && kind !== 'none') {
            const times = kind === 'treaty' && lingering ? 2 : 1;
            reputations.setCredit(by, against, reputations.credit(by, against) - times);
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
    new DeclaredWar_1.default(`${prefix}:declared-war/standing`, new Effect_1.default((by, against, forced, broken) => {
        const quiet = (0, effects_1.declaringQuietly)(by);
        // A war answers any incident offer between them, so it can't later start another one.
        (0, flags_1.clearBoth)(dependencies, by, against, flags_1.CEASEFIRE_LINGERS | flags_1.INCIDENT_OFFERED);
        if (broken !== treatyLevel_1.TreatyLevel.Alliance || quiet) {
            (0, flags_1.setBoth)(dependencies, by, against, flags_1.WAR_THIS_TURN);
        }
        if (quiet || !(0, standing_1.human)(dependencies, by)) {
            return;
        }
        if (!(0, holds_1.hasVendetta)(against, by, dependencies.interactionRegistry)) {
            dependencies.interactionRegistry.register(new Vendetta_1.default(against, by, new Never_1.default(), dependencies.ruleRegistry));
        }
        if (broken === treatyLevel_1.TreatyLevel.Alliance) {
            return;
        }
        (0, flags_1.setFlag)(dependencies, by, against, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
        (0, lastContact_1.recordContact)(dependencies, by, against, dependencies.turn.value());
        engine.emit('civ2-diplomacy:war-declared', by, against);
        (0, alliances_1.default)(dependencies, against, by).forEach((ally) => engine.emit('civ2-diplomacy:ally-joins-war', ally, by, against));
    })),
];
exports.declaredWarRules = declaredWarRules;
/**
 * A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker and threatened by it, and the attacker has
 *  nuked it (`unit_combat.cpp:306-312`). base-diplomacy's rule gives the vendetta.
 */
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
            (0, flags_1.setFlag)(dependencies, victim, attacker, flags_1.NUCLEAR_THREAT);
            (0, flags_1.setFlag)(dependencies, attacker, victim, flags_1.NUKED);
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