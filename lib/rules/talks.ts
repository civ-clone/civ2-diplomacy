import {
  AGENDA,
  DIALOGUE,
  Meeting,
  Sides,
  Talks,
  agendaItemOf,
  askedFor,
  begin,
  helpBonus,
  wasForced,
  meetingOf,
  outcomeOf,
  sidesOf,
} from '../talks';
import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  CEASEFIRE_LINGERS,
  CHANGED_THIS_TURN,
  HOSTILE_INTENT,
  INCIDENT,
  MERCENARY,
  MET_THIS_TURN,
  RECENT_CONTACT,
  SIGNING_CLEARS,
  TRIBUTE,
  WAR_THIS_TURN,
  WITHDRAWAL_DEMANDED,
  clearBoth,
  clearFlag,
  hasFlag,
  setBoth,
  setFlag,
} from '../flags';
import {
  CHIEFTAIN,
  advanceCount,
  allied,
  atPeace,
  atWar,
  knows,
  level,
  rank,
} from '../standing';
import {
  declareWarFor,
  declareWarQuietly,
  endAlliance,
  expelUnits,
  formAlliance,
  makeTreatyPeace,
  signCeasefire,
  signPeace,
} from '../effects';
import { attitude, endTalks, reputation } from '../relations';
import { demandAttitude, goldAttitudeValue } from '../formulas';
import Accept from '@civ-clone/core-diplomacy/Proposal/Accept';
import Accepted from '@civ-clone/core-diplomacy/Rules/Proposal/Accepted';
import Acknowledge from '@civ-clone/core-diplomacy/Proposal/Acknowledge';
import Advance from '@civ-clone/core-science/Advance';
import AskAlly from '@civ-clone/library-diplomacy/Proposals/AskAlly';
import CancelAlliance from '@civ-clone/library-diplomacy/Proposals/CancelAlliance';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';
import Criterion from '@civ-clone/core-rule/Criterion';
import Decline from '@civ-clone/core-diplomacy/Proposal/Decline';
import Declined from '@civ-clone/core-diplomacy/Rules/Proposal/Declined';
import DemandTribute from '@civ-clone/library-diplomacy/Proposals/DemandTribute';
import DemandWithdrawal from '@civ-clone/library-diplomacy/Proposals/DemandWithdrawal';
import Dependencies from '../Dependencies';
import Dialogue from '@civ-clone/core-diplomacy/Negotiation/Dialogue';
import Effect from '@civ-clone/core-rule/Effect';
import Embassy from '@civ-clone/base-unit-action-establish-embassy/Embassy';
import Engine from '@civ-clone/core-engine/Engine';
import ExchangeKnowledge from '@civ-clone/library-diplomacy/Proposals/ExchangeKnowledge';
import Gift from '@civ-clone/library-diplomacy/Proposals/Gift';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import { IInteraction } from '@civ-clone/core-diplomacy/Interaction';
import { IProposal } from '@civ-clone/core-diplomacy/Negotiation/Proposal';
import { IResolution } from '@civ-clone/core-diplomacy/Proposal/Resolution';
import Initiate from '@civ-clone/core-diplomacy/Negotiation/Initiate';
import InteractionRule from '@civ-clone/core-diplomacy/Rules/Negotiation/Interaction';
import JoinWar from '@civ-clone/library-diplomacy/Proposals/JoinWar';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import OfferCeasefire from '@civ-clone/library-diplomacy/Proposals/OfferCeasefire';
import OfferPeace from '@civ-clone/library-diplomacy/Proposals/OfferPeace';
import Player from '@civ-clone/core-player/Player';
import Proposal from '@civ-clone/core-diplomacy/Negotiation/Proposal';
import ProposalAvailable from '@civ-clone/base-diplomacy/Rules/ProposalAvailable';
import ProposeAlliance from '@civ-clone/library-diplomacy/Proposals/ProposeAlliance';
import Resolution from '@civ-clone/core-diplomacy/Proposal/Resolution';
import Resolved from '@civ-clone/core-diplomacy/Rules/Proposal/Resolved';
import SellAdvance from '@civ-clone/library-diplomacy/Proposals/SellAdvance';
import ShareMaps from '@civ-clone/library-diplomacy/Proposals/ShareMaps';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import Terminate from '@civ-clone/core-diplomacy/Negotiation/Terminate';
import Terminated from '@civ-clone/core-diplomacy/Rules/Negotiation/Terminated';
import Unit from '@civ-clone/core-unit/Unit';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import Never from '@civ-clone/core-diplomacy/Expiries/Never';
import { hasVendetta } from '@civ-clone/library-diplomacy/lib/holds';
import { pacifies } from '../wonders';
import { Writing } from '@civ-clone/civ2-science/Advances';
import { activeDeclarations } from '@civ-clone/base-diplomacy/lib/declareWar';
import { answered } from '../callForHelp';
import { advanceValue } from '../survey';
import { give } from '@civ-clone/base-diplomacy/lib/knowledge';
import { hasEmbassy } from '@civ-clone/base-diplomacy/lib/embassy';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { makeCeasefire } from '@civ-clone/base-diplomacy/lib/declareWar';
import { madeToDeclareWar } from '../relations';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { senateScandal } from '../senate';
import { shareMaps } from '@civ-clone/base-diplomacy/lib/shareMaps';
import { unitTerms } from '../units';

