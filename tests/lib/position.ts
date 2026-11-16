import Advance from '@civ-clone/core-science/Advance';
import AIClient from '@civ-clone/core-ai-client/AIClient';
import Democracy from '@civ-clone/base-government-democracy/Democracy';
import Dependencies from '../../lib/Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import { IAction } from '@civ-clone/core-diplomacy/Negotiation/Action';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import LandMass from '@civ-clone/core-world/LandMass';
import MilitaryStrength from '@civ-clone/core-power/Rules/MilitaryStrength';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import Player from '@civ-clone/core-player/Player';
import Rank from '@civ-clone/core-power/Rules/Rank';
import Republic from '@civ-clone/base-government-republic/Republic';
import Resolution from '@civ-clone/core-diplomacy/Proposal/Resolution';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { getRules } from '../../registerRules';

// A hand-built position, as base-diplomacy's tests have it: who has what where, with stand-ins for everything the
//  rules only read. Land masses are lists of stand-in tiles; a unit or city is on one of them, or at sea.
export interface Side {
  human?: boolean;
  gold?: number;
  rank?: number;
  government?: 'republic' | 'democracy';
  advances?: (typeof Advance)[];
  wonders?: (new (...args: any[]) => object)[];
  units?: { on: number | null; attack: number; defence: number }[];
  cities?: number[];
}

export class Bronze extends Advance {}
export class Wheel extends Advance {}
export class Alphabet extends Advance {}

export const position = (
  sides: Side[],
  {
    landMasses = 3,
    level = 3,
    turn = 100,
    random = () => 0,
    registerRules = true,
  }: {
    landMasses?: number;
    level?: number;
    turn?: number;
    random?: () => number;
    registerRules?: boolean;
  } = {}
) => {
  const ruleRegistry = new RuleRegistry(),
    interactionRegistry = new InteractionRegistry(),
    tiles = Array.from({ length: landMasses }, () => [
      Object.assign(Object.create(Tile.prototype), {
        isWater: () => false,
        distanceFrom: () => 5,
        getNeighbours: () => [],
      }) as Tile,
    ]),
    masses = tiles.map((landMassTiles) => new LandMass(landMassTiles)),
    sea = {} as Tile,
    players = sides.map(() => new Player(ruleRegistry)),
    side = (player: Player): Side => sides[players.indexOf(player)],
    gold = new Map(
      players.map((player, index) => [player, sides[index].gold ?? 0])
    ),
    advances = new Map(
      players.map((player, index) => [
        player,
        [...(sides[index].advances ?? [])],
      ])
    ),
    units = new Map(
      players.map((player, index) => [
        player,
        (sides[index].units ?? []).map(({ on, attack, defence }) =>
          Object.assign(Object.create(Unit.prototype), {
            attack: () => ({ value: () => attack }),
            defence: () => ({ value: () => defence }),
            player: () => player,
            tile: () => (on === null ? sea : tiles[on][0]),
            hasTrait: () => false,
          })
        ),
      ])
    ),
    cities = new Map(
      players.map((player, index) => [
        player,
        (sides[index].cities ?? []).map((on) => ({
          player: () => player,
          originalPlayer: () => player,
          tile: () => tiles[on][0],
          tiles: () => ({ entries: () => [] }),
        })),
      ])
    ),
    clock = { turn },
    wonders = new Map(
      players.map((player, index) => [player, sides[index].wonders ?? []])
    );

  ruleRegistry.register(
    new MilitaryStrength(
      new Effect((unit: Unit) => ({
        attack: unit.attack().value(),
        defence: unit.defence().value(),
      }))
    ),
    new Rank(new Effect((player: Player) => side(player).rank ?? 0))
  );

  const dependencies = {
    cityRegistry: {
      getByPlayer: (player: Player) => cities.get(player) ?? [],
      getByTile: () => null,
    },
    clientRegistry: {
      getBy: (key: string, player: Player) => [
        side(player).human ? {} : Object.create(AIClient.prototype),
      ],
      // Each side takes the first choice offered.
      getByPlayer: () => ({
        chooseFromList: async (meta: { choices(): unknown[] }) =>
          (meta.choices()[0] as any).value(),
      }),
    },
    gameDifficultyRegistry: { get: () => ({ level: () => level }) },
    interactionRegistry,
    landMassRegistry: { entries: () => masses },
    playerGovernmentRegistry: {
      getByPlayer: (player: Player) => ({
        is: (...governments: unknown[]) =>
          (side(player).government === 'republic' &&
            governments.includes(Republic)) ||
          (side(player).government === 'democracy' &&
            governments.includes(Democracy)),
      }),
    },
    playerRegistry: { entries: () => players },
    playerResearchRegistry: {
      getByPlayer: (player: Player) => ({
        complete: () =>
          advances.get(player)!.map((AdvanceType) =>
            Object.assign(Object.create(AdvanceType.prototype), {
              sourceClass: () => AdvanceType,
            })
          ),
        completed: (AdvanceType: typeof Advance) =>
          advances.get(player)!.includes(AdvanceType),
        addAdvance: (AdvanceType: typeof Advance) =>
          advances.get(player)!.push(AdvanceType),
      }),
    },
    playerTreasuryRegistry: {
      getByPlayerAndType: (player: Player) => ({
        value: () => gold.get(player)!,
        add: (value: number) => gold.set(player, gold.get(player)! + value),
        subtract: (value: number) =>
          gold.set(player, gold.get(player)! - value),
      }),
    },
    ruleRegistry,
    traitRegistry: { getByLeader: () => [] },
    turn: { value: () => clock.turn },
    wonderRegistry: {
      getByPlayer: (player: Player) =>
        (wonders.get(player) ?? []).map((WonderType) =>
          Object.assign(Object.create(WonderType.prototype), {
            city: () => ({ destroyed: () => false }),
          })
        ),
    },
    requirementRegistry: { for: () => [] },
    unitRegistry: {
      getByPlayer: (player: Player) => units.get(player) ?? [],
      getByTile: () => [],
    },
  } as unknown as Dependencies;

  const emitted: unknown[][] = [],
    engine = { emit: (...args: unknown[]) => emitted.push(args) } as any;

  if (registerRules) {
    ruleRegistry.register(...getRules(dependencies, { engine, rng: random }));
  }

  return {
    advances,
    clock,
    dependencies,
    emitted,
    gold,
    interactionRegistry,
    players,
    ruleRegistry,
  };
};

/** Takes the step `pick` chooses from those on offer, resolving a resolution's proposal, as the drivers do. */
export const take = async (
  negotiation: Negotiation,
  pick: (steps: IAction[]) => IAction | undefined = (steps) => steps[0]
): Promise<IAction> => {
  const steps = negotiation.nextSteps(),
    step = pick(steps);

  if (step === undefined) {
    throw new Error(
      `No such step among ${steps.map((s) => s.constructor.name).join(', ')}`
    );
  }

  negotiation.proceed(step);

  if (step instanceof Resolution) {
    await step.proposal().resolve(step);
  }

  return step;
};

/** The class names of the steps on offer. */
export const kinds = (negotiation: Negotiation): string[] =>
  negotiation.nextSteps().map((step) => step.constructor.name);

/** The first step of class `name`. */
export const named =
  (name: string) =>
  (steps: IAction[]): IAction | undefined =>
    steps.find((step) => step.constructor.name === name);

export default position;
