import test from 'node:test';
import assert from 'node:assert/strict';
import { riverBoatPose } from './riverTraffic.ts';

test('boat hulls remain in their channel and clear bridge piers for a full circuit', () => {
  for (const channel of [-3, 3]) {
    for (let step = 0; step <= 2400; step++) {
      const p = riverBoatPose(
        (step / 2400) * ((Math.PI * 2) / 0.055),
        channel,
        0,
      );
      const c = Math.cos(p.yaw),
        s = Math.sin(p.yaw);
      // Conservative rectangle enclosing the hull, including its bevel.
      for (const x of [-0.81, 0.81])
        for (const z of [-0.25, 0.25]) {
          const wx = p.x + c * x + s * z;
          const wz = p.z - s * x + c * z;
          assert.ok(
            Math.abs(wx) < 11.2,
            'hull stays away from waterfall edges',
          );
          assert.ok(
            Math.abs(wz) > 1.7 && Math.abs(wz) < 4.3,
            'hull stays off land',
          );
        }
      for (const bridgeX of [-4.5, 0.1, 6.2])
        for (const side of [-1, 1]) {
          const dx = bridgeX + side * 0.322 - p.x,
            dz = channel - p.z;
          // Separating-axis check for oriented hull versus rectangular stone pier.
          const separated = [
            Math.abs(dx) > 0.81 * Math.abs(c) + 0.25 * Math.abs(s) + 0.11,
            Math.abs(dz) > 0.81 * Math.abs(s) + 0.25 * Math.abs(c) + 0.18,
            Math.abs(dx * c - dz * s) >
              0.81 + 0.11 * Math.abs(c) + 0.18 * Math.abs(s),
            Math.abs(dx * s + dz * c) >
              0.25 + 0.11 * Math.abs(s) + 0.18 * Math.abs(c),
          ];
          assert.ok(separated.some(Boolean), 'hull clears every bridge pier');
        }
    }
  }
});
