"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.others = exports.hostile = exports.vendetta = exports.inContact = exports.atWar = exports.atPeace = exports.allied = exports.treaty = exports.civilize = exports.expand = exports.attack = exports.cities = exports.knows = exports.advanceCount = exports.strength = exports.rank = exports.human = exports.level = exports.KING = exports.PRINCE = exports.WARLORD = exports.CHIEFTAIN = void 0;
const treatyLevel_1 = require("@civ-clone/base-diplomacy/lib/treatyLevel");
const standing_1 = require("@civ-clone/base-diplomacy/lib/standing");
const Aggressive_1 = require("@civ-clone/base-leader-trait-aggression/Aggression/Aggressive");
const Civilized_1 = require("@civ-clone/base-leader-trait-militarism/Militarism/Civilized");
const Contact_1 = require("@civ-clone/base-diplomacy-interaction-contact/Contact");
const Expansionist_1 = require("@civ-clone/base-leader-trait-development/Development/Expansionist");
const Friendly_1 = require("@civ-clone/base-leader-trait-aggression/Aggression/Friendly");
const Militaristic_1 = require("@civ-clone/base-leader-trait-militarism/Militarism/Militaristic");
const Perfectionist_1 = require("@civ-clone/base-leader-trait-development/Development/Perfectionist");
const holds_1 = require("@civ-clone/library-diplomacy/lib/holds");
const isHuman_1 = require("@civ-clone/civ2-difficulty/isHuman");
const level_1 = require("@civ-clone/civ2-difficulty/level");
// What Civilization II's talks read about the players, in the original's terms (OpenCiv2 `diplomacy.cpp`): the power
//  rank (7 the strongest), military strength, advances known, the leader's three @LEADERS attitudes, and the treaty
//  between two players.
/** Chieftain, the easiest level. */
exports.CHIEFTAIN = 0;
exports.WARLORD = 1;
exports.PRINCE = 2;
exports.KING = 3;
/** The game's level, 0 (Chieftain) to 5 (Deity). */
const level = (dependencies) => (0, level_1.levelOf)(dependencies.gameDifficultyRegistry);
exports.level = level;
/** Whether a person plays `player`. */
const human = (dependencies, player) => (0, isHuman_1.default)(player, dependencies.clientRegistry);
exports.human = human;
/** `game.power_rank`: 7 for the strongest civilization, one less for each below it. */
const rank = (dependencies, player) => (0, standing_1.rankFromTop)(dependencies, player, 7);
exports.rank = rank;
/** `military_strength`: the attack and defence of every unit. */
const strength = (dependencies, player) => (0, standing_1.power)(dependencies, player);
exports.strength = strength;
/** `num_advances`. */
const advanceCount = (dependencies, player) => {
    try {
        return dependencies.playerResearchRegistry.getByPlayer(player).complete()
            .length;
    }
    catch (e) {
        return 0;
    }
};
exports.advanceCount = advanceCount;
/** Whether `player` knows `AdvanceType`. */
const knows = (dependencies, player, AdvanceType) => {
    try {
        return dependencies.playerResearchRegistry
            .getByPlayer(player)
            .completed(AdvanceType);
    }
    catch (e) {
        return false;
    }
};
exports.knows = knows;
exports.cities = standing_1.cityCount;
/** The leader's attack attitude: 1 aggressive, −1 friendly (rational), 0 otherwise. */
const attack = (dependencies, player) => (0, standing_1.traitScore)(dependencies, player, (trait) => trait instanceof Aggressive_1.default ? 1 : trait instanceof Friendly_1.default ? -1 : 0);
exports.attack = attack;
/** The leader's expansion attitude: 1 expansionist, −1 perfectionist, 0 otherwise. */
const expand = (dependencies, player) => (0, standing_1.traitScore)(dependencies, player, (trait) => trait instanceof Expansionist_1.default ? 1 : trait instanceof Perfectionist_1.default ? -1 : 0);
exports.expand = expand;
/** The leader's civilization attitude: 1 civilized, −1 militaristic, 0 otherwise. */
const civilize = (dependencies, player) => (0, standing_1.traitScore)(dependencies, player, (trait) => trait instanceof Civilized_1.default ? 1 : trait instanceof Militaristic_1.default ? -1 : 0);
exports.civilize = civilize;
/** The treaty between the two (`base-diplomacy`'s `TreatyLevel`). */
const treaty = (dependencies, player, other) => (0, treatyLevel_1.treatyLevel)(dependencies, player, other);
exports.treaty = treaty;
const allied = (dependencies, player, other) => (0, treatyLevel_1.hasTreatyLevel)(dependencies, player, other, treatyLevel_1.TreatyLevel.Alliance);
exports.allied = allied;
const atPeace = (dependencies, player, other) => (0, treatyLevel_1.hasTreatyLevel)(dependencies, player, other, treatyLevel_1.TreatyLevel.Peace);
exports.atPeace = atPeace;
/** At war: a `War` in force and no treaty (`TREATY_WAR`). */
const atWar = (dependencies, player, other) => (0, exports.treaty)(dependencies, player, other) === treatyLevel_1.TreatyLevel.War;
exports.atWar = atWar;
/** Whether the two have made contact (`TREATY_CONTACT`): a `Contact` between them. */
const inContact = (dependencies, player, other) => dependencies.interactionRegistry
    .getByPlayers(player, other)
    .some((interaction) => interaction instanceof Contact_1.default);
exports.inContact = inContact;
/** Whether `holder` holds a vendetta against `against` (`TREATY_VENDETTA`). */
const vendetta = (dependencies, holder, against) => (0, holds_1.hasVendetta)(holder, against, dependencies.interactionRegistry);
exports.vendetta = vendetta;
/** `diplo_is_hostile`: at war, or at contact only (no ceasefire, peace or alliance) with an attitude above 49. */
const hostile = (dependencies, player, other, attitudeOf) => {
    const level = (0, exports.treaty)(dependencies, player, other);
    if (level === treatyLevel_1.TreatyLevel.War) {
        return true;
    }
    return (level === treatyLevel_1.TreatyLevel.Contact &&
        (0, exports.inContact)(dependencies, player, other) &&
        attitudeOf(player, other) > 49);
};
exports.hostile = hostile;
/** The other players still in the game: every player but `player`. */
const others = (dependencies, ...players) => dependencies.playerRegistry
    .entries()
    .filter((player) => !players.includes(player));
exports.others = others;
//# sourceMappingURL=standing.js.map