import {
  AGENDA,
  DIALOGUE,
  Sides,
  Talks,
  agendaItemOf,
  allyGiftFor,
  askedFor,
  sidesOf,
} from '../talks';
import {
  AGGRESSOR,
  CEASEFIRE_LINGERS,
  CHANGED_THIS_TURN,
  HOSTILE_INTENT,
  MERCENARY,
  MET_THIS_TURN,
  TRIBUTE,
  clearBoth,
  hasFlag,
  setBoth,
  setFlag,
} from '../flags';
import {
  CHIEFTAIN,
  allied,
  atPeace,
  atWar,
  knows,
  level,
  rank,
} from '../standing';
import {
  advanceValue,
  declareWarFor,
  declareWarQuietly,
  endAlliance,
  formAlliance,
  signCeasefire,
  signPeace,
} from '../effects';
import { attitude, reputation } from '../relations';
import { demandAttitude, goldAttitudeValue } from '../formulas';
import Accept from '@civ-clone/core-diplomacy/Proposal/Accept';
import Accepted from '@civ-clone/core-diplomacy/Rules/Proposal/Accepted';
import Acknowledge from '@civ-clone/core-diplomacy/Proposal/Acknowledge';
import Advance from '@civ-clone/core-science/Advance';
import AskAlly from '@civ-clone/library-diplomacy/Proposals/AskAlly';
import CancelAlliance from '@civ-clone/library-diplomacy/Proposals/CancelAlliance';
import Ceasefire from '@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire';
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
import Resolved from '@civ-clone/core-diplomacy/Rules/Proposal/Resolved';
import SellAdvance from '@civ-clone/library-diplomacy/Proposals/SellAdvance';
import ShareMaps from '@civ-clone/library-diplomacy/Proposals/ShareMaps';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import Terminated from '@civ-clone/core-diplomacy/Rules/Negotiation/Terminated';
import Unit from '@civ-clone/core-unit/Unit';
import Writing from '@civ-clone/base-science-advance-writing/Writing';
import { activeDeclarations } from '@civ-clone/base-diplomacy/lib/declareWar';
import { expelUnits } from '../effects';
import { give } from '@civ-clone/base-diplomacy/lib/knowledge';
import { hasEmbassy } from '@civ-clone/base-diplomacy/lib/embassy';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { ownsWonder } from '../wonders';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import { patienceLimit } from '../evaluate';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';
import { shareMaps } from '@civ-clone/base-diplomacy/lib/shareMaps';

/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
export const PERSON_STEPS = 48;

// The steps worked out once for each step of each negotiation: `Step` rules ask for them in their criteria and again
//  in their effects, and a client may ask for the steps as often as it likes.
const cached = <T>(
  cache: WeakMap<Negotiation, { length: number; value: T }>,
  negotiation: Negotiation,
  make: () => T
): T => {
  const length = negotiation.interactions().length,
    kept = cache.get(negotiation);

  if (kept !== undefined && kept.length === length) {
    return kept.value;
  }

  const value = make();

  cache.set(negotiation, { length, value });

  return value;
};

/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
export const stepRules = (talks: Talks): Step[] => {
  const computerSteps = new WeakMap<
      Negotiation,
      { length: number; value: IAction | null }
    >(),
    personSteps = new WeakMap<
      Negotiation,
      { length: number; value: IAction[] }
    >(),
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
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war, maps) and
 *  gifts always.
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
      available: (sides: Sides, proposal: any) => boolean
    ) =>
      new ProposalAvailable(
        `${prefix}:proposal/available/${name}`,
        new Criterion(
          (proposal: IProposal): boolean =>
            proposal instanceof ProposalType &&
            sides(proposal)?.person === proposal.by()
        ),
        new Effect((proposal: IProposal): boolean =>
          available(sides(proposal)!, proposal)
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
    rule(
      'join-war',
      JoinWar,
      ({ computer }, proposal: JoinWar) =>
        !atWar(dependencies, computer, proposal.against())
    ),
    rule('share-maps', ShareMaps, () => true),
    rule('gift', Gift, () => true),
  ];
};

