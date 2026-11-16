import Player from '@civ-clone/core-player/Player';
import Rule from '@civ-clone/core-rule/Rule';

/**
 * `player`'s Senate has caused a scandal that brings the government down into Anarchy (OpenCiv2 `diplomacy.cpp:6400`,
 *  `:5295-5321`): a refused withdrawal from another's land, or, in part 2, an incident of espionage under a treaty.
 *  civ2-diplomacy decides whether there's a scandal (`senateScandal`); what follows (the revolution) is the rules of
 *  whoever registers one of these.
 */
export class SenateScandal extends Rule<
  [player: Player, other: Player],
  void
> {}

export default SenateScandal;
