import Dependencies from './Dependencies';
import { Game } from '@civ-clone/core-game';
/**
 * Everything civ2-diplomacy reads, from `game`'s registries: what its helpers (`lib/espionage`, `lib/relations`, ...)
 *  take when another package calls them. Importing this registers nothing.
 */
export declare const dependenciesOf: (game: Game) => Dependencies;
export default dependenciesOf;
