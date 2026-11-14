import { traitScore, unitCount } from '@civ-clone/base-diplomacy/lib/standing';
import Aggressive from '@civ-clone/base-leader-trait-aggression/Aggression/Aggressive';
import Dependencies from './Dependencies';
import Detonates from '@civ-clone/base-unit-trait-detonates/Detonates';
import Friendly from '@civ-clone/base-leader-trait-aggression/Aggression/Friendly';
import Player from '@civ-clone/core-player/Player';
import Readers from '@civ-clone/base-diplomacy/lib/Readers';
import Trait from '@civ-clone/core-civilization/Trait';
import Unit from '@civ-clone/core-unit/Unit';
import isHuman from '@civ-clone/civ2-difficulty/isHuman';
import { levelOf } from '@civ-clone/civ2-difficulty/level';

/** Units that `Detonates`: Civilization II's nuclear missiles. */
export const nukes = (dependencies: Dependencies, player: Player): number =>
  unitCount(dependencies, player, (unit: Unit) => unit.hasTrait(Detonates));

/**
 * The leader's attack attitude from @LEADERS, as civ2-civilization gives it: 1 Aggressive, −1 Friendly (rational), 0
 *  otherwise.
 */
export const mood = (dependencies: Dependencies, player: Player): number =>
  traitScore(dependencies, player, (trait: Trait) =>
    trait instanceof Aggressive ? 1 : trait instanceof Friendly ? -1 : 0
  );

/**
 * What `base-diplomacy` reads about Civilization II's content: the human, nuclear units, the leader's attack attitude
 *  and the difficulty level. No government answers to a senate: Civilization II's Senate isn't here (M2a).
 */
export const readers = (dependencies: Dependencies): Readers => ({
  isHuman: (player: Player): boolean =>
    isHuman(player, dependencies.clientRegistry),
  nuclear: (player: Player): number => nukes(dependencies, player),
  mood: (player: Player): number => mood(dependencies, player),
  hasSenate: (): boolean => false,
  level: (): number => levelOf(dependencies.gameDifficultyRegistry),
});

export default readers;
