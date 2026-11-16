"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roll = exports.breakChance = exports.gangsUp = exports.startingAttitude = exports.reputationRecovers = exports.reputationCost = exports.senateSteps = exports.senateThreshold = exports.giftGold = exports.sellPrice = exports.joinsWar = exports.warDistrust = exports.warPrice = exports.sharesMaps = exports.demandAttitude = exports.demandedTribute = exports.asksSweetener = exports.sweetenerGold = exports.peaceFlags = exports.allianceWilling = exports.goldAttitudeValue = void 0;
const standing_1 = require("./standing");
const relations_1 = require("./relations");
// Civilization II's talks as plain arithmetic, from OpenCiv2 `src/auto/diplomacy.cpp` (Classic), each a function of
//  plain numbers so a test can sit either side of every threshold. The rows (`lib/talks`) gather the numbers from the
//  game. In the original's code `civ` is the computer player and `civ2` the person; here they are `computer` and
//  `person`, and "reputation" is the person's less the computer player's credit, unless it says otherwise.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const div = (value, by) => Math.trunc(value / by);
/** `diplo_gold_attitude_value` (`:1352`): what gold is worth in attitude, the first 50 at 1 in 10, then each 100 less. */
const goldAttitudeValue = (gold) => {
    let value = 0, divisor = 10, step = 50;
    while (gold > 0) {
        value += div(clamp(gold, 0, step), divisor);
        divisor += 5;
        gold -= step;
        step = 100;
    }
    return value;
};
exports.goldAttitudeValue = goldAttitudeValue;
/**
 * `diplo_alliance_willing` (`:1374`): whether the computer player will ally with the person, and why (bits: 1 the war
 *  target is the person's ally, 2 the target is fighting it and strong, 4 a common enemy).
 */
const allianceWilling = (inputs) => {
    let score = inputs.hasWarTarget ? 0 : 1, reasons = 0;
    if (inputs.level < standing_1.PRINCE) {
        score--;
    }
    if (inputs.computerRank < 5 && inputs.personRank < 5) {
        if (inputs.level > standing_1.WARLORD && inputs.personAllies === 0) {
            score--;
        }
        score--;
    }
    if (inputs.personRank < inputs.computerRank) {
        if (inputs.computerRank > 5) {
            score++;
        }
        if (inputs.computerRank > 6) {
            score++;
        }
        if (inputs.personRank < 6 &&
            inputs.computerStrength < inputs.personStrength) {
            score--;
        }
    }
    if (!inputs.targetIsLeader) {
        if (inputs.personRank - inputs.computerRank > 2) {
            score--;
        }
    }
    else {
        score++;
    }
    if (inputs.fear !== 0) {
        score--;
    }
    let agree = inputs.level === standing_1.CHIEFTAIN ||
        ((0, relations_1.attitudeLevel)(inputs.attitude) < 4 && score < inputs.peaceInclination);
    if (inputs.personRank === 7 && inputs.personAllies !== 0) {
        agree = false;
    }
    if (inputs.reputation > (inputs.level === standing_1.CHIEFTAIN ? 4 : 2)) {
        agree = false;
    }
    if (inputs.personRank < 4 && inputs.personRank * 20 < inputs.turn) {
        agree = true;
    }
    if (inputs.targetFightingAndStrong) {
        agree = true;
        reasons = 2;
    }
    if (reasons === 0 &&
        inputs.commonEnemy &&
        inputs.personRank < 7 &&
        inputs.computerRank < 7 &&
        inputs.turn > 99 &&
        inputs.personAllies < 7 - inputs.personRank &&
        (0, relations_1.attitudeLevel)(inputs.attitude) < 5) {
        agree = true;
        reasons |= 4;
    }
    if (inputs.vendetta || inputs.reputation > 4) {
        agree = false;
    }
    if (inputs.targetIsPersonsAlly) {
        agree = true;
        reasons |= 1;
    }
    if (inputs.attitude > 75) {
        agree = false;
    }
    if (inputs.patienceSpent > 4 && inputs.level !== standing_1.CHIEFTAIN) {
        agree = false;
    }
    return { agree, reasons };
};
exports.allianceWilling = allianceWilling;
/**
 * `diplo_answer_peace`'s willingness (`:1673-1720`): 0 refuses, otherwise bits: 1 willing, 2 and 4 the war target's
 *  reasons, 8 the person's Great Wall or United Nations.
 */
