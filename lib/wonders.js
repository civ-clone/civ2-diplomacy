"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pacifies = exports.ownsWonder = exports.diplomaticWonders = void 0;
const EiffelTower_1 = require("@civ-clone/base-wonder-eiffeltower/EiffelTower");
const GreatWall_1 = require("@civ-clone/base-wonder-great-wall/GreatWall");
const MagellansExpedition_1 = require("@civ-clone/base-wonder-magellans-expedition/MagellansExpedition");
const MarcoPolosEmbassy_1 = require("@civ-clone/base-wonder-marcopolosembassy/MarcoPolosEmbassy");
const UnitedNations_1 = require("@civ-clone/base-wonder-unitednations/UnitedNations");
const hasWonder_1 = require("@civ-clone/base-wonder/lib/hasWonder");
/**
 * The wonders whose diplomatic effects civ2-diplomacy's own formulas read: Marco Polo's Embassy and Magellan's
 *  Expedition (maps shared without an alliance; Marco Polo's computer owner asks more tribute), the Great Wall and the
 *  United Nations (identical in talks), and the Eiffel Tower (patience, reputation and attitude drift).
 */
exports.diplomaticWonders = {
    'eiffel-tower': EiffelTower_1.default,
    'great-wall': GreatWall_1.default,
    'magellans-expedition': MagellansExpedition_1.default,
    'marco-polos-embassy': MarcoPolosEmbassy_1.default,
    'united-nations': UnitedNations_1.default,
};
/**
 * Whether `player` owns `wonder`, still standing and not expired (base-wonder's `playerOwnsWonder`): an expired wonder
 *  counts as absent, as the original's `wonder_get_city` has it. With no wonder registry given, nobody owns one.
 */
const ownsWonder = (registries, player, wonder) => registries.wonderRegistry !== undefined &&
    registries.playerResearchRegistry !== undefined &&
    registries.requirementRegistry !== undefined &&
    (0, hasWonder_1.playerOwnsWonder)(player, exports.diplomaticWonders[wonder], registries.wonderRegistry, registries.playerResearchRegistry, registries.requirementRegistry);
exports.ownsWonder = ownsWonder;
/**
 * Whether `player` owns the Great Wall or the United Nations, which work alike in talks: the computer players accept
 *  its peace, it pays no tribute, and its attitude in talks is 10 warmer.
 */
const pacifies = (registries, player) => (0, exports.ownsWonder)(registries, player, 'great-wall') ||
    (0, exports.ownsWonder)(registries, player, 'united-nations');
exports.pacifies = pacifies;
exports.default = exports.ownsWonder;
//# sourceMappingURL=wonders.js.map