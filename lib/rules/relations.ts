import {
  AGGRESSOR,
  CEASEFIRE_LINGERS,
  NUKED,
  WAR_THIS_TURN,
  clearBoth,
  hasFlag,
  setBoth,
  setFlag,
} from '../flags';
import {
  CHIEFTAIN,
  allied,
  atWar,
  cities,
  human,
  inContact,
  level,
  rank,
} from '../standing';
import {
  declareWarQuietly,
  declaringQuietly,
  endedSilently,
  instigatorOf,
} from '../effects';
import { attitude, reputation } from '../relations';
import { reputationCost, startingAttitude } from '../formulas';
import City from '@civ-clone/core-city/City';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
import Criterion from '@civ-clone/core-rule/Criterion';
import Declaration from '@civ-clone/core-diplomacy/Declaration';
import DeclaredWar from '@civ-clone/base-diplomacy/Rules/DeclaredWar';
import Dependencies from '../Dependencies';
import Detonated from '@civ-clone/base-unit-action-nuclear-attack/Rules/Detonated';
import Effect from '@civ-clone/core-rule/Effect';
import Embassy from '@civ-clone/base-unit-action-establish-embassy/Embassy';
import Engine from '@civ-clone/core-engine/Engine';
import Expired from '@civ-clone/core-diplomacy/Rules/Declaration/Expired';
import Interaction from '@civ-clone/core-diplomacy/Interaction';
import Never from '@civ-clone/core-diplomacy/Expiries/Never';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import { TreatyLevel } from '@civ-clone/base-diplomacy/lib/treatyLevel';
import Unit from '@civ-clone/core-unit/Unit';
import Vendetta from '@civ-clone/library-diplomacy/Declarations/Vendetta';
import { hasVendetta } from '@civ-clone/library-diplomacy/lib/holds';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { ownsWonder } from '../wonders';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

/**
 * When two players make contact (`Created` for a `Contact`), each starts with an attitude to the other, as the original
 *  gives each civilization when it is made (`civ.cpp:4642-4660`): between computer players 10 to 89; between a computer
 *  player and a person 10 to 75, colder the harder the game; 100 toward the barbarians. And an embassy (`Embassy`)
 *  makes contact.
 */
export const createdRules = (
  prefix: string,
  dependencies: Dependencies,
  random: () => number
): Created[] => [
  new Created(
    `${prefix}:interaction/created/seed-attitude`,
    new Criterion(
      (interaction: Interaction): boolean => interaction instanceof Contact
    ),
    new Effect((interaction: Interaction): void => {
      const [player, other] = interaction.players();

      if (player === undefined || other === undefined || player === other) {
        return;
      }

      const attitudes = attitude(dependencies);

      if (
        attitudes.get(player, other) !== undefined ||
        attitudes.get(other, player) !== undefined
      ) {
        return;
      }

      const value =
        barbarian(player) || barbarian(other)
          ? 100
          : startingAttitude(
              human(dependencies, player) || human(dependencies, other),
              level(dependencies),
              Math.floor(random() * 80)
            );

      attitudes.set(player, other, value, 'contact');
      attitudes.set(other, player, value, 'contact');

      recordContact(dependencies, player, other, dependencies.turn.value());
    })
  ),
  new Created(
    `${prefix}:interaction/created/embassy-contact`,
    new Criterion(
      (interaction: Interaction): boolean => interaction instanceof Embassy
    ),
    new Effect((interaction: Interaction): void => {
      const embassy = interaction as unknown as Embassy;

      makeContact(
        dependencies.interactionRegistry,
        embassy.holder(),
        embassy.host(),
        dependencies.ruleRegistry,
        dependencies.turn
      );
    })
  ),
];

