import {
  Component,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BookOpen, DoorOpen, RotateCcw, X } from 'lucide-react';
import type { MovementInput } from '../../game/movement';
import MovementJoystick from '../assets/MovementJoystick';
import BezierEditor from './BezierEditor';
import BrachistochroneWorld from './BrachistochroneWorld';
import { defaultAnchors, type CurvePoint } from './curveMath';

class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error">
        The workshop could not start. Enable browser graphics acceleration and
        reload.
      </div>
    ) : (
      this.props.children
    );
  }
}

const laneNames = ['Straight', 'Parabola', 'Your curve'];

export default function BrachistochroneExperience() {
  const [anchors, setAnchors] = useState<CurvePoint[]>(() => defaultAnchors(4));
  const [gateOpen, setGateOpen] = useState(false);
  const [raceKey, setRaceKey] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'racing' | 'finished'>('ready');
  const [times, setTimes] = useState([0, 0, 0]);
  const [finished, setFinished] = useState([false, false, false]);
  const [learnOpen, setLearnOpen] = useState(false);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  const lastPaint = useRef([0, 0, 0]);

  const updateTime = useCallback((lane: number, time: number) => {
    if (time - lastPaint.current[lane] < 0.04) return;
    lastPaint.current[lane] = time;
    setTimes((current) =>
      current.map((value, index) => (index === lane ? time : value)),
    );
  }, []);

  const finishLane = useCallback((lane: number, time: number) => {
    setTimes((current) =>
      current.map((value, index) => (index === lane ? time : value)),
    );
    setFinished((current) => {
      const next = current.map((value, index) =>
        index === lane ? true : value,
      );
      if (next.every(Boolean)) setPhase('finished');
      return next;
    });
  }, []);

  function toggleGate() {
    setGateOpen((open) => {
      const next = !open;
      if (next && phase === 'ready') {
        setTimes([0, 0, 0]);
        setFinished([false, false, false]);
        lastPaint.current = [0, 0, 0];
        setRaceKey((key) => key + 1);
        setPhase('racing');
      }
      return next;
    });
  }

  function resetRace() {
    setRaceKey(0);
    setGateOpen(false);
    setPhase('ready');
    setTimes([0, 0, 0]);
    setFinished([false, false, false]);
    input.current = { x: 0, z: 0 };
  }

  return (
    <main className="game brachistochrone-game">
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="MiniMundos — all worlds"
        >
          MiniMundos
        </a>
        <div className="topbar-actions">
          <button
            className="compact-control"
            type="button"
            onClick={resetRace}
            title="Reset race"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
          <button
            className="learn-button"
            type="button"
            onClick={() => setLearnOpen(true)}
            aria-haspopup="dialog"
          >
            <BookOpen size={20} />
            <span>Learn</span>
          </button>
        </div>
      </header>

      <section
        className="scene-title"
        aria-label="The curve of fastest descent"
      >
        <h1>
          The curve of
          <br />
          fastest descent
        </h1>
        <p className="scene-instruction">
          <span>Shape a track.</span>
          <span>Release the riders.</span>
        </p>
      </section>

      <div className="world">
        <SceneBoundary>
          <BrachistochroneWorld
            anchors={anchors}
            gateOpen={gateOpen}
            raceKey={raceKey}
            input={input}
            paused={learnOpen}
            onTick={updateTime}
            onFinish={finishLane}
          />
        </SceneBoundary>
        <MovementJoystick input={input} disabled={learnOpen} />

        <section className="race-console" aria-label="Race controls">
          <div className="race-times">
            {laneNames.map((name, lane) => (
              <div key={name} className={finished[lane] ? 'finished' : ''}>
                <span>{name}</span>
                <strong>
                  {times[lane].toFixed(2)}
                  <small>s</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="gate-actions">
            <button
              className="release-button"
              type="button"
              onClick={toggleGate}
            >
              <DoorOpen size={19} />{' '}
              {gateOpen
                ? 'Close gates'
                : phase === 'ready'
                  ? 'Release riders'
                  : 'Open gates'}
            </button>
            <span aria-live="polite">
              {phase === 'ready'
                ? 'Three riders are waiting.'
                : phase === 'racing'
                  ? 'The race is running.'
                  : 'All riders have arrived.'}
            </span>
          </div>
        </section>

        <BezierEditor
          anchors={anchors}
          onChange={setAnchors}
          disabled={phase === 'racing'}
        />
      </div>

      <dialog
        className="brach-learn-dialog"
        open={learnOpen}
        aria-labelledby="brach-learn-title"
      >
        <div>
          <header>
            <h2 id="brach-learn-title">Bernoulli’s challenge</h2>
            <button
              type="button"
              onClick={() => setLearnOpen(false)}
              aria-label="Close"
            >
              <X size={21} />
            </button>
          </header>
          <p>
            In June 1696, Johann Bernoulli challenged mathematicians to find the
            path between two points that gravity would traverse in the least
            time.
          </p>
          <p>
            The winning curve is a <strong>cycloid</strong>. It drops steeply at
            first, gaining speed early, then uses that speed across the
            remaining distance.
          </p>
          <p>
            This workshop is an illustrative reconstruction of 1696–1697. The
            race uses ideal uniform gravity and ignores friction and air
            resistance.
          </p>
          <a
            href="https://mathshistory.st-andrews.ac.uk/HistTopics/Brachistochrone/"
            target="_blank"
            rel="noreferrer"
          >
            Read the historical account ↗
          </a>
        </div>
      </dialog>
    </main>
  );
}
