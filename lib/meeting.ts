import {
  Meeting,
  MeetingRules,
  meetingFor as baseMeetingFor,
} from '@civ-clone/base-diplomacy/lib/meeting';
import { stanceNumbers, warThreshold } from './numbers';
import Dependencies from './Dependencies';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
import Player from '@civ-clone/core-player/Player';
import { stance } from '@civ-clone/base-diplomacy/lib/stance';
import readers from './readers';
import { wouldGoToWar } from '@civ-clone/base-diplomacy/lib/wouldGoToWar';

export type { Meeting } from '@civ-clone/base-diplomacy/lib/meeting';

// How a meeting is decided: `base-diplomacy`'s, with Civilization II's readers. There is no Senate, so no government
//  ever changes at a meeting.
const rulesFor = (dependencies: Dependencies): MeetingRules => {
  const read = readers(dependencies);

  return {
    isHuman: read.isHuman,
    hasSenate: read.hasSenate,
    wouldGoToWar: (player: Player, other: Player): boolean =>
      wouldGoToWar(dependencies, read, warThreshold, player, other),
    stance: (player, other, random, changeGovernment) =>
      stance(
        dependencies,
        read,
        stanceNumbers,
        player,
        other,
        random,
        changeGovernment
      ),
    changeGovernment: (): void => {},
  };
};

// Made once for each set of dependencies: a meeting is asked for at every step.
const rulesByDependencies = new WeakMap<Dependencies, MeetingRules>();

export const meetingRules = (dependencies: Dependencies): MeetingRules => {
  if (!rulesByDependencies.has(dependencies)) {
    rulesByDependencies.set(dependencies, rulesFor(dependencies));
  }

  return rulesByDependencies.get(dependencies)!;
};

/** The meeting for `negotiation`, worked out the first time it's asked for. */
export const meetingFor = (
  dependencies: Dependencies,
  negotiation: Negotiation,
  random: () => number
): Meeting =>
  baseMeetingFor(dependencies, meetingRules(dependencies), negotiation, random);

export default meetingFor;
