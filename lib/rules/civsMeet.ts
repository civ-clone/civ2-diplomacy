import { TurnStartRules, civsMeet } from './turnStart';
import Criterion from '@civ-clone/core-rule/Criterion';
import High from '@civ-clone/core-rule/Priorities/High';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Moved from '@civ-clone/core-unit/Rules/Moved';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { human } from '../standing';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

/**
 * Two computer players meet when one's unit ends a move next to the other's (`diplo_civs_meet`, called as units meet):
 *  `civsMeet`, before base-diplomacy's contact rule makes contact. Once for each pair each turn, kept for the session
 *  (a game reloaded mid-turn may meet a pair once more): the original may decide again at each meeting, with no more to
 *  go on.
 */
export const movedRules = (
  prefix: string,
  dependencies: Dependencies,
  rules: TurnStartRules
): Moved[] => {
  const met = new WeakMap<Player, Map<Player, number>>(),
    computer = (player: Player): boolean =>
      !human(dependencies, player) && !barbarian(player);

  return [
    new Moved(
      `${prefix}:unit/moved/computers-meet`,
      // Before base-diplomacy's contact rule, so first contact gets its decision here.
      new High(),
      // Land units, on land (`ai.cpp`'s land moves call `diplo_civs_meet`).
      new Criterion(
        (unit: Unit): boolean =>
          computer(unit.player()) && !unit.tile().isWater()
      ),
      new Effect((unit: Unit): void => {
        const player = unit.player(),
          turn = dependencies.turn.value(),
          others = new Set<Player>();

        unit
          .tile()
          .getNeighbours()
          .forEach((tile: Tile) =>
            dependencies.unitRegistry
              .getByTile(tile)
              .forEach((neighbour: Unit) => {
                const other = neighbour.player();

                if (other !== player && computer(other) && !tile.isWater()) {
                  others.add(other);
                }
              })
          );

        others.forEach((other: Player) => {
          const [first, second] = [player, other].sort(
              (a, b) =>
                dependencies.playerRegistry.entries().indexOf(a) -
                dependencies.playerRegistry.entries().indexOf(b)
            ),
            byFirst = met.get(first) ?? new Map<Player, number>();

          met.set(first, byFirst);

          if (byFirst.get(second) === turn) {
            return;
          }

          byFirst.set(second, turn);
          civsMeet(dependencies, player, other, rules);
        });
      })
    ),
  ];
};

export default movedRules;
