import {
  AGGRESSOR,
  CHANGED_THIS_TURN,
  SIGNING_CLEARS,
  TRIBUTE,
  WAR_END_CLEARS,
  clearBoth,
  clearFlag,
  setBoth,
} from './flags';
import {
  cancelAlliance,
  declareWar,
  makeAlliance,
  makeCeasefire,
  makePeace,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import Advance from '@civ-clone/core-science/Advance';
import TradeMissions from '@civ-clone/base-unit-trait-trade-missions/TradeMissions';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import { activeDeclarations } from '@civ-clone/base-diplomacy/lib/declareWar';
import { patience } from '@civ-clone/base-diplomacy/lib/patience';
import City from '@civ-clone/core-city/City';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
import { attitude } from './relations';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

// What the talks' answers do, shared by the rows' rules and the turn's rules.

/** `holder`'s attitude toward `toward` kept at `cap` or below. */
export const capAttitude = (
  dependencies: Dependencies,
  holder: Player,
  toward: Player,
  cap: number,
  reason: string
): void => {
  const attitudes = attitude(dependencies),
    value = attitudes.get(holder, toward);

  if (value !== undefined && value > cap) {
    attitudes.set(holder, toward, cap, reason);
  }
};

// What signing any treaty does to the bits (`diplo_set_treaty_flags` with a treaty: `0x2a60` cleared both ways), and
//  the war it ends (clearing `TREATY_WAR` clears `0x1800` too).
const signed = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  activeDeclarations(dependencies, War, player, other).forEach((war) =>
    war.expire(player)
  );
  clearBoth(dependencies, player, other, SIGNING_CLEARS | WAR_END_CLEARS);
};

/**
 * `diplo_civs_meet_peace` (`:5833`), two computer players making peace: the treaty and nothing else
 *  (`diplo_set_treaty_flags(civ, civ2, 4)`).
 */
export const makeTreatyPeace = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  signed(dependencies, player, other);
  makePeace(dependencies, player, other);
};

/**
 * `diplo_sign_peace_treaty` (`:1074`): peace signed this turn (`0x4004`), any war ended, the computer player's attitude
 *  50 or below, its patience reset, contact now.
 */
export const signPeace = (
  dependencies: Dependencies,
  computer: Player,
  person: Player
): void => {
  makeTreatyPeace(dependencies, computer, person);
  capAttitude(dependencies, computer, person, 50, 'peace');
  setBoth(dependencies, computer, person, CHANGED_THIS_TURN);
  patience(dependencies, computer, person).reset();
  recordContact(dependencies, computer, person, dependencies.turn.value());
};

/**
 * `diplo_agree_ceasefire` (`:1101`): a ceasefire signed this turn (`0x4002`), no tribute owed, the computer player's
 *  attitude 50 or below, contact now, and nobody is the aggressor against the person any more.
 */
export const signCeasefire = (
  dependencies: Dependencies,
  computer: Player,
  person: Player
): void => {
  signed(dependencies, computer, person);
  makeCeasefire(dependencies, computer, person);
  setBoth(dependencies, computer, person, CHANGED_THIS_TURN);
  clearBoth(dependencies, computer, person, TRIBUTE);
  capAttitude(dependencies, computer, person, 50, 'ceasefire');
  recordContact(dependencies, computer, person, dependencies.turn.value());
  dependencies.playerRegistry
    .entries()
    .forEach((other: Player) =>
      clearFlag(dependencies, other, person, AGGRESSOR)
    );
};

/**
 * `diplo_form_alliance` (`:1050`): an alliance (and so peace), the computer player 25 warmer, its patience reset,
 *  contact now.
 */
export const formAlliance = (
  dependencies: Dependencies,
  computer: Player,
  other: Player
): void => {
  signed(dependencies, computer, other);
  makeAlliance(dependencies, computer, other);
  attitude(dependencies).adjust(computer, other, -25, 'alliance');
  patience(dependencies, computer, other).reset();
  recordContact(dependencies, computer, other, dependencies.turn.value());
};

const tradeUnit = (unit: Unit): boolean => {
  try {
    return unit.hasTrait(TradeMissions);
  } catch (e) {
    return false;
  }
};

