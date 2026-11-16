import Dependencies from '../Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import Player from '@civ-clone/core-player/Player';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import Unit from '@civ-clone/core-unit/Unit';
/** The rule ids that civ2-enhanced supersedes. */
export declare const RuleIds: {
  attitudeDrift: string;
  borderIntruders: string;
  treatyBreaking: string;
};
/** Whether the unit with `id` of `player`'s is marked as intruding now. */
export declare const intruding: (
  dependencies: Dependencies,
  player: Player
) => (id: string) => boolean;
/** The drift's starting value for `computer` toward `intruder` this turn, if `border-intruders` counted an incident. */
export declare const incidentWeight: (
  computer: Player,
  intruder: Player
) => number | undefined;
export interface Intrusion {
  weight: number;
  repeat: number;
  units: Unit[];
}
/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): `intruder`'s units on the land squares of `holder`'s cities'
 *  radius, out of a city, on a square whose first unit is `intruder`'s. Each military unit counts (settlers,
 *  diplomats and trade units don't), once (`UNITF_BORDER_INTRUDER`); a unit warned before (`UNITF_BORDER_WARNED`,
 *  saved: `lib/border`) is a repeat offence, as is a city with more than 3. Allies don't count. With `everySquare`
 *  false (the original, B4) only the first such square of each city is looked at.
 */
export declare const borderIntruders: (
  dependencies: Dependencies,
  holder: Player,
  intruder: Player,
  everySquare: boolean
) => Intrusion;
/**
 * The border incidents `computer` counts at the start of its turn (`diplo_review_border_incident`, `:6418-6515`),
 *  toward each person it is in contact with, neither allied nor at war:
 *
 * - without peace: the incident's weight starts the drift; with repeat offences (and a vendetta counting as one) above
 *   2 less the person's reputation, a roll of the reputation + repeats over 1 sets hostile intent both ways;
 * - at peace: a first offence starts the drift at the weight less 1; a repeat makes it demand at its next audience
 *   that the units counted leave, or war (`WITHDRAWAL_DEMANDED`, an incident, `civ2-diplomacy:audience-due`);
 * - a treaty signed last turn, or (at peace) contact in the last 2 turns, counts no incident.
 *
 * With no incident, every unit's intruder mark is cleared. `everySquare` as `borderIntruders`.
 */
export declare const countIncidents: (
  dependencies: Dependencies,
  computer: Player,
  everySquare: boolean,
  random?: () => number,
  engine?: Engine | null
) => void;
/**
 * `diplo_review_attitude_delta` (`diplomacy.cpp:6517`): how much colder `computer` grows toward `person` this turn,
 *  starting from `start` (the border incidents' weight, or, in the original with none, a stale value: see
 *  `attitude-drift`).
 */
export declare const attitudeDelta: (
  dependencies: Dependencies,
  computer: Player,
  person: Player,
  start: number
) => number;
/**
 * The attitude drift (`diplo_ai_review_relations`, `diplomacy.cpp:6683`): each turn a computer player's attitude to
 *  each person it is in contact with moves by `attitudeDelta`, starting from the border incidents' weight. With no
 *  incident, the original (Classic) starts from a stale value on the stack that the clamp turns into 100: the attitude
 *  is pinned at its coldest except on turns with an incident (B3). `fromZero` starts it at 0, as OpenCiv2's fix does
 *  (civ2-enhanced).
 */
export declare const driftAttitude: (
  dependencies: Dependencies,
  computer: Player,
  fromZero: boolean
) => void;
/**
 * A computer player that means to break its treaty with another (`HOSTILE_INTENT`) does so one time in
 *  `breakChance(reputation)` (`civ.cpp:7085-7110`): a ceasefire or peace ends; an ally is 100 colder instead. The
 *  original (Classic) ends it on the computer player's side only and says nothing (B37): here it ends without a word.
 *  `openly` announces it, as OpenCiv2's fix does (civ2-enhanced).
 */
