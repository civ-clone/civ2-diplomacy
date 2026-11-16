"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnStartRules = exports.computersMeet = exports.swapAdvances = exports.feelsSecure = exports.breakTreaties = exports.driftAttitude = exports.attitudeDelta = exports.borderIntruders = exports.incidentWeight = exports.RuleIds = void 0;
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
const Ceasefire_1 = require("@civ-clone/base-diplomacy-declaration-ceasefire/Ceasefire");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Peace_1 = require("@civ-clone/base-diplomacy-declaration-peace/Peace");
const TreatyFlagsRecord_1 = require("../../Records/TreatyFlagsRecord");
const TurnStart_1 = require("@civ-clone/core-player/Rules/TurnStart");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
const evaluate_1 = require("../evaluate");
const knowledge_1 = require("@civ-clone/base-diplomacy/lib/knowledge");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const senate_1 = require("../senate");
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
//  each person, kept for the turn (`diplo_count_border_intruders`).
const incidents = new WeakMap();
/** The weight of `intruder`'s units inside `computer`'s borders this turn, if `border-intruders` counted any. */
const incidentWeight = (computer, intruder) => { var _a; return (_a = incidents.get(computer)) === null || _a === void 0 ? void 0 : _a.get(intruder); };
exports.incidentWeight = incidentWeight;
/**
 * `diplo_count_border_intruders` (`diplomacy.cpp:5327`): each military unit of `intruder` on a land square of one of
 *  `holder`'s cities' radius, not in a city, counts 1, 1 more on a road, a railroad, a mine or irrigation, 2 more in a
 *  fortress. Allies don't count. With `everySquare` false (the original, B4) only the first intruded square of each
 *  city is looked at.
 */
