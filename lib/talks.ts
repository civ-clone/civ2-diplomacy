import {
  AGGRESSOR,
  BROKEN,
  CHANGED_THIS_TURN,
  CITY_CAPTURED,
  FIGHTING,
  HOSTILE_INTENT,
  INCIDENT,
  MET_THIS_TURN,
  NUKED,
  SNEAK_ATTACK,
  WAR_THIS_TURN,
  WITHDRAWAL_DEMANDED,
  clearBoth,
  hasFlag,
} from './flags';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import {
  CHIEFTAIN,
  KING,
  advanceCount,
  allied,
  atPeace,
  atWar,
  attack,
  cities,
  civilize,
  hostile,
  human,
  inContact,
  knows,
  level,
  rank,
  strength,
  treaty,
  vendetta,
} from './standing';
import Proposal, {
  IProposal,
} from '@civ-clone/core-diplomacy/Negotiation/Proposal';
import {
  TreatyLevel,
  hasTreatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  AllianceInputs,
  allianceWilling,
  asksSweetener,
  demandAttitude,
  demandedTribute,
  giftGold,
  joinsWar,
  peaceFlags,
  roll,
  sellPrice,
  sharesMaps,
  sweetenerGold,
  warDistrust,
  warPrice,
} from './formulas';
import { Evaluation, attitudeOf, evaluate, patienceLimit } from './evaluate';
import { advanceValue, survey } from './survey';
import { attitudeLevel, beginTalks, reputation } from './relations';
import { ownsWonder, pacifies } from './wonders';
import Accept from '@civ-clone/core-diplomacy/Proposal/Accept';
import Acknowledge from '@civ-clone/core-diplomacy/Proposal/Acknowledge';
import Advance from '@civ-clone/core-science/Advance';
import AskAlly from '@civ-clone/library-diplomacy/Proposals/AskAlly';
import CancelAlliance from '@civ-clone/library-diplomacy/Proposals/CancelAlliance';
import Decline from '@civ-clone/core-diplomacy/Proposal/Decline';
import DemandTribute from '@civ-clone/library-diplomacy/Proposals/DemandTribute';
import DemandWithdrawal from '@civ-clone/library-diplomacy/Proposals/DemandWithdrawal';
import Dependencies from './Dependencies';
import Dialogue from '@civ-clone/core-diplomacy/Negotiation/Dialogue';
import ExchangeKnowledge from '@civ-clone/library-diplomacy/Proposals/ExchangeKnowledge';
import Gift from '@civ-clone/library-diplomacy/Proposals/Gift';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import Initiate from '@civ-clone/core-diplomacy/Negotiation/Initiate';
import JoinWar from '@civ-clone/library-diplomacy/Proposals/JoinWar';
import {
  Conscription,
  Gunpowder,
  MachineTools,
  MapMaking,
  MobileWarfare,
  Robotics,
  Tactics,
} from '@civ-clone/civ2-science/Advances';
import { advances } from '@civ-clone/civ2-science/data/advances';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import OfferCeasefire from '@civ-clone/library-diplomacy/Proposals/OfferCeasefire';
import OfferPeace from '@civ-clone/library-diplomacy/Proposals/OfferPeace';
import Player from '@civ-clone/core-player/Player';
import ProposeAlliance from '@civ-clone/library-diplomacy/Proposals/ProposeAlliance';
import Resolution from '@civ-clone/core-diplomacy/Proposal/Resolution';
import SellAdvance from '@civ-clone/library-diplomacy/Proposals/SellAdvance';
import ShareMaps from '@civ-clone/library-diplomacy/Proposals/ShareMaps';
import Terminate from '@civ-clone/core-diplomacy/Negotiation/Terminate';
import City from '@civ-clone/core-city/City';
import Unit from '@civ-clone/core-unit/Unit';
import Wonder from '@civ-clone/core-wonder/Wonder';
import callForHelp from './callForHelp';
import {
  gold,
  landMassesOf,
  presence,
  presenceOn,
} from '@civ-clone/base-diplomacy/lib/standing';
import { lastContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { proposalAvailable } from '@civ-clone/base-diplomacy/lib/personMeeting';
import { senateBlocks, senateGovernment } from './senate';
import { unitTerms } from './units';

// Civilization II's talks between a computer player and a person (OpenCiv2 `diplo_ai_meet_player`,
//  `diplomacy.cpp:3850-4135`), as the steps of a `Negotiation`. Whoever opens them, the computer player first goes
//  through its own business in the original's order (`AGENDA`), then the person may propose from the menu
//  (`diplo_proposal_menu`) while the computer player's patience lasts, and it answers each proposal (`answerTo`),
//  asking first for whatever the original asks.
//
// What the original keeps in `diplo_eval` for one meeting is the meeting's state (`Meeting`), made when it opens and
//  changed only by the rules that hear its steps (`Rules/talks`): the steps read it and the game, so a client may ask
//  for them as often as it likes. The computer player's attitude in the talks moves with every change to its attitude
//  toward the person (`relations`' `beginTalks`, as `civ_adjust_attitude` moves `cur_attitude`).
//
// Two computer players don't talk here: they meet when their units do (`Rules/civsMeet`, `diplo_civs_meet`).

/** The dialogue keys the computer player says. The words are the renderer's. */
export const DIALOGUE = {
  // It cancels the alliance with an ally that didn't pay (`diplo_meet_ally_dismissed`).
  allyDismissed: 'civ2.ally-dismissed',
  // It declares war: a threat, a refused demand.
  war: 'civ2.war',
  // A refused ceasefire it won't sweeten: the war goes on.
  warContinues: 'civ2.war-continues',
  // Taunted by a strong ally's request, it cancels the alliance (`str_tauntally`).
  allyTaunts: 'civ2.ally-taunts',
  // The person's Senate forced a ceasefire or peace when the person refused to listen.
  senateForcedCeasefire: 'civ2.senate-forced-ceasefire',
  senateForcedPeace: 'civ2.senate-forced-peace',
  // Refused, its ally's call for help (`diplo_ally_demand_help`): the alliance is cancelled.
  helpRefused: 'civ2.help-refused',
  // A violator refusing to withdraw: the person declares war (`diplo_review_violators`).
  violatorsRefused: 'civ2.violators-refused',
};

const ENDING = [
  DIALOGUE.allyDismissed,
  DIALOGUE.war,
  DIALOGUE.warContinues,
  DIALOGUE.allyTaunts,
  DIALOGUE.senateForcedCeasefire,
  DIALOGUE.senateForcedPeace,
  DIALOGUE.helpRefused,
  DIALOGUE.violatorsRefused,
];

/** The computer player's business, in the original's order. */
export const AGENDA = {
  // `diplo_ally_demand_help`, waiting for this audience (`callForHelp`).
  callForHelp: 0,
  // `diplo_review_violators`, waiting for this audience.
  violators: 1,
  exchange: 2,
  warOnTarget: 3,
  tribute: 4,
  tech: 5,
  dismissal: 6,
  threat: 7,
  alliance: 8,
  ceasefire: 9,
  peace: 10,
  done: 11,
};

export interface Sides {
  computer: Player;
  person: Player;
  // Whether the computer player opened the meeting.
  computerLed: boolean;
}

/** The two sides of a meeting between a computer player and a person, or `null` for any other meeting. */
export const sidesOf = (
  dependencies: Dependencies,
  negotiation: Negotiation
): Sides | null => {
  const [first, second] = negotiation.players(),
    firstHuman = human(dependencies, first),
    secondHuman = human(dependencies, second);

  if (firstHuman === secondHuman) {
    return null;
  }

  return firstHuman
    ? { computer: second, person: first, computerLed: false }
    : { computer: first, person: second, computerLed: true };
};

/** One meeting's state: the original's `diplo_eval` and `diplo_ai_meet_player_talk`'s locals. */
export interface Meeting {
  sides: Sides;
  // The evaluation as the meeting opened.
  evaluation: Evaluation;
  // The computer player's attitude in talks (`cur_attitude`), live.
  live: { value: number };
  aggressive: boolean;
  declareWar: boolean;
  warTarget: Player | null;
  // `tribute_demand`; 999 once a demand has been made, as the original marks it.
  tribute: number;
  fear: number;
  hadCeasefire: boolean;
  // No contact before the meeting (`no_contact`), and the last contact turn as it opened (null: never).
  noContact: boolean;
  lastContactTurn: number | null;
  // A city of the computer player's taken by the person (`TREATY_CITY_CAPTURED`): it stays hostile.
  hostile: boolean;
  paid: boolean;
  propose: boolean;
  declaredWar: boolean;
  treatyMade: boolean;
  senateBlocked: boolean;
  conceded: boolean;
  // The person left the menu, or was refused an audience (`ended`).
  ended: boolean;
  // Gifts accepted this meeting (`gifts_this_meeting`).
  gifts: number;
  // The computer player's patience as the person's latest proposal was made, before its own charge: what the
  //  original's answers read (`diplo_request_count`, raised only after the answer).
  patienceBefore: number;
  // How a refused call for help ends, decided by its attitude before the refusal (`:1336-1341`).
  helpRefusal: 'colder' | 'cancel' | null;
}

const meetings = new WeakMap<Negotiation, Meeting>();

/** The meeting's state, made when it opens (`begin`), or `null` for a meeting that isn't between a computer and a person. */
export const meetingOf = (negotiation: Negotiation): Meeting | null =>
  meetings.get(negotiation) ?? null;

/**
 * Opens the meeting (`diplo_ai_meet_player`, `:4017-4080`), before anything is said: the computer player's evaluation
 *  of the person, its attitude in talks made live, and what held as it opened. A computer player's own audience resets
 *  its patience (and ends any ceasefire: `Rules/talks`); a person who started a war with it finds it out of patience,
 *  and one with an incident to answer finds it patient.
 */
export const begin = (
  dependencies: Dependencies,
  negotiation: Negotiation
): Meeting | null => {
  if (meetings.has(negotiation)) {
    return meetings.get(negotiation)!;
  }

  const sides = sidesOf(dependencies, negotiation);

  if (sides === null) {
    return null;
  }

  const { computer, person } = sides,
    evaluation = evaluate(dependencies, computer, person),
    last = lastContact(dependencies, computer, person),
    meeting: Meeting = {
      sides,
      evaluation,
      live: { value: evaluation.attitude },
      aggressive: evaluation.aggressive,
      declareWar: evaluation.declareWar,
      warTarget: evaluation.warTarget,
      tribute: evaluation.tribute,
      fear: evaluation.fear,
      hadCeasefire:
        treaty(dependencies, computer, person) === TreatyLevel.Ceasefire,
      // Units that meet make contact (base-diplomacy's `movedRules`) before talks open; the original opens them first,
      //  so contact made this turn with no talks before counts as none.
      noContact:
        !inContact(dependencies, computer, person) ||
        (last === undefined &&
          dependencies.interactionRegistry
            .getByPlayers(computer, person)
            .some(
              (interaction) =>
                interaction instanceof Contact &&
                interaction.when() === dependencies.turn.value()
            )),
      lastContactTurn: last === undefined || last < 0 ? null : last,
      hostile: hasFlag(dependencies, computer, person, CITY_CAPTURED),
      paid: false,
      propose: false,
      declaredWar: false,
      treatyMade: false,
      senateBlocked: false,
      conceded: false,
      ended: false,
      gifts: 0,
      patienceBefore: patience(dependencies, computer, person).spent(),
      helpRefusal: null,
    };

  // The Great Wall's or the United Nations' owner has no incident to answer (`:451`).
  if (pacifies(dependencies, person)) {
    clearBoth(dependencies, computer, person, INCIDENT);
  }

  meetings.set(negotiation, meeting);
  beginTalks(computer, person, meeting.live);

  return meeting;
};

/**
 * `diplo_meet_reputation_war` (`diplomacy.cpp:3579`): a person whose reputation, less the computer player's credit, is
 *  above 6 and against whom it holds a vendetta, when it has allies, or the person leads the world, or is the weaker,
 *  is one it means war with (`ai_declare_war`): no Senate forces a treaty then, and it keeps its hostile intent.
 */
export const reputationWar = (
  dependencies: Dependencies,
  meeting: Meeting
): boolean => {
  const { computer, person } = meeting.sides,
    reputations = reputation(dependencies);

  if (reputations.get(person) - reputations.credit(computer, person) <= 6) {
    return false;
  }

  return (
    vendetta(dependencies, computer, person) &&
    (dependencies.playerRegistry
      .entries()
      .some(
        (other: Player) =>
          other !== computer && allied(dependencies, computer, other)
      ) ||
      meeting.evaluation.targetIsLeader ||
      strength(dependencies, person) < strength(dependencies, computer))
  );
};

// Each computer step's place in the agenda, and each ask's proposal.
const agendaItems = new WeakMap<object, number>();
const asks = new WeakMap<object, { proposal: IProposal; index: number }>();

/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
export const agendaItemOf = (action: object): number | undefined =>
  agendaItems.get(action);

/** The proposal a computer player's ask belongs to, or `null`. */
export const askedFor = (action: object): IProposal | null =>
  asks.get(action)?.proposal ?? null;

/** What a proposal's answer brings, worked out with the answer and carried out by `Rules/talks`. */
export interface Outcome {
  // More patience spent (less than 0 gives some back).
  patience?: number;
  // The computer player ends the meeting after.
  end?: boolean;
  // What it says after, if anything.
  says?: string | null;
  // What it gives the person (tribute, an ally's help, an advance for free).
  gives?: (Advance | Gold)[];
  // What it takes in an exchange (the person's advance).
  takes?: Advance | null;
  // The value of the exchange in attitude.
  attitude?: number;
  // A ceasefire granted with tribute paid (`diplo_answer_demand`, `:2072-2077`).
  ceasefire?: boolean;
  // The computer player's units leave the person's land (withdrawal).
  withdraws?: boolean;
  // The war the computer player declares, or that the person is asked to.
  war?: boolean;
  // The alliance it cancels.
  cancelsAlliance?: boolean;
  // Extra advances the asked price takes (a rich mercenary's two).
  alsoTakes?: Advance[];
}

const outcomes = new WeakMap<object, Outcome>();

/** What answering `action` brings, if anything (`Outcome`). */
export const outcomeOf = (action: object): Outcome =>
  outcomes.get(action) ?? {};

const withOutcome = <T extends object>(action: T, outcome: Outcome): T => {
  outcomes.set(action, outcome);

  return action;
};

/**
 * A computer player's payment to its ally for joining its war on `enemy` (`diplo_ally_demand_help`, `:1300-1320`): the
 *  threat `enemy` poses where it has cities, in 50s, up to what it has.
 */
export const helpBonus = (
  dependencies: Dependencies,
  computer: Player,
  enemy: Player
): number => {
  const presences = presence(dependencies, computer, enemy),
    ours = presences.get(computer)!,
    theirs = presences.get(enemy)!,
    ourCities = cities(dependencies, computer);

  let threat = 0;

  landMassesOf(ours, theirs).forEach((landMass) => {
    const us = presenceOn(ours, landMass),
      them = presenceOn(theirs, landMass);

    if (us.cities > (ourCities > 1 ? 1 : 0) && us.defence < them.attack) {
      threat += Math.trunc(
        (them.attack * (level(dependencies) === CHIEFTAIN ? 4 : 2)) /
          (us.defence + 1)
      );
    }
  });

  return Math.min(threat, Math.trunc(gold(dependencies, computer) / 50)) * 50;
};

// The computer player's ceasefires and peace a person's Senate made it accept.
const forcedOffers = new WeakSet<object>();

/** Whether the person's Senate made it accept `proposal`. */
export const wasForced = (proposal: object): boolean =>
  forcedOffers.has(proposal);

/** How the computer player answers the person's proposal, ask by ask (`diplo_ai_answer_proposal` and the menus). */
export interface Answer {
  asks: (() => IProposal | null)[];
  // Whether the deal is off when the person refuses ask `index`, and what that brings.
  off: (index: number) => Outcome | null;
  accept: boolean;
  // What the final answer brings.
  onAccept: Outcome;
  onDecline: Outcome;
}

export interface TalksRules {
  dependencies: Dependencies;
  random: () => number;
}

// A chance drawn once for `key` of `owner`, and kept.
const draws = new WeakMap<object, Map<string, number>>();

const drawn = (owner: object, key: string, random: () => number): number => {
  if (!draws.has(owner)) {
    draws.set(owner, new Map());
  }

  const kept = draws.get(owner)!;

  if (!kept.has(key)) {
    kept.set(key, random());
  }

  return kept.get(key)!;
};

/** The original's `rand() % n == 0`, drawn once for `key` of `owner`. */
const oneIn = (
  owner: object,
  key: string,
  random: () => number,
  n: number
): boolean => roll(() => drawn(owner, key, random), n) === 0;

export const talks = ({ dependencies, random }: TalksRules) => {
  const { ruleRegistry } = dependencies,
    feelings = attitudeOf(dependencies),
    last = (negotiation: Negotiation): IAction | null =>
      negotiation.lastInteraction(),
    actions = (negotiation: Negotiation): IAction[] =>
      negotiation.interactions(),
    resolutionOf = (
      negotiation: Negotiation,
      proposal: object
    ): Resolution | null =>
      (actions(negotiation).find(
        (action) =>
          action instanceof Resolution && action.proposal() === proposal
      ) as Resolution | undefined) ?? null,
    say = (by: Player, key: string, negotiation: Negotiation): Dialogue =>
      new Dialogue(by, key, negotiation, ruleRegistry),
    tag = <T extends object>(action: T, item: number): T => {
      agendaItems.set(action, item);

      return action;
    },
    patienceOf = ({ computer, person }: Sides) =>
      patience(dependencies, computer, person),
    limitOf = (meeting: Meeting): number =>
      patienceLimit(
        dependencies,
        meeting.sides.computer,
        meeting.sides.person,
        meeting.live.value
      ),
    effectiveReputation = (meeting: Meeting): number =>
      reputation(dependencies).get(meeting.sides.person) -
      reputation(dependencies).credit(
        meeting.sides.computer,
        meeting.sides.person
      ),
    topPower = (player: Player): boolean =>
      rank(dependencies, player) === 7 && cities(dependencies, player) > 4,
    anyAllies = (player: Player, except: Player[] = []): number =>
      dependencies.playerRegistry
        .entries()
        .filter(
          (other: Player) =>
            other !== player &&
            !except.includes(other) &&
            allied(dependencies, player, other)
        ).length;

  // `diplo_tech_exchange` (`:839-1046`): what the computer player does about an exchange of advances, in `mode` 0 (the
  //  person asked, `second` when it offered its second-best), 1 (the computer player's own offer at an audience), or
  //  2 and 3 (an ally's help).
  type ExchangeAnswer =
    | { kind: 'none' }
    | { kind: 'refuse' }
    | { kind: 'sell'; advance: Advance; price: number }
    | { kind: 'gift'; advance: Advance }
    | { kind: 'petty' }
    | { kind: 'offer'; takes: Advance; value: number };

  const exchange = (
    meeting: Meeting,
    mode: 0 | 1 | 2 | 3,
    second: boolean = false,
    spentBefore: number = patienceOf(meeting.sides).spent()
  ): ExchangeAnswer => {
    const { computer, person } = meeting.sides,
      found = survey(dependencies, computer, person),
      alliance = allied(dependencies, computer, person),
      peace = atPeace(dependencies, computer, person),
      attitude = attitudeLevel(meeting.live.value),
      difficulty = level(dependencies),
      sell = (): ExchangeAnswer => {
        if (found.wanted === null) {
          return { kind: 'none' };
        }

        const price = sellPrice({
          value: advanceValue(dependencies, computer, found.wanted),
          knowers: dependencies.playerRegistry
            .entries()
            .filter((player: Player) =>
              knows(dependencies, player, found.wanted!.sourceClass())
            ).length,
          attitude: meeting.live.value,
          personTopPower:
            topPower(person) &&
            dependencies.turn.value() > 200 &&
            difficulty !== CHIEFTAIN,
          personGold: gold(dependencies, person),
          allied: alliance,
          personAdvances: found.personCount,
          computerAdvances: found.computerCount,
        });

        return price <= gold(dependencies, person)
          ? { kind: 'sell', advance: found.wanted, price }
          : { kind: 'none' };
      };

    if (!alliance) {
      if (
        vendetta(dependencies, computer, person) ||
        hasFlag(dependencies, person, computer, SNEAK_ATTACK) ||
        meeting.evaluation.capturedCities !== 0 ||
        hasFlag(dependencies, computer, person, FIGHTING) ||
        (meeting.aggressive && found.computerCount > 5) ||
        attitude > 5
      ) {
        return { kind: 'refuse' };
      }
    }

    // A wonder the person could beat it to with the advance, above King (`blocking_wonder`).
    if (difficulty > KING && blocksWonder(meeting)) {
      return { kind: 'refuse' };
    }

    // Behind it, the person is offered a sale, not an exchange, when it isn't warm.
    if (found.personCount < found.computerCount) {
      if (mode === 1) {
        return { kind: 'none' };
      }

      if (attitude > 5 - (peace ? 0 : 1) && !alliance) {
        return sell();
      }
    }

    // The top power is sold to, unless the advance is a key to its armies.
    if (
      topPower(person) &&
      !alliance &&
      attitude > (dependencies.turn.value() < 201 ? 4 : 3) - (peace ? 0 : 1) &&
      !militaryKey(found.best)
    ) {
      return mode === 1 ? { kind: 'none' } : sell();
    }

    // An ally far behind is given the advance.
    if (
      found.best === null &&
      found.wanted !== null &&
      alliance &&
      found.personCount +
        6 -
        civilize(dependencies, computer) -
        Math.min(Math.max(Math.trunc(found.computerCount / 12), 0), 5) <
        found.computerCount &&
      (spentBefore < 2 || mode === 3)
    ) {
      return { kind: 'gift', advance: found.wanted };
    }

    if (found.wanted === null || found.best === null) {
      return mode === 1 ? { kind: 'none' } : sell();
    }

    if (mode > 1) {
      return { kind: 'none' };
    }

    if (second) {
      if (
        found.second === null ||
        knows(dependencies, computer, found.second.sourceClass()) ||
        ownsWonder(dependencies, computer, 'marco-polos-embassy') ||
        topPower(person) ||
        (found.secondValue < found.bestValue &&
          (found.personCount < found.computerCount || attitude > 4))
      ) {
        return { kind: 'petty' };
      }

      return { kind: 'offer', takes: found.second, value: found.secondValue };
    }

    return { kind: 'offer', takes: found.best, value: found.bestValue * 2 };
  };

  // The advances that are keys to the armies (Armor's, Cavalry's, Artillery's, Howitzer's, Riflemen's, Musketeers'
  //  prerequisites, and advance 0x22: `diplomacy.cpp:950-958`).
  const militaryKey = (advance: Advance | null): boolean =>
    advance !== null &&
    [
      MobileWarfare,
      Tactics,
      MachineTools,
      Robotics,
      Conscription,
      Gunpowder,
      advances[0x22][0],
    ].includes(advance.sourceClass());

  // `blocking_wonder` (`diplo_exchange_survey`, `:745-760`): the computer player is building a wonder, not yet built
  //  anywhere, that one of its advances the person lacks leads to; above King it won't trade then, lest the person
  //  build it first. The original also requires the computer player to have fewer wonders than the person in the
  //  wonder's group of seven, which needs civ2-wonder's order of the wonders: not ported.
  const blocksWonder = (meeting: Meeting): boolean => {
    const { computer, person } = meeting.sides,
      cityBuilds = dependencies.cityBuildRegistry,
      requirements = dependencies.requirementRegistry,
      wonders = dependencies.wonderRegistry;

    if (cityBuilds === undefined || requirements === undefined) {
      return false;
    }

    return dependencies.cityRegistry
      .getByPlayer(computer)
      .some((city: City) => {
        try {
          const item = cityBuilds.getByCity(city).building()?.item() as
            | (new (...args: any[]) => object)
            | undefined;

          if (
            item === undefined ||
            item === null ||
            !(item.prototype instanceof Wonder) ||
            (wonders !== undefined &&
              wonders.entries().some((built) => built instanceof item))
          ) {
            return false;
          }

          return requirements
            .for(item as any, 'requires')
            .some((entry) =>
              entry.targets.some(
                (target: any) =>
                  typeof target === 'function' &&
                  target.prototype instanceof Advance &&
                  knows(dependencies, computer, target) &&
                  !knows(dependencies, person, target)
              )
            );
        } catch (e) {
          return false;
        }
      });
  };

  // The computer player's agenda from item `from`: its next step, `null` when it has nothing more to say, or a
  //  `Terminate` when it ends the meeting.
  const agendaFrom = (
    negotiation: Negotiation,
    meeting: Meeting,
    from: number
  ): IAction | null => {
    const { computer, person, computerLed } = meeting.sides,
      evaluation = meeting.evaluation,
      alliance = allied(dependencies, computer, person),
      peace = atPeace(dependencies, computer, person),
      war = atWar(dependencies, computer, person),
      end = () => new Terminate(computer, negotiation, ruleRegistry);

    for (let item = from; item < AGENDA.done; item++) {
      if (item === AGENDA.callForHelp) {
        const call = callForHelp(dependencies, computer, person);

        if (call !== null && alliance) {
          return tag(
            new JoinWar(call, computer, negotiation, ruleRegistry),
            item
          );
        }
      }

      if (item === AGENDA.violators) {
        if (
          hasFlag(dependencies, computer, person, WITHDRAWAL_DEMANDED) &&
          peace &&
          !alliance
        ) {
          return tag(
            new DemandWithdrawal(computer, negotiation, ruleRegistry),
            item
          );
        }
      }

      if (item === AGENDA.exchange) {
        const offer = exchange(meeting, 1);

        if (offer.kind === 'offer') {
          return tag(
            withOutcome(
              new ExchangeKnowledge(
                survey(dependencies, computer, person).wanted !== null
                  ? [survey(dependencies, computer, person).wanted!]
                  : [],
                computer,
                negotiation,
                ruleRegistry
              ),
              { takes: offer.takes, attitude: offer.value }
            ),
            item
          );
        }

        if (offer.kind === 'gift') {
          return tag(
            withOutcome(
              new Gift(offer.advance, computer, negotiation, ruleRegistry),
              { patience: 2 }
            ),
            item
          );
        }

        // A peaceful computer player of its own accord, afraid, says no more (`:3890-3892`).
        if (
          !meeting.aggressive &&
          computerLed &&
          hasTreatyLevel(
            dependencies,
            computer,
            person,
            TreatyLevel.Ceasefire
          ) &&
          meeting.fear > 2
        ) {
          return end();
        }
      }

      if (item === AGENDA.warOnTarget) {
        const target = meeting.warTarget;

        if (
          target !== null &&
          (evaluation.requestMode !== 0 || alliance) &&
          dependencies.playerRegistry.entries().includes(target)
        ) {
          return tag(
            new JoinWar(target, computer, negotiation, ruleRegistry),
            item
          );
        }
      }

      if (item === AGENDA.tribute) {
        let tribute = meeting.tribute;

        // An ally eases its demands (`diplo_meet_ally_eases_demands`).
        if (alliance) {
          const found = survey(dependencies, computer, person);

          if (found.best !== null) {
            if (rank(dependencies, computer) < rank(dependencies, person)) {
              if (
                found.computerCount < found.personCount ||
                gold(dependencies, person) < gold(dependencies, computer)
              ) {
                tribute = 0;
              }
            } else if (
              found.computerCount < found.personCount &&
              gold(dependencies, person) < gold(dependencies, computer)
            ) {
              tribute = 0;
            }
          }
        }

        // Only what the person has is demanded; then an ally asks at most half of it (`:2966-2985`).
        if (
          tribute > 0 &&
          tribute !== 999 &&
          (evaluation.requestMode === 2 || propose(meeting)) &&
          tribute <= gold(dependencies, person)
        ) {
          if (alliance) {
            const half = Math.trunc(gold(dependencies, person) / 2);

            tribute = Math.min(tribute, half < 101 ? 100 : half);
          }

          return tag(
            new DemandTribute(
              new Gold(tribute),
              computer,
              negotiation,
              ruleRegistry
            ),
            item
          );
        }
      }

      if (item === AGENDA.tech) {
        const found = survey(dependencies, computer, person),
          demandedOne = actions(negotiation).some(
            (action) =>
              action instanceof DemandTribute &&
              action.by() === computer &&
              agendaItems.get(action) === AGENDA.tech
          ),
          // Over a barrel: its units near the person's cities and aggressive, it demands the second advance too.
          again =
            demandedOne &&
            actions(negotiation).filter(
              (action) =>
                action instanceof DemandTribute &&
                action.by() === computer &&
                agendaItems.get(action) === AGENDA.tech
            ).length === 1 &&
            actions(negotiation).some(
              (action) =>
                action instanceof Accept &&
                agendaItems.get(action.proposal()) === AGENDA.tech
            ) &&
            evaluation.unitsNearCities &&
            meeting.aggressive &&
            !meeting.paid;

        if (
          (!demandedOne || again) &&
          (evaluation.requestMode !== 0 ||
            propose(meeting) ||
            (alliance && attitudeLevel(meeting.live.value) > 3)) &&
          found.best !== null &&
          (meeting.tribute !== 999 || again)
        ) {
          return tag(
            new DemandTribute(found.best, computer, negotiation, ruleRegistry),
            item
          );
        }
      }

      if (item === AGENDA.dismissal) {
        if (
          alliance &&
          (meeting.aggressive || meeting.live.value > 49) &&
          !meeting.paid
        ) {
          return tag(say(computer, DIALOGUE.allyDismissed, negotiation), item);
        }
      }

      if (item === AGENDA.threat) {
        const aggressive = threatens(meeting);

        if (aggressive) {
          const met = meeting.lastContactTurn !== null,
            incident = hasFlag(dependencies, computer, person, INCIDENT);

          if (
            (meeting.tribute > 50 &&
              (atPeace(dependencies, computer, person) ||
                (!hostile(dependencies, computer, person, feelings) &&
                  met &&
                  !incident))) ||
            meeting.tribute === 999 ||
            !met ||
            incident ||
            !computerLed
          ) {
            return tag(say(computer, DIALOGUE.war, negotiation), item);
          }

          // Still aggressive: it says nothing more (`if (ai_aggressive) return`).
          return end();
        }
      }

      if (item === AGENDA.alliance) {
        const proposal = proposeAlliance(negotiation, meeting);

        if (proposal !== null) {
          return tag(proposal, item);
        }
      }

      if (item === AGENDA.ceasefire && war) {
        return tag(
          new OfferCeasefire(computer, negotiation, ruleRegistry),
          item
        );
      }

      if (item === AGENDA.peace && offersPeace(meeting)) {
        return tag(new OfferPeace(computer, negotiation, ruleRegistry), item);
      }
    }

    return null;
  };

  // `propose`, as the agenda has set it so far.
  const propose = (meeting: Meeting): boolean =>
    meeting.propose ||
    (allied(dependencies, meeting.sides.computer, meeting.sides.person) &&
      effectiveReputation(meeting) > 4 &&
      !meeting.paid);

  // `diplo_meet_turn_aggressive` and the hostility it keeps (`:3912-3925`, `:3144`): whether the computer player is
  //  aggressive at the threats.
  const threatens = (meeting: Meeting): boolean => {
    const { computer, person } = meeting.sides;

    // A city held and aggressive: it stays hostile, and is no longer aggressive (`:3912-3922`).
    if (meeting.aggressive && !meeting.hostile) {
      return true;
    }

    if (
      meeting.noContact &&
      !meeting.paid &&
      meeting.tribute === 999 &&
      attitudeLevel(meeting.live.value) >
        (meeting.evaluation.initialAggressive ? 2 : 4) &&
      !pacifies(dependencies, person)
    ) {
      const government = senateGovernment(dependencies, computer),
        index =
          government === 'democracy' ? 6 : government === 'republic' ? 5 : 0;

      return (
        index < 6 - (drawn(meeting, 'turn-aggressive', random) < 0.5 ? 0 : 1)
      );
    }

    return false;
  };

  // `diplo_meet_propose_alliance` (`:3228`): the alliance it proposes, or its call to fight a common enemy first.
  const proposeAlliance = (
    negotiation: Negotiation,
    meeting: Meeting
  ): IProposal | null => {
    const { computer, person } = meeting.sides,
      evaluation = meeting.evaluation;

    if (
      !atPeace(dependencies, computer, person) ||
      allied(dependencies, computer, person) ||
      evaluation.targetIsLeader
    ) {
      return null;
    }

    const personRank = rank(dependencies, person),
      computerRank = rank(dependencies, computer),
      ranked = personRank < 6 && computerRank < 6;

    let target = meeting.warTarget;

    // Late in the game, with no target, the strongest player in contact with the person that neither is at war with.
    if (ranked && target === null && dependencies.turn.value() > 200) {
      let best = 8;

      dependencies.playerRegistry.entries().forEach((other: Player) => {
        const otherRank = rank(dependencies, other);

        if (
          other !== computer &&
          other !== person &&
          computerRank <= otherRank &&
          personRank <= otherRank &&
          otherRank <= best &&
          inContact(dependencies, person, other) &&
          !atWar(dependencies, person, other) &&
          !allied(dependencies, computer, other) &&
          !atWar(dependencies, computer, other)
        ) {
          target = other;
          best = otherRank;
        }
      });
    }

    const commonEnemy =
      target !== null &&
      hasTreatyLevel(dependencies, person, target, TreatyLevel.Ceasefire);

    if (
      (meeting.fear !== 0 || ranked || commonEnemy) &&
      (evaluation.peaceInclination > 1 || ranked) &&
      anyAllies(person) === 0 &&
      (meeting.live.value < 25 || (meeting.live.value < 50 && commonEnemy)) &&
      (commonEnemy || meeting.declaredWar || ranked) &&
      effectiveReputation(meeting) < 4 &&
      !hasTreatyLevelExactly(computer, person, TreatyLevel.Ceasefire) &&
      evaluation.capturedCities < 2 &&
      (personRank < 6 || computerRank < 5)
    ) {
      return target !== null
        ? new JoinWar(target, computer, negotiation, ruleRegistry)
        : new ProposeAlliance(computer, negotiation, ruleRegistry);
    }

    return null;
  };

  const hasTreatyLevelExactly = (
    player: Player,
    other: Player,
    level: TreatyLevel
  ): boolean => treaty(dependencies, player, other) === level;

  // `diplo_meet_offer_peace` (`:3463`): whether it offers peace.
  const offersPeace = (meeting: Meeting): boolean => {
    const { computer, person } = meeting.sides;

    if (
      atPeace(dependencies, computer, person) ||
      atWar(dependencies, computer, person)
    ) {
      return false;
    }

    const computerStrength = strength(dependencies, computer),
      personStrength = strength(dependencies, person);

    let threshold = 3;

    if (personStrength * 2 < computerStrength) {
      threshold = 2;
    }

    if (Math.trunc((personStrength * 3) / 2) < computerStrength) {
      threshold--;
    }

    if (computerStrength < personStrength) {
      threshold++;
    }

    if (computerStrength * 2 < personStrength) {
      threshold++;
    }

    const ceasefire = hasTreatyLevelExactly(
      computer,
      person,
      TreatyLevel.Ceasefire
    );

    return (
      meeting.evaluation.suppressedAggression ||
      ((meeting.paid || meeting.noContact) && !ceasefire) ||
      ((meeting.fear !== 0 || attitudeLevel(meeting.live.value) <= threshold) &&
        !meeting.evaluation.targetIsLeader &&
        effectiveReputation(meeting) + meeting.evaluation.capturedCities <
          meeting.fear + 4)
    );
  };

  // The computer player's concession for a refused ceasefire (`:3375-3445`): with chance 1 in the person's reputation
  //  + 1 (doubled with a vendetta), an advance if it fears the person above 3; refused, gold; refused, all it has if it
  //  is down to one city. For peace, gold only. Each is offered once, in that order.
  const concession = (
    negotiation: Negotiation,
    meeting: Meeting,
    offer: IProposal
  ): IProposal | null => {
    const { computer, person } = meeting.sides,
      made = actions(negotiation).filter(
        (action) => asks.get(action)?.proposal === offer
      ),
      distrust =
        (effectiveReputation(meeting) + 1) *
        (vendetta(dependencies, computer, person) ? 2 : 1);

    if (
      made.length === 0 &&
      !oneIn(offer, 'concession', random, Math.max(1, distrust))
    ) {
      return null;
    }

    const steps: (() => IProposal | null)[] = [
      () => {
        const wanted = survey(dependencies, computer, person).wanted;

        return offer instanceof OfferCeasefire &&
          meeting.fear > 3 &&
          wanted !== null
          ? new Gift(wanted, computer, negotiation, ruleRegistry)
          : null;
      },
      () => {
        let amount =
          Math.min(
            Math.max(meeting.fear * 2 - 4, 0),
            Math.trunc(gold(dependencies, computer) / 50)
          ) * 50;

        if (pacifies(dependencies, computer)) {
          amount = Math.trunc(amount / 2);
        }

        return amount > 0
          ? new Gift(new Gold(amount), computer, negotiation, ruleRegistry)
          : null;
      },
      () => {
        if (
          !(offer instanceof OfferCeasefire) ||
          meeting.fear === 0 ||
          cities(dependencies, computer) >= 2 ||
          pacifies(dependencies, computer)
        ) {
          return null;
        }

        const everything = [
          ...(gold(dependencies, computer) > 0
            ? [new Gold(gold(dependencies, computer))]
            : []),
          ...(survey(dependencies, computer, person).wanted !== null
            ? allAdvancesLacked(computer, person)
            : []),
        ];

        return everything.length > 0
          ? withOutcome(
              new Gift(everything[0], computer, negotiation, ruleRegistry),
              { gives: everything.slice(1) }
            )
          : null;
      },
    ];

    const lastIndex =
      made.length === 0 ? -1 : asks.get(made[made.length - 1])!.index;

    for (let index = lastIndex + 1; index < steps.length; index++) {
      const gift = steps[index]();

      if (gift !== null) {
        asks.set(gift, { proposal: offer, index });

        return gift;
      }
    }

    return null;
  };

  const allAdvancesLacked = (from: Player, by: Player): Advance[] => {
    try {
      const research = dependencies.playerResearchRegistry.getByPlayer(by);

      return dependencies.playerResearchRegistry
        .getByPlayer(from)
        .complete()
        .filter(
          (advance: Advance) =>
            !advance.sourceClass<typeof Advance>().repeatable &&
            !research.completed(advance.sourceClass())
        );
    } catch (e) {
      return [];
    }
  };

  // What the person may propose, in the menu's order (`diplo_proposal_menu`, the favour menu, the gift menu), each
  //  allowed by `ProposalAvailable`.
  const menu = (negotiation: Negotiation, meeting: Meeting): IProposal[] => {
    const { computer, person } = meeting.sides,
      found = survey(dependencies, computer, person),
      treasury = gold(dependencies, person),
      units = dependencies.unitRegistry
        .getByPlayer(person)
        .filter((unit: Unit) => unit.attack().value() > 0),
      strongest = units.sort(
        (a: Unit, b: Unit) => b.attack().value() - a.attack().value()
      )[0],
      proposals: (IProposal | null)[] = [
        new ProposeAlliance(person, negotiation, ruleRegistry),
        new OfferPeace(person, negotiation, ruleRegistry),
        new AskAlly(person, negotiation, ruleRegistry),
        new DemandTribute(
          new Gold(
            demandedTribute({
              proposal: 4,
              fear: meeting.fear,
              computerGold: gold(dependencies, computer),
              computerRank: rank(dependencies, computer),
              personRank: rank(dependencies, person),
              turnsSinceContact: meeting.evaluation.turnsSinceContact,
              atPeace: atPeace(dependencies, person, computer),
              computerPacifies: pacifies(dependencies, computer),
            })
          ),
          person,
          negotiation,
          ruleRegistry
        ),
        new DemandWithdrawal(person, negotiation, ruleRegistry),
        new CancelAlliance(person, negotiation, ruleRegistry),
        // The favours: an exchange, offering its best advance or its second; war on any other player; maps.
        ...[found.best, found.second]
          .filter((advance): advance is Advance => advance !== null)
          .map((advance, index) =>
            withOutcome(
              new ExchangeKnowledge(
                [advance],
                person,
                negotiation,
                ruleRegistry
              ),
              { takes: advance, attitude: index }
            )
          ),
        ...dependencies.playerRegistry
          .entries()
          .filter((other: Player) => other !== computer && other !== person)
          .map(
            (other: Player) =>
              new JoinWar(other, person, negotiation, ruleRegistry)
          ),
        new ShareMaps(person, negotiation, ruleRegistry),
        // The gifts: its best advance and the next, gold, a unit.
        ...[found.best, found.second]
          .filter((advance): advance is Advance => advance !== null)
          .map((advance, index) =>
            withOutcome(new Gift(advance, person, negotiation, ruleRegistry), {
              attitude:
                (index === 0 ? 4 : 2) *
                advanceValue(dependencies, computer, found.best!),
            })
          ),
        ...giftGold(treasury).map(
          (amount) =>
            new Gift(new Gold(amount), person, negotiation, ruleRegistry)
        ),
        strongest !== undefined
          ? new Gift(strongest, person, negotiation, ruleRegistry)
          : null,
      ];

    return proposals.filter(
      (proposal): proposal is IProposal =>
        proposal !== null && proposalAvailable(dependencies, proposal)
    );
  };

  const answers = new WeakMap<IProposal, Answer>();

  const plain = (
    accept: boolean,
    outcome: Outcome = {},
    onDecline: Outcome = {}
  ): Answer => ({
    asks: [],
    off: () => null,
    accept,
    onAccept: accept ? outcome : {},
    onDecline: accept ? {} : { ...outcome, ...onDecline },
  });

  const answerTo = (
    negotiation: Negotiation,
    meeting: Meeting,
    proposal: IProposal
  ): Answer => {
    if (answers.has(proposal)) {
      return answers.get(proposal)!;
    }

    const answer = work(negotiation, meeting, proposal);

    answers.set(proposal, answer);

    return answer;
  };

  const work = (
    negotiation: Negotiation,
    meeting: Meeting,
    proposal: IProposal
  ): Answer => {
    const { computer, person } = meeting.sides,
      evaluation = meeting.evaluation,
      // What the original reads: the count before this proposal's own charge.
      spent = meeting.patienceBefore,
      difficulty = level(dependencies),
      computerRank = rank(dependencies, computer),
      personRank = rank(dependencies, person),
      computerStrength = strength(dependencies, computer),
      personStrength = strength(dependencies, person),
      alliance = allied(dependencies, computer, person),
      rawReputation = reputation(dependencies).get(person),
      effective = effectiveReputation(meeting),
      target = meeting.warTarget,
      found = survey(dependencies, computer, person),
      targetFightingAndStrong =
        target !== null &&
        !hostile(dependencies, person, target, feelings) &&
        inContact(dependencies, person, target) &&
        hasFlag(dependencies, computer, target, FIGHTING) &&
        (atPeace(dependencies, person, target)
          ? Math.trunc((computerStrength * 3) / 2)
          : computerStrength * 2) <= strength(dependencies, target),
      targetIsPersonsAlly =
        target !== null && allied(dependencies, person, target),
      secret = (): IProposal | null =>
        found.best === null
          ? null
          : withOutcome(
              new DemandTribute(
                found.best,
                computer,
                negotiation,
                ruleRegistry
              ),
              { attitude: 2 * advanceValue(dependencies, computer, found.best) }
            ),
      // Whether an earlier ask for this proposal was accepted (`paid`).
      paidSoFar = (): boolean =>
        actions(negotiation).some(
          (action) =>
            action instanceof Accept &&
            asks.get(action.proposal())?.proposal === proposal
        ),
      // Whether an earlier ask for this proposal was refused.
      refusedSoFar = (): boolean =>
        actions(negotiation).some(
          (action) =>
            action instanceof Decline &&
            asks.get(action.proposal())?.proposal === proposal
        ),
      // Gold, unless a secret advance was given already (`!paid`, `:1563`, `:1773`).
      cash = (amount: number) => (): IProposal | null =>
        amount > 0 && !paidSoFar()
          ? new DemandTribute(
              new Gold(amount),
              computer,
              negotiation,
              ruleRegistry
            )
          : null,
      // The call to fight its target, made even when the person is at war with it already (`:1595`, `:1795`).
      solidarity = (against: Player | null) => (): IProposal | null =>
        against !== null
          ? new JoinWar(against, computer, negotiation, ruleRegistry)
          : null;

    if (proposal instanceof ProposeAlliance) {
      // `diplo_alliance_willing` with a war target found for reason 4 (`:1440-1470`).
      let allianceTarget = target;

      const commonEnemy = (): Player | null => {
          if (
            personRank >= 7 ||
            computerRank >= 7 ||
            dependencies.turn.value() < 100 ||
            anyAllies(person) >= 7 - personRank ||
            attitudeLevel(meeting.live.value) >= 5
          ) {
            return null;
          }

          let best = 8,
            chosen: Player | null = null;

          dependencies.playerRegistry.entries().forEach((other: Player) => {
            const contact = inContact(dependencies, person, other) ? 1 : 0;

            if (
              other !== computer &&
              other !== person &&
              computerRank <= rank(dependencies, other) &&
              personRank <= rank(dependencies, other) &&
              (contact === 1 || inContact(dependencies, computer, other)) &&
              !atWar(dependencies, person, other) &&
              !allied(dependencies, computer, other) &&
              rank(dependencies, other) - contact < best
            ) {
              chosen = other;
              best = rank(dependencies, other) - contact;
            }
          });

          if (target !== null && rank(dependencies, target) !== 7) {
            chosen = target;
          }

          return chosen;
        },
        enemy = targetFightingAndStrong ? null : commonEnemy(),
        willingInputs: AllianceInputs = {
          level: difficulty,
          personAllies: anyAllies(person),
          hasWarTarget: target !== null,
          computerRank,
          personRank,
          computerStrength,
          personStrength,
          targetIsLeader: evaluation.targetIsLeader,
          fear: meeting.fear,
          peaceInclination: evaluation.peaceInclination,
          attitude: meeting.live.value,
          reputation: effective,
          turn: dependencies.turn.value(),
          targetFightingAndStrong,
          commonEnemy: enemy !== null,
          vendetta: vendetta(dependencies, computer, person),
          targetIsPersonsAlly,
          patienceSpent: spent,
        };

      let willing = allianceWilling(willingInputs);

      if (enemy !== null && (willing.reasons & 4) !== 0) {
        allianceTarget = enemy;

        // The target it settled on is the person's ally: agreed, reason 1 (`:1478-1482`).
        if (allied(dependencies, person, enemy) && !targetIsPersonsAlly) {
          willing = allianceWilling({
            ...willingInputs,
            targetIsPersonsAlly: true,
          });
        }
      }

      if (!willing.agree) {
        // Refused for vendetta, reputation or captured cities, it loses a little patience (`:1648`).
        const harsh =
          vendetta(dependencies, computer, person) ||
          effective >= 3 ||
          evaluation.capturedCities !== 0;

        return plain(false, {}, { patience: harsh ? 1 : 0 });
      }

      const sweeten = asksSweetener(
          spent,
          meeting.live.value,
          rawReputation,
          meeting.declareWar,
          true
        ),
        askSecret =
          sweeten &&
          ((willing.reasons & 3) === 0 || meeting.declareWar) &&
          found.best !== null,
        gift = sweetenerGold(
          gold(dependencies, person),
          computerStrength,
          personStrength,
          rawReputation,
          true
        ),
        askGold =
          sweeten &&
          ((willing.reasons & 2) === 0 || meeting.declareWar) &&
          gift > 0,
        planned = [
          ...(askSecret ? [secret] : []),
          ...(askGold ? [cash(gift)] : []),
          solidarity(allianceTarget),
        ];

      return {
        asks: planned,
        off: (index: number) => {
          const solidarityAsk = index === planned.length - 1;

          if (!solidarityAsk) {
            return {};
          }

          if (
            willing.reasons !== 0 ||
            personRank === 7 ||
            effective > 2 ||
            meeting.declareWar
          ) {
            const paid = actions(negotiation).some(
              (action) =>
                action instanceof Accept &&
                asks.get(action.proposal())?.proposal === proposal
            );

            return { patience: 1, end: !paid };
          }

          return null;
        },
        accept: true,
        onAccept: {},
        onDecline: {},
      };
    }

    if (proposal instanceof OfferPeace) {
      const flags = peaceFlags({
        level: difficulty,
        targetIsLeader: evaluation.targetIsLeader,
        attitude: meeting.live.value,
        reputation: effective,
        targetFightingAndStrong,
        targetIsPersonsAlly,
        vendetta: vendetta(dependencies, computer, person),
        attack: attack(dependencies, computer),
        personPacifies: pacifies(dependencies, person),
      });

      if (flags === 0) {
        const harsh =
          vendetta(dependencies, computer, person) ||
          effective >= 5 ||
          evaluation.capturedCities >= 2;

        return plain(false, {}, { patience: harsh ? 1 : 0 });
      }

      const sweeten = asksSweetener(
          spent,
          meeting.live.value,
          effective,
          false,
          false
        ),
        askSecret = sweeten && (flags & 6) === 0 && found.best !== null,
        gift = sweetenerGold(
          gold(dependencies, person),
          computerStrength,
          personStrength,
          rawReputation,
          false
        ),
        askGold = sweeten && (flags & 4) === 0 && gift > 0,
        planned = [
          ...(askSecret ? [secret] : []),
          ...(askGold ? [cash(gift)] : []),
          solidarity(target),
        ];

      return {
        asks: planned,
        off: (index: number) => {
          if (index < planned.length - 1) {
            // A sweetener refused: only the person's Great Wall or United Nations still makes peace (`flags &= 8`).
            return (flags & 8) !== 0 ? null : {};
          }

          // The flags as they stand after any refused sweetener (`:1806`).
          const standing = refusedSoFar() ? flags & 8 : flags;

          if ((standing & 6) !== 0 || personRank === 7 || effective > 3) {
            const paid = actions(negotiation).some(
              (action) =>
                action instanceof Accept &&
                asks.get(action.proposal())?.proposal === proposal
            );

            return { patience: 1, end: !paid };
          }

          return null;
        },
        accept: true,
        onAccept: {},
        onDecline: {},
      };
    }

    if (
      proposal instanceof AskAlly ||
      proposal instanceof DemandTribute ||
      proposal instanceof DemandWithdrawal
    ) {
      return demand(negotiation, meeting, proposal);
    }

    if (proposal instanceof CancelAlliance) {
      return plain(true);
    }

    if (proposal instanceof ExchangeKnowledge) {
      const second = outcomeOf(proposal).attitude === 1,
        offer = exchange(meeting, 0, second, spent);

      if (offer.kind === 'offer') {
        return plain(true, { takes: offer.takes, attitude: offer.value });
      }

      if (offer.kind === 'gift') {
        return plain(true, { gives: [offer.advance], patience: 2 });
      }

      if (offer.kind === 'sell') {
        return {
          asks: [
            () =>
              new SellAdvance(
                offer.advance,
                new Gold(offer.price),
                computer,
                negotiation,
                ruleRegistry
              ),
          ],
          off: () => ({}),
          accept: false,
          onAccept: {},
          onDecline: {},
        };
      }

      return plain(false, {}, { patience: offer.kind === 'petty' ? 1 : 0 });
    }

    if (proposal instanceof JoinWar) {
      const against = proposal.against();

      if (
        !inContact(dependencies, computer, against) ||
        atWar(dependencies, computer, against)
      ) {
        return plain(false);
      }

      const distrust = warDistrust({
          reputation: effective,
          attack: attack(dependencies, computer),
          vendetta: vendetta(dependencies, computer, person),
          personAtWarWithTarget: atWar(dependencies, person, against),
          targetRank: rank(dependencies, against),
          personRank,
          computerRank,
          allied: alliance,
        }),
        alliedWithTarget = allied(dependencies, computer, against),
        willing = joinsWar(
          distrust,
          alliedWithTarget,
          vendetta(dependencies, computer, person),
          atWar(dependencies, person, against),
          personRank,
          rank(dependencies, against)
        );

      if (!willing) {
        return plain(false);
      }

      // A rich computer player that isn't the target's ally asks two advances instead of gold.
      if (
        !alliedWithTarget &&
        gold(dependencies, computer) >= 1000 &&
        gold(dependencies, computer) > gold(dependencies, person) &&
        found.best !== null &&
        found.second !== null
      ) {
        return {
          asks: [
            () =>
              withOutcome(
                new DemandTribute(
                  found.best!,
                  computer,
                  negotiation,
                  ruleRegistry
                ),
                { alsoTakes: [found.second!] }
              ),
          ],
          off: () => ({}),
          accept: true,
          onAccept: { war: true },
          onDecline: {},
        };
      }

      const price = warPrice({
        personReputation: rawReputation,
        targetReputation: reputation(dependencies).get(against),
        credit: reputation(dependencies).credit(computer, person),
        computerGold: gold(dependencies, computer),
        personGold: gold(dependencies, person),
        targetStrength: strength(dependencies, against),
        computerTreatyWithTarget: hasTreatyLevel(
          dependencies,
          computer,
          against,
          TreatyLevel.Ceasefire
        ),
        computerAlliedWithTarget: alliedWithTarget,
        targetIsLeader: topPower(against),
        personAtWarWithTarget: atWar(dependencies, person, against),
        allied: alliance,
        computerAtWarWithAnyone: dependencies.playerRegistry
          .entries()
          .some((third: Player) => atWar(dependencies, computer, third)),
        targetSneakAttackedPerson: hasFlag(
          dependencies,
          against,
          person,
          SNEAK_ATTACK
        ),
        personRank,
        computerRank,
        targetRank: rank(dependencies, against),
        targetNukedPerson: hasFlag(dependencies, against, person, NUKED),
        personNukedTarget: hasFlag(dependencies, person, against, NUKED),
      });

      return {
        asks: [cash(price)],
        off: () => ({}),
        accept: true,
        onAccept: { war: true },
        onDecline: {},
      };
    }

    if (proposal instanceof ShareMaps) {
      return plain(
        sharesMaps({
          allied: alliance,
          personOwnsMapWonder:
            ownsWonder(dependencies, person, 'marco-polos-embassy') ||
            ownsWonder(dependencies, person, 'magellans-expedition'),
          attitude: meeting.live.value,
          personKnowsMapMaking: knows(dependencies, person, MapMaking),
          computerKnowsMapMaking: knows(dependencies, computer, MapMaking),
        }),
        // Shared, two more of its patience (`diplo_favor_share_maps`); refused, none.
        { patience: 2 },
        { patience: 0 }
      );
    }

    if (proposal instanceof Gift) {
      const given = proposal.gift();

      if (given instanceof Gold || given instanceof Advance) {
        return plain(true);
      }

      const unit = given as unknown as Unit,
        terms = unitTerms(dependencies, computer, unit),
        refused =
          cities(dependencies, computer) === 0 ||
          attitudeLevel(meeting.live.value) > 4 ||
          advanceCount(dependencies, person) <
            advanceCount(dependencies, computer) ||
          personRank < computerRank ||
          personStrength < computerStrength ||
          terms.obsolete ||
          unit.player() !== person;

      return plain(!refused, { attitude: terms.attitude });
    }

    return plain(false);
  };

  // `diplo_answer_demand` (`:1854-2084`): an ally asked for help (3), tribute (4) or withdrawal (5).
  const demand = (
    negotiation: Negotiation,
    meeting: Meeting,
    proposal: IProposal
  ): Answer => {
    const { computer, person } = meeting.sides,
      evaluation = meeting.evaluation,
      kind: 3 | 4 | 5 =
        proposal instanceof AskAlly
          ? 3
          : proposal instanceof DemandTribute
          ? 4
          : 5,
      alliance = allied(dependencies, computer, person),
      peace = atPeace(dependencies, computer, person),
      computerRank = rank(dependencies, computer),
      personRank = rank(dependencies, person),
      found = survey(dependencies, computer, person),
      war: Outcome = { says: DIALOGUE.war, war: true, end: true };

    if (
      meeting.declareWar ||
      hasFlag(dependencies, computer, person, HOSTILE_INTENT | BROKEN)
    ) {
      return plain(false, war);
    }

    let fear =
        kind === 3 && personRank < computerRank
          ? computerRank - personRank
          : meeting.fear,
      wanted = found.wanted;

    let tribute =
      Math.min(
        Math.max(fear, 0),
        Math.trunc(gold(dependencies, computer) / 50)
      ) * 50;

    if (evaluation.turnsSinceContact < 8) {
      tribute = 0;
      wanted = null;
    }

    if (evaluation.turnsSinceContact < 16) {
      tribute = Math.trunc(tribute / 2);
    }

    if (!peace) {
      tribute = Math.trunc(tribute / 2);
    }

    if (pacifies(dependencies, computer)) {
      tribute = 0;
    }

    if (
      alliance &&
      wanted !== null &&
      found.personCount + level(dependencies) < found.computerCount &&
      (strength(dependencies, computer) < strength(dependencies, person) ||
        personRank < computerRank)
    ) {
      tribute = 0;
      fear = 1;
    }

    const paid =
        pacifies(dependencies, person) && meeting.evaluation.reputation <= 6,
      withdraws =
        peace &&
        !alliance &&
        (!(
          (evaluation.initialAggressive || meeting.live.value > 74) &&
          fear === 0 &&
          !paid
        ) ||
          !(
            governmentIndex(computer) <
              5 + (drawn(proposal, 'withdraw', random) < 0.5 ? 0 : 1) &&
            !hasFlag(dependencies, computer, person, CHANGED_THIS_TURN) &&
            meeting.live.value > 25
          )),
      patienceSpent: number = kind === 5 ? 1 : 0;

    if (withdraws && kind === 5) {
      return plain(true, { withdraws: true, patience: patienceSpent });
    }

    const base: Outcome = { withdraws, patience: patienceSpent },
      // Its attitude once the demand's own cost is counted, as the original adjusts it before answering (`:1967-1981`).
      after =
        meeting.live.value +
        demandAttitude(
          kind,
          computerRank,
          personRank,
          found.computerCount,
          found.personCount
        );

    if ((tribute === 0 && (wanted === null || fear === 0)) || kind === 5) {
      if (!alliance) {
        const polite =
          (!evaluation.initialAggressive && after < 76) ||
          withdraws ||
          ((fear !== 0 ||
            paid ||
            hasFlag(dependencies, computer, person, CHANGED_THIS_TURN) ||
            after < 26) &&
            (!oneIn(proposal, 'war', random, 3) || kind === 5));

        return plain(false, polite ? base : { ...base, ...war });
      }

      // An ally asked: an advance (`diplo_tech_exchange` mode 2 or 3), or sympathy, or a taunt.
      const help = exchange(
        meeting,
        meeting.patienceBefore < 2 ? 3 : 2,
        false,
        meeting.patienceBefore
      );

      if (help.kind === 'gift') {
        return plain(true, { ...base, gives: [help.advance] });
      }

      // It offers to sell instead, and that is its answer (`diplo_offer_sell_tech` returning 1, `:1046`).
      if (help.kind === 'sell') {
        return {
          asks: [
            () =>
              new SellAdvance(
                help.advance,
                new Gold(help.price),
                computer,
                negotiation,
                ruleRegistry
              ),
          ],
          off: () => base,
          accept: false,
          onAccept: {},
          onDecline: base,
        };
      }

      const sympathy =
        (found.personCount < found.computerCount &&
          personRank < computerRank) ||
        personRank < 4;

      if (
        !sympathy &&
        !(
          !evaluation.initialAggressive &&
          after < 51 &&
          !evaluation.targetIsLeader
        )
      ) {
        return plain(false, {
          ...base,
          says: DIALOGUE.allyTaunts,
          cancelsAlliance: true,
          end: true,
        });
      }

      return plain(false, base);
    }

    // It pays: gold, or the advance it values least to lose (`givemore`, `givemoreciv`), and, without peace, a ceasefire.
    const gives =
      wanted === null ||
      (tribute !== 0 && found.computerCount <= found.personCount)
        ? new Gold(tribute)
        : wanted;

    return plain(true, { ...base, gives: [gives], ceasefire: !peace });
  };

  const governmentIndex = (player: Player): number => {
    const government = senateGovernment(dependencies, player);

    return government === 'democracy' ? 6 : government === 'republic' ? 5 : 0;
  };

  // The person's proposal still being answered (with any asks of the computer player's after it), if any.
  const pending = (
    negotiation: Negotiation,
    meeting: Meeting
  ): IProposal | null => {
    const history = actions(negotiation);

    for (let index = history.length - 1; index >= 0; index--) {
      const action = history[index];

      if (
        action instanceof Proposal &&
        !(action instanceof Initiate) &&
        !(action instanceof Dialogue) &&
        action.by() === meeting.sides.person &&
        !asks.has(action)
      ) {
        return resolutionOf(negotiation, action) === null ? action : null;
      }

      if (
        action instanceof Resolution &&
        action.by() === meeting.sides.computer &&
        action.proposal().by() === meeting.sides.person
      ) {
        return null;
      }
    }

    return null;
  };

  // The computer player's next step in answering `proposal`.
  const respond = (
    negotiation: Negotiation,
    meeting: Meeting,
    proposal: IProposal
  ): IAction => {
    const answer = answerTo(negotiation, meeting, proposal),
      made = actions(negotiation).filter(
        (action) => asks.get(action)?.proposal === proposal
      ),
      lastAsk = made[made.length - 1],
      lastResolution =
        lastAsk === undefined ? null : resolutionOf(negotiation, lastAsk),
      decline = (outcome: Outcome) =>
        withOutcome(
          new Decline(
            meeting.sides.computer,
            proposal as unknown as Proposal,
            ruleRegistry
          ),
          outcome
        ),
      accept = (outcome: Outcome) =>
        withOutcome(
          new Accept(
            meeting.sides.computer,
            proposal as unknown as Proposal,
            ruleRegistry
          ),
          outcome
        );

    if (lastAsk !== undefined && lastResolution instanceof Decline) {
      const off = answer.off(asks.get(lastAsk)!.index);

      if (off !== null) {
        return decline(off);
      }
    }

    for (let index = made.length; index < answer.asks.length; index++) {
      const ask = answer.asks[index]();

      if (ask !== null) {
        asks.set(ask, { proposal, index });

        return ask;
      }
    }

    return answer.accept ? accept(answer.onAccept) : decline(answer.onDecline);
  };

  // Whether the person must accept `proposal` of the computer player's: a ceasefire or peace its Senate forces on it.
  //  Once a ceasefire was forced, peace is forced too only one time in two (`:3486-3500`).
  const forced = (meeting: Meeting, proposal: IProposal): boolean => {
    const { computer, person } = meeting.sides;

    if (
      !(proposal instanceof OfferCeasefire || proposal instanceof OfferPeace) ||
      proposal.by() !== computer
    ) {
      return false;
    }

    if (pacifies(dependencies, computer)) {
      return false;
    }

    if (
      proposal instanceof OfferPeace &&
      meeting.senateBlocked &&
      oneIn(proposal, 'senate', random, 2)
    ) {
      return false;
    }

    return senateBlocks(dependencies, person, computer, 'refuse-offer');
  };

  /** The computer player's next step, or `null` when it's the person's to take. */
  const computerStep = (negotiation: Negotiation): IAction | null => {
    const meeting = meetingOf(negotiation);

    if (negotiation.terminated()) {
      return null;
    }

    if (meeting === null) {
      const sides = sidesOf(dependencies, negotiation);

      return sides !== null && sides.computerLed && last(negotiation) === null
        ? new Initiate(sides.computer, negotiation, ruleRegistry)
        : null;
    }

    const { computer, person, computerLed } = meeting.sides,
      action = last(negotiation),
      end = () => new Terminate(computer, negotiation, ruleRegistry),
      patient = () => patienceOf(meeting.sides).spent() < limitOf(meeting);

    if (action === null) {
      return computerLed
        ? new Initiate(computer, negotiation, ruleRegistry)
        : null;
    }

    // The person asked for an audience (`diplo_meet_refuses_audience`).
    if (action instanceof Initiate && action.by() === person) {
      const refuses =
        hasFlag(dependencies, computer, person, WAR_THIS_TURN) ||
        (!patient() && hasFlag(dependencies, person, computer, MET_THIS_TURN));

      return refuses
        ? new Decline(computer, action as unknown as Proposal, ruleRegistry)
        : new Accept(computer, action as unknown as Proposal, ruleRegistry);
    }

    if (action instanceof Decline && action.proposal() instanceof Initiate) {
      // Turned away, its Senate may force a treaty (`diplo_meet_senate_forces_treaty`).
      if (
        action.by() === person &&
        !meeting.declareWar &&
        !reputationWar(dependencies, meeting)
      ) {
        const war = atWar(dependencies, computer, person),
          afraid =
            !atPeace(dependencies, computer, person) && meeting.fear !== 0,
          already = actions(negotiation).some(
            (step) => step instanceof Dialogue && step.by() === computer
          );

        if (
          !already &&
          (war || afraid) &&
          (pacifies(dependencies, computer) ||
            senateBlocks(dependencies, person, computer, 'ignore-audience'))
        ) {
          // Afraid without peace, peace (which ends the war: `:3610-3625`); else a ceasefire.
          return say(
            computer,
            afraid
              ? DIALOGUE.senateForcedPeace
              : DIALOGUE.senateForcedCeasefire,
            negotiation
          );
        }
      }

      return end();
    }

    if (action instanceof Acknowledge) {
      const key = (action.proposal() as Dialogue).key();

      if (ENDING.includes(key)) {
        return end();
      }
    }

    // A person's proposal, being answered.
    const answering = pending(negotiation, meeting);

    if (answering !== null) {
      if (action instanceof Proposal && action.by() === computer) {
        return null;
      }

      return respond(negotiation, meeting, answering);
    }

    // Just answered: what follows, then the menu again while its patience lasts.
    if (
      action instanceof Resolution &&
      action.by() === computer &&
      action.proposal().by() === person &&
      !(action.proposal() instanceof Initiate)
    ) {
      const outcome = outcomeOf(action);

      if (outcome.says) {
        return say(computer, outcome.says, negotiation);
      }

      if (outcome.end) {
        return end();
      }

      return patient() ? null : end();
    }

    if (action instanceof Proposal && action.by() === computer) {
      // Its own proposal or dialogue, for the person to answer.
      return null;
    }

    // Its refused ceasefire or peace: overruled by its Great Wall or United Nations (the `Resolved` rules make the
    //  treaty), or perhaps a concession.
    const refusedOffer =
      action instanceof Decline &&
      action.by() === person &&
      (action.proposal() instanceof OfferCeasefire ||
        action.proposal() instanceof OfferPeace ||
        (action.proposal() instanceof Gift &&
          askedFor(action.proposal()) !== null))
        ? action.proposal() instanceof Gift
          ? askedFor(action.proposal())
          : action.proposal()
        : null;

    if (
      refusedOffer !== null &&
      refusedOffer.by() === computer &&
      !pacifies(dependencies, computer)
    ) {
      const gift = concession(negotiation, meeting, refusedOffer);

      if (gift !== null) {
        return tag(gift, agendaItems.get(refusedOffer)!);
      }

      if (refusedOffer instanceof OfferCeasefire) {
        return tag(
          say(computer, DIALOGUE.warContinues, negotiation),
          AGENDA.ceasefire
        );
      }
    }

    // A call for help refused: a payment to persuade (`:1300-1325`), then the consequences.
    if (
      action instanceof Decline &&
      action.by() === person &&
      agendaItems.get(action.proposal()) === AGENDA.callForHelp
    ) {
      const call = action.proposal();

      if (call instanceof JoinWar) {
        const bonus = helpBonus(dependencies, computer, call.against());

        if (bonus > 0) {
          const gift = new Gift(
            new Gold(bonus),
            computer,
            negotiation,
            ruleRegistry
          );

          asks.set(gift, { proposal: call, index: 0 });

          return tag(gift, AGENDA.callForHelp);
        }
      }

      if (meeting.helpRefusal === 'cancel') {
        return tag(
          say(computer, DIALOGUE.helpRefused, negotiation),
          AGENDA.callForHelp
        );
      }
    }

    if (
      action instanceof Decline &&
      action.by() === person &&
      action.proposal() instanceof Gift &&
      agendaItems.get(action.proposal()) === AGENDA.callForHelp &&
      meeting.helpRefusal === 'cancel'
    ) {
      return tag(
        say(computer, DIALOGUE.helpRefused, negotiation),
        AGENDA.callForHelp
      );
    }

    if (
      action instanceof Decline &&
      action.by() === person &&
      agendaItems.get(action.proposal()) === AGENDA.violators
    ) {
      return tag(
        say(computer, DIALOGUE.violatorsRefused, negotiation),
        AGENDA.violators
      );
    }

    const begun = actions(negotiation).some(
      (step) => step instanceof Accept && step.proposal() instanceof Initiate
    );

    if (!begun) {
      return null;
    }

    // An exchange accepted is offered again, as the original's loop does.
    const lastItem = agendaCursor(negotiation, computer),
      repeat =
        lastItem === AGENDA.exchange + 1 &&
        action instanceof Accept &&
        agendaItems.get(action.proposal()) === AGENDA.exchange &&
        action.proposal() instanceof ExchangeKnowledge;

    if (repeat || lastItem < AGENDA.done) {
      const next = agendaFrom(
        negotiation,
        meeting,
        repeat ? AGENDA.exchange : lastItem
      );

      if (next !== null) {
        return next;
      }
    }

    // The agenda is done: the menu is the person's while patience lasts.
    return patient() ? null : end();
  };

  // Where the computer player is in its agenda: one past the last item it said.
  const agendaCursor = (negotiation: Negotiation, computer: Player): number =>
    actions(negotiation).reduce(
      (cursor, action) =>
        action.by() === computer && agendaItems.has(action)
          ? Math.max(cursor, agendaItems.get(action)! + 1)
          : cursor,
      0
    );

  /** The person's possible steps: answers to the computer player, or the menu. */
  const personSteps = (negotiation: Negotiation): IAction[] => {
    const meeting = meetingOf(negotiation),
      sides = meeting?.sides ?? sidesOf(dependencies, negotiation);

    if (sides === null || negotiation.terminated()) {
      return [];
    }

    const { person, computerLed } = sides,
      action = last(negotiation);

    if (action === null) {
      return computerLed
        ? []
        : [new Initiate(person, negotiation, ruleRegistry)];
    }

    if (meeting === null || computerStep(negotiation) !== null) {
      return [];
    }

    if (action instanceof Dialogue && action.by() !== person) {
      return [
        new Acknowledge(person, action as unknown as Proposal, ruleRegistry),
      ];
    }

    if (
      action instanceof Proposal &&
      action.by() !== person &&
      !action.resolved()
    ) {
      const proposal = action as unknown as Proposal,
        accept = new Accept(person, proposal, ruleRegistry),
        refuse = new Decline(person, proposal, ruleRegistry);

      if (forced(meeting, action)) {
        forcedOffers.add(action);

        return [accept];
      }

      // What the person can't pay is only refused.
      if (
        (action instanceof DemandTribute &&
          action.tribute() instanceof Gold &&
          (action.tribute() as Gold).value() > gold(dependencies, person)) ||
        (action instanceof SellAdvance &&
          action.price().value() > gold(dependencies, person))
      ) {
        return [refuse];
      }

      // What costs the person nothing first (civ-clone/web-renderer#674): receiving the emissary, a treaty, an
      //  alliance or a gift taken; a demand, a call to war, an exchange or a sale refused.
      return action instanceof Initiate ||
        action instanceof OfferPeace ||
        action instanceof OfferCeasefire ||
        action instanceof ProposeAlliance ||
        action instanceof Gift
        ? [accept, refuse]
        : [refuse, accept];
    }

    return [
      ...menu(negotiation, meeting),
      new Terminate(person, negotiation, ruleRegistry),
    ];
  };

  return {
    computerStep,
    personSteps,
    menu,
    answerTo,
    limitOf,
    exchange,
  };
};

export type Talks = ReturnType<typeof talks>;

export default talks;
