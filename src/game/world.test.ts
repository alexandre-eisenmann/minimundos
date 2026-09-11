import test from 'node:test';
import assert from 'node:assert/strict';
import { bridges, regions, cross, degree, type Region } from './world.ts';
test('historical multigraph has seven bridges and degrees 3,3,5,3', () => {
  assert.equal(bridges.length, 7);
  assert.deepEqual(
    Object.keys(regions).map((r) => degree(r as Region)),
    [3, 3, 5, 3],
  );
});
test('crossing changes bank and counts repeat crossings and prevents disconnected moves', () => {
  assert.deepEqual(cross('north', [], 1), { at: 'island', used: [1] });
  assert.equal(cross('north', [], 2), null);
  assert.deepEqual(cross('island', [1], 1), { at: 'north', used: [1, 1] });
  assert.deepEqual(cross('island', [1], 2), { at: 'south', used: [1, 2] });
});
test('exhaustive walks from every region cannot cross all seven bridges once', () => {
  let longest = 0;
  function explore(at: Region, used: number[]) {
    longest = Math.max(longest, used.length);
    for (const b of bridges) {
      if (used.includes(b.id)) continue;
      const next = cross(at, used, b.id);
      if (next) explore(next.at, next.used);
    }
  }
  for (const r of Object.keys(regions)) explore(r as Region, []);
  assert.equal(longest, 6);
});
