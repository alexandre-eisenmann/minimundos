import test from 'node:test';
import assert from 'node:assert/strict';
import { pairsFor, pairedSum } from './students.ts';
void test('pairing uses every number exactly once for even and odd classroom challenges', () => {
  for (let n = 1; n <= 100; n++) {
    const pairs = pairsFor(n);
    assert.ok(pairs.every(([a, b]) => a + b === n + 1));
    const used = pairs.flatMap((p) => [...p]);
    if (n % 2) used.push((n + 1) / 2);
    assert.deepEqual(
      used.sort((a, b) => a - b),
      Array.from({ length: n }, (_, i) => i + 1),
    );
    assert.equal(
      pairedSum(n),
      Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a + b, 0),
    );
  }
  assert.equal(pairedSum(100), 5050);
});
void test('invalid challenges cannot silently produce misleading sums', () => {
  for (const n of [0, -1, 101, 1.5, NaN, Infinity])
    assert.throws(() => pairedSum(n), RangeError);
});