declare global {
  interface ChoiceMetaDataMap {
    'diplomacy.exchange-knowledge': typeof Advance;
  }
}

/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
export const PERSON_STEPS = 48;

// The steps worked out once for each step of each negotiation: `Step` rules ask for them in their criteria and again
//  in their effects, and a client may ask for the steps as often as it likes. A resolution's effects change the
//  meeting, so a step asked for before its proposal is resolved is worked out again after.
const cached = <T>(
  cache: WeakMap<Negotiation, { key: string; value: T }>,
  negotiation: Negotiation,
  make: () => T
): T => {
  const last = negotiation.lastInteraction(),
    key = `${negotiation.interactions().length}:${
      last instanceof Resolution ? last.proposal().resolved() : ''
    }`,
    kept = cache.get(negotiation);

  if (kept !== undefined && kept.key === key) {
    return kept.value;
  }

  const value = make();

  cache.set(negotiation, { key, value });

  return value;
};

/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
export const stepRules = (talks: Talks): Step[] => {
  const computerSteps = new WeakMap<
      Negotiation,
      { key: string; value: IAction | null }
    >(),
    personSteps = new WeakMap<Negotiation, { key: string; value: IAction[] }>(),
    computerStep = (negotiation: Negotiation): IAction | null =>
      cached(computerSteps, negotiation, () => talks.computerStep(negotiation)),
    personStep = (negotiation: Negotiation, index: number): IAction | null =>
      cached(personSteps, negotiation, () => talks.personSteps(negotiation))[
        index
      ] ?? null;

  return [
    new Step(
      new Criterion(
        (negotiation: Negotiation): boolean =>
          computerStep(negotiation) !== null
      ),
      new Effect(
        (negotiation: Negotiation): IAction => computerStep(negotiation)!
      )
    ),
    ...Array.from(
      { length: PERSON_STEPS },
      (_, index) =>
        new Step(
          new Criterion(
            (negotiation: Negotiation): boolean =>
              personStep(negotiation, index) !== null
          ),
          new Effect(
            (negotiation: Negotiation): IAction =>
              personStep(negotiation, index)!
          )
        )
    ),
  ];
};

/**
 * Which of the person's proposals the menu offers (`diplo_proposal_menu`, `diplomacy.cpp:2732`): an alliance at peace;
 *  peace when not at peace; asking an ally for help and cancelling an alliance when allied; tribute when not allied and
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war on any other
 *  player, maps) and the gifts always.
 */
export const proposalAvailableRules = (
  prefix: string,
  dependencies: Dependencies,
  republican: (player: Player) => boolean
): ProposalAvailable[] => {
  const sides = (proposal: IProposal): Sides | null =>
      sidesOf(dependencies, proposal.negotiation()),
    rule = (
      name: string,
      ProposalType: new (...args: any[]) => IProposal,
      available: (sides: Sides) => boolean
    ) =>
      new ProposalAvailable(
        `${prefix}:proposal/available/${name}`,
        new Criterion(
          (proposal: IProposal): boolean =>
            proposal instanceof ProposalType &&
            sides(proposal)?.person === proposal.by()
        ),
        new Effect((proposal: IProposal): boolean =>
          available(sides(proposal)!)
        )
      ),
    peace = ({ computer, person }: Sides) =>
      atPeace(dependencies, computer, person),
    alliance = ({ computer, person }: Sides) =>
      allied(dependencies, computer, person);

  return [
    rule(
      'alliance',
      ProposeAlliance,
      (sides) => peace(sides) && !alliance(sides)
    ),
    rule('peace', OfferPeace, (sides) => !peace(sides)),
    rule('ask-ally', AskAlly, alliance),
    rule(
      'tribute',
      DemandTribute,
      (sides) => !alliance(sides) && !republican(sides.person)
    ),
    rule(
      'withdrawal',
      DemandWithdrawal,
      (sides) =>
        peace(sides) &&
        !alliance(sides) &&
        !hasFlag(dependencies, sides.computer, sides.person, CHANGED_THIS_TURN)
    ),
    rule('cancel-alliance', CancelAlliance, alliance),
    rule('exchange-knowledge', ExchangeKnowledge, () => true),
    rule('join-war', JoinWar, () => true),
    rule('share-maps', ShareMaps, () => true),
    rule('gift', Gift, () => true),
  ];
};

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
export const interactionRules = (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
): InteractionRule[] => {
  const { interactionRegistry, ruleRegistry, turn } = dependencies;

  return [
    new InteractionRule(
      `${prefix}:negotiation/interaction/begin`,
      new Criterion(
        (interaction: IInteraction): boolean => interaction instanceof Initiate
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          begin(dependencies, negotiation);
        }
      )
    ),
    new InteractionRule(
      `${prefix}:negotiation/interaction/contact`,
      new Criterion(
        (interaction: IInteraction): boolean => interaction instanceof Initiate
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          const [player, other] = negotiation.players();

          makeContact(interactionRegistry, player, other, ruleRegistry, turn);
        }
      )
    ),
    new InteractionRule(
      `${prefix}:negotiation/interaction/audience`,
      new Criterion(
        (interaction: IInteraction, negotiation: Negotiation): boolean =>
          interaction instanceof Accept &&
          interaction.proposal() instanceof Initiate &&
          meetingOf(negotiation) !== null
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          const meeting = meetingOf(negotiation)!,
            { computer, person, computerLed } = meeting.sides,
            kept = patience(dependencies, computer, person);

          setBoth(dependencies, computer, person, MET_THIS_TURN);

          if (!computerLed) {
            if (hasFlag(dependencies, person, computer, INCIDENT)) {
              kept.reset();
            } else if (hasFlag(dependencies, person, computer, AGGRESSOR)) {
              kept.spend(talks.limitOf(meeting) - kept.spent());
            }

            return;
          }

          kept.reset();

          activeDeclarations(dependencies, Ceasefire, computer, person).forEach(
            (ceasefire) => ceasefire.expire(computer)
          );

          clearBoth(
            dependencies,
            computer,
            person,
            CEASEFIRE_LINGERS | TRIBUTE
          );
          recordContact(dependencies, computer, person, turn.value());
        }
      )
    ),
    new InteractionRule(
      `${prefix}:negotiation/interaction/spend-patience`,
      new Criterion(
        (interaction: IInteraction, negotiation: Negotiation): boolean => {
          const meeting = meetingOf(negotiation);

          return (
            meeting !== null &&
            interaction instanceof Proposal &&
            !(interaction instanceof Initiate) &&
            !(interaction instanceof Dialogue) &&
            (interaction as Proposal).by() === meeting.sides.person
          );
        }
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          const meeting = meetingOf(negotiation)!,
            kept = patience(
              dependencies,
              meeting.sides.computer,
              meeting.sides.person
            );

          // Tribute and an ally's help set it to the limit, and the menu's loop adds 1 (`:1874-1878`).
          if (
            interaction instanceof DemandTribute ||
            interaction instanceof AskAlly
          ) {
            kept.spend(Math.max(0, talks.limitOf(meeting) - kept.spent()) + 1);

            return;
          }

          kept.spend(1);
        }
      )
    ),
  ];
};

