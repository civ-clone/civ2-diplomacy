"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patienceLimit = exports.evaluate = exports.attitudeOf = exports.EIFFEL_TOWER_PATIENCE = exports.PACIFYING_ATTITUDE = void 0;
const flags_1 = require("./flags");
const standing_1 = require("./standing");
const standing_2 = require("@civ-clone/base-diplomacy/lib/standing");
const relations_1 = require("./relations");
const Gold_1 = require("@civ-clone/base-city-yield-gold/Gold");
const wonders_1 = require("./wonders");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
const readers_1 = require("./readers");
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const div = (value, by) => Math.trunc(value / by);
/** How much warmer (lower) a computer player's attitude in talks is to the owner of the Great Wall or the United Nations. */
exports.PACIFYING_ATTITUDE = 10;
/** How many more of the Eiffel Tower's owner's proposals a computer player hears before it ends the meeting. */
exports.EIFFEL_TOWER_PATIENCE = 1;
/** `holder`'s attitude toward `toward`, 50 before one is seeded. */
const attitudeOf = (dependencies) => (holder, toward) => { var _a; return (_a = (0, relations_1.attitude)(dependencies).get(holder, toward)) !== null && _a !== void 0 ? _a : 50; };
exports.attitudeOf = attitudeOf;
const evaluate = (dependencies, computer, other) => {
    const read = (0, readers_1.readers)(dependencies), feelings = (0, exports.attitudeOf)(dependencies), reputations = (0, relations_1.reputation)(dependencies), theirReputation = reputations.get(other), credit = reputations.credit(computer, other), effective = theirReputation - credit, difficulty = (0, standing_1.level)(dependencies), ourRank = (0, standing_1.rank)(dependencies, computer), theirRank = (0, standing_1.rank)(dependencies, other), ourStrength = (0, standing_1.strength)(dependencies, computer), theirStrength = (0, standing_1.strength)(dependencies, other), ourNukes = read.nuclear(computer), theirNukes = read.nuclear(other), alliance = (0, standing_1.allied)(dependencies, computer, other), war = (0, standing_1.atWar)(dependencies, computer, other), holdsVendetta = (0, standing_1.vendetta)(dependencies, computer, other), others = dependencies.playerRegistry
        .entries()
        .filter((player) => player !== computer && player !== other);
    let fear = 0, tribute = 0, aggressive = false, requestMode = 1, targetIsLeader = false, suppressedAggression = false, warTarget = null, peaceInclination = 0, declareWar = false, current = feelings(computer, other);
    // Each land mass (`diplo_stance_continents`).
    const presences = (0, standing_2.presence)(dependencies, computer, other), ours = presences.get(computer), theirs = presences.get(other), ourCities = (0, standing_1.cities)(dependencies, computer), wars = dependencies.playerRegistry
        .entries()
        .filter((player) => (0, standing_1.atWar)(dependencies, other, player)).length, turn = dependencies.turn.value();
    (0, standing_2.landMassesOf)(ours, theirs).forEach((landMass) => {
        const us = (0, standing_2.presenceOn)(ours, landMass), them = (0, standing_2.presenceOn)(theirs, landMass);
        if (us.cities > (ourCities > 1 ? 1 : 0) && us.defence < them.attack) {
            fear += div(them.attack * (difficulty === standing_1.CHIEFTAIN ? 4 : 2), us.defence + 1);
            return;
        }
        if (us.defence !== 0 && them.defence !== 0) {
            aggressive = true;
        }
        if (them.cities === 0) {
            tribute +=
                us.cities === 0
                    ? div(us.attack - them.attack, 4)
                    : div(us.defence - them.attack, 2);
            return;
        }
        tribute +=
            us.cities < 2 && (turn <= 200 - wars * 50 || theirRank > 6 || ourRank > 6)
                ? us.attack
                : us.attack - them.attack;
    });
    // Marco Polo's computer owner asks a quarter more.
    if ((0, wonders_1.ownsWonder)(dependencies, computer, 'marco-polos-embassy')) {
        tribute += div(tribute, 4);
    }
    if (theirRank === 7 &&
        (0, standing_1.cities)(dependencies, other) > 4 &&
        ourCities > 1 &&
        theirNukes === 0 &&
        difficulty !== standing_1.CHIEFTAIN &&
        turn > 200) {
        targetIsLeader = true;
    }
    if ((targetIsLeader || (holdsVendetta && theirStrength < ourStrength * 3)) &&
        theirNukes === 0) {
        tribute = clamp(tribute, ourRank * 2, 9999);
        if (!aggressive) {
            tribute = clamp(tribute, 0, div(div(gold(dependencies, other), 50), 8 - ourRank || 1));
        }
        aggressive = true;
        fear = 0;
        if (current < 76) {
            current = 75;
        }
    }
    if (ourNukes !== 0 && theirNukes === 0) {
        aggressive = true;
        tribute = clamp(tribute, 100, 9999);
    }
    if (theirNukes !== 0 && !alliance) {
        if (ourNukes === 0) {
            fear = (theirReputation >> 1) + 1;
            if (fear < 5) {
                fear = 4;
            }
        }
        else {
            tribute = div(ourNukes * div(tribute, 2), theirNukes);
        }
    }
    fear = div(fear, div(theirReputation - 1, 2) + 1);
    if (alliance) {
        current -= 25;
    }
    if (war) {
        current += 25;
    }
    if (theirReputation !== 0) {
        current += (theirReputation - 1 - credit) * 5;
    }
    if (current < 26) {
        tribute = div(tribute, 2);
        aggressive = false;
    }
    else if ((0, relations_1.attitudeLevel)(current) < 4) {
        tribute = div(tribute * 2, 3);
    }
    else if (current > 74) {
        tribute = div(tribute * 3, 2);
        aggressive = true;
    }
    if ((0, flags_1.hasFlag)(dependencies, computer, other, flags_1.AGGRESSOR)) {
        aggressive = true;
    }
    if (fear !== 0) {
        aggressive = false;
        requestMode = 0;
    }
    if ((0, wonders_1.pacifies)(dependencies, other)) {
        targetIsLeader = false;
        suppressedAggression = aggressive;
        aggressive = false;
        current -= exports.PACIFYING_ATTITUDE;
    }
    if (theirReputation !== 0) {
        tribute += div(theirReputation * tribute, 2);
    }
    if (holdsVendetta) {
        tribute *= 2;
    }
    else if ((0, flags_1.hasFlag)(dependencies, computer, other, flags_1.INCIDENT)) {
        tribute = div(tribute, 4);
    }
    const unitsNearCities = dependencies.cityRegistry
        .getByPlayer(other)
        .some((city) => dependencies.unitRegistry
        .getByPlayer(computer)
        .some((unit) => unit.tile().distanceFrom(city.tile()) < 3));
    if (unitsNearCities) {
        tribute *= 2;
    }
    tribute = clamp(div((difficulty + 1) * tribute, 32), 0, 20) * 50;
    const theirGold = gold(dependencies, other);
    if (tribute > theirGold && tribute < theirGold * 2 && theirGold > 49) {
        tribute = div(theirGold, 50) * 50;
    }
    if (tribute === 0 || ourStrength * 3 < theirStrength) {
        aggressive = false;
    }
    if (!aggressive) {
        if (alliance) {
            requestMode = 0;
        }
    }
    else {
        requestMode = 2;
    }
    const initialAggressive = aggressive;
    if (holdsVendetta) {
        peaceInclination = -2;
    }
    if (theirReputation !== 0) {
        peaceInclination -= div(theirReputation - 1, 2);
    }
    // The other players (`diplo_stance_other_civs`).
    let strongest = -1;
    others.forEach((third) => {
        if ((0, standing_1.allied)(dependencies, computer, third)) {
            if (ourRank < theirRank) {
                peaceInclination--;
            }
            if (theirRank === 7 &&
                (0, standing_1.cities)(dependencies, other) > 4 &&
                turn > 200 &&
                difficulty !== standing_1.CHIEFTAIN &&
                (0, standing_1.inContact)(dependencies, third, other)) {
                if (fear === 0) {
                    if ((0, standing_1.atWar)(dependencies, third, other) &&
                        !(0, wonders_1.pacifies)(dependencies, other)) {
                        aggressive = true;
                    }
                }
                else {
                    fear = clamp(fear - 4, 0, 99);
                }
            }
        }
        if ((0, standing_1.hostile)(dependencies, computer, third, feelings)) {
            const thirdStrength = (0, standing_1.strength)(dependencies, third);
            if (thirdStrength * 4 - ourStrength !== 0 &&
                ourStrength <= thirdStrength * 4) {
                peaceInclination++;
            }
            if (ourStrength < thirdStrength) {
                peaceInclination++;
            }
            if ((0, standing_1.inContact)(dependencies, other, third) &&
                !(0, standing_1.atWar)(dependencies, other, third)) {
                warTarget = third;
            }
            if ((0, standing_1.atWar)(dependencies, computer, third) && thirdStrength > strongest) {
                strongest = thirdStrength;
            }
        }
    });
    peaceInclination -= (0, standing_1.attack)(dependencies, computer);
    if (theirStrength < ourStrength) {
        peaceInclination--;
    }
    if (((0, standing_1.hostile)(dependencies, computer, other, feelings) ? 1 : 0) <
        peaceInclination &&
        !targetIsLeader &&
        !alliance &&
        !(0, flags_1.hasFlag)(dependencies, computer, other, flags_1.AGGRESSOR)) {
        aggressive = false;
    }
    const capturedCities = dependencies.cityRegistry
        .getByPlayer(other)
        .filter((city) => city.originalPlayer() === computer).length;
    if ((!war || capturedCities > 4) &&
        !alliance &&
        (aggressive || (suppressedAggression && effective > 6 && holdsVendetta)) &&
        (ourStrength < theirStrength || holdsVendetta || effective > 6)) {
        declareWar = true;
    }
    if (declareWar) {
        aggressive = false;
        requestMode = 0;
        if (current > 29) {
            current = 30;
        }
    }
    if (fear === 0 && current < 2) {
        current = 1;
    }
    if (!war && current > 98) {
        current = 99;
    }
    if ((alliance || requestMode === 0) && current > 73) {
        current = 74;
    }
    if (war && current < 27) {
        current = 26;
    }
    return {
        attitude: current,
        fear,
        tribute,
        aggressive,
        suppressedAggression,
        requestMode,
        targetIsLeader,
        warTarget,
        peaceInclination,
        declareWar,
        capturedCities,
        unitsNearCities,
        reputation: effective,
        initialAggressive,
        turnsSinceContact: (() => {
            const last = (0, lastContact_1.lastContact)(dependencies, computer, other);
            return last === undefined ? Infinity : turn - last;
        })(),
    };
};
exports.evaluate = evaluate;
/** `diplo_patience_limit`: how many proposals the computer player hears from `other` before it ends the meeting. */
const patienceLimit = (dependencies, computer, other, talksAttitude) => {
    let limit = 2;
    if (talksAttitude < 25) {
        limit = 3;
    }
    if (talksAttitude > 60) {
        limit--;
    }
    if ((0, wonders_1.ownsWonder)(dependencies, other, 'eiffel-tower')) {
        limit += exports.EIFFEL_TOWER_PATIENCE;
    }
    if ((0, standing_1.atPeace)(dependencies, computer, other)) {
        limit++;
    }
    if ((0, standing_1.allied)(dependencies, computer, other)) {
        limit += 2;
    }
    if ((0, standing_1.atWar)(dependencies, computer, other)) {
        limit = 2;
    }
    return limit;
};
exports.patienceLimit = patienceLimit;
const gold = (dependencies, player) => {
    try {
        return dependencies.playerTreasuryRegistry
            .getByPlayerAndType(player, Gold_1.default)
            .value();
    }
    catch (e) {
        return 0;
    }
};
//# sourceMappingURL=evaluate.js.map