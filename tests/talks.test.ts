import {
  TreatyLevel,
  treatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  makeAlliance,
  makeCeasefire,
  makePeace,
  declareWar,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import position, {
  Alphabet,
  Bronze,
  Side,
  Wheel,
  kinds,
  named,
  take,
} from './lib/position';
import { attitude, reputation } from '../lib/relations';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import MapMaking from '@civ-clone/base-science-advance-mapmaking/MapMaking';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import Player from '@civ-clone/core-player/Player';
import SenateRecord from '../Records/SenateRecord';
import UnitedNations from '@civ-clone/base-wonder-unitednations/UnitedNations';
import { expect } from 'chai';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

type Treaty = 'war' | 'contact' | 'ceasefire' | 'peace' | 'alliance';

// A person (the first side) and a computer player (the second) who have met `treaty` ago, with the computer player's
//  attitude to the person `feeling`.
const meet = (
  person: Side,
  computer: Side,
  treaty: Treaty,
  feeling: number,
  options: { level?: number; third?: Side } = {}
) => {
  const setUp = position(
      [
        { human: true, ...person },
        computer,
        ...(options.third ? [options.third] : []),
      ],
      { level: options.level ?? 3, turn: 100 }
    ),
    { dependencies, interactionRegistry, players, ruleRegistry } = setUp,
    [human, ai] = players;

  players.forEach((one) =>
    players
      .filter((other) => other !== one)
      .forEach((other) => {
        makeContact(interactionRegistry, one, other, ruleRegistry);
        recordContact(dependencies, one, other, 80);
      })
  );

  if (treaty === 'war') {
    declareWar(dependencies, ai, human);
    require('../lib/flags').clearBoth(
      dependencies,
      ai,
      human,
      require('../lib/flags').TURN_BITS
    );
  } else if (treaty === 'ceasefire') {
    makeCeasefire(dependencies, ai, human);
  } else if (treaty === 'peace') {
    makePeace(dependencies, ai, human);
  } else if (treaty === 'alliance') {
    makeAlliance(dependencies, ai, human);
  }

  attitude(dependencies).set(ai, human, feeling);

  return { ...setUp, human, ai };
};

const mine = (by: Player) => (steps: IAction[]) =>
  steps.filter((step) => step.by() === by);

// Through the audience and the computer player's own business (each answered with the first choice) to the menu.
const toMenu = async (negotiation: Negotiation, person: Player) => {
  for (let index = 0; index < 20; index++) {
    const steps = negotiation.nextSteps();

    if (
      steps.some(
        (step) => step.by() === person && step.constructor.name === 'Terminate'
      ) ||
      negotiation.terminated()
    ) {
      return;
    }

    await take(negotiation);
  }
};

// The person proposes `name` (the first on the menu, or the one `pick` chooses), then the asks are answered with
//  `answer` and the computer player's answer is returned.
const propose = async (
  negotiation: Negotiation,
  person: Player,
  name: string,
  answer: string = 'Accept'
): Promise<string[]> => {
  await toMenu(negotiation, person);
  await take(negotiation, named(name));

  const heard: string[] = [];

  for (let index = 0; index < 10; index++) {
    const steps = negotiation.nextSteps(),
      [step] = steps;

    if (step === undefined || step.by() === person) {
      if (steps.some((s) => s.constructor.name === 'Terminate')) {
        return heard;
      }

      await take(
        negotiation,
        (choices) => named(answer)(choices) ?? choices[0]
      );

      continue;
    }

    heard.push(step.constructor.name);
    await take(negotiation);

    if (
      step.constructor.name === 'Accept' ||
      step.constructor.name === 'Decline'
    ) {
      return heard;
    }
  }

  return heard;
};

const opened = (setUp: ReturnType<typeof meet>) =>
  new Negotiation(setUp.human, setUp.ai, setUp.ruleRegistry);

describe('talks', (): void => {
  it('lists the menu by treaty: peace offers an alliance, war offers peace and tribute', async (): Promise<void> => {
    const atPeace = meet({}, {}, 'peace', 40),
      atWar = meet({}, {}, 'war', 40),
      menuOf = async (setUp: ReturnType<typeof meet>) => {
        const negotiation = opened(setUp);

        await toMenu(negotiation, setUp.human);

        return mine(setUp.human)(negotiation.nextSteps()).map(
          (step) => step.constructor.name
        );
      };

    expect(await menuOf(atPeace)).eql([
      'ProposeAlliance',
      'DemandTribute',
      'DemandWithdrawal',
      'ShareMaps',
      'Terminate',
    ]);
    expect(await menuOf(atWar)).eql([
      'OfferPeace',
      'DemandTribute',
      'ShareMaps',
      'Terminate',
    ]);
  });

  it('accepts an alliance on Chieftain at attitude 75, and refuses one at 76', async (): Promise<void> => {
    const warm = meet({}, {}, 'peace', 75, { level: 0 }),
      cold = meet({}, {}, 'peace', 76, { level: 0 });

    expect(await propose(opened(warm), warm.human, 'ProposeAlliance')).eql([
      'Accept',
    ]);
    expect(treatyLevel(warm.dependencies, warm.ai, warm.human)).equal(
      TreatyLevel.Alliance
    );
    expect(attitude(warm.dependencies).get(warm.ai, warm.human)).equal(50);

    expect(await propose(opened(cold), cold.human, 'ProposeAlliance')).eql([
      'Decline',
    ]);
    expect(treatyLevel(cold.dependencies, cold.ai, cold.human)).equal(
      TreatyLevel.Peace
    );
  });

  it('makes peace at attitude 50, signing it at once, and refuses at 51', async (): Promise<void> => {
    const willing = meet({}, {}, 'ceasefire', 50),
      unwilling = meet({}, {}, 'ceasefire', 51);

    expect(await propose(opened(willing), willing.human, 'OfferPeace')).eql([
      'Accept',
    ]);
    expect(treatyLevel(willing.dependencies, willing.ai, willing.human)).equal(
      TreatyLevel.Peace
    );

    expect(await propose(opened(unwilling), unwilling.human, 'OfferPeace')).eql(
      ['Decline']
    );
  });

  it('asks a sweetener in gold before peace when it is cold, and calls it off if refused', async (): Promise<void> => {
    const refused = meet(
        { gold: 1000 },
        { units: [{ on: 2, attack: 1, defence: 1 }] },
        'contact',
        45
      ),
      paid = meet(
        { gold: 1000 },
        { units: [{ on: 2, attack: 1, defence: 1 }] },
        'contact',
        45
      );

    // A reputation of 2 makes it 5 colder in talks (50), and asks a sweetener.
    reputation(refused.dependencies).set(refused.human, 2);
    reputation(paid.dependencies).set(paid.human, 2);

    expect(
      await propose(opened(refused), refused.human, 'OfferPeace', 'Decline')
    ).eql(['DemandTribute', 'Decline']);

    expect(await propose(opened(paid), paid.human, 'OfferPeace')).eql([
      'DemandTribute',
      'Accept',
    ]);
    expect(paid.gold.get(paid.human)).lessThan(1000);
    expect(treatyLevel(paid.dependencies, paid.ai, paid.human)).equal(
      TreatyLevel.Peace
    );
  });

  it('pays tribute out of fear (once it has offered peace), and is 10 colder for the asking', async (): Promise<void> => {
    const afraid = meet(
        { units: [{ on: 0, attack: 8, defence: 1 }] },
        {
          gold: 400,
          cities: [0, 0],
          units: [{ on: 0, attack: 0, defence: 1 }],
        },
        'contact',
        30
      ),
      negotiation = opened(afraid);

    expect(await propose(negotiation, afraid.human, 'DemandTribute')).eql([
      'Accept',
    ]);
    // Fear 8, all 400 of its gold: it offered peace first (fear), which was accepted, so it isn't halved.
    expect(afraid.gold.get(afraid.human)).equal(400);
    expect(attitude(afraid.dependencies).get(afraid.ai, afraid.human)).equal(
      40
    );

    const unafraid = meet({}, { gold: 400 }, 'contact', 30);

    expect(
      await propose(opened(unafraid), unafraid.human, 'DemandTribute')
    ).eql(['Decline']);
  });

  it('gives an ally lower in the ranking what it asks, 50 for each place', async (): Promise<void> => {
    const setUp = meet({ rank: 4 }, { gold: 500, rank: 6 }, 'alliance', 30);

    expect(await propose(opened(setUp), setUp.human, 'AskAlly')).eql([
      'Accept',
    ]);
    // Two players: ranked 7 and 6.
    expect(setUp.gold.get(setUp.human)).equal(50);
  });

  it('pulls back its units when a peace partner asks, 2 colder', async (): Promise<void> => {
    const setUp = meet({}, {}, 'peace', 30);

    expect(await propose(opened(setUp), setUp.human, 'DemandWithdrawal')).eql([
      'Accept',
    ]);
    expect(attitude(setUp.dependencies).get(setUp.ai, setUp.human)).equal(32);
  });

  it('cancels an alliance: 50 colder, and the person loses 1 reputation even on Chieftain', async (): Promise<void> => {
    const setUp = meet({}, {}, 'alliance', 30, { level: 0 });

    expect(await propose(opened(setUp), setUp.human, 'CancelAlliance')).eql([
      'Accept',
    ]);
    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Peace
    );
    expect(attitude(setUp.dependencies).get(setUp.ai, setUp.human)).equal(80);
    expect(reputation(setUp.dependencies).get(setUp.human)).equal(1);
  });

  it('exchanges advances below attitude level 6, refuses at 6, and sells to a person behind', async (): Promise<void> => {
    const warm = meet(
        { advances: [Bronze] },
        { advances: [Wheel] },
        'peace',
        74
      ),
      cold = meet({ advances: [Bronze] }, { advances: [Wheel] }, 'peace', 75),
      behind = meet(
        { advances: [Bronze], gold: 2000 },
        { advances: [Wheel, Alphabet] },
        'peace',
        30
      );

    expect(await propose(opened(warm), warm.human, 'ExchangeKnowledge')).eql([
      'Accept',
    ]);
    expect(warm.advances.get(warm.human)).include(Wheel);
    expect(warm.advances.get(warm.ai)).include(Bronze);

    expect(await propose(opened(cold), cold.human, 'ExchangeKnowledge')).eql([
      'Decline',
    ]);

    expect(
      await propose(opened(behind), behind.human, 'ExchangeKnowledge')
    ).eql(['SellAdvance', 'Decline']);
    expect(behind.advances.get(behind.human)!.length).equal(2);
    expect(behind.gold.get(behind.human)).lessThan(2000);
  });

  it('declares war on a third for a price', async (): Promise<void> => {
    const setUp = meet(
        { gold: 2000, rank: 5 },
        { gold: 1000, rank: 4 },
        'peace',
        30,
        { third: { rank: 3, units: [{ on: 1, attack: 4, defence: 4 }] } }
      ),
      third = setUp.players[2];

    declareWar(setUp.dependencies, setUp.human, third);

    expect(await propose(opened(setUp), setUp.human, 'JoinWar')).eql([
      'DemandTribute',
      'Accept',
    ]);
    expect(treatyLevel(setUp.dependencies, setUp.ai, third)).equal(
      TreatyLevel.War
    );
    expect(setUp.gold.get(setUp.human)).lessThan(2000);
  });

  it('shares maps with an ally at attitude 25 (50 less the alliance), not 26', async (): Promise<void> => {
    const both = { advances: [MapMaking] },
      willing = meet(both, both, 'alliance', 50),
      unwilling = meet(both, both, 'alliance', 51);

    expect(await propose(opened(willing), willing.human, 'ShareMaps')).eql([
      'Accept',
    ]);
    expect(willing.emitted.map(([event]) => event)).include(
      'civ2-diplomacy:maps-shared'
    );
    expect(await propose(opened(unwilling), unwilling.human, 'ShareMaps')).eql([
      'Decline',
    ]);
  });

  it('takes a gift of gold, warmer by 1½ times its worth', async (): Promise<void> => {
    const setUp = meet({ gold: 400 }, {}, 'peace', 40);

    expect(await propose(opened(setUp), setUp.human, 'Gift')).eql(['Accept']);
    // A quarter of 400: 100, worth 5 + 3 = 8; 1½ times, 12.
    expect(setUp.gold.get(setUp.ai)).equal(100);
    expect(attitude(setUp.dependencies).get(setUp.ai, setUp.human)).equal(28);
  });

  it("opens its own audience at war with a ceasefire, which a person's Senate forces it to accept", async (): Promise<void> => {
    const setUp = meet({ government: 'democracy' }, {}, 'war', 40),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    setUp.interactionRegistry.register(
      new SenateRecord(setUp.human, 99, true, setUp.ruleRegistry)
    );

    await take(negotiation);
    await take(negotiation, named('Accept'));

    expect(kinds(negotiation)).eql(['OfferCeasefire']);
    await take(negotiation);
    expect(kinds(negotiation)).eql(['Accept']);
  });

  it('overrules a refused ceasefire with the United Nations', async (): Promise<void> => {
    const setUp = meet({}, { wonders: [UnitedNations] }, 'war', 40),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    await take(negotiation);
    await take(negotiation, named('Accept'));
    await take(negotiation);
    await take(negotiation, named('Decline'));

    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Ceasefire
    );
  });

  it('clears a ceasefire at its own audience, leaving contact', async (): Promise<void> => {
    const setUp = meet({}, {}, 'ceasefire', 40),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    await take(negotiation);
    await take(negotiation, named('Accept'));

    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Contact
    );
  });

  it('refuses an audience on the turn war was declared', async (): Promise<void> => {
    const setUp = meet({}, {}, 'contact', 40);

    declareWar(setUp.dependencies, setUp.human, setUp.ai);

    const negotiation = opened(setUp);

    await take(negotiation);
    expect(kinds(negotiation)).eql(['Decline']);
  });
});