// Whose side a step is on.
const meetingFor = (proposal: IProposal): Meeting | null =>
  meetingOf(proposal.negotiation());

/**
 * What the talks' answers do (`Resolved`): treaties, payments, wars and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
export const resolvedRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
): Resolved[] => {
  const { clientRegistry, playerResearchRegistry, turn } = dependencies,
    resolved = (
      name: string,
      applies: (
        resolution: IResolution,
        proposal: any,
        meeting: Meeting
      ) => boolean,
      run: (
        resolution: IResolution,
        proposal: any,
        meeting: Meeting
      ) => void | Promise<void>
    ) =>
      new Resolved(
        `${prefix}:proposal/resolved/${name}`,
        new Criterion(
          (resolution: IResolution, proposal: IProposal): boolean => {
            const meeting = meetingFor(proposal);

            return meeting !== null && applies(resolution, proposal, meeting);
          }
        ),
        new Effect(
          async (resolution: IResolution, proposal: IProposal): Promise<void> =>
            run(resolution, proposal, meetingFor(proposal)!)
        )
      ),
    accepted =
      (
        ProposalType: new (...args: any[]) => IProposal,
        side: 'computer' | 'person'
      ) =>
      (resolution: IResolution, proposal: IProposal, meeting: Meeting) =>
        resolution instanceof Accept &&
        proposal instanceof ProposalType &&
        proposal.by() === meeting.sides[side],
    declined =
      (
        ProposalType: new (...args: any[]) => IProposal,
        side: 'computer' | 'person'
      ) =>
      (resolution: IResolution, proposal: IProposal, meeting: Meeting) =>
        resolution instanceof Decline &&
        proposal instanceof ProposalType &&
        proposal.by() === meeting.sides[side],
    item = (proposal: IProposal) => agendaItemOf(proposal),
    paid = (meeting: Meeting) => {
      meeting.paid = true;
      meeting.aggressive = false;
    },
    spend = (meeting: Meeting, amount: number) =>
      patience(
        dependencies,
        meeting.sides.computer,
        meeting.sides.person
      ).spend(amount),
    // Tribute paid with a ceasefire lapsed renews it (`diplomacy.cpp:3030`).
    renew = (meeting: Meeting) => {
      if (
        meeting.hadCeasefire &&
        !atPeace(dependencies, meeting.sides.computer, meeting.sides.person)
      ) {
        makeCeasefire(
          dependencies,
          meeting.sides.computer,
          meeting.sides.person
        );
      }
    },
    // The person picks one of the computer player's advances (`civ_steal_advance`).
    personPicks = async (
      resolution: IResolution,
      meeting: Meeting
    ): Promise<void> => {
      const { computer, person } = meeting.sides,
        research = playerResearchRegistry.getByPlayer(person),
        choices = playerResearchRegistry
          .getByPlayer(computer)
          .complete()
          .map((advance: Advance) => advance.sourceClass<typeof Advance>())
          .filter((Type) => !Type.repeatable && !research.completed(Type));

      if (choices.length === 0) {
        return;
      }

      const chosen = await clientRegistry
        .getByPlayer(person)
        .chooseFromList(
          new ChoiceMeta(choices, 'diplomacy.exchange-knowledge', resolution)
        );

      research.addAdvance(chosen);
    };

  return [
    // Before peace is made (and the ceasefire it supersedes ends): a peace signed during a ceasefire still carries it.
    resolved(
      'note-ceasefire',
      (resolution, proposal) =>
        resolution instanceof Accept && proposal instanceof OfferPeace,
      (resolution, proposal, meeting) => {
        if (
          activeDeclarations(
            dependencies,
            Ceasefire,
            meeting.sides.computer,
            meeting.sides.person
          ).length > 0
        ) {
          setBoth(
            dependencies,
            meeting.sides.computer,
            meeting.sides.person,
            CEASEFIRE_LINGERS
          );
        }
      }
    ),
    // Treaties: peace and ceasefires accepted either way, a refusal overruled by its Great Wall or United Nations, a
    //  concession accepted.
    resolved(
      'treaty',
      (resolution, proposal, meeting) => {
        const offer =
          proposal instanceof Gift && askedFor(proposal) !== null
            ? askedFor(proposal)
            : proposal;

        if (!(offer instanceof OfferPeace || offer instanceof OfferCeasefire)) {
          return false;
        }

        if (resolution instanceof Accept) {
          return true;
        }

        return (
          resolution instanceof Decline &&
          proposal === offer &&
          offer.by() === meeting.sides.computer &&
          outcomeOf(resolution).end !== true &&
          resolution.by() === meeting.sides.person &&
          pacifies(dependencies, meeting.sides.computer)
        );
      },
      (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides,
          offer =
            proposal instanceof Gift && askedFor(proposal) !== null
              ? askedFor(proposal)!
              : proposal;

        if (proposal instanceof Gift) {
          give(
            dependencies,
            proposal.gift() as Advance | Gold,
            computer,
            person
          );
          (outcomeOf(proposal).gives ?? []).forEach((gift) =>
            give(dependencies, gift, computer, person)
          );
          meeting.conceded = true;
        }

        if (offer instanceof OfferCeasefire) {
          signCeasefire(dependencies, computer, person);
        } else {
          signPeace(dependencies, computer, person);
        }

        meeting.treatyMade = true;

        if (resolution instanceof Decline) {
          engine.emit(
            'civ2-diplomacy:refusal-overruled',
            computer,
            person,
            offer
          );
        }
      }
    ),
    // A person's Senate forced the acceptance.
    resolved(
      'senate-forced-acceptance',
      (resolution, proposal, meeting) =>
        resolution instanceof Accept &&
        (proposal instanceof OfferCeasefire ||
          proposal instanceof OfferPeace) &&
        proposal.by() === meeting.sides.computer &&
        wasForced(proposal),
      (resolution, proposal, meeting) => {
        meeting.senateBlocked = true;
      }
    ),
    // The computer player's alliance, and its call to fight a common enemy (its solidarity), accepted or not.
    resolved(
      'alliance',
      (resolution, proposal, meeting) =>
        accepted(ProposeAlliance, 'computer')(resolution, proposal, meeting) ||
        (proposal instanceof JoinWar &&
          proposal.by() === meeting.sides.computer &&
          item(proposal) === AGENDA.alliance),
      (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides;

        meeting.treatyMade = true;

        if (proposal instanceof JoinWar) {
          if (resolution instanceof Accept) {
            declareWarFor(dependencies, person, proposal.against(), computer);
            setFlag(
              dependencies,
              computer,
              proposal.against(),
              AGGRESSOR | AGGRESSOR_LONG
            );
          } else if (
            meeting.fear === 0 ||
            meeting.evaluation.reputation > 2 ||
            meeting.live.value > 25
          ) {
            return;
          }
        }

        formAlliance(dependencies, computer, person);
      }
    ),
    // Asks: the person pays a sweetener, a price, or a secret advance, or joins a war at the computer player's call.
    resolved(
      'ask',
      (resolution, proposal, meeting) =>
        resolution instanceof Accept &&
        resolution.by() === meeting.sides.person &&
        askedFor(proposal) !== null &&
        !(proposal instanceof Gift),
      async (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides;

        if (proposal instanceof DemandTribute) {
          give(dependencies, proposal.tribute(), person, computer);
          (outcomeOf(proposal).alsoTakes ?? []).forEach((advance) =>
            give(dependencies, advance, person, computer)
          );

          return;
        }

        if (proposal instanceof JoinWar) {
          const against = proposal.against(),
            asked = askedFor(proposal)!;

          declareWarFor(dependencies, person, against, computer);

          // A common enemy it named for the alliance: it goes to war with it too (`:1610-1614`).
          if (asked instanceof ProposeAlliance) {
            if (!atWar(dependencies, computer, against)) {
              declareWarQuietly(dependencies, computer, against);
            }

            makeContact(
              dependencies.interactionRegistry,
              person,
              against,
              dependencies.ruleRegistry,
              turn
            );
          }

          setFlag(dependencies, computer, against, AGGRESSOR | AGGRESSOR_LONG);

          return;
        }

        if (proposal instanceof SellAdvance) {
          give(dependencies, proposal.price(), person, computer);
          give(dependencies, proposal.advance(), computer, person);
        }
      }
    ),
    // The person's proposal answered: what the answer brings.
    resolved(
      'answer',
      (resolution, proposal, meeting) =>
        resolution.by() === meeting.sides.computer &&
        proposal.by() === meeting.sides.person &&
        !(proposal instanceof Initiate),
      async (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides,
          outcome = outcomeOf(resolution);

        if (outcome.patience) {
          spend(meeting, outcome.patience);
        }

        (outcome.gives ?? []).forEach((gift) =>
          give(dependencies, gift, computer, person)
        );

        if (outcome.withdraws) {
          engine.emit(
            'civ2-diplomacy:units-withdrawn',
            computer,
            person,
            expelUnits(dependencies, computer, person)
          );
        }

        // Tribute paid without peace brings a ceasefire, marked as paid unless one was already in force (`:2072-2077`).
        if (outcome.ceasefire) {
          if (!meeting.hadCeasefire) {
            setBoth(dependencies, computer, person, TRIBUTE);
          }

          makeCeasefire(dependencies, computer, person);
          clearBoth(dependencies, computer, person, SIGNING_CLEARS);
        }

        if (!(resolution instanceof Accept)) {
          return;
        }

        if (proposal instanceof ProposeAlliance) {
          formAlliance(dependencies, computer, person);

          return;
        }

        if (proposal instanceof OfferPeace) {
          return;
        }

        if (proposal instanceof CancelAlliance) {
          reputation(dependencies).adjust(person, 1, 'cancel-alliance');
          endAlliance(dependencies, person, computer);
          engine.emit('civ2-diplomacy:alliance-cancelled', person, computer);

          return;
        }

        if (proposal instanceof ExchangeKnowledge && outcome.takes) {
          give(dependencies, outcome.takes, person, computer);
          await personPicks(resolution, meeting);
          meeting.aggressive = false;

          return;
        }

        // A war for hire (`diplo_favor_mercenary_war`, `:2302`): no declaration, so no reputation; one time in two the
        //  target finds out.
        if (proposal instanceof JoinWar && outcome.war) {
          const target = proposal.against();

          if (!atWar(dependencies, computer, target)) {
            declareWarQuietly(dependencies, computer, target);
          }

          setFlag(dependencies, computer, target, AGGRESSOR | AGGRESSOR_LONG);
          setFlag(dependencies, computer, person, MERCENARY);
          setBoth(dependencies, computer, target, RECENT_CONTACT);

          if (random() < 0.5) {
            if (allied(dependencies, person, target)) {
              attitude(dependencies).adjust(target, person, 25, 'mercenary');
              endAlliance(dependencies, person, target);
            } else if (atPeace(dependencies, person, target)) {
              attitude(dependencies).adjust(target, person, 25, 'mercenary');
              declareWarQuietly(dependencies, person, target);
              registerVendetta(dependencies, target, person);
            }
          }

          return;
        }

        if (proposal instanceof ShareMaps) {
          if (dependencies.playerWorldRegistry !== undefined) {
            shareMaps(
              { playerWorldRegistry: dependencies.playerWorldRegistry },
              person,
              computer
            );
          }

          engine.emit('civ2-diplomacy:maps-shared', person, computer);

          return;
        }

        if (proposal instanceof Gift) {
          const given = proposal.gift();

          if (given instanceof Gold || given instanceof Advance) {
            give(dependencies, given, person, computer);
          } else {
            const unit = given as unknown as Unit,
              terms = unitTerms(dependencies, computer, unit),
              [home] = dependencies.cityRegistry
                .getByPlayer(computer)
                .sort(
                  (a, b) =>
                    a.tile().distanceFrom(unit.tile()) -
                    b.tile().distanceFrom(unit.tile())
                );

            unit.transfer(computer, null);

            if (home !== undefined) {
              unit.setTile(home.tile());
              unit.setStatus(null);
              unit.applyVisibility();
            }

            // A breakthrough: one time in two it learns an advance toward the unit (`str_breakthrough`).
            if (terms.breakthrough !== null && random() < 0.5) {
              playerResearchRegistry
                .getByPlayer(computer)
                .addAdvance(terms.breakthrough);
            }
          }

          // A gift gives back the patience it cost and more (`:2547`, `:2580`).
          spend(meeting, -(meeting.gifts + 2));
          meeting.gifts++;
        }
      }
    ),
    // The computer player's own proposals at an audience, answered by the person.
    resolved(
      'agenda',
      (resolution, proposal, meeting) =>
        resolution.by() === meeting.sides.person &&
        proposal.by() === meeting.sides.computer &&
        item(proposal) !== undefined &&
        askedFor(proposal) === null &&
        !(proposal instanceof Dialogue),
      async (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides,
          yes = resolution instanceof Accept,
          alliance = allied(dependencies, computer, person);

        switch (item(proposal)) {
          case AGENDA.callForHelp: {
            if (yes) {
              declareWarFor(
                dependencies,
                person,
                (proposal as JoinWar).against(),
                computer
              );
              answered(dependencies, computer, person);
            }

            return;
          }

          case AGENDA.violators: {
            if (yes) {
              expelUnits(dependencies, person, computer);
              clearFlag(dependencies, computer, person, WITHDRAWAL_DEMANDED);
            }

            return;
          }

          case AGENDA.exchange: {
            if (!yes) {
              return;
            }

            if (proposal instanceof Gift) {
              give(dependencies, proposal.gift() as Advance, computer, person);
              spend(meeting, 2);

              return;
            }

            const takes = outcomeOf(proposal).takes;

            if (takes) {
              give(dependencies, takes, person, computer);
              await personPicks(resolution, meeting);
              meeting.aggressive = false;
            }

            return;
          }

          case AGENDA.warOnTarget: {
            if (!yes) {
              if (alliance) {
                meeting.propose = true;
              }

              spend(meeting, 1);

              return;
            }

            declareWarFor(
              dependencies,
              person,
              (proposal as JoinWar).against(),
              computer
            );
            meeting.declaredWar = true;
            meeting.aggressive = false;
            meeting.warTarget = null;

            if (alliance) {
              meeting.tribute = 0;
              meeting.paid = true;
            } else if (random() < 0.5) {
              meeting.tribute = 0;
              renew(meeting);
            }

            return;
          }

          case AGENDA.tribute: {
            meeting.tribute = 999;

            if (yes) {
              give(
                dependencies,
                (proposal as DemandTribute).tribute(),
                person,
                computer
              );
              paid(meeting);

              if (patience(dependencies, computer, person).spent() > 0) {
                spend(meeting, -1);
              }

              renew(meeting);
            }

            return;
          }

          case AGENDA.tech: {
            meeting.tribute = 999;

            if (yes) {
              give(
                dependencies,
                (proposal as DemandTribute).tribute(),
                person,
                computer
              );

              const second = !(
                meeting.evaluation.unitsNearCities && meeting.aggressive
              );

              if (second || meeting.paid) {
                paid(meeting);
                renew(meeting);

                if (patience(dependencies, computer, person).spent() > 0) {
                  spend(meeting, -1);
                }
              } else {
                meeting.paid = false;
              }

              return;
            }

            if (alliance) {
              spend(meeting, 1);
            }

            return;
          }

          case AGENDA.ceasefire:
          case AGENDA.peace:
            return;
        }
      }
    ),
    // A call for help's payment, accepted: the gold, and the war.
    resolved(
      'help-bonus',
      (resolution, proposal, meeting) =>
        proposal instanceof Gift &&
        item(proposal) === AGENDA.callForHelp &&
        resolution.by() === meeting.sides.person,
      (resolution, proposal, meeting) => {
        const { computer, person } = meeting.sides,
          call = askedFor(proposal) as JoinWar;

        if (resolution instanceof Accept) {
          give(dependencies, proposal.gift() as Gold, computer, person);
          declareWarFor(dependencies, person, call.against(), computer);
        } else if (meeting.live.value < 51) {
          attitude(dependencies).adjust(computer, person, 100, 'help-refused');
        }

        answered(dependencies, computer, person);
      }
    ),
    // A call for help refused with nothing more to offer, its attitude below 51: 100 colder.
    resolved(
      'help-refused',
      (resolution, proposal, meeting) =>
        resolution instanceof Decline &&
        proposal instanceof JoinWar &&
        item(proposal) === AGENDA.callForHelp &&
        meeting.live.value < 51,
      (resolution, proposal, meeting) => {
        // The payment, if it offers one, is the next step; without one, the refusal costs this.
        if (
          helpBonus(
            dependencies,
            meeting.sides.computer,
            (proposal as JoinWar).against()
          ) > 0
        ) {
          return;
        }

        attitude(dependencies).adjust(
          meeting.sides.computer,
          meeting.sides.person,
          100,
          'help-refused'
        );
        answered(dependencies, meeting.sides.computer, meeting.sides.person);
      }
    ),
  ];
};

const registerVendetta = (
  dependencies: Dependencies,
  holder: Player,
  against: Player
): void => {
  if (!hasVendetta(holder, against, dependencies.interactionRegistry)) {
    dependencies.interactionRegistry.register(
      new Vendetta(holder, against, new Never(), dependencies.ruleRegistry)
    );
  }
};

/**
 * What the talks cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard for the
 *  request for an audience too). Each is the computer player's attitude toward the person, and moves its attitude in
 *  the talks with it.
 */