/**
 * The talks' `Interaction` rules: a negotiation makes contact; a computer player's audience clears a lingering
 *  ceasefire (`diplo_ai_meet_player`, `:4058`) and resets its patience; each of the person's proposals spends the
 *  computer player's patience.
 */
export const interactionRules = (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
): InteractionRule[] => {
  const { interactionRegistry, ruleRegistry, turn } = dependencies,
    limitOf = (negotiation: Negotiation): number => {
      const sides = sidesOf(dependencies, negotiation)!;

      return patienceLimit(
        dependencies,
        sides.computer,
        sides.person,
        talks.evaluationOf(negotiation, sides).attitude
      );
    };

  return [
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
          sidesOf(dependencies, negotiation) !== null
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          const { computer, person, computerLed } = sidesOf(
              dependencies,
              negotiation
            )!,
            computerPatience = patience(dependencies, computer, person);

          setBoth(dependencies, computer, person, MET_THIS_TURN);

          if (!computerLed) {
            if (hasFlag(dependencies, person, computer, AGGRESSOR)) {
              computerPatience.spend(
                limitOf(negotiation) - computerPatience.spent()
              );
            }

            return;
          }

          computerPatience.reset();

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
          const sides = sidesOf(dependencies, negotiation);

          return (
            sides !== null &&
            interaction instanceof Proposal &&
            !(interaction instanceof Initiate) &&
            !(interaction instanceof Dialogue) &&
            (interaction as Proposal).by() === sides.person
          );
        }
      ),
      new Effect(
        (interaction: IInteraction, negotiation: Negotiation): void => {
          const { computer, person } = sidesOf(dependencies, negotiation)!,
            computerPatience = patience(dependencies, computer, person);

          // Tribute and an ally's help use it all up (`diplo_answer_demand`).
          if (
            interaction instanceof DemandTribute ||
            interaction instanceof AskAlly
          ) {
            computerPatience.spend(
              Math.max(1, limitOf(negotiation) - computerPatience.spent())
            );

            return;
          }

          // A gift gives back what it costs and more (`diplo_gift_menu`).
          if (interaction instanceof Gift) {
            const gifts = negotiation
              .interactions()
              .filter(
                (action) =>
                  action instanceof Gift &&
                  action !== interaction &&
                  action.by() === person
              ).length;

            computerPatience.spend(-(gifts + 1));

            return;
          }

          computerPatience.spend(1);
        }
      )
    ),
  ];
};

