import {
  espionageIncident,
  forceWar,
  incidentOfferAccepted,
  incited,
  nuclearDeviceDiscovered,
} from '../lib/espionage';
import {
  makeAlliance,
  makeCeasefire,
  makePeace,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import { SNEAK_ATTACK, hasFlag } from '../lib/flags';
import { TreatyLevel } from '@civ-clone/base-diplomacy/lib/treatyLevel';
import { Bronze, Side, Wheel, position } from './lib/position';
import AgentLost from '@civ-clone/base-unit-agent/Rules/AgentLost';
import Effect from '@civ-clone/core-rule/Effect';
import EstablishEmbassy from '@civ-clone/base-unit-action-establish-embassy/EstablishEmbassy';
import IndustrialSabotage from '@civ-clone/base-unit-action-industrial-sabotage/IndustrialSabotage';
import Player from '@civ-clone/core-player/Player';
import PoisonWater from '@civ-clone/base-unit-action-poison-water/PoisonWater';
import SenateScandal from '../Rules/SenateScandal';
import StealTechnology from '@civ-clone/base-unit-action-steal-technology/StealTechnology';
import { attitude, reputation } from '../lib/relations';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { treaty, vendetta } from '../lib/standing';
import { expect } from 'chai';

// OpenCiv2 `diplo_espionage_incident` (`diplomacy.cpp:5209-5320`), `diplo_force_war` (`:6861-6887`) and the planted
//  nuclear device's discovery (`unit_spy.cpp:705-712`).
describe('espionage', (): void => {
  const setUp = (
    perpetrator: Side,
    victim: Side,
    level: TreatyLevel | null = TreatyLevel.Contact,
    random = () => 0
  ) => {
    const game = position([perpetrator, victim], { random }),
      [perp, vict] = game.players,
      scandals: Player[] = [];

    game.ruleRegistry.register(
      new SenateScandal(new Effect((player: Player) => scandals.push(player)))
    );

    if (level !== null) {
      makeContact(game.interactionRegistry, perp, vict, game.ruleRegistry);
    }

    if (level === TreatyLevel.Ceasefire) {
      makeCeasefire(game.dependencies, perp, vict);
    }

    if (level === TreatyLevel.Peace) {
      makePeace(game.dependencies, perp, vict);
    }

    if (level === TreatyLevel.Alliance) {
      makeAlliance(game.dependencies, perp, vict);
    }

    if (level === TreatyLevel.War) {
      forceWar(game.dependencies, perp, vict);
    }

    const attitudes = attitude(game.dependencies);

    attitudes.set(vict, perp, 40);
    attitudes.set(perp, vict, 40);

    return { ...game, perp, vict, scandals, attitudes };
  };

  it('does nothing at war (`diplomacy.cpp:5218`)', (): void => {
    const { dependencies, perp, vict, attitudes, scandals } = setUp(
      { human: true, government: 'democracy' },
      {},
      TreatyLevel.War
    );

    attitudes.set(vict, perp, 40);

    expect(espionageIncident(dependencies, perp, vict, () => 0)).equal('none');
    expect(attitudes.get(vict, perp)).equal(40);
    expect(scandals).eql([]);
  });

  it('makes the victim 20 colder with no treaty, and nothing more (`:5220`)', (): void => {
    const { dependencies, perp, vict, attitudes, scandals } = setUp(
      { human: true, government: 'democracy' },
      {}
    );

    expect(espionageIncident(dependencies, perp, vict, () => 0)).equal(
      'attitude'
    );
    expect(attitudes.get(vict, perp)).equal(60);
    expect(scandals).eql([]);
  });

  it("makes a person under a peace or ceasefire declare war, costing reputation, and brings a Democracy's Senate down (`:5269-5273`, `:5295-5321`)", (): void => {
    [TreatyLevel.Ceasefire, TreatyLevel.Peace].forEach((level) => {
      const { dependencies, perp, vict, scandals } = setUp(
        { human: true, government: 'democracy' },
        {},
        level
      );

      expect(espionageIncident(dependencies, perp, vict, () => 0)).equal('war');
      expect(treaty(dependencies, perp, vict)).equal(TreatyLevel.War);
      expect(reputation(dependencies).get(perp)).greaterThan(0);
      // `diplo_declare_war` sets no attitude: only `diplo_force_war` makes them 100.
      expect(attitude(dependencies).get(vict, perp)).equal(40);
      expect(scandals).eql([perp]);
    });
  });

  it('brings a Republic down one time in two, and no other government (`:5297-5305`)', (): void => {
    const republic = (roll: number) =>
      setUp(
        { human: true, government: 'republic' },
        {},
        TreatyLevel.Peace,
        () => roll
      );

    [0.49, 0.5].forEach((roll, index) => {
      const { dependencies, perp, vict, scandals } = republic(roll);

      espionageIncident(dependencies, perp, vict, () => roll);
      expect(scandals.length).equal(index === 0 ? 1 : 0);
    });

    const { dependencies, perp, vict, scandals } = setUp(
      { human: true },
      {},
      TreatyLevel.Peace
    );

    espionageIncident(dependencies, perp, vict, () => 0);
    expect(scandals).eql([]);
  });

  it('is terror for a Fundamentalist person: a vendetta and 10 colder, no war (`:5258-5267`)', (): void => {
    const { dependencies, perp, vict, attitudes } = setUp(
      { human: true, government: 'fundamentalism' },
      {},
      TreatyLevel.Peace
    );

    expect(espionageIncident(dependencies, perp, vict, () => 0)).equal(
      'terror'
    );
    expect(vendetta(dependencies, vict, perp)).true;
    expect(attitudes.get(vict, perp)).equal(50);
    expect(treaty(dependencies, perp, vict)).equal(TreatyLevel.Peace);
  });

  it('cancels an alliance, but an ally stealing while behind costs only 5 to 19 (`:5278-5292`)', (): void => {
    const cancelled = setUp(
      { human: true, advances: [Bronze] },
      { advances: [Bronze, Wheel] },
      TreatyLevel.Alliance
    );

    expect(
      espionageIncident(
        cancelled.dependencies,
        cancelled.perp,
        cancelled.vict,
        () => 0
      )
    ).equal('alliance-cancelled');
    expect(
      treaty(cancelled.dependencies, cancelled.perp, cancelled.vict)
    ).equal(TreatyLevel.Peace);

    [
      [0, 45],
      [0.999, 59],
    ].forEach(([roll, expected]) => {
      const { dependencies, perp, vict, attitudes, scandals } = setUp(
        { human: true, government: 'democracy', advances: [Bronze] },
        { advances: [Bronze, Wheel] },
        TreatyLevel.Alliance
      );

      expect(
        espionageIncident(dependencies, perp, vict, () => roll, {
          theft: true,
        })
      ).equal('wimp-out');
      expect(attitudes.get(vict, perp)).equal(expected);
      expect(treaty(dependencies, perp, vict)).equal(TreatyLevel.Alliance);
      expect(scandals).eql([]);
    });

    const even = setUp(
      { human: true, advances: [Bronze, Wheel] },
      { advances: [Bronze, Wheel] },
      TreatyLevel.Alliance
    );

    expect(
      espionageIncident(even.dependencies, even.perp, even.vict, () => 0, {
        theft: true,
      })
    ).equal('alliance-cancelled');
  });

  it('offers a person who is the victim war or the end of an alliance, unless the perpetrator is Fundamentalist (`:5226-5256`)', (): void => {
    const peace = setUp({}, { human: true }, TreatyLevel.Peace);

    expect(
      espionageIncident(peace.dependencies, peace.perp, peace.vict, () => 0)
    ).equal('offered');
    expect(treaty(peace.dependencies, peace.perp, peace.vict)).equal(
      TreatyLevel.Peace
    );

    incidentOfferAccepted(peace.dependencies, peace.perp, peace.vict);
    expect(treaty(peace.dependencies, peace.perp, peace.vict)).equal(
      TreatyLevel.War
    );
    expect(reputation(peace.dependencies).get(peace.vict)).equal(0);

    const allied = setUp({}, { human: true }, TreatyLevel.Alliance);

    incidentOfferAccepted(allied.dependencies, allied.perp, allied.vict);
    expect(treaty(allied.dependencies, allied.perp, allied.vict)).equal(
      TreatyLevel.Peace
    );

    const terror = setUp(
      { government: 'fundamentalism' },
      { human: true },
      TreatyLevel.Peace
    );

    expect(
      espionageIncident(terror.dependencies, terror.perp, terror.vict, () => 0)
    ).equal('none');
  });

  it('does nothing between two computer players under a treaty', (): void => {
    const { dependencies, perp, vict, attitudes } = setUp(
      {},
      {},
      TreatyLevel.Peace
    );

    expect(espionageIncident(dependencies, perp, vict, () => 0)).equal('none');
    expect(attitudes.get(vict, perp)).equal(40);
    expect(treaty(dependencies, perp, vict)).equal(TreatyLevel.Peace);
  });

  it('forces war: 100 both ways, a sneak attack marked once (`diplo_force_war`)', (): void => {
    const { dependencies, perp, vict, attitudes } = setUp(
      {},
      {},
      TreatyLevel.Peace
    );

    expect(forceWar(dependencies, perp, vict)).true;
    expect(treaty(dependencies, perp, vict)).equal(TreatyLevel.War);
    expect(attitudes.get(vict, perp)).equal(100);
    expect(attitudes.get(perp, vict)).equal(100);
    expect(hasFlag(dependencies, perp, vict, SNEAK_ATTACK)).true;
    expect(forceWar(dependencies, perp, vict)).false;
    expect(reputation(dependencies).get(perp)).equal(0);

    const unmet = setUp({}, {}, null);

    expect(forceWar(unmet.dependencies, unmet.perp, unmet.vict)).false;
    expect(treaty(unmet.dependencies, unmet.perp, unmet.vict)).equal(
      TreatyLevel.Contact
    );
  });

  it('incites at the plain price with an incident and a forced war, and at the doubled one with a vendetta only (`unit_spy.cpp:835-846`, `city.cpp:5404`)', (): void => {
    const plain = setUp(
      { human: true, government: 'democracy' },
      {},
      TreatyLevel.Peace
    );

    incited(plain.dependencies, plain.perp, plain.vict, false, () => 0);
    expect(treaty(plain.dependencies, plain.perp, plain.vict)).equal(
      TreatyLevel.War
    );
    expect(plain.scandals).eql([plain.perp]);

    const doubled = setUp(
      { human: true, government: 'democracy' },
      {},
      TreatyLevel.Peace
    );

    incited(doubled.dependencies, doubled.perp, doubled.vict, true, () => 0);
    expect(treaty(doubled.dependencies, doubled.perp, doubled.vict)).equal(
      TreatyLevel.Peace
    );
    expect(vendetta(doubled.dependencies, doubled.vict, doubled.perp)).true;
    expect(doubled.scandals).eql([]);

    const computer = setUp({}, {}, TreatyLevel.Peace);

    incited(
      computer.dependencies,
      computer.perp,
      computer.vict,
      false,
      () => 0
    );
    expect(treaty(computer.dependencies, computer.perp, computer.vict)).equal(
      TreatyLevel.War
    );
  });

  it('turns every civilization met against a discovered nuclear device, at war and 100 colder (`unit_spy.cpp:705-712`)', (): void => {
    const game = position([{}, {}, {}, {}]),
      [planter, ally, met, unmet] = game.players;

    makeContact(game.interactionRegistry, planter, ally, game.ruleRegistry);
    makeContact(game.interactionRegistry, planter, met, game.ruleRegistry);
    makeAlliance(game.dependencies, planter, ally);
    attitude(game.dependencies).set(ally, planter, 0);

    expect(nuclearDeviceDiscovered(game.dependencies, planter)).eql([
      ally,
      met,
    ]);
    expect(treaty(game.dependencies, planter, ally)).equal(TreatyLevel.War);
    expect(treaty(game.dependencies, planter, met)).equal(TreatyLevel.War);
    expect(attitude(game.dependencies).get(ally, planter)).equal(100);
    expect(treaty(game.dependencies, planter, unmet)).equal(
      TreatyLevel.Contact
    );
    expect(reputation(game.dependencies).get(planter)).equal(0);
  });

  it('raises an incident when an agent is removed after a theft, sabotage or poisoning, never when caught (`unit_spy.cpp:99-101`)', (): void => {
    const missions = [
      [StealTechnology, false, 60],
      [IndustrialSabotage, false, 60],
      [PoisonWater, false, 60],
      [StealTechnology, true, 40],
      [EstablishEmbassy, false, 40],
    ] as const;

    missions.forEach(([MissionType, caught, expected]) => {
      const { ruleRegistry, perp, vict, attitudes } = setUp({}, {}),
        unit = { player: () => perp },
        city = { player: () => vict },
        mission = Object.create(MissionType.prototype);

      ruleRegistry.process(AgentLost, unit, city, mission, caught);
      expect(attitudes.get(vict, perp)).equal(expected);
    });
  });
});
