import TallyMarquee from './assets/TallyMarquee';
import MovementJoystick from './assets/MovementJoystick';
import type { MovementInput } from '../game/movement';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Component,
  type ReactNode,
} from 'react';
import {
  RotateCcw,
  Map,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  X,
  Footprints,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/ui/tabs';
import Konigsberg, { type Journey } from './Konigsberg';
import {
  bridges,
  regions,
  availableBridges,
  cross,
  degree,
  type Region,
  type Point,
} from '../game/world';
import { useSoundPreference } from '../game/sound';
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
        The 3D world could not start. Enable browser graphics acceleration and
        reload. You can still explore the bridge challenge using the route
        buttons.
      </div>
    ) : (
      this.props.children
    );
  }
}
function Graph({
  at,
  used,
  onCross,
}: {
  at: Region;
  used: number[];
  onCross: (id: number) => void;
}) {
  const pos: Record<Region, [number, number]> = {
    north: [190, 65],
    south: [190, 255],
    island: [95, 160],
    east: [320, 160],
  };
  return (
    <svg
      viewBox="0 0 400 320"
      role="img"
      aria-label="Four land regions connected by seven bridges"
    >
      <title>The Königsberg graph</title>
      {bridges.map((b) => {
        const a = pos[b.from],
          c = pos[b.to];
        const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        const offset = b.id < 5 ? (b.id < 3 ? -48 : 48) : 0;
        return (
          <g key={b.id} onClick={() => onCross(b.id)} className="graph-edge">
            <path
              d={`M${a} Q${mid[0] + offset},${mid[1]} ${c}`}
              stroke={used.includes(b.id) ? '#d8ad68' : '#8cb0b2'}
              fill="none"
              strokeWidth="4"
            />
            <text
              x={mid[0] + offset * 0.5}
              y={mid[1] - 7}
              fill="#e9d6b0"
              fontSize="18"
            >
              {b.id}
            </text>
          </g>
        );
      })}
      {Object.entries(pos).map(([r, p]) => (
        <g key={r}>
          <circle
            cx={p[0]}
            cy={p[1]}
            r="23"
            fill={at === r ? '#dfba79' : '#294952'}
            stroke="#c5d2ca"
          />
          <text
            x={p[0]}
            y={p[1] + 5}
            textAnchor="middle"
            fill={at === r ? '#17333d' : '#f4e9d1'}
            fontSize="20"
          >
            {degree(r as Region)}
          </text>
          <text
            x={r === 'island' ? 70 : p[0]}
            y={r === 'north' ? 24 : r === 'south' ? 303 : r === 'island' ? 154 : 205}
            textAnchor={r === 'island' ? 'end' : 'middle'}
            fill="#d3dfd6"
            fontSize="16"
          >
            {r === 'island' ? (
              <><tspan x="70">Kneiphof</tspan><tspan x="70" dy="16">island</tspan></>
            ) : regions[r as Region].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function TallyMarks({ count }: { count: number }) {
  if (count === 0) {
    return <span className="tally-marks" aria-hidden="true" />;
  }

  return (
    <span className="tally-marks" aria-hidden="true">
      {Array.from({ length: Math.ceil(count / 5) }, (_, groupIndex) => {
        const marks = Math.min(5, count - groupIndex * 5);
        return (
          <span className="tally-group" key={groupIndex}>
            {Array.from({ length: Math.min(4, marks) }, (_, markIndex) => (
              <i key={markIndex} />
            ))}
            {marks === 5 && <b />}
          </span>
        );
      })}
    </span>
  );
}

export default function KonigsbergExperience() {
  const [soundEnabled, setSoundEnabled] = useSoundPreference();
  const [start, setStart] = useState<Region>('south');
  const [draftStart, setDraftStart] = useState<Region>('south');
  const startDialog = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState<Region>('south');
  const [used, setUsed] = useState<number[]>([]);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState(
    'Select a bridge below. Return crossings are counted too.',
  );
  const [panel, setPanel] = useState('problem');
  const [panelOpen, setPanelOpen] = useState(false);
  const learnDialog = useRef<HTMLDialogElement>(null);
  const [compactView, setCompactView] = useState(() => window.matchMedia('(max-width: 850px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 850px)');
    const update = () => setCompactView(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const graph = panelOpen && panel === 'graph';
  function showPanel(value: string) {
    setPanel(value);
    setPanelOpen(true);
  }
  useEffect(() => {
    const dialog = learnDialog.current;
    if (!dialog || !panelOpen) return;
    // Use a modal on phones, but leave the desktop scene interactive.
    if (dialog.open && dialog.matches(':modal') !== compactView) dialog.close();
    if (!dialog.open) {
      if (compactView) dialog.showModal();
      else dialog.show();
    }
    if (!compactView) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [panelOpen, compactView]);
  const [resetKey, setResetKey] = useState(0);
  const [journey, setJourney] = useState<Journey>({
    points: [regions.south.position],
    key: 0,
  });
  const [history, setHistory] = useState<{ at: Region; used: number[] }[]>([]);
  const playerPosition = useRef<Point>(regions.south.position);
  const input = useRef<MovementInput>({ x: 0, z: 0 });
  const [choosingStart, setChoosingStart] = useState(false);
  const available = availableBridges(at, used);
  const explored = new Set(used).size === 7;
  const pendingCrossing = useRef<ReturnType<typeof cross>>(null);
  const onCross = useCallback(
    (id: number) => {
      if (moving) return;
      const result = cross(at, used, id);
      if (!result) {
        setMessage(
          'That bridge is on another bank. Choose a bridge connected to your current location.',
        );
        return;
      }
      const b = bridges.find((b) => b.id === id)!;
      const forward = b.from === at;
      setHistory((h) => [...h, { at, used }]);
      setMoving(true);
      setJourney((j) => ({
        points: [
          playerPosition.current,
          forward ? b.a : b.b,
          forward ? b.b : b.a,
          regions[result.at].position,
        ],
        key: j.key + 1,
      }));
      pendingCrossing.current = result;
      setMessage(`Crossing ${b.name}…`);
    },
    [at, used, moving],
  );
  const onManualCross = useCallback(
    (id: number) => {
      const result = cross(at, used, id);
      if (!result) return;
      setHistory((h) => [...h, { at, used }]);
      setAt(result.at);
      setUsed(result.used);
      setMessage(
        `You crossed ${bridges.find((b) => b.id === id)!.name}. ${result.used.length} crossings · ${new Set(result.used).size} of 7 bridges visited.`,
      );
    },
    [at, used],
  );
  const onArrive = useCallback(() => {
    const result = pendingCrossing.current;
    pendingCrossing.current = null;
    setMoving(false);
    if (result) {
      setAt(result.at);
      setUsed(result.used);
      setMessage(
        `You reached ${regions[result.at].name.toLowerCase()}. ${result.used.length} crossings · ${new Set(result.used).size} of 7 bridges visited.`,
      );
    }
  }, []);
  function chooseStart() {
    setChoosingStart(true);
    setDraftStart(start);
    input.current = { x: 0, z: 0 };
    startDialog.current?.showModal();
  }
  function restart(origin: Region = start) {
    pendingCrossing.current = null;
    setResetKey((key) => key + 1);
    setStart(origin);
    setAt(origin);
    setUsed([]);
    setHistory([]);
    setMoving(false);
    input.current = { x: 0, z: 0 };
    playerPosition.current = regions[origin].position;
    setJourney((j) => ({ points: [regions[origin].position], key: j.key + 1 }));
    setMessage(
      `A fresh walk from ${regions[origin].name.toLowerCase()}. Every crossing counts, including return trips.`,
    );
  }
  function undo() {
    const prev = history.at(-1);
    if (!prev || moving) return;
    setAt(prev.at);
    setUsed(prev.used);
    setHistory((h) => h.slice(0, -1));
    setJourney((j) => ({
      points: [regions[prev.at].position],
      key: j.key + 1,
    }));
    setMessage('One step back. Try another bridge.');
  }
  const toolState = useRef({ at, used, moving, connectionsVisible: graph });
  toolState.current = { at, used, moving, connectionsVisible: graph };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: unknown,
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'read_bridge_walk',
        description:
          'Read the current bank, crossed bridges and available next crossings.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          ...toolState.current,
          available: availableBridges(
            toolState.current.at,
            toolState.current.used,
          ).map((b) => ({ id: b.id, name: b.name })),
        }),
      },
      {
        name: 'show_bridge_connections',
        description:
          'Open the mathematical connections overlay in the visible game.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          if (
            input === null ||
            typeof input !== 'object' ||
            Object.keys(input).length
          )
            throw new Error('Expected an empty object');
          showPanel('graph');
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return { connectionsVisible: true };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  return (
    <main className="game">
      <dialog ref={startDialog} className="start-dialog" aria-labelledby="start-title" onClose={() => setChoosingStart(false)}>
        <form onSubmit={(event) => {
          event.preventDefault();
          restart(draftStart);
          startDialog.current?.close();
        }}>
          <h2 id="start-title">Where will you begin?</h2>
          <p>Choose a land region for your next attempt. You can walk freely from there.</p>
          <fieldset className="start-regions">
            <legend>Starting point</legend>
            {(Object.keys(regions) as Region[]).map((region) => (
              <label key={region}>
                <input type="radio" name="start" value={region}
                  checked={draftStart === region}
                  onChange={() => setDraftStart(region)} />
                <span>{regions[region].name}</span>
              </label>
            ))}
          </fieldset>
          <p className="start-reset-note">Starting a new walk clears your crossings and undo history.</p>
          <div className="walk-actions">
            <button type="button" onClick={() => startDialog.current?.close()}>Cancel</button>
            <button type="submit"><MapPin size={15} /> Start here</button>
          </div>
        </form>
      </dialog>
      <header className="topbar">
            <a className="brand" href={import.meta.env.BASE_URL} aria-label="MiniMundos — all worlds">MiniMundos</a>
            <div className="topbar-actions">
              <button className="compact-control" onClick={chooseStart} aria-label="New walk — choose starting point" title="New walk">
                <RotateCcw size={18} /><span>New walk</span>
              </button>
              <button className="compact-control visibility-control" onClick={() => setLabelsVisible((visible) => !visible)}
                aria-label={labelsVisible ? 'Hide title and bridge numbers' : 'Show title and bridge numbers'}
                aria-pressed={!labelsVisible} title={labelsVisible ? 'Hide title and bridge numbers' : 'Show title and bridge numbers'}>
                {labelsVisible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
              <button
                className="compact-control sound-control"
                onClick={() => setSoundEnabled(!soundEnabled)}
                aria-label={soundEnabled ? 'Mute walking sounds' : 'Turn on walking sounds'}
                aria-pressed={soundEnabled}
                title={soundEnabled ? 'Sound on' : 'Sound off'}
              >
                {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
            <button
              className="learn-button"
              aria-label="Learn about the seven bridges"
              aria-controls="scene-information"
              aria-expanded={panelOpen}
              aria-haspopup="dialog"
              onClick={() => showPanel('problem')}
            >
              <BookOpen size={20} aria-hidden="true" />
              <span>Learn</span>
            </button>
            </div>
          </header>
          <section
            className={`scene-title${labelsVisible ? "" : " scene-title-hidden"}`}
            aria-label="The seven bridges of Königsberg"
          >
            <h1>
              The seven bridges
              <br />
              of Königsberg
            </h1>
            <p className="scene-instruction">
              <span>Walk across all bridges</span>
              <span>without repeating.</span>
            </p>
          </section>
      <div className="world">
        <SceneBoundary>
          <Konigsberg
            at={at}
            used={used}
            onCross={onCross}
            journey={journey}
            onArrive={onArrive}
            resetKey={resetKey}
            zoomStep={0}
            onManualCross={onManualCross}
            playerPosition={playerPosition}
            input={input}
            paused={choosingStart || (panelOpen && compactView)}
            labelsVisible={labelsVisible}
            soundEnabled={soundEnabled}
          />
        </SceneBoundary>
        <MovementJoystick input={input} disabled={moving || choosingStart || (panelOpen && compactView)} />
          <TallyMarquee>
              {bridges.map((bridge) => {
                const count = used.filter((id) => id === bridge.id).length;
                return (
                  <li
                    key={bridge.id}
                    title={`${bridge.name}: ${count} crossings`}
                    aria-label={`${bridge.name}: ${count} ${count === 1 ? 'crossing' : 'crossings'}`}
                  >
                    <span className="tally-bridge-number">{bridge.id}</span>
                    <span className="tally-bridge-name">{bridge.name}</span>
                    <TallyMarks count={count} />
                  </li>
                );
              })}
          </TallyMarquee>
      </div>
          <dialog
            ref={learnDialog}
            className="learn-dialog"
            id="scene-information"
            aria-labelledby="learn-title"
            onClose={() => { if (!learnDialog.current?.open) setPanelOpen(false); }}
          >
            <header className="learn-dialog-header">
              <h2 id="learn-title"><BookOpen size={22} aria-hidden="true" /> Explore the problem</h2>
              <button className="learn-close" aria-label="Close learning panel" onClick={() => learnDialog.current?.close()}>
                <X size={22} aria-hidden="true" />
              </button>
            </header>
            {panelOpen && (
              <Tabs
                id="scene-panel"
                value={panel}
                onValueChange={(v) => setPanel(String(v))}
              >
                <TabsList
                  className="scene-tabs"
                  aria-label="Explore the problem"
                >
                  <TabsTrigger value="problem">
                    <Footprints size={15} /> Problem
                  </TabsTrigger>
                  <TabsTrigger value="graph">
                    <Map size={15} /> Graph
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <BookOpen size={15} /> Notes
                  </TabsTrigger>
                </TabsList>
                <div className="panel-scroll">
                  <TabsContent value="problem" className="challenge">
                    <h2>Can you cross each bridge exactly once?</h2>
                    <p>
                      Explore the seven bridges connecting four land regions.
                      Choose a bridge to cross, or walk through the city.
                    </p>
                    <section className="historical-note" aria-labelledby="problem-origins">
                      <h3 id="problem-origins">Historical origins</h3>
                      <p>
                        In eighteenth-century Königsberg (today Kaliningrad),
                        seven bridges spanned the River Pregel, connecting two
                        islands and the riverbanks. The puzzle asked whether a
                        single walk could cross every bridge exactly once.
                      </p>
                      <p>
                        Leonhard Euler studied the puzzle in the 1730s. By
                        focusing on how the land regions were connected, rather
                        than distances or shapes, he proved that such a walk was
                        impossible. His work helped establish graph theory.
                      </p>
                      <p>
                        This scene preserves the historical bridge connections;
                        its buildings, landscape, and costumes are illustrative.
                      </p>
                      <a
                        href="https://mathshistory.st-andrews.ac.uk/HistTopics/Topology_in_mathematics/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explore the history at MacTutor ↗
                      </a>
                    </section>
                    <div className="progress-heading">
                      <span>Crossings</span>
                      <strong>{used.length}</strong>
                    </div>
                    <p>
                      {new Set(used).size} of 7 visited ·{' '}
                      {used.length - new Set(used).size} repeats
                    </p>
                    <div className="bridge-progress">
                      {bridges.map((b) => (
                        <span
                          key={b.id}
                          className={used.includes(b.id) ? 'done' : ''}
                          title={`${b.name}: ${used.filter((id) => id === b.id).length} crossings`}
                          aria-label={`Bridge ${b.id}: ${used.filter((id) => id === b.id).length} crossings`}
                        >
                          {b.id}×{used.filter((id) => id === b.id).length}
                        </span>
                      ))}
                    </div>
                    <div className="location">
                      <span className="location-dot" />
                      <span>{regions[at].name}</span>
                      <small>{moving ? 'Walking…' : 'You are here'}</small>
                    </div>
                    <p className="status" aria-live="polite">
                      {message}
                    </p>
                    <div className="route-options">
                      {available.map((b) => (
                        <button
                          key={b.id}
                          disabled={moving}
                          onClick={() => onCross(b.id)}
                        >
                          <span className="route-number">{b.id}</span>
                          {b.name}
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </div>
                    {explored && !moving && (
                      <button
                        className="primary-button"
                        onClick={() => {
                          showPanel('notes');
                        }}
                      >
                        Explain the result <ArrowUpRight size={16} />
                      </button>
                    )}
                    <div className="walk-actions">
                      <button
                        onClick={undo}
                        disabled={!history.length || moving}
                      >
                        Undo crossing
                      </button>
                      <button onClick={() => restart()}>
                        <RotateCcw size={14} /> New walk
                      </button>
                    </div>
                  </TabsContent>
                  <TabsContent value="graph" className="graph-panel">
                    <h2>The bridge graph</h2>
                    <Graph at={at} used={used} onCross={onCross} />
                    <p>
                      Each point represents a land region; each line represents
                      a bridge. The number at each point counts its connections.
                    </p>
                    <p className="graph-hint">
                      Select a line to cross its bridge.
                    </p>
                  </TabsContent>
                  <TabsContent value="notes" className="journal">
                    <h2>Why the route is impossible</h2>
                    <p>
                      Every time you enter a piece of land and leave it, you use
                      a pair of bridges.
                    </p>
                    <p>
                      Only the start and finish can have an unpaired crossing.
                      So a walk using every bridge once can have{' '}
                      <strong>
                        at most two places with an odd number of connections.
                      </strong>
                    </p>
                    <div className="degree-grid">
                      {Object.keys(regions).map((r) => (
                        <div key={r}>
                          <strong>{degree(r as Region)}</strong>
                          <span>{regions[r as Region].name}</span>
                        </div>
                      ))}
                    </div>
                    <p>
                      Königsberg has four. No choice of starting point can make
                      the seven-bridge walk work.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => {
                        showPanel('graph');
                      }}
                    >
                      See the mathematical map <ArrowUpRight size={17} />
                    </button>
                    <h3>Try a different starting point</h3>
                    <div className="start-options">
                      <button onClick={chooseStart}>Choose a starting point</button>
                    </div>
                    <div className="historical-note">
                      <strong>Historical context</strong>
                      <p>
                        Euler’s work on this problem laid foundations for graph
                        theory. This miniature preserves the seven-bridge
                        connections; its buildings, landscape, and costumes are
                        illustrative.
                      </p>
                      <a
                        href="https://mathshistory.st-andrews.ac.uk/Extras/Konigsberg/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read the historical account ↗
                      </a>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </dialog>
    </main>
  );
}
