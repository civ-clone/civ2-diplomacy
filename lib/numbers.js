"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacing = void 0;
// Civilization II's numbers for when players meet (OpenCiv2 `diplo_civs_meet_human`, `diplomacy.cpp:5700`): a computer
//  player comes to talk to a person when they have no contact, after an incident, or once more than 15 turns have
//  passed since they were last in contact, treaty or not; two computer players meet every fourth turn
//  (`Rules/turnStart`). The rest of the talks' numbers are in `lib/formulas`.
exports.spacing = {
    withPerson: 16,
    withPersonAfterTreaty: 16,
    computers: 4,
};
//# sourceMappingURL=numbers.js.map