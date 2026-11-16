"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.talks = exports.wasForced = exports.helpBonus = exports.outcomeOf = exports.askedFor = exports.agendaItemOf = exports.begin = exports.meetingOf = exports.sidesOf = exports.AGENDA = exports.DIALOGUE = void 0;
const flags_1 = require("./flags");
const Contact_1 = require("@civ-clone/base-diplomacy-interaction-contact/Contact");
const standing_1 = require("./standing");
const Proposal_1 = require("@civ-clone/core-diplomacy/Negotiation/Proposal");
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const formulas_1 = require("./formulas");
const evaluate_1 = require("./evaluate");
const survey_1 = require("./survey");
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
const Advances_1 = require("@civ-clone/civ2-science/Advances");
const advances_1 = require("@civ-clone/civ2-science/data/advances");
const OfferCeasefire_1 = require("@civ-clone/library-diplomacy/Proposals/OfferCeasefire");
const OfferPeace_1 = require("@civ-clone/library-diplomacy/Proposals/OfferPeace");
const ProposeAlliance_1 = require("@civ-clone/library-diplomacy/Proposals/ProposeAlliance");
const Resolution_1 = require("@civ-clone/core-diplomacy/Proposal/Resolution");
const SellAdvance_1 = require("@civ-clone/library-diplomacy/Proposals/SellAdvance");
const ShareMaps_1 = require("@civ-clone/library-diplomacy/Proposals/ShareMaps");
const Terminate_1 = require("@civ-clone/core-diplomacy/Negotiation/Terminate");
const callForHelp_1 = require("./callForHelp");
const standing_2 = require("@civ-clone/base-diplomacy/lib/standing");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const personMeeting_1 = require("@civ-clone/base-diplomacy/lib/personMeeting");
const senate_1 = require("./senate");
const units_1 = require("./units");
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
exports.DIALOGUE = {
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
    exports.DIALOGUE.allyDismissed,
    exports.DIALOGUE.war,
    exports.DIALOGUE.warContinues,
    exports.DIALOGUE.allyTaunts,
    exports.DIALOGUE.senateForcedCeasefire,
    exports.DIALOGUE.senateForcedPeace,
    exports.DIALOGUE.helpRefused,
    exports.DIALOGUE.violatorsRefused,
];
/** The computer player's business, in the original's order. */
exports.AGENDA = {
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
const meetings = new WeakMap();
/** The meeting's state, made when it opens (`begin`), or `null` for a meeting that isn't between a computer and a person. */
const meetingOf = (negotiation) => { var _a; return (_a = meetings.get(negotiation)) !== null && _a !== void 0 ? _a : null; };
exports.meetingOf = meetingOf;
/**
 * Opens the meeting (`diplo_ai_meet_player`, `:4017-4080`), before anything is said: the computer player's evaluation
 *  of the person, its attitude in talks made live, and what held as it opened. A computer player's own audience resets
 *  its patience (and ends any ceasefire: `Rules/talks`); a person who started a war with it finds it out of patience,
 *  and one with an incident to answer finds it patient.
 */
const begin = (dependencies, negotiation) => {
    if (meetings.has(negotiation)) {
        return meetings.get(negotiation);
    }
    const sides = (0, exports.sidesOf)(dependencies, negotiation);
    if (sides === null) {
        return null;
    }
    const { computer, person } = sides, evaluation = (0, evaluate_1.evaluate)(dependencies, computer, person), last = (0, lastContact_1.lastContact)(dependencies, computer, person), meeting = {
        sides,
        evaluation,
        live: { value: evaluation.attitude },
        aggressive: evaluation.aggressive,
        declareWar: evaluation.declareWar,
        warTarget: evaluation.warTarget,
        tribute: evaluation.tribute,
        fear: evaluation.fear,
        hadCeasefire: (0, standing_1.treaty)(dependencies, computer, person) === treatyLevel_1.TreatyLevel.Ceasefire,
        // Units that meet make contact (base-diplomacy's `movedRules`) before talks open; the original opens them first,
        //  so contact made this turn with no talks before counts as none.
        noContact: !(0, standing_1.inContact)(dependencies, computer, person) ||
            (last === undefined &&
                dependencies.interactionRegistry
                    .getByPlayers(computer, person)
                    .some((interaction) => interaction instanceof Contact_1.default &&
                    interaction.when() === dependencies.turn.value())),
        lastContactTurn: last === undefined || last < 0 ? null : last,
        hostile: (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CITY_CAPTURED),
        paid: false,
        propose: false,
        declaredWar: false,
        treatyMade: false,
        senateBlocked: false,
        conceded: false,
        ended: false,
        gifts: 0,
    };
    // The Great Wall's or the United Nations' owner has no incident to answer (`:451`).
    if ((0, wonders_1.pacifies)(dependencies, person)) {
        (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.INCIDENT);
    }
    meetings.set(negotiation, meeting);
    (0, relations_1.beginTalks)(computer, person, meeting.live);
    return meeting;
};
exports.begin = begin;
// Each computer step's place in the agenda, and each ask's proposal.
const agendaItems = new WeakMap();
const asks = new WeakMap();
/** The agenda item a step of the computer player's was (`AGENDA`), or `undefined`. */
const agendaItemOf = (action) => agendaItems.get(action);
exports.agendaItemOf = agendaItemOf;
/** The proposal a computer player's ask belongs to, or `null`. */
const askedFor = (action) => { var _a, _b; return (_b = (_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) !== null && _b !== void 0 ? _b : null; };
exports.askedFor = askedFor;
const outcomes = new WeakMap();
/** What answering `action` brings, if anything (`Outcome`). */
const outcomeOf = (action) => { var _a; return (_a = outcomes.get(action)) !== null && _a !== void 0 ? _a : {}; };
exports.outcomeOf = outcomeOf;
const withOutcome = (action, outcome) => {
    outcomes.set(action, outcome);
    return action;
};
/**
 * A computer player's payment to its ally for joining its war on `enemy` (`diplo_ally_demand_help`, `:1300-1320`): the
 *  threat `enemy` poses where it has cities, in 50s, up to what it has.
 */
const helpBonus = (dependencies, computer, enemy) => {
    const presences = (0, standing_2.presence)(dependencies, computer, enemy), ours = presences.get(computer), theirs = presences.get(enemy), ourCities = (0, standing_1.cities)(dependencies, computer);
    let threat = 0;
    (0, standing_2.landMassesOf)(ours, theirs).forEach((landMass) => {
        const us = (0, standing_2.presenceOn)(ours, landMass), them = (0, standing_2.presenceOn)(theirs, landMass);
        if (us.cities > (ourCities > 1 ? 1 : 0) && us.defence < them.attack) {
            threat += Math.trunc((them.attack * ((0, standing_1.level)(dependencies) === standing_1.CHIEFTAIN ? 4 : 2)) /
                (us.defence + 1));
        }
    });
    return Math.min(threat, Math.trunc((0, standing_2.gold)(dependencies, computer) / 50)) * 50;
};
exports.helpBonus = helpBonus;
// The computer player's ceasefires and peace a person's Senate made it accept.
const forcedOffers = new WeakSet();
/** Whether the person's Senate made it accept `proposal`. */
const wasForced = (proposal) => forcedOffers.has(proposal);
exports.wasForced = wasForced;
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
/** The original's `rand() % n == 0`, drawn once for `key` of `owner`. */
const oneIn = (owner, key, random, n) => (0, formulas_1.roll)(() => drawn(owner, key, random), n) === 0;
const talks = ({ dependencies, random }) => {
    const { ruleRegistry } = dependencies, feelings = (0, evaluate_1.attitudeOf)(dependencies), last = (negotiation) => negotiation.lastInteraction(), actions = (negotiation) => negotiation.interactions(), resolutionOf = (negotiation, proposal) => {
        var _a;
        return (_a = actions(negotiation).find((action) => action instanceof Resolution_1.default && action.proposal() === proposal)) !== null && _a !== void 0 ? _a : null;
    }, say = (by, key, negotiation) => new Dialogue_1.default(by, key, negotiation, ruleRegistry), tag = (action, item) => {
        agendaItems.set(action, item);
        return action;
    }, patienceOf = ({ computer, person }) => (0, patience_1.patience)(dependencies, computer, person), limitOf = (meeting) => (0, evaluate_1.patienceLimit)(dependencies, meeting.sides.computer, meeting.sides.person, meeting.live.value), effectiveReputation = (meeting) => (0, relations_1.reputation)(dependencies).get(meeting.sides.person) -
        (0, relations_1.reputation)(dependencies).credit(meeting.sides.computer, meeting.sides.person), topPower = (player) => (0, standing_1.rank)(dependencies, player) === 7 && (0, standing_1.cities)(dependencies, player) > 4, anyAllies = (player, except = []) => dependencies.playerRegistry
        .entries()
        .filter((other) => other !== player &&
        !except.includes(other) &&
        (0, standing_1.allied)(dependencies, player, other)).length;
    const exchange = (meeting, mode, second = false) => {
        const { computer, person } = meeting.sides, found = (0, survey_1.survey)(dependencies, computer, person), alliance = (0, standing_1.allied)(dependencies, computer, person), peace = (0, standing_1.atPeace)(dependencies, computer, person), attitude = (0, relations_1.attitudeLevel)(meeting.live.value), difficulty = (0, standing_1.level)(dependencies), sell = () => {
            if (found.wanted === null) {
                return { kind: 'none' };
            }
            const price = (0, formulas_1.sellPrice)({
                value: (0, survey_1.advanceValue)(dependencies, computer, found.wanted),
                knowers: dependencies.playerRegistry
                    .entries()
                    .filter((player) => (0, standing_1.knows)(dependencies, player, found.wanted.sourceClass())).length,
                attitude: meeting.live.value,
                personTopPower: topPower(person) &&
                    dependencies.turn.value() > 200 &&
                    difficulty !== standing_1.CHIEFTAIN,
                personGold: (0, standing_2.gold)(dependencies, person),
                allied: alliance,
                personAdvances: found.personCount,
                computerAdvances: found.computerCount,
            });
            return price <= (0, standing_2.gold)(dependencies, person)
                ? { kind: 'sell', advance: found.wanted, price }
                : { kind: 'none' };
        };
        if (!alliance) {
            if ((0, standing_1.vendetta)(dependencies, computer, person) ||
                (0, flags_1.hasFlag)(dependencies, person, computer, flags_1.SNEAK_ATTACK) ||
                meeting.evaluation.capturedCities !== 0 ||
                (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.FIGHTING) ||
                (meeting.aggressive && found.computerCount > 5) ||
                attitude > 5) {
                return { kind: 'refuse' };
            }
        }
        // A wonder the person could beat it to with the advance, above King (`blocking_wonder`).
        if (difficulty > standing_1.KING && blocksWonder(meeting)) {
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
        if (topPower(person) &&
            !alliance &&
            attitude > (dependencies.turn.value() < 201 ? 4 : 3) - (peace ? 0 : 1) &&
            !militaryKey(found.best)) {
            return mode === 1 ? { kind: 'none' } : sell();
        }
        // An ally far behind is given the advance.
        if (found.best === null &&
            found.wanted !== null &&
            alliance &&
            found.personCount +
                6 -
                (0, standing_1.civilize)(dependencies, computer) -
                Math.min(Math.max(Math.trunc(found.computerCount / 12), 0), 5) <
                found.computerCount &&
            (patienceOf(meeting.sides).spent() < 2 || mode === 3)) {
            return { kind: 'gift', advance: found.wanted };
        }
        if (found.wanted === null || found.best === null) {
            return mode === 1 ? { kind: 'none' } : sell();
        }
        if (mode > 1) {
            return { kind: 'none' };
        }
        if (second) {
            if (found.second === null ||
                (0, standing_1.knows)(dependencies, computer, found.second.sourceClass()) ||
                (0, wonders_1.ownsWonder)(dependencies, computer, 'marco-polos-embassy') ||
                topPower(person) ||
                (found.secondValue < found.bestValue &&
                    (found.personCount < found.computerCount || attitude > 4))) {
                return { kind: 'petty' };
            }
            return { kind: 'offer', takes: found.second, value: found.secondValue };
        }
        return { kind: 'offer', takes: found.best, value: found.bestValue * 2 };
    };
    // The advances that are keys to the armies (Armor's, Cavalry's, Artillery's, Howitzer's, Riflemen's, Musketeers'
    //  prerequisites, and advance 0x22: `diplomacy.cpp:950-958`).
    const militaryKey = (advance) => advance !== null &&
        [
            Advances_1.MobileWarfare,
            Advances_1.Tactics,
            Advances_1.MachineTools,
            Advances_1.Robotics,
            Advances_1.Conscription,
            Advances_1.Gunpowder,
            advances_1.advances[0x22][0],
        ].includes(advance.sourceClass());
    // Whether the person is building a wonder that needs one of the computer player's advances it lacks: the original
    //  also compares their wonders in the wonder's group, which isn't ported.
    const blocksWonder = (meeting) => {
        const { computer, person } = meeting.sides, cityBuilds = dependencies.cityBuildRegistry, requirements = dependencies.requirementRegistry;
        if (cityBuilds === undefined || requirements === undefined) {
            return false;
        }
        return dependencies.cityRegistry.getByPlayer(person).some((city) => {
            var _a;
            try {
                const item = (_a = cityBuilds.getByCity(city).building()) === null || _a === void 0 ? void 0 : _a.item();
                if (item === undefined || item === null) {
                    return false;
                }
                return requirements
                    .for(item, 'requires')
                    .some((entry) => entry.targets.some((target) => typeof target === 'function' &&
                    target.prototype instanceof Advance_1.default &&
                    (0, standing_1.knows)(dependencies, computer, target) &&
                    !(0, standing_1.knows)(dependencies, person, target) &&
                    Object.getPrototypeOf(item).name !== 'Unit'));
            }
            catch (e) {
                return false;
            }
        });
    };
    // The computer player's agenda from item `from`: its next step, `null` when it has nothing more to say, or a
    //  `Terminate` when it ends the meeting.
    const agendaFrom = (negotiation, meeting, from) => {
        const { computer, person, computerLed } = meeting.sides, evaluation = meeting.evaluation, alliance = (0, standing_1.allied)(dependencies, computer, person), peace = (0, standing_1.atPeace)(dependencies, computer, person), war = (0, standing_1.atWar)(dependencies, computer, person), end = () => new Terminate_1.default(computer, negotiation, ruleRegistry);
        for (let item = from; item < exports.AGENDA.done; item++) {
            if (item === exports.AGENDA.callForHelp) {
                const call = (0, callForHelp_1.default)(dependencies, computer, person);
                if (call !== null && alliance) {
                    return tag(new JoinWar_1.default(call, computer, negotiation, ruleRegistry), item);
                }
            }
            if (item === exports.AGENDA.violators) {
                if ((0, flags_1.hasFlag)(dependencies, computer, person, flags_1.WITHDRAWAL_DEMANDED) &&
                    peace &&
                    !alliance) {
                    return tag(new DemandWithdrawal_1.default(computer, negotiation, ruleRegistry), item);
                }
            }
            if (item === exports.AGENDA.exchange) {
                const offer = exchange(meeting, 1);
                if (offer.kind === 'offer') {
                    return tag(withOutcome(new ExchangeKnowledge_1.default((0, survey_1.survey)(dependencies, computer, person).wanted !== null
                        ? [(0, survey_1.survey)(dependencies, computer, person).wanted]
                        : [], computer, negotiation, ruleRegistry), { takes: offer.takes, attitude: offer.value }), item);
                }
                if (offer.kind === 'gift') {
                    return tag(withOutcome(new Gift_1.default(offer.advance, computer, negotiation, ruleRegistry), { patience: 2 }), item);
                }
                // A peaceful computer player of its own accord, afraid, says no more (`:3890-3892`).
                if (!meeting.aggressive &&
                    computerLed &&
                    (0, treatyLevel_1.hasTreatyLevel)(dependencies, computer, person, treatyLevel_1.TreatyLevel.Ceasefire) &&
                    meeting.fear > 2) {
                    return end();
                }
            }
            if (item === exports.AGENDA.warOnTarget) {
                const target = meeting.warTarget;
                if (target !== null &&
                    (evaluation.requestMode !== 0 || alliance) &&
                    dependencies.playerRegistry.entries().includes(target)) {
                    return tag(new JoinWar_1.default(target, computer, negotiation, ruleRegistry), item);
                }
            }
            if (item === exports.AGENDA.tribute) {
                let tribute = meeting.tribute;
                // An ally eases its demands (`diplo_meet_ally_eases_demands`).
                if (alliance) {
                    const found = (0, survey_1.survey)(dependencies, computer, person);
                    if (found.best !== null) {
                        if ((0, standing_1.rank)(dependencies, computer) < (0, standing_1.rank)(dependencies, person)) {
                            if (found.computerCount < found.personCount ||
                                (0, standing_2.gold)(dependencies, person) < (0, standing_2.gold)(dependencies, computer)) {
                                tribute = 0;
                            }
                        }
                        else if (found.computerCount < found.personCount &&
                            (0, standing_2.gold)(dependencies, person) < (0, standing_2.gold)(dependencies, computer)) {
                            tribute = 0;
                        }
                    }
                }
                if (alliance) {
                    const half = Math.trunc((0, standing_2.gold)(dependencies, person) / 2);
                    tribute = Math.min(tribute, half < 101 ? 100 : half);
                }
                if (tribute > 0 &&
                    tribute !== 999 &&
                    (evaluation.requestMode === 2 || propose(meeting)) &&
                    tribute <= (0, standing_2.gold)(dependencies, person)) {
                    return tag(new DemandTribute_1.default(new Gold_1.default(tribute), computer, negotiation, ruleRegistry), item);
                }
            }
            if (item === exports.AGENDA.tech) {
                const found = (0, survey_1.survey)(dependencies, computer, person), demandedOne = actions(negotiation).some((action) => action instanceof DemandTribute_1.default &&
                    action.by() === computer &&
                    agendaItems.get(action) === exports.AGENDA.tech), 
                // Over a barrel: its units near the person's cities and aggressive, it demands the second advance too.
                again = demandedOne &&
                    actions(negotiation).some((action) => action instanceof Accept_1.default &&
                        agendaItems.get(action.proposal()) === exports.AGENDA.tech) &&
                    evaluation.unitsNearCities &&
                    meeting.aggressive &&
                    !meeting.paid;
                if ((!demandedOne || again) &&
                    (evaluation.requestMode !== 0 ||
                        propose(meeting) ||
                        (alliance && (0, relations_1.attitudeLevel)(meeting.live.value) > 3)) &&
                    found.best !== null &&
                    (meeting.tribute !== 999 || again)) {
                    return tag(new DemandTribute_1.default(found.best, computer, negotiation, ruleRegistry), item);
                }
            }
            if (item === exports.AGENDA.dismissal) {
                if (alliance &&
                    (meeting.aggressive || meeting.live.value > 49) &&
                    !meeting.paid) {
                    return tag(say(computer, exports.DIALOGUE.allyDismissed, negotiation), item);
                }
            }
            if (item === exports.AGENDA.threat) {
                const aggressive = threatens(meeting);
                if (aggressive) {
                    const met = meeting.lastContactTurn !== null, incident = (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.INCIDENT);
                    if ((meeting.tribute > 50 &&
                        ((0, standing_1.atPeace)(dependencies, computer, person) ||
                            (!(0, standing_1.hostile)(dependencies, computer, person, feelings) &&
                                met &&
                                !incident))) ||
                        meeting.tribute === 999 ||
                        !met ||
                        incident ||
                        !computerLed) {
                        return tag(say(computer, exports.DIALOGUE.war, negotiation), item);
                    }
                    // Still aggressive: it says nothing more (`if (ai_aggressive) return`).
                    return end();
                }
            }
            if (item === exports.AGENDA.alliance) {
                const proposal = proposeAlliance(negotiation, meeting);
                if (proposal !== null) {
                    return tag(proposal, item);
                }
            }
            if (item === exports.AGENDA.ceasefire && war) {
                return tag(new OfferCeasefire_1.default(computer, negotiation, ruleRegistry), item);
            }
            if (item === exports.AGENDA.peace && offersPeace(meeting)) {
                return tag(new OfferPeace_1.default(computer, negotiation, ruleRegistry), item);
            }
        }
        return null;
    };
    // `propose`, as the agenda has set it so far.
    const propose = (meeting) => meeting.propose ||
        ((0, standing_1.allied)(dependencies, meeting.sides.computer, meeting.sides.person) &&
            effectiveReputation(meeting) > 4 &&
            !meeting.paid);
    // `diplo_meet_turn_aggressive` and the hostility it keeps (`:3912-3925`, `:3144`): whether the computer player is
    //  aggressive at the threats.
    const threatens = (meeting) => {
        const { computer, person } = meeting.sides;
        if (meeting.hostile && meeting.aggressive) {
            return false;
        }
        if (meeting.aggressive) {
            return true;
        }
        if (meeting.noContact &&
            !meeting.paid &&
            meeting.tribute === 999 &&
            (0, relations_1.attitudeLevel)(meeting.live.value) >
                (meeting.evaluation.initialAggressive ? 2 : 4) &&
            !(0, wonders_1.pacifies)(dependencies, person)) {
            const government = (0, senate_1.senateGovernment)(dependencies, computer), index = government === 'democracy' ? 6 : government === 'republic' ? 5 : 0;
            return (index < 6 - (drawn(meeting, 'turn-aggressive', random) < 0.5 ? 0 : 1));
        }
        return false;
    };
    // `diplo_meet_propose_alliance` (`:3228`): the alliance it proposes, or its call to fight a common enemy first.
    const proposeAlliance = (negotiation, meeting) => {
        const { computer, person } = meeting.sides, evaluation = meeting.evaluation;
        if (!(0, standing_1.atPeace)(dependencies, computer, person) ||
            (0, standing_1.allied)(dependencies, computer, person) ||
            evaluation.targetIsLeader) {
            return null;
        }
        const personRank = (0, standing_1.rank)(dependencies, person), computerRank = (0, standing_1.rank)(dependencies, computer), ranked = personRank < 6 && computerRank < 6;
        let target = meeting.warTarget;
        // Late in the game, with no target, the strongest player in contact with the person that neither is at war with.
        if (ranked && target === null && dependencies.turn.value() > 200) {
            let best = 8;
            dependencies.playerRegistry.entries().forEach((other) => {
                const otherRank = (0, standing_1.rank)(dependencies, other);
                if (other !== computer &&
                    other !== person &&
                    computerRank <= otherRank &&
                    personRank <= otherRank &&
                    otherRank <= best &&
                    (0, standing_1.inContact)(dependencies, person, other) &&
                    !(0, standing_1.atWar)(dependencies, person, other) &&
                    !(0, standing_1.allied)(dependencies, computer, other) &&
                    !(0, standing_1.atWar)(dependencies, computer, other)) {
                    target = other;
                    best = otherRank;
                }
            });
        }
        const commonEnemy = target !== null &&
            (0, treatyLevel_1.hasTreatyLevel)(dependencies, person, target, treatyLevel_1.TreatyLevel.Ceasefire);
        if ((meeting.fear !== 0 || ranked || commonEnemy) &&
            (evaluation.peaceInclination > 1 || ranked) &&
            anyAllies(person) === 0 &&
            (meeting.live.value < 25 || (meeting.live.value < 50 && commonEnemy)) &&
            (commonEnemy || meeting.declaredWar || ranked) &&
            effectiveReputation(meeting) < 4 &&
            !hasTreatyLevelExactly(computer, person, treatyLevel_1.TreatyLevel.Ceasefire) &&
            evaluation.capturedCities < 2 &&
            (personRank < 6 || computerRank < 5)) {
            return target !== null
                ? new JoinWar_1.default(target, computer, negotiation, ruleRegistry)
                : new ProposeAlliance_1.default(computer, negotiation, ruleRegistry);
        }
        return null;
    };
    const hasTreatyLevelExactly = (player, other, level) => (0, standing_1.treaty)(dependencies, player, other) === level;
    // `diplo_meet_offer_peace` (`:3463`): whether it offers peace.
    const offersPeace = (meeting) => {
        const { computer, person } = meeting.sides;
        if ((0, standing_1.atPeace)(dependencies, computer, person) ||
            (0, standing_1.atWar)(dependencies, computer, person)) {
            return false;
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
        const ceasefire = hasTreatyLevelExactly(computer, person, treatyLevel_1.TreatyLevel.Ceasefire);
        return (meeting.evaluation.suppressedAggression ||
            ((meeting.paid || meeting.noContact) && !ceasefire) ||
            ((meeting.fear !== 0 || (0, relations_1.attitudeLevel)(meeting.live.value) <= threshold) &&
                !meeting.evaluation.targetIsLeader &&
                effectiveReputation(meeting) + meeting.evaluation.capturedCities <
                    meeting.fear + 4));
    };
    // The computer player's concession for a refused ceasefire (`:3375-3445`): with chance 1 in the person's reputation
    //  + 1 (doubled with a vendetta), an advance if it fears the person above 3; refused, gold; refused, all it has if it
    //  is down to one city. For peace, gold only. Each is offered once, in that order.
    const concession = (negotiation, meeting, offer) => {
        const { computer, person } = meeting.sides, made = actions(negotiation).filter((action) => { var _a; return ((_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) === offer; }), distrust = (effectiveReputation(meeting) + 1) *
            ((0, standing_1.vendetta)(dependencies, computer, person) ? 2 : 1);
        if (made.length === 0 &&
            !oneIn(offer, 'concession', random, Math.max(1, distrust))) {
            return null;
        }
        const steps = [
            () => {
                const wanted = (0, survey_1.survey)(dependencies, computer, person).wanted;
                return offer instanceof OfferCeasefire_1.default &&
                    meeting.fear > 3 &&
                    wanted !== null
                    ? new Gift_1.default(wanted, computer, negotiation, ruleRegistry)
                    : null;
            },
            () => {
                let amount = Math.min(Math.max(meeting.fear * 2 - 4, 0), Math.trunc((0, standing_2.gold)(dependencies, computer) / 50)) * 50;
                if ((0, wonders_1.pacifies)(dependencies, computer)) {
                    amount = Math.trunc(amount / 2);
                }
                return amount > 0
                    ? new Gift_1.default(new Gold_1.default(amount), computer, negotiation, ruleRegistry)
                    : null;
            },
            () => {
                if (!(offer instanceof OfferCeasefire_1.default) ||
                    meeting.fear === 0 ||
                    (0, standing_1.cities)(dependencies, computer) >= 2 ||
                    (0, wonders_1.pacifies)(dependencies, computer)) {
                    return null;
                }
                const everything = [
                    ...((0, standing_2.gold)(dependencies, computer) > 0
                        ? [new Gold_1.default((0, standing_2.gold)(dependencies, computer))]
                        : []),
                    ...((0, survey_1.survey)(dependencies, computer, person).wanted !== null
                        ? allAdvancesLacked(computer, person)
                        : []),
                ];
                return everything.length > 0
                    ? withOutcome(new Gift_1.default(everything[0], computer, negotiation, ruleRegistry), { gives: everything.slice(1) })
                    : null;
            },
        ];
        const lastIndex = made.length === 0 ? -1 : asks.get(made[made.length - 1]).index;
        for (let index = lastIndex + 1; index < steps.length; index++) {
            const gift = steps[index]();
            if (gift !== null) {
                asks.set(gift, { proposal: offer, index });
                return gift;
            }
        }
        return null;
    };
    const allAdvancesLacked = (from, by) => {
        try {
            const research = dependencies.playerResearchRegistry.getByPlayer(by);
            return dependencies.playerResearchRegistry
                .getByPlayer(from)
                .complete()
                .filter((advance) => !advance.sourceClass().repeatable &&
                !research.completed(advance.sourceClass()));
        }
        catch (e) {
            return [];
        }
    };
    // What the person may propose, in the menu's order (`diplo_proposal_menu`, the favour menu, the gift menu), each
    //  allowed by `ProposalAvailable`.
    const menu = (negotiation, meeting) => {
        const { computer, person } = meeting.sides, found = (0, survey_1.survey)(dependencies, computer, person), treasury = (0, standing_2.gold)(dependencies, person), units = dependencies.unitRegistry
            .getByPlayer(person)
            .filter((unit) => unit.attack().value() > 0), strongest = units.sort((a, b) => b.attack().value() - a.attack().value())[0], proposals = [
            new ProposeAlliance_1.default(person, negotiation, ruleRegistry),
            new OfferPeace_1.default(person, negotiation, ruleRegistry),
            new AskAlly_1.default(person, negotiation, ruleRegistry),
            new DemandTribute_1.default(new Gold_1.default((0, formulas_1.demandedTribute)({
                proposal: 4,
                fear: meeting.fear,
                computerGold: (0, standing_2.gold)(dependencies, computer),
                computerRank: (0, standing_1.rank)(dependencies, computer),
                personRank: (0, standing_1.rank)(dependencies, person),
                turnsSinceContact: meeting.evaluation.turnsSinceContact,
                atPeace: (0, standing_1.atPeace)(dependencies, person, computer),
                computerPacifies: (0, wonders_1.pacifies)(dependencies, computer),
            })), person, negotiation, ruleRegistry),
            new DemandWithdrawal_1.default(person, negotiation, ruleRegistry),
            new CancelAlliance_1.default(person, negotiation, ruleRegistry),
            // The favours: an exchange, offering its best advance or its second; war on any other player; maps.
            ...[found.best, found.second]
                .filter((advance) => advance !== null)
                .map((advance, index) => withOutcome(new ExchangeKnowledge_1.default([advance], person, negotiation, ruleRegistry), { takes: advance, attitude: index })),
            ...dependencies.playerRegistry
                .entries()
                .filter((other) => other !== computer && other !== person)
                .map((other) => new JoinWar_1.default(other, person, negotiation, ruleRegistry)),
            new ShareMaps_1.default(person, negotiation, ruleRegistry),
            // The gifts: its best advance and the next, gold, a unit.
            ...[found.best, found.second]
                .filter((advance) => advance !== null)
                .map((advance, index) => withOutcome(new Gift_1.default(advance, person, negotiation, ruleRegistry), {
                attitude: (index === 0 ? 4 : 2) *
                    (0, survey_1.advanceValue)(dependencies, computer, found.best),
            })),
            ...(0, formulas_1.giftGold)(treasury).map((amount) => new Gift_1.default(new Gold_1.default(amount), person, negotiation, ruleRegistry)),
            strongest !== undefined
                ? new Gift_1.default(strongest, person, negotiation, ruleRegistry)
                : null,
        ];
        return proposals.filter((proposal) => proposal !== null && (0, personMeeting_1.proposalAvailable)(dependencies, proposal));
    };
    const answers = new WeakMap();
    const plain = (accept, outcome = {}, onDecline = {}) => ({
        asks: [],
        off: () => null,
        accept,
        onAccept: accept ? outcome : {},
        onDecline: accept ? {} : { ...outcome, ...onDecline },
    });
    const answerTo = (negotiation, meeting, proposal) => {
        if (answers.has(proposal)) {
            return answers.get(proposal);
        }
        const answer = work(negotiation, meeting, proposal);
        answers.set(proposal, answer);
        return answer;
    };
    const work = (negotiation, meeting, proposal) => {
        const { computer, person } = meeting.sides, evaluation = meeting.evaluation, spent = patienceOf(meeting.sides).spent(), difficulty = (0, standing_1.level)(dependencies), computerRank = (0, standing_1.rank)(dependencies, computer), personRank = (0, standing_1.rank)(dependencies, person), computerStrength = (0, standing_1.strength)(dependencies, computer), personStrength = (0, standing_1.strength)(dependencies, person), alliance = (0, standing_1.allied)(dependencies, computer, person), rawReputation = (0, relations_1.reputation)(dependencies).get(person), effective = effectiveReputation(meeting), target = meeting.warTarget, found = (0, survey_1.survey)(dependencies, computer, person), targetFightingAndStrong = target !== null &&
            !(0, standing_1.hostile)(dependencies, person, target, feelings) &&
            (0, standing_1.inContact)(dependencies, person, target) &&
            (0, flags_1.hasFlag)(dependencies, computer, target, flags_1.FIGHTING) &&
            ((0, standing_1.atPeace)(dependencies, person, target)
                ? Math.trunc((computerStrength * 3) / 2)
                : computerStrength * 2) <= (0, standing_1.strength)(dependencies, target), targetIsPersonsAlly = target !== null && (0, standing_1.allied)(dependencies, person, target), secret = () => found.best === null
            ? null
            : withOutcome(new DemandTribute_1.default(found.best, computer, negotiation, ruleRegistry), { attitude: 2 * (0, survey_1.advanceValue)(dependencies, computer, found.best) }), cash = (amount) => () => amount > 0
            ? new DemandTribute_1.default(new Gold_1.default(amount), computer, negotiation, ruleRegistry)
            : null, solidarity = (against) => () => against !== null && !(0, standing_1.atWar)(dependencies, person, against)
            ? new JoinWar_1.default(against, computer, negotiation, ruleRegistry)
            : null;
        if (proposal instanceof ProposeAlliance_1.default) {
            // `diplo_alliance_willing` with a war target found for reason 4 (`:1440-1470`).
            let allianceTarget = target;
            const commonEnemy = () => {
                if (personRank >= 7 ||
                    computerRank >= 7 ||
                    dependencies.turn.value() < 100 ||
                    anyAllies(person) >= 7 - personRank ||
                    (0, relations_1.attitudeLevel)(meeting.live.value) >= 5) {
                    return null;
                }
                let best = 8, chosen = null;
                dependencies.playerRegistry.entries().forEach((other) => {
                    const contact = (0, standing_1.inContact)(dependencies, person, other) ? 1 : 0;
                    if (other !== computer &&
                        other !== person &&
                        computerRank <= (0, standing_1.rank)(dependencies, other) &&
                        personRank <= (0, standing_1.rank)(dependencies, other) &&
                        (contact === 1 || (0, standing_1.inContact)(dependencies, computer, other)) &&
                        !(0, standing_1.atWar)(dependencies, person, other) &&
                        !(0, standing_1.allied)(dependencies, computer, other) &&
                        (0, standing_1.rank)(dependencies, other) - contact < best) {
                        chosen = other;
                        best = (0, standing_1.rank)(dependencies, other) - contact;
                    }
                });
                if (target !== null && (0, standing_1.rank)(dependencies, target) !== 7) {
                    chosen = target;
                }
                return chosen;
            }, enemy = targetFightingAndStrong ? null : commonEnemy(), willing = (0, formulas_1.allianceWilling)({
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
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                targetIsPersonsAlly,
                patienceSpent: spent,
            });
            if (enemy !== null && (willing.reasons & 4) !== 0) {
                allianceTarget = enemy;
            }
            if (!willing.agree) {
                // Refused for vendetta, reputation or captured cities, it loses a little patience (`:1648`).
                const harsh = (0, standing_1.vendetta)(dependencies, computer, person) ||
                    effective >= 3 ||
                    evaluation.capturedCities !== 0;
                return plain(false, {}, { patience: harsh ? 1 : 0 });
            }
            const sweeten = (0, formulas_1.asksSweetener)(spent, meeting.live.value, rawReputation, meeting.declareWar, true), askSecret = sweeten &&
                ((willing.reasons & 3) === 0 || meeting.declareWar) &&
                found.best !== null, gift = (0, formulas_1.sweetenerGold)((0, standing_2.gold)(dependencies, person), computerStrength, personStrength, rawReputation, true), askGold = sweeten &&
                ((willing.reasons & 2) === 0 || meeting.declareWar) &&
                gift > 0, planned = [
                ...(askSecret ? [secret] : []),
                ...(askGold ? [cash(gift)] : []),
                solidarity(allianceTarget),
            ];
            return {
                asks: planned,
                off: (index) => {
                    const solidarityAsk = index === planned.length - 1;
                    if (!solidarityAsk) {
                        return {};
                    }
                    if (willing.reasons !== 0 ||
                        personRank === 7 ||
                        effective > 2 ||
                        meeting.declareWar) {
                        const paid = actions(negotiation).some((action) => {
                            var _a;
                            return action instanceof Accept_1.default &&
                                ((_a = asks.get(action.proposal())) === null || _a === void 0 ? void 0 : _a.proposal) === proposal;
                        });
                        return { patience: 1, end: !paid };
                    }
                    return null;
                },
                accept: true,
                onAccept: {},
                onDecline: {},
            };
        }
        if (proposal instanceof OfferPeace_1.default) {
            const flags = (0, formulas_1.peaceFlags)({
                level: difficulty,
                targetIsLeader: evaluation.targetIsLeader,
                attitude: meeting.live.value,
                reputation: effective,
                targetFightingAndStrong,
                targetIsPersonsAlly,
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                attack: (0, standing_1.attack)(dependencies, computer),
                personPacifies: (0, wonders_1.pacifies)(dependencies, person),
            });
            if (flags === 0) {
                const harsh = (0, standing_1.vendetta)(dependencies, computer, person) ||
                    effective >= 5 ||
                    evaluation.capturedCities >= 2;
                return plain(false, {}, { patience: harsh ? 1 : 0 });
            }
            const sweeten = (0, formulas_1.asksSweetener)(spent, meeting.live.value, effective, false, false), askSecret = sweeten && (flags & 6) === 0 && found.best !== null, gift = (0, formulas_1.sweetenerGold)((0, standing_2.gold)(dependencies, person), computerStrength, personStrength, rawReputation, false), askGold = sweeten && (flags & 4) === 0 && gift > 0, planned = [
                ...(askSecret ? [secret] : []),
                ...(askGold ? [cash(gift)] : []),
                solidarity(target),
            ];
            return {
                asks: planned,
                off: (index) => {
                    if (index < planned.length - 1) {
                        // A sweetener refused: only the person's Great Wall or United Nations still makes peace (`flags &= 8`).
                        return (flags & 8) !== 0 ? null : {};
                    }
                    if ((flags & 6) !== 0 || personRank === 7 || effective > 3) {
                        const paid = actions(negotiation).some((action) => {
                            var _a;
                            return action instanceof Accept_1.default &&
                                ((_a = asks.get(action.proposal())) === null || _a === void 0 ? void 0 : _a.proposal) === proposal;
                        });
                        return { patience: 1, end: !paid };
                    }
                    return null;
                },
                accept: true,
                onAccept: {},
                onDecline: {},
            };
        }
        if (proposal instanceof AskAlly_1.default ||
            proposal instanceof DemandTribute_1.default ||
            proposal instanceof DemandWithdrawal_1.default) {
            return demand(negotiation, meeting, proposal);
        }
        if (proposal instanceof CancelAlliance_1.default) {
            return plain(true);
        }
        if (proposal instanceof ExchangeKnowledge_1.default) {
            const second = (0, exports.outcomeOf)(proposal).attitude === 1, offer = exchange(meeting, 0, second);
            if (offer.kind === 'offer') {
                return plain(true, {
                    takes: offer.takes,
                    attitude: offer.value,
                    // An exchange made leaves room in the favour menu: one more patience, if there is room (`:2385-2391`).
                    patience: patienceOf(meeting.sides).spent() + 1 < limitOf(meeting) ? 1 : 0,
                });
            }
            if (offer.kind === 'gift') {
                return plain(true, { gives: [offer.advance], patience: 2 });
            }
            if (offer.kind === 'sell') {
                return {
                    asks: [
                        () => new SellAdvance_1.default(offer.advance, new Gold_1.default(offer.price), computer, negotiation, ruleRegistry),
                    ],
                    off: () => ({}),
                    accept: false,
                    onAccept: {},
                    onDecline: {},
                };
            }
            return plain(false, {}, { patience: offer.kind === 'petty' ? 1 : 0 });
        }
        if (proposal instanceof JoinWar_1.default) {
            const against = proposal.against();
            if (!(0, standing_1.inContact)(dependencies, computer, against) ||
                (0, standing_1.atWar)(dependencies, computer, against)) {
                return plain(false);
            }
            const distrust = (0, formulas_1.warDistrust)({
                reputation: effective,
                attack: (0, standing_1.attack)(dependencies, computer),
                vendetta: (0, standing_1.vendetta)(dependencies, computer, person),
                personAtWarWithTarget: (0, standing_1.atWar)(dependencies, person, against),
                targetRank: (0, standing_1.rank)(dependencies, against),
                personRank,
                computerRank,
                allied: alliance,
            }), alliedWithTarget = (0, standing_1.allied)(dependencies, computer, against), willing = (0, formulas_1.joinsWar)(distrust, alliedWithTarget, (0, standing_1.vendetta)(dependencies, computer, person), (0, standing_1.atWar)(dependencies, person, against), personRank, (0, standing_1.rank)(dependencies, against));
            if (!willing) {
                return plain(false);
            }
            // A rich computer player that isn't the target's ally asks two advances instead of gold.
            if (!alliedWithTarget &&
                (0, standing_2.gold)(dependencies, computer) >= 1000 &&
                (0, standing_2.gold)(dependencies, computer) > (0, standing_2.gold)(dependencies, person) &&
                found.best !== null &&
                found.second !== null) {
                return {
                    asks: [
                        () => withOutcome(new DemandTribute_1.default(found.best, computer, negotiation, ruleRegistry), { alsoTakes: [found.second] }),
                    ],
                    off: () => ({}),
                    accept: true,
                    onAccept: { war: true },
                    onDecline: {},
                };
            }
            const price = (0, formulas_1.warPrice)({
                personReputation: rawReputation,
                targetReputation: (0, relations_1.reputation)(dependencies).get(against),
                credit: (0, relations_1.reputation)(dependencies).credit(computer, person),
                computerGold: (0, standing_2.gold)(dependencies, computer),
                personGold: (0, standing_2.gold)(dependencies, person),
                targetStrength: (0, standing_1.strength)(dependencies, against),
                computerTreatyWithTarget: (0, treatyLevel_1.hasTreatyLevel)(dependencies, computer, against, treatyLevel_1.TreatyLevel.Ceasefire),
                computerAlliedWithTarget: alliedWithTarget,
                targetIsLeader: topPower(against),
                personAtWarWithTarget: (0, standing_1.atWar)(dependencies, person, against),
                allied: alliance,
                computerAtWarWithAnyone: dependencies.playerRegistry
                    .entries()
                    .some((third) => (0, standing_1.atWar)(dependencies, computer, third)),
                targetSneakAttackedPerson: (0, flags_1.hasFlag)(dependencies, against, person, flags_1.SNEAK_ATTACK),
                personRank,
                computerRank,
                targetRank: (0, standing_1.rank)(dependencies, against),
                targetNukedPerson: (0, flags_1.hasFlag)(dependencies, against, person, flags_1.NUKED),
                personNukedTarget: (0, flags_1.hasFlag)(dependencies, person, against, flags_1.NUKED),
            });
            return {
                asks: [cash(price)],
                off: () => ({}),
                accept: true,
                onAccept: { war: true },
                onDecline: {},
            };
        }
        if (proposal instanceof ShareMaps_1.default) {
            return plain((0, formulas_1.sharesMaps)({
                allied: alliance,
                personOwnsMapWonder: (0, wonders_1.ownsWonder)(dependencies, person, 'marco-polos-embassy') ||
                    (0, wonders_1.ownsWonder)(dependencies, person, 'magellans-expedition'),
                attitude: meeting.live.value,
                personKnowsMapMaking: (0, standing_1.knows)(dependencies, person, Advances_1.MapMaking),
                computerKnowsMapMaking: (0, standing_1.knows)(dependencies, computer, Advances_1.MapMaking),
            }), { patience: 2 });
        }
        if (proposal instanceof Gift_1.default) {
            const given = proposal.gift();
            if (given instanceof Gold_1.default || given instanceof Advance_1.default) {
                return plain(true);
            }
            const unit = given, terms = (0, units_1.unitTerms)(dependencies, computer, unit), refused = (0, standing_1.cities)(dependencies, computer) === 0 ||
                (0, relations_1.attitudeLevel)(meeting.live.value) > 4 ||
                (0, standing_1.advanceCount)(dependencies, person) <
                    (0, standing_1.advanceCount)(dependencies, computer) ||
                personRank < computerRank ||
                personStrength < computerStrength ||
                terms.obsolete ||
                unit.player() !== person;
            return plain(!refused, { attitude: terms.attitude });
        }
        return plain(false);
    };
    // `diplo_answer_demand` (`:1854-2084`): an ally asked for help (3), tribute (4) or withdrawal (5).
    const demand = (negotiation, meeting, proposal) => {
        const { computer, person } = meeting.sides, evaluation = meeting.evaluation, kind = proposal instanceof AskAlly_1.default
            ? 3
            : proposal instanceof DemandTribute_1.default
                ? 4
                : 5, alliance = (0, standing_1.allied)(dependencies, computer, person), peace = (0, standing_1.atPeace)(dependencies, computer, person), computerRank = (0, standing_1.rank)(dependencies, computer), personRank = (0, standing_1.rank)(dependencies, person), found = (0, survey_1.survey)(dependencies, computer, person), war = { says: exports.DIALOGUE.war, war: true, end: true };
        if (meeting.declareWar ||
            (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.HOSTILE_INTENT | flags_1.BROKEN)) {
            return plain(false, war);
        }
        let fear = kind === 3 && personRank < computerRank
            ? computerRank - personRank
            : meeting.fear, wanted = found.wanted;
        let tribute = Math.min(Math.max(fear, 0), Math.trunc((0, standing_2.gold)(dependencies, computer) / 50)) * 50;
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
        if ((0, wonders_1.pacifies)(dependencies, computer)) {
            tribute = 0;
        }
        if (alliance &&
            wanted !== null &&
            found.personCount + (0, standing_1.level)(dependencies) < found.computerCount &&
            ((0, standing_1.strength)(dependencies, computer) < (0, standing_1.strength)(dependencies, person) ||
                personRank < computerRank)) {
            tribute = 0;
            fear = 1;
        }
        const paid = (0, wonders_1.pacifies)(dependencies, person) && meeting.evaluation.reputation <= 6, withdraws = peace &&
            !alliance &&
            (!((evaluation.initialAggressive || meeting.live.value > 74) &&
                fear === 0 &&
                !paid) ||
                !(governmentIndex(computer) <
                    5 + (drawn(proposal, 'withdraw', random) < 0.5 ? 0 : 1) &&
                    !(0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN) &&
                    meeting.live.value > 25)), patienceSpent = kind === 5 ? 1 : 0;
        if (withdraws && kind === 5) {
            return plain(true, { withdraws: true, patience: patienceSpent });
        }
        const base = { withdraws, patience: patienceSpent };
        if ((tribute === 0 && (wanted === null || fear === 0)) || kind === 5) {
            if (!alliance) {
                const polite = (!evaluation.initialAggressive && meeting.live.value < 76) ||
                    withdraws ||
                    ((fear !== 0 ||
                        paid ||
                        (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN) ||
                        meeting.live.value < 26) &&
                        (!oneIn(proposal, 'war', random, 3) || kind === 5));
                return plain(false, polite ? base : { ...base, ...war });
            }
            // An ally asked: an advance (`diplo_tech_exchange` mode 2 or 3), or sympathy, or a taunt.
            const help = exchange(meeting, patienceOf(meeting.sides).spent() < 2 ? 3 : 2);
            if (help.kind === 'gift') {
                return plain(true, { ...base, gives: [help.advance] });
            }
            const sympathy = (found.personCount < found.computerCount &&
                personRank < computerRank) ||
                personRank < 4;
            if (!sympathy &&
                !(!evaluation.initialAggressive &&
                    meeting.live.value < 51 &&
                    !evaluation.targetIsLeader)) {
                return plain(false, {
                    ...base,
                    says: exports.DIALOGUE.allyTaunts,
                    cancelsAlliance: true,
                    end: true,
                });
            }
            return plain(false, base);
        }
        // It pays: gold, or the advance it values least to lose (`givemore`, `givemoreciv`), and, without peace, a ceasefire.
        const gives = wanted === null ||
            (tribute !== 0 && found.computerCount <= found.personCount)
            ? new Gold_1.default(tribute)
            : wanted;
        return plain(true, { ...base, gives: [gives], ceasefire: !peace });
    };
    const governmentIndex = (player) => {
        const government = (0, senate_1.senateGovernment)(dependencies, player);
        return government === 'democracy' ? 6 : government === 'republic' ? 5 : 0;
    };
    // The person's proposal still being answered (with any asks of the computer player's after it), if any.
    const pending = (negotiation, meeting) => {
        const history = actions(negotiation);
        for (let index = history.length - 1; index >= 0; index--) {
            const action = history[index];
            if (action instanceof Proposal_1.default &&
                !(action instanceof Initiate_1.default) &&
                !(action instanceof Dialogue_1.default) &&
                action.by() === meeting.sides.person &&
                !asks.has(action)) {
                return resolutionOf(negotiation, action) === null ? action : null;
            }
            if (action instanceof Resolution_1.default &&
                action.by() === meeting.sides.computer &&
                action.proposal().by() === meeting.sides.person) {
                return null;
            }
        }
        return null;
    };
    // The computer player's next step in answering `proposal`.
    const respond = (negotiation, meeting, proposal) => {
        const answer = answerTo(negotiation, meeting, proposal), made = actions(negotiation).filter((action) => { var _a; return ((_a = asks.get(action)) === null || _a === void 0 ? void 0 : _a.proposal) === proposal; }), lastAsk = made[made.length - 1], lastResolution = lastAsk === undefined ? null : resolutionOf(negotiation, lastAsk), decline = (outcome) => withOutcome(new Decline_1.default(meeting.sides.computer, proposal, ruleRegistry), outcome), accept = (outcome) => withOutcome(new Accept_1.default(meeting.sides.computer, proposal, ruleRegistry), outcome);
        if (lastAsk !== undefined && lastResolution instanceof Decline_1.default) {
            const off = answer.off(asks.get(lastAsk).index);
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
    const forced = (meeting, proposal) => {
        const { computer, person } = meeting.sides;
        if (!(proposal instanceof OfferCeasefire_1.default || proposal instanceof OfferPeace_1.default) ||
            proposal.by() !== computer) {
            return false;
        }
        if ((0, wonders_1.pacifies)(dependencies, computer)) {
            return false;
        }
        if (proposal instanceof OfferPeace_1.default &&
            meeting.senateBlocked &&
            oneIn(proposal, 'senate', random, 2)) {
            return false;
        }
        return (0, senate_1.senateBlocks)(dependencies, person, computer, 'refuse-offer');
    };
    /** The computer player's next step, or `null` when it's the person's to take. */
    const computerStep = (negotiation) => {
        const meeting = (0, exports.meetingOf)(negotiation);
        if (negotiation.terminated()) {
            return null;
        }
        if (meeting === null) {
            const sides = (0, exports.sidesOf)(dependencies, negotiation);
            return sides !== null && sides.computerLed && last(negotiation) === null
                ? new Initiate_1.default(sides.computer, negotiation, ruleRegistry)
                : null;
        }
        const { computer, person, computerLed } = meeting.sides, action = last(negotiation), end = () => new Terminate_1.default(computer, negotiation, ruleRegistry), patient = () => patienceOf(meeting.sides).spent() < limitOf(meeting);
        if (action === null) {
            return computerLed
                ? new Initiate_1.default(computer, negotiation, ruleRegistry)
                : null;
        }
        // The person asked for an audience (`diplo_meet_refuses_audience`).
        if (action instanceof Initiate_1.default && action.by() === person) {
            const refuses = (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.WAR_THIS_TURN) ||
                (!patient() && (0, flags_1.hasFlag)(dependencies, person, computer, flags_1.MET_THIS_TURN));
            return refuses
                ? new Decline_1.default(computer, action, ruleRegistry)
                : new Accept_1.default(computer, action, ruleRegistry);
        }
        if (action instanceof Decline_1.default && action.proposal() instanceof Initiate_1.default) {
            // Turned away, its Senate may force a treaty (`diplo_meet_senate_forces_treaty`).
            if (action.by() === person && !meeting.declareWar) {
                const war = (0, standing_1.atWar)(dependencies, computer, person), afraid = !(0, standing_1.atPeace)(dependencies, computer, person) && meeting.fear !== 0, already = actions(negotiation).some((step) => step instanceof Dialogue_1.default && step.by() === computer);
                if (!already &&
                    (war || afraid) &&
                    ((0, wonders_1.pacifies)(dependencies, computer) ||
                        (0, senate_1.senateBlocks)(dependencies, person, computer, 'ignore-audience'))) {
                    return say(computer, war ? exports.DIALOGUE.senateForcedCeasefire : exports.DIALOGUE.senateForcedPeace, negotiation);
                }
            }
            return end();
        }
        if (action instanceof Acknowledge_1.default) {
            const key = action.proposal().key();
            if (ENDING.includes(key)) {
                return end();
            }
        }
        // A person's proposal, being answered.
        const answering = pending(negotiation, meeting);
        if (answering !== null) {
            if (action instanceof Proposal_1.default && action.by() === computer) {
                return null;
            }
            return respond(negotiation, meeting, answering);
        }
        // Just answered: what follows, then the menu again while its patience lasts.
        if (action instanceof Resolution_1.default &&
            action.by() === computer &&
            action.proposal().by() === person &&
            !(action.proposal() instanceof Initiate_1.default)) {
            const outcome = (0, exports.outcomeOf)(action);
            if (outcome.says) {
                return say(computer, outcome.says, negotiation);
            }
            if (outcome.end) {
                return end();
            }
            return patient() ? null : end();
        }
        if (action instanceof Proposal_1.default && action.by() === computer) {
            // Its own proposal or dialogue, for the person to answer.
            return null;
        }
        // Its refused ceasefire or peace: overruled by its Great Wall or United Nations (the `Resolved` rules make the
        //  treaty), or perhaps a concession.
        const refusedOffer = action instanceof Decline_1.default &&
            action.by() === person &&
            (action.proposal() instanceof OfferCeasefire_1.default ||
                action.proposal() instanceof OfferPeace_1.default ||
                (action.proposal() instanceof Gift_1.default &&
                    (0, exports.askedFor)(action.proposal()) !== null))
            ? action.proposal() instanceof Gift_1.default
                ? (0, exports.askedFor)(action.proposal())
                : action.proposal()
            : null;
        if (refusedOffer !== null &&
            refusedOffer.by() === computer &&
            !(0, wonders_1.pacifies)(dependencies, computer)) {
            const gift = concession(negotiation, meeting, refusedOffer);
            if (gift !== null) {
                return tag(gift, agendaItems.get(refusedOffer));
            }
            if (refusedOffer instanceof OfferCeasefire_1.default) {
                return tag(say(computer, exports.DIALOGUE.warContinues, negotiation), exports.AGENDA.ceasefire);
            }
        }
        // A call for help refused: a payment to persuade (`:1300-1325`), then the consequences.
        if (action instanceof Decline_1.default &&
            action.by() === person &&
            agendaItems.get(action.proposal()) === exports.AGENDA.callForHelp) {
            const call = action.proposal();
            if (call instanceof JoinWar_1.default) {
                const bonus = (0, exports.helpBonus)(dependencies, computer, call.against());
                if (bonus > 0) {
                    const gift = new Gift_1.default(new Gold_1.default(bonus), computer, negotiation, ruleRegistry);
                    asks.set(gift, { proposal: call, index: 0 });
                    return tag(gift, exports.AGENDA.callForHelp);
                }
            }
            if (meeting.live.value >= 51) {
                return tag(say(computer, exports.DIALOGUE.helpRefused, negotiation), exports.AGENDA.callForHelp);
            }
        }
        if (action instanceof Decline_1.default &&
            action.by() === person &&
            action.proposal() instanceof Gift_1.default &&
            agendaItems.get(action.proposal()) === exports.AGENDA.callForHelp &&
            meeting.live.value >= 51) {
            return tag(say(computer, exports.DIALOGUE.helpRefused, negotiation), exports.AGENDA.callForHelp);
        }
        if (action instanceof Decline_1.default &&
            action.by() === person &&
            agendaItems.get(action.proposal()) === exports.AGENDA.violators) {
            return tag(say(computer, exports.DIALOGUE.violatorsRefused, negotiation), exports.AGENDA.violators);
        }
        const begun = actions(negotiation).some((step) => step instanceof Accept_1.default && step.proposal() instanceof Initiate_1.default);
        if (!begun) {
            return null;
        }
        // An exchange accepted is offered again, as the original's loop does.
        const lastItem = agendaCursor(negotiation, computer), repeat = lastItem === exports.AGENDA.exchange + 1 &&
            action instanceof Accept_1.default &&
            agendaItems.get(action.proposal()) === exports.AGENDA.exchange &&
            action.proposal() instanceof ExchangeKnowledge_1.default;
        if (repeat || lastItem < exports.AGENDA.done) {
            const next = agendaFrom(negotiation, meeting, repeat ? exports.AGENDA.exchange : lastItem);
            if (next !== null) {
                return next;
            }
        }
        // The agenda is done: the menu is the person's while patience lasts.
        return patient() ? null : end();
    };
    // Where the computer player is in its agenda: one past the last item it said.
    const agendaCursor = (negotiation, computer) => actions(negotiation).reduce((cursor, action) => action.by() === computer && agendaItems.has(action)
        ? Math.max(cursor, agendaItems.get(action) + 1)
        : cursor, 0);
    /** The person's possible steps: answers to the computer player, or the menu. */
    const personSteps = (negotiation) => {
        var _a;
        const meeting = (0, exports.meetingOf)(negotiation), sides = (_a = meeting === null || meeting === void 0 ? void 0 : meeting.sides) !== null && _a !== void 0 ? _a : (0, exports.sidesOf)(dependencies, negotiation);
        if (sides === null || negotiation.terminated()) {
            return [];
        }
        const { person, computerLed } = sides, action = last(negotiation);
        if (action === null) {
            return computerLed
                ? []
                : [new Initiate_1.default(person, negotiation, ruleRegistry)];
        }
        if (meeting === null || computerStep(negotiation) !== null) {
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
            const proposal = action, accept = new Accept_1.default(person, proposal, ruleRegistry), refuse = new Decline_1.default(person, proposal, ruleRegistry);
            if (forced(meeting, action)) {
                forcedOffers.add(action);
                return [accept];
            }
            // What the person can't pay is only refused.
            if ((action instanceof DemandTribute_1.default &&
                action.tribute() instanceof Gold_1.default &&
                action.tribute().value() > (0, standing_2.gold)(dependencies, person)) ||
                (action instanceof SellAdvance_1.default &&
                    action.price().value() > (0, standing_2.gold)(dependencies, person))) {
                return [refuse];
            }
            // What costs the person nothing first (civ-clone/web-renderer#674): receiving the emissary, a treaty, an
            //  alliance or a gift taken; a demand, a call to war, an exchange or a sale refused.
            return action instanceof Initiate_1.default ||
                action instanceof OfferPeace_1.default ||
                action instanceof OfferCeasefire_1.default ||
                action instanceof ProposeAlliance_1.default ||
                action instanceof Gift_1.default
                ? [accept, refuse]
                : [refuse, accept];
        }
        return [
            ...menu(negotiation, meeting),
            new Terminate_1.default(person, negotiation, ruleRegistry),
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
exports.talks = talks;
exports.default = exports.talks;
//# sourceMappingURL=talks.js.map