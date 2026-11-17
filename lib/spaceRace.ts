import { arrivalYear, launchRecord } from '@civ-clone/civ2-spaceship/lib/ship';
import ApolloProgram from '@civ-clone/base-wonder-apolloprogram/ApolloProgram';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import SpaceFlight from '@civ-clone/base-science-advance-spaceflight/SpaceFlight';
import Spaceship from '@civ-clone/core-spaceship/Spaceship';
import { everBuilt } from '@civ-clone/base-wonder/lib/wonderHistory';
import isHuman from '@civ-clone/civ2-difficulty/isHuman';
import { levelOf } from '@civ-clone/civ2-difficulty/level';

const human = (dependencies: Dependencies, player: Player): boolean =>
  isHuman(player, dependencies.clientRegistry);

// The space race as diplomacy reads it (OpenCiv2 `src/auto/spaceship.cpp`, `src/auto/civ.cpp`, richardpenman/civ2@49f26ec).

/** The level above which a person's launch sets the computer players on them: King. */
export const KING = 3;

const shipsOf = (dependencies: Dependencies, player: Player): Spaceship[] =>
  dependencies.spaceshipRegistry?.getBy('player', player) ?? [];

/**
 * Whether `player`'s ship has launched (`civ_spaceship_launched`): in flight or arrived, not lost.
 */
export const launched = (dependencies: Dependencies, player: Player): boolean =>
  shipsOf(dependencies, player).some(
    (spaceship: Spaceship): boolean =>
      spaceship.launched() !== false && spaceship.successful() !== false
  );

/** `player`'s launched ship, or `null`. */
export const launchedShip = (
  dependencies: Dependencies,
  player: Player
): Spaceship | null =>
  shipsOf(dependencies, player).find(
    (spaceship: Spaceship): boolean =>
      spaceship.launched() !== false && spaceship.successful() !== false
  ) ?? null;

/**
 * Whether the space race is on (`spaceship_race_active`, `spaceship.cpp:2061`): the Apollo Program built, even if lost
 *  since, or a person knows Space Flight.
 */
export const raceActive = (dependencies: Dependencies): boolean =>
  (dependencies.wonderRegistry !== undefined &&
    everBuilt(
      ApolloProgram,
      dependencies.wonderRegistry,
      dependencies.cityImprovementRegistry
    )) ||
  dependencies.playerRegistry.entries().some((player: Player): boolean => {
    if (!human(dependencies, player)) {
      return false;
    }

    try {
      return dependencies.playerResearchRegistry
        .getByPlayer(player)
        .completed(SpaceFlight);
    } catch (e) {
      return false;
    }
  });

/**
 * Above King, the person whose ship has launched, the last of them in player order (`civ_update_power_ranks`,
 *  `civ.cpp:3119-3125`), or `null`.
 */
export const launchedPerson = (dependencies: Dependencies): Player | null =>
  levelOf(dependencies.gameDifficultyRegistry) <= KING
    ? null
    : dependencies.playerRegistry
        .entries()
        .filter(
          (player: Player): boolean =>
            human(dependencies, player) && launched(dependencies, player)
        )
        .pop() ?? null;

/** The year `spaceship` arrives: as recorded at its launch, or as it would if it launched this year. */
export const arrivalOf = (
  dependencies: Dependencies,
  spaceship: Spaceship
): number =>
  launchRecord(spaceship, dependencies.pendingEffectRegistry) !== null
    ? launchRecord(spaceship, dependencies.pendingEffectRegistry)!.arrivalYear
    : arrivalYear(spaceship, dependencies.year?.value() ?? 0, {
        clientRegistry: dependencies.clientRegistry,
        pendingEffectRegistry: dependencies.pendingEffectRegistry,
        playerResearchRegistry: dependencies.playerResearchRegistry,
        spaceshipRegistry: dependencies.spaceshipRegistry,
      });
