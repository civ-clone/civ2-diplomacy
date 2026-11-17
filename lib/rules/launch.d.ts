import Dependencies from '../Dependencies';
import Launch from '@civ-clone/core-spaceship/Rules/Launch';
/**
 * A person's ship launches and will arrive before a computer player's already in flight (OpenCiv2
 *  `src/auto/spaceship.cpp` `spaceship_launch` ~1600, richardpenman/civ2@49f26ec). That computer player:
 *
 * - below Emperor: summons the person to talks (`INCIDENT`, both ways) on Chieftain or Warlord, or when the person's
 *   reputation is spotless; otherwise means to break its treaty (`HOSTILE_INTENT`);
 * - from Emperor, not allied: breaks its ceasefire or peace there and then, without a word (as a treaty broken, B37),
 *   and is the aggressor, for long;
 * - from Emperor, allied: means to break the alliance.
 *
 * The computer players' gang-up on a person who launched, above King, is the turn start's (`gangUpLeader`).
 */
export declare const launchRules: (
  prefix: string,
  dependencies: Dependencies
) => Launch[];
export default launchRules;
