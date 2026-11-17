import AgentLost from '@civ-clone/base-unit-agent/Rules/AgentLost';
import Dependencies from '../Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import IndustrialSabotage from '@civ-clone/base-unit-action-industrial-sabotage/IndustrialSabotage';
import PoisonWater from '@civ-clone/base-unit-action-poison-water/PoisonWater';
import StealTechnology from '@civ-clone/base-unit-action-steal-technology/StealTechnology';
import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
/**
 * The missions whose lost agent raises an incident: those that call `spy_try_escape` with the victim
 *  (`unit_spy.cpp:384`, `:441`, `:628`, `:665`): stealing an advance, industrial sabotage and poisoning the water. An
 *  embassy, an investigation, sabotaging or bribing a unit, planting a nuclear device and inciting a city raise none
 *  this way (an incited city's is `incited`'s).
 */
export declare const incidentMissions: (
  | typeof IndustrialSabotage
  | typeof PoisonWater
  | typeof StealTechnology
)[];
/**
 * `<prefix>:agent-lost/espionage-incident`: an agent removed after one of those missions (a Diplomat, or a Spy that
 *  failed to escape; never one caught before it) raises an incident between its player and the city's owner
 *  (`espionageIncident`, `spy_try_escape`'s `diplo_espionage_incident(civ3, civ)`, `unit_spy.cpp:99-101`), unless the
 *  owner is the barbarians (`0 < civ`).
 */
export declare const agentLostRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Pick<Engine, 'emit'>,
  random: () => number
) => AgentLost[];
export default agentLostRules;
/**
 * `<prefix>:interaction/created/nuclear-device`: two players meet, and a nuclear device either planted that was
 *  discovered before then makes the other 100 colder and at war with it (`applyPendingNuclearDevice`). `Low`, so the
 *  pair's attitude is seeded first (`interaction/created/seed-attitude`).
 */
export declare const nuclearDeviceRules: (
  prefix: string,
  dependencies: Dependencies
) => Created[];
