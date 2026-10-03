import { ChevronDown, Trophy } from 'lucide-react';

export type Score = {
  rounds: number;
  stayPlays: number;
  stayWins: number;
  switchPlays: number;
  switchWins: number;
};
export const newScore = (): Score => ({
  rounds: 0,
  stayPlays: 0,
  stayWins: 0,
  switchPlays: 0,
  switchWins: 0,
});
const rate = (wins: number, plays: number) =>
  plays ? `${Math.round((wins / plays) * 100)}%` : '–';

function Outcome({
  wins,
  plays,
  expected,
}: {
  wins: number;
  plays: number;
  expected: number;
}) {
  return (
    <>
      <td className="is-won">{plays ? wins : '–'}</td>
      <td className="is-lost">{plays ? plays - wins : '–'}</td>
      <td className="monty-score-rate">
        {rate(wins, plays)}
        <small>{Math.round(expected * 100)}%</small>
      </td>
    </>
  );
}

/** Played rounds by door count and decision, beside the theoretical odds. */
export default function Scoreboard({
  scores,
  counts,
  current,
  open,
  onToggle,
}: {
  scores: Record<number, Score>;
  counts: readonly number[];
  current: number;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const total = counts.reduce((sum, count) => {
    const score = scores[count] ?? newScore();
    return {
      rounds: sum.rounds + score.rounds,
      stayPlays: sum.stayPlays + score.stayPlays,
      stayWins: sum.stayWins + score.stayWins,
      switchPlays: sum.switchPlays + score.switchPlays,
      switchWins: sum.switchWins + score.switchWins,
    };
  }, newScore());
  return (
    <details
      className="monty-scoreboard"
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary>
        <Trophy size={15} aria-hidden />
        <span>Scoreboard</span>
        <small>
          {total.rounds} {total.rounds === 1 ? 'round' : 'rounds'}
        </small>
        <ChevronDown
          className="monty-scoreboard-chevron"
          size={16}
          aria-hidden
        />
      </summary>
      <table>
        <caption>
          Won and lost rounds by door count. Small figures are the theoretical
          win rate.
        </caption>
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>
              Doors
            </th>
            <th scope="colgroup" colSpan={3}>
              Keep
            </th>
            <th scope="colgroup" colSpan={3} className="is-switch">
              Switch
            </th>
          </tr>
          <tr>
            <th scope="col">Won</th>
            <th scope="col">Lost</th>
            <th scope="col">Rate</th>
            <th scope="col" className="is-switch">
              Won
            </th>
            <th scope="col">Lost</th>
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((count) => {
            const score = scores[count] ?? newScore();
            return (
              <tr
                key={count}
                className={count === current ? 'is-current' : undefined}
                aria-current={count === current ? 'true' : undefined}
              >
                <th scope="row">{count}</th>
                <Outcome
                  wins={score.stayWins}
                  plays={score.stayPlays}
                  expected={1 / count}
                />
                <Outcome
                  wins={score.switchWins}
                  plays={score.switchPlays}
                  expected={(count - 1) / count}
                />
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">All</th>
            <td className="is-won">{total.stayWins}</td>
            <td className="is-lost">{total.stayPlays - total.stayWins}</td>
            <td className="monty-score-rate">
              {rate(total.stayWins, total.stayPlays)}
            </td>
            <td className="is-won">{total.switchWins}</td>
            <td className="is-lost">{total.switchPlays - total.switchWins}</td>
            <td className="monty-score-rate">
              {rate(total.switchWins, total.switchPlays)}
            </td>
          </tr>
        </tfoot>
      </table>
    </details>
  );
}
