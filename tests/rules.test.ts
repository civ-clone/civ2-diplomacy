import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  BROKEN,
  CEASEFIRE_LINGERS,
  CHANGED_THIS_TURN,
  FIGHTING,
  HOSTILE_INTENT,
  RECENT_CONTACT,
  WITHDRAWAL_DEMANDED,
  clearBoth,
  flagsOf,
  hasFlag,
  setBoth,
  setFlag,
} from '../lib/flags';
import {
  TreatyLevel,
  treatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  activeDeclarations,
  declareWar,
  makeAlliance,
  makeCeasefire,
  makePeace,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import { attitude, madeToDeclareWar, reputation } from '../lib/relations';
import {
  attitudeDelta,
  borderIntruders,
  breakTreaties,
  civsMeet,
  civsMeetAlliance,
  countIncidents,
  driftAttitude,
} from '../lib/rules/turnStart';
import { Alphabet, BronzeWorking } from '@civ-clone/civ2-science/Advances';
import position, { Side } from './lib/position';
import {
  declareWarFor,
  declareWarQuietly,
  signCeasefire,
  signPeace,
} from '../lib/effects';
import { atWar, hostile, inContact } from '../lib/standing';
import Embassy from '@civ-clone/base-unit-action-establish-embassy/Embassy';
import GreatWall from '@civ-clone/base-wonder-great-wall/GreatWall';
import Peace from '@civ-clone/base-diplomacy-declaration-peace/Peace';
import Player from '@civ-clone/core-player/Player';
import SenateRecord from '../Records/SenateRecord';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import { expect } from 'chai';
import Never from '@civ-clone/core-diplomacy/Expiries/Never';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import alliesJoinWar from '../lib/alliances';
import { RuleIds } from '../lib/rules/turnStart';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import DiplomaticMissions from '@civ-clone/base-unit-trait-diplomatic-missions/DiplomaticMissions';
import Moved from '@civ-clone/core-unit/Rules/Moved';
import { COMPUTERS_MET, TURN_BITS } from '../lib/flags';
import { sendHome, withdrawUnits } from '../lib/effects';
import {
  lastContact,
  recordContact,
} from '@civ-clone/base-diplomacy/lib/lastContact';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import readers from '../lib/readers';
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
        recordContact(setUp.dependencies, one, other, setUp.clock.value() - 1);
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
        id: () => `soldier-${squares.indexOf(tile as any)}`,
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

    expect(borderIntruders(dependencies, computer, person, false).weight).equal(
      2
    );
    expect(borderIntruders(dependencies, computer, person, true).weight).equal(
      2 + 3 + 1
    );
  });
});

describe('alliances', (): void => {
  it("sends each side's units nearer the other's cities home: a ship only to a city on its body of water (`diplo_expel_units`, `:4262-4285`)", async (): Promise<void> => {
    const { expelUnits } = await import('../lib/effects'),
      setUp = position([{ human: true }, {}]),
      [person, computer] = setUp.players,
      tile = (name: string, water = false, coast = false) =>
        ({
          name,
          isWater: () => water,
          isCoast: () => coast,
          distanceFrom: (to: any) => distances[`${name}-${to.name}`],
          getNeighbours: () => (name === 'coastal' ? [sea] : []),
        } as any),
      distances: { [key: string]: number } = {
        'near-host': 1,
        'near-inland': 5,
        'near-coastal': 6,
        'far-host': 9,
        'far-inland': 2,
        'far-coastal': 3,
        'sea-host': 1,
        'sea-inland': 4,
        'sea-coastal': 7,
      },
      [near, far, sea, inland, coastal] = [
        tile('near'),
        tile('far'),
        tile('sea', true),
        tile('inland'),
        tile('coastal', false, true),
      ],
      at = (start: any) => {
        let current = start;

        return {
          player: () => person,
          tile: () => current,
          setTile: (to: any) => (current = to),
          setStatus: () => {},
          applyVisibility: () => {},
          where: () => current.name,
        };
      },
      units = [at(near), at(far), at(sea)],
      host = tile('host'),
      dependencies = {
        ...setUp.dependencies,
        cityRegistry: {
          getByPlayer: (player: any) =>
            player === person
              ? [inland, coastal].map((t) => ({ tile: () => t }))
              : [{ tile: () => host }],
        },
        unitRegistry: {
          getByPlayer: (player: any) => (player === person ? units : []),
        },
      } as any;

    expect(expelUnits(dependencies, person, computer)).equal(2);
    expect(units.map((unit) => unit.where())).eql(['inland', 'far', 'coastal']);
  });
});

