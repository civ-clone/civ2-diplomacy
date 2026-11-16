"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.talks = exports.allyGiftFor = exports.AGENDA = exports.askedFor = exports.agendaItemOf = exports.evaluationOf = exports.sidesOf = exports.DIALOGUE = void 0;
const flags_1 = require("./flags");
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const standing_1 = require("./standing");
const Proposal_1 = require("@civ-clone/core-diplomacy/Negotiation/Proposal");
const formulas_1 = require("./formulas");
const evaluate_1 = require("./evaluate");
const effects_1 = require("./effects");
const relations_1 = require("./relations");
const wonders_1 = require("./wonders");
const Accept_1 = require("@civ-clone/core-diplomacy/Proposal/Accept");
const Acknowledge_1 = require("@civ-clone/core-diplomacy/Proposal/Acknowledge");
const Advance_1 = require("@civ-clone/core-science/Advance");
const AskAlly_1 = require("@civ-clone/library-diplomacy/Proposals/AskAlly");
const CancelAlliance_1 = require("@civ-clone/library-diplomacy/Proposals/CancelAlliance");
const Decline_1 = require("@civ-clone/core-diplomacy/Proposal/Decline");
const DemandTribute_1 = require("@civ-clone/library-diplomacy/Proposals/DemandTribute");
const DemandWithdrawal_1 = require("@civ-clone/library-diplomacy/Proposals/DemandWithdrawal");
const Dialogue_1 = require("@civ-clone/core-diplomacy/Negotiation/Dialogue");
const ExchangeKnowledge_1 = require("@civ-clone/library-diplomacy/Proposals/ExchangeKnowledge");
const Gift_1 = require("@civ-clone/library-diplomacy/Proposals/Gift");
const Gold_1 = require("@civ-clone/base-city-yield-gold/Gold");
const Initiate_1 = require("@civ-clone/core-diplomacy/Negotiation/Initiate");
const JoinWar_1 = require("@civ-clone/library-diplomacy/Proposals/JoinWar");
const MapMaking_1 = require("@civ-clone/base-science-advance-mapmaking/MapMaking");
const OfferCeasefire_1 = require("@civ-clone/library-diplomacy/Proposals/OfferCeasefire");
const OfferPeace_1 = require("@civ-clone/library-diplomacy/Proposals/OfferPeace");
const ProposeAlliance_1 = require("@civ-clone/library-diplomacy/Proposals/ProposeAlliance");
const Resolution_1 = require("@civ-clone/core-diplomacy/Proposal/Resolution");
const SellAdvance_1 = require("@civ-clone/library-diplomacy/Proposals/SellAdvance");
const ShareMaps_1 = require("@civ-clone/library-diplomacy/Proposals/ShareMaps");
const Terminate_1 = require("@civ-clone/core-diplomacy/Negotiation/Terminate");
const standing_2 = require("@civ-clone/base-diplomacy/lib/standing");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const personMeeting_1 = require("@civ-clone/base-diplomacy/lib/personMeeting");
const senate_1 = require("./senate");
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
exports.DIALOGUE = {
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
/** The two sides of a meeting between a computer player and a person, or `null` for any other meeting. */
const sidesOf = (dependencies, negotiation) => {
    const [first, second] = negotiation.players(), firstHuman = (0, standing_1.human)(dependencies, first), secondHuman = (0, standing_1.human)(dependencies, second);
    if (firstHuman === secondHuman) {
        return null;
    }
    return firstHuman
        ? { computer: second, person: first, computerLed: false }
        : { computer: first, person: second, computerLed: true };
};
exports.sidesOf = sidesOf;
const evaluations = new WeakMap();
/** The computer player's evaluation, made the first time the meeting asks for it. */
const evaluationOf = (dependencies, negotiation, { computer, person }) => {
    if (!evaluations.has(negotiation)) {
        evaluations.set(negotiation, (0, evaluate_1.evaluate)(dependencies, computer, person));
    }
    return evaluations.get(negotiation);
};
exports.evaluationOf = evaluationOf;
// Each computer step's place in the agenda, and each ask's place in its plan.
const agendaItems = new WeakMap();
const asks = new WeakMap();
/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
const agendaItemOf = (action) => agendaItems.get(action);
exports.agendaItemOf = agendaItemOf;
/** The person's proposal a computer player's ask belongs to, or `null`. */
const askedFor = (action) => { var _a, _b; return (_b = (_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) !== null && _b !== void 0 ? _b : null; };
exports.askedFor = askedFor;
/** The agenda, in the original's order. */
exports.AGENDA = {
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
const draws = new WeakMap();
const drawn = (owner, key, random) => {
    if (!draws.has(owner)) {
        draws.set(owner, new Map());
    }
    const kept = draws.get(owner);
    if (!kept.has(key)) {
        kept.set(key, random());
    }
    return kept.get(key);
};
const plans = new WeakMap();
// What an ally gives when asked (`AskAlly`), worked out when it answers.
const allyGifts = new WeakMap();
/** What the computer player gives for the person's `AskAlly`, if it agreed. */
const allyGiftFor = (proposal) => { var _a; return (_a = allyGifts.get(proposal)) !== null && _a !== void 0 ? _a : null; };
exports.allyGiftFor = allyGiftFor;
const talks = ({ dependencies, random }) => {
    const { ruleRegistry } = dependencies, feelings = (0, evaluate_1.attitudeOf)(dependencies), last = (negotiation) => negotiation.lastInteraction(), actions = (negotiation) => negotiation.interactions(), said = (negotiation, by, Type) => actions(negotiation).filter((action) => action instanceof Type && action.by() === by), resolutionOf = (negotiation, proposal) => {
        var _a;
        return (_a = actions(negotiation).find((action) => action instanceof Resolution_1.default && action.proposal() === proposal)) !== null && _a !== void 0 ? _a : null;
    }, say = (negotiation, by, key) => new Dialogue_1.default(by, key, negotiation, ruleRegistry), tag = (action, item) => {
        agendaItems.set(action, item);
        return action;
    }, patienceOf = (computer, person) => (0, patience_1.patience)(dependencies, computer, person), limitOf = (negotiation, sides) => (0, evaluate_1.patienceLimit)(dependencies, sides.computer, sides.person, (0, exports.evaluationOf)(dependencies, negotiation, sides).attitude), paid = (negotiation, { computer, person }) => actions(negotiation).some((action) => action instanceof Accept_1.default &&
        action.by() === person &&
        action.proposal().by() === computer &&
        (action.proposal() instanceof DemandTribute_1.default ||
            action.proposal() instanceof JoinWar_1.default)), 
    // The person's third parties the computer player might name: the other players it has met.
    thirdParties = (computer, person) => dependencies.playerRegistry
        .entries()
        .filter((third) => third !== computer &&
        third !== person &&
        (0, standing_1.inContact)(dependencies, computer, third) &&
        (0, standing_1.inContact)(dependencies, person, third)), lastContactTurns = (computer, person) => {
        const turn = (0, lastContact_1.lastContact)(dependencies, computer, person);
        return turn === undefined ? Infinity : dependencies.turn.value() - turn;
    };
    // The computer player's agenda, from item `from` on: the next thing it says, or `null` when it has finished.
    const agendaFrom = (negotiation, sides, from) => {
        const { computer, person } = sides, evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides), alliance = (0, standing_1.allied)(dependencies, computer, person), war = (0, standing_1.atWar)(dependencies, computer, person), havePaid = paid(negotiation, sides), warTargetRefusedByAlly = actions(negotiation).some((action) => action instanceof Decline_1.default &&
            action.proposal() instanceof JoinWar_1.default &&
            agendaItems.get(action.proposal()) === exports.AGENDA.warOnTarget &&
            alliance), propose = (alliance && evaluation.reputation > 4 && !havePaid) ||
            warTargetRefusedByAlly, demandedGold = said(negotiation, computer, DemandTribute_1.default).some((action) => action.tribute() instanceof Gold_1.default), aggressive = evaluation.aggressive && !havePaid && !evaluation.declareWar, items = [
            // A swap of advances (`diplo_tech_exchange`, mode 1), when each has something and it isn't cold.
            () => {
                const theirs = (0, effects_1.advancesWanted)(dependencies, person, computer), ours = (0, effects_1.advancesWanted)(dependencies, computer, person);
                if (theirs.length === 0 ||
                    ours.length === 0 ||
                    (!alliance &&
                        ((0, standing_1.vendetta)(dependencies, computer, person) ||
                            (0, flags_1.hasFlag)(dependencies, person, computer, flags_1.SNEAK_ATTACK) ||
                            evaluation.capturedCities > 0 ||
                            (0, relations_1.attitudeLevel)(evaluation.attitude) > 5 ||
                            evaluation.aggressive))) {
                    return null;
                }
                return new ExchangeKnowledge_1.default(ours, computer, negotiation, ruleRegistry);
            },
            // Its war target (`diplo_meet_ask_war_on_target`).
            () => evaluation.warTarget !== null &&
                (evaluation.requestMode !== 0 || alliance) &&
                !(0, standing_1.atWar)(dependencies, person, evaluation.warTarget)
                ? new JoinWar_1.default(evaluation.warTarget, computer, negotiation, ruleRegistry)
                : null,
            // Tribute in gold (`diplo_meet_demand_tribute`).
            () => {
                let tribute = evaluation.tribute;
                if (alliance) {
                    tribute = Math.min(tribute, Math.max(100, Math.trunc((0, standing_2.gold)(dependencies, person) / 2)));
                }
                return tribute > 0 &&
                    (evaluation.requestMode === 2 || propose) &&
                    tribute <= (0, standing_2.gold)(dependencies, person)
                    ? new DemandTribute_1.default(new Gold_1.default(tribute), computer, negotiation, ruleRegistry)
                    : null;
            },
            // An advance (`diplo_meet_demand_tech`).
            () => {
                const wanted = (0, effects_1.advancesWanted)(dependencies, person, computer);
                return (evaluation.requestMode !== 0 ||
                    propose ||
                    (alliance && (0, relations_1.attitudeLevel)(evaluation.attitude) > 3)) &&
                    wanted.length > 0 &&
                    !demandedGold
                    ? new DemandTribute_1.default(wanted[0], computer, negotiation, ruleRegistry)
                    : null;
            },
            // An ally that didn't pay is dismissed (`diplo_meet_ally_dismissed`).
            () => alliance &&
                (evaluation.aggressive || evaluation.attitude > 49) &&
                !havePaid
                ? say(negotiation, computer, exports.DIALOGUE.allyDismissed)
                : null,
            // War (`diplo_meet_threaten_war`).
            () => {
                const met = (0, lastContact_1.lastContact)(dependencies, computer, person) !== undefined;
                return aggressive &&
                    ((evaluation.tribute > 50 &&
                        ((0, standing_1.atPeace)(dependencies, computer, person) ||
                            (!(0, standing_1.hostile)(dependencies, computer, person, feelings) && met))) ||
                        demandedGold ||
                        !met ||
                        !sides.computerLed)
                    ? say(negotiation, computer, exports.DIALOGUE.war)
                    : null;
            },
            // An alliance (`diplo_meet_propose_alliance`).
            () => {
                if (!(0, standing_1.atPeace)(dependencies, computer, person) ||
                    alliance ||
                    evaluation.targetIsLeader) {
                    return null;
                }
                const computerRank = (0, standing_1.rank)(dependencies, computer), personRank = (0, standing_1.rank)(dependencies, person), ranked = personRank < 6 && computerRank < 6, target = evaluation.warTarget, commonEnemy = target !== null && hasTreatyWith(dependencies, person, target), personAllies = dependencies.playerRegistry
                    .entries()
                    .filter((third) => (0, standing_1.allied)(dependencies, person, third)).length;
                if ((evaluation.fear !== 0 || ranked || commonEnemy) &&
                    (evaluation.peaceInclination > 1 || ranked) &&
                    personAllies === 0 &&
                    (evaluation.attitude < 25 ||
                        (evaluation.attitude < 50 && commonEnemy)) &&
                    (commonEnemy || ranked) &&
                    evaluation.reputation < 4 &&
                    evaluation.capturedCities < 2 &&
                    (personRank < 6 || computerRank < 5)) {
                    return target !== null
                        ? new JoinWar_1.default(target, computer, negotiation, ruleRegistry)
                        : new ProposeAlliance_1.default(computer, negotiation, ruleRegistry);
                }
                return null;
            },
            // A ceasefire, at war (`diplo_meet_offer_ceasefire`).
            () => war ? new OfferCeasefire_1.default(computer, negotiation, ruleRegistry) : null,
            // Peace (`diplo_meet_offer_peace`).
            () => {
                if ((0, standing_1.atPeace)(dependencies, computer, person) || war) {
                    return null;
                }
                const computerStrength = (0, standing_1.strength)(dependencies, computer), personStrength = (0, standing_1.strength)(dependencies, person);
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
                const ceasefire = (0, standing_1.treaty)(dependencies, computer, person) === treatyLevel_1.TreatyLevel.Ceasefire;
                return evaluation.suppressedAggression ||
                    ((havePaid ||
                        (0, lastContact_1.lastContact)(dependencies, computer, person) === undefined) &&
                        !ceasefire) ||
                    ((evaluation.fear !== 0 ||
                        (0, relations_1.attitudeLevel)(evaluation.attitude) <= threshold) &&
                        !evaluation.targetIsLeader &&
                        evaluation.reputation + evaluation.capturedCities <
                            evaluation.fear + 4)
                    ? new OfferPeace_1.default(computer, negotiation, ruleRegistry)
                    : null;
            },
        ];
        for (let index = from; index < items.length; index++) {
            const action = items[index]();
            if (action !== null) {
                return tag(action, index);
            }
            // Still aggressive after the threats: it says no more (`if (ai_aggressive) return`).
            if (index === exports.AGENDA.threat && aggressive) {
                return null;
            }
        }
        return null;
    };
    // Where the computer player is in its agenda: one past the last item it said.
    const agendaCursor = (negotiation, computer) => actions(negotiation).reduce((cursor, action) => action.by() === computer && agendaItems.has(action)
        ? Math.max(cursor, agendaItems.get(action) + 1)
        : cursor, 0);
    // What the person may propose, in the menu's order (`diplo_proposal_menu`), each allowed by `ProposalAvailable`.
    const menu = (negotiation, sides) => {
        const { computer, person } = sides, wantedByComputer = (0, effects_1.advancesWanted)(dependencies, person, computer), treasury = (0, standing_2.gold)(dependencies, person), strongest = dependencies.unitRegistry
            .getByPlayer(person)
            .filter((unit) => unit.attack().value() > 0)
            .sort((a, b) => b.attack().value() - a.attack().value())[0], proposals = [
            new ProposeAlliance_1.default(person, negotiation, ruleRegistry),
            new OfferPeace_1.default(person, negotiation, ruleRegistry),
            new AskAlly_1.default(person, negotiation, ruleRegistry),
            new DemandTribute_1.default(new Gold_1.default(personDemandTribute(negotiation, sides, 4)), person, negotiation, ruleRegistry),
            new DemandWithdrawal_1.default(person, negotiation, ruleRegistry),
            new CancelAlliance_1.default(person, negotiation, ruleRegistry),
            wantedByComputer.length > 0
                ? new ExchangeKnowledge_1.default(wantedByComputer, person, negotiation, ruleRegistry)
                : null,
            ...thirdParties(computer, person).map((third) => new JoinWar_1.default(third, person, negotiation, ruleRegistry)),
            new ShareMaps_1.default(person, negotiation, ruleRegistry),
            ...wantedByComputer
                .slice(0, 2)
                .map((advance) => new Gift_1.default(advance, person, negotiation, ruleRegistry)),
            ...[1, 2, 3, 4]
                .map((quarters) => Math.trunc((treasury * quarters) / 4 / 50) * 50)
                .filter((amount, index, amounts) => amount > 0 && amounts.indexOf(amount) === index)
                .map((amount) => new Gift_1.default(new Gold_1.default(amount), person, negotiation, ruleRegistry)),
            strongest !== undefined
                ? new Gift_1.default(strongest, person, negotiation, ruleRegistry)
                : null,
        ];
        return proposals.filter((proposal) => proposal !== null && (0, personMeeting_1.proposalAvailable)(dependencies, proposal));
    };
    // The tribute the computer player pays the person: `demandedTribute` with the game's numbers.
    const personDemandTribute = (negotiation, sides, proposal) => {
        const { computer, person } = sides, evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides);
        return (0, formulas_1.demandedTribute)({
            proposal,
            fear: evaluation.fear,
            computerGold: (0, standing_2.gold)(dependencies, computer),
            computerRank: (0, standing_1.rank)(dependencies, computer),
            personRank: (0, standing_1.rank)(dependencies, person),
            turnsSinceContact: evaluation.turnsSinceContact,
            atPeace: (0, standing_1.atPeace)(dependencies, person, computer),
            computerPacifies: (0, wonders_1.pacifies)(dependencies, computer),
        });
    };
    // How the computer player answers the person's `proposal` (`diplo_ai_answer_proposal`, the favour and gift menus).
    const planFor = (negotiation, sides, proposal) => {
        if (plans.has(proposal)) {
            return plans.get(proposal);
        }
        const { computer, person } = sides, evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides), spent = patienceOf(computer, person).spent(), difficulty = (0, standing_1.level)(dependencies), computerRank = (0, standing_1.rank)(dependencies, computer), personRank = (0, standing_1.rank)(dependencies, person), computerStrength = (0, standing_1.strength)(dependencies, computer), personStrength = (0, standing_1.strength)(dependencies, person), alliance = (0, standing_1.allied)(dependencies, computer, person), rawReputation = (0, relations_1.reputation)(dependencies).get(person), target = evaluation.warTarget, targetFightingAndStrong = target !== null &&
            !(0, standing_1.hostile)(dependencies, person, target, feelings) &&
            (0, standing_1.inContact)(dependencies, person, target) &&
            (0, standing_1.atWar)(dependencies, computer, target) &&
            ((0, standing_1.atPeace)(dependencies, person, target)
                ? Math.trunc((computerStrength * 3) / 2)
                : computerStrength * 2) <= (0, standing_1.strength)(dependencies, target), targetIsPersonsAlly = target !== null && (0, standing_1.allied)(dependencies, person, target), wanted = (0, effects_1.advancesWanted)(dependencies, person, computer), plain = (accept, thenSays = null) => ({
            asks: [],
            offIfRefused: () => true,
            accept,
            thenSays,
        }), sweetened = (alliance, reasons) => {
            const sweeten = (0, formulas_1.asksSweetener)(spent, evaluation.attitude, evaluation.reputation, evaluation.declareWar, alliance), askTech = sweeten &&
                ((alliance ? (reasons & 3) === 0 : (reasons & 6) === 0) ||
                    evaluation.declareWar) &&
                wanted.length > 0, gift = (0, formulas_1.sweetenerGold)((0, standing_2.gold)(dependencies, person), computerStrength, personStrength, rawReputation, alliance), askGold = sweeten &&
                !askTech &&
                ((alliance ? (reasons & 2) === 0 : (reasons & 4) === 0) ||
                    evaluation.declareWar) &&
                gift > 0, planned = [
                ...(askTech
                    ? [
                        () => new DemandTribute_1.default(wanted[0], computer, negotiation, ruleRegistry),
                    ]
                    : []),
                ...(askGold
                    ? [
                        () => new DemandTribute_1.default(new Gold_1.default(gift), computer, negotiation, ruleRegistry),
                    ]
                    : []),
                ...(target !== null && !(0, standing_1.atWar)(dependencies, person, target)
                    ? [() => new JoinWar_1.default(target, computer, negotiation, ruleRegistry)]
                    : []),
            ];
            return {
                asks: planned,
                offIfRefused: (index) => planned[index] !== undefined &&
                    (index < planned.length - 1 ||
                        target === null ||
                        (0, standing_1.atWar)(dependencies, person, target) ||
                        reasons !== 0 ||
                        personRank === 7 ||
                        evaluation.reputation > (alliance ? 2 : 3) ||
                        evaluation.declareWar),
                accept: true,
                thenSays: null,
            };
        };
        let plan;
        if (proposal instanceof ProposeAlliance_1.default) {
            const { agree, reasons } = (0, formulas_1.allianceWilling)({
                level: difficulty,
                personAllies: dependencies.playerRegistry
                    .entries()
                    .filter((third) => (0, standing_1.allied)(dependencies, person, third)).length,
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
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                targetIsPersonsAlly,
                patienceSpent: spent,
            });
            plan = agree ? sweetened(true, reasons) : plain(false);
        }
        else if (proposal instanceof OfferPeace_1.default) {
            const flags = (0, formulas_1.peaceFlags)({
                level: difficulty,
                targetIsLeader: evaluation.targetIsLeader,
                attitude: evaluation.attitude,
                reputation: evaluation.reputation,
                targetFightingAndStrong,
                targetIsPersonsAlly,
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                attack: (0, standing_1.attack)(dependencies, computer),
                personPacifies: (0, wonders_1.pacifies)(dependencies, person),
            });
            plan =
                flags === 0
                    ? plain(false)
                    : (flags & 8) !== 0 && (flags & 7) === 0
                        ? plain(true)
                        : sweetened(false, flags);
        }
        else if (proposal instanceof AskAlly_1.default ||
            proposal instanceof DemandTribute_1.default ||
            proposal instanceof DemandWithdrawal_1.default) {
            const kind = proposal instanceof AskAlly_1.default
                ? 3
                : proposal instanceof DemandTribute_1.default
                    ? 4
                    : 5, tribute = personDemandTribute(negotiation, sides, kind);
            if (evaluation.declareWar ||
                (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT)) {
                plan = plain(false, exports.DIALOGUE.war);
            }
            else if (kind === 5) {
                plan = plain(withdraws(negotiation, sides, proposal));
            }
            else if (tribute > 0) {
                if (kind === 3) {
                    allyGifts.set(proposal, new Gold_1.default(tribute));
                }
                plan = plain(true);
            }
            else if (!alliance) {
                const refusedPolitely = (!evaluation.initialAggressive && evaluation.attitude < 76) ||
                    ((evaluation.fear !== 0 ||
                        (0, wonders_1.pacifies)(dependencies, person) ||
                        (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN) ||
                        evaluation.attitude < 26) &&
                        (0, formulas_1.roll)(() => drawn(proposal, 'war', random), 3) !== 0);
                plan = plain(false, refusedPolitely ? null : exports.DIALOGUE.war);
            }
            else if (kind === 3 && allyGives(negotiation, sides) !== null) {
                allyGifts.set(proposal, allyGives(negotiation, sides));
                plan = plain(true);
            }
            else {
                const sympathy = ((0, standing_1.advanceCount)(dependencies, person) <
                    (0, standing_1.advanceCount)(dependencies, computer) &&
                    personRank < computerRank) ||
                    personRank < 4, taunts = !sympathy &&
                    (evaluation.initialAggressive ||
                        evaluation.attitude >= 51 ||
                        evaluation.targetIsLeader);
                plan = plain(false, taunts ? exports.DIALOGUE.allyTaunts : null);
            }
        }
        else if (proposal instanceof CancelAlliance_1.default) {
            plan = plain(true);
        }
        else if (proposal instanceof ExchangeKnowledge_1.default) {
            const refused = !alliance &&
                ((0, standing_1.vendetta)(dependencies, computer, person) ||
                    (0, flags_1.hasFlag)(dependencies, person, computer, flags_1.SNEAK_ATTACK) ||
                    evaluation.capturedCities > 0 ||
                    evaluation.aggressive ||
                    (0, relations_1.attitudeLevel)(evaluation.attitude) > 5), ours = (0, effects_1.advancesWanted)(dependencies, computer, person), sells = !refused &&
                ours.length > 0 &&
                ((0, standing_1.advanceCount)(dependencies, person) <
                    (0, standing_1.advanceCount)(dependencies, computer) ||
                    (!alliance &&
                        (0, relations_1.attitudeLevel)(evaluation.attitude) >
                            ((0, standing_1.atPeace)(dependencies, computer, person) ? 5 : 4)));
            if (refused || ours.length === 0) {
                plan = plain(false);
            }
            else if (sells) {
                const advance = ours[0], price = (0, formulas_1.sellPrice)({
                    value: (0, effects_1.advanceValue)(dependencies, computer, advance),
                    knowers: dependencies.playerRegistry
                        .entries()
                        .filter((player) => (0, standing_1.knows)(dependencies, player, advance.sourceClass())).length,
                    attitude: evaluation.attitude,
                    personTopPowerAfter200: personRank === 7 && dependencies.turn.value() > 200,
                    level: difficulty,
                    personGold: (0, standing_2.gold)(dependencies, person),
                    allied: alliance,
                    personBehind: (0, standing_1.advanceCount)(dependencies, person) <
                        (0, standing_1.advanceCount)(dependencies, computer),
                    personFarBehind: (0, standing_1.advanceCount)(dependencies, person) + 5 <
                        (0, standing_1.advanceCount)(dependencies, computer),
                });
                plan =
                    price <= (0, standing_2.gold)(dependencies, person)
                        ? {
                            asks: [
                                () => new SellAdvance_1.default(advance, new Gold_1.default(price), computer, negotiation, ruleRegistry),
                            ],
                            offIfRefused: () => true,
                            // Selling is instead of exchanging.
                            accept: false,
                            thenSays: null,
                        }
                        : plain(false);
            }
            else {
                plan = plain(true);
            }
        }
        else if (proposal instanceof JoinWar_1.default) {
            const against = proposal.against(), distrust = (0, formulas_1.warDistrust)({
                reputation: evaluation.reputation,
                attack: (0, standing_1.attack)(dependencies, computer),
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                personAtWarWithTarget: (0, standing_1.atWar)(dependencies, person, against),
                targetRank: (0, standing_1.rank)(dependencies, against),
                personRank,
                computerRank,
                allied: alliance,
            }), willing = !(0, standing_1.atWar)(dependencies, computer, against) &&
                !(0, standing_1.allied)(dependencies, computer, against) &&
                (0, formulas_1.joinsWar)(distrust, (0, standing_1.allied)(dependencies, computer, against), (0, standing_1.vendetta)(dependencies, computer, person), (0, standing_1.atWar)(dependencies, person, against), (0, standing_1.rank)(dependencies, against) > personRank), price = (0, formulas_1.warPrice)({
                personReputation: rawReputation,
                targetReputation: (0, relations_1.reputation)(dependencies).get(against),
                credit: (0, relations_1.reputation)(dependencies).credit(computer, person),
                computerGold: (0, standing_2.gold)(dependencies, computer),
                personGold: (0, standing_2.gold)(dependencies, person),
                targetStrength: (0, standing_1.strength)(dependencies, against),
                computerTreatyWithTarget: hasTreatyWith(dependencies, computer, against),
                computerAlliedWithTarget: (0, standing_1.allied)(dependencies, computer, against),
                targetIsLeader: (0, standing_1.rank)(dependencies, against) === 7 &&
                    (0, standing_1.cities)(dependencies, against) > 4,
                personAtWarWithTarget: (0, standing_1.atWar)(dependencies, person, against),
                allied: alliance,
                computerAtWarWithAnyone: dependencies.playerRegistry
                    .entries()
                    .some((third) => (0, standing_1.atWar)(dependencies, computer, third)),
                targetSneakAttackedPerson: (0, flags_1.hasFlag)(dependencies, against, person, flags_1.SNEAK_ATTACK),
                personRank,
                computerRank,
                targetRank: (0, standing_1.rank)(dependencies, against),
                targetNukedPerson: false,
                personNukedTarget: false,
            });
            plan =
                willing && price <= (0, standing_2.gold)(dependencies, person)
                    ? {
                        asks: [
                            () => new DemandTribute_1.default(new Gold_1.default(price), computer, negotiation, ruleRegistry),
                        ],
                        offIfRefused: () => true,
                        accept: true,
                        thenSays: null,
                    }
                    : plain(false);
        }
        else if (proposal instanceof ShareMaps_1.default) {
            plan = plain((0, formulas_1.sharesMaps)({
                allied: alliance,
                personOwnsMapWonder: (0, wonders_1.ownsWonder)(dependencies, person, 'marco-polos-embassy') ||
                    (0, wonders_1.ownsWonder)(dependencies, person, 'magellans-expedition'),
                attitude: evaluation.attitude,
                personKnowsMapMaking: (0, standing_1.knows)(dependencies, person, MapMaking_1.default),
                computerKnowsMapMaking: (0, standing_1.knows)(dependencies, computer, MapMaking_1.default),
            }));
        }
        else if (proposal instanceof Gift_1.default) {
            const given = proposal.gift();
            if (given instanceof Gold_1.default || given instanceof Advance_1.default) {
                plan = plain(true);
            }
            else {
                const unit = given, refused = (0, standing_1.cities)(dependencies, computer) === 0 ||
                    (0, relations_1.attitudeLevel)(evaluation.attitude) > 4 ||
                    (0, standing_1.advanceCount)(dependencies, person) <
                        (0, standing_1.advanceCount)(dependencies, computer) ||
                    personRank < computerRank ||
                    personStrength < computerStrength;
                plan = plain(!refused && unit.player() === person);
            }
        }
        else {
            plan = plain(false);
        }
        plans.set(proposal, plan);
        return plan;
    };
    // Whether the computer player pulls its units back from the person's cities (`diplo_answer_demand`, proposal 5,
    //  `:1907-1935`): at peace and not allied, unless it is aggressive or cold, unafraid and the person has no Great Wall
    //  or United Nations, and it is no Democracy (a Republic one time in two), the peace is older than this turn and its
    //  attitude is above 25.
    const withdraws = (negotiation, sides, proposal) => {
        const { computer, person } = sides, evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides);
        if (!(0, standing_1.atPeace)(dependencies, computer, person) ||
            (0, standing_1.allied)(dependencies, computer, person)) {
            return false;
        }
        const defiant = (evaluation.initialAggressive || evaluation.attitude > 74) &&
            evaluation.fear === 0 &&
            !(0, wonders_1.pacifies)(dependencies, person), government = (0, senate_1.senateGovernment)(dependencies, computer), stubborn = (government === 'none' ||
            (government === 'republic' &&
                drawn(proposal, 'withdraw', random) < 0.5)) &&
            !(0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN) &&
            evaluation.attitude > 25;
        return !defiant || !stubborn;
    };
    // What an ally gives when asked, if anything: the tribute in gold, or an advance when it is far ahead.
    const allyGives = (negotiation, sides) => {
        const { computer, person } = sides, tribute = personDemandTribute(negotiation, sides, 3);
        if (tribute > 0) {
            return new Gold_1.default(tribute);
        }
        const ours = (0, effects_1.advancesWanted)(dependencies, computer, person), ahead = (0, standing_1.advanceCount)(dependencies, person) +
            6 -
            (0, standing_1.civilize)(dependencies, computer) -
            Math.min(Math.max(Math.trunc((0, standing_1.advanceCount)(dependencies, computer) / 12), 0), 5) <
            (0, standing_1.advanceCount)(dependencies, computer);
        return ours.length > 0 && ahead ? ours[0] : null;
    };
    // The person's proposal still being answered (with any asks of the computer player's after it), if any.
    const pending = (negotiation, sides) => {
        const history = actions(negotiation);
        for (let index = history.length - 1; index >= 0; index--) {
            const action = history[index];
            if (action instanceof Proposal_1.default &&
                !(action instanceof Initiate_1.default) &&
                !(action instanceof Dialogue_1.default) &&
                action.by() === sides.person &&
                !asks.has(action)) {
                return resolutionOf(negotiation, action) === null ? action : null;
            }
            if (action instanceof Resolution_1.default &&
                action.by() === sides.computer &&
                action.proposal().by() === sides.person) {
                return null;
            }
        }
        return null;
    };
    // The computer player's next step in answering `proposal`.
    const answer = (negotiation, sides, proposal) => {
        const plan = planFor(negotiation, sides, proposal), made = actions(negotiation).filter((action) => { var _a; return ((_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) === proposal; }), lastAsk = made[made.length - 1], lastResolution = lastAsk === undefined
            ? null
            : resolutionOf(negotiation, lastAsk);
        if (lastAsk !== undefined &&
            lastResolution instanceof Decline_1.default &&
            plan.offIfRefused(asks.get(lastAsk).index)) {
            return new Decline_1.default(sides.computer, proposal, ruleRegistry);
        }
        for (let index = made.length; index < plan.asks.length; index++) {
            const ask = plan.asks[index]();
            if (ask !== null) {
                asks.set(ask, { proposal, index });
                return ask;
            }
        }
        return plan.accept
            ? new Accept_1.default(sides.computer, proposal, ruleRegistry)
            : new Decline_1.default(sides.computer, proposal, ruleRegistry);
    };
    // Whether the person must accept `proposal` of the computer player's: a ceasefire or peace its Senate forces on it.
    const forced = (sides, proposal) => (proposal instanceof OfferCeasefire_1.default || proposal instanceof OfferPeace_1.default) &&
        proposal.by() === sides.computer &&
        !(0, wonders_1.pacifies)(dependencies, sides.computer) &&
        (0, senate_1.senateBlocks)(dependencies, sides.person, sides.computer, 'refuse-offer');
    /** The computer player's next step, or `null` when it's the person's to take. */
    const computerStep = (negotiation) => {
        const sides = (0, exports.sidesOf)(dependencies, negotiation);
        if (sides === null || negotiation.terminated()) {
            return null;
        }
        const { computer, person, computerLed } = sides, action = last(negotiation);
        if (action === null) {
            return computerLed
                ? new Initiate_1.default(computer, negotiation, ruleRegistry)
                : null;
        }
        // The person asked for an audience: refused if war was declared this turn, or its patience is spent and they've
        //  met this turn (`diplo_meet_refuses_audience`).
        if (action instanceof Initiate_1.default && action.by() === person) {
            const refuses = (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.WAR_THIS_TURN) ||
                (patienceOf(computer, person).spent() >= limitOf(negotiation, sides) &&
                    (0, flags_1.hasFlag)(dependencies, person, computer, flags_1.MET_THIS_TURN));
            return refuses
                ? new Decline_1.default(computer, action, ruleRegistry)
                : new Accept_1.default(computer, action, ruleRegistry);
        }
        if (action instanceof Decline_1.default && action.proposal() instanceof Initiate_1.default) {
            // The person turned the computer player away: its Senate may force a treaty (`diplo_meet_senate_forces_treaty`).
            if (action.by() === person) {
                const evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides), already = actions(negotiation).some((step) => step instanceof Dialogue_1.default && step.by() === computer);
                if (!already &&
                    !evaluation.declareWar &&
                    ((0, standing_1.atWar)(dependencies, computer, person) ||
                        (!(0, standing_1.atPeace)(dependencies, computer, person) &&
                            evaluation.fear !== 0)) &&
                    ((0, wonders_1.pacifies)(dependencies, computer) ||
                        (0, senate_1.senateBlocks)(dependencies, person, computer, 'ignore-audience'))) {
                    return say(negotiation, computer, (0, standing_1.atWar)(dependencies, computer, person)
                        ? exports.DIALOGUE.senateForcedCeasefire
                        : exports.DIALOGUE.senateForcedPeace);
                }
            }
            return new Terminate_1.default(computer, negotiation, ruleRegistry);
        }
        // The person acknowledged what the computer player said.
        if (action instanceof Acknowledge_1.default) {
            const key = action.proposal().key();
            if ([
                exports.DIALOGUE.allyDismissed,
                exports.DIALOGUE.war,
                exports.DIALOGUE.warContinues,
                exports.DIALOGUE.allyTaunts,
                exports.DIALOGUE.senateForcedCeasefire,
                exports.DIALOGUE.senateForcedPeace,
            ].includes(key)) {
                return new Terminate_1.default(computer, negotiation, ruleRegistry);
            }
        }
        // The person's proposal, still being answered.
        const answering = pending(negotiation, sides);
        if (answering !== null) {
            const lastStep = action;
            // An ask of the computer player's is the person's to answer.
            if (lastStep instanceof Proposal_1.default && lastStep.by() === computer) {
                return null;
            }
            return answer(negotiation, sides, answering);
        }
        // Just answered: anything to say after, then the menu again while its patience lasts.
        if (action instanceof Resolution_1.default &&
            action.by() === computer &&
            action.proposal().by() === person &&
            !(action.proposal() instanceof Initiate_1.default)) {
            const plan = plans.get(action.proposal());
            if (action instanceof Decline_1.default && (plan === null || plan === void 0 ? void 0 : plan.thenSays)) {
                return say(negotiation, computer, plan.thenSays);
            }
            return patienceOf(computer, person).spent() < limitOf(negotiation, sides)
                ? null
                : new Terminate_1.default(computer, negotiation, ruleRegistry);
        }
        // A computer player's ceasefire or peace refused: overruled by its Great Wall or United Nations (the `Resolved`
        //  rules make the treaty), or sweetened.
        if (action instanceof Decline_1.default &&
            action.by() === person &&
            (action.proposal() instanceof OfferCeasefire_1.default ||
                action.proposal() instanceof OfferPeace_1.default) &&
            action.proposal().by() === computer &&
            !(0, wonders_1.pacifies)(dependencies, computer)) {
            const offer = action.proposal(), sweetener = concession(negotiation, sides, offer);
            if (sweetener !== null) {
                asks.set(sweetener, { proposal: offer, index: 0 });
                return tag(sweetener, agendaItems.get(offer));
            }
            if (offer instanceof OfferCeasefire_1.default) {
                return tag(say(negotiation, computer, exports.DIALOGUE.warContinues), exports.AGENDA.ceasefire);
            }
        }
        // Its concession refused too: the war goes on, the meeting is over; refused peace, it carries on.
        if (action instanceof Decline_1.default &&
            action.by() === person &&
            action.proposal() instanceof Gift_1.default &&
            action.proposal().by() === computer &&
            (0, exports.askedFor)(action.proposal()) instanceof OfferCeasefire_1.default) {
            return tag(say(negotiation, computer, exports.DIALOGUE.warContinues), exports.AGENDA.ceasefire);
        }
        // The computer player's agenda, once the audience has begun and between its items.
        const begun = actions(negotiation).some((step) => step instanceof Accept_1.default && step.proposal() instanceof Initiate_1.default);
        if (!begun) {
            return null;
        }
        if (action instanceof Proposal_1.default && action.by() === computer) {
            // Its own proposal or dialogue, for the person to answer.
            return null;
        }
        const cursor = agendaCursor(negotiation, computer);
        if (cursor <= exports.AGENDA.menu) {
            const next = agendaFrom(negotiation, sides, cursor);
            if (next !== null) {
                return next;
            }
        }
        // The agenda is done: the menu is the person's, while patience lasts.
        return patienceOf(computer, person).spent() < limitOf(negotiation, sides)
            ? null
            : new Terminate_1.default(computer, negotiation, ruleRegistry);
    };
    // A refused ceasefire or peace sweetened (`diplo_meet_offer_ceasefire`, `:3380-3440`): with chance 1 in the person's
    //  reputation + 1 (doubled with a vendetta), an advance when it fears the person enough, else gold, else, down to one
    //  city, everything. Drawn once per offer. Only once per offer.
    const concession = (negotiation, sides, offer) => {
        const { computer, person } = sides;
        if (actions(negotiation).some((action) => { var _a; return ((_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) === offer; })) {
            return null;
        }
        const evaluation = (0, exports.evaluationOf)(dependencies, negotiation, sides), distrust = (evaluation.reputation + 1) *
            ((0, standing_1.vendetta)(dependencies, computer, person) ? 2 : 1);
        if ((0, formulas_1.roll)(() => drawn(offer, 'concession', random), Math.max(1, distrust)) !==
            0) {
            return null;
        }
        const ours = (0, effects_1.advancesWanted)(dependencies, computer, person);
        if (offer instanceof OfferCeasefire_1.default &&
            evaluation.fear > 3 &&
            ours.length > 0) {
            return new Gift_1.default(ours[0], computer, negotiation, ruleRegistry);
        }
        const amount = Math.min(Math.max(evaluation.fear * 2 - 4, 0), Math.trunc((0, standing_2.gold)(dependencies, computer) / 50)) * 50;
        if (amount > 0) {
            return new Gift_1.default(new Gold_1.default(amount), computer, negotiation, ruleRegistry);
        }
        return null;
    };
    /** The person's possible steps: answers to the computer player, or the menu. */
    const personSteps = (negotiation) => {
        const sides = (0, exports.sidesOf)(dependencies, negotiation);
        if (sides === null || negotiation.terminated()) {
            return [];
        }
        const { person, computerLed } = sides, action = last(negotiation);
        if (action === null) {
            return computerLed
                ? []
                : [new Initiate_1.default(person, negotiation, ruleRegistry)];
        }
        if (computerStep(negotiation) !== null) {
            return [];
        }
        if (action instanceof Dialogue_1.default && action.by() !== person) {
            return [
                new Acknowledge_1.default(person, action, ruleRegistry),
            ];
        }
        if (action instanceof Proposal_1.default &&
            action.by() !== person &&
            !action.resolved()) {
            const proposal = action, accept = new Accept_1.default(person, proposal, ruleRegistry);
            if (forced(sides, action)) {
                return [accept];
            }
            // A demand the person can't meet is only refused.
            if (action instanceof DemandTribute_1.default &&
                action.tribute() instanceof Gold_1.default &&
                action.tribute().value() > (0, standing_2.gold)(dependencies, person)) {
                return [new Decline_1.default(person, proposal, ruleRegistry)];
            }
            if (action instanceof SellAdvance_1.default &&
                action.price().value() > (0, standing_2.gold)(dependencies, person)) {
                return [new Decline_1.default(person, proposal, ruleRegistry)];
            }
            // What costs the person nothing first (civ-clone/web-renderer#674): receiving the emissary, a treaty, an alliance
            //  or a gift taken; a demand, a call to war, an exchange or a sale refused.
            return action instanceof Initiate_1.default ||
                action instanceof OfferPeace_1.default ||
                action instanceof OfferCeasefire_1.default ||
                action instanceof ProposeAlliance_1.default ||
                action instanceof Gift_1.default
                ? [accept, new Decline_1.default(person, proposal, ruleRegistry)]
                : [new Decline_1.default(person, proposal, ruleRegistry), accept];
        }
        // The menu.
        return [
            ...menu(negotiation, sides),
            new Terminate_1.default(person, negotiation, ruleRegistry),
        ];
    };
    return {
        computerStep,
        personSteps,
        planFor,
        menu,
        evaluationOf: (negotiation, sides) => (0, exports.evaluationOf)(dependencies, negotiation, sides),
        allyGives,
        personDemandTribute,
        lastContactTurns,
    };
};
exports.talks = talks;
// Whether the two have a ceasefire, a peace or an alliance.
const hasTreatyWith = (dependencies, player, other) => (0, treatyLevel_1.hasTreatyLevel)(dependencies, player, other, treatyLevel_1.TreatyLevel.Ceasefire);
exports.default = exports.talks;
//# sourceMappingURL=talks.js.map