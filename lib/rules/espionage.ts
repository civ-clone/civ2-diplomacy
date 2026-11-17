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
import { applyPendingNuclearDevice, espionageIncident } from '../espionage';
import { INCIDENT_OFFERED, clearBoth } from '../flags';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
import Defeated from '@civ-clone/core-player/Rules/Defeated';
import NuclearDeviceRecord from '../../Records/NuclearDeviceRecord';
import Peace from '@civ-clone/base-diplomacy-declaration-peace/Peace';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
import Interaction from '@civ-clone/core-diplomacy/Interaction';
import Low from '@civ-clone/core-rule/Priorities/Low';
import Player from '@civ-clone/core-player/Player';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

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
 *  (`espionageIncident`, `spy_try_escape`'s `diplo_espionage_incident(civ3, civ)`, `unit_spy.cpp:99-101`), unless the
 *  owner is the barbarians (`0 < civ`).
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
        !barbarian(city.player()) &&
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

/**
 * `<prefix>:interaction/created/nuclear-device`: two players meet, and a nuclear device either planted that was
 *  discovered before then makes the other 100 colder and at war with it (`applyPendingNuclearDevice`). `Low`, so the
 *  pair's attitude is seeded first (`interaction/created/seed-attitude`).
 */
export const nuclearDeviceRules = (
  prefix: string,
  dependencies: Dependencies
): Created[] => [
  new Created(
    `${prefix}:interaction/created/nuclear-device`,
    new Low(),
    new Criterion(
      (interaction: Interaction): boolean => interaction instanceof Contact
    ),
    new Effect((interaction: Interaction): void => {
      const [player, other] = interaction.players();

      if (player === undefined || other === undefined || player === other) {
        return;
      }

      applyPendingNuclearDevice(dependencies, player, other);
      applyPendingNuclearDevice(dependencies, other, player);
    })
  ),
];

/**
 * `<prefix>:interaction/created/treaty-answers-incident`: a ceasefire, peace or alliance signed between two players
 *  answers any incident offer between them (`INCIDENT_OFFERED`), so an old offer can't start a war under the new
 *  treaty.
 */
export const incidentOfferRules = (
  prefix: string,
  dependencies: Dependencies
): Created[] => [
  new Created(
    `${prefix}:interaction/created/treaty-answers-incident`,
    new Criterion(
      (interaction: Interaction): boolean =>
        interaction instanceof Ceasefire || interaction instanceof Peace
    ),
    new Effect((interaction: Interaction): void => {
      const [player, other] = interaction.players();

      if (player === undefined || other === undefined || player === other) {
        return;
      }

      clearBoth(dependencies, player, other, INCIDENT_OFFERED);
    })
  ),
];

/**
 * `<prefix>:player/defeated/nuclear-device`: a civilization destroyed owes and is owed no nuclear device's war any more
 *  (`NuclearDeviceRecord`s held by it or against it go).
 */
export const defeatedRules = (
  prefix: string,
  dependencies: Dependencies
): Defeated[] => [
  new Defeated(
    `${prefix}:player/defeated/nuclear-device`,
    new Effect((player: Player): void =>
      dependencies.interactionRegistry
        .entries()
        .filter(
          (interaction): interaction is NuclearDeviceRecord =>
            interaction instanceof NuclearDeviceRecord &&
            (interaction.holder() === player ||
              interaction.planter() === player)
        )
        .forEach((record) =>
          dependencies.interactionRegistry.unregister(record)
        )
    )
  ),
];
