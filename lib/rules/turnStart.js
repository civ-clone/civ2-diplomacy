"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loseContact = exports.turnStartRules = exports.civsMeet = exports.civsMeetAlliance = exports.allyJoinWar = exports.swapAdvances = exports.feelsSecure = exports.breakTreaties = exports.driftAttitude = exports.attitudeDelta = exports.countIncidents = exports.borderIntruders = exports.incidentWeight = exports.clearOwnMarks = exports.intruding = exports.RuleIds = void 0;
const flags_1 = require("../flags");
const standing_1 = require("../standing");
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const effects_1 = require("../effects");
const relations_1 = require("../relations");
const formulas_1 = require("../formulas");
const standing_2 = require("@civ-clone/base-diplomacy/lib/standing");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const wonders_1 = require("../wonders");
const Contact_1 = require("@civ-clone/base-diplomacy-interaction-contact/Contact");
const Vendetta_1 = require("@civ-clone/library-diplomacy/Declarations/Vendetta");
const callForHelp_1 = require("../callForHelp");
const embassy_1 = require("@civ-clone/base-diplomacy/lib/embassy");
const declareWar_2 = require("@civ-clone/base-diplomacy/lib/declareWar");
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Peace_1 = require("@civ-clone/base-diplomacy-declaration-peace/Peace");
const TreatyFlagsRecord_1 = require("../../Records/TreatyFlagsRecord");
const TurnStart_1 = require("@civ-clone/core-player/Rules/TurnStart");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
const evaluate_1 = require("../evaluate");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const senate_1 = require("../senate");
const advances_1 = require("@civ-clone/civ2-science/data/advances");
const survey_1 = require("../survey");
const readers_1 = require("../readers");
const border_1 = require("../border");
// The start of each player's turn (OpenCiv2 `civ_turn_update_diplomacy`, `civ.cpp:7040-7245`; `game.cpp:1689-1704`).
/** The rule ids that civ2-enhanced supersedes. */
exports.RuleIds = {
    attitudeDrift: 'civ2-diplomacy:player/turn-start/attitude-drift',
    borderIntruders: 'civ2-diplomacy:player/turn-start/border-intruders',
    treatyBreaking: 'civ2-diplomacy:player/turn-start/treaty-breaking',
};
const barbarian = (player) => {
    try {
        return (0, isBarbarian_1.default)(player);
    }
    catch (e) {
        return false;
    }
};
/** Every other player of the game, but the barbarians. */
const othersOf = (dependencies, player) => dependencies.playerRegistry
    .entries()
    .filter((other) => other !== player && !barbarian(other));
// The border incidents counted at the start of a computer player's turn, for its attitude drift: the weight toward
//  each person, kept for the turn (`diplo_count_border_intruders`, `diplo_review_border_incident`).
const incidents = new WeakMap();
const marksByGame = new WeakMap();
const marksOf = (dependencies) => {
    var _a;
    const key = dependencies.unitRegistry, marks = (_a = marksByGame.get(key)) !== null && _a !== void 0 ? _a : { units: new WeakMap(), generation: 0 };
    marksByGame.set(key, marks);
    return marks;
};
const marked = (dependencies, unit) => {
    const marks = marksOf(dependencies);
    return marks.units.get(unit) === marks.generation;
};
const mark = (dependencies, unit) => {
    const marks = marksOf(dependencies);
    marks.units.set(unit, marks.generation);
};
/** Whether the unit with `id` of `player`'s is marked as intruding now. */
const intruding = (dependencies, player) => {
    const units = dependencies.unitRegistry.getByPlayer(player);
    return (id) => units.some((unit) => unit.id() === id && marked(dependencies, unit));
};
exports.intruding = intruding;
// A review with no incident clears every unit's mark.
const clearMarks = (dependencies) => {
    marksOf(dependencies).generation++;
};
/** The start of `player`'s turn clears its own units' marks (`units_reset_for_turn`, `unit.cpp:978`). */
const clearOwnMarks = (dependencies, player) => {
    const marks = marksOf(dependencies);
    dependencies.unitRegistry
        .getByPlayer(player)
        .forEach((unit) => marks.units.delete(unit));
};
exports.clearOwnMarks = clearOwnMarks;
/** The drift's starting value for `computer` toward `intruder` this turn, if `border-intruders` counted an incident. */
const incidentWeight = (computer, intruder) => { var _a; return (_a = incidents.get(computer)) === null || _a === void 0 ? void 0 : _a.get(intruder); };
exports.incidentWeight = incidentWeight;
/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): `intruder`'s units on the land squares of `holder`'s cities'
 *  radius, out of a city, on a square whose first unit is `intruder`'s. Each military unit counts (settlers,
 *  diplomats and trade units don't), once (`UNITF_BORDER_INTRUDER`); a unit warned before (`UNITF_BORDER_WARNED`,
 *  saved: `lib/border`) is a repeat offence, as is a city with more than 3. Allies don't count. With `everySquare`
 *  false (the original, B4) only the first such square of each city is looked at.
 */
