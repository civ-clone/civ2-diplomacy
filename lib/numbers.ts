import { MeetingStepNumbers } from '@civ-clone/base-diplomacy/lib/meetingSteps';
import { MeetingSpacing } from '@civ-clone/base-diplomacy/lib/rules/mayNegotiate';
import { StanceNumbers } from '@civ-clone/base-diplomacy/lib/stance';

// The meeting's numbers. Civilization II's computer players negotiate by rules of their own (OpenCiv2
//  `src/auto/diplomacy.cpp`, richardpenman/civ2@49f26ec), which aren't read yet: until they are, these are
//  Civilization's (v474.05, as civ1-diplomacy has them), so two Civ2 players meet and make war or peace as Civ1's do.

export const stanceNumbers: StanceNumbers = {
  fearWeight: (level: number): number => (level === 0 ? 4 : 2),
  ultimatumTurn: 200,
  ultimatumCities: 4,
  topRanking: 7,
  nuclearTribute: 100,
  nuclearFear: 4,
  tributeDivisor: 32,
  tributeUnit: 50,
  tributeUnits: 20,
};

export const stepNumbers: MeetingStepNumbers = {
  openKnowledge: 6,
  provokingTribute: 50,
  goldUnit: 50,
  advanceGiftFear: 4,
  goldGift: (fear: number): number => 2 * fear - 4,
};

export const spacing: MeetingSpacing = {
  withPerson: 16,
  withPersonAfterTreaty: 32,
  computers: 4,
};

/** How often a computer player keeping a peace it means to break drops it, each turn. */
export const dropShamPeaceChance = 1 / 3;

/** How often a computer player waives its tribute when the other cancels a treaty with its enemy. */
export const waiveTributeChance = 0.5;

/** Four times the ratio of attack to strength must reach this, plus reluctance, for two computer players to fight. */
export const warThreshold = 4;
