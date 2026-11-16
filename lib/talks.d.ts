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
  helpRefused: string;
  violatorsRefused: string;
};
/** The computer player's business, in the original's order. */
export declare const AGENDA: {
  callForHelp: number;
  violators: number;
  exchange: number;
  warOnTarget: number;
  tribute: number;
  tech: number;
  dismissal: number;
  threat: number;
  alliance: number;
  ceasefire: number;
  peace: number;
  done: number;
};
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
/** One meeting's state: the original's `diplo_eval` and `diplo_ai_meet_player_talk`'s locals. */
export interface Meeting {
  sides: Sides;
  evaluation: Evaluation;
  live: {
    value: number;
  };
  aggressive: boolean;
  declareWar: boolean;
  warTarget: Player | null;
  tribute: number;
  fear: number;
  hadCeasefire: boolean;
  noContact: boolean;
  lastContactTurn: number | null;
  hostile: boolean;
  paid: boolean;
  propose: boolean;
  declaredWar: boolean;
  treatyMade: boolean;
  senateBlocked: boolean;
  conceded: boolean;
  ended: boolean;
  gifts: number;
}
/** The meeting's state, made when it opens (`begin`), or `null` for a meeting that isn't between a computer and a person. */
export declare const meetingOf: (negotiation: Negotiation) => Meeting | null;
/**
 * Opens the meeting (`diplo_ai_meet_player`, `:4017-4080`), before anything is said: the computer player's evaluation
 *  of the person, its attitude in talks made live, and what held as it opened. A computer player's own audience resets
 *  its patience (and ends any ceasefire: `Rules/talks`); a person who started a war with it finds it out of patience,
 *  and one with an incident to answer finds it patient.
 */
export declare const begin: (
  dependencies: Dependencies,
  negotiation: Negotiation
) => Meeting | null;
/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
export declare const agendaItemOf: (action: object) => number | undefined;
/** The proposal a computer player's ask belongs to, or `null`. */
export declare const askedFor: (action: object) => IProposal | null;
/** What a proposal's answer brings, worked out with the answer and carried out by `Rules/talks`. */
export interface Outcome {
  patience?: number;
  end?: boolean;
  says?: string | null;
  gives?: (Advance | Gold)[];
  takes?: Advance | null;
  attitude?: number;
  ceasefire?: boolean;
  withdraws?: boolean;
  war?: boolean;
  cancelsAlliance?: boolean;
  alsoTakes?: Advance[];
}
/** What answering `action` brings, if anything (`Outcome`). */
export declare const outcomeOf: (action: object) => Outcome;
/**
 * A computer player's payment to its ally for joining its war on `enemy` (`diplo_ally_demand_help`, `:1300-1320`): the
 *  threat `enemy` poses where it has cities, in 50s, up to what it has.
 */
export declare const helpBonus: (
  dependencies: Dependencies,
  computer: Player,
  enemy: Player
) => number;
/** Whether the person's Senate made it accept `proposal`. */
export declare const wasForced: (proposal: object) => boolean;
/** How the computer player answers the person's proposal, ask by ask (`diplo_ai_answer_proposal` and the menus). */
export interface Answer {
  asks: (() => IProposal | null)[];
  off: (index: number) => Outcome | null;
  accept: boolean;
  onAccept: Outcome;
  onDecline: Outcome;
}
export interface TalksRules {
  dependencies: Dependencies;
  random: () => number;
}
export declare const talks: ({ dependencies, random }: TalksRules) => {
  computerStep: (negotiation: Negotiation) => IAction | null;
  personSteps: (negotiation: Negotiation) => IAction[];
  menu: (negotiation: Negotiation, meeting: Meeting) => IProposal[];
  answerTo: (
    negotiation: Negotiation,
    meeting: Meeting,
    proposal: IProposal
  ) => Answer;
  limitOf: (meeting: Meeting) => number;
  exchange: (
    meeting: Meeting,
    mode: 0 | 1 | 2 | 3,
    second?: boolean
  ) =>
    | {
        kind: 'none';
      }
    | {
        kind: 'refuse';
      }
    | {
        kind: 'sell';
        advance: Advance;
        price: number;
      }
    | {
        kind: 'gift';
        advance: Advance;
      }
    | {
        kind: 'petty';
      }
    | {
        kind: 'offer';
        takes: Advance;
        value: number;
      };
};
export type Talks = ReturnType<typeof talks>;
export default talks;
