import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  BROKEN,
  CEASEFIRE_LINGERS,
  HOSTILE_INTENT,
  INCIDENT,
  clearFlag,
  setBoth,
  setFlag,
} from '../flags';
import { allied, human, level } from '../standing';
import { arrivalOf, launchedShip } from '../spaceRace';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Launch from '@civ-clone/core-spaceship/Rules/Launch';
import Peace from '@civ-clone/base-diplomacy-declaration-peace/Peace';
import Player from '@civ-clone/core-player/Player';
import Spaceship from '@civ-clone/core-spaceship/Spaceship';
import { activeDeclarations } from '@civ-clone/base-diplomacy/lib/declareWar';
import { expireSilently } from '../effects';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import { reputation } from '../relations';

/** Warlord and below: a computer player overtaken summons the person to talks rather than meaning harm. */
const WARLORD = 1;

/** Emperor and above: a computer player overtaken breaks its treaty with the person at once. */
const EMPEROR = 4;

/**
 * A person's ship launches and will arrive before a computer player's already in flight (OpenCiv2
 *  `src/auto/spaceship.cpp` `spaceship_launch` ~1600, richardpenman/civ2@49f26ec). That computer player:
 *
 * - below Emperor: summons the person to talks (`INCIDENT`, both ways) on Chieftain or Warlord, or when the person's
 *   reputation is spotless; otherwise means to break its treaty (`HOSTILE_INTENT`);
 * - from Emperor, not allied: breaks its ceasefire or peace there and then, without a word (as a treaty broken, B37),
 *   and is the aggressor, for long;
 * - from Emperor, allied: means to break the alliance.
 *
 * The computer players' gang-up on a person who launched, above King, is the turn start's (`gangUpLeader`).
 */
export const launchRules = (
  prefix: string,
  dependencies: Dependencies
): Launch[] => [
  new Launch(
    `${prefix}:spaceship/launch/overtaken`,
    new Effect((spaceship: Spaceship): void => {
      const person = spaceship.player();

      if (!human(dependencies, person)) {
        return;
      }

      const arrival = arrivalOf(dependencies, spaceship),
        difficulty = level(dependencies);

      dependencies.playerRegistry
        .entries()
        .filter(
          (other: Player): boolean =>
            other !== person &&
            !isBarbarian(other) &&
            !human(dependencies, other)
        )
        .forEach((computer: Player): void => {
          const theirs = launchedShip(dependencies, computer);

          if (theirs === null || !(arrival < arrivalOf(dependencies, theirs))) {
            return;
          }

          if (difficulty < EMPEROR) {
            if (
              difficulty <= WARLORD ||
              reputation(dependencies).get(person) === 0
            ) {
              setBoth(dependencies, person, computer, INCIDENT);

              return;
            }

            setFlag(dependencies, computer, person, HOSTILE_INTENT);

            return;
          }

          if (allied(dependencies, person, computer)) {
            setFlag(dependencies, computer, person, HOSTILE_INTENT);

            return;
          }

          // `& ~0x26`, then `| 0x80840`.
          clearFlag(
            dependencies,
            computer,
            person,
            CEASEFIRE_LINGERS | HOSTILE_INTENT
          );
          setFlag(
            dependencies,
            computer,
            person,
            AGGRESSOR | AGGRESSOR_LONG | BROKEN
          );

          [Ceasefire, Peace].forEach((Type) =>
            activeDeclarations(dependencies, Type, computer, person).forEach(
              (declaration) => expireSilently(declaration, computer)
            )
          );
        });
    })
  ),
];

export default launchRules;
