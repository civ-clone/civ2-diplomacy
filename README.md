# @civ-clone/civ2-diplomacy

Civilization II's diplomacy, the twin of civ1-diplomacy, built from `base-diplomacy`'s rule assemblers with the
`civ2-diplomacy:` prefix:

- contact when players' units meet;
- how often players meet;
- the meeting, and what each answer does: peace, tribute, a cancelled treaty, exchanged knowledge, war, and peace
  between two computer players;
- a peace a computer player means to break, and how treaties ending are announced;
- the vendetta a nuclear strike leaves.

The leader's attack attitude (civ2-civilization's @LEADERS traits) is its temper at a meeting, and the difficulty level
and nuclear units count as in Civilization.

## Not yet here

- **The Senate:** no government answers to one, so none holds a player back from war or changes at a meeting.
- **Ceasefire and alliance:** only peace and war; there are no ceasefire or alliance declarations to build on.
- **Civilization II's own meeting:** the computer players negotiate by Civilization's numbers (`lib/numbers`) until
  Civilization II's (OpenCiv2 `diplomacy.cpp`) are read. No embassy rules beyond civ2-unit's action, and no attitude
  towards each civilization.
- **Thefts forgotten on capture:** Civilization II's units here offer no Steal Technology, so there is nothing to forget.
