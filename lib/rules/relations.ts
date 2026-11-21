import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  CEASEFIRE_LINGERS,
  CHANGED_THIS_TURN,
  INCIDENT_OFFERED,
  NUCLEAR_THREAT,
  NUKED,
  RECENT_CONTACT,
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
  expelUnits,
  expireSilently,
  instigatorOf,
} from '../effects';
import {
  activeDeclarations,
  makePeace,
} from '@civ-clone/base-diplomacy/lib/declareWar';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import { attitude, reputation } from '../relations';
import {
  SPARED_REPUTATION,
  reputationCost,
  startingAttitude,
} from '../formulas';
import City from '@civ-clone/core-city/City';
import Contact from '@civ-clone/base-diplomacy-interaction-contact/Contact';
import Created from '@civ-clone/core-diplomacy/Rules/Interaction/Created';
import Criterion from '@civ-clone/core-rule/Criterion';
import Declaration from '@civ-clone/core-diplomacy/Declaration';
import DeclaredWar from '@civ-clone/base-diplomacy/Rules/DeclaredWar';
import Dependencies from '../Dependencies';
import Detonated from '@civ-clone/base-unit-action-nuclear-attack/Rules/Detonated';
import Description from '@civ-clone/core-rule/Description';
import Effect from '@civ-clone/core-rule/Effect';
import EiffelTower from '@civ-clone/base-wonder-eiffeltower/EiffelTower';
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
import alliesJoinWar from '../alliances';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

const barbarian = (player: Player): boolean => {
  try {
    return isBarbarian(player);
  } catch (e) {
    return false;
  }
};

/**
 * When two players make contact (`Created` for a `Contact`), each starts with the attitude to the other the original
 *  gives when it makes each civilization (`civ.cpp:4642-4660`): the one made later rolls for the pair, 10 + 0 to 79,
 *  and when the one made earlier is a person, 5 × the level more, 10 to 75; 100 toward the barbarians. Here the order
 *  they joined the game stands for the order they were made. First contact is a change this turn
 *  (`TREATY_CHANGED_THIS_TURN`) and a recent contact. And an embassy (`Embassy`) makes contact.
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

      setBoth(dependencies, player, other, CHANGED_THIS_TURN | RECENT_CONTACT);

      const attitudes = attitude(dependencies);

      if (
        attitudes.get(player, other) !== undefined ||
        attitudes.get(other, player) !== undefined
      ) {
        return;
      }

      const players = dependencies.playerRegistry.entries(),
        [earlier] = [player, other].sort(
          (a, b) => players.indexOf(a) - players.indexOf(b)
        ),
        value =
          barbarian(player) || barbarian(other)
            ? 100
            : startingAttitude(
                human(dependencies, earlier),
                level(dependencies),
                Math.floor(random() * 80)
              );

      attitudes.set(player, other, value, 'contact');
      attitudes.set(other, player, value, 'contact');
    })
  ),
  new Created(
    `${prefix}:interaction/created/embassy-contact`,
    new Criterion(
      (interaction: Interaction): boolean => interaction instanceof Embassy
    ),
    new Effect((interaction: Interaction): void => {
      // `Created` runs inside `Interaction`'s constructor, before `Embassy`'s own sets its holder and host: the players
      //  are already there.
      const [holder, host] = interaction.players();

      if (holder === undefined || host === undefined || holder === host) {
        return;
      }

      makeContact(
        dependencies.interactionRegistry,
        holder,
        host,
        dependencies.ruleRegistry,
        dependencies.turn
      );
    })
  ),
];

/**
 * A declaration of war (`DeclaredWar`, `diplo_declare_war`, `diplomacy.cpp:1196-1270`). `own` is the original's
 *  `civ2 < 0`: nobody asked it to (`declareWarFor`). A computer player's threats and wars between computer players set
 *  the war directly in the original, so they hear none of this (`declareWarQuietly`).
 *
 * - `<prefix>:declared-war/ally`: war on an ally is no war: the alliance is cancelled instead (both stay at peace and
 *   go home), and the rest below still applies to it.
 * - `<prefix>:declared-war/reputation`: a broken ceasefire or peace costs 1 (none on Chieftain or with the Eiffel
 *   Tower) and 1 more for the top power on its own initiative, all of it twice when the peace still carries a
 *   ceasefire; a broken alliance 1 (spared likewise) and 1 more on its own. The one who asked gives the declarer 1 credit;
 *   a person declaring of its own accord loses 1 of its credit with its victim each time the cost is counted. Made to
 *   declare it, it costs only with a person on either side.
 * - `<prefix>:declared-war/attitude`: made to declare war, each side's attitude to the other is 100; at another's
 *   request, the one who asked is 5 warmer to the declarer, 15 if it broke a ceasefire or peace, 25 an alliance.
 * - `<prefix>:declared-war/standing`: any incident offer between them is answered (`INCIDENT_OFFERED`); war this turn; a person who declares war is the aggressor for long, its victim
 *   holds a vendetta, they were in contact this turn, and its victim's allies join in.
 */