export const attitudeRules = (
  prefix: string,
  dependencies: Dependencies
): (Accepted | Declined)[] => {
  const adjust = (meeting: Meeting, delta: number, reason: string): void => {
      if (delta !== 0) {
        attitude(dependencies).adjust(
          meeting.sides.computer,
          meeting.sides.person,
          delta,
          reason
        );
      }
    },
    by = (
      ProposalType: new (...args: any[]) => IProposal,
      side: 'computer' | 'person',
      also: (proposal: any, meeting: Meeting) => boolean = () => true
    ) =>
      new Criterion((proposal: IProposal): boolean => {
        const meeting = meetingFor(proposal);

        return (
          proposal instanceof ProposalType &&
          meeting !== null &&
          proposal.by() === meeting.sides[side] &&
          also(proposal, meeting)
        );
      }),
    rule = (
      Type: typeof Accepted | typeof Declined,
      name: string,
      criterion: Criterion<[Proposal]>,
      delta: (proposal: any, meeting: Meeting) => number
    ) =>
      new Type(
        `${prefix}:proposal/${
          Type === Accepted ? 'accepted' : 'declined'
        }/${name}`,
        criterion,
        new Effect((proposal: Proposal): void => {
          const meeting = meetingFor(proposal)!;

          adjust(meeting, delta(proposal, meeting), name);
        })
      ),
    valueOf = (meeting: Meeting, advance: Advance): number =>
      advanceValue(dependencies, meeting.sides.computer, advance),
    demand = (proposal: IProposal, meeting: Meeting): number =>
      demandAttitude(
        proposal instanceof AskAlly
          ? 3
          : proposal instanceof DemandTribute
          ? 4
          : 5,
        rank(dependencies, meeting.sides.computer),
        rank(dependencies, meeting.sides.person),
        advanceCount(dependencies, meeting.sides.computer),
        advanceCount(dependencies, meeting.sides.person)
      );

  return [
    // Paid to the computer player: gold at its worth (a war's price at none), an advance at 1½ times its value
    //  demanded, twice as a secret.
    rule(
      Accepted,
      'tribute',
      by(DemandTribute, 'computer'),
      (proposal: DemandTribute, meeting) => {
        const tribute = proposal.tribute(),
          asked = askedFor(proposal);

        if (asked instanceof JoinWar) {
          return 0;
        }

        if (tribute instanceof Gold) {
          return -goldAttitudeValue(tribute.value());
        }

        return asked !== null
          ? -(outcomeOf(proposal).attitude ?? 2 * valueOf(meeting, tribute))
          : -Math.trunc((valueOf(meeting, tribute) * 3) / 2);
      }
    ),
    // A tech demand refused by an ally: its reputation + 2 colder (`:3108`).
    rule(
      Declined,
      'tech-refused',
      by(
        DemandTribute,
        'computer',
        (proposal, meeting) =>
          agendaItemOf(proposal) === AGENDA.tech &&
          allied(dependencies, meeting.sides.computer, meeting.sides.person)
      ),
      (proposal, meeting) =>
        reputation(dependencies).get(meeting.sides.person) +
        2 -
        reputation(dependencies).credit(
          meeting.sides.computer,
          meeting.sides.person
        )
    ),
    // An exchange: its value, twice the best advance's, or the second's (`:1040`).
    rule(
      Accepted,
      'exchange-knowledge',
      by(ExchangeKnowledge, 'computer'),
      (proposal) => -(outcomeOf(proposal).attitude ?? 0)
    ),
    // The person's gifts (`diplo_gift_menu`): gold 1½ times its worth, an advance 4 or 2 times the best's value, a
    //  unit 3 times its cost (half if it knows the unit's prerequisite).
    rule(Accepted, 'gift', by(Gift, 'person'), (proposal: Gift, meeting) => {
      const given = proposal.gift();

      if (given instanceof Gold) {
        return -Math.trunc((goldAttitudeValue(given.value()) * 3) / 2);
      }

      if (given instanceof Advance) {
        return -(outcomeOf(proposal).attitude ?? 4 * valueOf(meeting, given));
      }

      return -unitTerms(
        dependencies,
        meeting.sides.computer,
        given as unknown as Unit
      ).attitude;
    }),
    // The person's demands, answered either way (`:1967-1981`).
    rule(Accepted, 'tribute-demand', by(DemandTribute, 'person'), demand),
    rule(Declined, 'tribute-demand', by(DemandTribute, 'person'), demand),
    rule(Accepted, 'ask-ally', by(AskAlly, 'person'), demand),
    rule(Declined, 'ask-ally', by(AskAlly, 'person'), demand),
    rule(Accepted, 'withdrawal', by(DemandWithdrawal, 'person'), demand),
    rule(Declined, 'withdrawal', by(DemandWithdrawal, 'person'), demand),
    // Cancelling an alliance in talks: 50 colder (`:2107`).
    rule(Accepted, 'cancel-alliance', by(CancelAlliance, 'person'), () => 50),
    // Refusing its call to war: 5 colder, 20 from an ally that asks; refusing its solidarity with an alliance, 10.
    rule(
      Declined,
      'join-war',
      by(JoinWar, 'computer', (proposal) =>
        [AGENDA.warOnTarget, AGENDA.alliance].includes(
          agendaItemOf(proposal) ?? -1
        )
      ),
      (proposal, meeting) =>
        agendaItemOf(proposal) === AGENDA.alliance
          ? 10
          : allied(dependencies, meeting.sides.computer, meeting.sides.person)
          ? meeting.evaluation.requestMode !== 0
            ? 20
            : 0
          : 5
    ),
  ];
};

