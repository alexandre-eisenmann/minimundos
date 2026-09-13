import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BookOpen, Hammer, Play, X } from 'lucide-react';
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

export default function BrachistochroneExperience() {
  const [anchors, setAnchors] = useState<CurvePoint[]>(() => defaultAnchors(4));
  const [gateOpen, setGateOpen] = useState(false);

  const [running, setRunning] = useState([true, true, true]);
  const [learnOpen, setLearnOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(true);
  useEffect(() => () => { if (gateTimer.current) clearTimeout(gateTimer.current); }, []);

  const setLane = <T,>(lane: number, value: T) => (current: T[]) =>
    current.map((held, index) => (index === lane ? value : held));

  const departLane = useCallback((lane: number) => {
    setRunning(setLane(lane, true));
  }, []);
  const readyLane = useCallback((lane: number) => {
    setRunning(current => {
      const next = current.map((value, index) => index === lane ? false : value);
      busy.current = next.some(Boolean);
      return next;
    });
  }, []);
  const launch = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setGateOpen(true);
    if (window.matchMedia('(max-width: 700px)').matches) setEditorOpen(false);
    gateTimer.current = setTimeout(() => setGateOpen(false), 1100);
  }, []);
  const ignoreTime = useCallback(() => {}, []);
  const returning = running.some(Boolean);

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
          <span>Release the carts.</span>
        </p>
      </section>

      <div className="world">
        <SceneBoundary>
          <BrachistochroneWorld
            anchors={anchors}
            gateOpen={gateOpen}
            input={input}
            paused={learnOpen}
            onToggleGate={launch}
            onTick={ignoreTime}
            onFinish={ignoreTime}
            onDepart={departLane}
            onReady={readyLane}
          />
        </SceneBoundary>
        <MovementJoystick input={input} disabled={learnOpen} />

        <button
          className="launch-action"
          type="button"
          onClick={launch}
          disabled={returning || learnOpen}
          aria-label={returning ? 'Carts in motion' : 'Release carts'}
        >
          <span className="launch-action-icon"><Play size={30} fill="currentColor" strokeWidth={1.3} /></span>
          <span>{returning ? 'In motion' : 'Release'}</span>
        </button>

        <button
          className="launch-action construction-action"
          type="button"
          onClick={() => setEditorOpen(open => !open)}
          disabled={learnOpen}
          aria-label="Edit your ramp"
          aria-expanded={editorOpen}
          aria-controls="curve-editor"
        >
          <span className="launch-action-icon"><Hammer size={30} strokeWidth={1.6} /></span>
          <span>Build</span>
        </button>
      </div>
      <BezierEditor
        anchors={anchors}
        onChange={setAnchors}
        open={editorOpen}
        onToggle={() => setEditorOpen(false)}
      />

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
