"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminatedRules = exports.dialogueRules = exports.attitudeRules = exports.resolvedRules = exports.interactionRules = exports.proposalAvailableRules = exports.stepRules = exports.beginDescription = exports.computerStepDescription = exports.PERSON_STEPS = void 0;
const talks_1 = require("../talks");
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const effects_1 = require("../effects");
const relations_1 = require("../relations");
const formulas_1 = require("../formulas");
const Accept_1 = require("@civ-clone/core-diplomacy/Proposal/Accept");
const Accepted_1 = require("@civ-clone/core-diplomacy/Rules/Proposal/Accepted");
const Acknowledge_1 = require("@civ-clone/core-diplomacy/Proposal/Acknowledge");
const Advance_1 = require("@civ-clone/core-science/Advance");
const AskAlly_1 = require("@civ-clone/library-diplomacy/Proposals/AskAlly");
const CancelAlliance_1 = require("@civ-clone/library-diplomacy/Proposals/CancelAlliance");
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const ChoiceMeta_1 = require("@civ-clone/core-client/ChoiceMeta");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Decline_1 = require("@civ-clone/core-diplomacy/Proposal/Decline");
const Declined_1 = require("@civ-clone/core-diplomacy/Rules/Proposal/Declined");
const DemandTribute_1 = require("@civ-clone/library-diplomacy/Proposals/DemandTribute");
const DemandWithdrawal_1 = require("@civ-clone/library-diplomacy/Proposals/DemandWithdrawal");
const Dialogue_1 = require("@civ-clone/core-diplomacy/Negotiation/Dialogue");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Embassy_1 = require("@civ-clone/base-unit-action-establish-embassy/Embassy");
const ExchangeKnowledge_1 = require("@civ-clone/library-diplomacy/Proposals/ExchangeKnowledge");
const Gift_1 = require("@civ-clone/library-diplomacy/Proposals/Gift");
const Gold_1 = require("@civ-clone/base-city-yield-gold/Gold");
const Initiate_1 = require("@civ-clone/core-diplomacy/Negotiation/Initiate");
const Interaction_1 = require("@civ-clone/core-diplomacy/Rules/Negotiation/Interaction");
const JoinWar_1 = require("@civ-clone/library-diplomacy/Proposals/JoinWar");
const OfferCeasefire_1 = require("@civ-clone/library-diplomacy/Proposals/OfferCeasefire");
const OfferPeace_1 = require("@civ-clone/library-diplomacy/Proposals/OfferPeace");
const Proposal_1 = require("@civ-clone/core-diplomacy/Negotiation/Proposal");
const ProposalAvailable_1 = require("@civ-clone/base-diplomacy/Rules/ProposalAvailable");
const ProposeAlliance_1 = require("@civ-clone/library-diplomacy/Proposals/ProposeAlliance");
const Resolution_1 = require("@civ-clone/core-diplomacy/Proposal/Resolution");
const Resolved_1 = require("@civ-clone/core-diplomacy/Rules/Proposal/Resolved");
const SellAdvance_1 = require("@civ-clone/library-diplomacy/Proposals/SellAdvance");
const ShareMaps_1 = require("@civ-clone/library-diplomacy/Proposals/ShareMaps");
const Step_1 = require("@civ-clone/core-diplomacy/Rules/Negotiation/Step");
const Terminate_1 = require("@civ-clone/core-diplomacy/Negotiation/Terminate");
const Terminated_1 = require("@civ-clone/core-diplomacy/Rules/Negotiation/Terminated");
const Vendetta_1 = require("@civ-clone/library-diplomacy/Declarations/Vendetta");
const Never_1 = require("@civ-clone/core-diplomacy/Expiries/Never");
const holds_1 = require("@civ-clone/library-diplomacy/lib/holds");
const evaluate_1 = require("../evaluate");
const Description_1 = require("@civ-clone/core-rule/Description");
const wonders_1 = require("../wonders");
const Advances_1 = require("@civ-clone/civ2-science/Advances");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const callForHelp_1 = require("../callForHelp");
const survey_1 = require("../survey");
const knowledge_1 = require("@civ-clone/base-diplomacy/lib/knowledge");
const embassy_1 = require("@civ-clone/base-diplomacy/lib/embassy");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const declareWar_2 = require("@civ-clone/base-diplomacy/lib/declareWar");
const relations_2 = require("../relations");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const senate_1 = require("../senate");
const shareMaps_1 = require("@civ-clone/base-diplomacy/lib/shareMaps");
const units_1 = require("../units");
const border_1 = require("../border");
/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
exports.PERSON_STEPS = 48;
// The steps worked out once for each step of each negotiation: `Step` rules ask for them in their criteria and again
//  in their effects, and a client may ask for the steps as often as it likes. A resolution's effects change the
//  meeting, so a step asked for before its proposal is resolved is worked out again after.
const cached = (cache, negotiation, make) => {
    const last = negotiation.lastInteraction(), key = `${negotiation.interactions().length}:${last instanceof Resolution_1.default ? last.proposal().resolved() : ''}`, kept = cache.get(negotiation);
    if (kept !== undefined && kept.key === key) {
        return kept.value;
    }
    const value = make();
    cache.set(negotiation, { key, value });
    return value;
};
const { 'eiffel-tower': EiffelTower, 'great-wall': GreatWall, 'magellans-expedition': MagellansExpedition, 'marco-polos-embassy': MarcoPolosEmbassy, 'united-nations': UnitedNations, } = wonders_1.diplomaticWonders;
/**
 * What the wonders do to the computer player's answers (civ-clone/web-renderer#1291): it accepts peace from the owner
 *  of the Great Wall or the United Nations (`peaceFlags`), shares maps without an alliance with the owner of Marco
 *  Polo's or Magellan's (`sharesMaps`), and hears more of the Eiffel Tower's owner's proposals (`patienceLimit`).
 */
