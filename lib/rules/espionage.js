"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentLostRules = exports.incidentMissions = void 0;
const AgentLost_1 = require("@civ-clone/base-unit-agent/Rules/AgentLost");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const IndustrialSabotage_1 = require("@civ-clone/base-unit-action-industrial-sabotage/IndustrialSabotage");
const PoisonWater_1 = require("@civ-clone/base-unit-action-poison-water/PoisonWater");
const StealTechnology_1 = require("@civ-clone/base-unit-action-steal-technology/StealTechnology");
const espionage_1 = require("../espionage");
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
 *  (`espionageIncident`, `spy_try_escape`'s `diplo_espionage_incident(civ3, civ)`, `unit_spy.cpp:99-101`).
 */
const agentLostRules = (prefix, dependencies, engine, random) => [
    new AgentLost_1.default(`${prefix}:agent-lost/espionage-incident`, new Criterion_1.default((unit, city, mission, caught) => !caught &&
        city !== null &&
        city.player() !== unit.player() &&
        exports.incidentMissions.some((MissionType) => mission instanceof MissionType)), new Effect_1.default((unit, city, mission) => {
        (0, espionage_1.espionageIncident)(dependencies, unit.player(), city.player(), random, {
            theft: mission instanceof StealTechnology_1.default,
            engine,
        });
    })),
];
exports.agentLostRules = agentLostRules;
exports.default = exports.agentLostRules;
//# sourceMappingURL=espionage.js.map