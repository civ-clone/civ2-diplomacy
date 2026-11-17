import Action from '@civ-clone/core-unit/Action';
import AgentLost from '@civ-clone/base-unit-agent/Rules/AgentLost';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Engine from '@civ-clone/core-engine/Engine';
import IndustrialSabotage from '@civ-clone/base-unit-action-industrial-sabotage/IndustrialSabotage';
import PoisonWater from '@civ-clone/base-unit-action-poison-water/PoisonWater';
import StealTechnology from '@civ-clone/base-unit-action-steal-technology/StealTechnology';
import Unit from '@civ-clone/core-unit/Unit';
import { espionageIncident } from '../espionage';

/**
 * The missions whose lost agent raises an incident: those that call `spy_try_escape` with the victim
 *  (`unit_spy.cpp:384`, `:441`, `:628`, `:665`): stealing an advance, industrial sabotage and poisoning the water. An
 *  embassy, an investigation, sabotaging or bribing a unit, planting a nuclear device and inciting a city raise none
 *  this way (an incited city's is `incited`'s).
 */
export const incidentMissions = [
  StealTechnology,
  IndustrialSabotage,
  PoisonWater,
];

/**
 * `<prefix>:agent-lost/espionage-incident`: an agent removed after one of those missions (a Diplomat, or a Spy that
 *  failed to escape; never one caught before it) raises an incident between its player and the city's owner
 *  (`espionageIncident`, `spy_try_escape`'s `diplo_espionage_incident(civ3, civ)`, `unit_spy.cpp:99-101`).
 */
export const agentLostRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Pick<Engine, 'emit'>,
  random: () => number
): AgentLost[] => [
  new AgentLost(
    `${prefix}:agent-lost/espionage-incident`,
    new Criterion(
      (unit: Unit, city: City | null, mission: Action, caught: boolean) =>
        !caught &&
        city !== null &&
        city.player() !== unit.player() &&
        incidentMissions.some((MissionType) => mission instanceof MissionType)
    ),
    new Effect((unit: Unit, city: City | null, mission: Action): void => {
      espionageIncident(dependencies, unit.player(), city!.player(), random, {
        theft: mission instanceof StealTechnology,
        engine,
      });
    })
  ),
];

export default agentLostRules;