/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance ended, a treaty forced by the person's Senate, a violator's war.
 */
export const dialogueRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
): Resolved[] => {
  const heard = (...keys: string[]) =>
    new Criterion(
      (resolution: IResolution, proposal: IProposal): boolean =>
        resolution instanceof Acknowledge &&
        proposal instanceof Dialogue &&
        keys.includes(proposal.key())
    );

  return [
    // War (`diplo_meet_threaten_war`, a refused demand): no declaration, so no reputation; its attitude at least 75.
    new Resolved(
      `${prefix}:proposal/resolved/war`,
      heard(DIALOGUE.war),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          const computer = proposal.by(),
            person = resolution.by(),
            meeting = meetingFor(proposal);

          if (!atWar(dependencies, computer, person)) {
            declareWarQuietly(dependencies, computer, person);
          }

          if (meeting !== null) {
            meeting.declareWar = false;
          }

          const attitudes = attitude(dependencies);

          if ((attitudes.get(computer, person) ?? 0) < 75) {
            attitudes.set(computer, person, 75, 'war');
          }

          recordContact(
            dependencies,
            computer,
            person,
            dependencies.turn.value()
          );
        }
      )
    ),
    new Resolved(
      `${prefix}:proposal/resolved/ally-dismissed`,
      heard(DIALOGUE.allyDismissed, DIALOGUE.allyTaunts, DIALOGUE.helpRefused),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          endAlliance(dependencies, proposal.by(), resolution.by());
          recordContact(
            dependencies,
            proposal.by(),
            resolution.by(),
            dependencies.turn.value()
          );
          answered(dependencies, proposal.by(), resolution.by());
          engine.emit(
            'civ2-diplomacy:alliance-cancelled',
            proposal.by(),
            resolution.by()
          );
        }
      )
    ),
    new Resolved(
      `${prefix}:proposal/resolved/senate-forced-ceasefire`,
      heard(DIALOGUE.senateForcedCeasefire),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          // `diplo_set_treaty_flags(civ, civ2, 2)`: the ceasefire alone, and contact now.
          makeCeasefire(dependencies, proposal.by(), resolution.by());
          clearBoth(
            dependencies,
            proposal.by(),
            resolution.by(),
            SIGNING_CLEARS
          );
          recordContact(
            dependencies,
            proposal.by(),
            resolution.by(),
            dependencies.turn.value()
          );
          engine.emit(
            'civ2-diplomacy:senate-forced-treaty',
            resolution.by(),
            proposal.by(),
            'ceasefire'
          );
        }
      )
    ),
    new Resolved(
      `${prefix}:proposal/resolved/senate-forced-peace`,
      heard(DIALOGUE.senateForcedPeace),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          // `diplo_set_treaty_flags(civ, civ2, 4)`, and the next audience 16 turns further off.
          clearBoth(
            dependencies,
            proposal.by(),
            resolution.by(),
            SIGNING_CLEARS
          );
          makeTreatyPeace(dependencies, proposal.by(), resolution.by());
          recordContact(
            dependencies,
            proposal.by(),
            resolution.by(),
            dependencies.turn.value() + 16
          );
          engine.emit(
            'civ2-diplomacy:senate-forced-treaty',
            resolution.by(),
            proposal.by(),
            'peace'
          );
        }
      )
    ),
    // A violator that won't withdraw (`diplo_review_violators`, `:6390-6405`): a Senate's scandal, 50 colder, and the
    //  person is made to declare war.
    new Resolved(
      `${prefix}:proposal/resolved/violators-refused`,
      heard(DIALOGUE.violatorsRefused),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          const computer = proposal.by(),
            person = resolution.by();

          clearFlag(dependencies, computer, person, WITHDRAWAL_DEMANDED);
          senateScandal(dependencies, person, computer, random);
          attitude(dependencies).adjust(computer, person, 50, 'violators');
          madeToDeclareWar(dependencies, person, computer);
        }
      )
    ),
  ];
};

