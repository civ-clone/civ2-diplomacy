import { Game } from '@civ-clone/core-game';
import { dependenciesOf, getRules } from '../registerRules';
import Aggressive from '@civ-clone/base-leader-trait-aggression/Aggression/Aggressive';
import Friendly from '@civ-clone/base-leader-trait-aggression/Aggression/Friendly';
import Leader from '@civ-clone/core-civilization/Leader';
import Player from '@civ-clone/core-player/Player';
import Republic from '@civ-clone/base-government-republic/Republic';
import { expect } from 'chai';
import { meetingRules } from '../lib/meeting';
import readers from '../lib/readers';

// Rules that carry an id carry civ2-diplomacy's; the meeting's steps and contact carry none, as civ1-diplomacy's.
describe('civ2-diplomacy', (): void => {
  it("builds base-diplomacy's rules with its own prefix, and no thefts rule", (): void => {
    const game = new Game(),
      rules = getRules(dependenciesOf(game), game),
      ids = rules.map((rule) => rule.id());

    expect(rules.length).equal(1 + 2 + 17 + 3 + 1 + 6 + 1 + 1);
    ids
      .filter((id) => id !== null)
      .forEach((id) => expect(id!.startsWith(`civ2-diplomacy:`), id!).true);
    expect(ids.filter((id) => id === null)).length(17 + 1);
    expect(ids).include(`civ2-diplomacy:proposal/resolved/peace`);
    expect(ids).include(
      `civ2-diplomacy:player/may-negotiate/not-the-barbarians`
    );
    expect(ids.some((id) => id !== null && id.includes('captured'))).false;
  });

  it('has no Senate: a Republic answers to none, and a meeting changes no government', (): void => {
    const game = new Game(),
      player = new Player(game.rules),
      dependencies = {
        ...dependenciesOf(game),
        playerGovernmentRegistry: {
          getByPlayer: () => ({
            is: (...governments: unknown[]) => governments.includes(Republic),
          }),
        } as any,
      };

    expect(readers(dependencies).hasSenate(player)).false;
    expect(meetingRules(dependencies).hasSenate(player)).false;
    expect(() =>
      meetingRules(dependencies).changeGovernment(player)
    ).not.throw();
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