const borderIntruders = (dependencies, holder, intruder, everySquare) => {
    const intrusion = { weight: 0, repeat: 0, units: [] };
    if ((0, standing_1.allied)(dependencies, holder, intruder)) {
        return intrusion;
    }
    const improvementWeight = (tile) => {
        var _a, _b;
        return ((_b = (_a = dependencies.tileImprovementRegistry) === null || _a === void 0 ? void 0 : _a.getByTile(tile)) !== null && _b !== void 0 ? _b : []).reduce((weight, improvement) => {
            const name = improvement.constructor.name;
            return (weight +
                (name === 'Fortress'
                    ? 2
                    : ['Road', 'Railroad', 'Mine', 'Irrigation'].includes(name)
                        ? 1
                        : 0));
        }, 0);
    };
    dependencies.cityRegistry.getByPlayer(holder).forEach((city) => {
        const squares = (() => {
            try {
                return city.tiles().entries();
            }
            catch (e) {
                return [];
            }
        })();
        let intruders = 0;
        for (const tile of squares) {
            if (tile === city.tile() ||
                tile.isWater() ||
                dependencies.cityRegistry.getByTile(tile) !== null) {
                continue;
            }
            const [first] = dependencies.unitRegistry.getByTile(tile);
            if (first === undefined || first.player() !== intruder) {
                continue;
            }
            dependencies.unitRegistry
                .getByTile(tile)
                .filter((unit) => unit.player() === intruder &&
                unit.attack().value() > 0 &&
                !marked(dependencies, unit))
                .forEach((unit) => {
                if ((0, border_1.warned)(dependencies, unit)) {
                    intrusion.repeat++;
                }
                else {
                    (0, border_1.warn)(dependencies, unit);
                }
                mark(dependencies, unit);
                intrusion.units.push(unit);
                intruders++;
                intrusion.weight += 1 + improvementWeight(tile);
            });
            if (!everySquare) {
                break;
            }
        }
        if (intruders > 3) {
            intrusion.repeat++;
        }
    });
    return intrusion;
};
exports.borderIntruders = borderIntruders;
// The treaties signed last turn, noted at the start of a computer player's turn before its marks are cleared
//  (`diplo_recent_peace_table`, `civ.cpp:7077-7079`).
const recentPeace = new WeakMap();
/**
 * The border incidents `computer` counts at the start of its turn (`diplo_review_border_incident`, `:6418-6515`),
 *  toward each person it is in contact with (counted, marking and warning units, even at war, but only
 *  reviewed when neither):
 *
 * - without peace: the incident's weight starts the drift; with repeat offences (and a vendetta counting as one) above
 *   2 less the person's reputation, a roll of the reputation + repeats over 1 sets hostile intent both ways;
 * - at peace: a first offence starts the drift at the weight less 1; a repeat makes it demand at its next audience
 *   that the units counted leave, or war (`WITHDRAWAL_DEMANDED`, an incident, `civ2-diplomacy:audience-due`);
 * - a treaty signed last turn, or (at peace) contact in the last 2 turns, counts no incident.
 *
 * With a person reviewed and no incident, every unit's intruder mark is cleared. `everySquare` as `borderIntruders`.
 */
const countIncidents = (dependencies, computer, everySquare, random = Math.random, engine = null) => {
    const counted = new Map(), turn = dependencies.turn.value(), recent = (person) => {
        var _a, _b;
        return (_b = (_a = recentPeace.get(computer)) === null || _a === void 0 ? void 0 : _a.has(person)) !== null && _b !== void 0 ? _b : (0, flags_1.hasFlag)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN);
    };
    let incident = false;
    // Every person it is in contact with is reviewed (`civ.cpp:7202-7205`); the count marks and warns their units even
    //  at war (not an ally's: `borderIntruders`), and is then set aside (`diplo_review_border_incident`, `:6430-6432`).
    const reviewed = othersOf(dependencies, computer).filter((person) => (0, standing_1.human)(dependencies, person) && (0, standing_1.inContact)(dependencies, computer, person));
    reviewed.forEach((person) => {
        const intrusion = (0, exports.borderIntruders)(dependencies, computer, person, everySquare);
        if (intrusion.weight === 0 ||
            (0, standing_1.allied)(dependencies, computer, person) ||
            (0, standing_1.atWar)(dependencies, computer, person)) {
            return;
        }
        if (!(0, treatyLevel_1.hasTreatyLevel)(dependencies, computer, person, treatyLevel_1.TreatyLevel.Peace)) {
            if (recent(person)) {
                incident = true;
                return;
            }
            let repeat = intrusion.repeat;
            if ((0, standing_1.vendetta)(dependencies, computer, person)) {
                repeat++;
            }
            const odds = (0, relations_1.reputation)(dependencies).get(person) + repeat;
            if (odds > 2 && (0, formulas_1.roll)(random, odds) > 1) {
                (0, flags_1.setBoth)(dependencies, computer, person, flags_1.HOSTILE_INTENT);
            }
            counted.set(person, intrusion.weight);
            return;
        }
        const last = (0, lastContact_1.lastContact)(dependencies, computer, person);
        if (recent(person) ||
            (last !== undefined && last < turn && turn - last < 3)) {
            incident = true;
            return;
        }
        if (intrusion.repeat === 0) {
            incident = true;
            counted.set(person, intrusion.weight - 1);
            return;
        }
        (0, border_1.noteIntruders)(dependencies, computer, person, intrusion.units);
        (0, flags_1.setFlag)(dependencies, computer, person, flags_1.WITHDRAWAL_DEMANDED | flags_1.INCIDENT);
        engine === null || engine === void 0 ? void 0 : engine.emit('civ2-diplomacy:audience-due', computer, person);
    });
    // A review with no incident clears the marks; with no person to review, there was no review.
    if (reviewed.length > 0 && !incident) {
        clearMarks(dependencies);
    }
    incidents.set(computer, counted);
};
exports.countIncidents = countIncidents;
/**
 * `diplo_review_attitude_delta` (`diplomacy.cpp:6517`): how much colder `computer` grows toward `person` this turn,
 *  starting from `start` (the border incidents' weight, or, in the original with none, a stale value: see
 *  `attitude-drift`).
 */