/**
 * The end of talks between a computer player and a person (`Terminated`, `diplomacy.cpp:4082-4120`): incidents are
 *  answered; a computer player that meant war keeps its hostile intent, one that didn't loses it; patience: 1 more
 *  unless the person left, up to the limit (and 1 more) after a concession or with a city held; on Chieftain the
 *  person is given an embassy if they aren't at war and it knows Writing.
 */
export const terminatedRules = (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
): Terminated[] => [
  new Terminated(
    `${prefix}:negotiation/terminated/talks`,
    new Criterion(
      (negotiation: Negotiation): boolean => meetingOf(negotiation) !== null
    ),
    new Effect((negotiation: Negotiation): void => {
      const meeting = meetingOf(negotiation)!,
        { computer, person } = meeting.sides,
        kept = patience(dependencies, computer, person),
        received = negotiation
          .interactions()
          .some(
            (action) =>
              action instanceof Accept && action.proposal() instanceof Initiate
          ),
        left = negotiation
          .interactions()
          .some(
            (action) =>
              (action instanceof Terminate && action.by() === person) ||
              (action instanceof Decline &&
                action.proposal() instanceof Initiate &&
                action.by() === computer)
          );

      endTalks(computer);

      clearBoth(dependencies, computer, person, INCIDENT);

      if (
        meeting.declareWar &&
        !allied(dependencies, computer, person) &&
        !atWar(dependencies, computer, person)
      ) {
        setFlag(dependencies, computer, person, HOSTILE_INTENT);
      } else {
        clearFlag(dependencies, computer, person, HOSTILE_INTENT);
      }

      if (received) {
        if (!left) {
          kept.spend(1);
        }

        if (meeting.conceded || meeting.hostile) {
          const target = talks.limitOf(meeting) + (meeting.hostile ? 1 : 0);

          if (kept.spent() < target) {
            kept.spend(target - kept.spent());
          }
        }
      }

      if (
        level(dependencies) === CHIEFTAIN &&
        !atWar(dependencies, computer, person) &&
        knows(dependencies, computer, Writing) &&
        !hasEmbassy(dependencies, person, computer)
      ) {
        dependencies.interactionRegistry.register(
          new Embassy(
            person,
            computer,
            dependencies.ruleRegistry,
            dependencies.turn
          )
        );
      }
    })
  ),
];
