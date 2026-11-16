"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawUnits = exports.sendHome = exports.expireSilently = exports.endedSilently = exports.declareWarFor = exports.instigatorOf = exports.declareWarQuietly = exports.declaringQuietly = exports.endAlliance = exports.expelUnits = exports.formAlliance = exports.signCeasefire = exports.signPeace = exports.makeTreatyPeace = exports.capAttitude = void 0;
const flags_1 = require("./flags");
const declareWar_1 = require("@civ-clone/base-diplomacy/lib/declareWar");
const TradeMissions_1 = require("@civ-clone/base-unit-trait-trade-missions/TradeMissions");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
const declareWar_2 = require("@civ-clone/base-diplomacy/lib/declareWar");
const patience_1 = require("@civ-clone/base-diplomacy/lib/patience");
const relations_1 = require("./relations");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
// What the talks' answers do, shared by the rows' rules and the turn's rules.
/** `holder`'s attitude toward `toward` kept at `cap` or below. */
const capAttitude = (dependencies, holder, toward, cap, reason) => {
    const attitudes = (0, relations_1.attitude)(dependencies), value = attitudes.get(holder, toward);
    if (value !== undefined && value > cap) {
        attitudes.set(holder, toward, cap, reason);
    }
};
exports.capAttitude = capAttitude;
// What signing any treaty does to the bits (`diplo_set_treaty_flags` with a treaty: `0x2a60` cleared both ways), and
//  the war it ends (clearing `TREATY_WAR` clears `0x1800` too).
const signed = (dependencies, player, other) => {
    (0, declareWar_2.activeDeclarations)(dependencies, War_1.default, player, other).forEach((war) => war.expire(player));
    (0, flags_1.clearBoth)(dependencies, player, other, flags_1.SIGNING_CLEARS | flags_1.WAR_END_CLEARS);
};
/**
 * `diplo_civs_meet_peace` (`:5833`), two computer players making peace: the treaty and nothing else
 *  (`diplo_set_treaty_flags(civ, civ2, 4)`).
 */
const makeTreatyPeace = (dependencies, player, other) => {
    signed(dependencies, player, other);
    (0, declareWar_1.makePeace)(dependencies, player, other);
};
exports.makeTreatyPeace = makeTreatyPeace;
/**
 * `diplo_sign_peace_treaty` (`:1074`): peace signed this turn (`0x4004`), any war ended, the computer player's attitude
 *  50 or below, its patience reset, contact now.
 */
const signPeace = (dependencies, computer, person) => {
    (0, exports.makeTreatyPeace)(dependencies, computer, person);
    (0, exports.capAttitude)(dependencies, computer, person, 50, 'peace');
    (0, flags_1.setBoth)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN);
    (0, patience_1.patience)(dependencies, computer, person).reset();
    (0, lastContact_1.recordContact)(dependencies, computer, person, dependencies.turn.value());
};
exports.signPeace = signPeace;
/**
 * `diplo_agree_ceasefire` (`:1101`): a ceasefire signed this turn (`0x4002`), no tribute owed, the computer player's
 *  attitude 50 or below, contact now, and nobody is the aggressor against the person any more.
 */
const signCeasefire = (dependencies, computer, person) => {
    signed(dependencies, computer, person);
    (0, declareWar_1.makeCeasefire)(dependencies, computer, person);
    (0, flags_1.setBoth)(dependencies, computer, person, flags_1.CHANGED_THIS_TURN);
    (0, flags_1.clearBoth)(dependencies, computer, person, flags_1.TRIBUTE);
    (0, exports.capAttitude)(dependencies, computer, person, 50, 'ceasefire');
    (0, lastContact_1.recordContact)(dependencies, computer, person, dependencies.turn.value());
    dependencies.playerRegistry
        .entries()
        .forEach((other) => (0, flags_1.clearFlag)(dependencies, other, person, flags_1.AGGRESSOR));
};
exports.signCeasefire = signCeasefire;
/**
 * `diplo_form_alliance` (`:1050`): an alliance (and so peace), the computer player 25 warmer, its patience reset,
 *  contact now.
 */
