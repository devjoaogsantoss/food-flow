import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDate,
  localDateString,
  serviceTimes,
  tableCategories,
} from '../src/lib/reservations.js';
test('aceita terça a sábado', () => {
  for (const day of [
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
  ])
    assert.equal(validateDate(day, '2026-11-01'), '');
});
test('bloqueia domingo e segunda', () => {
  for (const day of ['2026-11-08', '2026-11-09'])
    assert.match(validateDate(day, '2026-11-01'), /domingos/);
});
test('bloqueia data passada, ausente ou inválida', () => {
  for (const day of ['', '2026-11-05', '2026-02-30', 'inválida'])
    assert.notEqual(validateDate(day, '2026-11-06'), '');
});
test('preserva data local e regras documentadas', () => {
  assert.equal(localDateString(new Date(2026, 10, 6, 23, 59)), '2026-11-06');
  assert.deepEqual(serviceTimes, ['17:45', '20:00', '22:15']);
  assert.deepEqual(tableCategories, [2, 4, 8]);
});
