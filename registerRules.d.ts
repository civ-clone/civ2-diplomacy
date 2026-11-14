import { Game } from '@civ-clone/core-game';
import Dependencies from './lib/Dependencies';
import Rule from '@civ-clone/core-rule/Rule';
export declare const PREFIX = 'civ2-diplomacy';
export declare const dependenciesOf: (game: Game) => Dependencies;
/**
 * Civilization II's diplomacy rules on `base-diplomacy`: contact when units meet, how often players meet, the meeting
 *  and what each answer does (peace, tribute, cancelled treaties, exchanged knowledge, war), sham peace, treaties ending
 *  and the vendetta a nuclear strike leaves. With no Senate. No thefts are forgotten when a city is captured: Civ2's
 *  units here offer no Steal Technology.
 */
export declare const getRules: (
  dependencies: Dependencies,
  game: Pick<Game, 'engine' | 'rng'>
) => Rule<any, any>[];
export declare const register: (game: Game) => void;
export default register;
