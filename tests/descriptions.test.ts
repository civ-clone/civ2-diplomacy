import { EIFFEL_TOWER_PATIENCE, PACIFYING_ATTITUDE } from '../lib/evaluate';
import {
  SPARED_REPUTATION,
  peaceFlags,
  reputationCost,
  reputationRecovers,
  sharesMaps,
} from '../lib/formulas';
import { dependenciesOf, getRules } from '../registerRules';
import { EffectDescription } from '@civ-clone/core-rule/Description';
import { Game } from '@civ-clone/core-game';
import Rule from '@civ-clone/core-rule/Rule';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import { diplomaticWonders } from '../lib/wonders';
import { expect } from 'chai';

// What the diplomatic wonders say they do in talks, for the Civilopedia (civ-clone/web-renderer#1291), checked against
//  the formulas that apply them. Each number is one constant that the formula and its description both read.

const {
    'eiffel-tower': EiffelTower,
    'great-wall': GreatWall,
    'magellans-expedition': MagellansExpedition,
    'marco-polos-embassy': MarcoPolosEmbassy,
    'united-nations': UnitedNations,
  } = diplomaticWonders,
  rules = (): Rule[] => {
    const game = new Game();

    return getRules(dependenciesOf(game), game);
  },
  describedBy = (rules: Rule[]): [Rule, EffectDescription][] =>
    rules.flatMap((rule) =>
      rule
        .descriptions()
        .map((description): [Rule, EffectDescription] => [rule, description])
    ),
  only = (subject: Function, type: string): [Rule, EffectDescription] => {
    const found = describedBy(rules()).filter(
      ([, description]) =>
        description.subject === subject && description.type === type
    );

    expect(found, `${subject.name} ${type}`).length(1);

    return found[0];
  };

describe('descriptions', (): void => {
  it('every diplomatic wonder says what it does in talks', (): void => {
    const subjects = new Set(
      describedBy(rules()).map(([, description]) => description.subject)
    );

    Object.values(diplomaticWonders).forEach(
      (WonderType) => expect(subjects.has(WonderType), WonderType.name).true
    );
  });

  it('each wonder says each thing once', (): void => {
    const lines = describedBy(rules()).map(
      ([, description]) =>
        `${(description.subject as Function).name} ${description.type}`
    );

    expect(lines).eql([...new Set(lines)]);
  });

  it('the Great Wall and the United Nations: peace accepted, no aggression, warmer talks as talks open', (): void => {
    [GreatWall, UnitedNations].forEach((subject) => {
      const [step] = only(subject, 'talks_peace'),
        [begin, attitude] = only(subject, 'talks_attitude'),
        [noTribute] = only(subject, 'talks_no_tribute');

      expect(step).instanceOf(Step);
      expect(begin.id()).equal('civ2-diplomacy:negotiation/interaction/begin');
      expect(noTribute.id()).equal(begin.id());
      expect(attitude.value).equal(PACIFYING_ATTITUDE);
    });

    expect(PACIFYING_ATTITUDE).equal(10);

    const hostile = {
      level: 3,
      targetIsLeader: true,
      attitude: 90,
      reputation: 9,
      targetFightingAndStrong: false,
      targetIsPersonsAlly: false,
      vendetta: true,
      attack: 1,
    };

    expect(peaceFlags({ ...hostile, personPacifies: false })).equal(0);
    expect(peaceFlags({ ...hostile, personPacifies: true })).not.equal(0);
  });

  it("Marco Polo's computer owner asks more tribute", (): void => {
    const [begin, description] = only(MarcoPolosEmbassy, 'tribute_demand');

    expect(begin.id()).equal('civ2-diplomacy:negotiation/interaction/begin');
    expect(description.step).equal('more');
  });

  it("Marco Polo's and Magellan's share maps without an alliance", (): void => {
    [MarcoPolosEmbassy, MagellansExpedition].forEach((subject) =>
      expect(only(subject, 'shared_maps')[0]).instanceOf(Step)
    );

    const unallied = {
      allied: false,
      attitude: 10,
      personKnowsMapMaking: true,
      computerKnowsMapMaking: true,
    };

    expect(sharesMaps({ ...unallied, personOwnsMapWonder: false })).false;
    expect(sharesMaps({ ...unallied, personOwnsMapWonder: true })).true;
  });

  it('the Eiffel Tower: more patience, a point of reputation spared, faster recovery, warmer drift', (): void => {
    const [step, patience] = only(EiffelTower, 'talks_patience'),
      [reputationRule, spared] = only(EiffelTower, 'reputation_spared'),
      [recoveryRule] = only(EiffelTower, 'reputation_recovery'),
      [driftRule] = only(EiffelTower, 'attitude_drift');

    expect(step).instanceOf(Step);
    expect(patience.value).equal(EIFFEL_TOWER_PATIENCE);
    expect(EIFFEL_TOWER_PATIENCE).equal(1);

    expect(reputationRule.id()).equal('civ2-diplomacy:declared-war/reputation');
    expect(spared.value).equal(SPARED_REPUTATION);
    expect(
      reputationCost('treaty', false, true, false, false, false) -
        reputationCost('treaty', false, true, false, true, false)
    ).equal(spared.value);
    expect(
      reputationCost('alliance', false, true, false, false, false) -
        reputationCost('alliance', false, true, false, true, false)
    ).equal(spared.value);

    expect(recoveryRule.id()).equal(
      'civ2-diplomacy:player/turn-start/reputation-recovery'
    );
    // Checked every 12 × (level + 1) turns: without it, only on every second check and not below 1.
    expect(reputationRecovers(48, 3, 2, false)).false;
    expect(reputationRecovers(48, 3, 2, true)).true;
    expect(reputationRecovers(96, 3, 1, false)).false;
    expect(reputationRecovers(96, 3, 1, true)).true;

    expect(driftRule.id()).equal(
      'civ2-diplomacy:player/turn-start/attitude-drift'
    );
  });
});