exports.computerStepDescription = new Description_1.default({ type: 'talks_peace', subject: GreatWall }, { type: 'talks_peace', subject: UnitedNations }, { type: 'shared_maps', subject: MarcoPolosEmbassy }, { type: 'shared_maps', subject: MagellansExpedition }, { type: 'talks_patience', subject: EiffelTower, value: evaluate_1.EIFFEL_TOWER_PATIENCE });
/**
 * What the wonders do to the computer player's view of the person as talks open (`evaluate`, civ-clone/web-renderer#1291):
 *  the owner of the Great Wall or the United Nations faces no aggressive demands and is warmer in talks; a computer
 *  owner of Marco Polo's asks a quarter more tribute.
 */
exports.beginDescription = new Description_1.default({ type: 'talks_no_tribute', subject: GreatWall }, { type: 'talks_attitude', subject: GreatWall, value: evaluate_1.PACIFYING_ATTITUDE }, { type: 'talks_no_tribute', subject: UnitedNations }, { type: 'talks_attitude', subject: UnitedNations, value: evaluate_1.PACIFYING_ATTITUDE }, { type: 'tribute_demand', subject: MarcoPolosEmbassy, step: 'more' });
/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
const stepRules = (talks) => {
    const computerSteps = new WeakMap(), personSteps = new WeakMap(), computerStep = (negotiation) => cached(computerSteps, negotiation, () => talks.computerStep(negotiation)), personStep = (negotiation, index) => {
        var _a;
        return (_a = cached(personSteps, negotiation, () => talks.personSteps(negotiation))[index]) !== null && _a !== void 0 ? _a : null;
    };
    return [
        new Step_1.default(new Criterion_1.default((negotiation) => computerStep(negotiation) !== null), new Effect_1.default((negotiation) => computerStep(negotiation)), exports.computerStepDescription),
        ...Array.from({ length: exports.PERSON_STEPS }, (_, index) => new Step_1.default(new Criterion_1.default((negotiation) => personStep(negotiation, index) !== null), new Effect_1.default((negotiation) => personStep(negotiation, index)))),
    ];
};
exports.stepRules = stepRules;
/**
 * Which of the person's proposals the menu offers (`diplo_proposal_menu`, `diplomacy.cpp:2732`): an alliance at peace;
 *  peace when not at peace; asking an ally for help and cancelling an alliance when allied; tribute when not allied and
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war on any other
 *  player, maps) and the gifts always.
 */
