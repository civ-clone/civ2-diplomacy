import { Game } from '@civ-clone/core-game';
import Dependencies from './lib/Dependencies';
import Rule from '@civ-clone/core-rule/Rule';
export declare const PREFIX = 'civ2-diplomacy';
export declare const dependenciesOf: (game: Game) => Dependencies;
/**
 * Civilization II's diplomacy (OpenCiv2 `src/auto/diplomacy.cpp`, Classic):
 *
 * - the talks between a computer player and a person, whoever opens them: the computer player's business in the
 *   original's order, the person's menu of proposals and the computer player's answers (`lib/talks`);
 * - attitude: seeded at contact, changed by what is said and done, and drifting each turn;
 * - reputation: lost by breaking treaties, recovered on schedule;
 * - the Senate, on a roll kept each turn;
 * - ceasefires, alliances and two computer players meeting, at the start of each turn;
 * - contact when units meet, when talks open and when an embassy is made.
 */
export declare const getRules: (
  dependencies: Dependencies,
  game: Pick<Game, 'engine' | 'rng'>
) => Rule<any, any>[];
export declare const register: (game: Game) => void;
export default register;