/**
 * What the talks' answers do (`Resolved`): treaties, payments and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
export const resolvedRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine,
  random: () => number
): Resolved[] => {
  const accepted = (
      ProposalType: new (...args: any[]) => IProposal,
      also: (resolution: IResolution, proposal: any) => boolean = () => true
    ) =>
      new Criterion(
        (resolution: IResolution, proposal: IProposal): boolean =>
          resolution instanceof Accept &&
          proposal instanceof ProposalType &&
          also(resolution, proposal)
      ),
    effect = (
      run: (resolution: IResolution, proposal: any) => void
    ): Effect<[IResolution, IProposal], Promise<void>> =>
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> =>
          run(resolution, proposal)
      );

  return [
    // Before peace is made (and the ceasefire it supersedes ends): a peace signed during a ceasefire still carries it.
    new Resolved(
      `${prefix}:proposal/resolved/note-ceasefire`,
      accepted(OfferPeace),
      effect((resolution, proposal: IProposal) => {
        if (
          activeDeclarations(
            dependencies,
            Ceasefire,
            proposal.by(),
            resolution.by()
          ).length > 0
        ) {
          setBoth(
            dependencies,
            proposal.by(),
            resolution.by(),
            CEASEFIRE_LINGERS
          );
        }
      })
    ),
    new Resolved(
      `${prefix}:proposal/resolved/peace-signed`,
      accepted(OfferPeace),
      effect((resolution, proposal: IProposal) =>
        signPeace(dependencies, proposal.by(), resolution.by())
      )
    ),
    new Resolved(
      `${prefix}:proposal/resolved/ceasefire`,
      accepted(OfferCeasefire),
      effect((resolution, proposal: IProposal) =>
        signCeasefire(dependencies, proposal.by(), resolution.by())
      )
    ),
    // A computer player's ceasefire or peace refused, overruled by its Great Wall or United Nations.
    new Resolved(
      `${prefix}:proposal/resolved/refusal-overruled`,
      new Criterion((resolution: IResolution, proposal: IProposal): boolean => {
        const sides = sidesOf(dependencies, proposal.negotiation());

        return (
          resolution instanceof Decline &&
          (proposal instanceof OfferCeasefire ||
            proposal instanceof OfferPeace) &&
          sides !== null &&
          proposal.by() === sides.computer &&
          (ownsWonder(dependencies, sides.computer, 'great-wall') ||
            ownsWonder(dependencies, sides.computer, 'united-nations'))
        );
      }),
      effect((resolution, proposal: IProposal) => {
        if (proposal instanceof OfferCeasefire) {
          signCeasefire(dependencies, proposal.by(), resolution.by());
        } else {
          signPeace(dependencies, proposal.by(), resolution.by());
        }

        engine.emit(
          'civ2-diplomacy:refusal-overruled',
          proposal.by(),
          resolution.by(),
          proposal
        );
      })
    ),
    // A concession accepted: what was given, and the treaty it was given for.
    new Resolved(
      `${prefix}:proposal/resolved/concession`,
      accepted(
        Gift,
        (resolution, proposal: Gift) => askedFor(proposal) !== null
      ),
      effect((resolution, proposal: Gift) => {
        const offer = askedFor(proposal)!;

        give(
          dependencies,
          proposal.gift() as Advance | Gold,
          proposal.by(),
          resolution.by()
        );

        if (offer instanceof OfferCeasefire) {
          signCeasefire(dependencies, proposal.by(), resolution.by());
        } else {
          signPeace(dependencies, proposal.by(), resolution.by());
        }
      })
    ),
    new Resolved(
      `${prefix}:proposal/resolved/alliance`,
      accepted(ProposeAlliance),
      effect((resolution, proposal: IProposal) => {
        const sides = sidesOf(dependencies, proposal.negotiation());

        formAlliance(
          dependencies,
          sides?.computer ?? resolution.by(),
          sides?.person ?? proposal.by()
        );
      })
    ),
    // The person cancels an alliance (`diplo_ai_answer_proposal`, case 6): its reputation suffers, whatever the level.
    new Resolved(
      `${prefix}:proposal/resolved/cancel-alliance`,
      accepted(CancelAlliance),
      effect((resolution, proposal: IProposal) => {
        reputation(dependencies).adjust(proposal.by(), 1, 'cancel-alliance');
        endAlliance(dependencies, proposal.by(), resolution.by());
        engine.emit(
          'civ2-diplomacy:alliance-cancelled',
          proposal.by(),
          resolution.by()
        );
      })
    ),
    // Whoever accepts a call to war declares it, at the caller's request; a computer player's call accepted alongside
    //  an alliance (its solidarity) seals the alliance.
    new Resolved(
      `${prefix}:proposal/resolved/join-war`,
      accepted(JoinWar),
      effect((resolution, proposal: JoinWar) => {
        const declarer = resolution.by(),
          caller = proposal.by(),
          target = proposal.against();

        if (!atWar(dependencies, declarer, target)) {
          declareWarFor(dependencies, declarer, target, caller);
        }

        setFlag(dependencies, declarer, caller, MERCENARY);

        const sides = sidesOf(dependencies, proposal.negotiation());

        if (
          sides !== null &&
          caller === sides.computer &&
          agendaItemOf(proposal) === AGENDA.alliance
        ) {
          formAlliance(dependencies, sides.computer, sides.person);
        }

        // A computer player paid to fight: one time in two the target finds out (`diplo_favor_mercenary_war`).
        if (sides !== null && declarer === sides.computer && random() < 0.5) {
          const person = sides.person;

          if (allied(dependencies, target, person)) {
            attitude(dependencies).adjust(target, person, 25, 'mercenary');
            endAlliance(dependencies, target, person);
          } else if (atPeace(dependencies, target, person)) {
            attitude(dependencies).adjust(target, person, 25, 'mercenary');
            declareWarQuietly(dependencies, target, person);
          }
        }
      })
    ),
    // The person paid tribute, or the computer player did: base-diplomacy's tribute rule gives it.
    new Resolved(
      `${prefix}:proposal/resolved/ally-helps`,
      accepted(AskAlly),
      effect((resolution, proposal: IProposal) => {
        const sides = sidesOf(dependencies, proposal.negotiation()),
          gift = allyGiftFor(proposal);

        if (sides !== null && gift !== undefined && gift !== null) {
          give(dependencies, gift, sides.computer, sides.person);
        }
      })
    ),
    new Resolved(
      `${prefix}:proposal/resolved/withdrawal`,
      accepted(DemandWithdrawal),
      effect((resolution, proposal: IProposal) => {
        const moved = expelUnits(dependencies, resolution.by(), proposal.by());

        engine.emit(
          'civ2-diplomacy:units-withdrawn',
          resolution.by(),
          proposal.by(),
          moved
        );
      })
    ),
    // Maps shared (`diplo_favor_share_maps`): two more of its patience.
    new Resolved(
      `${prefix}:proposal/resolved/share-maps`,
      accepted(ShareMaps),
      effect((resolution, proposal: IProposal) => {
        if (dependencies.playerWorldRegistry !== undefined) {
          shareMaps(
            { playerWorldRegistry: dependencies.playerWorldRegistry },
            proposal.by(),
            resolution.by()
          );
        }

        patience(dependencies, resolution.by(), proposal.by()).spend(2);
        engine.emit(
          'civ2-diplomacy:maps-shared',
          proposal.by(),
          resolution.by()
        );
      })
    ),
    new Resolved(
      `${prefix}:proposal/resolved/gift`,
      accepted(
        Gift,
        (resolution, proposal: Gift) => askedFor(proposal) === null
      ),
      effect((resolution, proposal: Gift) => {
        const given = proposal.gift();

        if (given instanceof Gold || given instanceof Advance) {
          give(dependencies, given, proposal.by(), resolution.by());

          return;
        }

        const unit = given as unknown as Unit,
          [home] = dependencies.cityRegistry
            .getByPlayer(resolution.by())
            .sort(
              (a, b) =>
                a.tile().distanceFrom(unit.tile()) -
                b.tile().distanceFrom(unit.tile())
            );

        unit.transfer(resolution.by(), null);

        if (home !== undefined) {
          unit.setTile(home.tile());
          unit.setStatus(null);
          unit.applyVisibility();
        }
      })
    ),
    new Resolved(
      `${prefix}:proposal/resolved/sell-advance`,
      accepted(SellAdvance),
      effect((resolution, proposal: SellAdvance) => {
        give(dependencies, proposal.price(), resolution.by(), proposal.by());
        give(dependencies, proposal.advance(), proposal.by(), resolution.by());
      })
    ),
  ];
};

/**
 * What the talks' answers cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard
 *  for the request for an audience too). Each change is the computer player's attitude toward the person.
 */
