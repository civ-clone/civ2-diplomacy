"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPendingNuclearDevice = exports.pendingNuclearDevice = exports.nuclearDeviceDiscovered = exports.incited = exports.forceWar = exports.incidentOfferAccepted = exports.incidentOfferDeclined = exports.incidentOffered = exports.espionageIncident = exports.holdVendetta = void 0;
const flags_1 = require("./flags");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const standing_1 = require("./standing");
const relations_1 = require("./relations");
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const Fundamentalism_1 = require("@civ-clone/base-government-fundamentalism/Fundamentalism");
const Never_1 = require("@civ-clone/core-diplomacy/Expiries/Never");
const NuclearDeviceRecord_1 = require("../Records/NuclearDeviceRecord");
const Peace_1 = require("@civ-clone/base-diplomacy-declaration-peace/Peace");
const Vendetta_1 = require("@civ-clone/library-diplomacy/Declarations/Vendetta");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
const effects_1 = require("./effects");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const senate_1 = require("./senate");
const fundamentalist = (dependencies, player) => {
    try {
        return dependencies.playerGovernmentRegistry
            .getByPlayer(player)
            .is(Fundamentalism_1.default);
    }
    catch (e) {
        return false;
    }
};
/** `holder` holds a vendetta against `against` (`TREATY_VENDETTA`), unless it already does. */
const holdVendetta = (dependencies, holder, against) => {
    if ((0, standing_1.vendetta)(dependencies, holder, against)) {
        return;
    }
    dependencies.interactionRegistry.register(new Vendetta_1.default(holder, against, new Never_1.default(), dependencies.ruleRegistry));
};
exports.holdVendetta = holdVendetta;
/**
 * `diplo_espionage_incident(perpetrator, victim)` (`diplomacy.cpp:5209-5320`), after a mission whose agent was removed
 *  (a Diplomat, or a Spy that failed to escape), or after a city is incited at the plain price:
 *
 * - at war, nothing;
 * - with no ceasefire, peace or alliance, the victim is 20 colder to the perpetrator;
 * - under a treaty:
 *   - a person who is the victim may go to war, or end the alliance (`'offered'`; the person's answer is
 *     `incidentOfferAccepted`), unless the perpetrator is Fundamentalist, when nothing at all follows;
 *   - a person who is the perpetrator, against a computer player: under a ceasefire or a peace, a Fundamentalist's
 *     incident is terror (the victim holds a vendetta and is 10 colder), anyone else declares war as if of its own
 *     accord (`diplo_declare_war(civ, civ2, -1)`, a plain `declareWar`: reputation and credit as for any war it
 *     chose, but no attitude set to 100, which is `diplo_force_war`'s, not this); allied, a theft while it knows fewer advances than
 *     the victim makes the victim 5 to 19 colder and nothing more, anything else cancels the alliance (war on an ally
 *     is no war, `declared-war/ally`);
 *   - a person who is the perpetrator then faces its Senate: Democracy always, a Republic one time in two, falls into
 *     Anarchy (`senateScandal`, the `SenateScandal` rules).
 *
 * The original sets no `INCIDENT` bit here. Returns what came of it.
 */
const espionageIncident = (dependencies, perpetrator, victim, random, { theft = false, engine } = {}) => {
    const level = (0, standing_1.treaty)(dependencies, victim, perpetrator), tell = (outcome) => {
        engine === null || engine === void 0 ? void 0 : engine.emit('civ2-diplomacy:espionage-incident', perpetrator, victim, outcome);
        return outcome;
    };
    if (level === treatyLevel_1.TreatyLevel.War) {
        return 'none';
    }
    if (level === treatyLevel_1.TreatyLevel.Contact) {
        const attitudes = (0, relations_1.attitude)(dependencies);
        if (attitudes.get(victim, perpetrator) !== undefined) {
            attitudes.adjust(victim, perpetrator, 20, 'espionage');
        }
        return tell('attitude');
    }
    let outcome = 'none';
    if ((0, standing_1.human)(dependencies, victim)) {
        if (fundamentalist(dependencies, perpetrator)) {
            return 'none';
        }
        (0, flags_1.setFlag)(dependencies, victim, perpetrator, flags_1.INCIDENT_OFFERED);
        outcome = tell('offered');
    }
    if ((0, standing_1.human)(dependencies, perpetrator) && !(0, standing_1.human)(dependencies, victim)) {
        if (level !== treatyLevel_1.TreatyLevel.Alliance) {
            if (fundamentalist(dependencies, perpetrator)) {
                (0, exports.holdVendetta)(dependencies, victim, perpetrator);
                (0, relations_1.attitude)(dependencies).adjust(victim, perpetrator, 10, 'terror');
                outcome = tell('terror');
            }
            else {
                (0, declareWar_1.declareWar)(dependencies, perpetrator, victim);
                outcome = tell('war');
            }
        }
        else {
            if (theft &&
                (0, standing_1.advanceCount)(dependencies, perpetrator) <
                    (0, standing_1.advanceCount)(dependencies, victim)) {
                (0, relations_1.attitude)(dependencies).adjust(victim, perpetrator, Math.floor(random() * 15) + 5, 'wimp-out');
                return tell('wimp-out');
            }
            (0, declareWar_1.declareWar)(dependencies, perpetrator, victim);
            outcome = tell('alliance-cancelled');
        }
    }
    if ((0, standing_1.human)(dependencies, perpetrator)) {
        (0, senate_1.senateScandal)(dependencies, perpetrator, victim, random);
    }
    return outcome;
};
exports.espionageIncident = espionageIncident;
/** Whether `victim` has an offer, from an incident of `perpetrator`'s, it hasn't answered (`INCIDENT_OFFERED`). */
const incidentOffered = (dependencies, perpetrator, victim) => (0, flags_1.hasFlag)(dependencies, victim, perpetrator, flags_1.INCIDENT_OFFERED);
exports.incidentOffered = incidentOffered;
/** A person, the victim of an incident under a treaty, lets the offer go: nothing changes. */
const incidentOfferDeclined = (dependencies, perpetrator, victim) => (0, flags_1.clearFlag)(dependencies, victim, perpetrator, flags_1.INCIDENT_OFFERED);
exports.incidentOfferDeclined = incidentOfferDeclined;
/**
 * A person, the victim of an incident under a treaty, takes the chance it was offered (`diplomacy.cpp:5232-5251`):
 *  with an alliance, the alliance ends and they stay at peace; otherwise they are at war, with no declaration and no
 *  reputation lost (the original sets the war bit). They were in contact this turn. Refused (`false`) unless an
 *  incident made the offer and it hasn't been answered (`incidentOffered`).
 */
