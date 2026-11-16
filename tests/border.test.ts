import {
  forgetWarnings,
  noteIntruders,
  takeIntruders,
  warn,
  warned,
  warnedUnits,
} from '../lib/border';
import BorderRecord from '../Records/BorderRecord';
import Player from '@civ-clone/core-player/Player';
import WarnedUnitsRecord from '../Records/WarnedUnitsRecord';
import { borderIntruders } from '../lib/rules/turnStart';
import { expect } from 'chai';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import position from './lib/position';

// A person's units in a computer player's two cities' radius, the square `shared` in both.
const borders = () => {
  const setUp = position([{ human: true }, {}]),
    [person, computer] = setUp.players,
    shared = { isWater: () => false },
    own = { isWater: () => false },
    soldier = {
      id: () => 'a',
      player: () => person,
      attack: () => ({ value: () => 1 }),
      tile: () => shared,
    },
    city = (home: object, squares: object[]) => ({
      player: () => computer,
      tile: () => home,
      tiles: () => ({ entries: () => [home, ...squares] }),
    }),
    alive = [soldier],
    dependencies = {
      ...setUp.dependencies,
      cityRegistry: {
        getByPlayer: (player: Player) =>
          player === computer
            ? [
                city({ isWater: () => false }, [shared]),
                city({ isWater: () => false }, [own, shared]),
              ]
            : [],
        getByTile: () => null,
      },
      unitRegistry: {
        getByPlayer: (player: Player) => (player === person ? alive : []),
        getByTile: (tile: unknown) => (tile === shared ? [soldier] : []),
      },
    } as any;

  makeContact(setUp.interactionRegistry, person, computer, setUp.ruleRegistry);

  return { ...setUp, person, computer, soldier, alive, dependencies };
};

describe('border incidents', (): void => {
  it('counts a unit once a pass, however many cities it intrudes on (`UNITF_BORDER_INTRUDER`, `diplomacy.cpp:5360-5380`)', (): void => {
    const { dependencies, computer, person } = borders(),
      intrusion = borderIntruders(dependencies, computer, person, true);

    expect(intrusion.weight).equal(1);
    expect(intrusion.units.length).equal(1);
  });

  it('remembers a warned unit in a save, and counts it again a turn later as a repeat offence (`UNITF_BORDER_WARNED`)', (): void => {
    const { dependencies, computer, person, soldier, clock } = borders();

    expect(borderIntruders(dependencies, computer, person, true).repeat).equal(
      0
    );
    expect(warned(dependencies, soldier as any)).true;
    expect(
      dependencies.interactionRegistry
        .getByPlayer(person)
        .some((record: unknown) => record instanceof WarnedUnitsRecord)
    ).true;

    clock.set(clock.value() + 1);

    expect(borderIntruders(dependencies, computer, person, true).repeat).equal(
      1
    );
  });

  it('forgets a warning one turn in four, by `(turn ^ unit) & 3`, unless the unit intrudes still (`unit.cpp:970-979`)', (): void => {
    const { dependencies, person, soldier, clock, alive } = borders();

    // The id 'a' is 97: `(100 ^ 97) & 3` is 1, `(101 ^ 97) & 3` is 0.
    warn(dependencies, soldier as any);
    clock.set(100);
    forgetWarnings(dependencies, person, () => false);
    expect(warnedUnits(dependencies, person)).eql(['a']);

    clock.set(101);
    forgetWarnings(dependencies, person, () => true);
    expect(warnedUnits(dependencies, person)).eql(['a']);

    forgetWarnings(dependencies, person, () => false);
    expect(warnedUnits(dependencies, person)).eql([]);

    // A unit lost is forgotten.
    warn(dependencies, soldier as any);
    alive.pop();
    clock.set(100);
    forgetWarnings(dependencies, person, () => true);
    expect(warnedUnits(dependencies, person)).eql([]);
  });

  it('keeps the units counted for a withdrawal in a save, and gives back only those still the intruder’s (`diplo_review_violators`, `:6378-6390`)', (): void => {
    const { dependencies, computer, person, soldier, alive } = borders(),
      lost = { id: () => 'b', player: () => person };

    noteIntruders(dependencies, computer, person, [
      soldier as any,
      lost as any,
    ]);

    expect(
      dependencies.interactionRegistry
        .getByPlayers(computer, person)
        .some((record: unknown) => record instanceof BorderRecord)
    ).true;
    expect(takeIntruders(dependencies, computer, person)).eql(alive);
    expect(takeIntruders(dependencies, computer, person)).eql([]);
  });
});
