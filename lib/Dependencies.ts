import BaseDependencies from '@civ-clone/base-diplomacy/lib/Dependencies';
import CityBuildRegistry from '@civ-clone/core-city-build/CityBuildRegistry';
import CityImprovementRegistry from '@civ-clone/core-city-improvement/CityImprovementRegistry';
import GameDifficultyRegistry from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import PendingEffectRegistry from '@civ-clone/core-pending-effect/PendingEffectRegistry';
import PlayerWorldRegistry from '@civ-clone/core-player-world/PlayerWorldRegistry';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import RequirementRegistry from '@civ-clone/core-requirement/RequirementRegistry';
import SpaceshipRegistry from '@civ-clone/core-spaceship/SpaceshipRegistry';
import WonderRegistry from '@civ-clone/core-wonder/WonderRegistry';
import Year from '@civ-clone/core-game-year/Year';

// What Civilization II's diplomacy reads: the game's registries (`base-diplomacy`'s), the game's difficulty, and what
//  shared maps and the diplomatic wonders need. The last four are optional, so a test can leave them out: no maps are
//  shared then, and nobody owns a wonder.
export interface Dependencies extends BaseDependencies {
  cityBuildRegistry?: CityBuildRegistry;
  cityImprovementRegistry?: CityImprovementRegistry;
  gameDifficultyRegistry: GameDifficultyRegistry;
  pendingEffectRegistry?: PendingEffectRegistry;
  playerWorldRegistry?: PlayerWorldRegistry;
  requirementRegistry?: RequirementRegistry;
  spaceshipRegistry?: SpaceshipRegistry;
  tileImprovementRegistry?: TileImprovementRegistry;
  wonderRegistry?: WonderRegistry;
  year?: Year;
}

export default Dependencies;
