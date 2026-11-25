import test from 'node:test';
import assert from 'node:assert/strict';
import { createUuid } from '../src/lib/uuid.js';

test('UUID seguro funciona sem randomUUID e preserva versão e variante', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const cryptoApi = globalThis.crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
      getRandomValues: cryptoApi.getRandomValues.bind(cryptoApi),
    } });
    const values = Array.from({ length: 1000 }, () => createUuid());
    assert.ok(values.every(value => /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(value)));
    assert.equal(new Set(values).size, values.length);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});

test('UUID recusa ambiente sem fonte segura de aleatoriedade', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    assert.throws(() => createUuid(), /geração segura/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
