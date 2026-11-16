import {
  attitude,
  attitudeBands,
  attitudeLevel,
  effectiveReputation,
  madeToDeclareWar,
  reputation,
} from '../lib/relations';
import { ownsWonder, pacifies } from '../lib/wonders';
import DeclaredWar from '@civ-clone/base-diplomacy/Rules/DeclaredWar';
import Effect from '@civ-clone/core-rule/Effect';
import { Game } from '@civ-clone/core-game';
import GreatWall from '@civ-clone/base-wonder-great-wall/GreatWall';
import Player from '@civ-clone/core-player/Player';
import { expect } from 'chai';

describe('relations', (): void => {
  const registries = (game: Game) => ({
    interactionRegistry: game.interactions,
    ruleRegistry: game.rules,
    turn: game.turn,
  });

  it('keeps attitudes between 0 and 100, and reputations at 0 or more', (): void => {
    const game = new Game(),
      [a, b] = [new Player(game.rules), new Player(game.rules)];

    expect(attitude(registries(game)).get(a, b)).undefined;
    expect(attitude(registries(game)).set(a, b, 120)).equal(100);
    expect(attitude(registries(game)).adjust(a, b, -150)).equal(0);
    expect(attitude(registries(game)).get(b, a)).undefined;
    expect(reputation(registries(game)).adjust(a, -1)).equal(0);
    expect(reputation(registries(game)).adjust(a, 300)).equal(300);
  });

  it("reads a reputation less the observer's credit", (): void => {
    const game = new Game(),
      [a, b] = [new Player(game.rules), new Player(game.rules)];

    reputation(registries(game)).set(a, 5);
    reputation(registries(game)).setCredit(b, a, 2);

    expect(effectiveReputation(registries(game), a, b)).equal(3);
    expect(effectiveReputation(registries(game), a, a)).equal(5);
  });

  it('puts each attitude in one of nine bands, at the original thresholds', (): void => {
    expect(attitudeBands.length).equal(9);
    expect(
      [-1, 0, 10, 11, 25, 26, 38, 39, 61, 62, 74, 75, 89, 90, 99, 100].map(
        attitudeLevel
      )
    ).eql([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8]);
  });

  it('makes a player declare war, forced', (): void => {
    const game = new Game(),
      [a, b] = [new Player(game.rules), new Player(game.rules)],
      heard: unknown[][] = [];

    game.rules.register(
      new DeclaredWar(
        new Effect((...args: unknown[]): void => {
          heard.push(args);
        })
      )
    );

    madeToDeclareWar(
      { interactionRegistry: game.interactions, ruleRegistry: game.rules },
      a,
      b
    );

    expect(heard.length).equal(1);
    expect(heard[0].slice(0, 3)).eql([a, b, true]);
  });

  it('reads wonder ownership through base-wonder, nobody owning one without a wonder registry', (): void => {
    const game = new Game(),
      [a, b] = [new Player(game.rules), new Player(game.rules)],
      wall = Object.assign(Object.create(GreatWall.prototype), {
        city: () => ({ destroyed: () => false }),
      }),
      registries = {
        wonderRegistry: {
          getByPlayer: (player: Player) => (player === a ? [wall] : []),
        } as any,
        playerResearchRegistry: game.playerResearch,
        requirementRegistry: game.requirements,
      };

    expect(ownsWonder({}, a, 'great-wall')).false;
    expect(ownsWonder(registries, a, 'great-wall')).true;
    expect(ownsWonder(registries, a, 'united-nations')).false;
    expect(pacifies(registries, a)).true;
    expect(pacifies(registries, b)).false;
  });
});
