import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  RotateCcw,
  Search,
  X,
  BellRing,
  ScanSearch,
  Users,
} from 'lucide-react';
import GaussWorld from './GaussWorld';
import MiniMundosWordmark from '../assets/MiniMundosWordmark';
import { pairedSum, pairsFor, students } from './students';
import './gauss.css';
import MovementJoystick from '../assets/MovementJoystick';
import type { MovementInput } from '../../game/movement';
import type { ClassroomPhase } from './classroomMotion';
import { HandwrittenSlate } from './handwriting';

class ClassroomBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="gauss-fallback">
        The classroom needs graphics acceleration. You can still inspect every
        student’s slate using the buttons below.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function GaussExperience() {
  const [phase, setPhase] = useState<ClassroomPhase>('recess');
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [nearby, setNearby] = useState<number | null>(null);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  useEffect(() => {
    if (phase !== 'settling') return;
    const timer = window.setTimeout(() => setPhase('challenge'), 6500);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [lens, setLens] = useState(true);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [reset, setReset] = useState(0);
  const [journal, setJournal] = useState(false);
  const [n, setN] = useState(100);
  const [pairIndex, setPairIndex] = useState(0);
  const studentPicker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (studentsOpen)
      studentPicker.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus();
  }, [studentsOpen]);
  const close = useRef<HTMLButtonElement>(null);
  const lastSelection = useRef<HTMLButtonElement | null>(null);
  const student = selected === null ? null : students[selected];
  const inspecting = student !== null || journal;
  const pairs = pairsFor(n);
  const pair = pairs[Math.min(pairIndex, pairs.length - 1)];
  useEffect(() => {
    if (inspecting) close.current?.focus();
    else lastSelection.current?.focus();
  }, [inspecting]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        setJournal(false);
        setStudentsOpen(false);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const inspect = (index: number) => {
    if (phase !== 'challenge') return;
    setStudentsOpen(false);
    setSelected(index);
    setJournal(false);
    setPointer(null);
  };
  return (
    <main className="gauss-experience">
      <header className="gauss-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="MiniMundos — all worlds"
        >
          <MiniMundosWordmark />
        </a>
        <nav
          className="gauss-view-controls"
          aria-label="Viewing and information controls"
        >
          <button
            title="Inspection lens"
            aria-label="Inspection lens"
            disabled={phase !== 'challenge'}
            className={lens ? 'active' : ''}
            aria-pressed={lens}
            onClick={() => {
              setLens(!lens);
              setPointer(null);
            }}
          >
            <Search size={20} />
          </button>
          <button
            title="Field notes"
            aria-label="Field notes"
            disabled={phase !== 'challenge'}
            aria-expanded={journal}
            onClick={() => {
              setJournal(!journal);
              setSelected(null);
              setStudentsOpen(false);
            }}
          >
            <BookOpen size={20} />
          </button>
          <button
            title="Reset classroom camera"
            aria-label="Reset classroom camera"
            onClick={() => setReset(reset + 1)}
          >
            <RotateCcw size={20} />
          </button>
        </nav>
      </header>
      <section className="gauss-intro">
        <div>
          <p className="gauss-eyebrow">BRAUNSCHWEIG · AROUND 1786</p>
          <h1>
            A hundred numbers.
            <br />
            <em>One little idea.</em>
          </h1>
        </div>
        <p>
          A classroom full of arithmetic.
          <br />
          One child sees something different.
          <br />
          <strong>Look closer at their work.</strong>
        </p>
      </section>
      <section
        className="gauss-stage"
        aria-label="Interactive miniature classroom"
        onPointerMove={(e) => {
          if (e.clientY < 74) {
            setPointer(null);
            return;
          }
          if (
            e.target instanceof Element &&
            e.target.closest(
              'button, nav, .gauss-student-picker, .gauss-inspector, .gauss-explorer-controls',
            )
          ) {
            setPointer(null);
            return;
          }
          if (
            e.pointerType !== 'touch' &&
            lens &&
            !inspecting &&
            phase === 'challenge'
          ) {
            const r = e.currentTarget.getBoundingClientRect();
            setPointer({ x: e.clientX - r.left, y: e.clientY - r.top });
          }
        }}
        onPointerLeave={() => {
          setPointer(null);
          setHovered(null);
        }}
      >
        <ClassroomBoundary>
          <GaussWorld
            selected={selected}
            onInspect={inspect}
            onHover={setHovered}
            reset={reset}
            phase={phase}
            input={input}
            onNearby={setNearby}
          />
        </ClassroomBoundary>
        <div className="gauss-scene-caption">
          <span className="gauss-live-dot" /> THE SCHOOLROOM
          <span>Drag to orbit · Scroll to look closer</span>
        </div>
        <output className="gauss-phase-card" aria-live="polite">
          <span>
            {phase === 'recess'
              ? '01 · BEFORE THE LESSON'
              : phase === 'settling'
                ? '02 · BACK TO YOUR PLACES'
                : '03 · THE ARITHMETIC CHALLENGE'}
          </span>
          <p>
            {phase === 'recess'
              ? 'Paper wings, restless feet. The teacher is waiting.'
              : phase === 'settling'
                ? 'The children return to their desks…'
                : 'Find the sum from 1 to 100. Walk over and inspect a slate.'}
          </p>
        </output>
        <div className="gauss-explorer-controls">
          <MovementJoystick
            input={input}
            disabled={inspecting || phase === 'settling'}
          />
        </div>
        {studentsOpen && (
          <div
            ref={studentPicker}
            className="gauss-student-picker"
            aria-label="Choose a student to inspect"
          >
            <p>Whose work will you inspect?</p>{' '}
            <div className="gauss-student-buttons">
              {students.map((s, i) => (
                <button
                  key={s.name}
                  disabled={phase !== 'challenge'}
                  aria-pressed={selected === i}
                  onClick={() => inspect(i)}
                >
                  <span aria-hidden="true" style={{ background: s.coat }}>
                    {s.name.charAt(0)}
                  </span>
                  {s.name === 'Carl Friedrich Gauss' ? 'Young Gauss' : s.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <nav className="gauss-tools" aria-label="Classroom actions">
          <button
            title={
              phase === 'settling'
                ? 'The class is returning to its desks'
                : 'Call the class to order'
            }
            aria-label="Call the class to order"
            disabled={phase !== 'recess'}
            onClick={() => setPhase('settling')}
          >
            <BellRing size={20} />
          </button>

          <button
            title={
              nearby === null
                ? 'Walk closer to a slate to inspect it'
                : `Inspect ${students[nearby].name}’s slate`
            }
            aria-label={
              nearby === null
                ? 'Inspect a nearby slate'
                : `Inspect ${students[nearby].name}’s slate`
            }
            disabled={phase !== 'challenge' || nearby === null}
            onClick={() => {
              if (nearby !== null) inspect(nearby);
            }}
          >
            <ScanSearch size={20} />
          </button>
          <button
            ref={lastSelection}
            title="Choose a student"
            aria-label="Choose a student"
            aria-expanded={studentsOpen}
            disabled={phase !== 'challenge'}
            onClick={() => setStudentsOpen(!studentsOpen)}
          >
            <Users size={20} />
          </button>
        </nav>
        {phase === 'challenge' && lens && pointer && !inspecting && (
          <div
            className={`gauss-lens ${hovered !== null ? 'has-work' : ''}`}
            style={{ left: pointer.x, top: pointer.y }}
            aria-hidden="true"
          >
            {hovered !== null ? (
              <>
                <span>
                  {students[hovered].name === 'Carl Friedrich Gauss'
                    ? 'C. F. Gauss'
                    : students[hovered].name}
                </span>
                <HandwrittenSlate index={hovered} preview />
                <small>Click to inspect the slate</small>
              </>
            ) : (
              <>
                <Search size={30} />
                <small>Find a student’s slate</small>
              </>
            )}
          </div>
        )}
        {inspecting && (
          <aside
            className="gauss-inspector"
            aria-label={journal ? 'Field notes' : `${student?.name}’s work`}
          >
            <button
              className="gauss-close"
              ref={close}
              aria-label="Close inspection"
              onClick={() => {
                setSelected(null);
                setJournal(false);
              }}
            >
              <X size={19} />
            </button>
            <p className="gauss-eyebrow">
              {journal
                ? 'THE IDEA BEHIND THE STORY'
                : 'THROUGH THE LOOKING GLASS'}
            </p>
            <h2>{journal ? 'A shortcut you can prove.' : student?.name}</h2>
            {student && (
              <>
                <p>{student.note}</p>
                <div className="gauss-slate">
                  <span>ARITHMETIC · PERSONAL SLATE</span>
                  <HandwrittenSlate index={selected!} />
                </div>
              </>
            )}
            {(journal || student?.method === 'pairs') && (
              <div className="gauss-discovery">
                <h3>Pair the ends. Find the pattern.</h3>
                <p>
                  The smallest and largest numbers make the same total as the
                  next two. No number is used twice.
                </p>
                <label htmlFor="gauss-count">
                  Try a different last number <strong>{n}</strong>
                </label>
                <input
                  id="gauss-count"
                  type="range"
                  min="1"
                  max="100"
                  value={n}
                  onChange={(e) => {
                    setN(Number(e.target.value));
                    setPairIndex(0);
                  }}
                />
                {pair ? (
                  <>
                    <div className="gauss-pair">
                      <span>{pair[0]}</span>
                      <b>+</b>
                      <span>{pair[1]}</span>
                      <b>=</b>
                      <strong>{n + 1}</strong>
                    </div>
                    <label htmlFor="gauss-pair">
                      Inspect pair {Math.min(pairIndex + 1, pairs.length)} of{' '}
                      {pairs.length}
                    </label>
                    <input
                      id="gauss-pair"
                      type="range"
                      min="0"
                      max={pairs.length - 1}
                      value={Math.min(pairIndex, pairs.length - 1)}
                      onChange={(e) => setPairIndex(Number(e.target.value))}
                    />
                  </>
                ) : (
                  <p>There is no pair when there is just one number.</p>
                )}
                {n % 2 === 1 && (
                  <p className="gauss-middle">
                    An odd number of terms leaves <strong>{(n + 1) / 2}</strong>{' '}
                    in the middle. Count it once.
                  </p>
                )}
                <div className="gauss-result">
                  {pairs.length} × {n + 1}
                  {n % 2 ? ` + ${(n + 1) / 2}` : ''} ={' '}
                  <strong>{pairedSum(n).toLocaleString('en-US')}</strong>
                </div>
                <p className="gauss-formula">
                  For any positive whole number n:{' '}
                  <strong>1 + 2 + … + n = n(n + 1) / 2</strong>
                </p>
              </div>
            )}
            {journal && (
              <div className="gauss-history">
                <h3>A famous story, carefully told.</h3>
                <p>
                  Gauss was a schoolboy in Braunschweig in the 1780s. Wolfgang
                  Sartorius von Waltershausen’s 1856 biography tells of his
                  remarkable speed at an arithmetic exercise, decades after the
                  event. The familiar “1 to 100” task and pairing explanation
                  are later versions of the anecdote.
                </p>
                <p>
                  This classroom, its teacher, classmates, and their slates are
                  an illustrative reconstruction. The pairing proof is exact;
                  the scene is not an eyewitness record.
                </p>
                <a
                  href="https://mathshistory.st-andrews.ac.uk/Biographies/Gauss/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the MacTutor biography ↗
                </a>
              </div>
            )}
            {student && (
              <nav
                className="gauss-slate-nav"
                aria-label="Inspect another student"
              >
                <button
                  onClick={() =>
                    inspect((selected! + students.length - 1) % students.length)
                  }
                >
                  ← Previous slate
                </button>
                <button
                  onClick={() => inspect((selected! + 1) % students.length)}
                >
                  Next slate →
                </button>
              </nav>
            )}
          </aside>
        )}
      </section>
      <section
        className="gauss-roster"
        aria-label="Choose a student to inspect"
      >
        <div>
          <Search size={20} />
          <p>
            <strong>Every slate tells a story.</strong>
            <span>
              Walk with WASD, arrows, or the joystick. Use the icons to inspect
              a slate.
            </span>
          </p>
        </div>
      </section>
      <footer className="gauss-footer">
        <span>Different paths to the same sum. What makes one easier?</span>
        <span>Historical idea · Illustrative reconstruction</span>
      </footer>
    </main>
  );
}
