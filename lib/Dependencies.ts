import BaseDependencies from '@civ-clone/base-diplomacy/lib/Dependencies';
import CityBuildRegistry from '@civ-clone/core-city-build/CityBuildRegistry';
import GameDifficultyRegistry from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import PlayerWorldRegistry from '@civ-clone/core-player-world/PlayerWorldRegistry';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import RequirementRegistry from '@civ-clone/core-requirement/RequirementRegistry';
import WonderRegistry from '@civ-clone/core-wonder/WonderRegistry';

// What Civilization II's diplomacy reads: the game's registries (`base-diplomacy`'s), the game's difficulty, and what
//  shared maps and the diplomatic wonders need. The last four are optional, so a test can leave them out: no maps are
//  shared then, and nobody owns a wonder.
export interface Dependencies extends BaseDependencies {
  cityBuildRegistry?: CityBuildRegistry;
  gameDifficultyRegistry: GameDifficultyRegistry;
  playerWorldRegistry?: PlayerWorldRegistry;
  requirementRegistry?: RequirementRegistry;
  tileImprovementRegistry?: TileImprovementRegistry;
  wonderRegistry?: WonderRegistry;
}

export default Dependencies;