const peaceFlags = (inputs) => {
    let flags = !inputs.targetIsLeader &&
        inputs.attitude < 51 &&
        inputs.reputation <= (inputs.level === standing_1.CHIEFTAIN ? 6 : 4)
        ? 1
        : 0;
    if (inputs.targetFightingAndStrong) {
        flags = 3;
    }
    if (inputs.targetIsPersonsAlly) {
        flags |= 4;
    }
    if ((inputs.vendetta && inputs.reputation > 2 - inputs.attack) ||
        inputs.reputation > 6) {
        flags = 0;
    }
    if (inputs.attitude > 75) {
        flags = 0;
    }
    if (inputs.personPacifies) {
        flags |= 8;
    }
    return flags;
};
exports.peaceFlags = peaceFlags;
/**
 * The gold a computer player asks before it signs (`:1563-1580` for an alliance, `:1773-1790` for peace): its share of
 *  the person's gold, by strength, plus the reputation (twice over for an alliance), in 50s, doubled when it is the
 *  weaker, then cut to what the person has. 0 for none.
 */
const sweetenerGold = (personGold, computerStrength, personStrength, personReputation, alliance) => {
    const units = div(div(personGold, 50) * computerStrength, computerStrength + personStrength + 1) +
        personReputation * (alliance ? 2 : 1);
    let offer = units * (computerStrength < personStrength ? 100 : 50);
    while (personGold < offer) {
        offer -= 50;
    }
    return Math.max(offer, 0);
};
exports.sweetenerGold = sweetenerGold;
/** Whether a sweetener is asked at all: patience spent, a cold attitude, or any reputation (`:1530-1535`, `:1752`). */
const asksSweetener = (patienceSpent, attitude, reputation, declareWar, alliance) => alliance
    ? patienceSpent > 1 || attitude > 25 || reputation !== 0 || declareWar
    : patienceSpent > 1 || attitude > 50 || reputation > 1;
exports.asksSweetener = asksSweetener;
/** `diplo_answer_demand`'s tribute (`:1878-1905`): the gold the computer player gives the person, 0 for none. */
const demandedTribute = (inputs) => {
    const fear = inputs.proposal === 3 && inputs.personRank < inputs.computerRank
        ? inputs.computerRank - inputs.personRank
        : inputs.fear;
    let tribute = clamp(fear, 0, div(inputs.computerGold, 50)) * 50;
    if (inputs.turnsSinceContact < 8) {
        tribute = 0;
    }
    if (inputs.turnsSinceContact < 16) {
        tribute = div(tribute, 2);
    }
    if (!inputs.atPeace) {
        tribute = div(tribute, 2);
    }
    if (inputs.computerPacifies) {
        tribute = 0;
    }
    return tribute;
};
exports.demandedTribute = demandedTribute;
/** The attitude a demand costs (`:1967-1981`): withdrawal +2; tribute +10; an ally's gift +10, +5, or 0. */
const demandAttitude = (proposal, computerRank, personRank, computerAdvances, personAdvances) => {
    if (proposal === 5) {
        return 2;
    }
    if (proposal === 4) {
        return 10;
    }
    let delta = personRank < computerRank ? 5 : 10;
    if ((personAdvances < computerAdvances && personRank < computerRank) ||
        personRank < 4) {
        delta = 0;
    }
    return delta;
};
exports.demandAttitude = demandAttitude;
/** `diplo_favor_menu`'s map gate (`:2397-2405`): allied (or a map wonder), attitude 25 or less, both with Map Making. */
const sharesMaps = (inputs) => !((!inputs.allied && inputs.attitude > 0 && !inputs.personOwnsMapWonder) ||
    inputs.attitude > 25 ||
    !inputs.personKnowsMapMaking ||
    !inputs.computerKnowsMapMaking);