describe('the original, rule by rule', (): void => {
  it('starts the attitude by the order players were made: the person made later rolls the plain 10 to 89 (`civ.cpp:4648-4660`)', (): void => {
    const setUp = position([{}, { human: true }], {
        level: 5,
        random: () => 0.99,
      }),
      [computer, person] = setUp.players;

    makeContact(
      setUp.interactionRegistry,
      computer,
      person,
      setUp.ruleRegistry,
      setUp.clock
    );

    expect(attitude(setUp.dependencies).get(computer, person)).equal(89);
  });

  it('makes contact with an embassy', (): void => {
    const setUp = position([{ human: true }, {}]),
      [person, computer] = setUp.players;

    setUp.interactionRegistry.register(
      new Embassy(person, computer, setUp.ruleRegistry, setUp.clock)
    );

    expect(inContact(setUp.dependencies, person, computer)).true;
  });

  it('gangs up only on a person who leads the world: rank 7, more than 4 cities, after turn 200 (`civ.cpp:3108-3118`)', (): void => {
    const run = (turn: number, cities: number[]) => {
      const setUp = metAll(
          [
            { human: true, rank: 9, cities },
            { rank: 1, cities: [1, 1] },
          ],
          { turn }
        ),
        [person, computer] = setUp.players;

      reputation(setUp.dependencies).set(person, 4);
      attitude(setUp.dependencies).set(computer, person, 40);
      startTurn(setUp, person);

      return attitude(setUp.dependencies).get(computer, person);
    };

    expect(run(201, [0, 0, 0, 0, 0])).equal(41);
    expect(run(200, [0, 0, 0, 0, 0])).equal(40);
    expect(run(201, [0, 0, 0, 0])).equal(40);
  });

  it('clears war, aggression, hostile intent, broken treaties and fighting both ways on signing (`diplomacy.cpp:4165`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players;

    declareWar(setUp.dependencies, person, computer);
    setFlag(
      setUp.dependencies,
      computer,
      person,
      HOSTILE_INTENT | FIGHTING | BROKEN
    );
    signCeasefire(setUp.dependencies, computer, person);

    expect(
      flagsOf(setUp.dependencies, person, computer) &
        (AGGRESSOR | HOSTILE_INTENT | FIGHTING | BROKEN)
    ).equal(0);
    expect(
      flagsOf(setUp.dependencies, computer, person) &
        (AGGRESSOR | HOSTILE_INTENT | FIGHTING | BROKEN)
    ).equal(0);
    expect(treatyLevel(setUp.dependencies, person, computer)).equal(
      TreatyLevel.Ceasefire
    );
  });

  it('ends the war with a peace, so a broken peace leaves contact, not war (`diplo_sign_peace_treaty`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players;

    declareWar(setUp.dependencies, computer, person);
    signPeace(setUp.dependencies, computer, person);
    activeDeclarations(setUp.dependencies, Peace, computer, person).forEach(
      (peace) => peace.expire(computer)
    );

    expect(treatyLevel(setUp.dependencies, person, computer)).equal(
      TreatyLevel.Contact
    );
  });

  it('keeps the latest of the last contact and 8 turns ago when it breaks a treaty, and forgets it for an ally (`civ.cpp:7100-7117`)', (): void => {
    const recent = metAll([{ human: true }, {}], { turn: 100 }),
      old = metAll([{ human: true }, {}], { turn: 100 }),
      ally = metAll([{ human: true }, {}], { turn: 100 }),
      engine = { emit: () => {} } as any;

    recordContact(
      recent.dependencies,
      recent.players[1],
      recent.players[0],
      95
    );
    recordContact(old.dependencies, old.players[1], old.players[0], 50);
    makeAlliance(ally.dependencies, ally.players[1], ally.players[0]);

    [recent, old].forEach(({ dependencies, players }) => {
      makePeace(dependencies, players[1], players[0]);
    });

    [recent, old, ally].forEach(({ dependencies, players }) => {
      setFlag(dependencies, players[1], players[0], HOSTILE_INTENT);
      breakTreaties(dependencies, players[1], () => 0, engine, false);
    });

    expect(
      lastContact(recent.dependencies, recent.players[0], recent.players[1])
    ).equal(95);
    expect(lastContact(old.dependencies, old.players[0], old.players[1])).equal(
      92
    );
    expect(
      lastContact(ally.dependencies, ally.players[0], ally.players[1])
    ).equal(-1);
  });

  it('marks the joining allies and the victim as waging war on the person (`0x80800`, `:1185-1187`)', (): void => {
    const setUp = metAll([{ human: true }, {}, {}]),
      [person, victim, ally] = setUp.players;

    makeAlliance(setUp.dependencies, victim, ally);
    declareWar(setUp.dependencies, person, victim);

    // `civs[ally].treaties[attacker] |= 0x80800`, and the victim's too (`:1185-1187`): they wage the war.
    expect(
      flagsOf(setUp.dependencies, ally, person) & (AGGRESSOR | AGGRESSOR_LONG)
    ).equal(AGGRESSOR | AGGRESSOR_LONG);
    expect(flagsOf(setUp.dependencies, victim, person) & AGGRESSOR_LONG).equal(
      AGGRESSOR_LONG
    );
    // And the person declared it (`:1240`).
    expect(flagsOf(setUp.dependencies, person, victim) & AGGRESSOR_LONG).equal(
      AGGRESSOR_LONG
    );
  });

  it("warms a computer player toward a person's nuclear weapons by 2 when it has none (`diplomacy.cpp:6592-6597`)", (): void => {
    const delta = (nuclear: boolean) => {
      const setUp = metAll([
          {
            human: true,
            units: nuclear
              ? [{ on: null, attack: 0, defence: 0, nuclear: true }]
              : [],
          },
          {},
        ]),
        [person, computer] = setUp.players;

      return attitudeDelta(setUp.dependencies, computer, person, 10);
    };

    expect(delta(false) - delta(true)).equal(2);
  });

  it('counts a ceasefire as no treaty for hostility (`diplo_is_hostile`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players;

    makeCeasefire(setUp.dependencies, computer, person);

    expect(hostile(setUp.dependencies, computer, person, () => 50)).true;
    expect(hostile(setUp.dependencies, computer, person, () => 49)).false;
  });

  it("gives the declarer credit from whoever asked, and takes a person's credit with its victim (`:1205`, `:1222`, `:1235`)", (): void => {
    const setUp = metAll([{ human: true }, {}, {}]),
      [person, computer, third] = setUp.players;

    declareWarFor(setUp.dependencies, computer, third, person);
    expect(reputation(setUp.dependencies).credit(person, computer)).equal(1);

    makePeace(setUp.dependencies, person, third);
    declareWar(setUp.dependencies, person, third);
    expect(reputation(setUp.dependencies).credit(person, third)).equal(-1);
  });

  it('cancels an alliance rather than making war on an ally, at the cost of reputation (`:1243-1262`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players;

    makeAlliance(setUp.dependencies, person, computer);
    declareWar(setUp.dependencies, person, computer);

    expect(treatyLevel(setUp.dependencies, person, computer)).equal(
      TreatyLevel.Peace
    );
    expect(reputation(setUp.dependencies).get(person)).equal(2);
  });

  it('turns repeat offences without peace into hostile intent, one roll of the reputation + repeats over 1 (`:6448-6458`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players,
      square = { isWater: () => false },
      home = { isWater: () => false },
      soldier = {
        id: () => 'soldier',
        player: () => person,
        attack: () => ({ value: () => 1 }),
      },
      dependencies = {
        ...setUp.dependencies,
        cityRegistry: {
          getByPlayer: (player: Player) =>
            player === computer
              ? [
                  {
                    player: () => computer,
                    tile: () => home,
                    tiles: () => ({ entries: () => [home, square] }),
                  },
                ]
              : [],
          getByTile: () => null,
        },
        unitRegistry: {
          ...setUp.dependencies.unitRegistry,
          getByTile: (tile: unknown) => (tile === square ? [soldier] : []),
        },
      } as any;

    clearBoth(setUp.dependencies, computer, person, CHANGED_THIS_TURN);
    reputation(setUp.dependencies).set(person, 3);
    countIncidents(dependencies, computer, false, () => 0.9);

    expect(hasFlag(setUp.dependencies, computer, person, HOSTILE_INTENT)).true;
    expect(hasFlag(setUp.dependencies, person, computer, HOSTILE_INTENT)).true;
  });

  it('demands a peace partner withdraw at its next audience after a repeat offence (`diplo_review_violators`)', (): void => {
    const setUp = metAll([{ human: true }, {}]),
      [person, computer] = setUp.players,
      square = { isWater: () => false },
      home = { isWater: () => false },
      soldiers = [1, 2, 3, 4].map((index) => ({
        id: () => `soldier-${index}`,
        player: () => person,
        attack: () => ({ value: () => 1 }),
      })),
      dependencies = {
        ...setUp.dependencies,
        cityRegistry: {
          getByPlayer: (player: Player) =>
            player === computer
              ? [
                  {
                    player: () => computer,
                    tile: () => home,
                    tiles: () => ({ entries: () => [home, square] }),
                  },
                ]
              : [],
          getByTile: () => null,
        },
        unitRegistry: {
          ...setUp.dependencies.unitRegistry,
          getByTile: (tile: unknown) => (tile === square ? soldiers : []),
        },
      } as any;

    makePeace(setUp.dependencies, computer, person);
    clearBoth(setUp.dependencies, computer, person, CHANGED_THIS_TURN);
    recordContact(setUp.dependencies, computer, person, 50);
    countIncidents(dependencies, computer, false, () => 0);

    expect(hasFlag(setUp.dependencies, computer, person, WITHDRAWAL_DEMANDED))
      .true;
  });
});