const incidentOfferAccepted = (dependencies, perpetrator, victim) => {
    if (!(0, exports.incidentOffered)(dependencies, perpetrator, victim)) {
        return false;
    }
    (0, flags_1.clearFlag)(dependencies, victim, perpetrator, flags_1.INCIDENT_OFFERED);
    if ((0, standing_1.treaty)(dependencies, victim, perpetrator) === treatyLevel_1.TreatyLevel.Alliance) {
        (0, declareWar_1.cancelAlliance)(dependencies, victim, perpetrator);
    }
    else {
        (0, effects_1.declareWarQuietly)(dependencies, victim, perpetrator);
    }
    (0, lastContact_1.recordContact)(dependencies, victim, perpetrator, dependencies.turn.value());
    return true;
};
exports.incidentOfferAccepted = incidentOfferAccepted;
/**
 * `diplo_force_war(player, enemy)` (`diplomacy.cpp:6861-6887`), after an attack across a treaty or a capture (an
 *  incited city's included):
 * - any intent of either to break their treaty, and any treaty one of them broke, is forgotten
 *   (`TREATY_HOSTILE_INTENT | TREATY_BROKEN`);
 * - under a ceasefire, a peace or an alliance (the original's peace bit is always set beside an alliance's,
 *   `diplomacy.cpp:4162`, so `:6869` reads it) with a person on either side, `player` is made to declare war
 *   (`madeToDeclareWar`, which counts against its reputation; on an ally it cancels the alliance first, as
 *   `declared-war/ally` has it);
 * - any peace or alliance ends;
 * - once they've met: a war is in force (a `War`, with no declaration when there isn't one), any ceasefire left ends
 *   with it, both attitudes are 100, and `player` is marked as having attacked without declaring war
 *   (`SNEAK_ATTACK`) unless either already is.
 *
 * Returns whether it was marked: the original then has the victim's allies join the war after a battle
 *  (`alliesJoinWar`, `unit_combat.cpp:1593`), but not after a capture or an incited city (`city.cpp:5405`), so that is
 *  the caller's to do.
 */
const forceWar = (dependencies, player, enemy) => {
    (0, flags_1.clearBoth)(dependencies, player, enemy, flags_1.HOSTILE_INTENT | flags_1.BROKEN);
    const level = (0, standing_1.treaty)(dependencies, player, enemy);
    if (level >= treatyLevel_1.TreatyLevel.Ceasefire &&
        ((0, standing_1.human)(dependencies, player) || (0, standing_1.human)(dependencies, enemy))) {
        (0, relations_1.madeToDeclareWar)(dependencies, player, enemy);
    }
    (0, declareWar_1.activeDeclarations)(dependencies, Peace_1.default, player, enemy).forEach((peace) => peace.expire(player));
    if (!(0, standing_1.inContact)(dependencies, player, enemy)) {
        return false;
    }
    if ((0, declareWar_1.activeDeclarations)(dependencies, War_1.default, player, enemy).length === 0) {
        dependencies.interactionRegistry.register(new War_1.default(player, enemy, new Never_1.default(), dependencies.ruleRegistry));
    }
    (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, player, enemy).forEach((ceasefire) => ceasefire.expire(player));
    const attitudes = (0, relations_1.attitude)(dependencies);
    attitudes.set(player, enemy, 100, 'forced-war');
    attitudes.set(enemy, player, 100, 'forced-war');
    if ((0, flags_1.hasFlag)(dependencies, enemy, player, flags_1.SNEAK_ATTACK) ||
        (0, flags_1.hasFlag)(dependencies, player, enemy, flags_1.SNEAK_ATTACK)) {
        return false;
    }
    (0, flags_1.setFlag)(dependencies, player, enemy, flags_1.SNEAK_ATTACK);
    return true;
};
exports.forceWar = forceWar;
/**
 * What inciting a city does between the two, once paid (`unit_spy.cpp:835-846`, then the capture's `diplo_force_war`
 *  when `capture_mode < 2`, `city.cpp:5404`):
 * - at the plain price, an incident (`espionageIncident`), then a forced war (`forceWar`; no allies join);
 * - at the doubled price, offered only under a treaty, neither: the victim holds a vendetta against the inciter.
 *
 * The rest is the city's: the inciter becoming its founder at the doubled price, and the `INCIDENT` bit any capture
 *  involving a person sets.
 */
