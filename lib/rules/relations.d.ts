import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
import DeclaredWar from '@civ-clone/base-diplomacy/Rules/DeclaredWar';
import Dependencies from '../Dependencies';
import Detonated from '@civ-clone/base-unit-action-nuclear-attack/Rules/Detonated';
import Engine from '@civ-clone/core-engine/Engine';
import Expired from '@civ-clone/core-diplomacy/Rules/Declaration/Expired';
/**
 * When two players make contact (`Created` for a `Contact`), each starts with an attitude to the other, as the original
 *  gives each civilization when it is made (`civ.cpp:4642-4660`): between computer players 10 to 89; between a computer
 *  player and a person 10 to 75, colder the harder the game; 100 toward the barbarians. And an embassy (`Embassy`)
 *  makes contact.
 */
export declare const createdRules: (
  prefix: string,
  dependencies: Dependencies,
  random: () => number
) => Created[];
/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196`):
 *
 * - `<prefix>:declared-war/reputation`: breaking a ceasefire or a peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower), 1 more for the top power acting on its own, all of it twice when the peace still carries a ceasefire;
 *   breaking an alliance 1 (spared likewise) and 1 more on its own. A war declared at another's request isn't its own;
 *   one it was made to declare is. A computer player's threats cost nothing (`declareWarQuietly`).
 * - `<prefix>:declared-war/attitude`: made to declare war (`diplo_force_war`), each side's attitude to the other is
 *   100; at another's request, the one who asked is 5 warmer to the declarer, 15 if it broke a treaty, 25 an alliance.
 * - `<prefix>:declared-war/standing`: war this turn; a person who declares war is the aggressor and its victim holds a
 *   vendetta; any lingering ceasefire is gone.
 * - `<prefix>:declared-war/allies-join`: a person's victim's allies, computer players in contact with the person and
 *   neither allied with it nor at war with it, join the war, 100 colder (`diplo_allies_join_war`).
 */
export declare const declaredWarRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
) => DeclaredWar[];
/** A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker (`unit_combat.cpp:306-312`). */
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