describe('computer players meeting', (): void => {
  it('make peace and swap advances when neither is safe from the other, as with the Great Wall (`diplo_civs_meet`)', (): void => {
    const setUp = position([
        { advances: [Alphabet], wonders: [GreatWall] },
        { advances: [BronzeWorking], wonders: [GreatWall] },
      ]),
      [one, two] = setUp.players;

    civsMeet(setUp.dependencies, one, two, {
      random: () => 0,
      nuclear: () => 0,
      republican: () => false,
      engine: { emit: () => {} } as any,
    });

    expect(inContact(setUp.dependencies, one, two)).true;
    expect(treatyLevel(setUp.dependencies, one, two)).equal(TreatyLevel.Peace);
    expect(setUp.advances.get(one)).include(BronzeWorking);
    expect(setUp.advances.get(two)).include(Alphabet);
  });

  it('ally against a person who leads the world (`diplo_civs_meet_alliance`)', (): void => {
    const setUp = position(
        [
          { rank: 1 },
          { rank: 2 },
          { human: true, rank: 9, cities: [0, 0, 0, 0, 0] },
        ],
        { turn: 201 }
      ),
      [one, two] = setUp.players;

    makePeace(setUp.dependencies, one, two);
    civsMeetAlliance(setUp.dependencies, one, two, () => 0, {
      emit: () => {},
    } as any);

    expect(treatyLevel(setUp.dependencies, one, two)).equal(
      TreatyLevel.Alliance
    );
  });

  it('lose contact, and their war, after 16 turns without meeting (`civ.cpp:7176-7184`)', (): void => {
    const setUp = metAll([{}, {}], { turn: 32 }),
      [one, two] = setUp.players;

    declareWarQuietly(setUp.dependencies, one, two);
    clearBoth(setUp.dependencies, one, two, RECENT_CONTACT | AGGRESSOR);
    startTurn(setUp, one);

    expect(inContact(setUp.dependencies, one, two)).false;
    expect(atWar(setUp.dependencies, one, two)).false;
  });

  it('clear a vendetta both ways when one holding it goes to war (`diplo_clear_treaty_flags(civ, civ2, 0x10)`, `:6102-6105`)', (): void => {
    const setUp = position([
        { units: [{ on: 0, attack: 9, defence: 9 }] },
        { units: [{ on: 0, attack: 1, defence: 1 }] },
      ]),
      [one, two] = setUp.players,
      held = [
        new Vendetta(one, two, new Never(), setUp.ruleRegistry),
        new Vendetta(two, one, new Never(), setUp.ruleRegistry),
      ];

    setUp.interactionRegistry.register(...held);

    civsMeet(setUp.dependencies, one, two, {
      random: () => 0,
      nuclear: () => 0,
      republican: () => false,
      engine: { emit: () => {} } as any,
    });

    expect(atWar(setUp.dependencies, one, two)).true;
    expect(held.map((vendetta) => vendetta.active())).eql([false, false]);
    expect(hasFlag(setUp.dependencies, one, two, AGGRESSOR)).true;
  });
});

