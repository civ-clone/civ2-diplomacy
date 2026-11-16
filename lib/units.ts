import Advance from '@civ-clone/core-science/Advance';
import BuildCost from '@civ-clone/core-city-build/Rules/BuildCost';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Unit from '@civ-clone/core-unit/Unit';
import { advances } from '@civ-clone/civ2-science/data/advances';
import { knows } from './standing';
import { leadsTo } from './survey';

// What a unit given to a computer player is worth to it (`diplo_gift_menu`, `diplomacy.cpp:2600-2700`).

/** @COSMIC's shield box rows: a unit's build cost is its rows of shields times these. */
const SHIELD_BOX_ROWS = 10;

const advancesFor = (
  dependencies: Dependencies,
  UnitType: Function,
  relation: 'requires' | 'obsoletedBy'
): (typeof Advance)[] => {
  try {
    return (
      dependencies.requirementRegistry?.for(UnitType as any, relation) ?? []
    )
      .flatMap((entry) => entry.targets as unknown[])
      .filter(
        (target): target is typeof Advance =>
          typeof target === 'function' &&
          (target as Function).prototype instanceof Advance
      );
  } catch (e) {
    return [];
  }
};

/** The unit's cost in rows of shields (`unit_types.cost`), from the game's `BuildCost` rules. */
export const unitCost = (dependencies: Dependencies, unit: Unit): number => {
  const UnitType = unit.constructor,
    [cost] = dependencies.ruleRegistry.process(
      BuildCost,
      { item: () => UnitType } as any,
      null
    );

  return cost === undefined
    ? 1
    : Math.max(1, Math.trunc(cost.value() / SHIELD_BOX_ROWS));
};

export interface UnitTerms {
  // How much warmer the computer player is for it: 3 × its cost, halved if it knows the unit's prerequisite.
  attitude: number;
  // The computer player knows what makes it obsolete: it refuses the gift.
  obsolete: boolean;
  // The advance it may learn from the unit one time in two: the first it lacks that leads to the unit's prerequisite,
  //  when it lacks that prerequisite (`str_breakthrough`).
  breakthrough: typeof Advance | null;
}

export const unitTerms = (
  dependencies: Dependencies,
  computer: Player,
  unit: Unit
): UnitTerms => {
  const UnitType = unit.constructor,
    [prerequisite] = advancesFor(dependencies, UnitType, 'requires'),
    obsoletedBy = advancesFor(dependencies, UnitType, 'obsoletedBy'),
    knowsPrerequisite =
      prerequisite === undefined || knows(dependencies, computer, prerequisite),
    cost = unitCost(dependencies, unit) * 3;

  return {
    attitude: knowsPrerequisite ? Math.trunc(cost / 2) : cost,
    obsolete: obsoletedBy.some((Type) => knows(dependencies, computer, Type)),
    breakthrough: knowsPrerequisite
      ? null
      : advances
          .map(([Type]) => Type)
          .find(
            (Type) =>
              !knows(dependencies, computer, Type) &&
              leadsTo(Type, prerequisite!)
          ) ?? null,
  };
};

export default unitTerms;
