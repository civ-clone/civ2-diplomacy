import EiffelTower from '@civ-clone/base-wonder-eiffeltower/EiffelTower';
import GreatWall from '@civ-clone/base-wonder-great-wall/GreatWall';
import MagellansExpedition from '@civ-clone/base-wonder-magellans-expedition/MagellansExpedition';
import MarcoPolosEmbassy from '@civ-clone/base-wonder-marcopolosembassy/MarcoPolosEmbassy';
import Player from '@civ-clone/core-player/Player';
import PlayerResearchRegistry from '@civ-clone/core-science/PlayerResearchRegistry';
import RequirementRegistry from '@civ-clone/core-requirement/RequirementRegistry';
import UnitedNations from '@civ-clone/base-wonder-unitednations/UnitedNations';
import Wonder from '@civ-clone/core-wonder/Wonder';
import WonderRegistry from '@civ-clone/core-wonder/WonderRegistry';
import { playerOwnsWonder } from '@civ-clone/base-wonder/lib/hasWonder';

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
export const diplomaticWonders = {
  'eiffel-tower': EiffelTower,
  'great-wall': GreatWall,
  'magellans-expedition': MagellansExpedition,
  'marco-polos-embassy': MarcoPolosEmbassy,
  'united-nations': UnitedNations,
};

export type DiplomaticWonder = keyof typeof diplomaticWonders;

/**
 * Whether `player` owns `wonder`, still standing and not expired (base-wonder's `playerOwnsWonder`): an expired wonder
 *  counts as absent, as the original's `wonder_get_city` has it. With no wonder registry given, nobody owns one.
 */
export const ownsWonder = (
  registries: Partial<WonderRegistries>,
  player: Player,
  wonder: DiplomaticWonder
): boolean =>
  registries.wonderRegistry !== undefined &&
  registries.playerResearchRegistry !== undefined &&
  registries.requirementRegistry !== undefined &&
  playerOwnsWonder(
    player,
    diplomaticWonders[wonder] as unknown as typeof Wonder,
    registries.wonderRegistry,
    registries.playerResearchRegistry,
    registries.requirementRegistry
  );

/**
 * Whether `player` owns the Great Wall or the United Nations, which work alike in talks: the computer players accept
 *  its peace, it pays no tribute, and its attitude in talks is 10 warmer.
 */
export const pacifies = (
  registries: Partial<WonderRegistries>,
  player: Player
): boolean =>
  ownsWonder(registries, player, 'great-wall') ||
  ownsWonder(registries, player, 'united-nations');

export default ownsWonder;
