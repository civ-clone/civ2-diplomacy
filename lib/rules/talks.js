"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminatedRules = exports.dialogueRules = exports.attitudeRules = exports.resolvedRules = exports.interactionRules = exports.proposalAvailableRules = exports.stepRules = exports.PERSON_STEPS = void 0;
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
const Resolved_1 = require("@civ-clone/core-diplomacy/Rules/Proposal/Resolved");
const SellAdvance_1 = require("@civ-clone/library-diplomacy/Proposals/SellAdvance");
const ShareMaps_1 = require("@civ-clone/library-diplomacy/Proposals/ShareMaps");
const Step_1 = require("@civ-clone/core-diplomacy/Rules/Negotiation/Step");
const Terminated_1 = require("@civ-clone/core-diplomacy/Rules/Negotiation/Terminated");
const Writing_1 = require("@civ-clone/base-science-advance-writing/Writing");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const effects_2 = require("../effects");
const knowledge_1 = require("@civ-clone/base-diplomacy/lib/knowledge");
const embassy_1 = require("@civ-clone/base-diplomacy/lib/embassy");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const wonders_1 = require("../wonders");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const evaluate_1 = require("../evaluate");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const shareMaps_1 = require("@civ-clone/base-diplomacy/lib/shareMaps");
/** As many of the person's choices as one meeting step offers: one `Step` rule each. */
exports.PERSON_STEPS = 48;
// The steps worked out once for each step of each negotiation: `Step` rules ask for them in their criteria and again
//  in their effects, and a client may ask for the steps as often as it likes.
const cached = (cache, negotiation, make) => {
    const length = negotiation.interactions().length, kept = cache.get(negotiation);
    if (kept !== undefined && kept.length === length) {
        return kept.value;
    }
    const value = make();
    cache.set(negotiation, { length, value });
    return value;
};
/** The talks' `Step` rules: the computer player's step, then each of the person's choices. */
const stepRules = (talks) => {
    const computerSteps = new WeakMap(), personSteps = new WeakMap(), computerStep = (negotiation) => cached(computerSteps, negotiation, () => talks.computerStep(negotiation)), personStep = (negotiation, index) => {
        var _a;
        return (_a = cached(personSteps, negotiation, () => talks.personSteps(negotiation))[index]) !== null && _a !== void 0 ? _a : null;
    };
    return [
        new Step_1.default(new Criterion_1.default((negotiation) => computerStep(negotiation) !== null), new Effect_1.default((negotiation) => computerStep(negotiation))),
        ...Array.from({ length: exports.PERSON_STEPS }, (_, index) => new Step_1.default(new Criterion_1.default((negotiation) => personStep(negotiation, index) !== null), new Effect_1.default((negotiation) => personStep(negotiation, index)))),
    ];
};
exports.stepRules = stepRules;
/**
 * Which of the person's proposals the menu offers (`diplo_proposal_menu`, `diplomacy.cpp:2732`): an alliance at peace;
 *  peace when not at peace; asking an ally for help and cancelling an alliance when allied; tribute when not allied and
 *  the person is below the Republic; withdrawal at peace, not signed this turn; the favours (exchange, war, maps) and
 *  gifts always.
 */
const proposalAvailableRules = (prefix, dependencies, republican) => {
    const sides = (proposal) => (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), rule = (name, ProposalType, available) => new ProposalAvailable_1.default(`${prefix}:proposal/available/${name}`, new Criterion_1.default((proposal) => {
        var _a;
        return proposal instanceof ProposalType &&
            ((_a = sides(proposal)) === null || _a === void 0 ? void 0 : _a.person) === proposal.by();
    }), new Effect_1.default((proposal) => available(sides(proposal), proposal))), peace = ({ computer, person }) => (0, standing_1.atPeace)(dependencies, computer, person), alliance = ({ computer, person }) => (0, standing_1.allied)(dependencies, computer, person);
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
        rule('join-war', JoinWar_1.default, ({ computer }, proposal) => !(0, standing_1.atWar)(dependencies, computer, proposal.against())),
        rule('share-maps', ShareMaps_1.default, () => true),
        rule('gift', Gift_1.default, () => true),
    ];
};
exports.proposalAvailableRules = proposalAvailableRules;
/**
 * The talks' `Interaction` rules: a negotiation makes contact; a computer player's audience clears a lingering
 *  ceasefire (`diplo_ai_meet_player`, `:4058`) and resets its patience; each of the person's proposals spends the
 *  computer player's patience.
 */
