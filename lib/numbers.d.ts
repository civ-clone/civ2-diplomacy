import { MeetingStepNumbers } from '@civ-clone/base-diplomacy/lib/meetingSteps';
import { MeetingSpacing } from '@civ-clone/base-diplomacy/lib/rules/mayNegotiate';
import { StanceNumbers } from '@civ-clone/base-diplomacy/lib/stance';
export declare const stanceNumbers: StanceNumbers;
export declare const stepNumbers: MeetingStepNumbers;
export declare const spacing: MeetingSpacing;
/** How often a computer player keeping a peace it means to break drops it, each turn. */
export declare const dropShamPeaceChance: number;
/** How often a computer player waives its tribute when the other cancels a treaty with its enemy. */
export declare const waiveTributeChance = 0.5;
/** Four times the ratio of attack to strength must reach this, plus reluctance, for two computer players to fight. */
export declare const warThreshold = 4;
