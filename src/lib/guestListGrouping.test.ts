import assert from 'node:assert/strict';
import { buildGuestDisplayRows } from './guestListGrouping';

const guests = [
    { id: 'primary-1', firstName: 'Cyril', lastName: 'Mrad', pax: 1, status: 'attending', message: '' },
    { id: 'child-1', firstName: 'Maya', lastName: 'Saab', pax: 1, status: 'attending', parentGuestId: 'primary-1', message: '' },
    { id: 'child-2', firstName: 'Rami', lastName: 'Haddad', pax: 1, status: 'pending', parentGuestId: 'primary-1', message: '' },
    { id: 'primary-2', firstName: 'Lara', lastName: 'Khoury', pax: 2, status: 'pending', message: '' },
    { id: 'orphan-1', firstName: 'Nour', lastName: 'Companion', pax: 1, status: 'attending', parentGuestId: 'missing-parent', message: '' },
];

const groupedRows = buildGuestDisplayRows(guests, { status: 'all', searchQuery: '' });

assert.deepEqual(groupedRows.map((row) => [row.kind, row.guest.id]), [
    ['primary', 'primary-1'],
    ['companion', 'child-1'],
    ['companion', 'child-2'],
    ['primary', 'primary-2'],
    ['orphanCompanion', 'orphan-1'],
]);
assert.equal(groupedRows[0].companionCount, 2);
assert.equal(groupedRows[1].parentName, 'Cyril Mrad');

const companionSearchRows = buildGuestDisplayRows(guests, { status: 'all', searchQuery: 'maya' });

assert.deepEqual(companionSearchRows.map((row) => [row.kind, row.guest.id]), [
    ['primary', 'primary-1'],
    ['companion', 'child-1'],
]);

const attendingRows = buildGuestDisplayRows(guests, { status: 'attending', searchQuery: '' });

assert.deepEqual(attendingRows.map((row) => [row.kind, row.guest.id]), [
    ['primary', 'primary-1'],
    ['companion', 'child-1'],
    ['orphanCompanion', 'orphan-1'],
]);

console.log('guestListGrouping tests passed');
