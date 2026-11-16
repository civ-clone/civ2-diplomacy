import CallForHelpRecord from '../Records/CallForHelpRecord';
import Dependencies from './Dependencies';
import Player from '@civ-clone/core-player/Player';

const recordOf = (
  dependencies: Dependencies,
  caller: Player,
  ally: Player
): CallForHelpRecord | undefined =>
  dependencies.interactionRegistry
    .getByPlayers(caller, ally)
    .find(
      (interaction): interaction is CallForHelpRecord =>
        interaction instanceof CallForHelpRecord &&
        interaction.caller() === caller &&
        interaction.ally() === ally
    );

/** The war `caller` will ask its ally `ally` to join at its next audience, or `null`. */
export const callForHelp = (
  dependencies: Dependencies,
  caller: Player,
  ally: Player
): Player | null => recordOf(dependencies, caller, ally)?.against() ?? null;

/** `caller` will ask `ally` to join its war on `against` (one call at a time; a new one replaces it). */
export const callAlly = (
  dependencies: Dependencies,
  caller: Player,
  ally: Player,
  against: Player
): void => {
  answered(dependencies, caller, ally);
  dependencies.interactionRegistry.register(
    new CallForHelpRecord(
      caller,
      ally,
      against,
      dependencies.ruleRegistry,
      dependencies.turn
    )
  );
};

/** The call has been answered. */
export const answered = (
  dependencies: Dependencies,
  caller: Player,
  ally: Player
): void => {
  const record = recordOf(dependencies, caller, ally);

  if (record !== undefined) {
    dependencies.interactionRegistry.unregister(record);
  }
};

export default callForHelp;
