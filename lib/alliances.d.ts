import ClientRegistry from '@civ-clone/core-client/ClientRegistry';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import PlayerRegistry from '@civ-clone/core-player/PlayerRegistry';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Turn from '@civ-clone/core-turn-based-game/Turn';
/** What `alliesJoinWar` reads: the game's interactions, rules, turn, players and clients. */
export interface AlliesRegistries {
  clientRegistry: ClientRegistry;
  interactionRegistry: InteractionRegistry;
  playerRegistry: PlayerRegistry;
  ruleRegistry: RuleRegistry;
  turn: Turn;
}
/**
 * `diplo_allies_join_war(victim, attacker)` (`diplomacy.cpp:1134-1194`): each ally of `victim` in contact with
 *  `attacker`, neither allied with it nor at war with it, goes to war with it (no declaration: no reputation), and
 *  wages that war (`TREATY_AGGRESSOR`, for long). With a computer player attacking, only a person's allies join;
 *  with a person attacking, they join 100 colder toward it, and the victim wages the war too. The original calls it
 *  when a person declares war (`diplo_declare_war`) and after the first attack of a war not declared
 *  (`unit_combat.cpp:1593`, when `diplo_force_war` marked a sneak attack): civ2-unit's forced war calls it then.
 */
export declare const alliesJoinWar: (
  registries: AlliesRegistries,
  victim: Player,
  attacker: Player
) => Player[];
export default alliesJoinWar;