const incited = (dependencies, inciter, victim, doubled, random, options = {}) => {
    if (doubled) {
        (0, exports.holdVendetta)(dependencies, victim, inciter);
        return;
    }
    (0, exports.espionageIncident)(dependencies, inciter, victim, random, options);
    (0, exports.forceWar)(dependencies, inciter, victim);
};
exports.incited = incited;
/**
 * A planted nuclear device is discovered (`unit_spy.cpp:705-712`): every other civilization is 100 colder toward
 *  `player` and at war with it, with no declaration and no reputation lost (the original sets the war bit). The
 *  barbarians are left out, as the original's loop starts at 1. A civilization `player` hasn't met keeps a
 *  `NuclearDeviceRecord` instead, and both apply when they meet (`civ2-diplomacy:interaction/created/nuclear-device`).
 *  Whether it is discovered (½, a veteran ¼, never a Fundamentalist) is the mission's. Returns the civilizations now
 *  at war with it.
 */
const nuclearDeviceDiscovered = (dependencies, player, engine) => {
    const attitudes = (0, relations_1.attitude)(dependencies), others = dependencies.playerRegistry
        .entries()
        .filter((other) => other !== player && !barbarian(other)), enemies = others.filter((other) => (0, standing_1.inContact)(dependencies, player, other));
    others
        .filter((other) => !enemies.includes(other) &&
        (0, exports.pendingNuclearDevice)(dependencies, other, player) === undefined)
        .forEach((other) => dependencies.interactionRegistry.register(new NuclearDeviceRecord_1.default(other, player, dependencies.ruleRegistry, dependencies.turn)));
    enemies.forEach((other) => {
        if (attitudes.get(other, player) !== undefined) {
            attitudes.adjust(other, player, 100, 'nuclear-device');
        }
        if ((0, standing_1.treaty)(dependencies, player, other) !== treatyLevel_1.TreatyLevel.War) {
            (0, effects_1.declareWarQuietly)(dependencies, player, other);
        }
        (0, flags_1.setBoth)(dependencies, player, other, flags_1.WAR_THIS_TURN);
    });
    engine === null || engine === void 0 ? void 0 : engine.emit('civ2-diplomacy:nuclear-device-discovered', player, enemies);
    return enemies;
};
exports.nuclearDeviceDiscovered = nuclearDeviceDiscovered;
/** The war `holder` owes `planter` for a nuclear device discovered before they met, if any. */
const pendingNuclearDevice = (dependencies, holder, planter) => dependencies.interactionRegistry
    .getByPlayer(holder)
    .find((interaction) => interaction instanceof NuclearDeviceRecord_1.default &&
    interaction.holder() === holder &&
    interaction.planter() === planter);
exports.pendingNuclearDevice = pendingNuclearDevice;
/**
 * `holder` and `planter` have met: a nuclear device of `planter`'s discovered before then makes `holder` 100 colder
 *  and at war with it, with no declaration, as the original set it at the time (`unit_spy.cpp:707-711`).
 */
const applyPendingNuclearDevice = (dependencies, holder, planter) => {
    const record = (0, exports.pendingNuclearDevice)(dependencies, holder, planter);
    if (record === undefined) {
        return false;
    }
    dependencies.interactionRegistry.unregister(record);
    const attitudes = (0, relations_1.attitude)(dependencies);
    if (attitudes.get(holder, planter) !== undefined) {
        attitudes.adjust(holder, planter, 100, 'nuclear-device');
    }
    if ((0, standing_1.treaty)(dependencies, planter, holder) !== treatyLevel_1.TreatyLevel.War) {
        (0, effects_1.declareWarQuietly)(dependencies, planter, holder);
    }
    return true;
};
exports.applyPendingNuclearDevice = applyPendingNuclearDevice;
const barbarian = (player) => {
    try {
        return (0, isBarbarian_1.default)(player);
    }
    catch (e) {
        return false;
    }
};
exports.default = exports.espionageIncident;
//# sourceMappingURL=espionage.js.map