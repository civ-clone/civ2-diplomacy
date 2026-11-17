import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  BROKEN,
  HOSTILE_INTENT,
  INCIDENT,
  flagsOf,
  hasFlag,
} from '../lib/flags';
import {
  TreatyLevel,
  treatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import { attitude, reputation } from '../lib/relations';
import { launched, raceActive } from '../lib/spaceRace';
import Launch from '@civ-clone/core-spaceship/Rules/Launch';
import PendingEffectRegistry from '@civ-clone/core-pending-effect/PendingEffectRegistry';
import Player from '@civ-clone/core-player/Player';
import SpaceFlight from '@civ-clone/base-science-advance-spaceflight/SpaceFlight';
import Spaceship from '@civ-clone/core-spaceship/Spaceship';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import { expect } from 'chai';
import { gangUpLeader } from '../lib/standing';
import { makeAlliance } from '@civ-clone/base-diplomacy/lib/declareWar';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import position from './lib/position';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { recordLaunch } from '@civ-clone/civ2-spaceship/lib/ship';
import { signPeace } from '../lib/effects';

// OpenCiv2 (richardpenman/civ2@49f26ec): `civ.cpp` `civ_update_power_ranks` ~3110-3166, `spaceship.cpp`
//  `spaceship_launch` ~1600.

const setUp = (
  level: number,
  {
    turn = 100,
    random = () => 0.99,
  }: { turn?: number; random?: () => number } = {}
) => {
  const game = position(
      [{ human: true, cities: [0, 0, 0, 0, 0] }, { cities: [1, 1] }],
      { level, turn, random }
    ),
    [person, computer] = game.players,
    ships = new Map<Player, Spaceship>(),
    pendingEffectRegistry = new PendingEffectRegistry(),
    dependencies = Object.assign(game.dependencies, {
      pendingEffectRegistry,
      spaceshipRegistry: {
        getBy: (key: string, player: Player) =>
          ships.has(player) ? [ships.get(player)!] : [],
      },
    });

  const ship = (player: Player, arrivalYear: number | null): Spaceship => {
    const spaceship = {
      player: () => player,
      launched: () => (arrivalYear === null ? false : 1),
      successful: () => null,
    } as unknown as Spaceship;

    ships.set(player, spaceship);

    if (arrivalYear !== null) {
      recordLaunch(
        spaceship,
        { fusion: false, launchYear: 1990, arrivalYear },
        pendingEffectRegistry
      );
    }

    return spaceship;
  };

  [person, computer].forEach((one) =>
    [person, computer]
      .filter((other) => other !== one)
      .forEach((other) => {
        makeContact(game.interactionRegistry, one, other, game.ruleRegistry);
        recordContact(dependencies, one, other, game.clock.value() - 1);
      })
  );

  return { ...game, computer, dependencies, person, ship };
};

describe('the space race: ganging up', (): void => {
  it('sets the computer players on a person whose ship has launched, above King, at any turn', (): void => {
    const king = setUp(3),
      emperor = setUp(4);

    king.ship(king.person, 2010);
    emperor.ship(emperor.person, 2010);

    expect(launched(emperor.dependencies, emperor.person)).true;
    expect(gangUpLeader(king.dependencies, () => 0)).null;
    expect(gangUpLeader(emperor.dependencies, () => 0)).equal(emperor.person);
  });

  it('gangs up while the space race is on, whatever the reputation', (): void => {
    const race = setUp(4),
      calm = setUp(4);

    [race, calm].forEach(({ ship, person, dependencies, computer }) => {
      ship(person, 2010);
      attitude(dependencies).set(computer, person, 40);
    });
    race.advances.get(race.person)!.push(SpaceFlight);

    expect(raceActive(race.dependencies)).true;
    expect(raceActive(calm.dependencies)).false;

    [race, calm].forEach((game) =>
      game.ruleRegistry.process(TurnStart, game.person)
    );

    // No treaty: contact, and 1 colder.
    expect(attitude(race.dependencies).get(race.computer, race.person)).equal(
      41
    );
    expect(attitude(calm.dependencies).get(calm.computer, calm.person)).equal(
      40
    );
  });

  it('means harm at peace if it launched itself, and as an ally only then, above King', (): void => {
    const peace = setUp(4),
      ally = setUp(4);

    [peace, ally].forEach(({ ship, person, computer, advances }) => {
      ship(person, 2010);
      ship(computer, 2020);
      advances.get(person)!.push(SpaceFlight);
    });
    signPeace(peace.dependencies, peace.computer, peace.person);
    makeAlliance(ally.dependencies, ally.computer, ally.person);

    [peace, ally].forEach((game) =>
      game.ruleRegistry.process(TurnStart, game.person)
    );

    expect(
      hasFlag(peace.dependencies, peace.computer, peace.person, HOSTILE_INTENT)
    ).true;
    expect(
      hasFlag(ally.dependencies, ally.computer, ally.person, HOSTILE_INTENT)
    ).true;
  });
});

describe('the space race: a person overtaking a computer player', (): void => {
  const launch = (
    level: number,
    personArrival: number,
    options: { reputation?: number; treaty?: 'peace' | 'alliance' } = {}
  ) => {
    const game = setUp(level);

    game.ship(game.computer, 2020);

    const theirs = game.ship(game.person, personArrival);

    reputation(game.dependencies).set(game.person, options.reputation ?? 0);

    if (options.treaty === 'peace') {
      signPeace(game.dependencies, game.computer, game.person);
    }

    if (options.treaty === 'alliance') {
      makeAlliance(game.dependencies, game.computer, game.person);
    }

    game.ruleRegistry.process(Launch, theirs);

    return game;
  };

  it('summons the person to talks below Emperor, on Warlord or with a spotless reputation', (): void => {
    const warlord = launch(1, 2015, { reputation: 3 }),
      spotless = launch(3, 2015),
      stained = launch(3, 2015, { reputation: 1 });

    expect(
      hasFlag(warlord.dependencies, warlord.computer, warlord.person, INCIDENT)
    ).true;
    expect(
      hasFlag(warlord.dependencies, warlord.person, warlord.computer, INCIDENT)
    ).true;
    expect(
      hasFlag(
        spotless.dependencies,
        spotless.computer,
        spotless.person,
        INCIDENT
      )
    ).true;
    expect(
      hasFlag(
        stained.dependencies,
        stained.computer,
        stained.person,
        HOSTILE_INTENT
      )
    ).true;
    expect(
      hasFlag(stained.dependencies, stained.computer, stained.person, INCIDENT)
    ).false;
  });

  it('breaks the peace at once from Emperor, and means to break an alliance', (): void => {
    const peace = launch(4, 2015, { treaty: 'peace' }),
      ally = launch(4, 2015, { treaty: 'alliance' });

    expect(
      flagsOf(peace.dependencies, peace.computer, peace.person) &
        (AGGRESSOR | AGGRESSOR_LONG | BROKEN)
    ).equal(AGGRESSOR | AGGRESSOR_LONG | BROKEN);
    expect(treatyLevel(peace.dependencies, peace.computer, peace.person)).equal(
      TreatyLevel.Contact
    );
    expect(
      hasFlag(ally.dependencies, ally.computer, ally.person, HOSTILE_INTENT)
    ).true;
    expect(treatyLevel(ally.dependencies, ally.computer, ally.person)).equal(
      TreatyLevel.Alliance
    );
  });

  it('does nothing when the person arrives no sooner', (): void => {
    const game = launch(4, 2020, { treaty: 'peace' });

    expect(
      flagsOf(game.dependencies, game.computer, game.person) &
        (AGGRESSOR | AGGRESSOR_LONG | BROKEN | HOSTILE_INTENT | INCIDENT)
    ).equal(0);
    expect(treatyLevel(game.dependencies, game.computer, game.person)).equal(
      TreatyLevel.Peace
    );
  });
});