describe('allies joining a war', (): void => {
  it("bring a person's computer allies into a computer player's war on it, without a word and with no colder attitude (`diplo_allies_join_war`, `:1134-1194`)", (): void => {
    const setUp = metAll([{ human: true }, {}, {}, {}]),
      [person, attacker, ally, bystander] = setUp.players;

    makeAlliance(setUp.dependencies, person, ally);
    attitude(setUp.dependencies).set(ally, attacker, 30);
    declareWarQuietly(setUp.dependencies, attacker, person);

    expect(alliesJoinWar(setUp.dependencies, person, attacker)).eql([ally]);
    expect(atWar(setUp.dependencies, ally, attacker)).true;
    expect(attitude(setUp.dependencies).get(ally, attacker)).equal(30);
    expect(hasFlag(setUp.dependencies, ally, attacker, RECENT_CONTACT)).true;
    expect(hasFlag(setUp.dependencies, attacker, ally, RECENT_CONTACT)).true;
    expect(
      flagsOf(setUp.dependencies, ally, attacker) & (AGGRESSOR | AGGRESSOR_LONG)
    ).equal(AGGRESSOR | AGGRESSOR_LONG);
    // The victim wages it only against a person.
    expect(
      flagsOf(setUp.dependencies, person, attacker) & AGGRESSOR_LONG
    ).equal(0);

    // A computer player's allies don't join against a computer player.
    makeAlliance(setUp.dependencies, attacker, bystander);
    expect(alliesJoinWar(setUp.dependencies, ally, attacker)).eql([]);
  });
});

