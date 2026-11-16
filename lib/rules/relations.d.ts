import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
import DeclaredWar from '@civ-clone/base-diplomacy/Rules/DeclaredWar';
import Dependencies from '../Dependencies';
import Detonated from '@civ-clone/base-unit-action-nuclear-attack/Rules/Detonated';
import Engine from '@civ-clone/core-engine/Engine';
import Expired from '@civ-clone/core-diplomacy/Rules/Declaration/Expired';
/**
 * When two players make contact (`Created` for a `Contact`), each starts with the attitude to the other the original
 *  gives when it makes each civilization (`civ.cpp:4642-4660`): the one made later rolls for the pair, 10 + 0 to 79,
 *  and when the one made earlier is a person, 5 × the level more, 10 to 75; 100 toward the barbarians. Here the order
 *  they joined the game stands for the order they were made. First contact is a change this turn
 *  (`TREATY_CHANGED_THIS_TURN`) and a recent contact. And an embassy (`Embassy`) makes contact.
 */
export declare const createdRules: (
  prefix: string,
  dependencies: Dependencies,
  random: () => number
) => Created[];
/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196-1270`). `own` is the original's
 *  `civ2 < 0`: nobody asked it to (`declareWarFor`). A computer player's threats and wars between computer players set
 *  the war directly in the original, so they hear none of this (`declareWarQuietly`).
 *
 * - `<prefix>:declared-war/ally`: war on an ally is no war: the alliance is cancelled instead (both stay at peace and
 *   go home), and the rest below still applies to it.
 * - `<prefix>:declared-war/reputation`: a broken ceasefire or peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower) and 1 more for the top power on its own initiative, all of it twice when the peace still carries a
 *   ceasefire; a broken alliance 1 (spared likewise) and 1 more on its own. The one who asked gives the declarer 1 credit;
 *   a person declaring of its own accord loses 1 of its credit with its victim each time the cost is counted. Made to
 *   declare it, it costs only with a person on either side.
 * - `<prefix>:declared-war/attitude`: made to declare war, each side's attitude to the other is 100; at another's
 *   request, the one who asked is 5 warmer to the declarer, 15 if it broke a ceasefire or peace, 25 an alliance.
 * - `<prefix>:declared-war/standing`: war this turn; a person who declares war is the aggressor for long, its victim
 *   holds a vendetta, they were in contact this turn, and its victim's allies join in.
 */
export declare const declaredWarRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
) => DeclaredWar[];
/**
 * A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker and threatened by it, and the attacker has
 *  nuked it (`unit_combat.cpp:306-312`). base-diplomacy's rule gives the vendetta.
 */
export declare const detonatedRules: (
  prefix: string,
  dependencies: Dependencies
) => Detonated[];
/**
 * A treaty ending is announced (`diplomacy:declaration-expired`, `player:declaration-expired`), as base-diplomacy's
 *  rule does, unless a computer player ended it without a word (`expireSilently`, the original's B37).
 */
export declare const expiredRules: (
  prefix: string,
  engine: Engine
) => Expired[];
