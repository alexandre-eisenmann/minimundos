import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canWalk,
  doorX,
  spawn,
  studioWidth,
  walkRoute,
  doorRows,
  doorPose,
  liftX,
  LIFT_Z,
  LIFT_RADIUS,
  LEVEL_HEIGHT,
  canMoveLift,
  avatarSupport,
  aboardLift,
} from './navigation.ts';
void test('spawn and approaches are accessible in every studio configuration', () => {
  for (const count of [3, 5, 10]) {
    assert.ok(canWalk(spawn, count, []));
    for (let door = 0; door < count; door++)
      assert.ok(canWalk({ x: doorX(door, count), z: -1.5 }, count, []));
  }
});
void test('closed doors and partitions block passage while open booths admit the player', () => {
  for (const count of [3, 5, 10])
    for (let door = 0; door < count; door++) {
      const x = doorX(door, count);
      assert.equal(canWalk({ x, z: -3 }, count, []), false);
      assert.equal(canWalk({ x, z: -5.9 }, count, []), false);
      assert.equal(canWalk({ x, z: -5.9 }, count, [door]), true);
      assert.equal(canWalk({ x: x + 1.6, z: -5.9 }, count, [door]), false);
      assert.equal(canWalk({ x, z: -7.2 }, count, [door]), false);
      assert.equal(
        canWalk({ x: studioWidth(count), z: 0 }, count, [door]),
        false,
      );
      assert.equal(canWalk({ x: 0, z: 7.5 }, count, [door]), false);
    }
});
void test('click routes between booths use the front aisle rather than crossing walls', () => {
  const count = 10,
    open = Array.from({ length: count }, (_, i) => i);
  const from = { x: doorX(0, count), z: -5.9 },
    to = { x: doorX(9, count), z: -5.9 };
  const path = [from, ...walkRoute(from, to)];
  for (let i = 1; i < path.length; i++)
    for (let t = 0; t <= 1; t += 0.02) {
      assert.ok(
        canWalk(
          {
            x: path[i - 1].x * (1 - t) + path[i].x * t,
            z: path[i - 1].z * (1 - t) + path[i].z * t,
          },
          count,
          open,
        ),
      );
    }
});

