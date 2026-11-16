import {
  CEASEFIRE_LINGERS,
  CHANGED_THIS_TURN,
  TRIBUTE,
  clearBoth,
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
import City from '@civ-clone/core-city/City';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
import { advances } from '@civ-clone/civ2-science/data/advances';
import { attitude } from './relations';
import { civilize } from './standing';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

// What the talks' answers do, shared by the rows' rules and the turn's rules.

/** Every attitude between the two kept at `cap` or below (`diplo_sign_peace_treaty`, `diplo_agree_ceasefire`). */
export const capAttitudes = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  cap: number,
  reason: string
): void => {
  const attitudes = attitude(dependencies);

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

/** `diplo_sign_peace_treaty` (`:1074`): peace, signed this turn, attitudes 50 or below. */
export const signPeace = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  makePeace(dependencies, player, other);
  capAttitudes(dependencies, player, other, 50, 'peace');
  setBoth(dependencies, player, other, CHANGED_THIS_TURN);
  recordContact(dependencies, player, other, dependencies.turn.value());
};

/** `diplo_agree_ceasefire` (`:1101`): a ceasefire, attitudes 50 or below, no tribute owed. */
export const signCeasefire = (
  dependencies: Dependencies,
  player: Player,
  other: Player
): void => {
  makeCeasefire(dependencies, player, other);
  capAttitudes(dependencies, player, other, 50, 'ceasefire');
  clearBoth(dependencies, player, other, TRIBUTE);
  setBoth(dependencies, player, other, CHANGED_THIS_TURN);
  recordContact(dependencies, player, other, dependencies.turn.value());
};

/** `diplo_form_alliance` (`:1050`): an alliance, and the computer player's attitude 25 warmer. */
export const formAlliance = (
  dependencies: Dependencies,
  computer: Player,
  other: Player
): void => {
  makeAlliance(dependencies, computer, other);
  attitude(dependencies).adjust(computer, other, -25, 'alliance');
  setBoth(dependencies, computer, other, CHANGED_THIS_TURN);
  clearBoth(dependencies, computer, other, CEASEFIRE_LINGERS);
};

/**
 * `diplo_expel_units` (`:4243`): each of `player`'s units nearer one of `host`'s cities than its own goes to its own
 *  nearest city (a land unit on a land mass where `host` has cities, any unit at sea; trade units stay). Units are
 *  moved, not walked, as the original's are.
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

  const nearest = (unit: Unit, cities: City[]): [City, number] =>
    cities.reduce(
      ([best, distance]: [City, number], city: City): [City, number] => {
        const here = unit.tile().distanceFrom(city.tile());

        return here < distance ? [city, here] : [best, distance];
      },
      [cities[0], unit.tile().distanceFrom(cities[0].tile())]
    );

  let moved = 0;

  dependencies.unitRegistry.getByPlayer(player).forEach((unit: Unit) => {
    const [, hostDistance] = nearest(unit, hostCities),
      [home, homeDistance] = nearest(unit, ownCities);

    if (hostDistance >= homeDistance || unit.tile() === home.tile()) {
      return;
    }

    unit.setTile(home.tile());
    unit.setStatus(null);
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

/**
 * What a computer player thinks `advance` is worth (`ai_advance_value`, in part): RULES.TXT's value for it, plus its
 *  civilized modifier times the leader's civilize attitude, at least 1. The terms for the player's own cities and units
 *  are left out.
 */
export const advanceValue = (
  dependencies: Dependencies,
  player: Player,
  advance: Advance | typeof Advance
): number => {
  const AdvanceType =
      advance instanceof Advance
        ? advance.sourceClass<typeof Advance>()
        : advance,
    row = advances.find(([Type]) => Type === AdvanceType);

  if (row === undefined) {
    return 1;
  }

  const [, , , aiValue, civilizedModifier] = row;

  return Math.max(
    1,
    aiValue + civilizedModifier * civilize(dependencies, player)
  );
};

/** `from`'s advances that `by` lacks, the ones `by` values most first. */
export const advancesWanted = (
  dependencies: Dependencies,
  from: Player,
  by: Player
): Advance[] => {
  try {
    const byResearch = dependencies.playerResearchRegistry.getByPlayer(by);

    return dependencies.playerResearchRegistry
      .getByPlayer(from)
      .complete()
      .filter((advance: Advance): boolean => {
        const AdvanceType = advance.sourceClass<typeof Advance>();

        return !AdvanceType.repeatable && !byResearch.completed(AdvanceType);
      })
      .map((advance: Advance, index: number): [Advance, number, number] => [
        advance,
        advanceValue(dependencies, by, advance),
        index,
      ])
      .sort(([, a, i], [, b, j]) => b - a || j - i)
      .map(([advance]) => advance);
  } catch (e) {
    return [];
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
