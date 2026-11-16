"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTurnBits = exports.clearBoth = exports.setBoth = exports.clearFlag = exports.setFlag = exports.hasFlag = exports.flagsOf = exports.TURN_BITS = exports.MERCENARY = exports.NUKED = exports.MET_THIS_TURN = exports.WAR_THIS_TURN = exports.CEASEFIRE_LINGERS = exports.CHANGED_THIS_TURN = exports.TRIBUTE = exports.AGGRESSOR = exports.INCIDENT = exports.SNEAK_ATTACK = exports.HOSTILE_INTENT = void 0;
const TreatyFlagsRecord_1 = require("../Records/TreatyFlagsRecord");
// The original's treaty bits that the declarations don't carry (OpenCiv2 `src/include/enums.h`), each one way: what
//  `holder` keeps about `toward`. Our own numbering; only the meanings are the original's.
/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
exports.HOSTILE_INTENT = 1 << 0;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
exports.SNEAK_ATTACK = 1 << 1;
/** An incident between them (`TREATY_INCIDENT`): the computer player comes to talk at once. */
exports.INCIDENT = 1 << 2;
/** `holder` started a war with `toward` (`TREATY_AGGRESSOR`). */
exports.AGGRESSOR = 1 << 3;
/** Tribute was paid, or advances given, this round (`TREATY_TRIBUTE`). */
exports.TRIBUTE = 1 << 4;
/** A treaty was signed between them this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
exports.CHANGED_THIS_TURN = 1 << 5;
/** Peace was signed while a ceasefire was still in force, and no audience has cleared it since (the ceasefire bit). */
exports.CEASEFIRE_LINGERS = 1 << 6;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
exports.WAR_THIS_TURN = 1 << 7;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
exports.MET_THIS_TURN = 1 << 8;
/** `toward` struck `holder` with a nuclear weapon (`TREATY_NUKED`). */
exports.NUKED = 1 << 9;
/** `holder` fights `toward` at another's request (`TREATY_MERCENARY`). */
exports.MERCENARY = 1 << 10;
/** The bits cleared at the start of every turn. */
exports.TURN_BITS = exports.CHANGED_THIS_TURN | exports.WAR_THIS_TURN | exports.MET_THIS_TURN;
const recordOf = ({ interactionRegistry }, holder, toward) => interactionRegistry
    .getByPlayers(holder, toward)
    .find((interaction) => interaction instanceof TreatyFlagsRecord_1.default &&
    interaction.holder() === holder &&
    interaction.toward() === toward);
/** Every bit `holder` keeps about `toward`. */
const flagsOf = (registries, holder, toward) => { var _a, _b; return (_b = (_a = recordOf(registries, holder, toward)) === null || _a === void 0 ? void 0 : _a.value()) !== null && _b !== void 0 ? _b : 0; };
exports.flagsOf = flagsOf;
/** Whether `holder` keeps `flag` about `toward`. */
const hasFlag = (registries, holder, toward, flag) => ((0, exports.flagsOf)(registries, holder, toward) & flag) !== 0;
exports.hasFlag = hasFlag;
const write = (registries, holder, toward, value) => {
    const record = recordOf(registries, holder, toward);
    if (record !== undefined) {
        record.setValue(value);
        return;
    }
    if (value === 0) {
        return;
    }
    registries.interactionRegistry.register(new TreatyFlagsRecord_1.default(holder, toward, value, ...[registries.ruleRegistry, registries.turn].filter((arg) => arg !== undefined)));
};
/** `holder` keeps `flag` about `toward`. */
const setFlag = (registries, holder, toward, flag) => write(registries, holder, toward, (0, exports.flagsOf)(registries, holder, toward) | flag);
exports.setFlag = setFlag;
/** `holder` no longer keeps `flag` about `toward`. */
const clearFlag = (registries, holder, toward, flag) => {
    const flags = (0, exports.flagsOf)(registries, holder, toward);
    if ((flags & flag) !== 0) {
        write(registries, holder, toward, flags & ~flag);
    }
};
exports.clearFlag = clearFlag;
/** Both ways (`diplo_set_treaty_flags`). */
const setBoth = (registries, player, other, flag) => {
    (0, exports.setFlag)(registries, player, other, flag);
    (0, exports.setFlag)(registries, other, player, flag);
};
exports.setBoth = setBoth;
/** Both ways (`diplo_clear_treaty_flags`). */
const clearBoth = (registries, player, other, flag) => {
    (0, exports.clearFlag)(registries, player, other, flag);
    (0, exports.clearFlag)(registries, other, player, flag);
};
exports.clearBoth = clearBoth;
/** Every record's turn bits (`TURN_BITS`) cleared, at the start of a turn. */
const clearTurnBits = ({ interactionRegistry }) => interactionRegistry
    .entries()
    .filter((interaction) => interaction instanceof TreatyFlagsRecord_1.default)
    .forEach((record) => {
    if ((record.value() & exports.TURN_BITS) !== 0) {
        record.setValue(record.value() & ~exports.TURN_BITS);
    }
});
exports.clearTurnBits = clearTurnBits;
//# sourceMappingURL=flags.js.map