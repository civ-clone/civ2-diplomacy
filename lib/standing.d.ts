import { TreatyLevel } from '@civ-clone/base-diplomacy/lib/treatyLevel';
import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
/** Chieftain, the easiest level. */
export declare const CHIEFTAIN = 0;
export declare const WARLORD = 1;
export declare const PRINCE = 2;
export declare const KING = 3;
/** The game's level, 0 (Chieftain) to 5 (Deity). */
export declare const level: (dependencies: Dependencies) => number;
/** Whether a person plays `player`. */
export declare const human: (
  dependencies: Dependencies,
  player: Player
) => boolean;
/** `game.power_rank`: 7 for the strongest civilization, one less for each below it. */
export declare const rank: (
  dependencies: Dependencies,
  player: Player
) => number;
/** `military_strength`: the attack and defence of every unit. */
export declare const strength: (
  dependencies: Dependencies,
  player: Player
) => number;
/** `num_advances`. */
export declare const advanceCount: (
  dependencies: Dependencies,
  player: Player
) => number;
/** Whether `player` knows `AdvanceType`. */
export declare const knows: (
  dependencies: Dependencies,
  player: Player,
  AdvanceType: typeof Advance
) => boolean;
export declare const cities: (
  dependencies: import('@civ-clone/base-diplomacy/lib/Dependencies').Dependencies,
  player: Player
) => number;
/** The leader's attack attitude: 1 aggressive, −1 friendly (rational), 0 otherwise. */
export declare const attack: (
  dependencies: Dependencies,
  player: Player
) => number;
/** The leader's expansion attitude: 1 expansionist, −1 perfectionist, 0 otherwise. */
export declare const expand: (
  dependencies: Dependencies,
  player: Player
) => number;
/** The leader's civilization attitude: 1 civilized, −1 militaristic, 0 otherwise. */
export declare const civilize: (
  dependencies: Dependencies,
  player: Player
) => number;
/** The treaty between the two (`base-diplomacy`'s `TreatyLevel`). */
export declare const treaty: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => TreatyLevel;
export declare const allied: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => boolean;
export declare const atPeace: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => boolean;
/** At war: a `War` in force and no treaty (`TREATY_WAR`). */
export declare const atWar: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => boolean;
/** Whether the two have made contact (`TREATY_CONTACT`): a `Contact` between them. */
export declare const inContact: (
  dependencies: Dependencies,
  player: Player,
  other: Player
) => boolean;
/** Whether `holder` holds a vendetta against `against` (`TREATY_VENDETTA`). */
export declare const vendetta: (
  dependencies: Dependencies,
  holder: Player,
  against: Player
) => boolean;
/** `diplo_is_hostile`: at war, or at contact only (no ceasefire, peace or alliance) with an attitude above 49. */
export declare const hostile: (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  attitudeOf: (holder: Player, toward: Player) => number
) => boolean;
/** The other players still in the game: every player but `player`. */
export declare const others: (
  dependencies: Dependencies,
  ...players: Player[]
) => Player[];
