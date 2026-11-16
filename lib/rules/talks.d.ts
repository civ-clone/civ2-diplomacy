import { Talks } from '../talks';
import Accepted from '@civ-clone/core-diplomacy/Rules/Proposal/Accepted';
import Declined from '@civ-clone/core-diplomacy/Rules/Proposal/Declined';
import Dependencies from '../Dependencies';
import Engine from '@civ-clone/core-engine/Engine';
import InteractionRule from '@civ-clone/core-diplomacy/Rules/Negotiation/Interaction';
import Player from '@civ-clone/core-player/Player';
import ProposalAvailable from '@civ-clone/base-diplomacy/Rules/ProposalAvailable';
import Resolved from '@civ-clone/core-diplomacy/Rules/Proposal/Resolved';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import Terminated from '@civ-clone/core-diplomacy/Rules/Negotiation/Terminated';
/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
export declare const PERSON_STEPS = 48;
/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
export declare const stepRules: (talks: Talks) => Step[];
/**
 * Which of the person's proposals the menu offers (`diplo_proposal_menu`, `diplomacy.cpp:2732`): an alliance at peace;
 *  peace when not at peace; asking an ally for help and cancelling an alliance when allied; tribute when not allied and
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war, maps) and
 *  gifts always.
 */
export declare const proposalAvailableRules: (
  prefix: string,
  dependencies: Dependencies,
  republican: (player: Player) => boolean
) => ProposalAvailable[];
/**
 * The talks' `Interaction` rules: a negotiation makes contact; a computer player's audience clears a lingering
 *  ceasefire (`diplo_ai_meet_player`, `:4058`) and resets its patience; each of the person's proposals spends the
 *  computer player's patience.
 */
export declare const interactionRules: (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
) => InteractionRule[];
/**
 * What the talks' answers do (`Resolved`): treaties, payments and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
export declare const resolvedRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
) => Resolved[];
/**
 * What the talks' answers cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard
 *  for the request for an audience too). Each change is the computer player's attitude toward the person.
 */
export declare const attitudeRules: (
  prefix: string,
  dependencies: Dependencies
) => (Accepted | Declined)[];
/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance dismissed, or a treaty forced by the person's Senate.
 */
export declare const dialogueRules: (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
) => Resolved[];
/**
 * At the end of a computer player's talks with a person (`Terminated`): a computer player that meant war keeps its
 *  hostile intent, and on Chieftain the person is given an embassy if they aren't at war and it knows Writing
 *  (`:4110-4119`).
 */
export declare const terminatedRules: (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
) => Terminated[];
