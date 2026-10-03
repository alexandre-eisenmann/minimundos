import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BookOpen,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  X,
  Camera,
  DoorOpen,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useSoundPreference } from '../../game/sound';
import { StudioSound } from '../assets/StudioSound';
import MiniMundosWordmark from '../assets/MiniMundosWordmark';
import TallyMarquee from '../assets/TallyMarquee';
import MovementJoystick from '../assets/MovementJoystick';
import type { MovementInput } from '../../game/movement';
import MontyHallWorld, { type Destination, type Phase } from './MontyHallWorld';
import {
  canWalk,
  doorPose,
  doorRows,
  liftX,
  LIFT_Z,
  LEVEL_HEIGHT,
  type FloorPoint,
} from './navigation';
import {
  chooseDoor,
  createRound,
  doorCounts,
  emptyExperiment,
  odds,
  resolveRound,
  revealNext,
  simulate,
  type Experiment,
} from './rules';
import './monty-hall.css';

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
        The studio needs browser graphics acceleration. Enable it and reload to
        explore the doors.
      </div>
    ) : (
      this.props.children
    );
  }
}
type Score = {
  rounds: number;
  stayPlays: number;
  stayWins: number;
  switchPlays: number;
  switchWins: number;
};
const newScore = (): Score => ({
  rounds: 0,
  stayPlays: 0,
  stayWins: 0,
  switchPlays: 0,
  switchWins: 0,
});
const percent = (value: number) =>
  `${(value * 100).toFixed(1).replace('.0', '')}%`;