const formAlliance = (dependencies, computer, other) => {
    signed(dependencies, computer, other);
    (0, declareWar_1.makeAlliance)(dependencies, computer, other);
    (0, relations_1.attitude)(dependencies).adjust(computer, other, -25, 'alliance');
    (0, patience_1.patience)(dependencies, computer, other).reset();
    (0, lastContact_1.recordContact)(dependencies, computer, other, dependencies.turn.value());
};
exports.formAlliance = formAlliance;
// The water squares joined to `tile`'s.
const waterBody = (start) => {
    const body = new Set([start]), queue = [start];
    while (queue.length > 0) {
        queue
            .shift()
            .getNeighbours()
            .forEach((tile) => {
            if (tile.isWater() && !body.has(tile)) {
                body.add(tile);
                queue.push(tile);
            }
        });
    }
    return body;
};
const tradeUnit = (unit) => {
    try {
        return unit.hasTrait(TradeMissions_1.default);
    }
    catch (e) {
        return false;
    }
};
/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own leaves: one at sea,
 *  or a land unit (not a trade unit) on a land mass where `host` has cities, goes to `player`'s nearest city (a unit at
 *  sea, its nearest city on the coast). Units are moved, not walked, as the original's are.
 */
const expelUnits = (dependencies, player, host) => {
    const ownCities = dependencies.cityRegistry.getByPlayer(player), hostCities = dependencies.cityRegistry.getByPlayer(host);
    if (ownCities.length === 0 || hostCities.length === 0) {
        return 0;
    }
    const landMassOf = (() => {
        const byTile = new Map();
        try {
            dependencies.landMassRegistry
                .entries()
                .forEach((landMass) => landMass.tiles().forEach((tile) => byTile.set(tile, landMass)));
        }
        catch (e) {
            // No land masses: every land unit counts as on one of the host's.
        }
        return (tile) => { var _a; return (_a = byTile.get(tile)) !== null && _a !== void 0 ? _a : null; };
    })(), hostLandMasses = new Set(hostCities.map((city) => landMassOf(city.tile()))), nearest = (unit, cities) => cities.reduce(([best, distance], city) => {
        const here = unit.tile().distanceFrom(city.tile());
        return here < distance ? [city, here] : [best, distance];
    }, [cities[0], unit.tile().distanceFrom(cities[0].tile())]);
    let moved = 0;
    dependencies.unitRegistry.getByPlayer(player).forEach((unit) => {
        const atSea = unit.tile().isWater();
        if (!atSea &&
            (tradeUnit(unit) || !hostLandMasses.has(landMassOf(unit.tile())))) {
            return;
        }
        // A unit at sea goes to the nearest of its cities on the same body of water (`city_adjacent_to_body`).
        const body = atSea ? waterBody(unit.tile()) : null, homes = body === null
            ? ownCities
            : ownCities.filter((city) => city
                .tile()
                .getNeighbours()
                .some((tile) => body.has(tile)));
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
/** `unit` goes to its player's nearest city, if it has one: moved, its orders dropped (`unit_relocate`). */
const sendHome = (dependencies, unit) => {
    const [home] = dependencies.cityRegistry
        .getByPlayer(unit.player())
        .map((city) => [
        city,
        unit.tile().distanceFrom(city.tile()),
    ])
        .sort(([, a], [, b]) => a - b)
        .map(([city]) => city);
    if (home === undefined || home.tile() === unit.tile()) {
        return false;
    }
    unit.setTile(home.tile());
    unit.setStatus(null);
    unit.applyVisibility();
    return true;
};
exports.sendHome = sendHome;
/**
 * A computer player withdraws its units from a person's land (`diplo_answer_demand`, `:1907-1935`): each of its land
 *  units on land, not a diplomat or trade unit, within 2 squares of one of the person's cities goes to its own nearest
 *  city. Answers how many moved.
 */
const withdrawUnits = (dependencies, computer, person) => {
    const cities = dependencies.cityRegistry.getByPlayer(person);
    return dependencies.unitRegistry
        .getByPlayer(computer)
        .filter((unit) => !unit.tile().isWater() &&
        unit.attack().value() + unit.defence().value() > 0 &&
        !tradeUnit(unit) &&
        cities.some((city) => unit.tile().distanceFrom(city.tile()) < 3))
        .filter((unit) => (0, exports.sendHome)(dependencies, unit)).length;
};
exports.withdrawUnits = withdrawUnits;
//# sourceMappingURL=effects.js.map