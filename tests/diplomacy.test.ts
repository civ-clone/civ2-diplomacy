import {
  ATTITUDE_DRIFT_RULE,
  BORDER_INTRUDERS_RULE,
  SENATE_RULE,
  TREATY_BREAKING_RULE,
} from '../RuleIds';
import { dependenciesOf, getRules } from '../registerRules';
import Aggressive from '@civ-clone/base-leader-trait-aggression/Aggression/Aggressive';
import Friendly from '@civ-clone/base-leader-trait-aggression/Aggression/Friendly';
import { Game } from '@civ-clone/core-game';
import Leader from '@civ-clone/core-civilization/Leader';
import { PERSON_STEPS } from '../lib/rules/talks';
import Player from '@civ-clone/core-player/Player';
import Step from '@civ-clone/core-diplomacy/Rules/Negotiation/Step';
import { expect } from 'chai';
import readers from '../lib/readers';

// Rules that carry an id carry civ2-diplomacy's; the meeting's steps and contact carry none.
describe('civ2-diplomacy', (): void => {
  it('builds its rules with its own prefix, and none of Civ1 meeting rows', (): void => {
    const game = new Game(),
      rules = getRules(dependenciesOf(game), game),
      ids = rules.map((rule) => rule.id());

    ids
      .filter((id) => id !== null)
      .forEach((id) => expect(id!.startsWith(`civ2-diplomacy:`), id!).true);
    // One step for the computer player and one for each of the person's choices; contact when units meet.
    expect(rules.filter((rule) => rule instanceof Step).length).equal(
      1 + PERSON_STEPS
    );
    expect(ids).include.members([
      ATTITUDE_DRIFT_RULE,
      BORDER_INTRUDERS_RULE,
      TREATY_BREAKING_RULE,
      SENATE_RULE,
      'civ2-diplomacy:proposal/resolved/answer',
      'civ2-diplomacy:proposal/resolved/agenda',
      'civ2-diplomacy:declared-war/reputation',
      'civ2-diplomacy:unit/moved/computers-meet',
    ]);
    expect(ids).not.include('civ2-diplomacy:proposal/resolved/cancel-treaty');
    expect(ids).not.include('civ2-diplomacy:proposal/resolved/tribute');
    expect(ids).not.include('civ2-diplomacy:player/turn-start/drop-sham-peace');
    expect(new Set(ids.filter((id) => id !== null)).size).equal(
      ids.filter((id) => id !== null).length
    );
  });

  it("reads the leader's attack attitude: Aggressive 1, Friendly −1", (): void => {
    class Hawk extends Leader {}
    class Dove extends Leader {}
    class Owl extends Leader {}

    const game = new Game(),
      // Stand-ins: the reading asks a player for its civilization's leader's class.
      players = [Hawk, Dove, Owl].map(
        (LeaderType) =>
          ({
            civilization: () => ({
              leader: () => ({ sourceClass: () => LeaderType }),
            }),
          } as unknown as Player)
      );

    game.traits.register(new Aggressive(Hawk), new Friendly(Dove));

    expect(
      players.map((player) => readers(dependenciesOf(game)).mood(player))
    ).eql([1, -1, 0]);
  });
});
