import {
  attitudeRules,
  dialogueRules,
  interactionRules,
  proposalAvailableRules,
  resolvedRules,
  stepRules,
  terminatedRules,
} from './lib/rules/talks';
import {
  createdRules,
  declaredWarRules,
  detonatedRules,
  expiredRules,
} from './lib/rules/relations';
import { Game, defaultGame } from '@civ-clone/core-game';
import Dependencies from './lib/Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Player from '@civ-clone/core-player/Player';
import Rule from '@civ-clone/core-rule/Rule';
import { SENATE_RULE } from './RuleIds';
import SenateIntervenes from '@civ-clone/base-government-senate/Rules/SenateIntervenes';
import baseDetonatedRules from '@civ-clone/base-diplomacy/lib/rules/detonated';
import baseInteractionRules from '@civ-clone/base-diplomacy/lib/rules/interaction';
import { civ2SenateIntervenes } from './lib/senate';
import mayNegotiateRules from '@civ-clone/base-diplomacy/lib/rules/mayNegotiate';
import movedRules from '@civ-clone/base-diplomacy/lib/rules/moved';
import readers from './lib/readers';
import { senateGovernment } from './lib/senate';
import { spacing } from './lib/numbers';
import talks from './lib/talks';
import { turnStartRules } from './lib/rules/turnStart';
import civsMeetRules from './lib/rules/civsMeet';

export const PREFIX = 'civ2-diplomacy';

export const dependenciesOf = (game: Game): Dependencies => ({
  cityBuildRegistry: game.cityBuilds,
  cityRegistry: game.cities,
  clientRegistry: game.clients,
  gameDifficultyRegistry: game.difficulty,
  interactionRegistry: game.interactions,
  landMassRegistry: game.landMasses,
  playerGovernmentRegistry: game.playerGovernments,
  playerRegistry: game.players,
  playerResearchRegistry: game.playerResearch,
  playerTreasuryRegistry: game.playerTreasuries,
  playerWorldRegistry: game.playerWorlds,
  requirementRegistry: game.requirements,
  ruleRegistry: game.rules,
  tileImprovementRegistry: game.tileImprovements,
  traitRegistry: game.traits,
  turn: game.turn,
  unitRegistry: game.units,
  wonderRegistry: game.wonders,
});

// The rules base-diplomacy's assemblers make that Civilization II keeps: registering each step of a negotiation, and
//  the payment of tribute and the exchange of advances when they're accepted.
const kept = <T extends Rule<any, any>>(rules: T[], ...names: string[]): T[] =>
  rules.filter((rule) =>
    names.some((name) => rule.id() === `${PREFIX}:${name}`)
  );

/**
 * Civilization II's diplomacy (OpenCiv2 `src/auto/diplomacy.cpp`, Classic):
 *
 * - the talks between a computer player and a person, whoever opens them: the computer player's business in the
 *   original's order, the person's menu of proposals and the computer player's answers (`lib/talks`);
 * - attitude: seeded at contact, changed by what is said and done, and drifting each turn;
 * - reputation: lost by breaking treaties, recovered on schedule;
 * - the Senate, on a roll kept each turn;
 * - ceasefires, alliances and two computer players meeting, at the start of each turn;
 * - contact when units meet, when talks open and when an embassy is made.
 */
export const getRules = (
  dependencies: Dependencies,
  game: Pick<Game, 'engine' | 'rng'>
): Rule<any, any>[] => {
  const read = readers(dependencies),
    random = game.rng,
    meeting = talks({ dependencies, random }),
    republican = (player: Player): boolean =>
      senateGovernment(dependencies, player) !== 'none',
    pairs = {
      random,
      nuclear: read.nuclear,
      republican,
      engine: game.engine,
    };

  return [
    ...expiredRules(PREFIX, game.engine),
    ...kept(
      baseInteractionRules(PREFIX, dependencies),
      'negotiation/interaction/register'
    ),
    ...interactionRules(PREFIX, dependencies, meeting),
    ...stepRules(meeting),
    ...proposalAvailableRules(PREFIX, dependencies, republican),
    ...mayNegotiateRules(PREFIX, dependencies, read.isHuman, spacing),
    ...resolvedRules(PREFIX, dependencies, game.engine, random),
    ...attitudeRules(PREFIX, dependencies),
    ...dialogueRules(PREFIX, dependencies, game.engine, random),
    ...terminatedRules(PREFIX, dependencies, meeting),
    ...baseDetonatedRules(PREFIX, dependencies),
    ...detonatedRules(PREFIX, dependencies),
    ...movedRules(dependencies.interactionRegistry, dependencies.unitRegistry),
    ...createdRules(PREFIX, dependencies, random),
    ...declaredWarRules(PREFIX, dependencies, game.engine),
    ...turnStartRules(PREFIX, dependencies, pairs),
    ...civsMeetRules(PREFIX, dependencies, pairs),
    new SenateIntervenes(
      SENATE_RULE,
      new Effect((player: Player, other: Player | null, context): boolean =>
        civ2SenateIntervenes(dependencies, player, other, context)
      )
    ),
  ];
};

export const register = (game: Game): void =>
  game.rules.register(...getRules(dependenciesOf(game), game));

// The plugin loader imports each package for this side effect, as civ1-diplomacy's.
register(defaultGame);

export default register;