const proposalAvailableRules = (prefix, dependencies, republican) => {
    const sides = (proposal) => (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), rule = (name, ProposalType, available) => new ProposalAvailable_1.default(`${prefix}:proposal/available/${name}`, new Criterion_1.default((proposal) => {
        var _a;
        return proposal instanceof ProposalType &&
            ((_a = sides(proposal)) === null || _a === void 0 ? void 0 : _a.person) === proposal.by();
    }), new Effect_1.default((proposal) => available(sides(proposal)))), peace = ({ computer, person }) => (0, standing_1.atPeace)(dependencies, computer, person), alliance = ({ computer, person }) => (0, standing_1.allied)(dependencies, computer, person);
    return [
        rule('alliance', ProposeAlliance_1.default, (sides) => peace(sides) && !alliance(sides)),
        rule('peace', OfferPeace_1.default, (sides) => !peace(sides)),
        rule('ask-ally', AskAlly_1.default, alliance),
        rule('tribute', DemandTribute_1.default, (sides) => !alliance(sides) && !republican(sides.person)),
        rule('withdrawal', DemandWithdrawal_1.default, (sides) => peace(sides) &&
            !alliance(sides) &&
            !(0, flags_1.hasFlag)(dependencies, sides.computer, sides.person, flags_1.CHANGED_THIS_TURN)),
        rule('cancel-alliance', CancelAlliance_1.default, alliance),
        rule('exchange-knowledge', ExchangeKnowledge_1.default, () => true),
        rule('join-war', JoinWar_1.default, () => true),
        rule('share-maps', ShareMaps_1.default, () => true),
        rule('gift', Gift_1.default, () => true),
    ];
};
exports.proposalAvailableRules = proposalAvailableRules;
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
const interactionRules = (prefix, dependencies, talks) => {
    const { interactionRegistry, ruleRegistry, turn } = dependencies;
    return [
        new Interaction_1.default(`${prefix}:negotiation/interaction/begin`, new Criterion_1.default((interaction) => interaction instanceof Initiate_1.default), new Effect_1.default((interaction, negotiation) => {
            (0, talks_1.begin)(dependencies, negotiation);
        }), exports.beginDescription),
        new Interaction_1.default(`${prefix}:negotiation/interaction/contact`, new Criterion_1.default((interaction) => interaction instanceof Initiate_1.default), new Effect_1.default((interaction, negotiation) => {
            const [player, other] = negotiation.players();
            (0, makeContact_1.default)(interactionRegistry, player, other, ruleRegistry, turn);
        })),
        new Interaction_1.default(`${prefix}:negotiation/interaction/audience`, new Criterion_1.default((interaction, negotiation) => interaction instanceof Accept_1.default &&
            interaction.proposal() instanceof Initiate_1.default &&
            (0, talks_1.meetingOf)(negotiation) !== null), new Effect_1.default((interaction, negotiation) => {
            const meeting = (0, talks_1.meetingOf)(negotiation), { computer, person, computerLed } = meeting.sides, kept = (0, patience_1.patience)(dependencies, computer, person);
            (0, flags_1.setBoth)(dependencies, computer, person, flags_1.MET_THIS_TURN);
            if (!computerLed) {
                if ((0, flags_1.hasFlag)(dependencies, person, computer, flags_1.INCIDENT)) {
                    kept.reset();
                }
                else if ((0, flags_1.hasFlag)(dependencies, person, computer, flags_1.AGGRESSOR)) {
                    kept.spend(talks.limitOf(meeting) - kept.spent());
                }
                return;
            }
            kept.reset();
            (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, computer, person).forEach((ceasefire) => ceasefire.expire(computer));
            (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.CEASEFIRE_LINGERS | flags_1.TRIBUTE);
            (0, lastContact_1.recordContact)(dependencies, computer, person, turn.value());
        })),
        new Interaction_1.default(`${prefix}:negotiation/interaction/spend-patience`, new Criterion_1.default((interaction, negotiation) => {
            const meeting = (0, talks_1.meetingOf)(negotiation);
            return (meeting !== null &&
                interaction instanceof Proposal_1.default &&
                !(interaction instanceof Initiate_1.default) &&
                !(interaction instanceof Dialogue_1.default) &&
                interaction.by() === meeting.sides.person);
        }), new Effect_1.default((interaction, negotiation) => {
            const meeting = (0, talks_1.meetingOf)(negotiation), kept = (0, patience_1.patience)(dependencies, meeting.sides.computer, meeting.sides.person);
            // The answer reads the count as it was before this charge (`diplo_request_count`, raised after it).
            meeting.patienceBefore = kept.spent();
            // Tribute and an ally's help set it to the limit, and the menu's loop adds 1 (`:1874-1878`).
            if (interaction instanceof DemandTribute_1.default ||
                interaction instanceof AskAlly_1.default) {
                kept.spend(Math.max(0, talks.limitOf(meeting) - kept.spent()) + 1);
                return;
            }
            kept.spend(1);
        })),
    ];
};
exports.interactionRules = interactionRules;
// Whose side a step is on.
const meetingFor = (proposal) => (0, talks_1.meetingOf)(proposal.negotiation());
/**
 * What the talks' answers do (`Resolved`): treaties, payments, wars and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
const resolvedRules = (prefix, dependencies, engine, random) => {
    const { clientRegistry, playerResearchRegistry, turn } = dependencies, resolved = (name, applies, run) => new Resolved_1.default(`${prefix}:proposal/resolved/${name}`, new Criterion_1.default((resolution, proposal) => {
        const meeting = meetingFor(proposal);
        return meeting !== null && applies(resolution, proposal, meeting);
    }), new Effect_1.default(async (resolution, proposal) => run(resolution, proposal, meetingFor(proposal)))), accepted = (ProposalType, side) => (resolution, proposal, meeting) => resolution instanceof Accept_1.default &&
        proposal instanceof ProposalType &&
        proposal.by() === meeting.sides[side], declined = (ProposalType, side) => (resolution, proposal, meeting) => resolution instanceof Decline_1.default &&
        proposal instanceof ProposalType &&
        proposal.by() === meeting.sides[side], item = (proposal) => (0, talks_1.agendaItemOf)(proposal), paid = (meeting) => {
        meeting.paid = true;
        meeting.aggressive = false;
    }, spend = (meeting, amount) => (0, patience_1.patience)(dependencies, meeting.sides.computer, meeting.sides.person).spend(amount), 
    // Tribute paid with a ceasefire lapsed renews it (`diplomacy.cpp:3030`).
    renew = (meeting) => {
        if (meeting.hadCeasefire &&
            !(0, standing_1.atPeace)(dependencies, meeting.sides.computer, meeting.sides.person)) {
            (0, declareWar_2.makeCeasefire)(dependencies, meeting.sides.computer, meeting.sides.person);
        }
    }, refuseHelp = (meeting) => {
        const { computer, person } = meeting.sides;
        meeting.helpRefusal = meeting.live.value < 51 ? 'colder' : 'cancel';
        if (meeting.helpRefusal === 'colder') {
            (0, relations_1.attitude)(dependencies).adjust(computer, person, 100, 'help-refused');
            (0, callForHelp_1.answered)(dependencies, computer, person);
        }
    }, 
    // The person picks one of the computer player's advances (`civ_steal_advance`).
    personPicks = async (resolution, meeting) => {
        const { computer, person } = meeting.sides, research = playerResearchRegistry.getByPlayer(person), choices = playerResearchRegistry
            .getByPlayer(computer)
            .complete()
            .map((advance) => advance.sourceClass())
            .filter((Type) => !Type.repeatable && !research.completed(Type));
        if (choices.length === 0) {
            return;
        }
        const chosen = await clientRegistry
            .getByPlayer(person)
            .chooseFromList(new ChoiceMeta_1.default(choices, 'diplomacy.exchange-knowledge', resolution));
        research.addAdvance(chosen);
    };
    return [
        // Before peace is made (and the ceasefire it supersedes ends): a peace signed during a ceasefire still carries it.
        resolved('note-ceasefire', (resolution, proposal) => resolution instanceof Accept_1.default && proposal instanceof OfferPeace_1.default, (resolution, proposal, meeting) => {
            if ((0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, meeting.sides.computer, meeting.sides.person).length > 0) {
                (0, flags_1.setBoth)(dependencies, meeting.sides.computer, meeting.sides.person, flags_1.CEASEFIRE_LINGERS);
            }
        }),
        // Treaties: peace and ceasefires accepted either way, a refusal overruled by its Great Wall or United Nations, a
        //  concession accepted.
        resolved('treaty', (resolution, proposal, meeting) => {
            const offer = proposal instanceof Gift_1.default && (0, talks_1.askedFor)(proposal) !== null
                ? (0, talks_1.askedFor)(proposal)
                : proposal;
            if (!(offer instanceof OfferPeace_1.default || offer instanceof OfferCeasefire_1.default)) {
                return false;
            }
            if (resolution instanceof Accept_1.default) {
                return true;
            }
            return (resolution instanceof Decline_1.default &&
                proposal === offer &&
                offer.by() === meeting.sides.computer &&
                (0, talks_1.outcomeOf)(resolution).end !== true &&
                resolution.by() === meeting.sides.person &&
                (0, wonders_1.pacifies)(dependencies, meeting.sides.computer));
        }, (resolution, proposal, meeting) => {
            var _a;
            const { computer, person } = meeting.sides, offer = proposal instanceof Gift_1.default && (0, talks_1.askedFor)(proposal) !== null
                ? (0, talks_1.askedFor)(proposal)
                : proposal;
            if (proposal instanceof Gift_1.default) {
                (0, knowledge_1.give)(dependencies, proposal.gift(), computer, person);
                ((_a = (0, talks_1.outcomeOf)(proposal).gives) !== null && _a !== void 0 ? _a : []).forEach((gift) => (0, knowledge_1.give)(dependencies, gift, computer, person));
                meeting.conceded = true;
            }
            if (offer instanceof OfferCeasefire_1.default) {
                (0, effects_1.signCeasefire)(dependencies, computer, person);
            }
            else {
                (0, effects_1.signPeace)(dependencies, computer, person);
            }
            meeting.treatyMade = true;
            if (resolution instanceof Decline_1.default) {
                engine.emit('civ2-diplomacy:refusal-overruled', computer, person, offer);
            }
        }),
        // A person's Senate forced the acceptance.
        resolved('senate-forced-acceptance', (resolution, proposal, meeting) => resolution instanceof Accept_1.default &&
            (proposal instanceof OfferCeasefire_1.default ||
                proposal instanceof OfferPeace_1.default) &&
            proposal.by() === meeting.sides.computer &&
            (0, talks_1.wasForced)(proposal), (resolution, proposal, meeting) => {
            meeting.senateBlocked = true;
        }),
        // The computer player's alliance, and its call to fight a common enemy (its solidarity), accepted or not.
        resolved('alliance', (resolution, proposal, meeting) => accepted(ProposeAlliance_1.default, 'computer')(resolution, proposal, meeting) ||
            (proposal instanceof JoinWar_1.default &&
                proposal.by() === meeting.sides.computer &&
                item(proposal) === talks_1.AGENDA.alliance), (resolution, proposal, meeting) => {
            const { computer, person } = meeting.sides;
            meeting.treatyMade = true;
            if (proposal instanceof JoinWar_1.default) {
                if (resolution instanceof Accept_1.default) {
                    (0, effects_1.declareWarFor)(dependencies, person, proposal.against(), computer);
                    (0, flags_1.setFlag)(dependencies, computer, proposal.against(), flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
                }
                else if (meeting.fear === 0 ||
                    meeting.evaluation.reputation > 2 ||
                    // The refusal's 10 counts already (`:3299-3304`): the `Declined` rule adds it after.
                    meeting.live.value + 10 > 25) {
                    return;
                }
            }
            (0, effects_1.formAlliance)(dependencies, computer, person);
        }),
        // Asks: the person pays a sweetener, a price, or a secret advance, or joins a war at the computer player's call.
        resolved('ask', (resolution, proposal, meeting) => resolution instanceof Accept_1.default &&
            resolution.by() === meeting.sides.person &&
            (0, talks_1.askedFor)(proposal) !== null &&
            !(proposal instanceof Gift_1.default), async (resolution, proposal, meeting) => {
            var _a;
            const { computer, person } = meeting.sides;
            if (proposal instanceof DemandTribute_1.default) {
                (0, knowledge_1.give)(dependencies, proposal.tribute(), person, computer);
                ((_a = (0, talks_1.outcomeOf)(proposal).alsoTakes) !== null && _a !== void 0 ? _a : []).forEach((advance) => (0, knowledge_1.give)(dependencies, advance, person, computer));
                return;
            }
            if (proposal instanceof JoinWar_1.default) {
                const against = proposal.against(), asked = (0, talks_1.askedFor)(proposal);
                (0, effects_1.declareWarFor)(dependencies, person, against, computer);
                // A common enemy it named for the alliance: it goes to war with it too (`:1610-1614`).
                if (asked instanceof ProposeAlliance_1.default) {
                    if (!(0, standing_1.atWar)(dependencies, computer, against)) {
                        (0, effects_1.declareWarQuietly)(dependencies, computer, against);
                    }
                    (0, makeContact_1.default)(dependencies.interactionRegistry, person, against, dependencies.ruleRegistry, turn);
                }
                (0, flags_1.setFlag)(dependencies, computer, against, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
                return;
            }
            if (proposal instanceof SellAdvance_1.default) {
                (0, knowledge_1.give)(dependencies, proposal.price(), person, computer);
                (0, knowledge_1.give)(dependencies, proposal.advance(), computer, person);
            }
        }),
        // The person's proposal answered: what the answer brings.
        resolved('answer', (resolution, proposal, meeting) => resolution.by() === meeting.sides.computer &&
            proposal.by() === meeting.sides.person &&
            !(proposal instanceof Initiate_1.default), async (resolution, proposal, meeting) => {
            var _a;
            const { computer, person } = meeting.sides, outcome = (0, talks_1.outcomeOf)(resolution);
            if (outcome.patience) {
                spend(meeting, outcome.patience);
            }
            ((_a = outcome.gives) !== null && _a !== void 0 ? _a : []).forEach((gift) => (0, knowledge_1.give)(dependencies, gift, computer, person));
            if (outcome.withdraws) {
                engine.emit('civ2-diplomacy:units-withdrawn', computer, person, (0, effects_1.withdrawUnits)(dependencies, computer, person));
            }
            // Tribute paid without peace brings a ceasefire, marked as paid unless one was already in force (`:2072-2077`).
            if (outcome.ceasefire) {
                if (!meeting.hadCeasefire) {
                    (0, flags_1.setBoth)(dependencies, computer, person, flags_1.TRIBUTE);
                }
                (0, declareWar_2.makeCeasefire)(dependencies, computer, person);
                (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.SIGNING_CLEARS);
            }
            if (!(resolution instanceof Accept_1.default)) {
                return;
            }
            if (proposal instanceof ProposeAlliance_1.default) {
                (0, effects_1.formAlliance)(dependencies, computer, person);
                return;
            }
            if (proposal instanceof OfferPeace_1.default) {
                return;
            }
            if (proposal instanceof CancelAlliance_1.default) {
                (0, relations_1.reputation)(dependencies).adjust(person, 1, 'cancel-alliance');
                (0, effects_1.endAlliance)(dependencies, person, computer);
                engine.emit('civ2-diplomacy:alliance-cancelled', person, computer);
                return;
            }
            if (proposal instanceof ExchangeKnowledge_1.default && outcome.takes) {
                (0, knowledge_1.give)(dependencies, outcome.takes, person, computer);
                await personPicks(resolution, meeting);
                meeting.aggressive = false;
                return;
            }
            // A war for hire (`diplo_favor_mercenary_war`, `:2302`): no declaration, so no reputation; one time in two the
            //  target finds out.
            if (proposal instanceof JoinWar_1.default && outcome.war) {
                const target = proposal.against();
                if (!(0, standing_1.atWar)(dependencies, computer, target)) {
                    (0, effects_1.declareWarQuietly)(dependencies, computer, target);
                }
                (0, flags_1.setFlag)(dependencies, computer, target, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
                (0, flags_1.setFlag)(dependencies, computer, person, flags_1.MERCENARY);
                (0, flags_1.setBoth)(dependencies, computer, target, flags_1.RECENT_CONTACT);
                if (random() < 0.5) {
                    if ((0, standing_1.allied)(dependencies, person, target)) {
                        (0, relations_1.attitude)(dependencies).adjust(target, person, 25, 'mercenary');
                        (0, effects_1.endAlliance)(dependencies, person, target);
                    }
                    else if ((0, standing_1.atPeace)(dependencies, person, target)) {
                        (0, relations_1.attitude)(dependencies).adjust(target, person, 25, 'mercenary');
                        (0, effects_1.declareWarQuietly)(dependencies, person, target);
                        registerVendetta(dependencies, target, person);
                    }
                }
                return;
            }
            if (proposal instanceof ShareMaps_1.default) {
                if (dependencies.playerWorldRegistry !== undefined) {
                    (0, shareMaps_1.shareMaps)({ playerWorldRegistry: dependencies.playerWorldRegistry }, person, computer);
                }
                engine.emit('civ2-diplomacy:maps-shared', person, computer);
                return;
            }
            if (proposal instanceof Gift_1.default) {
                const given = proposal.gift();
                if (given instanceof Gold_1.default || given instanceof Advance_1.default) {
                    (0, knowledge_1.give)(dependencies, given, person, computer);
                    // A gift of gold or an advance gives back the patience it cost and more, and counts (`:2547`, `:2580`);
                    //  a unit's doesn't (`:2600-2700`).
                    spend(meeting, -(meeting.gifts + 2));
                    meeting.gifts++;
                }
                else {
                    const unit = given, terms = (0, units_1.unitTerms)(dependencies, computer, unit), [home] = dependencies.cityRegistry
                        .getByPlayer(computer)
                        .sort((a, b) => a.tile().distanceFrom(unit.tile()) -
                        b.tile().distanceFrom(unit.tile()));
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
            }
        }),
        // The computer player's own proposals at an audience, answered by the person.
        resolved('agenda', (resolution, proposal, meeting) => resolution.by() === meeting.sides.person &&
            proposal.by() === meeting.sides.computer &&
            item(proposal) !== undefined &&
            (0, talks_1.askedFor)(proposal) === null &&
            !(proposal instanceof Dialogue_1.default), async (resolution, proposal, meeting) => {
            const { computer, person } = meeting.sides, yes = resolution instanceof Accept_1.default, alliance = (0, standing_1.allied)(dependencies, computer, person);
            switch (item(proposal)) {
                case talks_1.AGENDA.callForHelp: {
                    if (yes) {
                        (0, effects_1.declareWarFor)(dependencies, person, proposal.against(), computer);
                        (0, callForHelp_1.answered)(dependencies, computer, person);
                    }
                    return;
                }
                case talks_1.AGENDA.violators: {
                    // The units it counted go to their own nearest cities (`diplo_review_violators`, `:6378-6390`).
                    if (yes) {
                        (0, border_1.takeIntruders)(dependencies, computer, person).forEach((unit) => (0, effects_1.sendHome)(dependencies, unit));
                        (0, flags_1.clearFlag)(dependencies, computer, person, flags_1.WITHDRAWAL_DEMANDED);
                    }
                    return;
                }
                case talks_1.AGENDA.exchange: {
                    if (!yes) {
                        return;
                    }
                    if (proposal instanceof Gift_1.default) {
                        (0, knowledge_1.give)(dependencies, proposal.gift(), computer, person);
                        spend(meeting, 2);
                        return;
                    }
                    const takes = (0, talks_1.outcomeOf)(proposal).takes;
                    if (takes) {
                        (0, knowledge_1.give)(dependencies, takes, person, computer);
                        await personPicks(resolution, meeting);
                        meeting.aggressive = false;
                    }
                    return;
                }
                case talks_1.AGENDA.warOnTarget: {
                    if (!yes) {
                        if (alliance) {
                            meeting.propose = true;
                        }
                        spend(meeting, 1);
                        return;
                    }
                    (0, effects_1.declareWarFor)(dependencies, person, proposal.against(), computer);
                    meeting.declaredWar = true;
                    meeting.aggressive = false;
                    meeting.warTarget = null;
                    if (alliance) {
                        meeting.tribute = 0;
                        meeting.paid = true;
                    }
                    else if (random() < 0.5) {
                        meeting.tribute = 0;
                        renew(meeting);
                    }
                    return;
                }
                case talks_1.AGENDA.tribute: {
                    meeting.tribute = 999;
                    if (yes) {
                        (0, knowledge_1.give)(dependencies, proposal.tribute(), person, computer);
                        paid(meeting);
                        if ((0, patience_1.patience)(dependencies, computer, person).spent() > 0) {
                            spend(meeting, -1);
                        }
                        renew(meeting);
                    }
                    return;
                }
                case talks_1.AGENDA.tech: {
                    meeting.tribute = 999;
                    if (yes) {
                        (0, knowledge_1.give)(dependencies, proposal.tribute(), person, computer);
                        // Over a barrel (`:3060-3080`): with its units near the person's cities and aggressive, it demands a
                        //  second advance before it counts itself paid; with none left to demand, or this the second, it is.
                        const demanded = proposal
                            .negotiation()
                            .interactions()
                            .filter((action) => action instanceof Accept_1.default &&
                            item(action.proposal()) === talks_1.AGENDA.tech).length, another = meeting.evaluation.unitsNearCities &&
                            meeting.aggressive &&
                            demanded < 2 &&
                            (0, survey_1.survey)(dependencies, computer, person).best !== null;
                        if (!another) {
                            paid(meeting);
                            renew(meeting);
                            if ((0, patience_1.patience)(dependencies, computer, person).spent() > 0) {
                                spend(meeting, -1);
                            }
                        }
                        return;
                    }
                    if (alliance) {
                        spend(meeting, 1);
                    }
                    return;
                }
                case talks_1.AGENDA.ceasefire:
                case talks_1.AGENDA.peace:
                    return;
            }
        }),
        // A call for help's payment, accepted: the gold, and the war. Refused, the call ends by the attitude before the
        //  refusal: below 51, 100 colder; else the alliance is cancelled (`:1336-1341`).
        resolved('help-bonus', (resolution, proposal, meeting) => proposal instanceof Gift_1.default &&
            item(proposal) === talks_1.AGENDA.callForHelp &&
            resolution.by() === meeting.sides.person, (resolution, proposal, meeting) => {
            const { computer, person } = meeting.sides, call = (0, talks_1.askedFor)(proposal);
            if (resolution instanceof Accept_1.default) {
                (0, knowledge_1.give)(dependencies, proposal.gift(), computer, person);
                (0, effects_1.declareWarFor)(dependencies, person, call.against(), computer);
                (0, callForHelp_1.answered)(dependencies, computer, person);
                return;
            }
            refuseHelp(meeting);
        }),
        // A call for help refused with no payment to offer.
        resolved('help-refused', (resolution, proposal, meeting) => resolution instanceof Decline_1.default &&
            proposal instanceof JoinWar_1.default &&
            item(proposal) === talks_1.AGENDA.callForHelp &&
            (0, talks_1.helpBonus)(dependencies, meeting.sides.computer, proposal.against()) === 0, (resolution, proposal, meeting) => refuseHelp(meeting)),
    ];
};
exports.resolvedRules = resolvedRules;
const registerVendetta = (dependencies, holder, against) => {
    if (!(0, holds_1.hasVendetta)(holder, against, dependencies.interactionRegistry)) {
        dependencies.interactionRegistry.register(new Vendetta_1.default(holder, against, new Never_1.default(), dependencies.ruleRegistry));
    }
};
/**
 * What the talks cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard for the
 *  request for an audience too). Each is the computer player's attitude toward the person, and moves its attitude in
 *  the talks with it.
 */
