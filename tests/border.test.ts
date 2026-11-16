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
import {
  borderIntruders,
  clearOwnMarks,
  countIncidents,
  intruding,
} from '../lib/rules/turnStart';
import { HOSTILE_INTENT, hasFlag } from '../lib/flags';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import { declareWar } from '@civ-clone/base-diplomacy/lib/declareWar';
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

const loseContact = ({
  dependencies,
  computer,
  person,
}: ReturnType<typeof borders>) =>
  dependencies.interactionRegistry
    .getByPlayers(computer, person)
    .filter((interaction: unknown) => interaction instanceof Contact)
    .forEach((contact: any) =>
      dependencies.interactionRegistry.unregister(contact)
    );

describe('border incidents', (): void => {
  it('counts a unit once a pass, however many cities it intrudes on (`UNITF_BORDER_INTRUDER`, `diplomacy.cpp:5360-5380`)', (): void => {
    const { dependencies, computer, person } = borders(),
      intrusion = borderIntruders(dependencies, computer, person, true);

    expect(intrusion.weight).equal(1);
    expect(intrusion.units.length).equal(1);
  });

  it('remembers a warned unit in a save, and counts it again a turn later as a repeat offence (`UNITF_BORDER_WARNED`)', (): void => {
    const { dependencies, computer, person, soldier } = borders();

    expect(borderIntruders(dependencies, computer, person, true).repeat).equal(
      0
    );
    expect(warned(dependencies, soldier as any)).true;
    expect(
      dependencies.interactionRegistry
        .getByPlayer(person)
        .some((record: unknown) => record instanceof WarnedUnitsRecord)
    ).true;

    // Counted once until its owner's turn clears the mark (`unit.cpp:978`).
    expect(borderIntruders(dependencies, computer, person, true).weight).equal(
      0
    );

    clearOwnMarks(dependencies, person);

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

  it('counts a person at war, marking and warning its units, but reviews nothing; with no person in contact, clears no marks (`civ.cpp:7202`, `:6430-6432`)', (): void => {
    const { dependencies, computer, person, soldier } = borders();

    declareWar(dependencies, computer, person);
    countIncidents(dependencies, computer, true, () => 0);

    expect(warned(dependencies, soldier as any)).true;
    // Counted and reviewed with no incident: the marks are cleared.
    expect(intruding(dependencies, person)('a')).false;
    expect(hasFlag(dependencies, computer, person, HOSTILE_INTENT)).false;

    // With nobody to review, a mark stays.
    const alone = borders();

    borderIntruders(alone.dependencies, alone.computer, alone.person, true);
    loseContact(alone);
    countIncidents(alone.dependencies, alone.computer, true, () => 0);
    expect(intruding(alone.dependencies, alone.person)('a')).true;
  });

  it("clears a player's own units' marks at the start of its turn, after forgetting warnings (`units_reset_for_turn`, `unit.cpp:975-978`)", (): void => {
    const { dependencies, computer, person } = borders();

    borderIntruders(dependencies, computer, person, true);
    expect(intruding(dependencies, person)('a')).true;

    clearOwnMarks(dependencies, person);
    expect(intruding(dependencies, person)('a')).false;
  });
});