const attitudeDelta = (dependencies, computer, person, start) => {
    const nuclear = (player) => (0, readers_1.default)(dependencies).nuclear(player), players = dependencies.playerRegistry
        .entries()
        .filter((player) => !barbarian(player)), feelings = (0, evaluate_1.attitudeOf)(dependencies), personAdvances = (0, standing_1.advanceCount)(dependencies, person), computerAdvances = (0, standing_1.advanceCount)(dependencies, computer), personStrength = (0, standing_1.strength)(dependencies, person), computerStrength = (0, standing_1.strength)(dependencies, computer), personRank = (0, standing_1.rank)(dependencies, person), computerRank = (0, standing_1.rank)(dependencies, computer), turn = dependencies.turn.value(), difficulty = (0, standing_1.level)(dependencies), alliance = (0, standing_1.allied)(dependencies, computer, person), effectiveReputation = (0, relations_1.reputation)(dependencies).get(person) -
        (0, relations_1.reputation)(dependencies).credit(computer, person);
    let delta = start, hostileCount = 0, aheadCount = 0, warScore = 0;
    players.forEach((third) => {
        if (personAdvances < (0, standing_1.advanceCount)(dependencies, third)) {
            aheadCount++;
        }
        if (third !== computer &&
            (0, standing_1.hostile)(dependencies, computer, third, feelings)) {
            hostileCount++;
        }
        if (third !== person && (0, standing_1.atWar)(dependencies, third, person)) {
            warScore += personStrength < (0, standing_1.strength)(dependencies, third) ? 2 : 1;
        }
    });
    if (alliance) {
        if (hostileCount === 0) {
            if ((0, standing_2.gold)(dependencies, computer) < (0, standing_2.gold)(dependencies, person)) {
                delta++;
            }
            if (computerAdvances < personAdvances && difficulty !== standing_1.CHIEFTAIN) {
                delta++;
            }
            if (personAdvances < computerAdvances) {
                delta--;
            }
            if (computerStrength < personStrength) {
                delta++;
            }
            if (personStrength < computerStrength) {
                delta--;
            }
        }
        else if ((0, standing_1.attack)(dependencies, computer) < 1 || hostileCount > 1) {
            delta -= Math.max(1, hostileCount - (0, standing_1.attack)(dependencies, computer) - 1);
        }
        if (computerAdvances + 8 < personAdvances) {
            delta++;
        }
    }
    if ((0, standing_1.atPeace)(dependencies, computer, person)) {
        delta -= 2;
    }
    if (!(0, standing_1.atWar)(dependencies, computer, person)) {
        delta--;
    }
    if (personRank < 7 && turn > 200) {
        let rankAdjust = 7 - personRank;
        if (turn < 400) {
            rankAdjust = (rankAdjust + 1) >> 1;
        }
        delta -= rankAdjust;
    }
    if (personRank === 7 &&
        (0, standing_1.cities)(dependencies, person) > 3 &&
        turn > 200 &&
        difficulty !== standing_1.CHIEFTAIN) {
        let rankAdjust = Math.trunc(difficulty / 3) + 1;
        if (effectiveReputation <= warScore &&
            !(0, standing_1.vendetta)(dependencies, computer, person)) {
            rankAdjust >>= 1;
        }
        delta += rankAdjust;
    }
    // Nuclear weapons: the person's make it warmer, more so to one without (`:6592-6597`).
    if (nuclear(person) > 0) {
        const less = delta - 1;
        delta = nuclear(computer) === 0 && less > 0 ? delta - 2 : less;
    }
    const temper = Math.max(-2, (0, standing_1.attack)(dependencies, computer) * 3 + (0, standing_1.expand)(dependencies, computer) * 2);
    let rankDifference = personRank - computerRank;
    if (rankDifference < 0 || !alliance) {
        rankDifference = Math.trunc(rankDifference / 2);
    }
    delta += temper + rankDifference;
    // Its own weakness, unless the computer players are ganging up on a person who earned it (`:6608-6619`).
    if ((0, standing_1.gangUpLeader)(dependencies, nuclear) === null ||
        (effectiveReputation <= warScore &&
            !(0, standing_1.vendetta)(dependencies, computer, person))) {
        if (computerStrength * 4 < personStrength) {
            delta--;
        }
        if (computerStrength * 2 < personStrength) {
            delta--;
        }
        if (Math.trunc((computerStrength * 3) / 2) < personStrength) {
            delta--;
        }
    }
    if (!alliance) {
        if (personStrength < computerStrength) {
            delta++;
        }
        if (personStrength * 2 < computerStrength) {
            delta++;
        }
    }
    if ((0, wonders_1.pacifies)(dependencies, person)) {
        delta = delta < 1 ? delta - 1 : delta >> 1;
    }
    if (aheadCount === 0) {
        delta++;
    }
    if (computerAdvances < personAdvances) {
        delta += 1 - (0, standing_1.civilize)(dependencies, computer);
    }
    if ((0, standing_1.atWar)(dependencies, computer, person) && delta < 1) {
        delta = 0;
    }
    if ((0, wonders_1.ownsWonder)(dependencies, computer, 'eiffel-tower')) {
        delta++;
    }
    if ((0, wonders_1.ownsWonder)(dependencies, person, 'eiffel-tower')) {
        if (delta > 0) {
            delta = Math.trunc(delta / 2);
        }
        delta = delta - 1 > -1 ? delta - 2 : delta - 1;
    }
    if (!(0, standing_1.inContact)(dependencies, computer, person)) {
        delta = 0;
    }
    return delta;
};
exports.attitudeDelta = attitudeDelta;
/**
 * The attitude drift (`diplo_ai_review_relations`, `diplomacy.cpp:6683`): each turn a computer player's attitude to
 *  each person it is in contact with moves by `attitudeDelta`, starting from the border incidents' weight. With no
 *  incident, the original (Classic) starts from a stale value on the stack that the clamp turns into 100: the attitude
 *  is pinned at its coldest except on turns with an incident (B3). `fromZero` starts it at 0, as OpenCiv2's fix does
 *  (civ2-enhanced).
 */
