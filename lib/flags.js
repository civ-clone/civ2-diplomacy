"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTurnBits = exports.clearBoth = exports.setBoth = exports.clearFlag = exports.setFlag = exports.hasFlag = exports.flagsOf = exports.WAR_END_CLEARS = exports.SIGNING_CLEARS = exports.TURN_BITS = exports.COMPUTERS_MET = exports.MET_THIS_TURN = exports.CITY_CAPTURED = exports.WAR_THIS_TURN = exports.MERCENARY = exports.AGGRESSOR_LONG = exports.TRIBUTE = exports.NUKED = exports.INCIDENT = exports.WITHDRAWAL_DEMANDED = exports.CHANGED_THIS_TURN = exports.SNEAK_ATTACK = exports.AGGRESSOR = exports.RECENT_CONTACT = exports.FIGHTING = exports.NUCLEAR_THREAT = exports.BROKEN = exports.HOSTILE_INTENT = exports.CEASEFIRE_LINGERS = void 0;
const TreatyFlagsRecord_1 = require("../Records/TreatyFlagsRecord");
// The original's treaty bits that the declarations don't carry, each one way, with the original's values
//  (OpenCiv2 `src/include/enums.h` `TreatyFlag`): what `holder` keeps about `toward`. Contact, ceasefire, peace,
//  alliance, war, vendetta and embassy are declarations and interactions here, not bits.
/** Peace was signed while a ceasefire was in force, and no audience has cleared it since: the original's ceasefire bit
 *  (`TREATY_CEASEFIRE`) left set beside the peace one. */
exports.CEASEFIRE_LINGERS = 0x2;
/** `holder` means to break its treaty with `toward` (`TREATY_HOSTILE_INTENT`). */
exports.HOSTILE_INTENT = 0x20;
/** `holder` cancelled its treaty with `toward`: war is near (`TREATY_BROKEN`). */
exports.BROKEN = 0x40;
/** `holder` showed `toward` its nukes, or was nuked by it (`TREATY_NUCLEAR_THREAT`). */
exports.NUCLEAR_THREAT = 0x100;
/** Their units have fought (`TREATY_FIGHTING`). */
exports.FIGHTING = 0x200;
/** They met lately; lapses every 16 turns (`TREATY_RECENT_CONTACT`). */
exports.RECENT_CONTACT = 0x400;
/** `holder` started a war with `toward`; decays after 32 turns (`TREATY_AGGRESSOR`). */
exports.AGGRESSOR = 0x800;
/** `holder` attacked `toward` without declaring war (`TREATY_SNEAK_ATTACK`). */
exports.SNEAK_ATTACK = 0x1000;
/** A ceasefire, peace or first contact this turn (`TREATY_CHANGED_THIS_TURN`); cleared at the start of the turn. */
exports.CHANGED_THIS_TURN = 0x4000;
/** `holder` will demand at its next audience that `toward`'s units leave its land, or face war: our own bit, for the
 *  original's `diplo_review_violators`, which asks at once. */
exports.WITHDRAWAL_DEMANDED = 0x8000;
/** `holder` has a reason to summon `toward` to talks (`TREATY_INCIDENT`). */
exports.INCIDENT = 0x10000;
/** `holder` has nuked `toward` (`TREATY_NUKED`). */
exports.NUKED = 0x20000;
/** `holder` paid tribute to `toward` this round (`TREATY_TRIBUTE`). */
exports.TRIBUTE = 0x40000;
/** Extends `AGGRESSOR` by 32 turns (`TREATY_AGGRESSOR_LONG`). */
exports.AGGRESSOR_LONG = 0x80000;
/** `holder` fights at `toward`'s request (`TREATY_MERCENARY`). */
exports.MERCENARY = 0x100000;
/** War was declared between them this turn (`TREATY_WAR_THIS_TURN`); cleared at the start of the turn. */
exports.WAR_THIS_TURN = 0x200000;
/** `toward` took a city of `holder`'s (`TREATY_CITY_CAPTURED`). */
exports.CITY_CAPTURED = 0x400000;
/** They met this turn (`TREATY_MET_THIS_TURN`); cleared at the start of the turn. */
exports.MET_THIS_TURN = 0x800000;
/** Two computer players' units met this turn and they decided what to do (`diplo_civs_meet`): our own bit, so a pair
 *  decides once a turn, kept in a save. */
exports.COMPUTERS_MET = 0x2000000;
/** The bits cleared at the start of every turn (`civ.cpp:7080`, `& 0xff5fbfff`), and our own `COMPUTERS_MET`. */
exports.TURN_BITS = exports.CHANGED_THIS_TURN | exports.WAR_THIS_TURN | exports.MET_THIS_TURN | exports.COMPUTERS_MET;
/** What signing a ceasefire, a peace or an alliance clears both ways (`diplo_set_treaty_flags`, `0x2a60`, less war). */
exports.SIGNING_CLEARS = exports.AGGRESSOR | exports.FIGHTING | exports.BROKEN | exports.HOSTILE_INTENT;
/** What a war's end clears both ways (`diplo_clear_treaty_flags`, `0x1800`). */
exports.WAR_END_CLEARS = exports.AGGRESSOR | exports.SNEAK_ATTACK;
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