exports.sharesMaps = sharesMaps;
/** `diplo_favor_war_price` (`:2215`): the gold the computer player asks to declare war on the target. */
const warPrice = (inputs) => {
    let price = clamp(div((inputs.personReputation +
        div(inputs.computerGold, 100) -
        inputs.targetReputation -
        inputs.credit) *
        (inputs.targetStrength >> 1), 50), 2, 500) * 50;
    if (!inputs.computerTreatyWithTarget) {
        price -= div(price, 3);
    }
    if (inputs.computerGold < inputs.personGold) {
        price += div(price, 3);
    }
    if (inputs.computerAlliedWithTarget) {
        price = clamp(Math.min(price, 7000) * 3, 500, 25000);
    }
    if (inputs.targetIsLeader) {
        price = div(price, 2);
    }
    if (!inputs.personAtWarWithTarget) {
        price += div(price, 3);
    }
    if (inputs.allied) {
        if (!inputs.computerAtWarWithAnyone) {
            price -= div(price, 4);
        }
        if (inputs.targetSneakAttackedPerson) {
            price -= div(price, 4);
        }
        if (inputs.personRank < inputs.computerRank) {
            price -= div(price, 3);
        }
    }
    if (inputs.targetNukedPerson) {
        if (!inputs.personNukedTarget) {
            price = div(price, 2);
        }
        if (inputs.personRank < inputs.targetRank) {
            price = div(price, 2);
        }
    }
    return clamp(div(price, 100), 1, 500) * 50;
};
exports.warPrice = warPrice;
/** `diplo_favor_war_distrust` (`:2276`). */
const warDistrust = (inputs) => {
    let distrust = inputs.reputation - inputs.attack;
    if (inputs.vendetta) {
        distrust += 2;
    }
    if (!inputs.personAtWarWithTarget) {
        distrust++;
    }
    if (inputs.targetRank < inputs.personRank) {
        distrust++;
    }
    if (inputs.computerRank < inputs.personRank) {
        distrust++;
    }
    if (inputs.allied) {
        distrust = div(distrust, 2);
    }
    return distrust;
};
exports.warDistrust = warDistrust;
/**
 * Whether the computer player takes the person's money to declare war on the target (`diplo_favor_menu`, `:2420`):
 *  distrust below 7, or the target is no ally of its, it holds no vendetta, the person fights the target and ranks no
 *  higher than it (`power_rank[person] <= power_rank[target]`).
 */
const joinsWar = (distrust, targetIsComputersAlly, vendetta, personAtWarWithTarget, personRank, targetRank) => distrust < 7 ||
    (!targetIsComputersAlly &&
        !vendetta &&
        personAtWarWithTarget &&
        personRank <= targetRank);
exports.joinsWar = joinsWar;
/**
 * `diplo_offer_sell_tech` (`:647-705`): the price of an advance: its value × 20, × attitude / 50 above 50, doubled for
 *  the top power, divided among those who know it less one (at least 1), then × 10 (× 15 above 1500 gold, and a further
 *  × 1½ above 3000); an ally pays half when behind, else ¾, and half again when 5 or more behind; at least 100.
 */
