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
import {
  TURN_BITS,
  WITHDRAWAL_DEMANDED,
  clearBoth,
  setFlag,
} from '../lib/flags';
import { begin, meetingOf } from '../lib/talks';
import callForHelp, { callAlly } from '../lib/callForHelp';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import { hasEmbassy } from '@civ-clone/base-diplomacy/lib/embassy';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { attitude, reputation } from '../lib/relations';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import {
  AdvancedFlight,
  MapMaking,
  Alphabet as RealAlphabet,
  Writing,
} from '@civ-clone/civ2-science/Advances';
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
  } else if (treaty === 'ceasefire') {
    makeCeasefire(dependencies, ai, human);
  } else if (treaty === 'peace') {
    makePeace(dependencies, ai, human);
  } else if (treaty === 'alliance') {
    makeAlliance(dependencies, ai, human);
  }

  attitude(dependencies).set(ai, human, feeling);

  // A turn later: nothing signed or met this turn.
  players.forEach((one) =>
    players.forEach((other) => clearBoth(dependencies, one, other, TURN_BITS))
  );

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

  it('exchanges advances below attitude level 6, refuses at 6 (`diplo_tech_exchange`, `:883-900`)', async (): Promise<void> => {
    const warm = meet(
        { advances: [Bronze] },
        { advances: [Wheel] },
        'peace',
        74
      ),
      cold = meet({ advances: [Bronze] }, { advances: [Wheel] }, 'peace', 75);

    expect(await propose(opened(warm), warm.human, 'ExchangeKnowledge')).eql([
      'Accept',
    ]);
    expect(warm.advances.get(warm.human)).include(Wheel);
    expect(warm.advances.get(warm.ai)).include(Bronze);

    expect(await propose(opened(cold), cold.human, 'ExchangeKnowledge')).eql([
      'Decline',
    ]);
  });

  it('sells, not exchanges, to a person behind it when cold: level above 5, or above 4 without peace (`:924-940`)', async (): Promise<void> => {
    const sides = (): [Side, Side] => [
        { advances: [Bronze], gold: 2000 },
        { advances: [Wheel, Alphabet] },
      ],
      noPeace = meet(...sides(), 'contact', 70),
      peace = meet(...sides(), 'peace', 70);

    expect(
      await propose(opened(noPeace), noPeace.human, 'ExchangeKnowledge')
    ).eql(['SellAdvance', 'Decline']);
    expect(noPeace.advances.get(noPeace.human)!.length).equal(2);
    expect(noPeace.gold.get(noPeace.human)).lessThan(2000);

    // At peace, level 5 is warm enough to exchange.
    expect(await propose(opened(peace), peace.human, 'ExchangeKnowledge')).eql([
      'Accept',
    ]);
  });

  it("refuses a 'petty' exchange of its second-best advance when the person is behind (`:1020-1027`)", async (): Promise<void> => {
    const setUp = meet(
        // Alphabet is worth 5 to it, Advanced Flight 4 (RULES.TXT).
        { advances: [RealAlphabet, AdvancedFlight] },
        { advances: [Wheel, MapMaking, Writing] },
        'peace',
        30
      ),
      negotiation = opened(setUp);

    await toMenu(negotiation, setUp.human);
    await take(
      negotiation,
      (steps) =>
        steps.filter((step) => step.constructor.name === 'ExchangeKnowledge')[1]
    );

    expect(kinds(negotiation)).eql(['Decline']);
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

  it("gives patience back only for gifts accepted, the meeting's gifts + 2 each (`diplo_gift_menu`, `:2547`)", async (): Promise<void> => {
    const gifted = meet({ gold: 400 }, {}, 'peace', 40),
      refused = meet(
        { units: [{ on: 0, attack: 1, defence: 1 }] },
        // Stronger than the person: the unit is refused.
        { units: [{ on: 1, attack: 9, defence: 9 }], cities: [1] },
        'peace',
        40
      );

    [gifted, refused].forEach(({ dependencies, ai, human }) =>
      patience(dependencies, ai, human).spend(1)
    );

    expect(await propose(opened(gifted), gifted.human, 'Gift')).eql(['Accept']);
    // 1, +1 for the proposal, −2 for the first gift.
    expect(
      patience(gifted.dependencies, gifted.ai, gifted.human).spent()
    ).equal(0);

    const negotiation = opened(refused);

    await toMenu(negotiation, refused.human);
    await take(negotiation, (steps) =>
      steps.filter((step) => step.constructor.name === 'Gift').pop()
    );
    await take(negotiation);

    expect(
      patience(refused.dependencies, refused.ai, refused.human).spent()
    ).equal(2);
  });

  it('moves its attitude in talks with every change to its attitude (`civ_adjust_attitude`, `civ.cpp:2966-2975`)', async (): Promise<void> => {
    const setUp = meet({ gold: 400 }, {}, 'peace', 40),
      negotiation = opened(setUp);

    await toMenu(negotiation, setUp.human);

    const meeting = meetingOf(negotiation)!,
      before = meeting.live.value;

    await take(negotiation, named('Gift'));
    await take(negotiation);

    // A gift of 100: worth 8, 1½ times.
    expect(meeting.live.value).equal(before - 12);
  });

  it('signs peace with the owner of the United Nations even when it refuses the sweetener (`flags &= 8`, `:1760-1770`)', async (): Promise<void> => {
    const setUp = meet(
      { gold: 1000, wonders: [UnitedNations] },
      { units: [{ on: 2, attack: 1, defence: 1 }] },
      'contact',
      40
    );

    reputation(setUp.dependencies).set(setUp.human, 2);

    expect(
      await propose(opened(setUp), setUp.human, 'OfferPeace', 'Decline')
    ).eql(['DemandTribute', 'Accept']);
    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Peace
    );
  });

  it('names a common enemy for an alliance with no war target, after turn 99 (reason 4, `:1440-1470`)', async (): Promise<void> => {
    const setUp = meet({ rank: 2 }, { rank: 1 }, 'peace', 20, {
        level: 0,
        third: { rank: 9 },
      }),
      third = setUp.players[2];

    setUp.clock.set(150);

    const heard = await propose(
      opened(setUp),
      setUp.human,
      'ProposeAlliance',
      'Accept'
    );

    expect(heard).eql(['JoinWar', 'Accept']);
    expect(treatyLevel(setUp.dependencies, setUp.human, third)).equal(
      TreatyLevel.War
    );
    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Alliance
    );
  });

  it("asks an alliance's sweetener for any raw reputation, its credit notwithstanding (`civs[civ2].reputation != 0`, `:1530`)", async (): Promise<void> => {
    const setUp = meet(
      { gold: 1000 },
      { units: [{ on: 2, attack: 1, defence: 1 }] },
      'peace',
      20,
      {
        level: 0,
      }
    );

    reputation(setUp.dependencies).set(setUp.human, 1);
    reputation(setUp.dependencies).setCredit(setUp.ai, setUp.human, 1);

    expect(
      await propose(opened(setUp), setUp.human, 'ProposeAlliance', 'Decline')
    ).eql(['DemandTribute', 'Decline']);
  });

  it('counts contact made this turn with no talks before as none, as the original opens talks first (`no_contact`)', (): void => {
    const setUp = position([{ human: true }, {}]),
      [person, computer] = setUp.players;

    makeContact(
      setUp.interactionRegistry,
      person,
      computer,
      setUp.ruleRegistry,
      setUp.clock
    );

    const meeting = begin(
      setUp.dependencies,
      new Negotiation(computer, person, setUp.ruleRegistry)
    )!;

    expect(meeting.noContact).true;
    expect(meeting.lastContactTurn).equal(null);
  });

  it('says no more after its exchange when afraid and at peace, at its own audience (`:3890-3892`)', async (): Promise<void> => {
    const setUp = meet(
        { units: [{ on: 0, attack: 8, defence: 1 }] },
        { cities: [0, 0], units: [{ on: 0, attack: 0, defence: 1 }] },
        'peace',
        30
      ),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    await take(negotiation);
    await take(negotiation, named('Accept'));

    expect(kinds(negotiation)).eql(['Terminate']);
  });

  it('grants a ceasefire with tribute paid without peace, and pays in an advance when ahead (`:2050-2077`)', async (): Promise<void> => {
    const setUp = meet(
        { units: [{ on: 0, attack: 8, defence: 1 }] },
        {
          gold: 400,
          cities: [0, 0],
          units: [{ on: 0, attack: 0, defence: 1 }],
          advances: [Wheel],
        },
        'contact',
        30
      ),
      negotiation = opened(setUp);

    // Its peace refused, and its gold to sweeten it, the person demands tribute.
    await take(negotiation);
    await take(negotiation);
    await take(negotiation);
    await take(negotiation, named('Decline'));
    expect(kinds(negotiation)).eql(['Gift']);
    await take(negotiation);
    await take(negotiation, named('Decline'));
    await toMenu(negotiation, setUp.human);
    await take(negotiation, named('DemandTribute'));
    await take(negotiation);

    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.Ceasefire
    );
    expect(setUp.advances.get(setUp.human)).include(Wheel);
    expect(setUp.gold.get(setUp.ai)).equal(400);
  });

  it('gives a Chieftain an embassy after talks even when turned away, if it knows Writing (`:4110-4119`)', async (): Promise<void> => {
    const setUp = meet({}, { advances: [Writing] }, 'contact', 30, {
        level: 0,
      }),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    await take(negotiation);
    await take(negotiation, named('Decline'));
    await take(negotiation);

    expect(hasEmbassy(setUp.dependencies, setUp.human, setUp.ai)).true;
  });

  it('lists war for hire on every other player, and declines one it has no contact with (`str_nocontact`)', async (): Promise<void> => {
    const setUp = meet({ gold: 2000 }, { gold: 1000 }, 'peace', 30, {
        third: {},
      }),
      third = setUp.players[2];

    setUp.interactionRegistry
      .getByPlayers(setUp.ai, third)
      .filter((interaction) => interaction instanceof Contact)
      .forEach((contact) => setUp.interactionRegistry.unregister(contact));

    expect(await propose(opened(setUp), setUp.human, 'JoinWar')).eql([
      'Decline',
    ]);
  });

  it("demands a peace partner's units leave at its audience, and a refusal makes the person declare war (`diplo_review_violators`)", async (): Promise<void> => {
    const setUp = meet({}, {}, 'peace', 30),
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    setFlag(setUp.dependencies, setUp.ai, setUp.human, WITHDRAWAL_DEMANDED);

    await take(negotiation);
    await take(negotiation, named('Accept'));
    expect(kinds(negotiation)).eql(['DemandWithdrawal']);
    await take(negotiation);
    await take(negotiation, named('Decline'));
    await take(negotiation);
    await take(negotiation);

    expect(treatyLevel(setUp.dependencies, setUp.ai, setUp.human)).equal(
      TreatyLevel.War
    );
    expect(attitude(setUp.dependencies).get(setUp.ai, setUp.human)).equal(100);
    expect(reputation(setUp.dependencies).get(setUp.human)).equal(1);
  });

  it('calls an ally to its war at its audience; refused with nothing to pay, 100 colder (`diplo_ally_demand_help`)', async (): Promise<void> => {
    const setUp = meet({}, {}, 'alliance', 20, { third: {} }),
      enemy = setUp.players[2],
      negotiation = new Negotiation(setUp.ai, setUp.human, setUp.ruleRegistry);

    callAlly(setUp.dependencies, setUp.ai, setUp.human, enemy);

    await take(negotiation);
    await take(negotiation, named('Accept'));
    expect(kinds(negotiation)).eql(['JoinWar']);
    await take(negotiation);
    await take(negotiation, named('Decline'));

    expect(attitude(setUp.dependencies).get(setUp.ai, setUp.human)).equal(100);
    expect(callForHelp(setUp.dependencies, setUp.ai, setUp.human)).equal(null);
  });
});