export declare const breakTreaties: (
  dependencies: Dependencies,
  computer: Player,
  random: () => number,
  engine: Engine,
  openly: boolean
) => void;
/** `diplo_ai_feels_secure` (`diplomacy.cpp:5452`), in part: whether `player` feels safe from `other`. */
export declare const feelsSecure: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  nuclear: (player: Player) => number
) => boolean;
/**
 * `diplo_ai_swap_advances` (`diplomacy.cpp:5560`): two computer players each give the other the advance it values
 *  most (with a roll of 0 to 2 added), when both have one; an ally far behind gets one for nothing.
 */
export declare const swapAdvances: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number
) => boolean;
/**
 * `diplo_ally_join_war(player, against, ally)` (`diplomacy.cpp:5650`): `player` joins `ally`'s war on `against`,
 *  unless it is allied with or at war with it already. With `ally` not at war with `against`, a shared vendetta becomes
 *  hostile intent for both. Against a person it holds no vendetta against, it joins only when it last met them 6 or
 *  more turns in the future (as the original's sum reads: so in effect never) or, at rank 7, one time in 3.
 */
export declare const allyJoinWar: (
  dependencies: Dependencies,
  player: Player,
  against: Player,
  ally: Player,
  random: () => number
) => boolean;
/**
 * `diplo_civs_meet_alliance` (`diplomacy.cpp:5908`): two computer players at peace ally against a third, or end their
 *  alliance when there's none worth it. The target: a person who leads the world (rank 7, 5 or more cities, after turn
 *  200, not on Chieftain); else, when they were allied already (and neither leads a much weaker one), a player neither
 *  has peace with; else one both are hostile to and rank no higher than. With no target, or other alliances and no
 *  reason, the alliance ends. A new alliance brings both into the target's wars if a person would learn of it; against
 *  a person that doesn't join, the target has an incident with each.
 */
export declare const civsMeetAlliance: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number,
  engine: Engine
) => void;
/**
 * `diplo_civs_meet` for two computer players (`diplomacy.cpp:6114-6200`), when their units meet: contact (first
 *  contact a change this turn); every fourth turn for the pair, or at first contact, if either doesn't feel secure from
 *  the other, or the other owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't
 *  start a war with it, they swap advances and make peace, or, at peace, see to their alliance; otherwise, at first
 *  contact or not at war, war: a person allied with either is called to help (`diplo_ally_demand_help`), and a vendetta
 *  becomes the aggressor's mark.
 */
export declare const civsMeet: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  { random, nuclear, republican, engine }: TurnStartRules
) => void;
export interface TurnStartRules {
  random: () => number;
  nuclear: (player: Player) => number;
  republican: (player: Player) => boolean;
  engine: Engine;
}
/**
 * The start of each player's turn:
 *
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared (`civ.cpp:7080`).
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next
 *   audience, due after 15 turns without contact or after an incident (`civ2-diplomacy:audience-due`). The audience
 *   itself ends any ceasefire too (`Rules/talks`); until the hosts open audiences on that event, this rule ends it.
 * - `<prefix>:player/turn-start/computer-pairs` (`civ.cpp:7130-7240`): toward each other computer player, the tribute
 *   mark is cleared; every 32 turns an aggressor mark lapses unless it was for long; every 16 turns without recent
 *   contact, unallied pairs at peace meet if the computer players are ganging up on someone, allies swap advances, and
 *   contact lapses (and with it any war) between pairs neither of which is the aggressor; every 8 turns allies without
 *   recent contact swap advances.
 * - `RuleIds.borderIntruders`: the border incidents (`countIncidents`), the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: at the start of the turn of the person the computer players gang up on
 *   (`gangUpLeader`), each with more than one city that isn't its ally, if the person's reputation is above three
 *   times its wars + 3 or it holds a vendetta: without a treaty, contact and 1 colder; with one, one time in 32 per
 *   level + 1, hostile intent.
 * - `<prefix>:player/turn-start/reputation-recovery`: a reputation recovers on schedule.
 */
export declare const turnStartRules: (
  prefix: string,
  dependencies: Dependencies,
  { random, nuclear, republican, engine }: TurnStartRules
) => TurnStart[];
/**
 * Two players lose contact (`diplo_clear_treaty_flags(civ, civ2, 1)`): their `Contact` goes, and with it any war,
 *  and the marks of one; their treaties stay.
 */
export declare const loseContact: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => void;
