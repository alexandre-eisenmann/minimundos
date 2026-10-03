import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRound,
  chooseDoor,
  revealNext,
  resolveRound,
  odds,
  simulate,
  doorCounts,
} from './rules.ts';

void test('each new round draws a fresh car placement from all available doors', (t) => {
  const random = t.mock.method(Math, 'random');
  for (const count of doorCounts) {
    for (let prize = 0; prize < count; prize++) {
      random.mock.mockImplementationOnce(() => (prize + 0.5) / count);
      const round = createRound(count);
      assert.equal(round.prize, prize);
      assert.equal(round.initial, null);
      assert.equal(round.final, null);
      assert.deepEqual(round.revealed, []);
    }
  }
  assert.equal(
    random.mock.callCount(),
    doorCounts.reduce((total, count) => total + count, 0),
  );
});

void test('every prize / initial choice obeys host rules, for 3, 5, 10 and 100 doors', () => {
  for (const count of [3, 5, 10, 100]) {
    for (let prize = 0; prize < count; prize++)
      for (let initial = 0; initial < count; initial++) {
        let round = chooseDoor(
          createRound(count, () => (prize + 0.1) / count),
          initial,
          () => 0.6,
        );
        assert.equal(round.revealed.length, 0);
        assert.equal(round.prize, prize);
        for (let i = 0; i < count - 2; i++) round = revealNext(round);
        assert.equal(new Set(round.revealed).size, count - 2);
        assert.ok(!round.revealed.includes(initial));
        assert.ok(!round.revealed.includes(prize));
        assert.notEqual(round.alternative, initial);
        const staying = resolveRound(round, false),
          switching = resolveRound(round, true);
        assert.equal(staying.final === prize, initial === prize);
        assert.equal(switching.final === prize, initial !== prize);
      }
    assert.deepEqual(odds(count), {
      stay: 1 / count,
      switch: (count - 1) / count,
    });
  }
});
void test('invalid and premature actions cannot change the deal', () => {
  const round = createRound(5, () => 0.5);
  assert.equal(chooseDoor(round, -1), round);
  assert.equal(chooseDoor(round, 5), round);
  assert.equal(chooseDoor(round, 1.5), round);
  assert.equal(revealNext(round), round);
  const picked = chooseDoor(round, 0);
  assert.equal(chooseDoor(picked, 1), picked);
  assert.equal(resolveRound(picked, true), picked);
  assert.throws(() => createRound(2));
});
void test('tie breaking can preserve any alternative goat when the first pick wins', () => {
  for (let i = 0; i < 9; i++) {
    const round = chooseDoor(
      createRound(10, () => 0),
      0,
      () => (i + 0.1) / 9,
    );
    assert.equal(round.alternative, i + 1);
  }
});
void test('paired random experiment has complementary wins and converges to theory', () => {
  let seed = 1975;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const count of [3, 5, 10]) {
    const result = simulate(count, 12000, random);
    assert.equal(result.trials, 12000);
    assert.equal(result.stayWins + result.switchWins, result.trials);
    assert.ok(
      Math.abs(result.switchWins / result.trials - odds(count).switch) < 0.02,
    );
  }
});
