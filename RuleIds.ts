// The ids of civ2-diplomacy's rules that another package is expected to name: civ2-enhanced supersedes these. Imported,
//  a rename breaks the other package's build.

/** A computer player's attitude to each person it has met drifts each turn, pinned at 100 without a border incident. */
export const ATTITUDE_DRIFT_RULE =
  'civ2-diplomacy:player/turn-start/attitude-drift';

/** The border incidents a computer player counts each turn: the first intruded square of each city only. */
export const BORDER_INTRUDERS_RULE =
  'civ2-diplomacy:player/turn-start/border-intruders';

/** A computer player breaks a treaty it means to break, without a word. */
export const TREATY_BREAKING_RULE =
  'civ2-diplomacy:player/turn-start/treaty-breaking';

/** Civilization II's Senate. */
export const SENATE_RULE = 'civ2-diplomacy:player/senate-intervenes';