const driftAttitude = (dependencies, computer, fromZero) => othersOf(dependencies, computer)
    .filter((person) => (0, standing_1.human)(dependencies, person) && (0, standing_1.inContact)(dependencies, computer, person))
    .forEach((person) => {
    const weight = (0, exports.incidentWeight)(computer, person), attitudes = (0, relations_1.attitude)(dependencies);
    if (weight === undefined && !fromZero) {
        attitudes.set(computer, person, 100, 'drift');
        return;
    }
    const start = weight !== null && weight !== void 0 ? weight : 0;
    attitudes.adjust(computer, person, (0, exports.attitudeDelta)(dependencies, computer, person, start), 'drift');
});
exports.driftAttitude = driftAttitude;
/**
 * A computer player that means to break its treaty with another (`HOSTILE_INTENT`) does so one time in
 *  `breakChance(reputation)` (`civ.cpp:7085-7110`): a ceasefire or peace ends; an ally is 100 colder instead. The
 *  original (Classic) ends it on the computer player's side only and says nothing (B37): here it ends without a word.
 *  `openly` announces it, as OpenCiv2's fix does (civ2-enhanced).
 */
const breakTreaties = (dependencies, computer, random, engine, openly) => othersOf(dependencies, computer)
    .filter((other) => (0, flags_1.hasFlag)(dependencies, computer, other, flags_1.HOSTILE_INTENT))
    .forEach((other) => {
    if ((0, formulas_1.roll)(random, (0, formulas_1.breakChance)((0, relations_1.reputation)(dependencies).get(other))) !== 0) {
        return;
    }
    (0, flags_1.clearFlag)(dependencies, computer, other, flags_1.HOSTILE_INTENT);
    if ((0, standing_1.allied)(dependencies, computer, other)) {
        (0, relations_1.attitude)(dependencies).adjust(computer, other, 100, 'hostile-intent');
        // No contact since: an audience is due (`last_contact_turn = -1`, `civ.cpp:7117`).
        (0, lastContact_1.recordContact)(dependencies, computer, other, -1);
        return;
    }
    const turn = dependencies.turn.value(), last = (0, lastContact_1.lastContact)(dependencies, computer, other);
    // `0x80840`: the aggressor, for long, and its treaty broken; contact no later than 8 turns ago.
    (0, flags_1.setFlag)(dependencies, computer, other, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG | flags_1.BROKEN);
    (0, lastContact_1.recordContact)(dependencies, computer, other, last === undefined || last < 0 ? turn - 8 : Math.max(last, turn - 8));
    [Ceasefire_1.default, Peace_1.default].forEach((Type) => (0, declareWar_1.activeDeclarations)(dependencies, Type, computer, other).forEach((declaration) => openly
        ? declaration.expire(computer)
        : (0, effects_1.expireSilently)(declaration, computer)));
    if (openly) {
        engine.emit('civ2-diplomacy:treaty-broken', computer, other);
    }
});
exports.breakTreaties = breakTreaties;
/** `diplo_ai_feels_secure` (`diplomacy.cpp:5452`), in part: whether `player` feels safe from `other`. */
const feelsSecure = (dependencies, player, other, nuclear) => {
    if ((0, flags_1.hasFlag)(dependencies, player, other, flags_1.AGGRESSOR) ||
        (0, standing_1.vendetta)(dependencies, player, other)) {
        return true;
    }
    const feelings = (0, evaluate_1.attitudeOf)(dependencies), others = othersOf(dependencies, player).filter((third) => third !== other);
    for (const third of others) {
        if (!(0, standing_1.human)(dependencies, third)) {
            continue;
        }
        if ((0, standing_1.hostile)(dependencies, player, third, feelings) &&
            (0, standing_1.strength)(dependencies, other) < (0, standing_1.strength)(dependencies, third) &&
            !(0, standing_1.allied)(dependencies, third, other)) {
            return false;
        }
        if ((0, standing_1.hostile)(dependencies, other, third, feelings) &&
            (0, standing_1.strength)(dependencies, player) < (0, standing_1.strength)(dependencies, third) &&
            !(0, standing_1.allied)(dependencies, third, player)) {
            return false;
        }
    }
    if (nuclear(player) < nuclear(other)) {
        return false;
    }
    let security = 0;
    others.forEach((third) => {
        if ((0, standing_1.hostile)(dependencies, player, third, feelings)) {
            security++;
        }
        if ((0, standing_1.allied)(dependencies, player, third) &&
            (0, standing_1.allied)(dependencies, other, third) &&
            (0, standing_1.human)(dependencies, third)) {
            security +=
                (0, standing_1.rank)(dependencies, player) < (0, standing_1.rank)(dependencies, third) &&
                    (0, standing_1.rank)(dependencies, other) < (0, standing_1.rank)(dependencies, third)
                    ? 2
                    : 1;
        }
        if ((0, standing_1.allied)(dependencies, player, third) &&
            (0, standing_1.atWar)(dependencies, other, third) &&
            (0, standing_1.human)(dependencies, third)) {
            security--;
        }
        if ((0, standing_1.rank)(dependencies, third) === 7 &&
            dependencies.turn.value() > 199 &&
            (0, standing_1.atWar)(dependencies, other, third)) {
            security--;
        }
    });
    if (!(0, standing_1.hostile)(dependencies, player, other, feelings)) {
        security++;
    }
    if ((0, standing_1.allied)(dependencies, player, other)) {
        security++;
    }
    const presences = (0, standing_2.presence)(dependencies, player, other), ours = presences.get(player), theirs = presences.get(other);
    let sharedCities = 0, ourAttack = 0, theirStrength = 1;
    for (const landMass of (0, standing_2.landMassesOf)(ours, theirs)) {
        const us = (0, standing_2.presenceOn)(ours, landMass), them = (0, standing_2.presenceOn)(theirs, landMass);
        if (us.cities !== 0 && us.attack + us.defence < them.attack) {
            return false;
        }
        if (us.attack !== 0 && them.defence !== 0) {
            ourAttack += us.attack;
            theirStrength += (them.attack >> 1) + them.defence;
            sharedCities += us.cities;
        }
    }
    return !(Math.trunc((ourAttack << 2) / theirStrength) <
        security - (0, standing_1.attack)(dependencies, player) + 4 && sharedCities !== 0);
};
exports.feelsSecure = feelsSecure;
/**
 * `diplo_ai_swap_advances` (`diplomacy.cpp:5560`): two computer players each give the other the advance it values
 *  most (with a roll of 0 to 2 added), when both have one; an ally far behind gets one for nothing.
 */