export const attitudeRules = (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
): (Accepted | Declined)[] => {
  const adjust = (proposal: IProposal, delta: number, reason: string): void => {
      const sides = sidesOf(dependencies, proposal.negotiation());

      if (sides !== null && delta !== 0) {
        attitude(dependencies).adjust(
          sides.computer,
          sides.person,
          delta,
          reason
        );
      }
    },
    by = (
      ProposalType: new (...args: any[]) => IProposal,
      side: 'computer' | 'person',
      also: (proposal: any, sides: Sides) => boolean = () => true
    ) =>
      new Criterion((proposal: IProposal): boolean => {
        const sides = sidesOf(dependencies, proposal.negotiation());

        return (
          proposal instanceof ProposalType &&
          sides !== null &&
          proposal.by() === sides[side] &&
          also(proposal, sides)
        );
      }),
    valueOf = (sides: Sides, advance: Advance): number =>
      advanceValue(dependencies, sides.computer, advance),
    demandKind = (proposal: IProposal): 3 | 4 | 5 =>
      proposal instanceof AskAlly
        ? 3
        : proposal instanceof DemandTribute
        ? 4
        : 5,
    demand = (proposal: IProposal) => {
      const sides = sidesOf(dependencies, proposal.negotiation())!;

      adjust(
        proposal,
        demandAttitude(
          demandKind(proposal),
          rank(dependencies, sides.computer),
          rank(dependencies, sides.person),
          dependencies.playerResearchRegistry
            .getByPlayer(sides.computer)
            .complete().length,
          dependencies.playerResearchRegistry
            .getByPlayer(sides.person)
            .complete().length
        ),
        'demand'
      );
    };

  return [
    // Paying the computer player: gold at its worth, an advance at 1½ times its value (or twice, as a secret).
    new Accepted(
      `${prefix}:proposal/accepted/tribute-paid`,
      by(DemandTribute, 'computer'),
      new Effect((proposal: Proposal): void => {
        const typed = proposal as unknown as DemandTribute;
        const sides = sidesOf(dependencies, proposal.negotiation())!,
          tribute = typed.tribute();

        adjust(
          proposal,
          tribute instanceof Gold
            ? -goldAttitudeValue(tribute.value())
            : askedFor(proposal) !== null
            ? -2 * valueOf(sides, tribute)
            : -Math.trunc((valueOf(sides, tribute) * 3) / 2),
          'tribute'
        );
      })
    ),
    new Accepted(
      `${prefix}:proposal/accepted/exchange-knowledge`,
      by(ExchangeKnowledge, 'computer'),
      new Effect((proposal: Proposal): void => {
        const typed = proposal as unknown as ExchangeKnowledge;
        const sides = sidesOf(dependencies, proposal.negotiation())!,
          [best] = typed.advances();

        if (best !== undefined) {
          adjust(proposal, -2 * valueOf(sides, best), 'exchange-knowledge');
        }
      })
    ),
    new Accepted(
      `${prefix}:proposal/accepted/exchange-knowledge-asked`,
      by(ExchangeKnowledge, 'person'),
      new Effect((proposal: Proposal): void => {
        const typed = proposal as unknown as ExchangeKnowledge;
        const sides = sidesOf(dependencies, proposal.negotiation())!,
          [best] = typed.advances();

        if (best !== undefined) {
          adjust(proposal, -2 * valueOf(sides, best), 'exchange-knowledge');
        }
      })
    ),
    // The person's gifts (`diplo_gift_menu`): gold 1½ times its worth, an advance 4 times its value, a unit 3 times its
    //  cost.
    new Accepted(
      `${prefix}:proposal/accepted/gift`,
      by(Gift, 'person'),
      new Effect((proposal: Proposal): void => {
        const typed = proposal as unknown as Gift;
        const sides = sidesOf(dependencies, proposal.negotiation())!,
          given = typed.gift();

        if (given instanceof Gold) {
          adjust(
            proposal,
            -Math.trunc((goldAttitudeValue(given.value()) * 3) / 2),
            'gift'
          );

          return;
        }

        if (given instanceof Advance) {
          adjust(proposal, -4 * valueOf(sides, given), 'gift');

          return;
        }

        // The original counts the unit's cost; its strength stands in for it here.
        const unit = given as unknown as Unit;

        adjust(
          proposal,
          -3 * Math.max(1, unit.attack().value() + unit.defence().value()),
          'gift'
        );
      })
    ),
    // Any of the person's demands, answered either way.
    new Accepted(
      `${prefix}:proposal/accepted/demand`,
      by(DemandTribute, 'person'),
      new Effect(demand)
    ),
    new Declined(
      `${prefix}:proposal/declined/demand`,
      by(DemandTribute, 'person'),
      new Effect(demand)
    ),
    new Accepted(
      `${prefix}:proposal/accepted/ask-ally`,
      by(AskAlly, 'person'),
      new Effect(demand)
    ),
    new Declined(
      `${prefix}:proposal/declined/ask-ally`,
      by(AskAlly, 'person'),
      new Effect(demand)
    ),
    new Accepted(
      `${prefix}:proposal/accepted/withdrawal`,
      by(DemandWithdrawal, 'person'),
      new Effect(demand)
    ),
    new Declined(
      `${prefix}:proposal/declined/withdrawal`,
      by(DemandWithdrawal, 'person'),
      new Effect(demand)
    ),
    // Cancelling an alliance in talks: 50 colder.
    new Accepted(
      `${prefix}:proposal/accepted/cancel-alliance`,
      by(CancelAlliance, 'person'),
      new Effect((proposal: IProposal): void =>
        adjust(proposal, 50, 'cancel-alliance')
      )
    ),
    // Refusing its call to war: 5 colder, 20 from an ally that asks; refusing its solidarity with an alliance, 10, and
    //  the alliance is made anyway if it fears the person, trusts it and likes it enough (`:3290-3305`).
    new Declined(
      `${prefix}:proposal/declined/join-war`,
      by(JoinWar, 'computer'),
      new Effect((proposal: Proposal): void => {
        const typed = proposal as unknown as JoinWar;
        const sides = sidesOf(dependencies, typed.negotiation())!;

        if (agendaItemOf(proposal) === AGENDA.alliance) {
          adjust(proposal, 10, 'solidarity');

          const evaluation = talks.evaluationOf(proposal.negotiation(), sides);

          if (
            evaluation.fear !== 0 &&
            evaluation.reputation <= 2 &&
            evaluation.attitude <= 25
          ) {
            formAlliance(dependencies, sides.computer, sides.person);
          }

          return;
        }

        adjust(
          proposal,
          allied(dependencies, sides.computer, sides.person) ? 20 : 5,
          'join-war'
        );
      })
    ),
  ];
};