export default function MontyHallExperience() {
  const [soundEnabled, setSoundEnabled] = useSoundPreference();
  const [sound] = useState(() => new StudioSound());
  useEffect(() => () => sound.dispose(), [sound]);
  const [round, setRound] = useState(() => createRound(3));
  const [phase, setPhase] = useState<Phase>('pick');
  const [resetKey, setResetKey] = useState(0),
    [cameraKey, setCameraKey] = useState(0);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [location, setLocation] = useState<number | null>(null);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  const [learnOpen, setLearnOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const sync = () =>
      sound.setEnabled(soundEnabled && !learnOpen && !document.hidden);
    const unlock = () => sound.unlock();
    sync();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [sound, soundEnabled, learnOpen]);
  useEffect(() => {
    if (round.revealed.length) sound.play('reveal');
  }, [round.revealed.length, sound]);
  useEffect(() => {
    if (phase === 'switch') sound.play('ready');
    if (phase === 'result')
      sound.play(round.final === round.prize ? 'win' : 'goat');
  }, [phase, round.final, round.prize, sound]);

  const [scores, setScores] = useState<Record<number, Score>>({});
  const [experiments, setExperiments] = useState<Record<number, Experiment>>(
    {},
  );
  const avatarLevel = useRef(0);
  const [nearLift, setNearLift] = useState<number | null>(null);
  const onNearLift = useCallback((level: number | null) => {
    if (level !== null) avatarLevel.current = level;
    setNearLift(level);
  }, []);
  const [pendingDoor, setPendingDoor] = useState<number | null>(null);
  const [nearDoor, setNearDoor] = useState<number | null>(null);

  const [platformCommand, setPlatformCommand] = useState<{
    level: number;
    serial: number;
  } | null>(null);
  const onAvatarLevel = useCallback((level: number) => {
    avatarLevel.current = level;
  }, []);
  const [platformLevel, setPlatformLevel] = useState(0);
  const [platformMoving, setPlatformMoving] = useState(false);
  const onPlatformState = useCallback((level: number, moving: boolean) => {
    setPlatformLevel(level);
    setPlatformMoving(moving);
  }, []);
  const score = scores[round.count] ?? newScore();
  const experiment = experiments[round.count] ?? emptyExperiment();

  const chances = odds(round.count);
  const liveRound = useRef(round),
    livePhase = useRef(phase);
  useLayoutEffect(() => {
    liveRound.current = round;
    livePhase.current = phase;
  }, [round, phase]);

  useEffect(() => {
    if (phase !== 'revealing' || learnOpen) return;
    const timer = setTimeout(
      () => {
        if (round.revealed.length === round.count - 2) setPhase('switch');
        else setRound(revealNext);
      },
      round.revealed.length === round.count - 2
        ? 650
        : round.count > 10
          ? 130
          : 1150,
    );
    return () => clearTimeout(timer);
  }, [phase, round.count, round.revealed, learnOpen]);
  useEffect(() => {
    if (learnOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [learnOpen]);
  const walkTo = useCallback(
    (point: FloorPoint & { door?: number }) =>
      setDestination((current) => ({
        ...point,
        serial: (current?.serial ?? 0) + 1,
      })),
    [],
  );
  const onLocation = useCallback(
    (door: number | null) => setLocation(door),
    [],
  );
  const onDoor = useCallback(
    (door: number) => {
      const current = liveRound.current,
        currentPhase = livePhase.current;
      const pose = doorPose(door, current.count);
      const opened =
        currentPhase === 'tour' ||
        currentPhase === 'result' ||
        current.revealed.includes(door);
      if (currentPhase === 'revealing' && !opened) return;
      if (
        currentPhase === 'switch' &&
        !opened &&
        door !== current.initial &&
        door !== current.alternative
      )
        return;
      if (pose.level !== avatarLevel.current) {
        setPendingDoor(null);
        walkTo({
          x: liftX(current.count),
          z: LIFT_Z,
          level: avatarLevel.current,
        });
        return;
      }
      setPendingDoor(door);
      walkTo({
        x: pose.x + (opened ? 0.9 : 0),
        z: opened ? -5.65 : -1.8,
        level: pose.level,
        door,
      });
    },
    [walkTo],
  );
  const onNearDoor = useCallback(
    (door: number | null) => setNearDoor(door),
    [],
  );
  const onWalk = useCallback(
    (point: FloorPoint & { door?: number }) => {
      const current = liveRound.current;
      const open = ['tour', 'result'].includes(livePhase.current)
        ? Array.from({ length: current.count }, (_, i) => i)
        : current.revealed;
      if (
        canWalk(point, current.count, open, avatarLevel.current * LEVEL_HEIGHT)
      ) {
        setPendingDoor(null);
        if ((point.level ?? 0) !== avatarLevel.current) {
          walkTo({
            x: liftX(current.count),
            z: LIFT_Z,
            level: avatarLevel.current,
          });
        } else walkTo(point);
      }
    },
    [walkTo],
  );
  function restart(count = round.count) {
    const next = createRound(count);
    liveRound.current = next;
    livePhase.current = 'pick';
    setRound(next);
    setPhase('pick');
    setDestination(null);
    setPlatformCommand(null);
    setResetKey((key) => key + 1);
    setNearDoor(null);
    setNearLift(null);
    setPendingDoor(null);

    setPlatformLevel(0);
    setPlatformMoving(false);
    avatarLevel.current = 0;
  }
  const decide = useCallback((switchDoor: boolean) => {
    if (livePhase.current !== 'switch') return;
    const resolved = resolveRound(liveRound.current, switchDoor);
    if (resolved.final === null) return;
    livePhase.current = 'result';
    liveRound.current = resolved;
    setRound(resolved);
    setPhase('result');
    setScores((current) => {
      const previous = current[resolved.count] ?? newScore(),
        won = resolved.final === resolved.prize ? 1 : 0;
      return {
        ...current,
        [resolved.count]: {
          rounds: previous.rounds + 1,
          stayPlays: previous.stayPlays + Number(!switchDoor),
          stayWins: previous.stayWins + (switchDoor ? 0 : won),
          switchPlays: previous.switchPlays + Number(switchDoor),
          switchWins: previous.switchWins + (switchDoor ? won : 0),
        },
      };
    });
  }, []);
  function onArrive(_door: number) {
    setDestination(null);
    setPlatformCommand(null);
    setPendingDoor(null);
  }
  const interactDoor = useCallback(
    (door: number) => {
      const current = liveRound.current;
      if (livePhase.current === 'pick' && current.initial === null) {
        const next = chooseDoor(current, door);
        liveRound.current = next;
        livePhase.current = 'revealing';
        setRound(next);
        setPhase('revealing');
      } else if (
        livePhase.current === 'switch' &&
        (door === current.initial || door === current.alternative)
      ) {
        decide(door === current.alternative);
      } else if (
        ['tour', 'result'].includes(livePhase.current) ||
        current.revealed.includes(door)
      ) {
        onDoor(door);
      }
    },
    [decide, onDoor],
  );
  useEffect(() => {
    const interact = (event: KeyboardEvent) => {
      if (
        learnOpen ||
        nearDoor === null ||
        event.code !== 'KeyE' ||
        event.repeat ||
        (event.target instanceof Element &&
          event.target.closest('input,select,textarea,button'))
      )
        return;
      event.preventDefault();
      interactDoor(nearDoor);
    };
    window.addEventListener('keydown', interact);
    return () => window.removeEventListener('keydown', interact);
  }, [nearDoor, learnOpen, interactDoor]);
  function addDoors() {
    if (!['pick', 'result', 'tour'].includes(livePhase.current)) return;
    const index = doorCounts.indexOf(
      liveRound.current.count as (typeof doorCounts)[number],
    );
    if (index < doorCounts.length - 1) restart(doorCounts[index + 1]);
  }
  function runExperiment() {
    const batch = simulate(round.count, 1000);
    setExperiments((current) => {
      const previous = current[round.count] ?? emptyExperiment();
      return {
        ...current,
        [round.count]: {
          trials: previous.trials + batch.trials,
          stayWins: previous.stayWins + batch.stayWins,
          switchWins: previous.switchWins + batch.switchWins,
        },
      };
    });
  }
  const won = round.final === round.prize;
  return (
    <main
      className="game monty-game"
      data-capture={
        import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get('capture') === 'atlas'
          ? 'atlas'
          : undefined
      }
    >
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="MiniMundos — all worlds"
        >
          <MiniMundosWordmark />
        </a>
        <div className="topbar-actions">
          <button
            className="learn-button"
            aria-label={
              soundEnabled ? 'Mute studio sounds' : 'Turn on studio sounds'
            }
            aria-pressed={soundEnabled}
            onClick={() => {
              sound.setEnabled(!soundEnabled);
              if (!soundEnabled) {
                sound.unlock();
                sound.play('ready');
              }
              setSoundEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="learn-button"
            onClick={() => setCameraKey((key) => key + 1)}
            aria-label="Reset studio camera"
          >
            <Camera size={18} />
            <span>View</span>
          </button>
          <button
            className="learn-button"
            onClick={() => setLearnOpen(true)}
            aria-haspopup="dialog"
          >
            <BookOpen size={18} />
            <span>Learn</span>
          </button>
        </div>
      </header>
      <section className="scene-title">
        <p className="monty-eyebrow">HOLLYWOOD · 1975</p>
        <h1>
          The door <br />
          you didn’t choose.
        </h1>
        <p>
          One car. {round.count - 1} goats.
          <br />A second chance to decide.
        </p>
      </section>
      <div className="world">
        <SceneBoundary>
          <MontyHallWorld
            soundEnabled={soundEnabled}
            round={round}
            phase={phase}
            input={input}
            resetKey={resetKey}
            cameraKey={cameraKey}
            paused={learnOpen}
            destination={destination}
            platformCommand={platformCommand}
            onAvatarLevel={onAvatarLevel}
            onDoor={onDoor}
            onWalk={onWalk}
            onLocation={onLocation}
            onArrive={onArrive}
            onNearDoor={onNearDoor}
            onNearLift={onNearLift}
            onPlatformState={onPlatformState}
            onAddDoors={addDoors}
          />
        </SceneBoundary>
        <MovementJoystick input={input} disabled={learnOpen} />
      </div>
      <label className="monty-stage-toolbar monty-count-select">
        <span>Stage size</span>
        <select
          aria-label="Number of doors"
          value={round.count}
          disabled={phase === 'revealing' || phase === 'switch'}
          onChange={(event) => restart(Number(event.target.value))}
        >
          {doorCounts.map((count) => (
            <option key={count} value={count}>
              {count} doors
            </option>
          ))}
        </select>
      </label>
      {(phase === 'revealing' || phase === 'switch' || phase === 'result') && (
        <section className="monty-choice-panel" aria-label="Your decision">
          <p role="status">
            {phase === 'revealing'
              ? `You chose door ${round.initial! + 1}. Revealing goats… ${round.revealed.length}/${round.count - 2}`
              : phase === 'switch'
                ? `${round.count - 2} ${round.count === 3 ? 'goat revealed' : 'goats revealed'}. Keep your first choice or switch?`
                : `${won ? 'You won the car!' : 'You found a goat!'} The car is behind door ${round.prize + 1}.`}
          </p>
          {phase !== 'result' ? (
            <div className="monty-decisions">
              <button
                disabled={phase !== 'switch'}
                onClick={() => decide(false)}
              >
                Keep door {round.initial! + 1}
                <small>Your first choice</small>
              </button>
              <button
                disabled={phase !== 'switch'}
                onClick={() => decide(true)}
              >
                Switch to door {round.alternative! + 1}
                <small>The other closed door</small>
              </button>
            </div>
          ) : (
            <button className="monty-primary" onClick={() => restart()}>
              <RotateCcw size={16} /> Play again
            </button>
          )}
        </section>
      )}
      <div className="monty-context" aria-label="Studio interactions">
        {nearDoor !== null && phase !== 'switch' && phase !== 'revealing' && (
          <button
            className="monty-context-action"
            onClick={() => nearDoor !== null && interactDoor(nearDoor)}
            disabled={pendingDoor !== null}
          >
            <span className="monty-context-icon">
              <DoorOpen size={28} />
            </span>
            <span>
              {phase === 'pick' ? 'Choose' : 'Enter'}{' '}
              {nearDoor !== null ? nearDoor + 1 : ''}
              <small>{nearDoor === null ? 'Walk to a door' : 'Press E'}</small>
            </span>
          </button>
        )}

        {doorRows(round.count).length > 1 &&
          ([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              className="monty-context-action monty-platform-action"
              disabled={
                platformMoving ||
                platformLevel + direction < 0 ||
                platformLevel + direction >= doorRows(round.count).length
              }
              onClick={() => {
                setPlatformCommand({
                  level: platformLevel + direction,
                  serial: Date.now(),
                });
              }}
            >
              <span className="monty-context-icon">
                {direction === 1 ? (
                  <ArrowUp size={28} />
                ) : (
                  <ArrowDown size={28} />
                )}
              </span>
              <span>
                {direction === 1 ? 'Go up' : 'Go down'}
                <small>
                  {platformMoving
                    ? 'Moving…'
                    : `Floor ${platformLevel + 1} of ${doorRows(round.count).length}`}
                </small>
              </span>
            </button>
          ))}
      </div>
      <footer className="monty-footer">
        <TallyMarquee
          key={`${phase}-${round.count}-${pendingDoor}-${nearLift}`}
          label="Studio updates"
          description="Round message, movement controls and scores. Swipe or use arrow keys to scroll."
        >
          <li
            className="monty-footer-message"
            aria-label="Play the Monty Hall problem"
            aria-live="polite"
          >
            <span className="monty-air-dot" />
            <span>
              {pendingDoor !== null
                ? `Walking to door ${pendingDoor + 1}`
                : nearLift !== null
                  ? 'The red platform is ready. Go up or down one floor.'
                  : phase === 'pick'
                    ? 'Walk to a door. Press E or Choose when you arrive.'
                    : phase === 'revealing'
                      ? `The host reveals goats · ${round.revealed.length} / ${round.count - 2}`
                      : phase === 'switch'
                        ? `Keep door ${round.initial! + 1} or switch to door ${round.alternative! + 1}. Choose below.`
                        : phase === 'result'
                          ? `${won ? 'You won the car!' : 'A goat for you!'} Car behind door ${round.prize + 1}. Explore inside.`
                          : 'Backstage · walk inside any door.'}
            </span>
          </li>
          <li>
            {location === null
              ? 'Drag to orbit · Scroll to zoom · Click the floor to walk'
              : `Inside door ${location + 1} · ${location === round.prize ? 'The car' : 'A goat'}`}
          </li>
          <li>
            {score.rounds} {score.rounds === 1 ? 'round' : 'rounds'} · Keep{' '}
            {score.stayWins}/{score.stayPlays} · Switch {score.switchWins}/
            {score.switchPlays}
          </li>
        </TallyMarquee>
      </footer>
      <dialog
        ref={dialog}
        className="monty-learn"
        aria-labelledby="monty-journal-title"
        onCancel={() => setLearnOpen(false)}
        onClose={() => setLearnOpen(false)}
      >
        <button
          className="monty-close"
          onClick={() => setLearnOpen(false)}
          aria-label="Close learning journal"
        >
          <X size={22} />
        </button>
        <p className="monty-eyebrow">THE MONTY HALL PROBLEM</p>
        <h2 id="monty-journal-title">A reveal isn’t a fresh start.</h2>
        <p>
          Your first guess finds the car only{' '}
          <strong>1 in {round.count}</strong> times. The other {round.count - 1}{' '}
          doors together have the remaining chance.
        </p>
        <p>
          The host knows the prizes. He always opens {round.count - 2} unchosen
          goat doors and always offers a switch. If your first guess was wrong,
          the only other closed door must hold the car.{' '}
          <strong>
            Switching wins exactly when your first guess was wrong.
          </strong>
        </p>
        <div className="monty-probability-row">
          <span>Keep your first choice</span>
          <b>
            1 / {round.count} · {percent(chances.stay)}
          </b>
          <div>
            <i style={{ width: `${chances.stay * 100}%` }} />
          </div>
        </div>
        <div className="monty-probability-row switch">
          <span>Switch to the other door</span>
          <b>
            {round.count - 1} / {round.count} · {percent(chances.switch)}
          </b>
          <div>
            <i style={{ width: `${chances.switch * 100}%` }} />
          </div>
        </div>
        <p className="monty-assumptions">
          One uniformly placed car. A knowledgeable host who never reveals your
          door or the car, randomly leaves a goat closed if you picked the car,
          and always offers the switch. These are the rules used in this world.
        </p>
        <section className="monty-experiment">
          <h3>Put it to the test.</h3>
          <p>
            Compare keeping and switching on the same {round.count}-door deals.
            Simulated games are separate from your played rounds.
          </p>
          <button className="monty-primary" onClick={runExperiment}>
            Run 1,000 random deals <ArrowRight size={16} />
          </button>
          <div className="monty-experiment-results" aria-live="polite">
            <span>
              <strong>{experiment.trials.toLocaleString()}</strong> simulated
              deals
            </span>
            <span>
              <strong>
                {experiment.trials
                  ? percent(experiment.stayWins / experiment.trials)
                  : '—'}
              </strong>{' '}
              keep wins
            </span>
            <span>
              <strong>
                {experiment.trials
                  ? percent(experiment.switchWins / experiment.trials)
                  : '—'}
              </strong>{' '}
              switch wins
            </span>
          </div>
          {experiment.trials > 0 && (
            <small>
              Random samples fluctuate; the exact probabilities above do not.
            </small>
          )}
        </section>
        <section className="monty-history">
          <h3>Why 1975?</h3>
          <p>
            <em>Let’s Make a Deal</em>, hosted by Monty Hall, began in 1963.
            Steve Selvin published the probability puzzle in{' '}
            <em>The American Statistician</em> in 1975. Marilyn vos Savant’s
            1990 column later brought it to a much wider audience.
          </p>
          <p>
            This is an original, illustrative 1970s Hollywood studio, not a
            reconstruction of a particular broadcast. The car, costumes and
            architecture evoke the period. The real show did not guarantee the
            puzzle’s host rules; the larger stacked studios are educational
            extensions.
          </p>
          <a
            href="https://www1.cmc.edu/pages/faculty/MHuber/Research/talks/huber_talk_2013d.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Mark Huber’s mathematical account ↗
          </a>
          <a
            href="https://www.televisionacademy.com/bios/monty-hall"
            target="_blank"
            rel="noreferrer"
          >
            Monty Hall and the show · Television Academy ↗
          </a>
          <a
            href="https://www.scientificamerican.com/blog/observations/lets-make-a-deal-revisiting-the-monty-hall-problem/"
            target="_blank"
            rel="noreferrer"
          >
            Historical context in Scientific American ↗
          </a>
        </section>
      </dialog>
    </main>
  );
}