const swapAdvances = (dependencies, player, other, random) => {
    // The advance `to` values most of those `from` knows and it lacks, a roll of 0 to 2 added to each, in RULES.TXT's
    //  order, the first of the best (`:5590-5620`).
    const best = (from, to) => {
        let chosen, chosenValue = -Infinity;
        advances_1.advances.forEach(([Type, first, second]) => {
            if ((first === advances_1.NEVER && second === advances_1.NEVER) ||
                (0, standing_1.knows)(dependencies, to, Type) ||
                !(0, standing_1.knows)(dependencies, from, Type)) {
                return;
            }
            const value = (0, survey_1.advanceValue)(dependencies, to, Type) + (0, formulas_1.roll)(random, 3);
            if (chosen === undefined || chosenValue < value) {
                chosen = Type;
                chosenValue = value;
            }
        });
        return chosen;
    }, toPlayer = best(other, player), toOther = best(player, other), difficulty = (0, standing_1.level)(dependencies), learn = (to, Type) => dependencies.playerResearchRegistry.getByPlayer(to).addAdvance(Type);
    if (toPlayer !== undefined && toOther !== undefined) {
        learn(player, toPlayer);
        learn(other, toOther);
        return true;
    }
    const farBehind = (behind, ahead) => (0, standing_1.advanceCount)(dependencies, behind) + (6 - difficulty) * 2 <
        (0, standing_1.advanceCount)(dependencies, ahead);
    // One way, to an ally far behind, once a round (`TREATY_TRIBUTE`).
    if (toPlayer !== undefined &&
        (0, standing_1.allied)(dependencies, player, other) &&
        farBehind(player, other) &&
        !(0, flags_1.hasFlag)(dependencies, player, other, flags_1.TRIBUTE)) {
        (0, flags_1.setBoth)(dependencies, player, other, flags_1.TRIBUTE);
        learn(player, toPlayer);
        return true;
    }
    if (toOther !== undefined &&
        (0, standing_1.allied)(dependencies, other, player) &&
        farBehind(other, player) &&
        !(0, flags_1.hasFlag)(dependencies, other, player, flags_1.TRIBUTE)) {
        (0, flags_1.setBoth)(dependencies, player, other, flags_1.TRIBUTE);
        learn(other, toOther);
        return true;
    }
    return false;
};
exports.swapAdvances = swapAdvances;
// Whether a person would learn of a pact between `player` and `other` against `target` (`diplomacy.cpp:6003-6011`): an
//  embassy with either, the United Nations or Marco Polo's, or `target` a person in contact with either.
const personKnows = (dependencies, player, other, target) => dependencies.playerRegistry
    .entries()
    .some((person) => (0, standing_1.human)(dependencies, person) &&
    ((0, embassy_1.hasEmbassy)(dependencies, person, player) ||
        (0, embassy_1.hasEmbassy)(dependencies, person, other) ||
        (0, wonders_1.ownsWonder)(dependencies, person, 'united-nations') ||
        (0, wonders_1.ownsWonder)(dependencies, person, 'marco-polos-embassy'))) ||
    ((0, standing_1.human)(dependencies, target) &&
        ((0, standing_1.inContact)(dependencies, target, player) ||
            (0, standing_1.inContact)(dependencies, target, other)));
/**
 * `diplo_ally_join_war(player, against, ally)` (`diplomacy.cpp:5650`): `player` joins `ally`'s war on `against`,
 *  unless it is allied with or at war with it already. With `ally` not at war with `against`, a shared vendetta becomes
 *  hostile intent for both. Against a person it holds no vendetta against, it joins only when it last met them 6 or
 *  more turns in the future (as the original's sum reads: so in effect never) or, at rank 7, one time in 3.
 */
const allyJoinWar = (dependencies, player, against, ally, random) => {
    var _a;
    if ((0, standing_1.allied)(dependencies, player, against) ||
        (0, standing_1.atWar)(dependencies, player, against)) {
        return false;
    }
    if (!(0, standing_1.atWar)(dependencies, ally, against)) {
        if ((0, standing_1.vendetta)(dependencies, player, against) &&
            (0, standing_1.vendetta)(dependencies, ally, against)) {
            (0, flags_1.setFlag)(dependencies, player, against, flags_1.HOSTILE_INTENT);
            (0, flags_1.setFlag)(dependencies, ally, against, flags_1.HOSTILE_INTENT);
        }
        return false;
    }
    if ((0, standing_1.human)(dependencies, against)) {
        if (!(0, standing_1.vendetta)(dependencies, player, against)) {
            const last = (_a = (0, lastContact_1.lastContact)(dependencies, against, player)) !== null && _a !== void 0 ? _a : -1;
            if (last - dependencies.turn.value() < 6) {
                return false;
            }
            if ((0, standing_1.rank)(dependencies, against) < 7 && (0, formulas_1.roll)(random, 3) !== 0) {
                return false;
            }
        }
        (0, lastContact_1.recordContact)(dependencies, against, player, dependencies.turn.value());
        (0, lastContact_1.recordContact)(dependencies, against, ally, dependencies.turn.value());
    }
    (0, effects_1.declareWarQuietly)(dependencies, player, against);
    return true;
};
exports.allyJoinWar = allyJoinWar;
/**
 * `diplo_civs_meet_alliance` (`diplomacy.cpp:5908`): two computer players at peace ally against a third, or end their
 *  alliance when there's none worth it. The target: a person who leads the world (rank 7, 5 or more cities, after turn
 *  200, not on Chieftain); else, when they were allied already (and neither leads a much weaker one), a player neither
 *  has peace with; else one both are hostile to and rank no higher than. With no target, or other alliances and no
 *  reason, the alliance ends. A new alliance brings both into the target's wars if a person would learn of it; against
 *  a person that doesn't join, the target has an incident with each.
 */