const interactionRules = (prefix, dependencies, talks) => {
    const { interactionRegistry, ruleRegistry, turn } = dependencies, limitOf = (negotiation) => {
        const sides = (0, talks_1.sidesOf)(dependencies, negotiation);
        return (0, evaluate_1.patienceLimit)(dependencies, sides.computer, sides.person, talks.evaluationOf(negotiation, sides).attitude);
    };
    return [
        new Interaction_1.default(`${prefix}:negotiation/interaction/contact`, new Criterion_1.default((interaction) => interaction instanceof Initiate_1.default), new Effect_1.default((interaction, negotiation) => {
            const [player, other] = negotiation.players();
            (0, makeContact_1.default)(interactionRegistry, player, other, ruleRegistry, turn);
        })),
        new Interaction_1.default(`${prefix}:negotiation/interaction/audience`, new Criterion_1.default((interaction, negotiation) => interaction instanceof Accept_1.default &&
            interaction.proposal() instanceof Initiate_1.default &&
            (0, talks_1.sidesOf)(dependencies, negotiation) !== null), new Effect_1.default((interaction, negotiation) => {
            const { computer, person, computerLed } = (0, talks_1.sidesOf)(dependencies, negotiation), computerPatience = (0, patience_1.patience)(dependencies, computer, person);
            (0, flags_1.setBoth)(dependencies, computer, person, flags_1.MET_THIS_TURN);
            if (!computerLed) {
                if ((0, flags_1.hasFlag)(dependencies, person, computer, flags_1.AGGRESSOR)) {
                    computerPatience.spend(limitOf(negotiation) - computerPatience.spent());
                }
                return;
            }
            computerPatience.reset();
            (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, computer, person).forEach((ceasefire) => ceasefire.expire(computer));
            (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.CEASEFIRE_LINGERS | flags_1.TRIBUTE);
            (0, lastContact_1.recordContact)(dependencies, computer, person, turn.value());
        })),
        new Interaction_1.default(`${prefix}:negotiation/interaction/spend-patience`, new Criterion_1.default((interaction, negotiation) => {
            const sides = (0, talks_1.sidesOf)(dependencies, negotiation);
            return (sides !== null &&
                interaction instanceof Proposal_1.default &&
                !(interaction instanceof Initiate_1.default) &&
                !(interaction instanceof Dialogue_1.default) &&
                interaction.by() === sides.person);
        }), new Effect_1.default((interaction, negotiation) => {
            const { computer, person } = (0, talks_1.sidesOf)(dependencies, negotiation), computerPatience = (0, patience_1.patience)(dependencies, computer, person);
            // Tribute and an ally's help use it all up (`diplo_answer_demand`).
            if (interaction instanceof DemandTribute_1.default ||
                interaction instanceof AskAlly_1.default) {
                computerPatience.spend(Math.max(1, limitOf(negotiation) - computerPatience.spent()));
                return;
            }
            // A gift gives back what it costs and more (`diplo_gift_menu`).
            if (interaction instanceof Gift_1.default) {
                const gifts = negotiation
                    .interactions()
                    .filter((action) => action instanceof Gift_1.default &&
                    action !== interaction &&
                    action.by() === person).length;
                computerPatience.spend(-(gifts + 1));
                return;
            }
            computerPatience.spend(1);
        })),
    ];
};
exports.interactionRules = interactionRules;
/**
 * What the talks' answers do (`Resolved`): treaties, payments and maps. The attitude each costs is in
 *  `attitudeRules`.
 */
