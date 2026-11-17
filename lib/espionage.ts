import {
  BROKEN,
  HOSTILE_INTENT,
  INCIDENT_OFFERED,
  SNEAK_ATTACK,
  WAR_THIS_TURN,
  clearBoth,
  clearFlag,
  hasFlag,
  setBoth,
  setFlag,
} from './flags';
import {
  activeDeclarations,
  cancelAlliance,
  declareWar,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import { TreatyLevel } from '@civ-clone/base-diplomacy/lib/treatyLevel';
import { advanceCount, human, inContact, treaty, vendetta } from './standing';
import { attitude, madeToDeclareWar } from './relations';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
import Dependencies from './Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import Fundamentalism from '@civ-clone/base-government-fundamentalism/Fundamentalism';
import Never from '@civ-clone/core-diplomacy/Expiries/Never';
import NuclearDeviceRecord from '../Records/NuclearDeviceRecord';
import Peace from '@civ-clone/base-diplomacy-declaration-peace/Peace';
import Player from '@civ-clone/core-player/Player';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import { declareWarQuietly } from './effects';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { senateScandal } from './senate';

// Espionage and its diplomatic cost (OpenCiv2 `diplo_espionage_incident`, `diplomacy.cpp:5209-5320`; `diplo_force_war`,
//  `:6861-6887`; the incite and the planted nuclear device of `unit_spy.cpp`). civ2-unit and civ2-city call these; the
//  incident after a mission is also this package's own `AgentLost` rule (`lib/rules/espionage`).

/** What an incident came to, for a notice. */
export type IncidentOutcome =
  // At war: nothing.
  | 'none'
  // No treaty: the victim is 20 colder.
  | 'attitude'
  // The victim, a person under a treaty, may go to war (or end the alliance): `incidentOfferAccepted`.
  | 'offered'
  // A Fundamentalist person's incident under a peace or ceasefire: a vendetta and 10 colder, no war.
  | 'terror'
  // The person is made to declare war.
  | 'war'
  // The person's alliance is cancelled (a declaration of war on an ally).
  | 'alliance-cancelled'
  // An allied person stealing while behind: 5 to 19 colder, nothing broken.
  | 'wimp-out';

export interface IncidentOptions {
  /** The mission was a theft of an advance (the original's `spy_last_mission == 2`). */
  theft?: boolean;
  /** Where `civ2-diplomacy:espionage-incident` is emitted. A scandal's notice is the `SenateScandal` rule's. */
  engine?: Pick<Engine, 'emit'>;
}

const fundamentalist = (
  dependencies: Dependencies,
  player: Player
): boolean => {
  try {
    return dependencies.playerGovernmentRegistry
      .getByPlayer(player)
      .is(Fundamentalism);
  } catch (e) {
    return false;
  }
};

/** `holder` holds a vendetta against `against` (`TREATY_VENDETTA`), unless it already does. */
export const holdVendetta = (
  dependencies: Pick<Dependencies, 'interactionRegistry' | 'ruleRegistry'>,
  holder: Player,
  against: Player
): void => {
  if (vendetta(dependencies as Dependencies, holder, against)) {
    return;
  }

  dependencies.interactionRegistry.register(
    new Vendetta(holder, against, new Never(), dependencies.ruleRegistry)
  );
};

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
export const espionageIncident = (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player,
  random: () => number,
  { theft = false, engine }: IncidentOptions = {}
): IncidentOutcome => {
  const level = treaty(dependencies, victim, perpetrator),
    tell = (outcome: IncidentOutcome): IncidentOutcome => {
      engine?.emit(
        'civ2-diplomacy:espionage-incident',
        perpetrator,
        victim,
        outcome
      );

      return outcome;
    };

  if (level === TreatyLevel.War) {
    return 'none';
  }

  if (level === TreatyLevel.Contact) {
    const attitudes = attitude(dependencies);

    if (attitudes.get(victim, perpetrator) !== undefined) {
      attitudes.adjust(victim, perpetrator, 20, 'espionage');
    }

    return tell('attitude');
  }

  let outcome: IncidentOutcome = 'none';

  if (human(dependencies, victim)) {
    if (fundamentalist(dependencies, perpetrator)) {
      return 'none';
    }

    setFlag(dependencies, victim, perpetrator, INCIDENT_OFFERED);
    outcome = tell('offered');
  }

  if (human(dependencies, perpetrator) && !human(dependencies, victim)) {
    if (level !== TreatyLevel.Alliance) {
      if (fundamentalist(dependencies, perpetrator)) {
        holdVendetta(dependencies, victim, perpetrator);
        attitude(dependencies).adjust(victim, perpetrator, 10, 'terror');
        outcome = tell('terror');
      } else {
        declareWar(dependencies, perpetrator, victim);
        outcome = tell('war');
      }
    } else {
      if (
        theft &&
        advanceCount(dependencies, perpetrator) <
          advanceCount(dependencies, victim)
      ) {
        attitude(dependencies).adjust(
          victim,
          perpetrator,
          Math.floor(random() * 15) + 5,
          'wimp-out'
        );

        return tell('wimp-out');
      }

      declareWar(dependencies, perpetrator, victim);
      outcome = tell('alliance-cancelled');
    }
  }

  if (human(dependencies, perpetrator)) {
    senateScandal(dependencies, perpetrator, victim, random);
  }

  return outcome;
};

/** Whether `victim` has an offer, from an incident of `perpetrator`'s, it hasn't answered (`INCIDENT_OFFERED`). */
export const incidentOffered = (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player
): boolean => hasFlag(dependencies, victim, perpetrator, INCIDENT_OFFERED);

/** A person, the victim of an incident under a treaty, lets the offer go: nothing changes. */
export const incidentOfferDeclined = (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player
): void => clearFlag(dependencies, victim, perpetrator, INCIDENT_OFFERED);

/**
 * A person, the victim of an incident under a treaty, takes the chance it was offered (`diplomacy.cpp:5232-5251`):
 *  with an alliance, the alliance ends and they stay at peace; otherwise they are at war, with no declaration and no
 *  reputation lost (the original sets the war bit). They were in contact this turn. Refused (`false`) unless an
 *  incident made the offer and it hasn't been answered (`incidentOffered`).
 */
export const incidentOfferAccepted = (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player
): boolean => {
  if (
    !incidentOffered(dependencies, perpetrator, victim) ||
    treaty(dependencies, victim, perpetrator) < TreatyLevel.Ceasefire
  ) {
    return false;
  }

  clearFlag(dependencies, victim, perpetrator, INCIDENT_OFFERED);

  if (treaty(dependencies, victim, perpetrator) === TreatyLevel.Alliance) {
    cancelAlliance(dependencies, victim, perpetrator);
  } else {
    declareWarQuietly(dependencies, victim, perpetrator);
  }

  recordContact(dependencies, victim, perpetrator, dependencies.turn.value());

  return true;
};

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
 *   with it, both attitudes are 100, the war is this turn's both ways (`WAR_THIS_TURN`, `:4168-4170`), and `player` is marked as having attacked without declaring war
 *   (`SNEAK_ATTACK`) unless either already is.
 *
 * Returns whether it was marked: the original then has the victim's allies join the war after a battle
 *  (`alliesJoinWar`, `unit_combat.cpp:1593`), but not after a capture or an incited city (`city.cpp:5405`), so that is
 *  the caller's to do.
 */
export const forceWar = (
  dependencies: Dependencies,
  player: Player,
  enemy: Player
): boolean => {
  clearBoth(dependencies, player, enemy, HOSTILE_INTENT | BROKEN);
  // A war forced on them answers any incident offer between them.
  clearBoth(dependencies, player, enemy, INCIDENT_OFFERED);

  const level = treaty(dependencies, player, enemy);

  if (
    level >= TreatyLevel.Ceasefire &&
    (human(dependencies, player) || human(dependencies, enemy))
  ) {
    madeToDeclareWar(dependencies, player, enemy);
  }

  activeDeclarations(dependencies, Peace, player, enemy).forEach((peace) =>
    peace.expire(player)
  );

  if (!inContact(dependencies, player, enemy)) {
    return false;
  }

  if (activeDeclarations(dependencies, War, player, enemy).length === 0) {
    dependencies.interactionRegistry.register(
      new War(player, enemy, new Never(), dependencies.ruleRegistry)
    );
  }

  activeDeclarations(dependencies, Ceasefire, player, enemy).forEach(
    (ceasefire) => ceasefire.expire(player)
  );

  const attitudes = attitude(dependencies);

  attitudes.set(player, enemy, 100, 'forced-war');
  attitudes.set(enemy, player, 100, 'forced-war');
  // `diplo_set_treaty_flags(civ, civ2, 0x2000)` marks the war this turn both ways (`diplomacy.cpp:4168-4170`), so an
  //  audience that turn is refused.
  setBoth(dependencies, player, enemy, WAR_THIS_TURN);

  if (
    hasFlag(dependencies, enemy, player, SNEAK_ATTACK) ||
    hasFlag(dependencies, player, enemy, SNEAK_ATTACK)
  ) {
    return false;
  }

  setFlag(dependencies, player, enemy, SNEAK_ATTACK);

  return true;
};

/**
 * What inciting a city does between the two, once paid (`unit_spy.cpp:835-846`, then the capture's `diplo_force_war`
 *  when `capture_mode < 2`, `city.cpp:5404`):
 * - at the plain price, an incident (`espionageIncident`), then a forced war (`forceWar`; no allies join);
 * - at the doubled price, offered only under a treaty, neither: the victim holds a vendetta against the inciter.
 *
 * The rest is the city's: the inciter becoming its founder at the doubled price, and the `INCIDENT` bit any capture
 *  involving a person sets.
 */
export const incited = (
  dependencies: Dependencies,
  inciter: Player,
  victim: Player,
  doubled: boolean,
  random: () => number,
  options: IncidentOptions = {}
): void => {
  if (doubled) {
    holdVendetta(dependencies, victim, inciter);

    return;
  }

  espionageIncident(dependencies, inciter, victim, random, options);
  forceWar(dependencies, inciter, victim);
};

/**
 * A planted nuclear device is discovered (`unit_spy.cpp:705-712`): every other civilization is 100 colder toward
 *  `player` and at war with it, with no declaration and no reputation lost (the original sets the war bit). The
 *  barbarians are left out, as the original's loop starts at 1. A civilization `player` hasn't met keeps a
 *  `NuclearDeviceRecord` instead, and both apply when they meet (`civ2-diplomacy:interaction/created/nuclear-device`).
 *  Whether it is discovered (½, a veteran ¼, never a Fundamentalist) is the mission's. Returns the civilizations now
 *  at war with it.
 */
export const nuclearDeviceDiscovered = (
  dependencies: Dependencies,
  player: Player,
  engine?: Pick<Engine, 'emit'>
): Player[] => {
  const attitudes = attitude(dependencies),
    others = dependencies.playerRegistry
      .entries()
      .filter((other: Player) => other !== player && !barbarian(other)),
    enemies = others.filter((other: Player) =>
      inContact(dependencies, player, other)
    );

  others
    .filter(
      (other: Player) =>
        !enemies.includes(other) &&
        pendingNuclearDevice(dependencies, other, player) === undefined
    )
    .forEach((other: Player) =>
      dependencies.interactionRegistry.register(
        new NuclearDeviceRecord(
          other,
          player,
          dependencies.ruleRegistry,
          dependencies.turn
        )
      )
    );

  enemies.forEach((other: Player) => {
    if (attitudes.get(other, player) !== undefined) {
      attitudes.adjust(other, player, 100, 'nuclear-device');
    }

    if (treaty(dependencies, player, other) !== TreatyLevel.War) {
      declareWarQuietly(dependencies, player, other);
    }

    setBoth(dependencies, player, other, WAR_THIS_TURN);
  });

  engine?.emit('civ2-diplomacy:nuclear-device-discovered', player, enemies);

  return enemies;
};

/** The war `holder` owes `planter` for a nuclear device discovered before they met, if any. */
export const pendingNuclearDevice = (
  dependencies: Pick<Dependencies, 'interactionRegistry'>,
  holder: Player,
  planter: Player
): NuclearDeviceRecord | undefined =>
  dependencies.interactionRegistry
    .getByPlayer(holder)
    .find(
      (interaction): interaction is NuclearDeviceRecord =>
        interaction instanceof NuclearDeviceRecord &&
        interaction.holder() === holder &&
        interaction.planter() === planter
    );

/**
 * `holder` and `planter` have met: a nuclear device of `planter`'s discovered before then makes `holder` 100 colder
 *  and at war with it, with no declaration, as the original set it at the time (`unit_spy.cpp:707-711`).
 */
export const applyPendingNuclearDevice = (
  dependencies: Dependencies,
  holder: Player,
  planter: Player
): boolean => {
  const record = pendingNuclearDevice(dependencies, holder, planter);

  if (record === undefined) {
    return false;
  }

  dependencies.interactionRegistry.unregister(record);

  const attitudes = attitude(dependencies);

  if (attitudes.get(holder, planter) !== undefined) {
    attitudes.adjust(holder, planter, 100, 'nuclear-device');
  }

  if (treaty(dependencies, planter, holder) !== TreatyLevel.War) {
    declareWarQuietly(dependencies, planter, holder);
  }

  return true;
};

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

export default espionageIncident;