const borderIntruders = (dependencies, holder, intruder, everySquare) => {
    if ((0, standing_1.allied)(dependencies, holder, intruder)) {
        return 0;
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
    let count = 0;
    dependencies.cityRegistry.getByPlayer(holder).forEach((city) => {
        const squares = (() => {
            try {
                return city.tiles().entries();
            }
            catch (e) {
                return [];
            }
        })();
        for (const tile of squares) {
            if (tile === city.tile() ||
                tile.isWater() ||
                dependencies.cityRegistry.getByTile(tile) !== null) {
                continue;
            }
            const units = dependencies.unitRegistry
                .getByTile(tile)
                .filter((unit) => unit.player() === intruder && unit.attack().value() > 0);
            if (units.length === 0) {
                continue;
            }
            count += units.length * (1 + improvementWeight(tile));
            if (!everySquare) {
                break;
            }
        }
    });
    return count;
};
exports.borderIntruders = borderIntruders;
/**
 * `diplo_review_attitude_delta` (`diplomacy.cpp:6517`): how much colder `computer` grows toward `person` this turn,
 *  starting from `start` (the border incidents' weight, or, in the original with none, a stale value: see
 *  `attitude-drift`).
 */
const attitudeDelta = (dependencies, computer, person, start) => {
    const players = dependencies.playerRegistry
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
    const temper = Math.max(-2, (0, standing_1.attack)(dependencies, computer) * 3 + (0, standing_1.expand)(dependencies, computer) * 2);
    let rankDifference = personRank - computerRank;
    if (rankDifference < 0 || !alliance) {
        rankDifference = Math.trunc(rankDifference / 2);
    }
    delta += temper + rankDifference;
    if (computerStrength * 4 < personStrength) {
        delta--;
    }
    if (computerStrength * 2 < personStrength) {
        delta--;
    }
    if (Math.trunc((computerStrength * 3) / 2) < personStrength) {
        delta--;
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
    attitudes.adjust(computer, person, (0, exports.attitudeDelta)(dependencies, computer, person, weight !== null && weight !== void 0 ? weight : 0), 'drift');
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
        return;
    }
    const turn = dependencies.turn.value(), last = (0, lastContact_1.lastContact)(dependencies, computer, other);
    (0, flags_1.setFlag)(dependencies, computer, other, flags_1.AGGRESSOR);
    (0, lastContact_1.recordContact)(dependencies, computer, other, last === undefined || last > turn - 8 ? turn - 8 : last);
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
    const best = (from, to) => {
        var _a;
        return (_a = (0, effects_1.advancesWanted)(dependencies, from, to)
            .map((advance) => ({
            advance,
            value: (0, effects_1.advanceValue)(dependencies, to, advance) + (0, formulas_1.roll)(random, 3),
        }))
            .sort((a, b) => b.value - a.value)[0]) === null || _a === void 0 ? void 0 : _a.advance;
    }, toPlayer = best(other, player), toOther = best(player, other), difficulty = (0, standing_1.level)(dependencies);
    if (toPlayer !== undefined && toOther !== undefined) {
        (0, knowledge_1.give)(dependencies, toPlayer, other, player);
        (0, knowledge_1.give)(dependencies, toOther, player, other);
        return true;
    }
    const farBehind = (behind, ahead) => (0, standing_1.advanceCount)(dependencies, behind) + (6 - difficulty) * 2 <
        (0, standing_1.advanceCount)(dependencies, ahead);
    if (toPlayer !== undefined &&
        (0, standing_1.allied)(dependencies, player, other) &&
        farBehind(player, other)) {
        (0, knowledge_1.give)(dependencies, toPlayer, other, player);
        return true;
    }
    if (toOther !== undefined &&
        (0, standing_1.allied)(dependencies, player, other) &&
        farBehind(other, player)) {
        (0, knowledge_1.give)(dependencies, toOther, player, other);
        return true;
    }
    return false;
};
exports.swapAdvances = swapAdvances;
/**
 * Two computer players meeting (`diplo_civs_meet`, `diplomacy.cpp:6114`), every fourth turn for each pair in contact
 *  (`(turn + a + b) & 3`, here by their order in the game): if either doesn't feel secure from the other, or the other
 *  owns the Great Wall or the United Nations, or is a Republic or a Democracy that didn't start it, they swap advances
 *  and make peace; otherwise, unless they're at war already, war.
 */
const computersMeet = (dependencies, player, other, random, nuclear, republican, engine) => {
    const settles = (one, two) => !(0, exports.feelsSecure)(dependencies, one, two, nuclear) ||
        (0, wonders_1.pacifies)(dependencies, two) ||
        (republican(one) && !(0, flags_1.hasFlag)(dependencies, one, two, flags_1.AGGRESSOR));
    if (settles(player, other) && settles(other, player)) {
        (0, exports.swapAdvances)(dependencies, player, other, random);
        if (!(0, standing_1.atPeace)(dependencies, player, other)) {
            (0, effects_1.signPeace)(dependencies, player, other);
            engine.emit('civ2-diplomacy:computers-made-peace', player, other);
        }
        return;
    }
    if (!(0, standing_1.atWar)(dependencies, player, other)) {
        (0, effects_1.declareWarQuietly)(dependencies, player, other);
        engine.emit('civ2-diplomacy:computers-went-to-war', player, other);
    }
};
exports.computersMeet = computersMeet;
/**
 * The start of each player's turn:
 *
 * - `<prefix>:player/turn-start/turn-flags`: this turn's bits are cleared.
 * - `<prefix>:player/turn-start/senate`: the Senate's roll.
 * - `<prefix>:player/turn-start/patience`: every third turn a computer player's patience recovers by 1.
 * - `RuleIds.treatyBreaking`: a computer player breaks a treaty it means to, without a word (B37).
 * - `<prefix>:player/turn-start/ceasefire-expiry`: a ceasefire with a person ends at the computer player's next audience,
 *   which is due after 15 turns without contact or after an incident; the audience is announced
 *   (`civ2-diplomacy:audience-due`).
 * - `<prefix>:player/turn-start/computers-meet`: two computer players in contact meet (`computersMeet`); every 16 turns
 *   two at war that haven't met lose contact and their war ends; every 8 turns allies swap advances.
 * - `RuleIds.borderIntruders`: the border incidents, the first intruded square of each city (B4).
 * - `RuleIds.attitudeDrift`: the attitude drift, pinned at 100 without an incident (B3).
 * - `<prefix>:player/turn-start/gang-up`: a person whose reputation is above three times its wars + 3 is ganged up on.
 * - `<prefix>:player/turn-start/reputation-recovery`: a reputation recovers on schedule.
 */
const turnStartRules = (prefix, dependencies, { random, nuclear, republican, engine }) => {
    const computer = new Criterion_1.default((player) => !(0, standing_1.human)(dependencies, player) && !barbarian(player)), turn = () => dependencies.turn.value();
    return [
        new TurnStart_1.default(`${prefix}:player/turn-start/turn-flags`, new Effect_1.default((player) => dependencies.interactionRegistry
            .getByPlayer(player)
            .filter((interaction) => interaction instanceof TreatyFlagsRecord_1.default &&
            interaction.holder() === player)
            .forEach((record) => (0, flags_1.clearFlag)(dependencies, player, record.toward(), flags_1.TURN_BITS)))),
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
                turn() - last <= 15 &&
                !(0, flags_1.hasFlag)(dependencies, player, person, flags_1.INCIDENT)) {
                return;
            }
            (0, declareWar_1.activeDeclarations)(dependencies, Ceasefire_1.default, player, person).forEach((ceasefire) => ceasefire.expire(player));
            (0, flags_1.clearFlag)(dependencies, player, person, flags_1.INCIDENT);
            (0, lastContact_1.recordContact)(dependencies, player, person, turn());
            engine.emit('civ2-diplomacy:ceasefire-expired', player, person);
            engine.emit('civ2-diplomacy:audience-due', player, person);
        }))),
        new TurnStart_1.default(`${prefix}:player/turn-start/computers-meet`, computer, new Effect_1.default((player) => {
            const players = dependencies.playerRegistry.entries(), index = players.indexOf(player);
            othersOf(dependencies, player)
                .filter((other) => !(0, standing_1.human)(dependencies, other) &&
                players.indexOf(other) > index &&
                (0, standing_1.inContact)(dependencies, player, other))
                .forEach((other) => {
                const last = (0, lastContact_1.lastContact)(dependencies, player, other);
                if (turn() % 16 === 0) {
                    // No recent contact: two at war, neither the aggressor, lose touch and their war ends.
                    if ((last === undefined || turn() - last >= 16) &&
                        !(0, standing_1.allied)(dependencies, player, other) &&
                        (0, standing_1.atWar)(dependencies, player, other) &&
                        !(0, flags_1.hasFlag)(dependencies, player, other, flags_1.AGGRESSOR) &&
                        !(0, flags_1.hasFlag)(dependencies, other, player, flags_1.AGGRESSOR)) {
                        (0, declareWar_1.activeDeclarations)(dependencies, War_1.default, player, other).forEach((war) => war.expire(player));
                        engine.emit('civ2-diplomacy:contact-lapsed', player, other);
                        return;
                    }
                    if ((0, standing_1.allied)(dependencies, player, other)) {
                        (0, exports.swapAdvances)(dependencies, player, other, random);
                    }
                }
                else if (turn() % 8 === 0 &&
                    (0, standing_1.allied)(dependencies, player, other) &&
                    (last === undefined || turn() - last >= 8)) {
                    (0, exports.swapAdvances)(dependencies, player, other, random);
                }
                if ((turn() + index + players.indexOf(other)) % 4 !== 0) {
                    return;
                }
                (0, exports.computersMeet)(dependencies, player, other, random, nuclear, republican, engine);
                (0, lastContact_1.recordContact)(dependencies, player, other, turn());
            });
        })),
        new TurnStart_1.default(exports.RuleIds.borderIntruders, computer, new Effect_1.default((player) => {
            const counted = new Map();
            othersOf(dependencies, player)
                .filter((person) => (0, standing_1.human)(dependencies, person) &&
                !(0, treatyLevel_1.hasTreatyLevel)(dependencies, player, person, treatyLevel_1.TreatyLevel.Peace) &&
                !(0, standing_1.atWar)(dependencies, player, person))
                .forEach((person) => {
                const weight = (0, exports.borderIntruders)(dependencies, player, person, false);
                if (weight > 0) {
                    counted.set(person, weight);
                }
            });
            incidents.set(player, counted);
        })),
        new TurnStart_1.default(exports.RuleIds.attitudeDrift, computer, new Effect_1.default((player) => (0, exports.driftAttitude)(dependencies, player, false))),
        new TurnStart_1.default(`${prefix}:player/turn-start/gang-up`, new Criterion_1.default((player) => (0, standing_1.human)(dependencies, player)), new Effect_1.default((player) => {
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
//# sourceMappingURL=turnStart.js.map