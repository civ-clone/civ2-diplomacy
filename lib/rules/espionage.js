"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defeatedRules = exports.incidentOfferRules = exports.nuclearDeviceRules = exports.agentLostRules = exports.incidentMissions = void 0;
const AgentLost_1 = require("@civ-clone/base-unit-agent/Rules/AgentLost");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const IndustrialSabotage_1 = require("@civ-clone/base-unit-action-industrial-sabotage/IndustrialSabotage");
const PoisonWater_1 = require("@civ-clone/base-unit-action-poison-water/PoisonWater");
const StealTechnology_1 = require("@civ-clone/base-unit-action-steal-technology/StealTechnology");
const espionage_1 = require("../espionage");
const flags_1 = require("../flags");
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const Defeated_1 = require("@civ-clone/core-player/Rules/Defeated");
const NuclearDeviceRecord_1 = require("../../Records/NuclearDeviceRecord");
const Peace_1 = require("@civ-clone/base-diplomacy-declaration-peace/Peace");
const Contact_1 = require("@civ-clone/base-diplomacy-interaction-contact/Contact");
const Created_1 = require("@civ-clone/core-diplomacy/Rules/Interaction/Created");
const Low_1 = require("@civ-clone/core-rule/Priorities/Low");
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
 * The missions whose lost agent raises an incident: those that call `spy_try_escape` with the victim
 *  (`unit_spy.cpp:384`, `:441`, `:628`, `:665`): stealing an advance, industrial sabotage and poisoning the water. An
 *  embassy, an investigation, sabotaging or bribing a unit, planting a nuclear device and inciting a city raise none
 *  this way (an incited city's is `incited`'s).
 */
exports.incidentMissions = [
    StealTechnology_1.default,
    IndustrialSabotage_1.default,
    PoisonWater_1.default,
];
/**
 * `<prefix>:agent-lost/espionage-incident`: an agent removed after one of those missions (a Diplomat, or a Spy that
 *  failed to escape; never one caught before it) raises an incident between its player and the city's owner
 *  (`espionageIncident`, `spy_try_escape`'s `diplo_espionage_incident(civ3, civ)`, `unit_spy.cpp:99-101`), unless the
 *  owner is the barbarians (`0 < civ`).
 */
const agentLostRules = (prefix, dependencies, engine, random) => [
    new AgentLost_1.default(`${prefix}:agent-lost/espionage-incident`, new Criterion_1.default((unit, city, mission, caught) => !caught &&
        city !== null &&
        city.player() !== unit.player() &&
        !barbarian(city.player()) &&
        exports.incidentMissions.some((MissionType) => mission instanceof MissionType)), new Effect_1.default((unit, city, mission) => {
        (0, espionage_1.espionageIncident)(dependencies, unit.player(), city.player(), random, {
            theft: mission instanceof StealTechnology_1.default,
            engine,
        });
    })),
];
exports.agentLostRules = agentLostRules;
exports.default = exports.agentLostRules;
/**
 * `<prefix>:interaction/created/nuclear-device`: two players meet, and a nuclear device either planted that was
 *  discovered before then makes the other 100 colder and at war with it (`applyPendingNuclearDevice`). `Low`, so the
 *  pair's attitude is seeded first (`interaction/created/seed-attitude`).
 */
const nuclearDeviceRules = (prefix, dependencies) => [
    new Created_1.default(`${prefix}:interaction/created/nuclear-device`, new Low_1.default(), new Criterion_1.default((interaction) => interaction instanceof Contact_1.default), new Effect_1.default((interaction) => {
        const [player, other] = interaction.players();
        if (player === undefined || other === undefined || player === other) {
            return;
        }
        (0, espionage_1.applyPendingNuclearDevice)(dependencies, player, other);
        (0, espionage_1.applyPendingNuclearDevice)(dependencies, other, player);
    })),
];
exports.nuclearDeviceRules = nuclearDeviceRules;
/**
 * `<prefix>:interaction/created/treaty-answers-incident`: a ceasefire, peace or alliance signed between two players
 *  answers any incident offer between them (`INCIDENT_OFFERED`), so an old offer can't start a war under the new
 *  treaty.
 */
const incidentOfferRules = (prefix, dependencies) => [
    new Created_1.default(`${prefix}:interaction/created/treaty-answers-incident`, new Criterion_1.default((interaction) => interaction instanceof Ceasefire_1.default || interaction instanceof Peace_1.default), new Effect_1.default((interaction) => {
        const [player, other] = interaction.players();
        if (player === undefined || other === undefined || player === other) {
            return;
        }
        (0, flags_1.clearBoth)(dependencies, player, other, flags_1.INCIDENT_OFFERED);
    })),
];
exports.incidentOfferRules = incidentOfferRules;
/**
 * `<prefix>:player/defeated/nuclear-device`: a civilization destroyed owes and is owed no nuclear device's war any more
 *  (`NuclearDeviceRecord`s held by it or against it go).
 */
const defeatedRules = (prefix, dependencies) => [
    new Defeated_1.default(`${prefix}:player/defeated/nuclear-device`, new Effect_1.default((player) => dependencies.interactionRegistry
        .entries()
        .filter((interaction) => interaction instanceof NuclearDeviceRecord_1.default &&
        (interaction.holder() === player ||
            interaction.planter() === player))
        .forEach((record) => dependencies.interactionRegistry.unregister(record)))),
];
exports.defeatedRules = defeatedRules;
//# sourceMappingURL=espionage.js.map