export const declaredWarRules = (
  prefix: string,
  dependencies: Dependencies,
  engine: Engine
): DeclaredWar[] => [
  new DeclaredWar(
    `${prefix}:declared-war/ally`,
    new Criterion(
      (by: Player, against: Player, forced: boolean, broken: TreatyLevel) =>
        broken === TreatyLevel.Alliance && !declaringQuietly(by)
    ),
    new Effect((by: Player, against: Player): void => {
      activeDeclarations(dependencies, War, by, against).forEach((war) =>
        expireSilently(war, by)
      );
      makePeace(dependencies, by, against);
      clearBoth(dependencies, by, against, WAR_THIS_TURN);
      expelUnits(dependencies, by, against);
      expelUnits(dependencies, against, by);
      engine.emit('civ2-diplomacy:alliance-cancelled', by, against);
    })
  ),
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

        const reputations = reputation(dependencies),
          instigator = instigatorOf(by),
          own = instigator === null,
          person = human(dependencies, by);

        if (instigator !== null) {
          reputations.setCredit(
            instigator,
            by,
            reputations.credit(instigator, by) + 1
          );
        }

        const kind =
          broken === TreatyLevel.Alliance
            ? 'alliance'
            : broken === TreatyLevel.Peace || broken === TreatyLevel.Ceasefire
            ? 'treaty'
            : 'none';

        // Made to declare war, it costs only when a person is one of them (`diplo_force_war`).
        if (forced && !person && !human(dependencies, against)) {
          return;
        }

        const lingering =
            kind === 'treaty' &&
            hasFlag(dependencies, by, against, CEASEFIRE_LINGERS),
          cost = reputationCost(
            kind,
            lingering,
            own,
            level(dependencies) === CHIEFTAIN,
            ownsWonder(dependencies, by, 'eiffel-tower'),
            rank(dependencies, by) === 7 && cities(dependencies, by) > 4
          );

        if (cost > 0) {
          reputations.adjust(by, cost, forced ? 'forced-war' : 'war');
        }

        if (own && person && kind !== 'none') {
          const times = kind === 'treaty' && lingering ? 2 : 1;

          reputations.setCredit(
            by,
            against,
            reputations.credit(by, against) - times
          );
        }
      }
    ),
    // The Eiffel Tower's owner: breaking a treaty costs it a point less (`reputationCost`).
    new Description({
      type: 'reputation_spared',
      subject: EiffelTower,
      value: SPARED_REPUTATION,
    })
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
    new Effect(
      (
        by: Player,
        against: Player,
        forced: boolean,
        broken: TreatyLevel
      ): void => {
        const quiet = declaringQuietly(by);

        // A war answers any incident offer between them, so it can't later start another one.
        clearBoth(
          dependencies,
          by,
          against,
          CEASEFIRE_LINGERS | INCIDENT_OFFERED
        );

        if (broken !== TreatyLevel.Alliance || quiet) {
          setBoth(dependencies, by, against, WAR_THIS_TURN);
        }

        if (quiet || !human(dependencies, by)) {
          return;
        }

        if (!hasVendetta(against, by, dependencies.interactionRegistry)) {
          dependencies.interactionRegistry.register(
            new Vendetta(against, by, new Never(), dependencies.ruleRegistry)
          );
        }

        if (broken === TreatyLevel.Alliance) {
          return;
        }

        setFlag(dependencies, by, against, AGGRESSOR | AGGRESSOR_LONG);
        recordContact(dependencies, by, against, dependencies.turn.value());
        engine.emit('civ2-diplomacy:war-declared', by, against);

        alliesJoinWar(dependencies, against, by).forEach((ally: Player) =>
          engine.emit('civ2-diplomacy:ally-joins-war', ally, by, against)
        );
      }
    )
  ),
];

/**
 * A nuclear strike: each victim on the 3 × 3 is 100 colder to the attacker and threatened by it, and the attacker has
 *  nuked it (`unit_combat.cpp:306-312`). base-diplomacy's rule gives the vendetta.
 */
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
        setFlag(dependencies, victim, attacker, NUCLEAR_THREAT);
        setFlag(dependencies, attacker, victim, NUKED);
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
