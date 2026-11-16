/** A computer player's attitude to each person it has met drifts each turn, pinned at 100 without a border incident. */
export declare const ATTITUDE_DRIFT_RULE =
  'civ2-diplomacy:player/turn-start/attitude-drift';
/** The border incidents a computer player counts each turn: the first intruded square of each city only. */
export declare const BORDER_INTRUDERS_RULE =
  'civ2-diplomacy:player/turn-start/border-intruders';
/** A computer player breaks a treaty it means to break, without a word. */
export declare const TREATY_BREAKING_RULE =
  'civ2-diplomacy:player/turn-start/treaty-breaking';
/** Civilization II's Senate. */
export declare const SENATE_RULE = 'civ2-diplomacy:player/senate-intervenes';