/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own leaves: one at sea,
 *  or a land unit (not a trade unit) on a land mass where `host` has cities, goes to `player`'s nearest city (a unit at
 *  sea, its nearest city on the coast). Units are moved, not walked, as the original's are.
 */
export const expelUnits = (
  dependencies: Dependencies,
  player: Player,
  host: Player
): number => {
  const ownCities = dependencies.cityRegistry.getByPlayer(player),
    hostCities = dependencies.cityRegistry.getByPlayer(host);

  if (ownCities.length === 0 || hostCities.length === 0) {
    return 0;
  }

  const landMassOf = (() => {
      const byTile = new Map<unknown, unknown>();

      try {
        dependencies.landMassRegistry
          .entries()
          .forEach((landMass) =>
            landMass.tiles().forEach((tile) => byTile.set(tile, landMass))
          );
      } catch (e) {
        // No land masses: every land unit counts as on one of the host's.
      }

      return (tile: unknown): unknown => byTile.get(tile) ?? null;
    })(),
    hostLandMasses = new Set(
      hostCities.map((city: City) => landMassOf(city.tile()))
    ),
    nearest = (unit: Unit, cities: City[]): [City, number] =>
      cities.reduce(
        ([best, distance]: [City, number], city: City): [City, number] => {
          const here = unit.tile().distanceFrom(city.tile());

          return here < distance ? [city, here] : [best, distance];
        },
        [cities[0], unit.tile().distanceFrom(cities[0].tile())]
      );

  let moved = 0;

  dependencies.unitRegistry.getByPlayer(player).forEach((unit: Unit) => {
    const atSea = unit.tile().isWater();

    if (
      !atSea &&
      (tradeUnit(unit) || !hostLandMasses.has(landMassOf(unit.tile())))
    ) {
      return;
    }

    // A unit at sea goes to the nearest of its cities on the coast.
    const homes = atSea
      ? ownCities.filter((city: City) => city.tile().isCoast())
      : ownCities;

    if (homes.length === 0) {
      return;
    }

    const [, hostDistance] = nearest(unit, hostCities),
      [home, homeDistance] = nearest(unit, homes);

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

/** `diplo_cancel_alliance` (`:4300`): the alliance ends (they stay at peace), and each side's units go home. */
export const endAlliance = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  cancelAlliance(dependencies, player, other);
  expelUnits(dependencies, player, other);
  expelUnits(dependencies, other, player);
};

// Wars declared without reputation, as the original's computer players' threats set the war bit directly rather than
//  through `diplo_declare_war`.
const quiet = new WeakSet<Player>();

/** Whether `player` is declaring a war that costs no reputation just now. */
export const declaringQuietly = (player: Player): boolean => quiet.has(player);

/** `player` declares war on `other`, as the original's threats do: no reputation is lost. */
export const declareWarQuietly = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  quiet.add(player);

  try {
    declareWar(dependencies, player, other);
  } finally {
    quiet.delete(player);
  }
};

// Wars declared at another's request (the original's `civ2` argument): the declarer's own initiative counts for
//  nothing.
const instigated = new WeakMap<Player, Player>();

/** Who asked `player` to declare the war it is declaring just now, if anyone. */
export const instigatorOf = (player: Player): Player | null =>
  instigated.get(player) ?? null;

/** `player` declares war on `other` because `instigator` asked it to (`diplo_declare_war(player, other, instigator)`). */
export const declareWarFor = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  instigator: Player
): void => {
  instigated.set(player, instigator);

  try {
    declareWar(dependencies, player, other);
  } finally {
    instigated.delete(player);
  }
};

// Treaties a computer player ends without a word (the original's B37: it breaks them on its own side only).
const silenced = new WeakSet<object>();

/** Whether `declaration` was ended without a word. */
export const endedSilently = (declaration: object): boolean =>
  silenced.has(declaration);

/** `declaration` ends, `by` saying nothing of it: no notice is given (`Rules/relations`' announcement skips it). */
export const expireSilently = (
  declaration: { expire(by: Player): void },
  by: Player
): void => {
  silenced.add(declaration);
  declaration.expire(by);
};
