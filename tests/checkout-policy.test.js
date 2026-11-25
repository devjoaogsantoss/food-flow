import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSummary } from '../src/lib/billing.js';

const command = (priceCents, overrides = {}) => ({
  status: 'aberta', parkingRequired: false,
  reservationPayment: { status: 'aprovado', amountCents: 5000 },
  rounds: [{ status: 'entregue', items: [{ kind: 'a-la-carte', priceCents, quantity: 1, status: 'entregue' }] }],
  ...overrides,
});
test('consumo inferior ao crédito mostra diferença e exige tratamento manual sem alterar dados', () => {
  const source = command(1000), before = structuredClone(source);
  const summary = checkoutSummary(source);
  assert.equal(summary.totalCents, 1200);
  assert.equal(summary.creditCents, 5000);
  assert.equal(summary.differenceCents, 3800);
  assert.equal(summary.dueCents, 0);
  assert.equal(summary.manualRequired, true);
  assert.equal(summary.canPayDigital, false);
  assert.equal(summary.canCloseInPerson, false);
  assert.deepEqual(source, before);
});
test('crédito igual ao total permite quitação sem nova cobrança; saldo positivo permite pagamento', () => {
  assert.equal(checkoutSummary(command(5000)).dueCents, 1000);
  const equal = checkoutSummary(command(5000, { reservationPayment: { status: 'aprovado', amountCents: 6000 } }));
  assert.equal(equal.dueCents, 0);
  assert.equal(equal.canPayDigital, true);
  assert.equal(equal.manualRequired, false);
});
test('sem consumo exige encerramento presencial; item não entregue bloqueia mesmo com rodada entregue', () => {
  const empty = checkoutSummary(command(0, { rounds: [] }));
  assert.equal(empty.canPayDigital, false);
  assert.equal(empty.canCloseInPerson, true);
  const pending = command(5000);
  pending.rounds[0].items[0].status = 'em preparo';
  assert.equal(checkoutSummary(pending).canPayDigital, false);
});
