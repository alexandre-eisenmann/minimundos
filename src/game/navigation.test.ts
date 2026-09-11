import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canWalk,
  landAt,
  bridgeAt,
  houses,
  advanceCrossing,
} from './navigation.ts';
import { bridges, regions } from './world.ts';
test('spawn points are on accessible land', () => {
  for (const [name, r] of Object.entries(regions)) {
    assert.equal(landAt(r.position[0], r.position[2]), name);
    assert.ok(canWalk(r.position[0], r.position[2], [], null));
  }
});
test('water, outer edges and building footprints block movement', () => {
  assert.equal(canWalk(-8, 3, [], null), false);
  assert.equal(canWalk(12, 5, [], null), false);
  for (const h of houses) assert.equal(canWalk(h.x, h.z, [], null), false);
});
test('every bridge connects its two intended land regions and allows return trips', () => {
  for (const b of bridges) {
    const x = (b.a[0] + b.b[0]) / 2,
      z = (b.a[2] + b.b[2]) / 2;
    assert.equal(bridgeAt(x, z)?.id, b.id);
    assert.ok(canWalk(x, z, [], null));
    assert.equal(canWalk(x, z, [b.id], null), true);
    assert.ok(canWalk(x, z, [b.id], b.id));
    assert.equal(landAt(b.a[0], b.a[2]), b.from);
    assert.equal(landAt(b.b[0], b.b[2]), b.to);
  }
});

test('manual crossings count once in both directions, including bridge 5', () => {
  for (const b of bridges)
    for (const reverse of [false, true]) {
      const start = reverse ? b.b : b.a,
        end = reverse ? b.a : b.b;
      let state = {
        bank: reverse ? b.to : b.from,
        bridge: null as number | null,
      };
      const counted: number[] = [];
      for (let i = 0; i <= 102; i++) {
        const x = start[0] + ((end[0] - start[0]) * i) / 100;
        const z = start[2] + ((end[2] - start[2]) * i) / 100;
        assert.ok(canWalk(x, z, counted, state.bridge));
        const next = advanceCrossing(state, x, z, counted);
        if (next.crossed !== null) counted.push(next.crossed);
        state = next;
      }
      assert.deepEqual(counted, [b.id]);
      assert.equal(state.bank, reverse ? b.from : b.to);
      const landing = advanceCrossing(state, end[0], end[2], counted);
      assert.equal(landing.bridge, null);
      assert.equal(
        canWalk(
          end[0] + (start[0] - end[0]) * 0.05,
          end[2] + (start[2] - end[2]) * 0.05,
          counted,
          landing.bridge,
        ),
        true,
      );
    }
});
test('turning back before reaching the other bank does not count a crossing', () => {
  const midway = advanceCrossing({ bank: 'north', bridge: null }, 6.2, -3, []);
  const returned = advanceCrossing(midway, 6.2, -4.3, []);
  assert.equal(returned.crossed, null);
  assert.equal(returned.bridge, null);
  assert.equal(returned.bank, 'north');
});

test('manual return trips count again without counting frames on land', () => {
  let state = { bank: 'north' as const, bridge: null as number | null };
  let tracker: Parameters<typeof advanceCrossing>[0] = state;
  const log: number[] = [];
  for (const z of [-4.3, -3, -1.65, -1.6, -1.65, -3, -4.35, -4.4]) {
    const result = advanceCrossing(tracker, 6.2, z, log);
    if (result.crossed !== null) log.push(result.crossed);
    tracker = result;
  }
  assert.deepEqual(log, [5, 5]);
  assert.equal(tracker.bank, 'north');
});
