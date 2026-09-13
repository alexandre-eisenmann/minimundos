import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANAL,
  CANAL_BED,
  CLIFF_X,
  LAND,
  TAIL_RACE,
  TERRACE_Y,
  WHEEL_PIT,
  climbPath,
  landHeight,
  nearestOnPath,
  townRoad,
} from './terrain.ts';

test('the launch terrace is flat at the height the tracks leave from', () => {
  for (const z of [-4, -1.5, 0, 2.2, 4]) {
    assert.equal(landHeight(CLIFF_X - 0.1, z).toFixed(4), TERRACE_Y.toFixed(4));
    assert.equal(landHeight(-10, z).toFixed(4), TERRACE_Y.toFixed(4));
  }
});

test('the quarried face drops to the valley floor east of the cliff', () => {
  assert.ok(landHeight(CLIFF_X, 0) > 5.9);
  assert.ok(landHeight(CLIFF_X + 0.25, 0) < 0.05);
  // Everything the gantry occupies stays flat, so no curve and no frame leg
  // can end up buried in the bluff whatever the visitor draws.
  for (let x = CLIFF_X + 0.25; x <= 9; x += 0.25)
    for (let z = -4.6; z <= 4.6; z += 0.2)
      assert.ok(
        landHeight(x, z) < 0.05,
        `corridor blocked at ${x.toFixed(2)}, ${z.toFixed(2)}`,
      );
});

test('the quarry benches step the working face beside the notch', () => {
  for (const z of [6, -6]) {
    assert.ok(landHeight(-4, z) > 2.5, 'bench missing');
    assert.ok(landHeight(-3.2, z) < 0.4, 'bench nose does not end');
  }
});

test('the summit rises above the terrace and settles at the island rim', () => {
  assert.ok(landHeight(-12.5, 0.2) > 7.5);
  assert.ok(landHeight(-LAND.halfWidth, 0) < 0.05);
  assert.ok(landHeight(0, -LAND.halfDepth) < 0.05);
});

test('the climbing path is a walkable shelf at its own elevation', () => {
  for (const point of climbPath) {
    assert.ok(Math.abs(landHeight(point.x, point.z) - point.y) < 0.02);
    assert.equal(nearestOnPath(point.x, point.z).distance.toFixed(3), '0.000');
  }
});

test('the path climbs monotonically at a walkable gradient', () => {
  for (let i = 1; i < climbPath.length; i++) {
    const a = climbPath[i - 1];
    const b = climbPath[i];
    const run = Math.hypot(b.x - a.x, b.z - a.z);
    const rise = b.y - a.y;
    assert.ok(rise >= 0, `leg ${i} descends`);
    assert.ok(rise / run < 0.55, `leg ${i} is too steep`);
  }
});

test('the canal holds water below the quay', () => {
  const mid = (CANAL.minZ + CANAL.maxZ) / 2;
  assert.equal(landHeight(6, mid).toFixed(4), CANAL_BED.toFixed(4));
  assert.ok(landHeight(6, CANAL.maxZ + 1) > -0.02);
});

test('the wheel pit is quarried into the flank and holds its full depth', () => {
  const midZ = (WHEEL_PIT.minZ + WHEEL_PIT.maxZ) / 2;
  for (const x of [WHEEL_PIT.minX, -4, WHEEL_PIT.maxX])
    assert.equal(landHeight(x, midZ).toFixed(4), CANAL_BED.toFixed(4));
  // Cutting back into the hillside is the whole point of the pit: without it
  // the wheel could only grow eastwards, out across the valley floor and into
  // the tracks. So the flank above the pit has to survive, and the pit needs
  // a back wall rather than a ramp.
  assert.ok(landHeight(WHEEL_PIT.minX, 6.2) > 4.5, 'the flank above is gone');
  assert.ok(landHeight(WHEEL_PIT.minX - 1.5, midZ) > 1.5, 'the pit has no back');
});

test('the tail race carries the pit water under the rig to the canal', () => {
  const midX = (TAIL_RACE.minX + TAIL_RACE.maxX) / 2;
  for (let z = TAIL_RACE.minZ; z <= TAIL_RACE.maxZ; z += 0.25)
    assert.equal(
      landHeight(midX, z).toFixed(4),
      CANAL_BED.toFixed(4),
      `race broken at ${z.toFixed(2)}`,
    );
  const canalMid = (CANAL.minZ + CANAL.maxZ) / 2;
  assert.equal(landHeight(midX, canalMid).toFixed(4), CANAL_BED.toFixed(4));
  // The tracks cross it overhead, so their frame legs must stay on dry land.
  for (const x of [-4.15, -1.55])
    assert.ok(landHeight(x, 0) > -0.02, `frame leg at ${x} stands in water`);
});

test('the excavations do not sag the lane or the crowd rail', () => {
  // Walked along the tread and across its full width, rather than scanned
  // over the plane: the lane is where people actually are. Only the valley
  // legs are checked; the quay legs cross the canal on the bridge.
  for (let i = 5; i < townRoad.length; i++) {
    const a = townRoad[i - 1];
    const b = townRoad[i];
    const run = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = (b.z - a.z) / run;
    const nz = -(b.x - a.x) / run;
    for (let d = 0; d <= run; d += 0.2) {
      const t = d / run;
      // The width of the worn tread. Beyond it the verge may slope to the
      // water; the race is cut so the walking surface itself stays dry.
      for (const side of [-0.6, 0, 0.6]) {
        const x = a.x + (b.x - a.x) * t + nx * side;
        const z = a.z + (b.z - a.z) * t + nz * side;
        assert.ok(
          landHeight(x, z) > -0.02,
          `lane sags at ${x.toFixed(2)}, ${z.toFixed(2)}`,
        );
      }
    }
  }
  // The rail starts east of the tail race, which the lawn does not cross.
  for (let x = -1.5; x <= 9.5; x += 0.25)
    assert.ok(landHeight(x, 6.1) > -0.02, `crowd rail sags at ${x}`);
});
