import {
  dropShamPeaceChance,
  spacing,
  stepNumbers,
  waiveTributeChance,
} from './lib/numbers';
import { Game, defaultGame } from '@civ-clone/core-game';
import Dependencies from './lib/Dependencies';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import Rule from '@civ-clone/core-rule/Rule';
import detonatedRules from '@civ-clone/base-diplomacy/lib/rules/detonated';
import expiredRules from '@civ-clone/base-diplomacy/lib/rules/expired';
import interactionRules from '@civ-clone/base-diplomacy/lib/rules/interaction';
import mayNegotiateRules from '@civ-clone/base-diplomacy/lib/rules/mayNegotiate';
import meetingFor from './lib/meeting';
import movedRules from '@civ-clone/base-diplomacy/lib/rules/moved';
import readers from './lib/readers';
import resolvedRules from '@civ-clone/base-diplomacy/lib/rules/resolved';
import stepRules from '@civ-clone/base-diplomacy/lib/rules/step';
import turnStartRules from '@civ-clone/base-diplomacy/lib/rules/turnStart';

export const PREFIX = 'civ2-diplomacy';

export const dependenciesOf = (game: Game): Dependencies => ({
  cityRegistry: game.cities,
  clientRegistry: game.clients,
  gameDifficultyRegistry: game.difficulty,
  interactionRegistry: game.interactions,
  landMassRegistry: game.landMasses,
  playerGovernmentRegistry: game.playerGovernments,
  playerRegistry: game.players,
  playerResearchRegistry: game.playerResearch,
  playerTreasuryRegistry: game.playerTreasuries,
  ruleRegistry: game.rules,
  traitRegistry: game.traits,
  turn: game.turn,
  unitRegistry: game.units,
});

/**
 * Civilization II's diplomacy rules on `base-diplomacy`: contact when units meet, how often players meet, the meeting
 *  and what each answer does (peace, tribute, cancelled treaties, exchanged knowledge, war), sham peace, treaties ending
 *  and the vendetta a nuclear strike leaves. With no Senate. No thefts are forgotten when a city is captured: Civ2's
 *  units here offer no Steal Technology.
 */
export const getRules = (
  dependencies: Dependencies,
  game: Pick<Game, 'engine' | 'rng'>
): Rule<any, any>[] => {
  const read = readers(dependencies);

  return [
    ...expiredRules(PREFIX, game.engine, dependencies.interactionRegistry),
    ...interactionRules(PREFIX, dependencies),
    ...stepRules(
      dependencies,
      {
        meeting: (negotiation: Negotiation) =>
          meetingFor(dependencies, negotiation, game.rng),
        hasSenate: read.hasSenate,
      },
      stepNumbers
    ),
    ...mayNegotiateRules(PREFIX, dependencies, read.isHuman, spacing),
    ...turnStartRules(PREFIX, dependencies, game.rng, dropShamPeaceChance),
    ...resolvedRules(PREFIX, dependencies, game.rng, waiveTributeChance),
    ...detonatedRules(PREFIX, dependencies),
    ...movedRules(dependencies.interactionRegistry, dependencies.unitRegistry),
  ];
};

export const register = (game: Game): void =>
  game.rules.register(...getRules(dependenciesOf(game), game));

// The plugin loader imports each package for this side effect, as civ1-diplomacy's.
register(defaultGame);

export default register;