/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196`):
 *
 * - `<prefix>:declared-war/reputation`: breaking a ceasefire or a peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower), 1 more for the top power acting on its own, all of it twice when the peace still carries a ceasefire;
 *   breaking an alliance 1 (spared likewise) and 1 more on its own. A war declared at another's request isn't its own;
 *   one it was made to declare is. A computer player's threats cost nothing (`declareWarQuietly`).
 * - `<prefix>:declared-war/attitude`: made to declare war (`diplo_force_war`), each side's attitude to the other is
 *   100; at another's request, the one who asked is 5 warmer to the declarer, 15 if it broke a treaty, 25 an alliance.
 * - `<prefix>:declared-war/standing`: war this turn; a person who declares war is the aggressor and its victim holds a
 *   vendetta; any lingering ceasefire is gone.
 * - `<prefix>:declared-war/allies-join`: a person's victim's allies, computer players in contact with the person and
 *   neither allied with it nor at war with it, join the war, 100 colder (`diplo_allies_join_war`).
 */
export const declaredWarRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
): DeclaredWar[] => [
  new DeclaredWar(
    `${prefix}:declared-war/reputation`,
    new Effect(
      (
        by: Player,
        against: Player,
        forced: boolean,
        broken: TreatyLevel
      ): void => {
        if (declaringQuietly(by)) {
          return;
        }

        const kind =
          broken === TreatyLevel.Alliance
            ? 'alliance'
            : broken === TreatyLevel.Peace || broken === TreatyLevel.Ceasefire
            ? 'treaty'
            : 'none';

        // Made to declare war, it costs only when a person is one of them (`diplo_force_war`).
        if (
          forced &&
          !human(dependencies, by) &&
          !human(dependencies, against)
        ) {
          return;
        }

        const cost = reputationCost(
          kind,
          kind === 'treaty' &&
            hasFlag(dependencies, by, against, CEASEFIRE_LINGERS),
          instigatorOf(by) === null,
          level(dependencies) === CHIEFTAIN,
          ownsWonder(dependencies, by, 'eiffel-tower'),
          rank(dependencies, by) === 7 && cities(dependencies, by) > 4
        );

        if (cost > 0) {
          reputation(dependencies).adjust(
            by,
            cost,
            forced ? 'forced-war' : 'war'
          );
        }
      }
    )
  ),
  new DeclaredWar(
    `${prefix}:declared-war/attitude`,
    new Effect(
      (
        by: Player,
        against: Player,
        forced: boolean,
        broken: TreatyLevel
      ): void => {
        const attitudes = attitude(dependencies);

        if (forced && inContact(dependencies, by, against)) {
          attitudes.set(by, against, 100, 'forced-war');
          attitudes.set(against, by, 100, 'forced-war');
        }

        const instigator = instigatorOf(by);

        if (
          instigator !== null &&
          attitudes.get(instigator, by) !== undefined
        ) {
          attitudes.adjust(
            instigator,
            by,
            broken === TreatyLevel.Alliance
              ? -25
              : broken === TreatyLevel.Peace || broken === TreatyLevel.Ceasefire
              ? -15
              : -5,
            'war-for'
          );
        }
      }
    )
  ),
  new DeclaredWar(
    `${prefix}:declared-war/standing`,
    new Effect((by: Player, against: Player): void => {
      setBoth(dependencies, by, against, WAR_THIS_TURN);
      clearBoth(dependencies, by, against, CEASEFIRE_LINGERS);

      if (!human(dependencies, by)) {
        return;
      }

      setFlag(dependencies, by, against, AGGRESSOR);
      recordContact(dependencies, by, against, dependencies.turn.value());

      if (!hasVendetta(against, by, dependencies.interactionRegistry)) {
        dependencies.interactionRegistry.register(
          new Vendetta(against, by, new Never(), dependencies.ruleRegistry)
        );
      }

      engine.emit('civ2-diplomacy:war-declared', by, against);
    })
  ),
  new DeclaredWar(
    `${prefix}:declared-war/allies-join`,
    new Criterion((by: Player): boolean => human(dependencies, by)),
    new Effect((by: Player, against: Player): void =>
      dependencies.playerRegistry
        .entries()
        .filter(
          (ally: Player) =>
            ally !== by &&
            ally !== against &&
            !human(dependencies, ally) &&
            allied(dependencies, ally, against) &&
            !allied(dependencies, ally, by) &&
            !atWar(dependencies, ally, by) &&
            inContact(dependencies, ally, by)
        )
        .forEach((ally: Player) => {
          attitude(dependencies).adjust(ally, by, 100, 'ally-attacked');
          declareWarQuietly(dependencies, ally, by);
          recordContact(dependencies, ally, by, dependencies.turn.value());
          engine.emit('civ2-diplomacy:ally-joins-war', ally, by, against);
        })
    )
  ),
];

/** A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker (`unit_combat.cpp:306-312`). */
export const detonatedRules = (
  prefix: string,
  dependencies: Dependencies
): Detonated[] => [
  new Detonated(
    `${prefix}:unit/detonated/attitude`,
    new Effect((unit: Unit, tile: Tile): void => {
      const attacker = unit.player(),
        area = [tile, ...tile.getNeighbours()],
        victims = new Set<Player>([
          ...area.flatMap((areaTile: Tile) =>
            dependencies.unitRegistry
              .getByTile(areaTile)
              .map((victim: Unit) => victim.player())
          ),
          ...area
            .map((areaTile: Tile) =>
              dependencies.cityRegistry.getByTile(areaTile)
            )
            .filter((city: City | null): city is City => city !== null)
            .map((city: City) => city.player()),
        ]);

      victims.delete(attacker);
      victims.forEach((victim: Player) => {
        attitude(dependencies).adjust(victim, attacker, 100, 'nuclear');
        setFlag(dependencies, victim, attacker, NUKED);
      });
    })
  ),
];

/**
 * A treaty ending is announced (`diplomacy:declaration-expired`, `player:declaration-expired`), as base-diplomacy's
 *  rule does, unless a computer player ended it without a word (`expireSilently`, the original's B37).
 */
export const expiredRules = (prefix: string, engine: Engine): Expired[] => [
  new Expired(
    `${prefix}:declaration/expired/announce`,
    new Criterion(
      (declaration: Declaration): boolean => !endedSilently(declaration)
    ),
    new Effect((declaration: Declaration, by: Player | null = null) => {
      engine.emit('diplomacy:declaration-expired', declaration, by);
      declaration
        .players()
        .forEach((player) =>
          engine.emit('player:declaration-expired', player, declaration, by)
        );
    })
  ),
];
