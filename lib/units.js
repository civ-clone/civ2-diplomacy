"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitTerms = exports.unitCost = void 0;
const Advance_1 = require("@civ-clone/core-science/Advance");
const BuildCost_1 = require("@civ-clone/core-city-build/Rules/BuildCost");
const advances_1 = require("@civ-clone/civ2-science/data/advances");
const standing_1 = require("./standing");
const survey_1 = require("./survey");
// What a unit given to a computer player is worth to it (`diplo_gift_menu`, `diplomacy.cpp:2600-2700`).
/** @COSMIC's shield box rows: a unit's build cost is its rows of shields times these. */
const SHIELD_BOX_ROWS = 10;
const advancesFor = (dependencies, UnitType, relation) => {
    var _a, _b;
    try {
        return ((_b = (_a = dependencies.requirementRegistry) === null || _a === void 0 ? void 0 : _a.for(UnitType, relation)) !== null && _b !== void 0 ? _b : [])
            .flatMap((entry) => entry.targets)
            .filter((target) => typeof target === 'function' &&
            target.prototype instanceof Advance_1.default);
    }
    catch (e) {
        return [];
    }
};
/** The unit's cost in rows of shields (`unit_types.cost`), from the game's `BuildCost` rules. */
const unitCost = (dependencies, unit) => {
    const UnitType = unit.constructor, [cost] = dependencies.ruleRegistry.process(BuildCost_1.default, { item: () => UnitType }, null);
    return cost === undefined
        ? 1
        : Math.max(1, Math.trunc(cost.value() / SHIELD_BOX_ROWS));
};
exports.unitCost = unitCost;
const unitTerms = (dependencies, computer, unit) => {
    var _a;
    const UnitType = unit.constructor, [prerequisite] = advancesFor(dependencies, UnitType, 'requires'), obsoletedBy = advancesFor(dependencies, UnitType, 'obsoletedBy'), knowsPrerequisite = prerequisite === undefined || (0, standing_1.knows)(dependencies, computer, prerequisite), cost = (0, exports.unitCost)(dependencies, unit) * 3;
    return {
        attitude: knowsPrerequisite ? Math.trunc(cost / 2) : cost,
        obsolete: obsoletedBy.some((Type) => (0, standing_1.knows)(dependencies, computer, Type)),
        breakthrough: knowsPrerequisite
            ? null
            : (_a = advances_1.advances
                .map(([Type]) => Type)
                .find((Type) => !(0, standing_1.knows)(dependencies, computer, Type) &&
                (0, survey_1.leadsTo)(Type, prerequisite))) !== null && _a !== void 0 ? _a : null,
    };
};
exports.unitTerms = unitTerms;
exports.default = exports.unitTerms;
//# sourceMappingURL=units.js.map