"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireSilently = exports.endedSilently = exports.advancesWanted = exports.advanceValue = exports.declareWarFor = exports.instigatorOf = exports.declareWarQuietly = exports.declaringQuietly = exports.endAlliance = exports.expelUnits = exports.formAlliance = exports.signCeasefire = exports.signPeace = exports.capAttitudes = void 0;
const flags_1 = require("./flags");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const Advance_1 = require("@civ-clone/core-science/Advance");
const advances_1 = require("@civ-clone/civ2-science/data/advances");
const relations_1 = require("./relations");
const standing_1 = require("./standing");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
// What the talks' answers do, shared by the rows' rules and the turn's rules.
/** Every attitude between the two kept at `cap` or below (`diplo_sign_peace_treaty`, `diplo_agree_ceasefire`). */
const capAttitudes = (dependencies, player, other, cap, reason) => {
    const attitudes = (0, relations_1.attitude)(dependencies);
    [
        [player, other],
        [other, player],
    ].forEach(([holder, toward]) => {
        const value = attitudes.get(holder, toward);
        if (value !== undefined && value > cap) {
            attitudes.set(holder, toward, cap, reason);
        }
    });
};
exports.capAttitudes = capAttitudes;
/** `diplo_sign_peace_treaty` (`:1074`): peace, signed this turn, attitudes 50 or below. */
const signPeace = (dependencies, player, other) => {
    (0, declareWar_1.makePeace)(dependencies, player, other);
    (0, exports.capAttitudes)(dependencies, player, other, 50, 'peace');
    (0, flags_1.setBoth)(dependencies, player, other, flags_1.CHANGED_THIS_TURN);
    (0, lastContact_1.recordContact)(dependencies, player, other, dependencies.turn.value());
};
exports.signPeace = signPeace;
/** `diplo_agree_ceasefire` (`:1101`): a ceasefire, attitudes 50 or below, no tribute owed. */
const signCeasefire = (dependencies, player, other) => {
    (0, declareWar_1.makeCeasefire)(dependencies, player, other);
    (0, exports.capAttitudes)(dependencies, player, other, 50, 'ceasefire');
    (0, flags_1.clearBoth)(dependencies, player, other, flags_1.TRIBUTE);
    (0, flags_1.setBoth)(dependencies, player, other, flags_1.CHANGED_THIS_TURN);
    (0, lastContact_1.recordContact)(dependencies, player, other, dependencies.turn.value());
};
exports.signCeasefire = signCeasefire;
/** `diplo_form_alliance` (`:1050`): an alliance, and the computer player's attitude 25 warmer. */
const formAlliance = (dependencies, computer, other) => {
    (0, declareWar_1.makeAlliance)(dependencies, computer, other);
    (0, relations_1.attitude)(dependencies).adjust(computer, other, -25, 'alliance');
    (0, flags_1.setBoth)(dependencies, computer, other, flags_1.CHANGED_THIS_TURN);
    (0, flags_1.clearBoth)(dependencies, computer, other, flags_1.CEASEFIRE_LINGERS);
};
exports.formAlliance = formAlliance;
/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own goes to its own
 *  nearest city (a land unit on a land mass where `host` has cities, any unit at sea; trade units stay). Units are
 *  moved, not walked, as the original's are.
 */
