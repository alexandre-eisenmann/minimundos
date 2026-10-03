/** The idealised Selvin puzzle, not the variable rules of the television show. */
export type Round = {
  count: number;
  prize: number;
  initial: number | null;
  alternative: number | null;
  revealed: number[];
  final: number | null;
};
export const doorCounts = [3, 5, 10, 20, 30, 50] as const;
export function createRound(count: number, random = Math.random): Round {
  if (!Number.isInteger(count) || count < 3 || count > 100)
    throw new Error('Use 3–100 doors');
  return {
    count,
    prize: Math.floor(random() * count),
    initial: null,
    alternative: null,
    revealed: [],
    final: null,
  };
}
export function chooseDoor(
  round: Round,
  door: number,
  random = Math.random,
): Round {
  if (
    round.initial !== null ||
    !Number.isInteger(door) ||
    door < 0 ||
    door >= round.count
  )
    return round;
  const others = Array.from({ length: round.count }, (_, i) => i).filter(
    (i) => i !== door,
  );
  // Uniform tie breaking keeps the displayed conditional odds valid for every door.
  const alternative =
    door === round.prize
      ? others[Math.floor(random() * others.length)]
      : round.prize;
  return { ...round, initial: door, alternative };
}
export function revealNext(round: Round): Round {
  if (round.initial === null || round.final !== null) return round;
  const next = Array.from({ length: round.count }, (_, i) => i).find(
    (i) =>
      i !== round.initial &&
      i !== round.alternative &&
      !round.revealed.includes(i),
  );
  return next === undefined
    ? round
    : { ...round, revealed: [...round.revealed, next] };
}
export function resolveRound(round: Round, switchDoor: boolean): Round {
  if (
    round.initial === null ||
    round.alternative === null ||
    round.final !== null ||
    round.revealed.length !== round.count - 2
  )
    return round;
  return { ...round, final: switchDoor ? round.alternative : round.initial };
}
export function odds(count: number) {
  return { stay: 1 / count, switch: (count - 1) / count };
}
export type Experiment = {
  trials: number;
  stayWins: number;
  switchWins: number;
};
export const emptyExperiment = (): Experiment => ({
  trials: 0,
  stayWins: 0,
  switchWins: 0,
});
/** Paired trials compare both policies on the SAME randomly dealt game. */
export function simulate(
  count: number,
  trials: number,
  random = Math.random,
): Experiment {
  const result = emptyExperiment();
  for (let i = 0; i < trials; i++) {
    let round = chooseDoor(
      createRound(count, random),
      Math.floor(random() * count),
      random,
    );
    while (round.revealed.length < count - 2) round = revealNext(round);
    result.trials++;
    if (resolveRound(round, false).final === round.prize) result.stayWins++;
    if (resolveRound(round, true).final === round.prize) result.switchWins++;
  }
  return result;
}