const attitudeRules = (prefix, dependencies) => {
    const adjust = (meeting, delta, reason) => {
        if (delta !== 0) {
            (0, relations_1.attitude)(dependencies).adjust(meeting.sides.computer, meeting.sides.person, delta, reason);
        }
    }, by = (ProposalType, side, also = () => true) => new Criterion_1.default((proposal) => {
        const meeting = meetingFor(proposal);
        return (proposal instanceof ProposalType &&
            meeting !== null &&
            proposal.by() === meeting.sides[side] &&
            also(proposal, meeting));
    }), rule = (Type, name, criterion, delta) => new Type(`${prefix}:proposal/${Type === Accepted_1.default ? 'accepted' : 'declined'}/${name}`, criterion, new Effect_1.default((proposal) => {
        const meeting = meetingFor(proposal);
        adjust(meeting, delta(proposal, meeting), name);
    })), valueOf = (meeting, advance) => (0, survey_1.advanceValue)(dependencies, meeting.sides.computer, advance), demand = (proposal, meeting) => (0, formulas_1.demandAttitude)(proposal instanceof AskAlly_1.default
        ? 3
        : proposal instanceof DemandTribute_1.default
            ? 4
            : 5, (0, standing_1.rank)(dependencies, meeting.sides.computer), (0, standing_1.rank)(dependencies, meeting.sides.person), (0, standing_1.advanceCount)(dependencies, meeting.sides.computer), (0, standing_1.advanceCount)(dependencies, meeting.sides.person));
    return [
        // Paid to the computer player: gold at its worth (a war's price at none), an advance at 1½ times its value
        //  demanded, twice as a secret.
        rule(Accepted_1.default, 'tribute', by(DemandTribute_1.default, 'computer'), (proposal, meeting) => {
            var _a;
            const tribute = proposal.tribute(), asked = (0, talks_1.askedFor)(proposal);
            if (asked instanceof JoinWar_1.default) {
                return 0;
            }
            if (tribute instanceof Gold_1.default) {
                return -(0, formulas_1.goldAttitudeValue)(tribute.value());
            }
            return asked !== null
                ? -((_a = (0, talks_1.outcomeOf)(proposal).attitude) !== null && _a !== void 0 ? _a : 2 * valueOf(meeting, tribute))
                : -Math.trunc((valueOf(meeting, tribute) * 3) / 2);
        }),
        // A tech demand refused by an ally: its reputation + 2 colder (`:3108`).
        rule(Declined_1.default, 'tech-refused', by(DemandTribute_1.default, 'computer', (proposal, meeting) => (0, talks_1.agendaItemOf)(proposal) === talks_1.AGENDA.tech &&
            (0, standing_1.allied)(dependencies, meeting.sides.computer, meeting.sides.person)), (proposal, meeting) => (0, relations_1.reputation)(dependencies).get(meeting.sides.person) +
            2 -
            (0, relations_1.reputation)(dependencies).credit(meeting.sides.computer, meeting.sides.person)),
        // An exchange: its value, twice the best advance's, or the second's (`:1040`).
        rule(Accepted_1.default, 'exchange-knowledge', by(ExchangeKnowledge_1.default, 'computer'), (proposal) => { var _a; return -((_a = (0, talks_1.outcomeOf)(proposal).attitude) !== null && _a !== void 0 ? _a : 0); }),
        // The person's gifts (`diplo_gift_menu`): gold 1½ times its worth, an advance 4 or 2 times the best's value, a
        //  unit 3 times its cost (half if it knows the unit's prerequisite).
        rule(Accepted_1.default, 'gift', by(Gift_1.default, 'person'), (proposal, meeting) => {
            var _a;
            const given = proposal.gift();
            if (given instanceof Gold_1.default) {
                return -Math.trunc(((0, formulas_1.goldAttitudeValue)(given.value()) * 3) / 2);
            }
            if (given instanceof Advance_1.default) {
                return -((_a = (0, talks_1.outcomeOf)(proposal).attitude) !== null && _a !== void 0 ? _a : 4 * valueOf(meeting, given));
            }
            return -(0, units_1.unitTerms)(dependencies, meeting.sides.computer, given).attitude;
        }),
        // The person's demands, answered either way (`:1967-1981`).
        rule(Accepted_1.default, 'tribute-demand', by(DemandTribute_1.default, 'person'), demand),
        rule(Declined_1.default, 'tribute-demand', by(DemandTribute_1.default, 'person'), demand),
        rule(Accepted_1.default, 'ask-ally', by(AskAlly_1.default, 'person'), demand),
        rule(Declined_1.default, 'ask-ally', by(AskAlly_1.default, 'person'), demand),
        rule(Accepted_1.default, 'withdrawal', by(DemandWithdrawal_1.default, 'person'), demand),
        rule(Declined_1.default, 'withdrawal', by(DemandWithdrawal_1.default, 'person'), demand),
        // Cancelling an alliance in talks: 50 colder (`:2107`).
        rule(Accepted_1.default, 'cancel-alliance', by(CancelAlliance_1.default, 'person'), () => 50),
        // Refusing its call to war: 5 colder, 20 from an ally that asks; refusing its solidarity with an alliance, 10.
        rule(Declined_1.default, 'join-war', by(JoinWar_1.default, 'computer', (proposal) => {
            var _a;
            return [talks_1.AGENDA.warOnTarget, talks_1.AGENDA.alliance].includes((_a = (0, talks_1.agendaItemOf)(proposal)) !== null && _a !== void 0 ? _a : -1);
        }), (proposal, meeting) => (0, talks_1.agendaItemOf)(proposal) === talks_1.AGENDA.alliance
            ? 10
            : (0, standing_1.allied)(dependencies, meeting.sides.computer, meeting.sides.person)
                ? meeting.evaluation.requestMode !== 0
                    ? 20
                    : 0
                : 5),
    ];
};
exports.attitudeRules = attitudeRules;
/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance ended, a treaty forced by the person's Senate, a violator's war.
 */