const expelUnits = (dependencies, player, host) => {
    const ownCities = dependencies.cityRegistry.getByPlayer(player), hostCities = dependencies.cityRegistry.getByPlayer(host);
    if (ownCities.length === 0 || hostCities.length === 0) {
        return 0;
    }
    const nearest = (unit, cities) => cities.reduce(([best, distance], city) => {
        const here = unit.tile().distanceFrom(city.tile());
        return here < distance ? [city, here] : [best, distance];
    }, [cities[0], unit.tile().distanceFrom(cities[0].tile())]);
    let moved = 0;
    dependencies.unitRegistry.getByPlayer(player).forEach((unit) => {
        const atSea = unit.tile().isWater(), 
        // A unit at sea goes to the nearest of its cities on the coast.
        homes = atSea
            ? ownCities.filter((city) => city.tile().isCoast())
            : ownCities;
        if (homes.length === 0) {
            return;
        }
        const [, hostDistance] = nearest(unit, hostCities), [home, homeDistance] = nearest(unit, homes);
        if (hostDistance >= homeDistance || unit.tile() === home.tile()) {
            return;
        }
        unit.setTile(home.tile());
        unit.setStatus(null);
        unit.applyVisibility();
        moved++;
    });
    return moved;
};
exports.expelUnits = expelUnits;
/** `diplo_cancel_alliance` (`:4300`): the alliance ends (they stay at peace), and each side's units go home. */
const endAlliance = (dependencies, player, other) => {
    (0, declareWar_1.cancelAlliance)(dependencies, player, other);
    (0, exports.expelUnits)(dependencies, player, other);
    (0, exports.expelUnits)(dependencies, other, player);
};
exports.endAlliance = endAlliance;
// Wars declared without reputation, as the original's computer players' threats set the war bit directly rather than
//  through `diplo_declare_war`.
const quiet = new WeakSet();
/** Whether `player` is declaring a war that costs no reputation just now. */
const declaringQuietly = (player) => quiet.has(player);
exports.declaringQuietly = declaringQuietly;
/** `player` declares war on `other`, as the original's threats do: no reputation is lost. */
const declareWarQuietly = (dependencies, player, other) => {
    quiet.add(player);
    try {
        (0, declareWar_1.declareWar)(dependencies, player, other);
    }
    finally {
        quiet.delete(player);
    }
};
exports.declareWarQuietly = declareWarQuietly;
// Wars declared at another's request (the original's `civ2` argument): the declarer's own initiative counts for
//  nothing.
const instigated = new WeakMap();
/** Who asked `player` to declare the war it is declaring just now, if anyone. */
const instigatorOf = (player) => { var _a; return (_a = instigated.get(player)) !== null && _a !== void 0 ? _a : null; };
exports.instigatorOf = instigatorOf;
/** `player` declares war on `other` because `instigator` asked it to (`diplo_declare_war(player, other, instigator)`). */
const declareWarFor = (dependencies, player, other, instigator) => {
    instigated.set(player, instigator);
    try {
        (0, declareWar_1.declareWar)(dependencies, player, other);
    }
    finally {
        instigated.delete(player);
    }
};
exports.declareWarFor = declareWarFor;
/**
 * What a computer player thinks `advance` is worth (`ai_advance_value`, in part): RULES.TXT's value for it, plus its
 *  civilized modifier times the leader's civilize attitude, at least 1. The terms for the player's own cities and units
 *  are left out.
 */
const advanceValue = (dependencies, player, advance) => {
    const AdvanceType = advance instanceof Advance_1.default
        ? advance.sourceClass()
        : advance, row = advances_1.advances.find(([Type]) => Type === AdvanceType);
    if (row === undefined) {
        return 1;
    }
    const [, , , aiValue, civilizedModifier] = row;
    return Math.max(1, aiValue + civilizedModifier * (0, standing_1.civilize)(dependencies, player));
};
exports.advanceValue = advanceValue;
/** `from`'s advances that `by` lacks, the ones `by` values most first. */
const advancesWanted = (dependencies, from, by) => {
    try {
        const byResearch = dependencies.playerResearchRegistry.getByPlayer(by);
        return dependencies.playerResearchRegistry
            .getByPlayer(from)
            .complete()
            .filter((advance) => {
            const AdvanceType = advance.sourceClass();
            return !AdvanceType.repeatable && !byResearch.completed(AdvanceType);
        })
            .map((advance, index) => [
            advance,
            (0, exports.advanceValue)(dependencies, by, advance),
            index,
        ])
            .sort(([, a, i], [, b, j]) => b - a || j - i)
            .map(([advance]) => advance);
    }
    catch (e) {
        return [];
    }
};
exports.advancesWanted = advancesWanted;
// Treaties a computer player ends without a word (the original's B37: it breaks them on its own side only).
const silenced = new WeakSet();
/** Whether `declaration` was ended without a word. */
const endedSilently = (declaration) => silenced.has(declaration);
exports.endedSilently = endedSilently;
/** `declaration` ends, `by` saying nothing of it: no notice is given (`Rules/relations`' announcement skips it). */
const expireSilently = (declaration, by) => {
    silenced.add(declaration);
    declaration.expire(by);
};
exports.expireSilently = expireSilently;
//# sourceMappingURL=effects.js.map