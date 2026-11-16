"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeIntruders = exports.noteIntruders = exports.forgetWarnings = exports.warned = exports.warn = exports.warnedUnits = void 0;
const BorderRecord_1 = require("../Records/BorderRecord");
const WarnedUnitsRecord_1 = require("../Records/WarnedUnitsRecord");
// The marks the original keeps on units for border incidents (`UNITF_BORDER_WARNED`, `UNITF_BORDER_INTRUDER`).
const warnedRecord = (dependencies, player) => dependencies.interactionRegistry
    .getByPlayers(player)
    .find((interaction) => interaction instanceof WarnedUnitsRecord_1.default &&
    interaction.player() === player);
/** The ids of `player`'s units warned once for intruding. */
const warnedUnits = (dependencies, player) => { var _a, _b; return (_b = (_a = warnedRecord(dependencies, player)) === null || _a === void 0 ? void 0 : _a.units()) !== null && _b !== void 0 ? _b : []; };
exports.warnedUnits = warnedUnits;
/** `unit` is warned (saved). */
const warn = (dependencies, unit) => {
    const player = unit.player(), record = warnedRecord(dependencies, player);
    if (record === undefined) {
        dependencies.interactionRegistry.register(new WarnedUnitsRecord_1.default(player, [unit.id()], dependencies.ruleRegistry, dependencies.turn));
        return;
    }
    if (!record.units().includes(unit.id())) {
        record.setUnits([...record.units(), unit.id()]);
    }
};
exports.warn = warn;
/** Whether `unit` was warned once already. */
const warned = (dependencies, unit) => (0, exports.warnedUnits)(dependencies, unit.player()).includes(unit.id());
exports.warned = warned;
// A unit's slot in the original's unit table stands behind `(turn ^ unit) & 3`; here, a number made from its id.
const slotOf = (id) => Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
/**
 * The start of `player`'s turn (`units_reset_for_turn`, `unit.cpp:970-979`): a warned unit not intruding now loses its
 *  warning one turn in four, by `(turn ^ unit) & 3 == 0`.
 */
const forgetWarnings = (dependencies, player, intruding) => {
    const record = warnedRecord(dependencies, player);
    if (record === undefined) {
        return;
    }
    const turn = dependencies.turn.value(), living = new Set(dependencies.unitRegistry
        .getByPlayer(player)
        .map((unit) => unit.id()));
    record.setUnits(record
        .units()
        .filter((id) => living.has(id) && (intruding(id) || ((turn ^ slotOf(id)) & 3) !== 0)));
};
exports.forgetWarnings = forgetWarnings;
const borderRecord = (dependencies, holder, toward) => dependencies.interactionRegistry
    .getByPlayers(holder, toward)
    .find((interaction) => interaction instanceof BorderRecord_1.default &&
    interaction.holder() === holder &&
    interaction.toward() === toward);
/** `holder` notes the units of `toward`'s it counted, for the withdrawal it will demand. */
const noteIntruders = (dependencies, holder, toward, units) => {
    const ids = units.map((unit) => unit.id()), record = borderRecord(dependencies, holder, toward);
    if (record !== undefined) {
        record.setIntruders(ids);
        return;
    }
    dependencies.interactionRegistry.register(new BorderRecord_1.default(holder, toward, ids, dependencies.ruleRegistry, dependencies.turn));
};
exports.noteIntruders = noteIntruders;
/** The units of `toward`'s `holder` noted, still `toward`'s, and forgets them. */
const takeIntruders = (dependencies, holder, toward) => {
    const record = borderRecord(dependencies, holder, toward);
    if (record === undefined) {
        return [];
    }
    const ids = record.intruders();
    record.setIntruders([]);
    return dependencies.unitRegistry
        .getByPlayer(toward)
        .filter((unit) => ids.includes(unit.id()));
};
exports.takeIntruders = takeIntruders;
//# sourceMappingURL=border.js.map