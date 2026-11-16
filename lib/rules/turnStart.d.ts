import Dependencies from '../Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import Player from '@civ-clone/core-player/Player';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
/** The rule ids that civ2-enhanced supersedes. */
export declare const RuleIds: {
  attitudeDrift: string;
  borderIntruders: string;
  treatyBreaking: string;
};
/** The weight of `intruder`'s units inside `computer`'s borders this turn, if `border-intruders` counted any. */
export declare const incidentWeight: (
  computer: Player,
  intruder: Player
) => number | undefined;
/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): each military unit of `intruder` on a land square of one of
 *  `holder`'s cities' radius, not in a city, counts 1, 1 more on a road, a railroad, a mine or irrigation, 2 more in a
 *  fortress. Allies don't count. With `everySquare` false (the original, B4) only the first intruded square of each
 *  city is looked at.
 */
export declare const borderIntruders: (
  dependencies: Dependencies,
  holder: Player,
  intruder: Player,
  everySquare: boolean
) => number;
/**
 * The border incidents `computer` counts at the start of its turn, toward each person it has no treaty or war with
 *  (`borderIntruders`), kept for its attitude drift this turn. `everySquare` as `borderIntruders`.
 */
export declare const countIncidents: (
  dependencies: Dependencies,
  computer: Player,
  everySquare: boolean
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
 * Two computer players meeting (`diplo_civs_meet`, `diplomacy.cpp:6114`), every fourth turn for each pair in contact
 *  (`(turn + a + b) & 3`, here by their order in the game): if either doesn't feel secure from the other, or the other
 *  owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't start it, they swap advances
 *  and make peace; otherwise, unless they're at war already, war.
 */
export declare const computersMeet: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number,
  nuclear: (player: Player) => number,
  republican: (player: Player) => boolean,
  engine: Engine
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
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared.
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next audience,
 *   which is due after 15 turns without contact or after an incident; the audience is announced
 *   (`civ2-diplomacy:audience-due`).
 * - `<prefix>:player/turn-start/computers-meet`: two computer players in contact meet (`computersMeet`); every 16 turns
 *   two at war that haven't met lose contact and their war ends; every 8 turns allies swap advances.
 * - `RuleIds.borderIntruders`: the border incidents, the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: a person whose reputation is above three times its wars + 3 is ganged up on.
 * - `<prefix>:player/turn-start/reputation-recovery`: a reputation recovers on schedule.
 */
export declare const turnStartRules: (
  prefix: string,
  dependencies: Dependencies,
  { random, nuclear, republican, engine }: TurnStartRules
) => TurnStart[];
