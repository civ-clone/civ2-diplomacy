import { IProposal } from '@civ-clone/core-diplomacy/Negotiation/Proposal';
import { Evaluation } from './evaluate';
import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import Player from '@civ-clone/core-player/Player';
/** The dialogue keys the computer player says. The words are the renderer's. */
export declare const DIALOGUE: {
  allyDismissed: string;
  war: string;
  warContinues: string;
  allyTaunts: string;
  senateForcedCeasefire: string;
  senateForcedPeace: string;
  withdrawn: string;
};
export interface TalksRules {
  dependencies: Dependencies;
  random: () => number;
}
export interface Sides {
  computer: Player;
  person: Player;
  computerLed: boolean;
}
/** The two sides of a meeting between a computer player and a person, or `null` for any other meeting. */
export declare const sidesOf: (
  dependencies: Dependencies,
  negotiation: Negotiation
) => Sides | null;
/** The computer player's evaluation, made the first time the meeting asks for it. */
export declare const evaluationOf: (
  dependencies: Dependencies,
  negotiation: Negotiation,
  { computer, person }: Sides
) => Evaluation;
/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
export declare const agendaItemOf: (action: object) => number | undefined;
/** The person's proposal a computer player's ask belongs to, or `null`. */
export declare const askedFor: (action: object) => IProposal | null;
/** The agenda, in the original's order. */
export declare const AGENDA: {
  exchange: number;
  warOnTarget: number;
  tribute: number;
  tech: number;
  dismissal: number;
  threat: number;
  alliance: number;
  ceasefire: number;
  peace: number;
  menu: number;
};
/** How the computer player answers one of the person's proposals. */
export interface Plan {
  asks: (() => IProposal | null)[];
  offIfRefused: (index: number) => boolean;
  accept: boolean;
  thenSays: string | null;
}
/** What the computer player gives for the person's `AskAlly`, if it agreed. */
export declare const allyGiftFor: (
  proposal: IProposal
) => Advance | Gold | null;
export declare const talks: ({ dependencies, random }: TalksRules) => {
  computerStep: (negotiation: Negotiation) => IAction | null;
  personSteps: (negotiation: Negotiation) => IAction[];
  planFor: (
    negotiation: Negotiation,
    sides: Sides,
    proposal: IProposal
  ) => Plan;
  menu: (negotiation: Negotiation, sides: Sides) => IProposal[];
  evaluationOf: (negotiation: Negotiation, sides: Sides) => Evaluation;
  allyGives: (negotiation: Negotiation, sides: Sides) => Advance | Gold | null;
  personDemandTribute: (
    negotiation: Negotiation,
    sides: Sides,
    proposal: 3 | 4 | 5
  ) => number;
  lastContactTurns: (computer: Player, person: Player) => number;
};
export type Talks = ReturnType<typeof talks>;
export default talks;
