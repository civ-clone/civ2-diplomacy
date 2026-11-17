import Dependencies from './Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import Player from '@civ-clone/core-player/Player';
/** What an incident came to, for a notice. */
export type IncidentOutcome =
  | 'none'
  | 'attitude'
  | 'offered'
  | 'terror'
  | 'war'
  | 'alliance-cancelled'
  | 'wimp-out';
export interface IncidentOptions {
  /** The mission was a theft of an advance (the original's `spy_last_mission == 2`). */
  theft?: boolean;
  /** Where `civ2-diplomacy:espionage-incident` is emitted. A scandal's notice is the `SenateScandal` rule's. */
  engine?: Pick<Engine, 'emit'>;
}
/** `holder` holds a vendetta against `against` (`TREATY_VENDETTA`), unless it already does. */
export declare const holdVendetta: (
  dependencies: Pick<Dependencies, 'interactionRegistry' | 'ruleRegistry'>,
  holder: Player,
  against: Player
) => void;
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
 *     incident is terror (the victim holds a vendetta and is 10 colder), anyone else is made to declare war
 *     (`madeToDeclareWar`, which counts against its reputation); allied, a theft while it knows fewer advances than
 *     the victim makes the victim 5 to 19 colder and nothing more, anything else cancels the alliance (war on an ally
 *     is no war, `declared-war/ally`);
 *   - a person who is the perpetrator then faces its Senate: Democracy always, a Republic one time in two, falls into
 *     Anarchy (`senateScandal`, the `SenateScandal` rules).
 *
 * The original sets no `INCIDENT` bit here. Returns what came of it.
 */
export declare const espionageIncident: (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player,
  random: () => number,
  { theft, engine }?: IncidentOptions
) => IncidentOutcome;
/**
 * A person, the victim of an incident under a treaty, takes the chance it was offered (`diplomacy.cpp:5232-5251`):
 *  with an alliance, the alliance ends and they stay at peace; otherwise they are at war, with no declaration and no
 *  reputation lost (the original sets the war bit). They were in contact this turn.
 */
export declare const incidentOfferAccepted: (
  dependencies: Dependencies,
  perpetrator: Player,
  victim: Player
) => void;
/**
 * `diplo_force_war(player, enemy)` (`diplomacy.cpp:6861-6887`), after an attack across a treaty or a capture (an
 *  incited city's included):
 * - any intent of either to break their treaty, and any treaty one of them broke, is forgotten
 *   (`TREATY_HOSTILE_INTENT | TREATY_BROKEN`);
 * - under a ceasefire or a peace with a person on either side, `player` is made to declare war (`madeToDeclareWar`,
 *   which counts against its reputation);
 * - any peace or alliance ends;
 * - once they've met: a war is in force (a `War`, with no declaration when there isn't one), any ceasefire left ends
 *   with it, both attitudes are 100, and `player` is marked as having attacked without declaring war
 *   (`SNEAK_ATTACK`) unless either already is.
 *
 * Returns whether it was marked: the original then has the victim's allies join the war after a battle
 *  (`alliesJoinWar`, `unit_combat.cpp:1593`), but not after a capture or an incited city (`city.cpp:5405`), so that is
 *  the caller's to do.
 */
export declare const forceWar: (
  dependencies: Dependencies,
  player: Player,
  enemy: Player
) => boolean;
/**
 * What inciting a city does between the two, once paid (`unit_spy.cpp:835-846`, then the capture's `diplo_force_war`
 *  when `capture_mode < 2`, `city.cpp:5404`):
 * - at the plain price, an incident (`espionageIncident`), then a forced war (`forceWar`; no allies join);
 * - at the doubled price, offered only under a treaty, neither: the victim holds a vendetta against the inciter.
 *
 * The rest is the city's: the inciter becoming its founder at the doubled price, and the `INCIDENT` bit any capture
 *  involving a person sets.
 */
export declare const incited: (
  dependencies: Dependencies,
  inciter: Player,
  victim: Player,
  doubled: boolean,
  random: () => number,
  options?: IncidentOptions
) => void;
/**
 * A planted nuclear device is discovered (`unit_spy.cpp:705-712`): every other civilization is 100 colder toward
 *  `player` and at war with it, with no declaration and no reputation lost (the original sets the war bit). The
 *  barbarians are left out, as the original's loop starts at 1, and so is any civilization `player` hasn't met (the
 *  original sets the bit anyway; here a war needs contact). Whether it is discovered (½, a veteran ¼, never a
 *  Fundamentalist) is the mission's. Returns the civilizations now at war with it.
 */
export declare const nuclearDeviceDiscovered: (
  dependencies: Dependencies,
  player: Player,
  engine?: Pick<Engine, 'emit'>
) => Player[];
export default espionageIncident;
