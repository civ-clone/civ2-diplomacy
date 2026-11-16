import { TurnStartRules, civsMeet } from './turnStart';
import Criterion from '@civ-clone/core-rule/Criterion';
import High from '@civ-clone/core-rule/Priorities/High';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Moved from '@civ-clone/core-unit/Rules/Moved';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { COMPUTERS_MET, hasFlag, setBoth } from '../flags';
import { human, inContact } from '../standing';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import contactOnMove from '@civ-clone/base-diplomacy/lib/contact';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

/**
 * Units meeting (`Moved`):
 *
 * - `<prefix>:unit/moved/computers-meet`: two computer players meet when one's land unit ends a move on land next to
 *   the other's (`diplo_civs_meet`, called as land units meet): `civsMeet`, which makes their contact. Once for each
 *   pair each turn (`COMPUTERS_MET`, a turn bit, so a reload keeps it): the original may decide again at each meeting,
 *   with no more to go on.
 * - `<prefix>:unit/moved/contact`: a person's unit meeting anyone makes contact, as base-diplomacy's rule does
 *   (`contactOnMove`).
 * - `<prefix>:unit/moved/contact-person`: a computer player's unit meeting a person's makes contact, looked up in the
 *   registry each time, so contact lost is made again.
 *
 * Computer players make contact only through `civsMeet`.
 */
export const movedRules = (
  prefix: string,
  dependencies: Dependencies,
  rules: TurnStartRules
): Moved[] => {
  const computer = (player: Player): boolean =>
      !human(dependencies, player) && !barbarian(player),
    person = (player: Player): boolean =>
      human(dependencies, player) && !barbarian(player),
    neighbours = (unit: Unit): Unit[] =>
      unit
        .tile()
        .getNeighbours()
        .flatMap((tile: Tile) => dependencies.unitRegistry.getByTile(tile)),
    {
      canMakeContact,
      besideAnother,
      makeContact: meetAll,
    } = contactOnMove(
      dependencies.interactionRegistry,
      dependencies.unitRegistry
    );

  return [
    new Moved(
      `${prefix}:unit/moved/computers-meet`,
      // Before the contact rules, so first contact gets its decision here.
      new High(),
      // Land units, on land (`ai.cpp`'s land moves call `diplo_civs_meet`).
      new Criterion(
        (unit: Unit): boolean =>
          computer(unit.player()) && !unit.tile().isWater()
      ),
      new Effect((unit: Unit): void => {
        const player = unit.player(),
          others = new Set<Player>();

        neighbours(unit).forEach((neighbour: Unit) => {
          const other = neighbour.player();

          if (
            other !== player &&
            computer(other) &&
            !neighbour.tile().isWater()
          ) {
            others.add(other);
          }
        });

        others.forEach((other: Player) => {
          if (
            hasFlag(dependencies, player, other, COMPUTERS_MET) ||
            hasFlag(dependencies, other, player, COMPUTERS_MET)
          ) {
            return;
          }

          setBoth(dependencies, player, other, COMPUTERS_MET);
          civsMeet(dependencies, player, other, rules);
        });
      })
    ),
    new Moved(
      `${prefix}:unit/moved/contact`,
      new Criterion((unit: Unit): boolean => person(unit.player())),
      new Criterion(canMakeContact),
      new Criterion(besideAnother),
      new Effect(meetAll)
    ),
    new Moved(
      `${prefix}:unit/moved/contact-person`,
      new Criterion((unit: Unit): boolean => computer(unit.player())),
      new Effect((unit: Unit): void =>
        neighbours(unit)
          .filter((neighbour: Unit) => person(neighbour.player()))
          .forEach((neighbour: Unit) => {
            if (inContact(dependencies, unit.player(), neighbour.player())) {
              return;
            }

            makeContact(
              dependencies.interactionRegistry,
              unit.player(),
              neighbour.player(),
              dependencies.ruleRegistry,
              dependencies.turn
            );
          })
      )
    ),
  ];
};

export default movedRules;
