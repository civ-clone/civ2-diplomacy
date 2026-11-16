/** `diplo_gold_attitude_value` (`:1352`): what gold is worth in attitude, the first 50 at 1 in 10, then each 100 less. */
export declare const goldAttitudeValue: (gold: number) => number;
export interface AllianceInputs {
  level: number;
  personAllies: number;
  hasWarTarget: boolean;
  computerRank: number;
  personRank: number;
  computerStrength: number;
  personStrength: number;
  targetIsLeader: boolean;
  fear: number;
  peaceInclination: number;
  attitude: number;
  reputation: number;
  turn: number;
  targetFightingAndStrong: boolean;
  commonEnemy: boolean;
  vendetta: boolean;
  targetIsPersonsAlly: boolean;
  patienceSpent: number;
}
/**
 * `diplo_alliance_willing` (`:1374`): whether the computer player will ally with the person, and why (bits: 1 the war
 *  target is the person's ally, 2 the target is fighting it and strong, 4 a common enemy).
 */
export declare const allianceWilling: (inputs: AllianceInputs) => {
  agree: boolean;
  reasons: number;
};
export interface PeaceInputs {
  level: number;
  targetIsLeader: boolean;
  attitude: number;
  reputation: number;
  targetFightingAndStrong: boolean;
  targetIsPersonsAlly: boolean;
  vendetta: boolean;
  attack: number;
  personPacifies: boolean;
}
/**
 * `diplo_answer_peace`'s willingness (`:1673-1720`): 0 refuses, otherwise bits: 1 willing, 2 and 4 the war target's
 *  reasons, 8 the person's Great Wall or United Nations.
 */
export declare const peaceFlags: (inputs: PeaceInputs) => number;
/**
 * The gold a computer player asks before it signs (`:1563-1580` for an alliance, `:1773-1790` for peace): its share of
 *  the person's gold, by strength, plus the reputation (twice over for an alliance), in 50s, doubled when it is the
 *  weaker, then cut to what the person has. 0 for none.
 */
export declare const sweetenerGold: (
  personGold: number,
  computerStrength: number,
  personStrength: number,
  personReputation: number,
  alliance: boolean
) => number;
/** Whether a sweetener is asked at all: patience spent, a cold attitude, or any reputation (`:1530-1535`, `:1752`). */
export declare const asksSweetener: (
  patienceSpent: number,
  attitude: number,
  reputation: number,
  declareWar: boolean,
  alliance: boolean
) => boolean;
export interface TributeInputs {
  proposal: 3 | 4 | 5;
  fear: number;
  computerGold: number;
  computerRank: number;
  personRank: number;
  turnsSinceContact: number;
  atPeace: boolean;
  computerPacifies: boolean;
}
/** `diplo_answer_demand`'s tribute (`:1878-1905`): the gold the computer player gives the person, 0 for none. */
export declare const demandedTribute: (inputs: TributeInputs) => number;
/** The attitude a demand costs (`:1967-1981`): withdrawal +2; tribute +10; an ally's gift +10, +5, or 0. */
export declare const demandAttitude: (
  proposal: 3 | 4 | 5,
  computerRank: number,
  personRank: number,
  computerAdvances: number,
  personAdvances: number
) => number;
export interface ShareMapsInputs {
  allied: boolean;
  personOwnsMapWonder: boolean;
  attitude: number;
  personKnowsMapMaking: boolean;
  computerKnowsMapMaking: boolean;
}
/** `diplo_favor_menu`'s map gate (`:2397-2405`): allied (or a map wonder), attitude 25 or less, both with Map Making. */
export declare const sharesMaps: (inputs: ShareMapsInputs) => boolean;
export interface WarPriceInputs {
  personReputation: number;
  targetReputation: number;
  credit: number;
  computerGold: number;
  personGold: number;
  targetStrength: number;
  computerTreatyWithTarget: boolean;
  computerAlliedWithTarget: boolean;
  targetIsLeader: boolean;
  personAtWarWithTarget: boolean;
  allied: boolean;
  computerAtWarWithAnyone: boolean;
  targetSneakAttackedPerson: boolean;
  personRank: number;
  computerRank: number;
  targetRank: number;
  targetNukedPerson: boolean;
  personNukedTarget: boolean;
}
/** `diplo_favor_war_price` (`:2215`): the gold the computer player asks to declare war on the target. */
export declare const warPrice: (inputs: WarPriceInputs) => number;
export interface DistrustInputs {
  reputation: number;
  attack: number;
  vendetta: boolean;
  personAtWarWithTarget: boolean;
  targetRank: number;
  personRank: number;
  computerRank: number;
  allied: boolean;
}
/** `diplo_favor_war_distrust` (`:2276`). */
export declare const warDistrust: (inputs: DistrustInputs) => number;
/**
 * Whether the computer player takes the person's money to declare war on the target (`diplo_favor_menu`, `:2420`):
 *  distrust below 7, or the target is no ally of its, it holds no vendetta, the person fights the target and ranks no
 *  higher than it (`power_rank[person] <= power_rank[target]`).
 */
