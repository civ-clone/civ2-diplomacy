import {
  CEASEFIRE_LINGERS,
  HOSTILE_INTENT,
  setBoth,
  setFlag,
} from '../lib/flags';
import {
  TreatyLevel,
  treatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  declareWar,
  makeAlliance,
  makeCeasefire,
  makePeace,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import { attitude, madeToDeclareWar, reputation } from '../lib/relations';
import {
  borderIntruders,
  breakTreaties,
  driftAttitude,
} from '../lib/rules/turnStart';
import position, { Side } from './lib/position';
import { declareWarQuietly } from '../lib/effects';
import Player from '@civ-clone/core-player/Player';
import SenateRecord from '../Records/SenateRecord';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import { expect } from 'chai';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import readers from '../lib/readers';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import senateIntervenes from '@civ-clone/base-government-senate/lib/senate';

const metAll = (
  sides: Side[],
  options: { level?: number; turn?: number } = {}
) => {
  const setUp = position(sides, options);

  setUp.players.forEach((one) =>
    setUp.players
      .filter((other) => other !== one)
      .forEach((other) => {
        makeContact(setUp.interactionRegistry, one, other, setUp.ruleRegistry);
        recordContact(setUp.dependencies, one, other, setUp.clock.turn - 1);
      })
  );

  return setUp;
};

const startTurn = (setUp: ReturnType<typeof position>, player: Player) =>
  setUp.ruleRegistry.process(TurnStart, player);

describe('attitude', (): void => {
  it('starts at contact: 10 + 5 × level + a roll toward a person, the same both ways', (): void => {
    const setUp = position([{ human: true }, {}, {}], {
        level: 3,
        random: () => 0.5,
      }),
      [person, one, two] = setUp.players;

    makeContact(setUp.interactionRegistry, one, person, setUp.ruleRegistry);
    makeContact(setUp.interactionRegistry, one, two, setUp.ruleRegistry);

    expect(attitude(setUp.dependencies).get(one, person)).equal(65);
    expect(attitude(setUp.dependencies).get(person, one)).equal(65);
    // Between computer players, 10 + the roll.
    expect(attitude(setUp.dependencies).get(one, two)).equal(50);
  });

  it('drifts to 100 each turn with no border incident (the original), or by its terms from 0 (the fix)', (): void => {
    const classic = metAll([{ human: true }, {}]),
      fixed = metAll([{ human: true }, {}]),
      [, computer] = classic.players,
      [, fixedComputer] = fixed.players;

    attitude(classic.dependencies).set(computer, classic.players[0], 40);
    attitude(fixed.dependencies).set(fixedComputer, fixed.players[0], 40);

    startTurn(classic, computer);
    driftAttitude(fixed.dependencies, fixedComputer, true);

    expect(
      attitude(classic.dependencies).get(computer, classic.players[0])
    ).equal(100);
    expect(
      attitude(fixed.dependencies).get(fixedComputer, fixed.players[0])
    ).lessThan(100);
  });

  it("makes both sides' attitudes 100 when one is made to declare war", (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players;

    makePeace(setUp.dependencies, person, computer);
    madeToDeclareWar(setUp.dependencies, person, computer);

    expect(attitude(setUp.dependencies).get(person, computer)).equal(100);
    expect(attitude(setUp.dependencies).get(computer, person)).equal(100);
  });

  it("brings a person's victim's allies into the war, 100 colder", (): void => {
    const setUp = metAll([{ human: true }, {}, {}]),
      [person, victim, ally] = setUp.players;

    makeAlliance(setUp.dependencies, victim, ally);
    attitude(setUp.dependencies).set(ally, person, 0);
    declareWar(setUp.dependencies, person, victim);

    expect(treatyLevel(setUp.dependencies, ally, person)).equal(
      TreatyLevel.War
    );
    expect(attitude(setUp.dependencies).get(ally, person)).equal(100);
  });
});

describe('reputation', (): void => {
  it('costs 1 for breaking a peace, 2 when it still carries a ceasefire, 0 on Chieftain, nothing for a threat', (): void => {
    const plain = metAll([{ human: true }, {}]),
      lingering = metAll([{ human: true }, {}]),
      chieftain = metAll([{ human: true }, {}], { level: 0 }),
      threat = metAll([{ human: true }, {}]);

    [plain, lingering, chieftain, threat].forEach(({ dependencies, players }) =>
      makePeace(dependencies, players[0], players[1])
    );

    setBoth(
      lingering.dependencies,
      lingering.players[0],
      lingering.players[1],
      CEASEFIRE_LINGERS
    );

    [plain, lingering, chieftain].forEach(({ dependencies, players }) =>
      declareWar(dependencies, players[0], players[1])
    );
    declareWarQuietly(
      threat.dependencies,
      threat.players[1],
      threat.players[0]
    );

    expect(
      [plain, lingering, chieftain].map(({ dependencies, players }) =>
        reputation(dependencies).get(players[0])
      )
    ).eql([1, 2, 0]);
    expect(reputation(threat.dependencies).get(threat.players[1])).equal(0);
  });

  it('recovers by 1 every 24 × (level + 1) turns while above 1', (): void => {
    const early = metAll([{ human: true }, {}], { level: 3, turn: 48 }),
      due = metAll([{ human: true }, {}], { level: 3, turn: 96 }),
      floor = metAll([{ human: true }, {}], { level: 3, turn: 96 });

    reputation(early.dependencies).set(early.players[0], 3);
    reputation(due.dependencies).set(due.players[0], 3);
    reputation(floor.dependencies).set(floor.players[0], 1);

    [early, due, floor].forEach((setUp) => startTurn(setUp, setUp.players[0]));

    expect(
      [early, due, floor].map(({ dependencies, players }) =>
        reputation(dependencies).get(players[0])
      )
    ).eql([3, 2, 1]);
  });
});

describe('the Senate', (): void => {
  const senate = (
    side: Side,
    roll: number,
    inSession: boolean,
    otherReputation = 3
  ) => {
    const setUp = metAll([{ human: true, ...side }, {}]),
      [person, computer] = setUp.players;

    reputation(setUp.dependencies).set(computer, otherReputation);
    setUp.interactionRegistry.register(
      new SenateRecord(person, roll, inSession, setUp.ruleRegistry)
    );

    return senateIntervenes(
      person,
      computer,
      { reason: 'break-treaty' },
      setUp.ruleRegistry
    );
  };

  it("stands aside under 15 × the other's reputation, and a Republic's only steps in while in session", (): void => {
    expect(senate({ government: 'democracy' }, 44, false)).false;
    expect(senate({ government: 'democracy' }, 45, false)).true;
    expect(senate({ government: 'republic' }, 45, false)).false;
    expect(senate({ government: 'republic' }, 45, true)).true;
    expect(senate({}, 99, true)).false;
  });

  it("answers base-diplomacy's reader, and rolls once a turn, kept", (): void => {
    const setUp = metAll([{ human: true, government: 'democracy' }, {}]),
      [person, computer] = setUp.players;

    startTurn(setUp, person);

    const kept = setUp.interactionRegistry
      .getByPlayers(person)
      .find(
        (interaction) => interaction instanceof SenateRecord
      ) as SenateRecord;

    expect(kept.value()).equal(0);
    // Roll 0, threshold 0 (no reputation): the Senate steps in.
    expect(readers(setUp.dependencies).hasSenate(person, computer)).true;
  });
});

describe('treaties', (): void => {
  it("ends a ceasefire after 15 turns without contact, at the computer player's audience", (): void => {
    const fresh = metAll([{ human: true }, {}], { turn: 100 }),
      stale = metAll([{ human: true }, {}], { turn: 100 });

    [fresh, stale].forEach(({ dependencies, players }) =>
      makeCeasefire(dependencies, players[1], players[0])
    );
    recordContact(fresh.dependencies, fresh.players[0], fresh.players[1], 85);
    recordContact(stale.dependencies, stale.players[0], stale.players[1], 84);

    [fresh, stale].forEach((setUp) => startTurn(setUp, setUp.players[1]));

    expect(
      treatyLevel(fresh.dependencies, fresh.players[0], fresh.players[1])
    ).equal(TreatyLevel.Ceasefire);
    expect(
      treatyLevel(stale.dependencies, stale.players[0], stale.players[1])
    ).equal(TreatyLevel.Contact);
    expect(stale.emitted.map(([event]) => event)).include(
      'civ2-diplomacy:ceasefire-expired'
    );
  });

  it('breaks a treaty it means to break without a word (the original), or openly (the fix)', (): void => {
    const quiet = metAll([{ human: true }, {}]),
      open = metAll([{ human: true }, {}]);

    [quiet, open].forEach(({ dependencies, players }) => {
      makePeace(dependencies, players[1], players[0]);
      setFlag(dependencies, players[1], players[0], HOSTILE_INTENT);
    });

    breakTreaties(
      quiet.dependencies,
      quiet.players[1],
      () => 0,
      { emit: (...args: unknown[]) => quiet.emitted.push(args) } as any,
      false
    );
    breakTreaties(
      open.dependencies,
      open.players[1],
      () => 0,
      { emit: (...args: unknown[]) => open.emitted.push(args) } as any,
      true
    );

    [quiet, open].forEach(({ dependencies, players }) =>
      expect(treatyLevel(dependencies, players[0], players[1])).equal(
        TreatyLevel.Contact
      )
    );
    expect(quiet.emitted.map(([event]) => event)).not.include(
      'diplomacy:declaration-expired'
    );
    expect(open.emitted.map(([event]) => event)).include(
      'civ2-diplomacy:treaty-broken'
    );
    expect(open.emitted.map(([event]) => event)).include(
      'diplomacy:declaration-expired'
    );
  });
});

describe('border incidents', (): void => {
  it('counts the first intruded square of each city (the original), or every one (the fix), 1 more on a road, 2 in a fortress', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players,
      square = (...improvements: string[]) => ({
        isWater: () => false,
        improvements: improvements.map((name) => {
          const Named = { [name]: class {} }[name];

          return new Named();
        }),
      }),
      squares = [square('Road'), square('Fortress'), square()],
      home = { isWater: () => false },
      city = {
        player: () => computer,
        tile: () => home,
        tiles: () => ({ entries: () => [home, ...squares] }),
      },
      soldier = (tile: unknown) => ({
        player: () => person,
        attack: () => ({ value: () => 1 }),
        tile: () => tile,
      }),
      dependencies = {
        ...setUp.dependencies,
        cityRegistry: {
          getByPlayer: (player: Player) => (player === computer ? [city] : []),
          getByTile: () => null,
        },
        unitRegistry: {
          ...setUp.dependencies.unitRegistry,
          getByTile: (tile: unknown) =>
            squares.includes(tile as any) ? [soldier(tile)] : [],
        },
        tileImprovementRegistry: {
          getByTile: (tile: any) => tile.improvements ?? [],
        },
      } as any;

    expect(borderIntruders(dependencies, computer, person, false)).equal(2);
    expect(borderIntruders(dependencies, computer, person, true)).equal(
      2 + 3 + 1
    );
  });
});
