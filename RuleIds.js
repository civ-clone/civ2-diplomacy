"use strict";
// The ids of civ2-diplomacy's rules that another package is expected to name: civ2-enhanced supersedes these. Imported,
//  a rename breaks the other package's build.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENATE_RULE = exports.TREATY_BREAKING_RULE = exports.BORDER_INTRUDERS_RULE = exports.ATTITUDE_DRIFT_RULE = void 0;
/** A computer player's attitude to each person it has met drifts each turn, pinned at 100 without a border incident. */
exports.ATTITUDE_DRIFT_RULE = 'civ2-diplomacy:player/turn-start/attitude-drift';
/** The border incidents a computer player counts each turn: the first intruded square of each city only. */
exports.BORDER_INTRUDERS_RULE = 'civ2-diplomacy:player/turn-start/border-intruders';
/** A computer player breaks a treaty it means to break, without a word. */
exports.TREATY_BREAKING_RULE = 'civ2-diplomacy:player/turn-start/treaty-breaking';
/** Civilization II's Senate. */
exports.SENATE_RULE = 'civ2-diplomacy:player/senate-intervenes';
//# sourceMappingURL=RuleIds.js.map