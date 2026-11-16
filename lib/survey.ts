import { civilize, knows } from './standing';
import {
  Computers,
  Industrialization,
  Invention,
  Navigation,
  University,
} from '@civ-clone/civ2-science/Advances';
import Advance from '@civ-clone/core-science/Advance';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import { advances } from '@civ-clone/civ2-science/data/advances';

// The advances two players could trade (OpenCiv2 `diplo_exchange_survey`, `diplomacy.cpp:726`), and what a computer
//  player thinks one is worth (`ai_advance_value`, `ai.cpp:360`).

const indexOf = (AdvanceType: typeof Advance): number =>
  advances.findIndex(([Type]) => Type === AdvanceType);

const typeOf = (advance: Advance | typeof Advance): typeof Advance =>
  advance instanceof Advance ? advance.sourceClass<typeof Advance>() : advance;

/** `advance_has_prereq(advance, prerequisite)`: whether `prerequisite` leads to `advance`, however far back. */
export const leadsTo = (
  prerequisite: typeof Advance,
  advance: typeof Advance
): boolean => {
  const target = indexOf(prerequisite),
    seen = new Set<number>(),
    visit = (index: number): boolean => {
      if (index < 0 || seen.has(index)) {
        return false;
      }

      seen.add(index);

      const row = advances[index];

      if (row === undefined) {
        return false;
      }

      const [, first, second] = row;

      return [first, second].some(
        (prerequisiteIndex) =>
          prerequisiteIndex === target || visit(prerequisiteIndex)
      );
    };

  return visit(indexOf(advance));
};

/** Whether anyone in the game knows `AdvanceType` (`game.advance_known_by`). */
const knownByAnyone = (
  dependencies: Dependencies,
  AdvanceType: typeof Advance
): number =>
  dependencies.playerRegistry
    .entries()
    .filter((player: Player) => knows(dependencies, player, AdvanceType))
    .length;

/**
 * `ai_advance_value(player, advance)`, in part: RULES.TXT's value plus its civilized modifier times the leader's
 *  civilize attitude (a computer player at war with a person ahead of it on a shared land mass leans less civilized:
 *  not ported); +1 or +2 toward Computers once it knows University; +1 toward Industrialization once it knows
 *  Invention, +2 with Navigation; +1 if nobody knows it; −1 for each known advance it leads to; at least 1. Left out:
 *  the terms for the player's cities and units (expansion by sea, the Port Facility, the Aqueduct and Sewer, its
 *  tribe's own preferences and the computer players' bonus terms).
 */
export const advanceValue = (
  dependencies: Dependencies,
  player: Player,
  advance: Advance | typeof Advance
): number => {
  const AdvanceType = typeOf(advance),
    index = indexOf(AdvanceType),
    row = advances[index];

  if (row === undefined) {
    return 1;
  }

  const [, , , aiValue, civilizedModifier] = row,
    temper = civilize(dependencies, player);

  let value = aiValue + civilizedModifier * temper;

  if (temper > -1 && knows(dependencies, player, University)) {
    if (leadsTo(AdvanceType, Computers)) {
      value += temper + 1;
    }

    if (AdvanceType === Computers) {
      value += 2;
    }
  }

  if (
    knows(dependencies, player, Invention) &&
    leadsTo(AdvanceType, Industrialization)
  ) {
    value += knows(dependencies, player, Navigation) ? 2 : 1;
  }

  if (knownByAnyone(dependencies, AdvanceType) === 0) {
    value++;
  }

  advances.forEach(([Type, first, second]) => {
    if (
      (first === index || second === index) &&
      knows(dependencies, player, Type)
    ) {
      value--;
    }
  });

  return value < 2 ? 1 : value;
};

export interface Survey {
  // The person's advances the computer player lacks, the one it values most and the next (`offer_tech_best`, `_2nd`).
  best: Advance | null;
  second: Advance | null;
  bestValue: number;
  secondValue: number;
  // The computer player's advance the person values most (`wanted_tech`).
  wanted: Advance | null;
  // How many advances each knows.
  personCount: number;
  computerCount: number;
}

const completed = (dependencies: Dependencies, player: Player): Advance[] => {
  try {
    return dependencies.playerResearchRegistry
      .getByPlayer(player)
      .complete()
      .filter((advance: Advance) => !typeOf(advance).repeatable);
  } catch (e) {
    return [];
  }
};

/** `diplo_exchange_survey`: walks the advances in RULES.TXT's order, as the original does. */
export const survey = (
  dependencies: Dependencies,
  computer: Player,
  person: Player
): Survey => {
  const theirs = completed(dependencies, person),
    ours = completed(dependencies, computer),
    has = (list: Advance[], AdvanceType: typeof Advance) =>
      list.find((advance) => typeOf(advance) === AdvanceType) ?? null,
    order = (list: Advance[]) =>
      list
        .map((advance): [Advance, number] => [
          advance,
          indexOf(typeOf(advance)),
        ])
        .sort(([, a], [, b]) => a - b)
        .map(([advance]) => advance),
    result: Survey = {
      best: null,
      second: null,
      bestValue: 0,
      secondValue: 0,
      wanted: null,
      personCount: theirs.length,
      computerCount: ours.length,
    };

  let wantedValue = 0;

  order(ours).forEach((advance) => {
    if (has(theirs, typeOf(advance)) !== null) {
      return;
    }

    const value = advanceValue(dependencies, person, advance);

    if (wantedValue <= value) {
      result.wanted = advance;
      wantedValue = value;
    }
  });

  order(theirs).forEach((advance) => {
    if (has(ours, typeOf(advance)) !== null) {
      return;
    }

    const value = advanceValue(dependencies, computer, advance);

    if (value < result.bestValue) {
      if (result.secondValue <= value) {
        result.second = advance;
        result.secondValue = value;
      }

      return;
    }

    if (result.best !== null) {
      result.second = result.best;
      result.secondValue = result.bestValue;
    }

    result.best = advance;
    result.bestValue = value;
  });

  return result;
};