const sellPrice = (inputs) => {
    let price = inputs.value * 20;
    if (inputs.attitude > 50) {
        price = div(inputs.attitude * price, 50);
    }
    if (inputs.personTopPower) {
        price <<= 1;
    }
    const share = div(price, Math.max(1, inputs.knowers - 1));
    price = share * 10;
    if (inputs.personGold > 1500) {
        price = div(share * 30, 2);
    }
    if (inputs.personGold > 3000) {
        price = div(price * 3, 2);
    }
    if (inputs.allied) {
        price =
            inputs.personAdvances < inputs.computerAdvances
                ? div(price, 2)
                : price - (price >> 2);
        if (inputs.personAdvances + 4 < inputs.computerAdvances) {
            price = div(price, 2);
        }
    }
    if (price < 0) {
        price = 30000;
    }
    return Math.max(100, price);
};
exports.sellPrice = sellPrice;
/** `diplo_gift_menu`'s gold (`:2560-2566`): a quarter, a half, three quarters and all, each a whole number of 50s. */
const giftGold = (gold) => [1, 2, 3, 4]
    .map((quarters) => div(quarters * div(gold, 50), 4) * 50)
    .filter((amount, index, amounts) => amount > 0 && amounts.indexOf(amount) === index);
exports.giftGold = giftGold;
/** `diplo_senate_intervenes` (`:5410`): 0 below the Republic; the threshold the roll must reach. */
const senateThreshold = (sneakAttack, ownsUnitedNations, otherReputation) => clamp((ownsUnitedNations ? 50 : sneakAttack ? 25 : 0) + otherReputation * 15, 0, 75);
exports.senateThreshold = senateThreshold;
/**
 * Whether the Senate steps in: never below the Republic; otherwise not when the turn's roll is under the threshold;
 *  then always under Democracy, and under the Republic only while its Senate is in session.
 */
const senateSteps = (government, roll, threshold, inSession) => {
    if (government === 'none' || roll < threshold) {
        return false;
    }
    return government === 'democracy' || inSession;
};
exports.senateSteps = senateSteps;
/**
 * The reputation a declaration of war costs (`diplo_declare_war`, `:1196-1265`). `broken` 'alliance', 'treaty' (a
 *  ceasefire or a peace) or 'none'; `ceasefireLingers` when the peace still carries a ceasefire, which charges twice;
 *  `own` when nobody made it declare (the original's `civ2 < 0`). Chieftain and the Eiffel Tower spare the first point,
 *  not the top power's.
 */
const reputationCost = (broken, ceasefireLingers, own, chieftain, eiffel, topPower) => {
    if (broken === 'none') {
        return 0;
    }
    const spared = chieftain || eiffel;
    if (broken === 'alliance') {
        return (spared ? 0 : 1) + (own ? 1 : 0);
    }
    const once = (topPower && own ? 1 : 0) + (spared ? 0 : 1);
    return ceasefireLingers ? once * 2 : once;
};
exports.reputationCost = reputationCost;
/**
 * `game.cpp:1689-1704`: whether a player's reputation recovers by 1 this turn: checked every 12 × (level + 1) turns, on
 *  every 24 × (level + 1)th only, and only while above 1; with the Eiffel Tower on every check, down to 0.
 */
const reputationRecovers = (turn, level, reputation, eiffel) => {
    if (turn % ((level + 1) * 12) !== 0 || reputation === 0) {
        return false;
    }
    return ((turn % ((level + 1) * 24) === 0 || eiffel) && (reputation > 1 || eiffel));
};
exports.reputationRecovers = reputationRecovers;
/** `civ.cpp:4642-4660`: the attitude a computer player starts with, from a roll of 0 to 79. */
const startingAttitude = (toPerson, level, roll) => (toPerson ? clamp(level * 5 + roll + 10, 10, 75) : roll + 10);
exports.startingAttitude = startingAttitude;
/**
 * Whether the computer players gang up on a player with this reputation (`civ.cpp:3141`): above three times its wars
 *  plus 3.
 */
const gangsUp = (reputation, wars) => reputation > wars * 3 + 3;
exports.gangsUp = gangsUp;
/** `civ.cpp:7090`: the roll that a computer player's hostile intent turns into a broken treaty: 1 in this. */
const breakChance = (reputation) => clamp(3 - (reputation >> 2), 1, 3);
exports.breakChance = breakChance;
/** The original's `rand() % n` for `random()` in [0, 1). */
const roll = (random, n) => n <= 1 ? 0 : Math.floor(random() * n);
exports.roll = roll;
//# sourceMappingURL=formulas.js.map