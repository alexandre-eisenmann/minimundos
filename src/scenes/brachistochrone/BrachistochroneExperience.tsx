import MiniMundosWordmark from '../assets/MiniMundosWordmark';
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BookOpen, Hammer, Play, Volume2, VolumeX, X } from 'lucide-react';
import { CartSound } from '../assets/CartSound';
import { useSoundPreference } from '../../game/sound';
import type { MovementInput } from '../../game/movement';
import MovementJoystick from '../assets/MovementJoystick';
import BezierEditor from './BezierEditor';
import BrachistochroneWorld, { laneNames } from './BrachistochroneWorld';
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
  const [soundEnabled, setSoundEnabled] = useSoundPreference();
  const [cartSound] = useState(() => new CartSound());
  const [anchors, setAnchors] = useState<CurvePoint[]>(() => defaultAnchors(4));
  const [gateOpen, setGateOpen] = useState(false);
  const [finishTimes, setFinishTimes] = useState<(number | null)[]>([null, null, null]);
  const [racing, setRacing] = useState([false, false, false]);

  const [running, setRunning] = useState([true, true, true]);
  const [learnOpen, setLearnOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => {
    const sync = () => cartSound.setEnabled(soundEnabled && !learnOpen && !document.hidden);
    const unlock = () => { sync(); cartSound.unlock(); };
    sync();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('touchend', unlock, { capture: true });
      window.removeEventListener('click', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
      document.removeEventListener('visibilitychange', sync);
    };
  }, [cartSound, soundEnabled, learnOpen]);
  useEffect(() => () => cartSound.dispose(), [cartSound]);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(true);
  useEffect(() => () => { if (gateTimer.current) clearTimeout(gateTimer.current); }, []);

  const setLane = <T,>(lane: number, value: T) => (current: T[]) =>
    current.map((held, index) => (index === lane ? value : held));

  const departLane = useCallback((lane: number) => {
    setRunning(setLane(lane, true));
    setRacing(setLane(lane, true));
  }, []);
  const finishLane = useCallback((lane: number, time: number) => {
    setFinishTimes(setLane<number | null>(lane, time));
    setRacing(setLane(lane, false));
  }, []);
  const readyLane = useCallback((lane: number) => {
    setRunning(current => {
      const next = current.map((value, index) => index === lane ? false : value);
      busy.current = next.some(Boolean);
      return next;
    });
  }, []);
  const launch = useCallback(() => {
    cartSound.unlock();
    if (busy.current) return;
    busy.current = true;
    setGateOpen(true);
    if (window.matchMedia('(max-width: 700px)').matches) setEditorOpen(false);
    gateTimer.current = setTimeout(() => setGateOpen(false), 1100);
  }, [cartSound]);
  const ignoreTime = useCallback(() => {}, []);
  const returning = running.some(Boolean);
  const editCurve = (next: CurvePoint[]) => {
    if (busy.current) return;
    setAnchors(next);
    setFinishTimes(setLane<number | null>(2, null));
  };

  return (
    <main className="game brachistochrone-game">
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="MiniMundos — all worlds"
        >
          <MiniMundosWordmark />
        </a>
        <div className="topbar-actions">
          <button className="learn-button" type="button"
            aria-label={soundEnabled ? 'Mute cart sounds' : 'Turn on cart sounds'}
            aria-pressed={soundEnabled}
            onClick={() => {
              cartSound.setEnabled(!soundEnabled);
              if (!soundEnabled) cartSound.unlock();
              setSoundEnabled(!soundEnabled);
            }}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span>Sound</span>
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
          <span>Release the carts.</span>
        </p>
      </section>

      <div className="world">
        <SceneBoundary>
          <BrachistochroneWorld
            cartSound={cartSound}
            anchors={anchors}
            gateOpen={gateOpen}
            input={input}
            paused={learnOpen}
            onToggleGate={launch}
            onTick={ignoreTime}
            onFinish={finishLane}
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
      <footer className="race-footer" aria-label="Curve descent times">
        <span className="race-footer-caption">Descent times</span>
        <ol>
          {laneNames.map((name, lane) => (
            <li key={name} className={`race-result race-result-${lane}`}>
              <span className="race-result-key" aria-hidden="true" />
              <span className="race-result-name">{name}</span>
              <output aria-label={`${name} time`} aria-live="polite">
                {finishTimes[lane] === null ? '—' : finishTimes[lane].toFixed(2)}<small> s</small>
              </output>
            </li>
          ))}
        </ol>
        <span className="race-footer-caption" role="status">
          {racing.some(Boolean) ? 'Racing…' : finishTimes.some(time => time !== null) ? 'Last run' : 'Ready to race'}
        </span>
      </footer>
      <BezierEditor
        anchors={anchors}
        onChange={editCurve}
        disabled={returning}
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