const dialogueRules = (prefix, dependencies, engine, random) => {
    const heard = (...keys) => new Criterion_1.default((resolution, proposal) => resolution instanceof Acknowledge_1.default &&
        proposal instanceof Dialogue_1.default &&
        keys.includes(proposal.key()));
    return [
        // War (`diplo_meet_threaten_war`, a refused demand): no declaration, so no reputation; its attitude at least 75.
        new Resolved_1.default(`${prefix}:proposal/resolved/war`, heard(talks_1.DIALOGUE.war), new Effect_1.default(async (resolution, proposal) => {
            var _a;
            const computer = proposal.by(), person = resolution.by(), meeting = meetingFor(proposal);
            if (!(0, standing_1.atWar)(dependencies, computer, person)) {
                (0, effects_1.declareWarQuietly)(dependencies, computer, person);
            }
            if (meeting !== null) {
                meeting.declareWar = false;
            }
            const attitudes = (0, relations_1.attitude)(dependencies);
            if (((_a = attitudes.get(computer, person)) !== null && _a !== void 0 ? _a : 0) < 75) {
                attitudes.set(computer, person, 75, 'war');
            }
            (0, lastContact_1.recordContact)(dependencies, computer, person, dependencies.turn.value());
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/ally-dismissed`, heard(talks_1.DIALOGUE.allyDismissed, talks_1.DIALOGUE.allyTaunts, talks_1.DIALOGUE.helpRefused), new Effect_1.default(async (resolution, proposal) => {
            (0, effects_1.endAlliance)(dependencies, proposal.by(), resolution.by());
            (0, lastContact_1.recordContact)(dependencies, proposal.by(), resolution.by(), dependencies.turn.value());
            (0, callForHelp_1.answered)(dependencies, proposal.by(), resolution.by());
            engine.emit('civ2-diplomacy:alliance-cancelled', proposal.by(), resolution.by());
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/senate-forced-ceasefire`, heard(talks_1.DIALOGUE.senateForcedCeasefire), new Effect_1.default(async (resolution, proposal) => {
            // `diplo_set_treaty_flags(civ, civ2, 2)`: the ceasefire alone, and contact now.
            (0, declareWar_2.makeCeasefire)(dependencies, proposal.by(), resolution.by());
            (0, flags_1.clearBoth)(dependencies, proposal.by(), resolution.by(), flags_1.SIGNING_CLEARS);
            (0, lastContact_1.recordContact)(dependencies, proposal.by(), resolution.by(), dependencies.turn.value());
            engine.emit('civ2-diplomacy:senate-forced-treaty', resolution.by(), proposal.by(), 'ceasefire');
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/senate-forced-peace`, heard(talks_1.DIALOGUE.senateForcedPeace), new Effect_1.default(async (resolution, proposal) => {
            // `diplo_set_treaty_flags(civ, civ2, 4)`, and the next audience 16 turns further off.
            (0, flags_1.clearBoth)(dependencies, proposal.by(), resolution.by(), flags_1.SIGNING_CLEARS);
            (0, effects_1.makeTreatyPeace)(dependencies, proposal.by(), resolution.by());
            (0, lastContact_1.recordContact)(dependencies, proposal.by(), resolution.by(), dependencies.turn.value() + 16);
            engine.emit('civ2-diplomacy:senate-forced-treaty', resolution.by(), proposal.by(), 'peace');
        })),
        // A violator that won't withdraw (`diplo_review_violators`, `:6390-6405`): a Senate's scandal, 50 colder, and the
        //  person is made to declare war.
        new Resolved_1.default(`${prefix}:proposal/resolved/violators-refused`, heard(talks_1.DIALOGUE.violatorsRefused), new Effect_1.default(async (resolution, proposal) => {
            const computer = proposal.by(), person = resolution.by();
            (0, flags_1.clearFlag)(dependencies, computer, person, flags_1.WITHDRAWAL_DEMANDED);
            (0, senate_1.senateScandal)(dependencies, person, computer, random);
            (0, relations_1.attitude)(dependencies).adjust(computer, person, 50, 'violators');
            (0, relations_2.madeToDeclareWar)(dependencies, person, computer);
        })),
    ];
};
exports.dialogueRules = dialogueRules;
/**
 * The end of talks between a computer player and a person (`Terminated`, `diplomacy.cpp:4082-4120`): incidents are
 *  answered; a computer player that meant war keeps its hostile intent, one that didn't loses it; patience: 1 more
 *  unless the person left, up to the limit (and 1 more) after a concession or with a city held; on Chieftain the
 *  person is given an embassy if they aren't at war and it knows Writing.
 */
const terminatedRules = (prefix, dependencies, talks) => [
    new Terminated_1.default(`${prefix}:negotiation/terminated/talks`, new Criterion_1.default((negotiation) => (0, talks_1.meetingOf)(negotiation) !== null), new Effect_1.default((negotiation) => {
        const meeting = (0, talks_1.meetingOf)(negotiation), { computer, person } = meeting.sides, kept = (0, patience_1.patience)(dependencies, computer, person), received = negotiation
            .interactions()
            .some((action) => action instanceof Accept_1.default && action.proposal() instanceof Initiate_1.default), left = negotiation
            .interactions()
            .some((action) => (action instanceof Terminate_1.default && action.by() === person) ||
            (action instanceof Decline_1.default &&
                action.proposal() instanceof Initiate_1.default &&
                action.by() === computer));
        (0, relations_1.endTalks)(computer);
        (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.INCIDENT);
        if ((meeting.declareWar || (0, talks_1.reputationWar)(dependencies, meeting)) &&
            !(0, standing_1.allied)(dependencies, computer, person) &&
            !(0, standing_1.atWar)(dependencies, computer, person)) {
            (0, flags_1.setFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
        }
        else {
            (0, flags_1.clearFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
        }
        // An answer that ended the meeting skipped the menu's own charge in the original (`return` before the loop's
        //  `++`), which this package makes as the proposal is made: the closing charge is that one.
        const answerEnded = negotiation
            .interactions()
            .some((action) => action instanceof Resolution_1.default &&
            action.by() === computer &&
            action.proposal().by() === person &&
            ((0, talks_1.outcomeOf)(action).end === true || !!(0, talks_1.outcomeOf)(action).says)), 
        // A city held: hostile only while aggressive (`:3912-3922`).
        hostile = meeting.hostile && meeting.aggressive;
        if (received) {
            if (!left && !answerEnded) {
                kept.spend(1);
            }
            if (meeting.conceded || hostile) {
                const target = talks.limitOf(meeting) + (hostile ? 1 : 0);
                if (kept.spent() < target) {
                    kept.spend(target - kept.spent());
                }
            }
        }
        if ((0, standing_1.level)(dependencies) === standing_1.CHIEFTAIN &&
            !(0, standing_1.atWar)(dependencies, computer, person) &&
            (0, standing_1.knows)(dependencies, computer, Advances_1.Writing) &&
            !(0, embassy_1.hasEmbassy)(dependencies, person, computer)) {
            dependencies.interactionRegistry.register(new Embassy_1.default(person, computer, dependencies.ruleRegistry, dependencies.turn));
        }
    })),
];
exports.terminatedRules = terminatedRules;
//# sourceMappingURL=talks.js.map