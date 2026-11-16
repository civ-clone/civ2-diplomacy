import { Talks } from '../talks';
import Accepted from '@civ-clone/core-diplomacy/Rules/Proposal/Accepted';
import Advance from '@civ-clone/core-science/Advance';
import Declined from '@civ-clone/core-diplomacy/Rules/Proposal/Declined';
import Dependencies from '../Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import InteractionRule from '@civ-clone/core-diplomacy/Rules/Negotiation/Interaction';
import Player from '@civ-clone/core-player/Player';
import ProposalAvailable from '@civ-clone/base-diplomacy/Rules/ProposalAvailable';
import Resolved from '@civ-clone/core-diplomacy/Rules/Proposal/Resolved';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import Terminated from '@civ-clone/core-diplomacy/Rules/Negotiation/Terminated';
declare global {
  interface ChoiceMetaDataMap {
    'diplomacy.exchange-knowledge': typeof Advance;
  }
}
/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
export declare const PERSON_STEPS = 48;
/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
export declare const stepRules: (talks: Talks) => Step[];
/**
 * Which of the person's proposals the menu offers (`diplo_proposal_menu`, `diplomacy.cpp:2732`): an alliance at peace;
 *  peace when not at peace; asking an ally for help and cancelling an alliance when allied; tribute when not allied and
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war on any other
 *  player, maps) and the gifts always.
 */
export declare const proposalAvailableRules: (
  prefix: string,
  dependencies: Dependencies,
  republican: (player: Player) => boolean
) => ProposalAvailable[];
/**
 * The talks' `Interaction` rules:
 *
 * - `<prefix>:negotiation/interaction/begin`: a meeting between a computer player and a person opens (`begin`), before
 *   anything about it changes;
 * - `<prefix>:negotiation/interaction/contact`: talks make contact;
 * - `<prefix>:negotiation/interaction/audience`: received, they've met this turn; a computer player's own audience
 *   ends any ceasefire and owed tribute (`diplomacy.cpp:4058`) and resets its patience; a person who started a war
 *   finds it out of patience, and one it has an incident with finds it patient (`:4062-4080`);
 * - `<prefix>:negotiation/interaction/spend-patience`: each of the person's proposals costs 1 (the menu's loop); tribute
 *   and an ally's help use it all up; withdrawal costs 1 more.
 */
export declare const interactionRules: (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
) => InteractionRule[];
/**
 * What the talks' answers do (`Resolved`): treaties, payments, wars and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
export declare const resolvedRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
) => Resolved[];
/**
 * What the talks cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard for the
 *  request for an audience too). Each is the computer player's attitude toward the person, and moves its attitude in
 *  the talks with it.
 */
export declare const attitudeRules: (
  prefix: string,
  dependencies: Dependencies
) => (Accepted | Declined)[];
/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance ended, a treaty forced by the person's Senate, a violator's war.
 */
export declare const dialogueRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
) => Resolved[];
/**
 * The end of talks between a computer player and a person (`Terminated`, `diplomacy.cpp:4082-4120`): incidents are
 *  answered; a computer player that meant war keeps its hostile intent, one that didn't loses it; patience: 1 more
 *  unless the person left, up to the limit (and 1 more) after a concession or with a city held; on Chieftain the
 *  person is given an embassy if they aren't at war and it knows Writing.
 */
export declare const terminatedRules: (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
) => Terminated[];
