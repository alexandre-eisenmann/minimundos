import test from 'node:test';
import assert from 'node:assert/strict';
import { canExplore, closestSlate } from './classroomMotion.ts';
import { students } from './students.ts';
void test('explorer stays in the classroom and cannot walk through occupied desks', () => {
  assert.ok(canExplore(4.8, 3.5));
  for (const [x, z] of [
    [-5, 0],
    [6, 0],
    [0, -4],
    [0, 5],
  ])
    assert.equal(canExplore(x, z), false);
  for (const s of students) {
    assert.equal(canExplore(s.x, s.z), false);
    assert.ok(canExplore(s.x + 1.3, s.z + 0.1));
  }
});
void test('every slate has an accessible inspection position and the entrance has none', () => {
  assert.equal(closestSlate(4.8, 3.5), null);
  students.forEach((s, i) =>
    assert.equal(closestSlate(s.x + 1.3, s.z + 0.1), i),
  );
});