describe('turn start order', (): void => {
  it('breaks treaties before counting border incidents, and drifts attitudes after (`civ.cpp:7123`, then `diplo_ai_review_relations` at `:7223`)', (): void => {
    const setUp = position([{}, {}]),
      ids = setUp.ruleRegistry
        .get(TurnStart)
        .map((rule) => rule.id())
        .filter((id): id is string => id !== null),
      at = (id: string) => ids.indexOf(id);

    expect(at(RuleIds.treatyBreaking)).greaterThan(-1);
    expect(at(RuleIds.treatyBreaking)).lessThan(at(RuleIds.borderIntruders));
    expect(at(RuleIds.borderIntruders)).lessThan(at(RuleIds.attitudeDrift));
  });
});

describe('units meeting', (): void => {
  // Units of `owners` on stand-in squares, all next to each other.
  const squares = (setUp: ReturnType<typeof position>) => {
    const placed = new Map<unknown, unknown[]>(),
      square = (water: boolean): any => ({
        isWater: () => water,
        getNeighbours: () =>
          Array.from(placed.keys()).filter((t) => t !== tiles[water ? 1 : 0]),
      }),
      tiles = [square(false), square(true)],
      place = (player: Player, tile: any) => {
        const unit = {
          id: () => `${player.id()}-${placed.size}`,
          player: () => player,
          tile: () => tile,
          attack: () => ({ value: () => 1 }),
          defence: () => ({ value: () => 1 }),
        };

        placed.set(tile, [...(placed.get(tile) ?? []), unit]);

        return unit;
      };

    (setUp.dependencies.unitRegistry as any).getByTile = (tile: unknown) =>
      placed.get(tile) ?? [];

    return { placed, square, place };
  };

  it('makes contact between computer players only through their meeting on land (`diplo_civs_meet`), and contact with a person every time it is lost', (): void => {
    const setUp = position([{ human: true }, {}, {}]),
      [person, one, two] = setUp.players,
      { square, place } = squares(setUp),
      land = square(false),
      landToo = square(false),
      sea = square(true),
      moved = (unit: unknown) => setUp.ruleRegistry.process(Moved, unit, null),
      contact = (a: Player, b: Player) => inContact(setUp.dependencies, a, b);

    // At sea, two computer players don't meet.
    const ship = place(one, sea);

    place(two, landToo);
    moved(ship);
    expect(contact(one, two)).false;

    // On land they do, deciding once a turn, the decision kept as a turn bit.
    const soldier = place(one, land);

    moved(soldier);
    expect(contact(one, two)).true;
    expect(hasFlag(setUp.dependencies, one, two, COMPUTERS_MET)).true;
    clearBoth(setUp.dependencies, one, two, RECENT_CONTACT);
    moved(soldier);
    expect(hasFlag(setUp.dependencies, one, two, RECENT_CONTACT)).false;
    clearBoth(setUp.dependencies, one, two, TURN_BITS);
    moved(soldier);
    expect(hasFlag(setUp.dependencies, one, two, RECENT_CONTACT)).true;

    // A person met is in contact; contact lost is made again.
    place(person, sea);
    moved(soldier);
    expect(contact(one, person)).true;
    setUp.interactionRegistry
      .getByPlayers(one, person)
      .filter((interaction) => interaction instanceof Contact)
      .forEach((found) => setUp.interactionRegistry.unregister(found));
    expect(contact(one, person)).false;
    moved(soldier);
    expect(contact(one, person)).true;
  });

  it("withdraws a computer player's units, not its diplomats, from near a person's cities, and counts one home already (`diplo_answer_demand`, `role < 6`, `:1945-1960`)", (): void => {
    const setUp = position([{ human: true }, {}]),
      [person, computer] = setUp.players,
      place = (name: string, diplomat = false) => {
        let current = name;

        return {
          player: () => computer,
          tile: () => ({
            name: current,
            isWater: () => false,
            distanceFrom: (to: any) =>
              current === to.name ? 0 : to.name === 'border' ? 1 : 5,
          }),
          attack: () => ({ value: () => 1 }),
          defence: () => ({ value: () => 1 }),
          hasTrait: (Trait: unknown) =>
            diplomat && Trait === DiplomaticMissions,
          setTile: (to: any) => (current = to.name),
          setStatus: () => {},
          applyVisibility: () => {},
          where: () => current,
        };
      },
      units = [place('near'), place('near', true)],
      dependencies = {
        ...setUp.dependencies,
        cityRegistry: {
          getByPlayer: (player: Player) => [
            { tile: () => ({ name: player === person ? 'border' : 'home' }) },
          ],
        },
        unitRegistry: { getByPlayer: () => units },
      } as any;

    expect(withdrawUnits(dependencies, computer, person)).equal(1);
    expect(units.map((unit) => unit.where())).eql(['home', 'near']);

    // `unit_relocate` on a unit in its own city: it stays, and counts.
    expect(sendHome(dependencies, units[0] as any)).true;
    expect(units[0].where()).equal('home');
  });
});
