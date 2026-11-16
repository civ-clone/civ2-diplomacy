import {
  CHANGED_THIS_TURN,
  HOSTILE_INTENT,
  MET_THIS_TURN,
  SNEAK_ATTACK,
  WAR_THIS_TURN,
  hasFlag,
} from './flags';
import {
  TreatyLevel,
  hasTreatyLevel,
} from '@civ-clone/base-diplomacy/lib/treatyLevel';
import {
  advanceCount,
  allied,
  atPeace,
  atWar,
  attack,
  cities,
  civilize,
  human,
  hostile,
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
  allianceWilling,
  asksSweetener,
  demandedTribute,
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
import { advanceValue, advancesWanted } from './effects';
import { attitudeLevel, reputation } from './relations';
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
import MapMaking from '@civ-clone/base-science-advance-mapmaking/MapMaking';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import OfferCeasefire from '@civ-clone/library-diplomacy/Proposals/OfferCeasefire';
import OfferPeace from '@civ-clone/library-diplomacy/Proposals/OfferPeace';
import Player from '@civ-clone/core-player/Player';
import ProposeAlliance from '@civ-clone/library-diplomacy/Proposals/ProposeAlliance';
import Resolution from '@civ-clone/core-diplomacy/Proposal/Resolution';
import SellAdvance from '@civ-clone/library-diplomacy/Proposals/SellAdvance';
import ShareMaps from '@civ-clone/library-diplomacy/Proposals/ShareMaps';
import Terminate from '@civ-clone/core-diplomacy/Negotiation/Terminate';
import Unit from '@civ-clone/core-unit/Unit';
import { gold } from '@civ-clone/base-diplomacy/lib/standing';
import { lastContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { proposalAvailable } from '@civ-clone/base-diplomacy/lib/personMeeting';
import { senateBlocks, senateGovernment } from './senate';

// Civilization II's talks between a computer player and a person (OpenCiv2 `diplo_ai_meet_player`,
//  `diplomacy.cpp:3850-4135`), as the steps of a `Negotiation`. Whoever opens it, the computer player first goes through
//  its own business, in the original's order (`agenda`), then the person may propose from the menu (`menu`, the
//  original's `diplo_proposal_menu`) for as long as the computer player's patience lasts, and the computer player
//  answers each proposal (`plan`), asking first for whatever sweetens the deal.
//
// The steps read only the negotiation and the game: the computer player's evaluation is made once, when the meeting
//  starts, and each chance drawn is drawn once and kept with the proposal it belongs to, so a client may ask for the
//  steps as often as it likes. What each answer does is in the `Resolved` rules (`Rules/talks`).
//
// Two computer players don't talk here: they meet at the start of a turn (`Rules/turnStart`, `diplo_civs_meet`).

/** The dialogue keys the computer player says. The words are the renderer's. */
export const DIALOGUE = {
  // It cancels the alliance with an ally that didn't pay (`diplo_meet_ally_dismissed`).
  allyDismissed: 'civ2.ally-dismissed',
  // It declares war: a threat, a refused demand, a bad reputation.
  war: 'civ2.war',
  // A refused ceasefire it won't sweeten: the war goes on.
  warContinues: 'civ2.war-continues',
  // Taunted by a strong ally's request, it cancels the alliance (`str_tauntally`).
  allyTaunts: 'civ2.ally-taunts',
  // The person's Senate forced a ceasefire or peace when the person refused to listen.
  senateForcedCeasefire: 'civ2.senate-forced-ceasefire',
  senateForcedPeace: 'civ2.senate-forced-peace',
  // Its units leave the person's land (`str_apologize`).
  withdrawn: 'civ2.withdrawn',
};

export interface TalksRules {
  dependencies: Dependencies;
  random: () => number;
}

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

const evaluations = new WeakMap<Negotiation, Evaluation>();

/** The computer player's evaluation, made the first time the meeting asks for it. */
export const evaluationOf = (
  dependencies: Dependencies,
  negotiation: Negotiation,
  { computer, person }: Sides
): Evaluation => {
  if (!evaluations.has(negotiation)) {
    evaluations.set(negotiation, evaluate(dependencies, computer, person));
  }

  return evaluations.get(negotiation)!;
};

// Each computer step's place in the agenda, and each ask's place in its plan.
const agendaItems = new WeakMap<object, number>();
const asks = new WeakMap<object, { proposal: IProposal; index: number }>();

/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
export const agendaItemOf = (action: object): number | undefined =>
  agendaItems.get(action);

/** The person's proposal a computer player's ask belongs to, or `null`. */
export const askedFor = (action: object): IProposal | null =>
  asks.get(action)?.proposal ?? null;

/** The agenda, in the original's order. */
export const AGENDA = {
  exchange: 0,
  warOnTarget: 1,
  tribute: 2,
  tech: 3,
  dismissal: 4,
  threat: 5,
  alliance: 6,
  ceasefire: 7,
  peace: 8,
  menu: 9,
};

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

/** How the computer player answers one of the person's proposals. */
export interface Plan {
  // What it asks first, in order: each made when it's due.
  asks: (() => IProposal | null)[];
  // Whether the deal is off when the person refuses ask `index`.
  offIfRefused: (index: number) => boolean;
  // The answer once the asks are done.
  accept: boolean;
  // What it says after declining, if anything (a declaration of war).
  thenSays: string | null;
}

const plans = new WeakMap<IProposal, Plan>();

// What an ally gives when asked (`AskAlly`), worked out when it answers.
const allyGifts = new WeakMap<IProposal, Advance | Gold>();

/** What the computer player gives for the person's `AskAlly`, if it agreed. */
export const allyGiftFor = (proposal: IProposal): Advance | Gold | null =>
  allyGifts.get(proposal) ?? null;

export const talks = ({ dependencies, random }: TalksRules) => {
  const { ruleRegistry } = dependencies,
    feelings = attitudeOf(dependencies),
    last = (negotiation: Negotiation): IAction | null =>
      negotiation.lastInteraction(),
    actions = (negotiation: Negotiation): IAction[] =>
      negotiation.interactions(),
    said = (
      negotiation: Negotiation,
      by: Player,
      Type: new (...args: any[]) => IAction
    ): IAction[] =>
      actions(negotiation).filter(
        (action) => action instanceof Type && action.by() === by
      ),
    resolutionOf = (
      negotiation: Negotiation,
      proposal: IProposal
    ): Resolution | null =>
      (actions(negotiation).find(
        (action) =>
          action instanceof Resolution && action.proposal() === proposal
      ) as Resolution | undefined) ?? null,
    say = (negotiation: Negotiation, by: Player, key: string): Dialogue =>
      new Dialogue(by, key, negotiation, ruleRegistry),
    tag = <T extends object>(action: T, item: number): T => {
      agendaItems.set(action, item);

      return action;
    },
    patienceOf = (computer: Player, person: Player) =>
      patience(dependencies, computer, person),
    limitOf = (negotiation: Negotiation, sides: Sides): number =>
      patienceLimit(
        dependencies,
        sides.computer,
        sides.person,
        evaluationOf(dependencies, negotiation, sides).attitude
      ),
    paid = (negotiation: Negotiation, { computer, person }: Sides): boolean =>
      actions(negotiation).some(
        (action) =>
          action instanceof Accept &&
          action.by() === person &&
          action.proposal().by() === computer &&
          (action.proposal() instanceof DemandTribute ||
            action.proposal() instanceof JoinWar)
      ),
    // The person's third parties the computer player might name: the other players it has met.
    thirdParties = (computer: Player, person: Player): Player[] =>
      dependencies.playerRegistry
        .entries()
        .filter(
          (third: Player) =>
            third !== computer &&
            third !== person &&
            inContact(dependencies, computer, third) &&
            inContact(dependencies, person, third)
        ),
    lastContactTurns = (computer: Player, person: Player): number => {
      const turn = lastContact(dependencies, computer, person);

      return turn === undefined ? Infinity : dependencies.turn.value() - turn;
    };

  // The computer player's agenda, from item `from` on: the next thing it says, or `null` when it has finished.
  const agendaFrom = (
    negotiation: Negotiation,
    sides: Sides,
    from: number
  ): IAction | null => {
    const { computer, person } = sides,
      evaluation = evaluationOf(dependencies, negotiation, sides),
      alliance = allied(dependencies, computer, person),
      war = atWar(dependencies, computer, person),
      havePaid = paid(negotiation, sides),
      warTargetRefusedByAlly = actions(negotiation).some(
        (action) =>
          action instanceof Decline &&
          action.proposal() instanceof JoinWar &&
          agendaItems.get(action.proposal()) === AGENDA.warOnTarget &&
          alliance
      ),
      propose =
        (alliance && evaluation.reputation > 4 && !havePaid) ||
        warTargetRefusedByAlly,
      demandedGold = said(negotiation, computer, DemandTribute).some(
        (action) => (action as DemandTribute).tribute() instanceof Gold
      ),
      aggressive = evaluation.aggressive && !havePaid && !evaluation.declareWar,
      items: (() => IAction | null)[] = [
        // A swap of advances (`diplo_tech_exchange`, mode 1), when each has something and it isn't cold.
        () => {
          const theirs = advancesWanted(dependencies, person, computer),
            ours = advancesWanted(dependencies, computer, person);

          if (
            theirs.length === 0 ||
            ours.length === 0 ||
            (!alliance &&
              (vendetta(dependencies, computer, person) ||
                hasFlag(dependencies, person, computer, SNEAK_ATTACK) ||
                evaluation.capturedCities > 0 ||
                attitudeLevel(evaluation.attitude) > 5 ||
                evaluation.aggressive))
          ) {
            return null;
          }

          return new ExchangeKnowledge(
            ours,
            computer,
            negotiation,
            ruleRegistry
          );
        },
        // Its war target (`diplo_meet_ask_war_on_target`).
        () =>
          evaluation.warTarget !== null &&
          (evaluation.requestMode !== 0 || alliance) &&
          !atWar(dependencies, person, evaluation.warTarget)
            ? new JoinWar(
                evaluation.warTarget,
                computer,
                negotiation,
                ruleRegistry
              )
            : null,
        // Tribute in gold (`diplo_meet_demand_tribute`).
        () => {
          let tribute = evaluation.tribute;

          if (alliance) {
            tribute = Math.min(
              tribute,
              Math.max(100, Math.trunc(gold(dependencies, person) / 2))
            );
          }

          return tribute > 0 &&
            (evaluation.requestMode === 2 || propose) &&
            tribute <= gold(dependencies, person)
            ? new DemandTribute(
                new Gold(tribute),
                computer,
                negotiation,
                ruleRegistry
              )
            : null;
        },
        // An advance (`diplo_meet_demand_tech`).
        () => {
          const wanted = advancesWanted(dependencies, person, computer);

          return (evaluation.requestMode !== 0 ||
            propose ||
            (alliance && attitudeLevel(evaluation.attitude) > 3)) &&
            wanted.length > 0 &&
            !demandedGold
            ? new DemandTribute(wanted[0], computer, negotiation, ruleRegistry)
            : null;
        },
        // An ally that didn't pay is dismissed (`diplo_meet_ally_dismissed`).
        () =>
          alliance &&
          (evaluation.aggressive || evaluation.attitude > 49) &&
          !havePaid
            ? say(negotiation, computer, DIALOGUE.allyDismissed)
            : null,
        // War (`diplo_meet_threaten_war`).
        () => {
          const met = lastContact(dependencies, computer, person) !== undefined;

          return aggressive &&
            ((evaluation.tribute > 50 &&
              (atPeace(dependencies, computer, person) ||
                (!hostile(dependencies, computer, person, feelings) && met))) ||
              demandedGold ||
              !met ||
              !sides.computerLed)
            ? say(negotiation, computer, DIALOGUE.war)
            : null;
        },
        // An alliance (`diplo_meet_propose_alliance`).
        () => {
          if (
            !atPeace(dependencies, computer, person) ||
            alliance ||
            evaluation.targetIsLeader
          ) {
            return null;
          }

          const computerRank = rank(dependencies, computer),
            personRank = rank(dependencies, person),
            ranked = personRank < 6 && computerRank < 6,
            target = evaluation.warTarget,
            commonEnemy =
              target !== null && hasTreatyWith(dependencies, person, target),
            personAllies = dependencies.playerRegistry
              .entries()
              .filter((third) => allied(dependencies, person, third)).length;

          if (
            (evaluation.fear !== 0 || ranked || commonEnemy) &&
            (evaluation.peaceInclination > 1 || ranked) &&
            personAllies === 0 &&
            (evaluation.attitude < 25 ||
              (evaluation.attitude < 50 && commonEnemy)) &&
            (commonEnemy || ranked) &&
            evaluation.reputation < 4 &&
            evaluation.capturedCities < 2 &&
            (personRank < 6 || computerRank < 5)
          ) {
            return target !== null
              ? new JoinWar(target, computer, negotiation, ruleRegistry)
              : new ProposeAlliance(computer, negotiation, ruleRegistry);
          }

          return null;
        },
        // A ceasefire, at war (`diplo_meet_offer_ceasefire`).
        () =>
          war ? new OfferCeasefire(computer, negotiation, ruleRegistry) : null,
        // Peace (`diplo_meet_offer_peace`).
        () => {
          if (atPeace(dependencies, computer, person) || war) {
            return null;
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

          const ceasefire =
            treaty(dependencies, computer, person) === TreatyLevel.Ceasefire;

          return evaluation.suppressedAggression ||
            ((havePaid ||
              lastContact(dependencies, computer, person) === undefined) &&
              !ceasefire) ||
            ((evaluation.fear !== 0 ||
              attitudeLevel(evaluation.attitude) <= threshold) &&
              !evaluation.targetIsLeader &&
              evaluation.reputation + evaluation.capturedCities <
                evaluation.fear + 4)
            ? new OfferPeace(computer, negotiation, ruleRegistry)
            : null;
        },
      ];

    for (let index = from; index < items.length; index++) {
      const action = items[index]();

      if (action !== null) {
        return tag(action, index);
      }

      // Still aggressive after the threats: it says no more (`if (ai_aggressive) return`).
      if (index === AGENDA.threat && aggressive) {
        return null;
      }
    }

    return null;
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

  // What the person may propose, in the menu's order (`diplo_proposal_menu`), each allowed by `ProposalAvailable`.
  const menu = (negotiation: Negotiation, sides: Sides): IProposal[] => {
    const { computer, person } = sides,
      wantedByComputer = advancesWanted(dependencies, person, computer),
      treasury = gold(dependencies, person),
      strongest = dependencies.unitRegistry
        .getByPlayer(person)
        .filter((unit: Unit) => unit.attack().value() > 0)
        .sort((a: Unit, b: Unit) => b.attack().value() - a.attack().value())[0],
      proposals: (IProposal | null)[] = [
        new ProposeAlliance(person, negotiation, ruleRegistry),
        new OfferPeace(person, negotiation, ruleRegistry),
        new AskAlly(person, negotiation, ruleRegistry),
        new DemandTribute(
          new Gold(personDemandTribute(negotiation, sides, 4)),
          person,
          negotiation,
          ruleRegistry
        ),
        new DemandWithdrawal(person, negotiation, ruleRegistry),
        new CancelAlliance(person, negotiation, ruleRegistry),
        wantedByComputer.length > 0
          ? new ExchangeKnowledge(
              wantedByComputer,
              person,
              negotiation,
              ruleRegistry
            )
          : null,
        ...thirdParties(computer, person).map(
          (third) => new JoinWar(third, person, negotiation, ruleRegistry)
        ),
        new ShareMaps(person, negotiation, ruleRegistry),
        ...wantedByComputer
          .slice(0, 2)
          .map(
            (advance) => new Gift(advance, person, negotiation, ruleRegistry)
          ),
        ...[1, 2, 3, 4]
          .map((quarters) => Math.trunc((treasury * quarters) / 4 / 50) * 50)
          .filter(
            (amount, index, amounts) =>
              amount > 0 && amounts.indexOf(amount) === index
          )
          .map(
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

  // The tribute the computer player pays the person: `demandedTribute` with the game's numbers.
  const personDemandTribute = (
    negotiation: Negotiation,
    sides: Sides,
    proposal: 3 | 4 | 5
  ): number => {
    const { computer, person } = sides,
      evaluation = evaluationOf(dependencies, negotiation, sides);

    return demandedTribute({
      proposal,
      fear: evaluation.fear,
      computerGold: gold(dependencies, computer),
      computerRank: rank(dependencies, computer),
      personRank: rank(dependencies, person),
      turnsSinceContact: evaluation.turnsSinceContact,
      atPeace: atPeace(dependencies, person, computer),
      computerPacifies: pacifies(dependencies, computer),
    });
  };

  // How the computer player answers the person's `proposal` (`diplo_ai_answer_proposal`, the favour and gift menus).
  const planFor = (
    negotiation: Negotiation,
    sides: Sides,
    proposal: IProposal
  ): Plan => {
    if (plans.has(proposal)) {
      return plans.get(proposal)!;
    }

    const { computer, person } = sides,
      evaluation = evaluationOf(dependencies, negotiation, sides),
      spent = patienceOf(computer, person).spent(),
      difficulty = level(dependencies),
      computerRank = rank(dependencies, computer),
      personRank = rank(dependencies, person),
      computerStrength = strength(dependencies, computer),
      personStrength = strength(dependencies, person),
      alliance = allied(dependencies, computer, person),
      rawReputation = reputation(dependencies).get(person),
      target = evaluation.warTarget,
      targetFightingAndStrong =
        target !== null &&
        !hostile(dependencies, person, target, feelings) &&
        inContact(dependencies, person, target) &&
        atWar(dependencies, computer, target) &&
        (atPeace(dependencies, person, target)
          ? Math.trunc((computerStrength * 3) / 2)
          : computerStrength * 2) <= strength(dependencies, target),
      targetIsPersonsAlly =
        target !== null && allied(dependencies, person, target),
      wanted = advancesWanted(dependencies, person, computer),
      plain = (accept: boolean, thenSays: string | null = null): Plan => ({
        asks: [],
        offIfRefused: () => true,
        accept,
        thenSays,
      }),
      sweetened = (alliance: boolean, reasons: number): Plan => {
        const sweeten = asksSweetener(
            spent,
            evaluation.attitude,
            evaluation.reputation,
            evaluation.declareWar,
            alliance
          ),
          askTech =
            sweeten &&
            ((alliance ? (reasons & 3) === 0 : (reasons & 6) === 0) ||
              evaluation.declareWar) &&
            wanted.length > 0,
          gift = sweetenerGold(
            gold(dependencies, person),
            computerStrength,
            personStrength,
            rawReputation,
            alliance
          ),
          askGold =
            sweeten &&
            !askTech &&
            ((alliance ? (reasons & 2) === 0 : (reasons & 4) === 0) ||
              evaluation.declareWar) &&
            gift > 0,
          planned: (() => IProposal | null)[] = [
            ...(askTech
              ? [
                  () =>
                    new DemandTribute(
                      wanted[0],
                      computer,
                      negotiation,
                      ruleRegistry
                    ),
                ]
              : []),
            ...(askGold
              ? [
                  () =>
                    new DemandTribute(
                      new Gold(gift),
                      computer,
                      negotiation,
                      ruleRegistry
                    ),
                ]
              : []),
            ...(target !== null && !atWar(dependencies, person, target)
              ? [() => new JoinWar(target, computer, negotiation, ruleRegistry)]
              : []),
          ];

        return {
          asks: planned,
          offIfRefused: (index: number) =>
            planned[index] !== undefined &&
            (index < planned.length - 1 ||
              target === null ||
              atWar(dependencies, person, target) ||
              reasons !== 0 ||
              personRank === 7 ||
              evaluation.reputation > (alliance ? 2 : 3) ||
              evaluation.declareWar),
          accept: true,
          thenSays: null,
        };
      };

    let plan: Plan;

    if (proposal instanceof ProposeAlliance) {
      const { agree, reasons } = allianceWilling({
        level: difficulty,
        personAllies: dependencies.playerRegistry
          .entries()
          .filter((third) => allied(dependencies, person, third)).length,
        hasWarTarget: target !== null,
        computerRank,
        personRank,
        computerStrength,
        personStrength,
        targetIsLeader: evaluation.targetIsLeader,
        fear: evaluation.fear,
        peaceInclination: evaluation.peaceInclination,
        attitude: evaluation.attitude,
        reputation: evaluation.reputation,
        turn: dependencies.turn.value(),
        targetFightingAndStrong,
        commonEnemy: target !== null,
        vendetta: vendetta(dependencies, computer, person),
        targetIsPersonsAlly,
        patienceSpent: spent,
      });

      plan = agree ? sweetened(true, reasons) : plain(false);
    } else if (proposal instanceof OfferPeace) {
      const flags = peaceFlags({
        level: difficulty,
        targetIsLeader: evaluation.targetIsLeader,
        attitude: evaluation.attitude,
        reputation: evaluation.reputation,
        targetFightingAndStrong,
        targetIsPersonsAlly,
        vendetta: vendetta(dependencies, computer, person),
        attack: attack(dependencies, computer),
        personPacifies: pacifies(dependencies, person),
      });

      plan =
        flags === 0
          ? plain(false)
          : (flags & 8) !== 0 && (flags & 7) === 0
          ? plain(true)
          : sweetened(false, flags);
    } else if (
      proposal instanceof AskAlly ||
      proposal instanceof DemandTribute ||
      proposal instanceof DemandWithdrawal
    ) {
      const kind: 3 | 4 | 5 =
          proposal instanceof AskAlly
            ? 3
            : proposal instanceof DemandTribute
            ? 4
            : 5,
        tribute = personDemandTribute(negotiation, sides, kind);

      if (
        evaluation.declareWar ||
        hasFlag(dependencies, computer, person, HOSTILE_INTENT)
      ) {
        plan = plain(false, DIALOGUE.war);
      } else if (kind === 5) {
        plan = plain(withdraws(negotiation, sides, proposal));
      } else if (tribute > 0) {
        if (kind === 3) {
          allyGifts.set(proposal, new Gold(tribute));
        }

        plan = plain(true);
      } else if (!alliance) {
        const refusedPolitely =
          (!evaluation.initialAggressive && evaluation.attitude < 76) ||
          ((evaluation.fear !== 0 ||
            pacifies(dependencies, person) ||
            hasFlag(dependencies, computer, person, CHANGED_THIS_TURN) ||
            evaluation.attitude < 26) &&
            roll(() => drawn(proposal, 'war', random), 3) !== 0);

        plan = plain(false, refusedPolitely ? null : DIALOGUE.war);
      } else if (kind === 3 && allyGives(negotiation, sides) !== null) {
        allyGifts.set(proposal, allyGives(negotiation, sides)!);
        plan = plain(true);
      } else {
        const sympathy =
            (advanceCount(dependencies, person) <
              advanceCount(dependencies, computer) &&
              personRank < computerRank) ||
            personRank < 4,
          taunts =
            !sympathy &&
            (evaluation.initialAggressive ||
              evaluation.attitude >= 51 ||
              evaluation.targetIsLeader);

        plan = plain(false, taunts ? DIALOGUE.allyTaunts : null);
      }
    } else if (proposal instanceof CancelAlliance) {
      plan = plain(true);
    } else if (proposal instanceof ExchangeKnowledge) {
      const refused =
          !alliance &&
          (vendetta(dependencies, computer, person) ||
            hasFlag(dependencies, person, computer, SNEAK_ATTACK) ||
            evaluation.capturedCities > 0 ||
            evaluation.aggressive ||
            attitudeLevel(evaluation.attitude) > 5),
        ours = advancesWanted(dependencies, computer, person),
        sells =
          !refused &&
          ours.length > 0 &&
          (advanceCount(dependencies, person) <
            advanceCount(dependencies, computer) ||
            (!alliance &&
              attitudeLevel(evaluation.attitude) >
                (atPeace(dependencies, computer, person) ? 5 : 4)));

      if (refused || ours.length === 0) {
        plan = plain(false);
      } else if (sells) {
        const advance = ours[0],
          price = sellPrice({
            value: advanceValue(dependencies, computer, advance),
            knowers: dependencies.playerRegistry
              .entries()
              .filter((player) =>
                knows(dependencies, player, advance.sourceClass())
              ).length,
            attitude: evaluation.attitude,
            personTopPowerAfter200:
              personRank === 7 && dependencies.turn.value() > 200,
            level: difficulty,
            personGold: gold(dependencies, person),
            allied: alliance,
            personBehind:
              advanceCount(dependencies, person) <
              advanceCount(dependencies, computer),
            personFarBehind:
              advanceCount(dependencies, person) + 5 <
              advanceCount(dependencies, computer),
          });

        plan =
          price <= gold(dependencies, person)
            ? {
                asks: [
                  () =>
                    new SellAdvance(
                      advance,
                      new Gold(price),
                      computer,
                      negotiation,
                      ruleRegistry
                    ),
                ],
                offIfRefused: () => true,
                // Selling is instead of exchanging.
                accept: false,
                thenSays: null,
              }
            : plain(false);
      } else {
        plan = plain(true);
      }
    } else if (proposal instanceof JoinWar) {
      const against = proposal.against(),
        distrust = warDistrust({
          reputation: evaluation.reputation,
          attack: attack(dependencies, computer),
          vendetta: vendetta(dependencies, computer, person),
          personAtWarWithTarget: atWar(dependencies, person, against),
          targetRank: rank(dependencies, against),
          personRank,
          computerRank,
          allied: alliance,
        }),
        willing =
          !atWar(dependencies, computer, against) &&
          !allied(dependencies, computer, against) &&
          joinsWar(
            distrust,
            allied(dependencies, computer, against),
            vendetta(dependencies, computer, person),
            atWar(dependencies, person, against),
            rank(dependencies, against) > personRank
          ),
        price = warPrice({
          personReputation: rawReputation,
          targetReputation: reputation(dependencies).get(against),
          credit: reputation(dependencies).credit(computer, person),
          computerGold: gold(dependencies, computer),
          personGold: gold(dependencies, person),
          targetStrength: strength(dependencies, against),
          computerTreatyWithTarget: hasTreatyWith(
            dependencies,
            computer,
            against
          ),
          computerAlliedWithTarget: allied(dependencies, computer, against),
          targetIsLeader:
            rank(dependencies, against) === 7 &&
            cities(dependencies, against) > 4,
          personAtWarWithTarget: atWar(dependencies, person, against),
          allied: alliance,
          computerAtWarWithAnyone: dependencies.playerRegistry
            .entries()
            .some((third) => atWar(dependencies, computer, third)),
          targetSneakAttackedPerson: hasFlag(
            dependencies,
            against,
            person,
            SNEAK_ATTACK
          ),
          personRank,
          computerRank,
          targetRank: rank(dependencies, against),
          targetNukedPerson: false,
          personNukedTarget: false,
        });

      plan =
        willing && price <= gold(dependencies, person)
          ? {
              asks: [
                () =>
                  new DemandTribute(
                    new Gold(price),
                    computer,
                    negotiation,
                    ruleRegistry
                  ),
              ],
              offIfRefused: () => true,
              accept: true,
              thenSays: null,
            }
          : plain(false);
    } else if (proposal instanceof ShareMaps) {
      plan = plain(
        sharesMaps({
          allied: alliance,
          personOwnsMapWonder:
            ownsWonder(dependencies, person, 'marco-polos-embassy') ||
            ownsWonder(dependencies, person, 'magellans-expedition'),
          attitude: evaluation.attitude,
          personKnowsMapMaking: knows(dependencies, person, MapMaking),
          computerKnowsMapMaking: knows(dependencies, computer, MapMaking),
        })
      );
    } else if (proposal instanceof Gift) {
      const given = proposal.gift();

      if (given instanceof Gold || given instanceof Advance) {
        plan = plain(true);
      } else {
        const unit = given as unknown as Unit,
          refused =
            cities(dependencies, computer) === 0 ||
            attitudeLevel(evaluation.attitude) > 4 ||
            advanceCount(dependencies, person) <
              advanceCount(dependencies, computer) ||
            personRank < computerRank ||
            personStrength < computerStrength;

        plan = plain(!refused && unit.player() === person);
      }
    } else {
      plan = plain(false);
    }

    plans.set(proposal, plan);

    return plan;
  };

  // Whether the computer player pulls its units back from the person's cities (`diplo_answer_demand`, proposal 5,
  //  `:1907-1935`): at peace and not allied, unless it is aggressive or cold, unafraid and the person has no Great Wall
  //  or United Nations, and it is no Democracy (a Republic one time in two), the peace is older than this turn and its
  //  attitude is above 25.
  const withdraws = (
    negotiation: Negotiation,
    sides: Sides,
    proposal: IProposal
  ): boolean => {
    const { computer, person } = sides,
      evaluation = evaluationOf(dependencies, negotiation, sides);

    if (
      !atPeace(dependencies, computer, person) ||
      allied(dependencies, computer, person)
    ) {
      return false;
    }

    const defiant =
        (evaluation.initialAggressive || evaluation.attitude > 74) &&
        evaluation.fear === 0 &&
        !pacifies(dependencies, person),
      government = senateGovernment(dependencies, computer),
      stubborn =
        (government === 'none' ||
          (government === 'republic' &&
            drawn(proposal, 'withdraw', random) < 0.5)) &&
        !hasFlag(dependencies, computer, person, CHANGED_THIS_TURN) &&
        evaluation.attitude > 25;

    return !defiant || !stubborn;
  };

  // What an ally gives when asked, if anything: the tribute in gold, or an advance when it is far ahead.
  const allyGives = (
    negotiation: Negotiation,
    sides: Sides
  ): Advance | Gold | null => {
    const { computer, person } = sides,
      tribute = personDemandTribute(negotiation, sides, 3);

    if (tribute > 0) {
      return new Gold(tribute);
    }

    const ours = advancesWanted(dependencies, computer, person),
      ahead =
        advanceCount(dependencies, person) +
          6 -
          civilize(dependencies, computer) -
          Math.min(
            Math.max(Math.trunc(advanceCount(dependencies, computer) / 12), 0),
            5
          ) <
        advanceCount(dependencies, computer);

    return ours.length > 0 && ahead ? ours[0] : null;
  };

  // The person's proposal still being answered (with any asks of the computer player's after it), if any.
  const pending = (
    negotiation: Negotiation,
    sides: Sides
  ): IProposal | null => {
    const history = actions(negotiation);

    for (let index = history.length - 1; index >= 0; index--) {
      const action = history[index];

      if (
        action instanceof Proposal &&
        !(action instanceof Initiate) &&
        !(action instanceof Dialogue) &&
        action.by() === sides.person &&
        !asks.has(action)
      ) {
        return resolutionOf(negotiation, action) === null ? action : null;
      }

      if (
        action instanceof Resolution &&
        action.by() === sides.computer &&
        action.proposal().by() === sides.person
      ) {
        return null;
      }
    }

    return null;
  };

  // The computer player's next step in answering `proposal`.
  const answer = (
    negotiation: Negotiation,
    sides: Sides,
    proposal: IProposal
  ): IAction => {
    const plan = planFor(negotiation, sides, proposal),
      made = actions(negotiation).filter(
        (action) => asks.get(action)?.proposal === proposal
      ),
      lastAsk = made[made.length - 1],
      lastResolution =
        lastAsk === undefined
          ? null
          : resolutionOf(negotiation, lastAsk as unknown as IProposal);

    if (
      lastAsk !== undefined &&
      lastResolution instanceof Decline &&
      plan.offIfRefused(asks.get(lastAsk)!.index)
    ) {
      return new Decline(
        sides.computer,
        proposal as unknown as Proposal,
        ruleRegistry
      );
    }

    for (let index = made.length; index < plan.asks.length; index++) {
      const ask = plan.asks[index]();

      if (ask !== null) {
        asks.set(ask, { proposal, index });

        return ask;
      }
    }

    return plan.accept
      ? new Accept(
          sides.computer,
          proposal as unknown as Proposal,
          ruleRegistry
        )
      : new Decline(
          sides.computer,
          proposal as unknown as Proposal,
          ruleRegistry
        );
  };

  // Whether the person must accept `proposal` of the computer player's: a ceasefire or peace its Senate forces on it.
  const forced = (sides: Sides, proposal: IProposal): boolean =>
    (proposal instanceof OfferCeasefire || proposal instanceof OfferPeace) &&
    proposal.by() === sides.computer &&
    !pacifies(dependencies, sides.computer) &&
    senateBlocks(dependencies, sides.person, sides.computer, 'refuse-offer');

  /** The computer player's next step, or `null` when it's the person's to take. */
  const computerStep = (negotiation: Negotiation): IAction | null => {
    const sides = sidesOf(dependencies, negotiation);

    if (sides === null || negotiation.terminated()) {
      return null;
    }

    const { computer, person, computerLed } = sides,
      action = last(negotiation);

    if (action === null) {
      return computerLed
        ? new Initiate(computer, negotiation, ruleRegistry)
        : null;
    }

    // The person asked for an audience: refused if war was declared this turn, or its patience is spent and they've
    //  met this turn (`diplo_meet_refuses_audience`).
    if (action instanceof Initiate && action.by() === person) {
      const refuses =
        hasFlag(dependencies, computer, person, WAR_THIS_TURN) ||
        (patienceOf(computer, person).spent() >= limitOf(negotiation, sides) &&
          hasFlag(dependencies, person, computer, MET_THIS_TURN));

      return refuses
        ? new Decline(computer, action as unknown as Proposal, ruleRegistry)
        : new Accept(computer, action as unknown as Proposal, ruleRegistry);
    }

    if (action instanceof Decline && action.proposal() instanceof Initiate) {
      // The person turned the computer player away: its Senate may force a treaty (`diplo_meet_senate_forces_treaty`).
      if (action.by() === person) {
        const evaluation = evaluationOf(dependencies, negotiation, sides),
          already = actions(negotiation).some(
            (step) => step instanceof Dialogue && step.by() === computer
          );

        if (
          !already &&
          !evaluation.declareWar &&
          (atWar(dependencies, computer, person) ||
            (!atPeace(dependencies, computer, person) &&
              evaluation.fear !== 0)) &&
          (pacifies(dependencies, computer) ||
            senateBlocks(dependencies, person, computer, 'ignore-audience'))
        ) {
          return say(
            negotiation,
            computer,
            atWar(dependencies, computer, person)
              ? DIALOGUE.senateForcedCeasefire
              : DIALOGUE.senateForcedPeace
          );
        }
      }

      return new Terminate(computer, negotiation, ruleRegistry);
    }

    // The person acknowledged what the computer player said.
    if (action instanceof Acknowledge) {
      const key = (action.proposal() as Dialogue).key();

      if (
        [
          DIALOGUE.allyDismissed,
          DIALOGUE.war,
          DIALOGUE.warContinues,
          DIALOGUE.allyTaunts,
          DIALOGUE.senateForcedCeasefire,
          DIALOGUE.senateForcedPeace,
        ].includes(key)
      ) {
        return new Terminate(computer, negotiation, ruleRegistry);
      }
    }

    // The person's proposal, still being answered.
    const answering = pending(negotiation, sides);

    if (answering !== null) {
      const lastStep = action;

      // An ask of the computer player's is the person's to answer.
      if (lastStep instanceof Proposal && lastStep.by() === computer) {
        return null;
      }

      return answer(negotiation, sides, answering);
    }

    // Just answered: anything to say after, then the menu again while its patience lasts.
    if (
      action instanceof Resolution &&
      action.by() === computer &&
      action.proposal().by() === person &&
      !(action.proposal() instanceof Initiate)
    ) {
      const plan = plans.get(action.proposal());

      if (action instanceof Decline && plan?.thenSays) {
        return say(negotiation, computer, plan.thenSays);
      }

      return patienceOf(computer, person).spent() < limitOf(negotiation, sides)
        ? null
        : new Terminate(computer, negotiation, ruleRegistry);
    }

    // A computer player's ceasefire or peace refused: overruled by its Great Wall or United Nations (the `Resolved`
    //  rules make the treaty), or sweetened.
    if (
      action instanceof Decline &&
      action.by() === person &&
      (action.proposal() instanceof OfferCeasefire ||
        action.proposal() instanceof OfferPeace) &&
      action.proposal().by() === computer &&
      !pacifies(dependencies, computer)
    ) {
      const offer = action.proposal(),
        sweetener = concession(negotiation, sides, offer);

      if (sweetener !== null) {
        asks.set(sweetener, { proposal: offer, index: 0 });

        return tag(sweetener, agendaItems.get(offer)!);
      }

      if (offer instanceof OfferCeasefire) {
        return tag(
          say(negotiation, computer, DIALOGUE.warContinues),
          AGENDA.ceasefire
        );
      }
    }

    // Its concession refused too: the war goes on, the meeting is over; refused peace, it carries on.
    if (
      action instanceof Decline &&
      action.by() === person &&
      action.proposal() instanceof Gift &&
      action.proposal().by() === computer &&
      askedFor(action.proposal()) instanceof OfferCeasefire
    ) {
      return tag(
        say(negotiation, computer, DIALOGUE.warContinues),
        AGENDA.ceasefire
      );
    }

    // The computer player's agenda, once the audience has begun and between its items.
    const begun = actions(negotiation).some(
      (step) => step instanceof Accept && step.proposal() instanceof Initiate
    );

    if (!begun) {
      return null;
    }

    if (action instanceof Proposal && action.by() === computer) {
      // Its own proposal or dialogue, for the person to answer.
      return null;
    }

    const cursor = agendaCursor(negotiation, computer);

    if (cursor <= AGENDA.menu) {
      const next = agendaFrom(negotiation, sides, cursor);

      if (next !== null) {
        return next;
      }
    }

    // The agenda is done: the menu is the person's, while patience lasts.
    return patienceOf(computer, person).spent() < limitOf(negotiation, sides)
      ? null
      : new Terminate(computer, negotiation, ruleRegistry);
  };

  // A refused ceasefire or peace sweetened (`diplo_meet_offer_ceasefire`, `:3380-3440`): with chance 1 in the person's
  //  reputation + 1 (doubled with a vendetta), an advance when it fears the person enough, else gold, else, down to one
  //  city, everything. Drawn once per offer. Only once per offer.
  const concession = (
    negotiation: Negotiation,
    sides: Sides,
    offer: IProposal
  ): IProposal | null => {
    const { computer, person } = sides;

    if (
      actions(negotiation).some(
        (action) => asks.get(action)?.proposal === offer
      )
    ) {
      return null;
    }

    const evaluation = evaluationOf(dependencies, negotiation, sides),
      distrust =
        (evaluation.reputation + 1) *
        (vendetta(dependencies, computer, person) ? 2 : 1);

    if (
      roll(() => drawn(offer, 'concession', random), Math.max(1, distrust)) !==
      0
    ) {
      return null;
    }

    const ours = advancesWanted(dependencies, computer, person);

    if (
      offer instanceof OfferCeasefire &&
      evaluation.fear > 3 &&
      ours.length > 0
    ) {
      return new Gift(ours[0], computer, negotiation, ruleRegistry);
    }

    const amount =
      Math.min(
        Math.max(evaluation.fear * 2 - 4, 0),
        Math.trunc(gold(dependencies, computer) / 50)
      ) * 50;

    if (amount > 0) {
      return new Gift(new Gold(amount), computer, negotiation, ruleRegistry);
    }

    return null;
  };

  /** The person's possible steps: answers to the computer player, or the menu. */
  const personSteps = (negotiation: Negotiation): IAction[] => {
    const sides = sidesOf(dependencies, negotiation);

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

    if (computerStep(negotiation) !== null) {
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
        accept = new Accept(person, proposal, ruleRegistry);

      if (forced(sides, action)) {
        return [accept];
      }

      // A demand the person can't meet is only refused.
      if (
        action instanceof DemandTribute &&
        action.tribute() instanceof Gold &&
        (action.tribute() as Gold).value() > gold(dependencies, person)
      ) {
        return [new Decline(person, proposal, ruleRegistry)];
      }

      if (
        action instanceof SellAdvance &&
        action.price().value() > gold(dependencies, person)
      ) {
        return [new Decline(person, proposal, ruleRegistry)];
      }

      // What costs the person nothing first (civ-clone/web-renderer#674): receiving the emissary, a treaty, an alliance
      //  or a gift taken; a demand, a call to war, an exchange or a sale refused.
      return action instanceof Initiate ||
        action instanceof OfferPeace ||
        action instanceof OfferCeasefire ||
        action instanceof ProposeAlliance ||
        action instanceof Gift
        ? [accept, new Decline(person, proposal, ruleRegistry)]
        : [new Decline(person, proposal, ruleRegistry), accept];
    }

    // The menu.
    return [
      ...menu(negotiation, sides),
      new Terminate(person, negotiation, ruleRegistry),
    ];
  };

  return {
    computerStep,
    personSteps,
    planFor,
    menu,
    evaluationOf: (negotiation: Negotiation, sides: Sides) =>
      evaluationOf(dependencies, negotiation, sides),
    allyGives,
    personDemandTribute,
    lastContactTurns,
  };
};

// Whether the two have a ceasefire, a peace or an alliance.
const hasTreatyWith = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): boolean =>
  hasTreatyLevel(dependencies, player, other, TreatyLevel.Ceasefire);

export type Talks = ReturnType<typeof talks>;

export default talks;
