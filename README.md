# @civ-clone/civ2-diplomacy

Civilization II's diplomacy, as the original plays it (OpenCiv2 `src/auto/diplomacy.cpp`, the Classic behaviour, bugs
included: `civ2-enhanced` holds the fixes), built on `base-diplomacy` with the `civ2-diplomacy:` prefix.

## Talks (`lib/talks`)

A meeting between a computer player and a person, whoever opens it (`Negotiation#initiator()`):

- **The audience.** A person is turned away on a turn war was declared between them, or when the computer player's
  patience is spent and they've met this turn. A computer player's own audience ends any ceasefire between them first
  (it is re-granted only if the talks make one), and its patience is reset.
- **Its business, in the original's order:** an exchange of advances; a call to fight its war target; tribute in gold,
  or else an advance; an ally that didn't pay dismissed; war; an alliance (with its solidarity against a common enemy);
  a ceasefire at war; peace. A refused ceasefire or peace is overruled by its Great Wall or United Nations, forced on a
  person whose Senate steps in, or perhaps sweetened.
- **The person's menu** (`diplo_proposal_menu`), each entry allowed by a `ProposalAvailable` rule: an alliance, peace,
  help from an ally, tribute (below the Republic), withdrawal, cancelling an alliance, an exchange of advances, war on a
  third player, sharing maps, and gifts of advances, gold or a unit.
- **The answers**, from the original's formulas (`lib/formulas`): the alliance score, the peace flags, the tribute paid
  out of fear, the price and distrust of a war on a third player, the price of an advance sold instead of exchanged,
  the map gate (allied or a map wonder, attitude 25 or less, Map Making on both sides). Before signing, a computer
  player may ask for an advance or gold, then for war on its target.
- **Patience** (`diplo_patience_limit`): 2, 3 when warm, 1 less when cold, more at peace or allied and with the
  person's Eiffel Tower, 2 at war; each proposal spends 1, tribute and an ally's help all of it, gifts give some back,
  shared maps cost 2 more; it recovers 1 every third turn.

Two computer players don't talk: they meet at the start of a turn (below).

## Attitude and reputation (`lib/relations`)

`attitude(registries)` (0 the warmest to 100 the coldest, per direction) and `reputation(registries)` (0 the best),
with `attitudeBands`/`attitudeLevel`, `effectiveReputation`, `madeToDeclareWar` and `clearVendettasAgainst`, are the
one way other civ2-* packages read and change them.

- **Attitude** starts when contact is made (10 to 89 between computer players; 10 + 5 × level + 0 to 79, at most 75,
  toward a person), changes with what is said and done in talks (`Accepted` and `Declined`, by proposal class), war
  (made to declare it: 100 both ways), a nuclear strike (+100), and drifts each turn (`ATTITUDE_DRIFT_RULE`): as the
  original, with no border incident the drift starts from a stale value that pins it at 100 (B3).
- **Reputation** is lost through `DeclaredWar`: a broken ceasefire or peace 1 (none on Chieftain or with the Eiffel
  Tower), 1 more for the top power on its own initiative, twice over when the peace still carried a ceasefire; a broken
  alliance 1, and 1 more on its own; cancelling an alliance in talks 1 always. A computer player's threats cost none.
  It recovers 1 every 24 × (level + 1) turns while above 1 (with the Eiffel Tower every 12 × and to 0). A person whose
  reputation is above three times its wars + 3 is ganged up on.

## The Senate (`lib/senate`)

A `SenateIntervenes` rule (`SENATE_RULE`): a Republic's or Democracy's Senate stands aside when the turn's roll is under
15 × the other's reputation (+25 after a sneak attack, +50 with the United Nations, at most 75); otherwise a Democracy's
steps in, and a Republic's only while in session (one turn in three it changes). The roll and the session are saved
(`SenateRecord`). base-diplomacy's `Readers.hasSenate` asks it. A scandal (`senateScandal`) tells the `SenateScandal`
rules, for whoever brings the government down.

## The start of each turn (`lib/rules/turnStart`)

Turn bits cleared; the Senate's roll; patience; a computer player breaking a treaty it means to (`TREATY_BREAKING_RULE`,
silently, B37); a ceasefire ending at the computer player's next audience, after 15 turns without contact or an
incident (`civ2-diplomacy:ceasefire-expired`, `civ2-diplomacy:audience-due`); two computer players meeting
(`diplo_civs_meet`: advances swapped and peace, or war; contact lapsing after 16 turns; allies swapping advances); the
border incidents (`BORDER_INTRUDERS_RULE`, the first intruded square of each city, B4); the attitude drift; ganging
up; reputation recovering.

## Treaties

Ceasefires and alliances are base-diplomacy's. A person's victim's allies join the war (100 colder). Cancelling an
alliance sends both sides' units home. On Chieftain a person is given an embassy after talks. Talks and embassies make
contact.

## Saves

Load these with the game's saveable classes: `Records/TreatyFlagsRecord` and `Records/SenateRecord`, with
base-diplomacy's `PatienceRecord` and `LastContactRecord`, core-diplomacy's three records, and library-diplomacy's
proposals.

## Events

`civ2-diplomacy:refusal-overruled`, `:alliance-cancelled`, `:units-withdrawn`, `:maps-shared`, `:senate-forced-treaty`,
`:war-declared`, `:ally-joins-war`, `:ceasefire-expired`, `:audience-due`, `:treaty-broken` (civ2-enhanced only),
`:computers-made-peace`, `:computers-went-to-war`, `:contact-lapsed`. Dialogue keys are in `DIALOGUE`.

## Not here, or not as the original

- **Border violators:** the original asks a peace partner whose units stay inside its borders to withdraw or face war
  (`diplo_review_violators`, with a Senate scandal for a refusal), and marks units as warned. Here every incident is a
  first offence (a peace partner's counts one less), and the turn-of-signing and recent-contact exceptions are left out.
- **Incidents:** `INCIDENT` is read (an early audience, a ceasefire's early end) but only part 2's espionage sets it.
- **An ally's call for help** (`diplo_ally_demand_help`: +100 for refusing, or the alliance cancelled) isn't made.
- **Declaring war on an ally** is war here (base-diplomacy ends both treaties); the original only cancels the
  alliance. civ2-unit refuses an attack on an ally, so a person doesn't reach it that way.
- **A treaty broken (B37)** ends for both sides here, as civ-clone keeps one treaty per pair; the original's person
  still reads it. Classic only leaves it unannounced.
- **A gift of a unit** warms the computer player by 3 × its attack plus defence; the original counts its cost.
- **Two computer players** meeting don't ally (`diplo_civs_meet_alliance`), and their meeting is a turn-start rule for
  each pair every fourth turn rather than when their units meet.
- **Wars for hire:** a rich computer player asking two advances instead of gold, and the nuclear terms of the price.
- **An advance's worth** is RULES.TXT's value and civilized modifier only, without the original's terms for cities and
  units.
- **The space race, scenarios and the bloodlust option** in the computer player's evaluation.