const civsMeetAlliance = (dependencies, player, other, random, engine) => {
    const wasAllied = (0, standing_1.allied)(dependencies, player, other), difficulty = (0, standing_1.level)(dependencies), feelings = (0, evaluate_1.attitudeOf)(dependencies), playerRank = (0, standing_1.rank)(dependencies, player), otherRank = (0, standing_1.rank)(dependencies, other);
    let firstOrAllied = wasAllied, leaderGap = false;
    if ((playerRank === 7 && otherRank > 3) ||
        (otherRank === 7 && playerRank > 3)) {
        firstOrAllied = false;
        leaderGap = true;
    }
    let alliedCount = 0, target = null, targetLeader = false;
    for (const third of othersOf(dependencies, player).filter((p) => p !== other)) {
        if ((0, standing_1.allied)(dependencies, player, third) ||
            (0, standing_1.allied)(dependencies, other, third)) {
            alliedCount++;
            continue;
        }
        targetLeader =
            (0, standing_1.human)(dependencies, third) &&
                (0, standing_1.rank)(dependencies, third) === 7 &&
                difficulty !== standing_1.CHIEFTAIN &&
                (0, standing_1.cities)(dependencies, third) >= 5 &&
                dependencies.turn.value() >= 201;
        if (targetLeader) {
            target = third;
            break;
        }
        if (difficulty === standing_1.CHIEFTAIN) {
            continue;
        }
        if (firstOrAllied) {
            if (!(0, standing_1.atPeace)(dependencies, player, third) &&
                !(0, standing_1.atPeace)(dependencies, other, third)) {
                target = third;
                break;
            }
        }
        else if (!leaderGap &&
            (0, standing_1.hostile)(dependencies, player, third, feelings) &&
            playerRank <= (0, standing_1.rank)(dependencies, third) &&
            (0, standing_1.hostile)(dependencies, other, third, feelings) &&
            otherRank <= (0, standing_1.rank)(dependencies, third)) {
            target = third;
            break;
        }
    }
    if (target === null ||
        ((!targetLeader || (0, relations_1.reputation)(dependencies).get(target) < alliedCount) &&
            alliedCount !== 0 &&
            !firstOrAllied)) {
        if (wasAllied) {
            (0, declareWar_2.cancelAlliance)(dependencies, player, other);
            engine.emit('civ2-diplomacy:computers-ended-alliance', player, other);
        }
        return;
    }
    if (!wasAllied) {
        let joined = false;
        if (personKnows(dependencies, player, other, target)) {
            // Both join, as the original's `|` has them (`:6031-6033`).
            const first = (0, exports.allyJoinWar)(dependencies, player, target, other, random), second = (0, exports.allyJoinWar)(dependencies, other, target, player, random);
            joined = first || second;
        }
        if ((0, standing_1.human)(dependencies, target) && !joined) {
            if (!(0, standing_1.atWar)(dependencies, player, target)) {
                (0, flags_1.setBoth)(dependencies, player, target, flags_1.INCIDENT);
                // The original tests `player`'s war twice here (`:6039-6044`).
                (0, flags_1.setBoth)(dependencies, other, target, flags_1.INCIDENT);
            }
        }
    }
    (0, effects_1.makeTreatyPeace)(dependencies, player, other);
    (0, declareWar_2.makeAlliance)(dependencies, player, other);
    if (!wasAllied) {
        engine.emit('civ2-diplomacy:computers-allied', player, other, target);
    }
};
exports.civsMeetAlliance = civsMeetAlliance;
/**
 * `diplo_civs_meet` for two computer players (`diplomacy.cpp:6114-6200`), when their units meet: contact (first
 *  contact a change this turn); every fourth turn for the pair, or at first contact, if either doesn't feel secure from
 *  the other, or the other owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't
 *  start a war with it, they swap advances and make peace, or, at peace, see to their alliance; otherwise, at first
 *  contact or not at war, war: a person allied with either is called to help (`diplo_ally_demand_help`), and a vendetta
 *  becomes the aggressor's mark.
 */
