"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.survey = exports.advanceValue = exports.leadsTo = void 0;
const standing_1 = require("./standing");
const Advances_1 = require("@civ-clone/civ2-science/Advances");
const Advance_1 = require("@civ-clone/core-science/Advance");
const advances_1 = require("@civ-clone/civ2-science/data/advances");
// The advances two players could trade (OpenCiv2 `diplo_exchange_survey`, `diplomacy.cpp:726`), and what a computer
//  player thinks one is worth (`ai_advance_value`, `ai.cpp:360`).
const indexOf = (AdvanceType) => advances_1.advances.findIndex(([Type]) => Type === AdvanceType);
const typeOf = (advance) => advance instanceof Advance_1.default ? advance.sourceClass() : advance;
/** `advance_has_prereq(advance, prerequisite)`: whether `prerequisite` leads to `advance`, however far back. */
const leadsTo = (prerequisite, advance) => {
    const target = indexOf(prerequisite), seen = new Set(), visit = (index) => {
        if (index < 0 || seen.has(index)) {
            return false;
        }
        seen.add(index);
        const row = advances_1.advances[index];
        if (row === undefined) {
            return false;
        }
        const [, first, second] = row;
        return [first, second].some((prerequisiteIndex) => prerequisiteIndex === target || visit(prerequisiteIndex));
    };
    return visit(indexOf(advance));
};
exports.leadsTo = leadsTo;
/** Whether anyone in the game knows `AdvanceType` (`game.advance_known_by`). */
const knownByAnyone = (dependencies, AdvanceType) => dependencies.playerRegistry
    .entries()
    .filter((player) => (0, standing_1.knows)(dependencies, player, AdvanceType))
    .length;
/**
 * `ai_advance_value(player, advance)`, in part: RULES.TXT's value plus its civilized modifier times the leader's
 *  civilize attitude (a computer player at war with a person ahead of it on a shared land mass leans less civilized:
 *  not ported); +1 or +2 toward Computers once it knows University; +1 toward Industrialization once it knows
 *  Invention, +2 with Navigation; +1 if nobody knows it; −1 for each known advance it leads to; at least 1. Left out:
 *  the terms for the player's cities and units (expansion by sea, the Port Facility, the Aqueduct and Sewer, its
 *  tribe's own preferences and the computer players' bonus terms).
 */
const advanceValue = (dependencies, player, advance) => {
    const AdvanceType = typeOf(advance), index = indexOf(AdvanceType), row = advances_1.advances[index];
    if (row === undefined) {
        return 1;
    }
    const [, , , aiValue, civilizedModifier] = row, temper = (0, standing_1.civilize)(dependencies, player);
    let value = aiValue + civilizedModifier * temper;
    if (temper > -1 && (0, standing_1.knows)(dependencies, player, Advances_1.University)) {
        if ((0, exports.leadsTo)(AdvanceType, Advances_1.Computers)) {
            value += temper + 1;
        }
        if (AdvanceType === Advances_1.Computers) {
            value += 2;
        }
    }
    if ((0, standing_1.knows)(dependencies, player, Advances_1.Invention) &&
        (0, exports.leadsTo)(AdvanceType, Advances_1.Industrialization)) {
        value += (0, standing_1.knows)(dependencies, player, Advances_1.Navigation) ? 2 : 1;
    }
    if (knownByAnyone(dependencies, AdvanceType) === 0) {
        value++;
    }
    advances_1.advances.forEach(([Type, first, second]) => {
        if ((first === index || second === index) &&
            (0, standing_1.knows)(dependencies, player, Type)) {
            value--;
        }
    });
    return value < 2 ? 1 : value;
};
exports.advanceValue = advanceValue;
const completed = (dependencies, player) => {
    try {
        return dependencies.playerResearchRegistry
            .getByPlayer(player)
            .complete()
            .filter((advance) => !typeOf(advance).repeatable);
    }
    catch (e) {
        return [];
    }
};
/** `diplo_exchange_survey`: walks the advances in RULES.TXT's order, as the original does. */
const survey = (dependencies, computer, person) => {
    const theirs = completed(dependencies, person), ours = completed(dependencies, computer), has = (list, AdvanceType) => { var _a; return (_a = list.find((advance) => typeOf(advance) === AdvanceType)) !== null && _a !== void 0 ? _a : null; }, order = (list) => list
        .map((advance) => [
        advance,
        indexOf(typeOf(advance)),
    ])
        .sort(([, a], [, b]) => a - b)
        .map(([advance]) => advance), result = {
        best: null,
        second: null,
        bestValue: 0,
        secondValue: 0,
        wanted: null,
        personCount: theirs.length,
        computerCount: ours.length,
    };
    let wantedValue = 0;
    order(ours).forEach((advance) => {
        if (has(theirs, typeOf(advance)) !== null) {
            return;
        }
        const value = (0, exports.advanceValue)(dependencies, person, advance);
        if (wantedValue <= value) {
            result.wanted = advance;
            wantedValue = value;
        }
    });
    order(theirs).forEach((advance) => {
        if (has(ours, typeOf(advance)) !== null) {
            return;
        }
        const value = (0, exports.advanceValue)(dependencies, computer, advance);
        if (value < result.bestValue) {
            if (result.secondValue <= value) {
                result.second = advance;
                result.secondValue = value;
            }
            return;
        }
        if (result.best !== null) {
            result.second = result.best;
            result.secondValue = result.bestValue;
        }
        result.best = advance;
        result.bestValue = value;
    });
    return result;
};
exports.survey = survey;
//# sourceMappingURL=survey.js.map