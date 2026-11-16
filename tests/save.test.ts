import { HOSTILE_INTENT, SNEAK_ATTACK, flagsOf, setFlag } from '../lib/flags';
import { IInteraction } from '@civ-clone/core-diplomacy/Interaction';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import SenateRecord from '../Records/SenateRecord';
import TreatyFlagsRecord from '../Records/TreatyFlagsRecord';
import Turn from '@civ-clone/core-turn-based-game/Turn';
import { expect } from 'chai';

// What core-save-game does, in small (as core-diplomacy's own test): each entity written as its saved fields
//  (`stateKeys()`), players as references and sets as lists, through JSON; read back with `Object.create`, and the
//  loading game supplies `_ruleRegistry` and `_turn`.
const encode = (value: unknown): unknown => {
  if (value instanceof Player) {
    return { $ref: value.id() };
  }

  if (value instanceof Set) {
    return { $set: Array.from(value).map(encode) };
  }

  if (Array.isArray(value)) {
    return value.map(encode);
  }

  if (value !== null && typeof value === 'object') {
    throw new TypeError('Not expected in these records.');
  }

  return value;
};

const decode = (value: any, players: Map<string, Player>): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => decode(item, players));
  }

  if (value !== null && typeof value === 'object') {
    if ('$ref' in value) {
      return players.get(value.$ref);
    }

    if ('$set' in value) {
      return new Set(value.$set.map((item: any) => decode(item, players)));
    }
  }

  return value;
};

describe('saving and loading', (): void => {
  it("keeps the treaty bits each way, and the Senate's roll and session", (): void => {
    const ruleRegistry = new RuleRegistry(),
      turn = new Turn(),
      [a, b] = [1, 2].map(() => new Player(ruleRegistry)),
      interactionRegistry = new InteractionRegistry(),
      registries = { interactionRegistry, ruleRegistry, turn };

    setFlag(registries, a, b, HOSTILE_INTENT);
    setFlag(registries, b, a, SNEAK_ATTACK);
    interactionRegistry.register(
      new SenateRecord(a, 37, true, ruleRegistry, turn)
    );

    const file = JSON.stringify(
        interactionRegistry.entries().map((entity) => ({
          type: entity.constructor.name,
          id: entity.id(),
          keys: (entity as any)._keys,
          state: Object.fromEntries(
            entity.stateKeys().map((key) => [key, encode((entity as any)[key])])
          ),
        }))
      ),
      classes = new Map<string, Function>(
        [TreatyFlagsRecord, SenateRecord].map((Type) => [Type.name, Type])
      ),
      byId = new Map([a, b].map((player) => [player.id(), player])),
      loaded = new InteractionRegistry();

    JSON.parse(file).forEach(({ type, id, keys, state }: any) => {
      const entity = Object.create(classes.get(type)!.prototype);

      Object.entries(state).forEach(([key, value]) => {
        entity[key] = decode(value, byId);
      });

      entity._id = id;
      entity._keys = keys;
      entity._ruleRegistry = ruleRegistry;
      entity._turn = turn;

      loaded.register(entity as IInteraction);
    });

    const reloaded = { interactionRegistry: loaded, ruleRegistry, turn },
      [senate] = loaded
        .entries()
        .filter((entity) => entity instanceof SenateRecord) as SenateRecord[];

    expect(loaded.entries().length).equal(3);
    expect(flagsOf(reloaded, a, b)).equal(HOSTILE_INTENT);
    expect(flagsOf(reloaded, b, a)).equal(SNEAK_ATTACK);
    expect(senate.player()).equal(a);
    expect(senate.value()).equal(37);
    expect(senate.inSession()).true;
  });
});
