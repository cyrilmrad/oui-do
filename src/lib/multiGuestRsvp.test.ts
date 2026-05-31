import assert from 'node:assert/strict';
import { getVisibleCompanionRows, normalizeRsvpParty, splitFullNameOnFirstSpace } from './multiGuestRsvp';

const hiddenRows = getVisibleCompanionRows({
    totalPax: 4,
    primaryPax: 2,
    companionNamesRevealed: false
});

assert.equal(hiddenRows.length, 0);

const revealedRows = getVisibleCompanionRows({
    totalPax: 4,
    primaryPax: 3,
    companionNamesRevealed: true
});

assert.equal(revealedRows.length, 2);
assert.equal(revealedRows[0].label, 'First Guest Name');
assert.equal(revealedRows[1].label, 'Second Guest Name');
assert.deepEqual(splitFullNameOnFirstSpace('Maya Leila Saab'), { firstName: 'Maya', lastName: 'Leila Saab' });
assert.deepEqual(splitFullNameOnFirstSpace('Prince'), { firstName: 'Prince', lastName: '' });

const normalizedParty = normalizeRsvpParty({
    totalPax: 4,
    primaryPax: 3,
    companions: [
        { fullName: 'Maya Saab' },
        { fullName: '   ' },
        { fullName: 'Rami Haddad' },
        { fullName: 'Extra Guest' }
    ]
});

assert.equal(normalizedParty.primaryPax, 1);
assert.equal(normalizedParty.selectedPax, 3);
assert.deepEqual(normalizedParty.companions, [
    { fullName: 'Maya Saab', firstName: 'Maya', lastName: 'Saab', pax: 1 },
    { fullName: 'Rami Haddad', firstName: 'Rami', lastName: 'Haddad', pax: 1 }
]);
assert.equal(normalizedParty.totalAllocatedPax, 3);

console.log('multiGuestRsvp tests passed');