export declare const joinsWar: (
  distrust: number,
  targetIsComputersAlly: boolean,
  vendetta: boolean,
  personAtWarWithTarget: boolean,
  personRank: number,
  targetRank: number
) => boolean;
export interface SellInputs {
  value: number;
  knowers: number;
  attitude: number;
  personTopPower: boolean;
  personGold: number;
  allied: boolean;
  personAdvances: number;
  computerAdvances: number;
}
/**
 * `diplo_offer_sell_tech` (`:647-705`): the price of an advance: its value × 20, × attitude / 50 above 50, doubled for
 *  the top power, divided among those who know it less one (at least 1), then × 10 (× 15 above 1500 gold, and a further
 *  × 1½ above 3000); an ally pays half when behind, else ¾, and half again when 5 or more behind; at least 100.
 */
export declare const sellPrice: (inputs: SellInputs) => number;
/** `diplo_gift_menu`'s gold (`:2560-2566`): a quarter, a half, three quarters and all, each a whole number of 50s. */
export declare const giftGold: (gold: number) => number[];
/** `diplo_senate_intervenes` (`:5410`): 0 below the Republic; the threshold the roll must reach. */
export declare const senateThreshold: (
  sneakAttack: boolean,
  ownsUnitedNations: boolean,
  otherReputation: number
) => number;
/**
 * Whether the Senate steps in: never below the Republic; otherwise not when the turn's roll is under the threshold;
 *  then always under Democracy, and under the Republic only while its Senate is in session.
 */
export declare const senateSteps: (
  government: 'none' | 'republic' | 'democracy',
  roll: number,
  threshold: number,
  inSession: boolean
) => boolean;
/**
 * The reputation a declaration of war costs (`diplo_declare_war`, `:1196-1265`). `broken` 'alliance', 'treaty' (a
 *  ceasefire or a peace) or 'none'; `ceasefireLingers` when the peace still carries a ceasefire, which charges twice;
 *  `own` when nobody made it declare (the original's `civ2 < 0`). Chieftain and the Eiffel Tower spare the first point,
 *  not the top power's.
 */
export declare const reputationCost: (
  broken: 'alliance' | 'treaty' | 'none',
  ceasefireLingers: boolean,
  own: boolean,
  chieftain: boolean,
  eiffel: boolean,
  topPower: boolean
) => number;
/**
 * `game.cpp:1689-1704`: whether a player's reputation recovers by 1 this turn: checked every 12 × (level + 1) turns, on
 *  every 24 × (level + 1)th only, and only while above 1; with the Eiffel Tower on every check, down to 0.
 */
export declare const reputationRecovers: (
  turn: number,
  level: number,
  reputation: number,
  eiffel: boolean
) => boolean;
/** `civ.cpp:4642-4660`: the attitude a computer player starts with, from a roll of 0 to 79. */
export declare const startingAttitude: (
  toPerson: boolean,
  level: number,
  roll: number
) => number;
/**
 * Whether the computer players gang up on a player with this reputation (`civ.cpp:3141`): above three times its wars
 *  plus 3.
 */
export declare const gangsUp: (reputation: number, wars: number) => boolean;
/** `civ.cpp:7090`: the roll that a computer player's hostile intent turns into a broken treaty: 1 in this. */
export declare const breakChance: (reputation: number) => number;
/** The original's `rand() % n` for `random()` in [0, 1). */
export declare const roll: (random: () => number, n: number) => number;