const civsMeet = (dependencies, player, other, { random, nuclear, republican, engine }) => {
    const first = !(0, standing_1.inContact)(dependencies, player, other), players = dependencies.playerRegistry.entries();
    if (first) {
        (0, makeContact_1.default)(dependencies.interactionRegistry, player, other, dependencies.ruleRegistry, dependencies.turn);
    }
    (0, flags_1.setBoth)(dependencies, player, other, flags_1.RECENT_CONTACT);
    if ((dependencies.turn.value() +
        players.indexOf(player) +
        players.indexOf(other)) %
        4 !==
        0 &&
        !first) {
        return;
    }
    const settles = (one, two) => !(0, exports.feelsSecure)(dependencies, one, two, nuclear) ||
        (0, wonders_1.pacifies)(dependencies, two) ||
        (republican(one) && !(0, flags_1.hasFlag)(dependencies, one, two, flags_1.AGGRESSOR));
    if (settles(player, other) && settles(other, player)) {
        (0, exports.swapAdvances)(dependencies, player, other, random);
        if (!(0, standing_1.atPeace)(dependencies, player, other)) {
            (0, effects_1.makeTreatyPeace)(dependencies, player, other);
            engine.emit('civ2-diplomacy:computers-made-peace', player, other);
        }
        else {
            (0, exports.civsMeetAlliance)(dependencies, player, other, random, engine);
        }
        return;
    }
    if ((0, standing_1.atWar)(dependencies, player, other) && !first) {
        return;
    }
    // `diplo_civs_meet_war` (`:6050`): a person allied with either, not allied with or at war with the other, is called.
    players
        .filter((person) => (0, standing_1.human)(dependencies, person))
        .forEach((person) => {
        [
            [player, other],
            [other, player],
        ].forEach(([caller, enemy]) => {
            if ((0, standing_1.allied)(dependencies, caller, person) &&
                !(0, standing_1.allied)(dependencies, person, enemy) &&
                !(0, standing_1.atWar)(dependencies, person, enemy) &&
                !(0, exports.feelsSecure)(dependencies, caller, enemy, nuclear)) {
                (0, callForHelp_1.callAlly)(dependencies, caller, person, enemy);
                engine.emit('civ2-diplomacy:audience-due', caller, person);
            }
        });
    });
    (0, effects_1.declareWarQuietly)(dependencies, player, other);
    // A vendetta is cleared both ways and becomes the aggressor's mark (`:6100-6104`).
    if ((0, standing_1.vendetta)(dependencies, player, other)) {
        (0, declareWar_1.activeDeclarations)(dependencies, Vendetta_1.default, player, other).forEach((held) => held.expire(player));
        (0, flags_1.setFlag)(dependencies, player, other, flags_1.AGGRESSOR);
    }
    engine.emit('civ2-diplomacy:computers-went-to-war', player, other);
};
exports.civsMeet = civsMeet;
/**
 * The start of each player's turn:
 *
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared (`civ.cpp:7080`).
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next
 *   audience, due after 15 turns without contact or after an incident (`civ2-diplomacy:audience-due`). The audience
 *   itself ends any ceasefire too (`Rules/talks`); until the hosts open audiences on that event, this rule ends it.
 * - `<prefix>:player/turn-start/computer-pairs` (`civ.cpp:7130-7240`): toward each other computer player, the tribute
 *   mark is cleared; every 32 turns an aggressor mark lapses unless it was for long; every 16 turns without recent
 *   contact, unallied pairs at peace meet if the computer players are ganging up on someone, allies swap advances, and
 *   contact lapses (and with it any war) between pairs neither of which is the aggressor; every 8 turns allies without
 *   recent contact swap advances.
 * - `RuleIds.borderIntruders`: the border incidents (`countIncidents`), the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: at the start of the turn of the person the computer players gang up on
 *   (`gangUpLeader`), each with more than one city that isn't its ally, if the person's reputation is above three
 *   times its wars + 3 or it holds a vendetta: without a treaty, contact and 1 colder; with one, one time in 32 per
 *   level + 1, hostile intent.
 * - `<prefix>:player/turn-start/reputation-recovery`: a reputation recovers on schedule.
 */
