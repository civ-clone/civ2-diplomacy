import {
  AllianceInputs,
  PeaceInputs,
  WarPriceInputs,
  allianceWilling,
  asksSweetener,
  breakChance,
  demandAttitude,
  demandedTribute,
  gangsUp,
  goldAttitudeValue,
  joinsWar,
  peaceFlags,
  reputationCost,
  reputationRecovers,
  sellPrice,
  senateSteps,
  senateThreshold,
  sharesMaps,
  startingAttitude,
  sweetenerGold,
  warDistrust,
  warPrice,
} from '../lib/formulas';
import { expect } from 'chai';

// Each formula either side of its thresholds (OpenCiv2 `src/auto/diplomacy.cpp`, Classic).
describe('formulas', (): void => {
  it('values gold: the first 50 at 1 in 10, then each 100 at 1 in 15, 20, …', (): void => {
    expect([0, 9, 10, 50, 64, 65, 150, 249, 250].map(goldAttitudeValue)).eql([
      0, 0, 1, 5, 5, 6, 11, 15, 16,
    ]);
  });

  describe('an alliance', (): void => {
    const willing: AllianceInputs = {
        level: 3,
        personAllies: 1,
        hasWarTarget: true,
        computerRank: 5,
        personRank: 5,
        computerStrength: 10,
        personStrength: 10,
        targetIsLeader: false,
        fear: 0,
        peaceInclination: 1,
        attitude: 38,
        reputation: 2,
        turn: 50,
        targetFightingAndStrong: false,
        commonEnemy: false,
        vendetta: false,
        targetIsPersonsAlly: false,
        patienceSpent: 4,
      },
      agrees = (changes: Partial<AllianceInputs>): boolean =>
        allianceWilling({ ...willing, ...changes }).agree;

    it('is agreed below attitude level 4 when the score is under its wish for peace', (): void => {
      expect(agrees({})).true;
      expect(agrees({ attitude: 39 })).false;
      expect(agrees({ peaceInclination: 0 })).false;
    });

    it('is refused above reputation 2 (4 on Chieftain), above attitude 75 and past patience 4', (): void => {
      expect(agrees({ reputation: 3 })).false;
      expect(agrees({ reputation: 3, level: 0 })).true;
      expect(agrees({ reputation: 5, level: 0 })).false;
      expect(agrees({ patienceSpent: 5 })).false;
      expect(agrees({ attitude: 76, targetIsPersonsAlly: true })).false;
      expect(agrees({ attitude: 75, targetIsPersonsAlly: true })).true;
    });

    it("is forced when the target is the person's ally, or a low rank after rank × 20 turns", (): void => {
      expect(
        allianceWilling({ ...willing, attitude: 60, targetIsPersonsAlly: true })
      ).eql({ agree: true, reasons: 1 });
      expect(agrees({ attitude: 60, personRank: 3, turn: 61 })).true;
      expect(agrees({ attitude: 60, personRank: 3, turn: 60 })).false;
    });
  });

  describe('peace', (): void => {
    const willing: PeaceInputs = {
        level: 3,
        targetIsLeader: false,
        attitude: 50,
        reputation: 4,
        targetFightingAndStrong: false,
        targetIsPersonsAlly: false,
        vendetta: false,
        attack: 0,
        personPacifies: false,
      },
      flags = (changes: Partial<PeaceInputs>): number =>
        peaceFlags({ ...willing, ...changes });

    it('is willing below attitude 51 and at reputation 4 or less (6 on Chieftain)', (): void => {
      expect(flags({})).equal(1);
      expect(flags({ attitude: 51 })).equal(0);
      expect(flags({ reputation: 5 })).equal(0);
      expect(flags({ reputation: 6, level: 0 })).equal(1);
      expect(flags({ reputation: 7, level: 0 })).equal(0);
    });

    it('is always accepted from the owner of the Great Wall or the United Nations', (): void => {
      expect(
        flags({ attitude: 90, reputation: 9, personPacifies: true })
      ).equal(8);
    });

    it('is vetoed by a vendetta above 2 less the attack attitude', (): void => {
      expect(flags({ vendetta: true, reputation: 2 })).equal(1);
      expect(flags({ vendetta: true, reputation: 3 })).equal(0);
      expect(flags({ vendetta: true, reputation: 3, attack: -1 })).equal(1);
    });
  });

  it('asks a sweetener of its share of the gold by strength, plus the reputation', (): void => {
    expect(sweetenerGold(1000, 10, 9, 0, false)).equal(500);
    expect(sweetenerGold(1000, 10, 10, 0, false)).equal(450);
    // The weaker asks in 100s, cut to what the person has.
    expect(sweetenerGold(1000, 9, 10, 0, false)).equal(900);
    expect(sweetenerGold(500, 9, 10, 0, false)).equal(400);
    expect(sweetenerGold(1000, 10, 9, 2, true)).equal(700);
    expect(sweetenerGold(100, 10, 9, 0, false)).equal(50);
    expect(asksSweetener(1, 50, 1, false, false)).false;
    expect(asksSweetener(2, 50, 1, false, false)).true;
    expect(asksSweetener(1, 51, 1, false, false)).true;
    expect(asksSweetener(1, 25, 0, false, true)).false;
    expect(asksSweetener(1, 26, 0, false, true)).true;
  });

  it('pays tribute by fear, none within 8 turns of contact, half within 16 and without peace, none with a Wall', (): void => {
    const tribute = (changes: object) =>
      demandedTribute({
        proposal: 4,
        fear: 4,
        computerGold: 500,
        computerRank: 3,
        personRank: 5,
        turnsSinceContact: 16,
        atPeace: true,
        computerPacifies: false,
        ...changes,
      });

    expect(tribute({})).equal(200);
    expect(tribute({ turnsSinceContact: 15 })).equal(100);
    expect(tribute({ turnsSinceContact: 7 })).equal(0);
    expect(tribute({ atPeace: false })).equal(100);
    expect(tribute({ computerGold: 149 })).equal(100);
    expect(tribute({ computerPacifies: true })).equal(0);
    // An ally asked by a lower-ranked one gives by rank.
    expect(
      tribute({ proposal: 3, fear: 0, computerRank: 6, personRank: 4 })
    ).equal(100);
  });

  it('costs attitude for a demand: withdrawal 2, tribute 10, an ally 10, 5 or 0', (): void => {
    expect(demandAttitude(5, 3, 3, 10, 10)).equal(2);
    expect(demandAttitude(4, 3, 3, 10, 10)).equal(10);
    expect(demandAttitude(3, 4, 5, 10, 10)).equal(10);
    expect(demandAttitude(3, 6, 5, 10, 11)).equal(5);
    expect(demandAttitude(3, 6, 5, 10, 9)).equal(0);
    expect(demandAttitude(3, 3, 3, 10, 10)).equal(0);
  });

  it('shares maps allied (or with a map wonder), at attitude 25 or less, both with Map Making', (): void => {
    const maps = (changes: object) =>
      sharesMaps({
        allied: true,
        personOwnsMapWonder: false,
        attitude: 25,
        personKnowsMapMaking: true,
        computerKnowsMapMaking: true,
        ...changes,
      });

    expect(maps({})).true;
    expect(maps({ attitude: 26 })).false;
    expect(maps({ allied: false })).false;
    expect(maps({ allied: false, personOwnsMapWonder: true })).true;
    expect(maps({ allied: false, attitude: 0 })).true;
    expect(maps({ computerKnowsMapMaking: false })).false;
  });

  it('prices a war and weighs its distrust', (): void => {
    const price = (changes: Partial<WarPriceInputs>) =>
      warPrice({
        personReputation: 0,
        targetReputation: 0,
        credit: 0,
        computerGold: 1000,
        personGold: 500,
        targetStrength: 100,
        computerTreatyWithTarget: true,
        computerAlliedWithTarget: false,
        targetIsLeader: false,
        personAtWarWithTarget: true,
        allied: false,
        computerAtWarWithAnyone: true,
        targetSneakAttackedPerson: false,
        personRank: 4,
        computerRank: 4,
        targetRank: 4,
        targetNukedPerson: false,
        personNukedTarget: false,
        ...changes,
      });

    // (0 + 10 − 0 − 0) × 50 / 50 = 10 → 500; ÷ 100 = 5 → 250.
    expect(price({})).equal(250);
    expect(price({ computerTreatyWithTarget: false })).equal(150);
    expect(price({ targetStrength: 0 })).equal(50);

    const distrust = warDistrust({
      reputation: 4,
      attack: 0,
      vendetta: false,
      personAtWarWithTarget: false,
      targetRank: 3,
      personRank: 4,
      computerRank: 4,
      allied: false,
    });

    expect(distrust).equal(6);
    expect(joinsWar(6, true, false, false, false)).true;
    expect(joinsWar(7, true, false, true, false)).false;
    expect(joinsWar(7, false, false, true, false)).true;
  });

  it('prices an advance, at least 100', (): void => {
    const sell = (changes: object) =>
      sellPrice({
        value: 5,
        knowers: 3,
        attitude: 50,
        personTopPowerAfter200: false,
        level: 3,
        personGold: 0,
        allied: false,
        personBehind: false,
        personFarBehind: false,
        ...changes,
      });

    expect(sell({})).equal(500);
    expect(sell({ attitude: 60 })).equal(600);
    expect(sell({ personGold: 1501 })).equal(750);
    expect(sell({ value: 1, knowers: 30 })).equal(100);
  });

  it("steps in, or not, on the turn's roll", (): void => {
    expect(senateThreshold(false, false, 3)).equal(45);
    expect(senateThreshold(true, false, 0)).equal(25);
    expect(senateThreshold(true, true, 3)).equal(75);
    expect(senateSteps('democracy', 44, 45, false)).false;
    expect(senateSteps('democracy', 45, 45, false)).true;
    expect(senateSteps('republic', 45, 45, false)).false;
    expect(senateSteps('republic', 45, 45, true)).true;
    expect(senateSteps('none', 99, 0, true)).false;
  });

  it('costs reputation for broken treaties', (): void => {
    expect(reputationCost('none', false, true, false, false, true)).equal(0);
    expect(reputationCost('treaty', false, true, false, false, false)).equal(1);
    expect(reputationCost('treaty', true, true, false, false, false)).equal(2);
    expect(reputationCost('treaty', false, true, false, false, true)).equal(2);
    expect(reputationCost('treaty', true, true, false, false, true)).equal(4);
    expect(reputationCost('treaty', false, false, false, false, true)).equal(1);
    expect(reputationCost('treaty', false, true, true, false, false)).equal(0);
    expect(reputationCost('alliance', false, true, true, false, false)).equal(
      1
    );
    expect(reputationCost('alliance', false, false, false, true, false)).equal(
      0
    );
    expect(reputationCost('alliance', false, true, false, false, false)).equal(
      2
    );
  });

  it('recovers reputation every 24 × (level + 1) turns, down to 1; with the Eiffel Tower every 12 × and to 0', (): void => {
    expect(reputationRecovers(96, 3, 2, false)).true;
    expect(reputationRecovers(48, 3, 2, false)).false;
    expect(reputationRecovers(96, 3, 1, false)).false;
    expect(reputationRecovers(48, 3, 1, true)).true;
    expect(reputationRecovers(47, 3, 1, true)).false;
    expect(reputationRecovers(96, 3, 0, true)).false;
  });

  it('starts attitudes and gangs up', (): void => {
    expect(startingAttitude(true, 0, 0)).equal(10);
    expect(startingAttitude(true, 5, 79)).equal(75);
    expect(startingAttitude(false, 5, 79)).equal(89);
    expect(gangsUp(6, 1)).false;
    expect(gangsUp(7, 1)).true;
    expect([0, 3, 4, 8, 12].map(breakChance)).eql([3, 3, 2, 1, 1]);
  });
});
