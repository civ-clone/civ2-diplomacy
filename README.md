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

Two computer players don't talk: they meet when their units do (`Rules/civsMeet`, `diplo_civs_meet`): advances swapped and peace, an alliance against a third, or war, with a person allied to either called to help.

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
incident (`civ2-diplomacy:ceasefire-expired`, `civ2-diplomacy:audience-due`); computer pairs (tribute marks, aggressor
marks lapsing every 32 turns, contact lapsing after 16 turns without meeting, allies swapping advances every 8); the
border incidents (`BORDER_INTRUDERS_RULE`, the first intruded square of each city, B4; a repeat at peace means a demand
to withdraw at the next audience); the attitude drift; ganging up on the person who leads the world; reputation
recovering.

## Treaties

Ceasefires and alliances are base-diplomacy's. A person's victim's allies join the war (100 colder). Cancelling an
alliance sends both sides' units home. On Chieftain a person is given an embassy after talks. Talks and embassies make
contact.

## Saves

Load these with the game's saveable classes: `Records/TreatyFlagsRecord`, `Records/SenateRecord` and
`Records/CallForHelpRecord`, with
base-diplomacy's `PatienceRecord` and `LastContactRecord`, core-diplomacy's three records, and library-diplomacy's
proposals.

## Events

`civ2-diplomacy:refusal-overruled`, `:alliance-cancelled`, `:units-withdrawn`, `:maps-shared`, `:senate-forced-treaty`,
`:war-declared`, `:ally-joins-war`, `:ceasefire-expired`, `:audience-due`, `:treaty-broken` (civ2-enhanced only),
`:computers-made-peace`, `:computers-went-to-war`, `:contact-lapsed`. Dialogue keys are in `DIALOGUE`.

## Not here, or not as the original

- **Audiences:** a computer player's audience always opens with its request (`Initiate`); the original asks for the
  emissary only when it has something to say, so an audience with nothing on the agenda ends without one there. Until
  the hosts open an audience on `civ2-diplomacy:audience-due`, the turn-start rule ends a lapsed ceasefire itself, so
  that audience can't re-grant it.
- **Patience** is kept per pair; the original keeps one count per computer player.
- **Border incidents:** a unit's warning mark (`UNITF_BORDER_WARNED`) is kept for the session only, not saved. The
  violators' demand to withdraw is made at the computer player's next audience (`WITHDRAWAL_DEMANDED`) rather than at
  once.
- **Calls for help** (`diplo_ally_demand_help`) likewise wait for the next audience (`CallForHelpRecord`).
- **Computer players meeting** decide at most once per pair each turn, when their units meet; the original decides at
  every meeting. Losing contact removes the pair's `Contact`, allies' too, as the original clears the bit.
- **Wonders:** the blocking-wonder refusal of an exchange doesn't compare the players' wonders in the wonder's group.
- **An advance's worth** (`ai_advance_value`): RULES.TXT's value and civilized modifier, the University/Computers and
  Invention/Industrialization terms, nobody knowing it, and the advances it leads to. Left out: the shift toward
  militaristic of a computer player at war with a person ahead of it on a shared land mass; expansion by sea; the Port
  Facility's ships; the Aqueduct and Sewer sizes; the tribe's own preferences; the computer players' bonus terms.
- **The space race, scenarios and the bloodlust option** in the evaluation, ganging up and the war price; the nuclear
  threat mark the evaluation sets.
- **A treaty broken (B37)** ends for both sides here, as civ-clone keeps one treaty per pair; the original's person still
  reads it (`BROKEN` and `AGGRESSOR_LONG` are kept as the original sets them). Classic only leaves it unannounced.
- **Espionage incidents** (part 2) are the other source of `INCIDENT`.