void test('50 doors form five rows of ten with unique positions', () => {
  assert.deepEqual(doorRows(50), [10, 10, 10, 10, 10]);
  assert.equal(
    new Set(
      Array.from({ length: 50 }, (_, i) => {
        const p = doorPose(i, 50);
        return `${p.x},${p.y}`;
      }),
    ).size,
    50,
  );
  assert.equal(doorPose(49, 50).y, 4 * LEVEL_HEIGHT);
});
void test('all supported layouts have at most ten doors per row and reachable doors', () => {
  for (const count of [3, 5, 10, 20, 30, 50]) {
    assert.equal(
      doorRows(count).reduce((a, b) => a + b, 0),
      count,
    );
    assert.ok(doorRows(count).every((size) => size <= 10));
    for (let i = 0; i < count; i++) {
      const p = doorPose(i, count);
      assert.ok(canWalk({ x: p.x, z: -1.8, level: p.level }, count, []));
    }
  }
});
void test('platform commands move one floor without an avatar position', () => {
  assert.equal(canMoveLift(0, 1, 50), true);
  assert.equal(canMoveLift(LEVEL_HEIGHT, 0, 50), true);
  assert.equal(canMoveLift(0, 2, 50), false);
  assert.equal(canMoveLift(0, -1, 50), false);
  assert.equal(canMoveLift(0.5, 1, 50), false);
  assert.equal(canMoveLift(4 * LEVEL_HEIGHT, 5, 50), false);
});
void test('deck supports its full radius and leaves remote avatars on the floor', () => {
  assert.equal(aboardLift({ x: 2, z: LIFT_Z }, 50), true);
  assert.equal(
    avatarSupport({ x: 2, z: LIFT_Z, y: 0.17 }, 0, 0, 0.2, 50, [], 0.04).y,
    0.37,
  );
  assert.equal(
    avatarSupport({ x: 6, z: LIFT_Z, y: 0.17 }, 0, 0, 0.2, 50, [], 0.04).y,
    0.17,
  );
});
void test('stepping off a raised platform falls and lands on the floor', () => {
  let p = { x: 4, z: LIFT_Z, y: LEVEL_HEIGHT + 0.17, level: 1 };
  let velocity = 0;
  for (let frame = 0; frame < 100; frame++) {
    const next = avatarSupport(
      p,
      velocity,
      LEVEL_HEIGHT,
      LEVEL_HEIGHT,
      50,
      [],
      0.02,
    );
    if (frame === 0) assert.ok(next.y < p.y);
    p = { ...p, y: next.y, level: next.level };
    velocity = next.velocity;
  }
  assert.equal(p.y, 0.17);
  assert.equal(p.level, 0);
});
void test('raised decks are walkable only when present; empty space is blocked', () => {
  assert.equal(canWalk({ x: 0, z: LIFT_Z, level: 2 }, 50, [], 0), false);
  assert.equal(
    canWalk({ x: 0, z: LIFT_Z, level: 2 }, 50, [], 2 * LEVEL_HEIGHT),
    true,
  );
  assert.equal(
    canWalk({ x: 4, z: LIFT_Z, level: 2 }, 50, [], 2 * LEVEL_HEIGHT),
    false,
  );
  assert.equal(
    canWalk({ x: 0, z: 5.5, level: 2 }, 50, [], 2 * LEVEL_HEIGHT),
    false,
  );
});
void test('boarding and leaving every upper gallery uses the central landing', () => {
  for (let level = 1; level < 5; level++) {
    const booth = { x: doorX(level * 10 + 9, 50), z: -5.7, level };
    const deck = { x: 0, z: LIFT_Z, level };
    for (const [from, to] of [
      [booth, deck],
      [deck, booth],
    ]) {
      const route = [from, ...walkRoute(from, to, 50)];
      for (let i = 1; i < route.length; i++)
        for (let t = 0; t <= 1; t += 0.02) {
          assert.ok(
            canWalk(
              {
                x: route[i - 1].x * (1 - t) + route[i].x * t,
                z: route[i - 1].z * (1 - t) + route[i].z * t,
                level,
              },
              50,
              [level * 10 + 9],
              level * LEVEL_HEIGHT,
            ),
          );
        }
    }
  }
});
void test('ordinary cross-floor routes stop at the platform without moving vertically', () => {
  const from = { x: doorX(49, 50), z: -1.8, level: 4 };
  const route = walkRoute(from, spawn, 50);
  assert.ok(route.every((p) => p.level === 4));
  assert.equal(route.at(-1)!.x, liftX(50));
  assert.equal(route.at(-1)!.z, LIFT_Z);
});

void test('slow crossings of the gallery clearance remain supported in both directions', () => {
  for (let level = 1; level < 5; level++) {
    const deck = level * LEVEL_HEIGHT;
    for (const x of [-1.5, 0, 1.5]) {
      const edgeZ = LIFT_Z - Math.sqrt(LIFT_RADIUS ** 2 - x ** 2);
      for (const direction of [-1, 1]) {
        let p = { x, z: edgeZ - direction * 0.1, level, y: deck + 0.17 };
        let velocity = 0;
        for (let step = 0; step <= 100; step++) {
          p.z = edgeZ + direction * (step * 0.002 - 0.1);
          const next = avatarSupport(p, velocity, deck, deck, 50, [], 1 / 60);
          assert.equal(next.y, deck + 0.17, `floor ${level}, x ${x}, z ${p.z}`);
          assert.equal(next.grounded, true);
          p.y = next.y;
          velocity = next.velocity;
        }
      }
    }
  }
});
void test('gallery clearance remains unsupported when the platform is away', () => {
  const p = {
    x: 0,
    z: LIFT_Z - LIFT_RADIUS - 0.015,
    level: 1,
    y: LEVEL_HEIGHT + 0.17,
  };
  const next = avatarSupport(p, 0, 0, 0, 50, [], 1 / 60);
  assert.equal(next.grounded, false);
  assert.ok(next.y < p.y);
});
