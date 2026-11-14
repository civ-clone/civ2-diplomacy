import { Meeting, MeetingRules } from '@civ-clone/base-diplomacy/lib/meeting';
import Dependencies from './Dependencies';
import Negotiation from '@civ-clone/core-diplomacy/Negotiation';
export type { Meeting } from '@civ-clone/base-diplomacy/lib/meeting';
export declare const meetingRules: (dependencies: Dependencies) => MeetingRules;
/** The meeting for `negotiation`, worked out the first time it's asked for. */
export declare const meetingFor: (
  dependencies: Dependencies,
  negotiation: Negotiation,
  random: () => number
) => Meeting;
export default meetingFor;
