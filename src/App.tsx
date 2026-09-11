import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Component,
  type ReactNode,
} from 'react';
import {
  Compass,
  RotateCcw,
  Map,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Footprints,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { sceneRegistry } from './scenes/registry';
import Konigsberg, { type Journey } from './scenes/Konigsberg';
import {
  bridges,
  regions,
  availableBridges,
  cross,
  degree,
  type Region,
  type Point,
} from './game/world';
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
    north: [115, 45],
    south: [115, 235],
    island: [65, 140],
    east: [250, 140],
  };
  return (
    <svg
      viewBox="0 0 330 280"
      role="img"
      aria-label="Four land regions connected by seven bridges"
    >
      <title>The Königsberg graph</title>
      {bridges.map((b) => {
        const a = pos[b.from],
          c = pos[b.to];
        const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        const offset = b.id < 5 ? (b.id < 3 ? -30 : 30) : 0;
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
              fontSize="14"
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
            fontSize="16"
          >
            {degree(r as Region)}
          </text>
          <text
            x={p[0]}
            y={p[1] + 42}
            textAnchor="middle"
            fill="#d3dfd6"
            fontSize="13"
          >
            {regions[r as Region].name}
          </text>
        </g>
      ))}
    </svg>
  );
}
export default function App() {
  const [at, setAt] = useState<Region>('south');
  const [used, setUsed] = useState<number[]>([]);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState(
    'Walk with WASD or arrow keys, or click a bridge. Return trips are allowed and every crossing counts.',
  );
  const [panel, setPanel] = useState('problem');
  const [panelOpen, setPanelOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [interfaceVisible, setInterfaceVisible] = useState(true);
  const graph = interfaceVisible && panelOpen && panel === 'graph';
  function showPanel(value: string) {
    setPanel(value);
    setPanelOpen(true);
    setInterfaceVisible(true);
  }
  const [resetKey, setResetKey] = useState(0);
  const [zoomStep, setZoomStep] = useState(0);
  const [journey, setJourney] = useState<Journey>({
    points: [regions.south.position],
    key: 0,
  });
  const [history, setHistory] = useState<{ at: Region; used: number[] }[]>([]);
  const playerPosition = useRef<Point>(regions.south.position);
  const input = useRef({ x: 0, z: 0 });
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
  function restart(start: Region = 'south') {
    pendingCrossing.current = null;
    setAt(start);
    setUsed([]);
    setHistory([]);
    setMoving(false);
    setJourney((j) => ({ points: [regions[start].position], key: j.key + 1 }));
    setMessage(
      `A fresh walk from ${regions[start].name.toLowerCase()}. Every crossing counts, including return trips.`,
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
      <div className="world">
        <SceneBoundary>
          <Konigsberg
            at={at}
            used={used}
            onCross={onCross}
            journey={journey}
            onArrive={onArrive}
            resetKey={resetKey}
            zoomStep={zoomStep}
            onManualCross={onManualCross}
            playerPosition={playerPosition}
            input={input}
            paused={false}
          />
        </SceneBoundary>
      </div>
      <button className="interface-toggle" onClick={() => setInterfaceVisible((v) => !v)}
        aria-label={interfaceVisible ? 'Hide interface' : 'Show interface'}
        title={interfaceVisible ? 'Hide interface' : 'Show interface'} aria-pressed={!interfaceVisible}>
        {interfaceVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      {interfaceVisible && <>
      <header className="topbar">
        <span className="brand"><Compass size={22} /> MINIMUNDOS</span>
        <span className="scene-name">{sceneRegistry[0].title}</span>
      </header>
      <aside className={`explorer ${panelOpen ? '' : 'collapsed'}`} aria-label="Scene information">
        <button className="explorer-heading" onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen} aria-controls="scene-panel" title={panelOpen ? 'Collapse panel' : 'Expand panel'}>
          <span>Königsberg <small>Seven bridges</small></span>
          <ChevronDown size={17} className={panelOpen ? 'expanded' : ''} />
        </button>
        {panelOpen && <Tabs id="scene-panel" value={panel} onValueChange={(v) => setPanel(String(v))}>
          <TabsList className="scene-tabs" aria-label="Explore the problem">
            <TabsTrigger value="problem"><Footprints size={15} /> Problem</TabsTrigger>
            <TabsTrigger value="graph"><Map size={15} /> Graph</TabsTrigger>
            <TabsTrigger value="notes"><BookOpen size={15} /> Notes</TabsTrigger>
          </TabsList>
          <div className="panel-scroll">
          <TabsContent value="problem" className="challenge">
        <h1>Can you cross each bridge exactly once?</h1>
        <p>Explore the seven bridges connecting four land regions. Choose a bridge to cross, or walk through the city.</p>
        <div className="progress-heading">
          <span>Crossings</span>
          <strong>{used.length}</strong>
        </div>
        <p>
          {new Set(used).size} of 7 visited · {used.length - new Set(used).size} repeats
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
            <button key={b.id} disabled={moving} onClick={() => onCross(b.id)}>
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
          <button onClick={undo} disabled={!history.length || moving}>
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
            <p>Each point represents a land region; each line represents a bridge. The number at each point counts its connections.</p>
            <p className="graph-hint">Select a line to cross its bridge.</p>
          </TabsContent>
          <TabsContent value="notes" className="journal">
          <h2>Why the route is impossible</h2>
          <p>
            Every time you enter a piece of land and leave it, you use a pair of
            bridges.
          </p>
          <p>
            Only the start and finish can have an unpaired crossing. So a walk
            using every bridge once can have{' '}
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
            Königsberg has four. No choice of starting point can make the
            seven-bridge walk work.
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
            {Object.keys(regions).map((r) => (
              <button
                key={r}
                onClick={() => {
                  restart(r as Region);
    
                }}
              >
                {regions[r as Region].name}
              </button>
            ))}
          </div>
          <div className="historical-note">
            <strong>A note from the archive</strong>
            <p>
              Euler’s work on this problem laid foundations for graph theory.
              This miniature preserves the seven-bridge connections; its
              buildings, landscape, and costumes are illustrative.
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
        </Tabs>}
      </aside>
      <div className="control-dock">
        {controlsOpen && <section id="movement-controls" className="movement-controls" aria-label="Movement and camera help">
          <div><strong>Walk</strong><p>WASD or arrow keys · Shift to run</p></div>
      <div className="walking-pad" aria-label="Walking controls">
        {[
          { label: 'Walk forward', x: 0, z: -1, icon: ArrowUp },
          { label: 'Walk left', x: -1, z: 0, icon: ArrowLeft },
          { label: 'Walk backward', x: 0, z: 1, icon: ArrowDown },
          { label: 'Walk right', x: 1, z: 0, icon: ArrowRight },
        ].map((d) => (
          <button
            key={d.label}
            aria-label={d.label}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              input.current = { x: d.x, z: d.z };
            }}
            onPointerUp={() => (input.current = { x: 0, z: 0 })}
            onPointerCancel={() => (input.current = { x: 0, z: 0 })}
            onLostPointerCapture={() => (input.current = { x: 0, z: 0 })}
          >
            <d.icon size={17} />
          </button>
        ))}
      </div>
          <div className="camera-help"><strong>Camera</strong><p>Drag to orbit · Right-drag to pan<br />Scroll or pinch to zoom</p></div>
        </section>}
        <div className="world-controls" role="toolbar" aria-label="Scene controls">
          <button onClick={() => { setControlsOpen((v) => !v); input.current = { x: 0, z: 0 }; }}
            aria-expanded={controlsOpen} aria-controls="movement-controls" title="Movement and camera help" className={controlsOpen ? 'selected' : ''}>
            <SlidersHorizontal size={18} /><span>Controls</span>
          </button>
          <span className="control-divider" />
          <button onClick={() => setZoomStep((k) => k - 1)} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
          <button onClick={() => setZoomStep((k) => k + 1)} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
          <button onClick={() => setResetKey((k) => k + 1)} aria-label="Reset camera" title="Reset camera"><RotateCcw size={17} /></button>
        </div>
      </div>
      </>}
    </main>
  );
}