const turnStartRules = (prefix, dependencies, { random, nuclear, republican, engine }) => {
    const computer = new Criterion_1.default((player) => !(0, standing_1.human)(dependencies, player) && !barbarian(player)), turn = () => dependencies.turn.value();
    return [
        new TurnStart_1.default(`${prefix}:player/turn-start/turn-flags`, new Effect_1.default((player) => {
            const records = dependencies.interactionRegistry
                .getByPlayer(player)
                .filter((interaction) => interaction instanceof TreatyFlagsRecord_1.default &&
                interaction.holder() === player);
            recentPeace.set(player, new Set(records
                .filter((record) => (record.value() & flags_1.CHANGED_THIS_TURN) !== 0)
                .map((record) => record.toward())));
            records.forEach((record) => (0, flags_1.clearFlag)(dependencies, player, record.toward(), flags_1.TURN_BITS));
            (0, border_1.forgetWarnings)(dependencies, player, (0, exports.intruding)(dependencies, player));
            (0, exports.clearOwnMarks)(dependencies, player);
        })),
        new TurnStart_1.default(`${prefix}:player/turn-start/senate`, new Effect_1.default((player) => (0, senate_1.rollSenate)(dependencies, player, random))),
        new TurnStart_1.default(`${prefix}:player/turn-start/patience`, computer, new Criterion_1.default(() => turn() % 3 === 0), new Effect_1.default((player) => othersOf(dependencies, player).forEach((other) => {
            const kept = (0, patience_1.patience)(dependencies, player, other);
            if (kept.spent() > 0) {
                kept.spend(-1);
            }
        }))),
        new TurnStart_1.default(exports.RuleIds.treatyBreaking, computer, new Effect_1.default((player) => (0, exports.breakTreaties)(dependencies, player, random, engine, false))),
        new TurnStart_1.default(`${prefix}:player/turn-start/ceasefire-expiry`, computer, new Effect_1.default((player) => othersOf(dependencies, player)
            .filter((person) => (0, standing_1.human)(dependencies, person) &&
            (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, player, person)
                .length > 0)
            .forEach((person) => {
            const last = (0, lastContact_1.lastContact)(dependencies, player, person);
            if (last !== undefined &&
                last >= 0 &&
                turn() - last <= 15 &&
                !(0, flags_1.hasFlag)(dependencies, player, person, flags_1.INCIDENT)) {
                return;
            }
            (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, player, person).forEach((ceasefire) => ceasefire.expire(player));
            (0, flags_1.clearBoth)(dependencies, player, person, flags_1.CEASEFIRE_LINGERS | flags_1.TRIBUTE);
            (0, lastContact_1.recordContact)(dependencies, player, person, turn());
            engine.emit('civ2-diplomacy:ceasefire-expired', player, person);
            engine.emit('civ2-diplomacy:audience-due', player, person);
        }))),
        new TurnStart_1.default(`${prefix}:player/turn-start/computer-pairs`, computer, new Effect_1.default((player) => othersOf(dependencies, player)
            .filter((other) => !(0, standing_1.human)(dependencies, other))
            .forEach((other) => {
            (0, flags_1.clearFlag)(dependencies, player, other, flags_1.TRIBUTE);
            if (turn() % 32 === 0) {
                if (!(0, flags_1.hasFlag)(dependencies, player, other, flags_1.AGGRESSOR_LONG)) {
                    (0, flags_1.clearFlag)(dependencies, player, other, flags_1.AGGRESSOR);
                }
                (0, flags_1.clearFlag)(dependencies, player, other, flags_1.AGGRESSOR_LONG);
            }
            const recent = (0, flags_1.hasFlag)(dependencies, player, other, flags_1.RECENT_CONTACT);
            if (turn() % 16 === 0) {
                if (recent) {
                    (0, flags_1.clearFlag)(dependencies, player, other, flags_1.RECENT_CONTACT);
                    return;
                }
                if (!(0, standing_1.allied)(dependencies, player, other)) {
                    if ((0, treatyLevel_1.hasTreatyLevel)(dependencies, player, other, treatyLevel_1.TreatyLevel.Peace) &&
                        (0, standing_1.gangUpLeader)(dependencies, nuclear) !== null) {
                        (0, exports.civsMeet)(dependencies, player, other, {
                            random,
                            nuclear,
                            republican,
                            engine,
                        });
                        // The lapse clears the recent mark after (`civ.cpp:7186`).
                        (0, flags_1.clearFlag)(dependencies, player, other, flags_1.RECENT_CONTACT);
                    }
                }
                else {
                    (0, exports.swapAdvances)(dependencies, player, other, random);
                }
                if ((0, standing_1.inContact)(dependencies, player, other) &&
                    !(0, flags_1.hasFlag)(dependencies, player, other, flags_1.AGGRESSOR) &&
                    !(0, flags_1.hasFlag)(dependencies, other, player, flags_1.AGGRESSOR)) {
                    (0, exports.loseContact)(dependencies, player, other);
                    engine.emit('civ2-diplomacy:contact-lapsed', player, other);
                }
                return;
            }
            if (turn() % 8 === 0 &&
                (0, standing_1.allied)(dependencies, player, other) &&
                !recent) {
                (0, exports.swapAdvances)(dependencies, player, other, random);
            }
        }))),
        new TurnStart_1.default(exports.RuleIds.borderIntruders, computer, new Effect_1.default((player) => (0, exports.countIncidents)(dependencies, player, false, random, engine))),
        new TurnStart_1.default(exports.RuleIds.attitudeDrift, computer, new Effect_1.default((player) => (0, exports.driftAttitude)(dependencies, player, false))),
        new TurnStart_1.default(`${prefix}:player/turn-start/gang-up`, new Criterion_1.default((player) => (0, standing_1.gangUpLeader)(dependencies, nuclear) === player), new Effect_1.default((player) => {
            const wars = othersOf(dependencies, player).filter((other) => (0, standing_1.atWar)(dependencies, player, other)).length, bad = (0, formulas_1.gangsUp)((0, relations_1.reputation)(dependencies).get(player), wars), difficulty = (0, standing_1.level)(dependencies);
            othersOf(dependencies, player)
                .filter((other) => !(0, standing_1.human)(dependencies, other) &&
                (0, standing_1.cities)(dependencies, other) > 1 &&
                (bad || (0, standing_1.vendetta)(dependencies, other, player)) &&
                !(0, standing_1.allied)(dependencies, other, player))
                .forEach((other) => {
                if (!(0, treatyLevel_1.hasTreatyLevel)(dependencies, other, player, treatyLevel_1.TreatyLevel.Ceasefire)) {
                    (0, makeContact_1.default)(dependencies.interactionRegistry, other, player, dependencies.ruleRegistry, dependencies.turn);
                    (0, relations_1.attitude)(dependencies).adjust(other, player, 1, 'gang-up');
                    return;
                }
                if ((0, formulas_1.roll)(random, 32) <= difficulty) {
                    (0, flags_1.setFlag)(dependencies, other, player, flags_1.HOSTILE_INTENT);
                }
            });
        })),
        new TurnStart_1.default(`${prefix}:player/turn-start/reputation-recovery`, new Effect_1.default((player) => {
            const reputations = (0, relations_1.reputation)(dependencies), current = reputations.get(player);
            if (!(0, formulas_1.reputationRecovers)(turn(), (0, standing_1.level)(dependencies), current, (0, wonders_1.ownsWonder)(dependencies, player, 'eiffel-tower'))) {
                return;
            }
            const now = reputations.adjust(player, -1, 'recovery');
            if ((0, standing_1.human)(dependencies, player)) {
                othersOf(dependencies, player).forEach((observer) => {
                    const credit = reputations.credit(observer, player);
                    if (credit > now || credit < 0) {
                        reputations.setCredit(observer, player, Math.min(Math.max(credit, 0), now));
                    }
                });
            }
        })),
    ];
};
exports.turnStartRules = turnStartRules;
/**
 * Two players lose contact (`diplo_clear_treaty_flags(civ, civ2, 1)`): their `Contact` goes, and with it any war,
 *  and the marks of one; their treaties stay.
 */
const loseContact = (dependencies, player, other) => {
    (0, declareWar_1.activeDeclarations)(dependencies, War_1.default, player, other).forEach((war) => (0, effects_1.expireSilently)(war, player));
    (0, flags_1.clearBoth)(dependencies, player, other, flags_1.AGGRESSOR | flags_1.SNEAK_ATTACK);
    dependencies.interactionRegistry
        .getByPlayers(player, other)
        .filter((interaction) => interaction instanceof Contact_1.default)
        .forEach((contact) => dependencies.interactionRegistry.unregister(contact));
};
exports.loseContact = loseContact;
//# sourceMappingURL=turnStart.js.map