const resolvedRules = (prefix, dependencies, engine, random) => {
    const accepted = (ProposalType, also = () => true) => new Criterion_1.default((resolution, proposal) => resolution instanceof Accept_1.default &&
        proposal instanceof ProposalType &&
        also(resolution, proposal)), effect = (run) => new Effect_1.default(async (resolution, proposal) => run(resolution, proposal));
    return [
        // Before peace is made (and the ceasefire it supersedes ends): a peace signed during a ceasefire still carries it.
        new Resolved_1.default(`${prefix}:proposal/resolved/note-ceasefire`, accepted(OfferPeace_1.default), effect((resolution, proposal) => {
            if ((0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, proposal.by(), resolution.by()).length > 0) {
                (0, flags_1.setBoth)(dependencies, proposal.by(), resolution.by(), flags_1.CEASEFIRE_LINGERS);
            }
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/peace-signed`, accepted(OfferPeace_1.default), effect((resolution, proposal) => (0, effects_1.signPeace)(dependencies, proposal.by(), resolution.by()))),
        new Resolved_1.default(`${prefix}:proposal/resolved/ceasefire`, accepted(OfferCeasefire_1.default), effect((resolution, proposal) => (0, effects_1.signCeasefire)(dependencies, proposal.by(), resolution.by()))),
        // A computer player's ceasefire or peace refused, overruled by its Great Wall or United Nations.
        new Resolved_1.default(`${prefix}:proposal/resolved/refusal-overruled`, new Criterion_1.default((resolution, proposal) => {
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
            return (resolution instanceof Decline_1.default &&
                (proposal instanceof OfferCeasefire_1.default ||
                    proposal instanceof OfferPeace_1.default) &&
                sides !== null &&
                proposal.by() === sides.computer &&
                ((0, wonders_1.ownsWonder)(dependencies, sides.computer, 'great-wall') ||
                    (0, wonders_1.ownsWonder)(dependencies, sides.computer, 'united-nations')));
        }), effect((resolution, proposal) => {
            if (proposal instanceof OfferCeasefire_1.default) {
                (0, effects_1.signCeasefire)(dependencies, proposal.by(), resolution.by());
            }
            else {
                (0, effects_1.signPeace)(dependencies, proposal.by(), resolution.by());
            }
            engine.emit('civ2-diplomacy:refusal-overruled', proposal.by(), resolution.by(), proposal);
        })),
        // A concession accepted: what was given, and the treaty it was given for.
        new Resolved_1.default(`${prefix}:proposal/resolved/concession`, accepted(Gift_1.default, (resolution, proposal) => (0, talks_1.askedFor)(proposal) !== null), effect((resolution, proposal) => {
            const offer = (0, talks_1.askedFor)(proposal);
            (0, knowledge_1.give)(dependencies, proposal.gift(), proposal.by(), resolution.by());
            if (offer instanceof OfferCeasefire_1.default) {
                (0, effects_1.signCeasefire)(dependencies, proposal.by(), resolution.by());
            }
            else {
                (0, effects_1.signPeace)(dependencies, proposal.by(), resolution.by());
            }
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/alliance`, accepted(ProposeAlliance_1.default), effect((resolution, proposal) => {
            var _a, _b;
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
            (0, effects_1.formAlliance)(dependencies, (_a = sides === null || sides === void 0 ? void 0 : sides.computer) !== null && _a !== void 0 ? _a : resolution.by(), (_b = sides === null || sides === void 0 ? void 0 : sides.person) !== null && _b !== void 0 ? _b : proposal.by());
        })),
        // The person cancels an alliance (`diplo_ai_answer_proposal`, case 6): its reputation suffers, whatever the level.
        new Resolved_1.default(`${prefix}:proposal/resolved/cancel-alliance`, accepted(CancelAlliance_1.default), effect((resolution, proposal) => {
            (0, relations_1.reputation)(dependencies).adjust(proposal.by(), 1, 'cancel-alliance');
            (0, effects_1.endAlliance)(dependencies, proposal.by(), resolution.by());
            engine.emit('civ2-diplomacy:alliance-cancelled', proposal.by(), resolution.by());
        })),
        // Whoever accepts a call to war declares it, at the caller's request; a computer player's call accepted alongside
        //  an alliance (its solidarity) seals the alliance.
        new Resolved_1.default(`${prefix}:proposal/resolved/join-war`, accepted(JoinWar_1.default), effect((resolution, proposal) => {
            const declarer = resolution.by(), caller = proposal.by(), target = proposal.against();
            if (!(0, standing_1.atWar)(dependencies, declarer, target)) {
                (0, effects_1.declareWarFor)(dependencies, declarer, target, caller);
            }
            (0, flags_1.setFlag)(dependencies, declarer, caller, flags_1.MERCENARY);
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
            if (sides !== null &&
                caller === sides.computer &&
                (0, talks_1.agendaItemOf)(proposal) === talks_1.AGENDA.alliance) {
                (0, effects_1.formAlliance)(dependencies, sides.computer, sides.person);
            }
            // A computer player paid to fight: one time in two the target finds out (`diplo_favor_mercenary_war`).
            if (sides !== null && declarer === sides.computer && random() < 0.5) {
                const person = sides.person;
                if ((0, standing_1.allied)(dependencies, target, person)) {
                    (0, relations_1.attitude)(dependencies).adjust(target, person, 25, 'mercenary');
                    (0, effects_1.endAlliance)(dependencies, target, person);
                }
                else if ((0, standing_1.atPeace)(dependencies, target, person)) {
                    (0, relations_1.attitude)(dependencies).adjust(target, person, 25, 'mercenary');
                    (0, effects_1.declareWarQuietly)(dependencies, target, person);
                }
            }
        })),
        // The person paid tribute, or the computer player did: base-diplomacy's tribute rule gives it.
        new Resolved_1.default(`${prefix}:proposal/resolved/ally-helps`, accepted(AskAlly_1.default), effect((resolution, proposal) => {
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), gift = (0, talks_1.allyGiftFor)(proposal);
            if (sides !== null && gift !== undefined && gift !== null) {
                (0, knowledge_1.give)(dependencies, gift, sides.computer, sides.person);
            }
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/withdrawal`, accepted(DemandWithdrawal_1.default), effect((resolution, proposal) => {
            const moved = (0, effects_2.expelUnits)(dependencies, resolution.by(), proposal.by());
            engine.emit('civ2-diplomacy:units-withdrawn', resolution.by(), proposal.by(), moved);
        })),
        // Maps shared (`diplo_favor_share_maps`): two more of its patience.
        new Resolved_1.default(`${prefix}:proposal/resolved/share-maps`, accepted(ShareMaps_1.default), effect((resolution, proposal) => {
            if (dependencies.playerWorldRegistry !== undefined) {
                (0, shareMaps_1.shareMaps)({ playerWorldRegistry: dependencies.playerWorldRegistry }, proposal.by(), resolution.by());
            }
            (0, patience_1.patience)(dependencies, resolution.by(), proposal.by()).spend(2);
            engine.emit('civ2-diplomacy:maps-shared', proposal.by(), resolution.by());
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/gift`, accepted(Gift_1.default, (resolution, proposal) => (0, talks_1.askedFor)(proposal) === null), effect((resolution, proposal) => {
            const given = proposal.gift();
            if (given instanceof Gold_1.default || given instanceof Advance_1.default) {
                (0, knowledge_1.give)(dependencies, given, proposal.by(), resolution.by());
                return;
            }
            const unit = given, [home] = dependencies.cityRegistry
                .getByPlayer(resolution.by())
                .sort((a, b) => a.tile().distanceFrom(unit.tile()) -
                b.tile().distanceFrom(unit.tile()));
            unit.transfer(resolution.by(), null);
            if (home !== undefined) {
                unit.setTile(home.tile());
                unit.setStatus(null);
                unit.applyVisibility();
            }
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/sell-advance`, accepted(SellAdvance_1.default), effect((resolution, proposal) => {
            (0, knowledge_1.give)(dependencies, proposal.price(), resolution.by(), proposal.by());
            (0, knowledge_1.give)(dependencies, proposal.advance(), proposal.by(), resolution.by());
        })),
    ];
};
exports.resolvedRules = resolvedRules;
/**
 * What the talks' answers cost in attitude (`Accepted` and `Declined`, filtered by the proposal's class: they're heard
 *  for the request for an audience too). Each change is the computer player's attitude toward the person.
 */
const attitudeRules = (prefix, dependencies, talks) => {
    const adjust = (proposal, delta, reason) => {
        const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
        if (sides !== null && delta !== 0) {
            (0, relations_1.attitude)(dependencies).adjust(sides.computer, sides.person, delta, reason);
        }
    }, by = (ProposalType, side, also = () => true) => new Criterion_1.default((proposal) => {
        const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
        return (proposal instanceof ProposalType &&
            sides !== null &&
            proposal.by() === sides[side] &&
            also(proposal, sides));
    }), valueOf = (sides, advance) => (0, effects_1.advanceValue)(dependencies, sides.computer, advance), demandKind = (proposal) => proposal instanceof AskAlly_1.default
        ? 3
        : proposal instanceof DemandTribute_1.default
            ? 4
            : 5, demand = (proposal) => {
        const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation());
        adjust(proposal, (0, formulas_1.demandAttitude)(demandKind(proposal), (0, standing_1.rank)(dependencies, sides.computer), (0, standing_1.rank)(dependencies, sides.person), dependencies.playerResearchRegistry
            .getByPlayer(sides.computer)
            .complete().length, dependencies.playerResearchRegistry
            .getByPlayer(sides.person)
            .complete().length), 'demand');
    };
    return [
        // Paying the computer player: gold at its worth, an advance at 1½ times its value (or twice, as a secret).
        new Accepted_1.default(`${prefix}:proposal/accepted/tribute-paid`, by(DemandTribute_1.default, 'computer'), new Effect_1.default((proposal) => {
            const typed = proposal;
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), tribute = typed.tribute();
            adjust(proposal, tribute instanceof Gold_1.default
                ? -(0, formulas_1.goldAttitudeValue)(tribute.value())
                : (0, talks_1.askedFor)(proposal) !== null
                    ? -2 * valueOf(sides, tribute)
                    : -Math.trunc((valueOf(sides, tribute) * 3) / 2), 'tribute');
        })),
        new Accepted_1.default(`${prefix}:proposal/accepted/exchange-knowledge`, by(ExchangeKnowledge_1.default, 'computer'), new Effect_1.default((proposal) => {
            const typed = proposal;
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), [best] = typed.advances();
            if (best !== undefined) {
                adjust(proposal, -2 * valueOf(sides, best), 'exchange-knowledge');
            }
        })),
        new Accepted_1.default(`${prefix}:proposal/accepted/exchange-knowledge-asked`, by(ExchangeKnowledge_1.default, 'person'), new Effect_1.default((proposal) => {
            const typed = proposal;
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), [best] = typed.advances();
            if (best !== undefined) {
                adjust(proposal, -2 * valueOf(sides, best), 'exchange-knowledge');
            }
        })),
        // The person's gifts (`diplo_gift_menu`): gold 1½ times its worth, an advance 4 times its value, a unit 3 times its
        //  cost.
        new Accepted_1.default(`${prefix}:proposal/accepted/gift`, by(Gift_1.default, 'person'), new Effect_1.default((proposal) => {
            const typed = proposal;
            const sides = (0, talks_1.sidesOf)(dependencies, proposal.negotiation()), given = typed.gift();
            if (given instanceof Gold_1.default) {
                adjust(proposal, -Math.trunc(((0, formulas_1.goldAttitudeValue)(given.value()) * 3) / 2), 'gift');
                return;
            }
            if (given instanceof Advance_1.default) {
                adjust(proposal, -4 * valueOf(sides, given), 'gift');
                return;
            }
            // The original counts the unit's cost; its strength stands in for it here.
            const unit = given;
            adjust(proposal, -3 * Math.max(1, unit.attack().value() + unit.defence().value()), 'gift');
        })),
        // Any of the person's demands, answered either way.
        new Accepted_1.default(`${prefix}:proposal/accepted/demand`, by(DemandTribute_1.default, 'person'), new Effect_1.default(demand)),
        new Declined_1.default(`${prefix}:proposal/declined/demand`, by(DemandTribute_1.default, 'person'), new Effect_1.default(demand)),
        new Accepted_1.default(`${prefix}:proposal/accepted/ask-ally`, by(AskAlly_1.default, 'person'), new Effect_1.default(demand)),
        new Declined_1.default(`${prefix}:proposal/declined/ask-ally`, by(AskAlly_1.default, 'person'), new Effect_1.default(demand)),
        new Accepted_1.default(`${prefix}:proposal/accepted/withdrawal`, by(DemandWithdrawal_1.default, 'person'), new Effect_1.default(demand)),
        new Declined_1.default(`${prefix}:proposal/declined/withdrawal`, by(DemandWithdrawal_1.default, 'person'), new Effect_1.default(demand)),
        // Cancelling an alliance in talks: 50 colder.
        new Accepted_1.default(`${prefix}:proposal/accepted/cancel-alliance`, by(CancelAlliance_1.default, 'person'), new Effect_1.default((proposal) => adjust(proposal, 50, 'cancel-alliance'))),
        // Refusing its call to war: 5 colder, 20 from an ally that asks; refusing its solidarity with an alliance, 10, and
        //  the alliance is made anyway if it fears the person, trusts it and likes it enough (`:3290-3305`).
        new Declined_1.default(`${prefix}:proposal/declined/join-war`, by(JoinWar_1.default, 'computer'), new Effect_1.default((proposal) => {
            const typed = proposal;
            const sides = (0, talks_1.sidesOf)(dependencies, typed.negotiation());
            if ((0, talks_1.agendaItemOf)(proposal) === talks_1.AGENDA.alliance) {
                adjust(proposal, 10, 'solidarity');
                const evaluation = talks.evaluationOf(proposal.negotiation(), sides);
                if (evaluation.fear !== 0 &&
                    evaluation.reputation <= 2 &&
                    evaluation.attitude <= 25) {
                    (0, effects_1.formAlliance)(dependencies, sides.computer, sides.person);
                }
                return;
            }
            adjust(proposal, (0, standing_1.allied)(dependencies, sides.computer, sides.person) ? 20 : 5, 'join-war');
        })),
    ];
};
exports.attitudeRules = attitudeRules;
/**
 * What the computer player's dialogues do once the person has heard them (`Resolved` on `Acknowledge`): war, an
 *  alliance dismissed, or a treaty forced by the person's Senate.
 */
const dialogueRules = (prefix, dependencies, engine) => {
    const heard = (key) => new Criterion_1.default((resolution, proposal) => resolution instanceof Acknowledge_1.default &&
        proposal instanceof Dialogue_1.default &&
        proposal.key() === key);
    return [
        new Resolved_1.default(`${prefix}:proposal/resolved/war`, heard(talks_1.DIALOGUE.war), new Effect_1.default(async (resolution, proposal) => {
            var _a;
            const computer = proposal.by(), person = resolution.by();
            if (!(0, standing_1.atWar)(dependencies, computer, person)) {
                (0, effects_1.declareWarQuietly)(dependencies, computer, person);
            }
            (0, flags_1.setFlag)(dependencies, computer, person, flags_1.AGGRESSOR);
            const attitudes = (0, relations_1.attitude)(dependencies);
            if (((_a = attitudes.get(computer, person)) !== null && _a !== void 0 ? _a : 0) < 75) {
                attitudes.set(computer, person, 75, 'war');
            }
            (0, lastContact_1.recordContact)(dependencies, computer, person, dependencies.turn.value());
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/ally-dismissed`, new Criterion_1.default((resolution, proposal) => resolution instanceof Acknowledge_1.default &&
            proposal instanceof Dialogue_1.default &&
            [talks_1.DIALOGUE.allyDismissed, talks_1.DIALOGUE.allyTaunts].includes(proposal.key())), new Effect_1.default(async (resolution, proposal) => {
            (0, effects_1.endAlliance)(dependencies, proposal.by(), resolution.by());
            (0, lastContact_1.recordContact)(dependencies, proposal.by(), resolution.by(), dependencies.turn.value());
            engine.emit('civ2-diplomacy:alliance-cancelled', proposal.by(), resolution.by());
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/senate-forced-ceasefire`, heard(talks_1.DIALOGUE.senateForcedCeasefire), new Effect_1.default(async (resolution, proposal) => {
            (0, effects_1.signCeasefire)(dependencies, proposal.by(), resolution.by());
            engine.emit('civ2-diplomacy:senate-forced-treaty', resolution.by(), proposal.by(), 'ceasefire');
        })),
        new Resolved_1.default(`${prefix}:proposal/resolved/senate-forced-peace`, heard(talks_1.DIALOGUE.senateForcedPeace), new Effect_1.default(async (resolution, proposal) => {
            (0, effects_1.signPeace)(dependencies, proposal.by(), resolution.by());
            // A peace the Senate forced is good for 16 turns more before the next audience.
            (0, lastContact_1.recordContact)(dependencies, proposal.by(), resolution.by(), dependencies.turn.value() + 16);
            engine.emit('civ2-diplomacy:senate-forced-treaty', resolution.by(), proposal.by(), 'peace');
        })),
    ];
};
exports.dialogueRules = dialogueRules;
/**
 * At the end of a computer player's talks with a person (`Terminated`): a computer player that meant war keeps its
 *  hostile intent, and on Chieftain the person is given an embassy if they aren't at war and it knows Writing
 *  (`:4110-4119`).
 */
const terminatedRules = (prefix, dependencies, talks) => [
    new Terminated_1.default(`${prefix}:negotiation/terminated/talks`, new Criterion_1.default((negotiation) => (0, talks_1.sidesOf)(dependencies, negotiation) !== null &&
        negotiation
            .interactions()
            .some((action) => action instanceof Accept_1.default && action.proposal() instanceof Initiate_1.default)), new Effect_1.default((negotiation) => {
        const sides = (0, talks_1.sidesOf)(dependencies, negotiation), { computer, person } = sides, evaluation = talks.evaluationOf(negotiation, sides);
        if (evaluation.declareWar &&
            !(0, standing_1.allied)(dependencies, computer, person) &&
            !(0, standing_1.atWar)(dependencies, computer, person)) {
            (0, flags_1.setFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
        }
        if ((0, standing_1.level)(dependencies) === standing_1.CHIEFTAIN &&
            !(0, standing_1.atWar)(dependencies, computer, person) &&
            (0, standing_1.knows)(dependencies, computer, Writing_1.default) &&
            !(0, embassy_1.hasEmbassy)(dependencies, person, computer)) {
            dependencies.interactionRegistry.register(new Embassy_1.default(person, computer, dependencies.ruleRegistry, dependencies.turn));
        }
    })),
];
exports.terminatedRules = terminatedRules;
//# sourceMappingURL=talks.js.map