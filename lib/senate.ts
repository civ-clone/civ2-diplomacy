import { SNEAK_ATTACK, hasFlag } from './flags';
import { senateSteps, senateThreshold } from './formulas';
import Democracy from '@civ-clone/base-government-democracy/Democracy';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';
import Republic from '@civ-clone/base-government-republic/Republic';
import { SenateContext } from '@civ-clone/base-government-senate/Rules/SenateIntervenes';
import SenateRecord from '../Records/SenateRecord';
import SenateScandal from '../Rules/SenateScandal';
import { ownsWonder } from './wonders';
import { reputation } from './relations';
import senateIntervenes from '@civ-clone/base-government-senate/lib/senate';

// Civilization II's Senate (OpenCiv2 `diplo_senate_intervenes`, `diplomacy.cpp:5410`): a Republic's or a Democracy's
//  Senate stands aside when the turn's roll is under 15 × the other's reputation (25 more if the other sneak-attacked,
//  50 if we own the United Nations, at most 75); otherwise a Democracy's always steps in and a Republic's only while it
//  is in session, which changes one turn in three. The roll and the session are rolled at the start of each of the
//  player's turns and saved (`SenateRecord`), so the answer is the same however often it's asked.

/** The player's government, as far as a Senate goes. */
export const senateGovernment = (
  dependencies: Dependencies,
  player: Player
): 'none' | 'republic' | 'democracy' => {
  try {
    const government =
      dependencies.playerGovernmentRegistry.getByPlayer(player);

    if (government.is(Democracy)) {
      return 'democracy';
    }

    if (government.is(Republic)) {
      return 'republic';
    }
  } catch (e) {
    // No government yet: no Senate.
  }

  return 'none';
};

export const senateRecord = (
  dependencies: Dependencies,
  player: Player
): SenateRecord | undefined =>
  dependencies.interactionRegistry
    .getByPlayers(player)
    .find(
      (interaction): interaction is SenateRecord =>
        interaction instanceof SenateRecord && interaction.player() === player
    );

/**
 * The start of `player`'s turn: a new roll, 0 to 99, and one turn in three the Republic's Senate goes in or out of
 *  session (`civ.cpp:7069-7073`). Nothing is kept for a player whose government has never had a Senate.
 */
export const rollSenate = (
  dependencies: Dependencies,
  player: Player,
  random: () => number
): void => {
  const roll = Math.floor(random() * 100),
    toggle = Math.floor(random() * 3) === 0,
    record = senateRecord(dependencies, player);

  if (record !== undefined) {
    record.set(roll, toggle ? !record.inSession() : record.inSession());

    return;
  }

  if (senateGovernment(dependencies, player) === 'none') {
    return;
  }

  dependencies.interactionRegistry.register(
    new SenateRecord(
      player,
      roll,
      toggle,
      dependencies.ruleRegistry,
      dependencies.turn
    )
  );
};

/**
 * Whether `player`'s Senate steps in about `other` (the `SenateIntervenes` rule's answer). `context.roll` overrides the
 *  saved roll, `context.reputation` the other's reputation, `context.sneakAttack` the saved sneak attack and
 *  `context.bonus` the wonder bonus, for a caller that knows better.
 */
export const civ2SenateIntervenes = (
  dependencies: Dependencies,
  player: Player,
  other: Player | null,
  context: SenateContext = {}
): boolean => {
  const government = senateGovernment(dependencies, player);

  if (government === 'none') {
    return false;
  }

  const record = senateRecord(dependencies, player),
    roll = context.roll ?? record?.value() ?? 0,
    otherReputation =
      context.reputation ??
      (other === null ? 0 : reputation(dependencies).get(other)),
    sneakAttack =
      context.sneakAttack ??
      (other !== null && hasFlag(dependencies, other, player, SNEAK_ATTACK)),
    threshold =
      context.bonus !== undefined
        ? Math.min(75, Math.max(0, context.bonus + otherReputation * 15))
        : senateThreshold(
            sneakAttack,
            ownsWonder(dependencies, player, 'united-nations'),
            otherReputation
          );

  return senateSteps(government, roll, threshold, record?.inSession() ?? false);
};

/** Whether `player`'s Senate steps in, through the game's `SenateIntervenes` rules. */
export const senateBlocks = (
  dependencies: Dependencies,
  player: Player,
  other: Player | null,
  reason: string
): boolean =>
  senateIntervenes(player, other, { reason }, dependencies.ruleRegistry);

/**
 * A scandal (`diplomacy.cpp:6400`): a Democracy always falls, a Republic one time in two. Tells the `SenateScandal`
 *  rules, and answers whether there was one.
 */
export const senateScandal = (
  dependencies: Dependencies,
  player: Player,
  other: Player,
  random: () => number
): boolean => {
  const government = senateGovernment(dependencies, player);

  if (
    government === 'democracy' ||
    (government === 'republic' && random() < 0.5)
  ) {
    dependencies.ruleRegistry.process(SenateScandal, player, other);

    return true;
  }

  return false;
};
