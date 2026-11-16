import EiffelTower from '@civ-clone/base-wonder-eiffeltower/EiffelTower';
import GreatWall from '@civ-clone/base-wonder-great-wall/GreatWall';
import MagellansExpedition from '@civ-clone/base-wonder-magellans-expedition/MagellansExpedition';
import MarcoPolosEmbassy from '@civ-clone/base-wonder-marcopolosembassy/MarcoPolosEmbassy';
import Player from '@civ-clone/core-player/Player';
import PlayerResearchRegistry from '@civ-clone/core-science/PlayerResearchRegistry';
import RequirementRegistry from '@civ-clone/core-requirement/RequirementRegistry';
import UnitedNations from '@civ-clone/base-wonder-unitednations/UnitedNations';
import WonderRegistry from '@civ-clone/core-wonder/WonderRegistry';
/** What reading a wonder's owner needs: the game's wonders, research and requirements (for expiry). */
export interface WonderRegistries {
  playerResearchRegistry: PlayerResearchRegistry;
  requirementRegistry: RequirementRegistry;
  wonderRegistry: WonderRegistry;
}
/**
 * The wonders whose diplomatic effects civ2-diplomacy's own formulas read: Marco Polo's Embassy and Magellan's
 *  Expedition (maps shared without an alliance; Marco Polo's computer owner asks more tribute), the Great Wall and the
 *  United Nations (identical in talks), and the Eiffel Tower (patience, reputation and attitude drift).
 */
export declare const diplomaticWonders: {
  'eiffel-tower': typeof EiffelTower;
  'great-wall': typeof GreatWall;
  'magellans-expedition': typeof MagellansExpedition;
  'marco-polos-embassy': typeof MarcoPolosEmbassy;
  'united-nations': typeof UnitedNations;
};
export type DiplomaticWonder = keyof typeof diplomaticWonders;
/**
 * Whether `player` owns `wonder`, still standing and not expired (base-wonder's `playerOwnsWonder`): an expired wonder
 *  counts as absent, as the original's `wonder_get_city` has it. With no wonder registry given, nobody owns one.
 */
export declare const ownsWonder: (
  registries: Partial<WonderRegistries>,
  player: Player,
  wonder: DiplomaticWonder
) => boolean;
/**
 * Whether `player` owns the Great Wall or the United Nations, which work alike in talks: the computer players accept
 *  its peace, it pays no tribute, and its attitude in talks is 10 warmer.
 */
export declare const pacifies: (
  registries: Partial<WonderRegistries>,
  player: Player
) => boolean;
export default ownsWonder;