/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance dismissed, or a treaty forced by the person's Senate.
 */
export const dialogueRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
): Resolved[] => {
  const heard = (key: string) =>
    new Criterion(
      (resolution: IResolution, proposal: IProposal): boolean =>
        resolution instanceof Acknowledge &&
        proposal instanceof Dialogue &&
        proposal.key() === key
    );

  return [
    new Resolved(
      `${prefix}:proposal/resolved/war`,
      heard(DIALOGUE.war),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          const computer = proposal.by(),
            person = resolution.by();

          if (!atWar(dependencies, computer, person)) {
            declareWarQuietly(dependencies, computer, person);
          }

          setFlag(dependencies, computer, person, AGGRESSOR);

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
      new Criterion(
        (resolution: IResolution, proposal: IProposal): boolean =>
          resolution instanceof Acknowledge &&
          proposal instanceof Dialogue &&
          [DIALOGUE.allyDismissed, DIALOGUE.allyTaunts].includes(proposal.key())
      ),
      new Effect(
        async (resolution: IResolution, proposal: IProposal): Promise<void> => {
          endAlliance(dependencies, proposal.by(), resolution.by());
          recordContact(
            dependencies,
            proposal.by(),
            resolution.by(),
            dependencies.turn.value()
          );
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
          signCeasefire(dependencies, proposal.by(), resolution.by());
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
          signPeace(dependencies, proposal.by(), resolution.by());
          // A peace the Senate forced is good for 16 turns more before the next audience.
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
  ];
};

/**
 * At the end of a computer player's talks with a person (`Terminated`): a computer player that meant war keeps its
 *  hostile intent, and on Chieftain the person is given an embassy if they aren't at war and it knows Writing
 *  (`:4110-4119`).
 */
export const terminatedRules = (
  prefix: string,
  dependencies: Dependencies,
  talks: Talks
): Terminated[] => [
  new Terminated(
    `${prefix}:negotiation/terminated/talks`,
    new Criterion(
      (negotiation: Negotiation): boolean =>
        sidesOf(dependencies, negotiation) !== null &&
        negotiation
          .interactions()
          .some(
            (action) =>
              action instanceof Accept && action.proposal() instanceof Initiate
          )
    ),
    new Effect((negotiation: Negotiation): void => {
      const sides = sidesOf(dependencies, negotiation)!,
        { computer, person } = sides,
        evaluation = talks.evaluationOf(negotiation, sides);

      if (
        evaluation.declareWar &&
        !allied(dependencies, computer, person) &&
        !atWar(dependencies, computer, person)
      ) {
        setFlag(dependencies, computer, person, HOSTILE_INTENT);
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
