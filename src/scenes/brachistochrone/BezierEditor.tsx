import { useRef, type PointerEvent } from 'react';
import { Minus, Plus, SlidersHorizontal } from 'lucide-react';
import type { CurvePoint } from './curveMath';
import { resizeAnchors, sampleBezierSpline, sampleCurve } from './curveMath';

const WIDTH = 320;
const HEIGHT = 190;
const PAD = 16;
/** The rig's run over its drop, so the reference curve matches the lane. */
const ASPECT = 2;

export default function BezierEditor({
  anchors,
  onChange,
  open,
  onToggle,
}: {
  anchors: CurvePoint[];
  onChange: (anchors: CurvePoint[]) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const dragging = useRef<number | null>(null);
  const points = sampleBezierSpline(anchors, 90);
  const toScreen = (point: CurvePoint) => ({
    x: PAD + point.x * (WIDTH - PAD * 2),
    y: PAD + point.y * (HEIGHT - PAD * 2),
  });
  const trace = (line: CurvePoint[]) =>
    line
      .map((point, index) => {
        const screen = toScreen(point);
        return `${index ? 'L' : 'M'}${screen.x.toFixed(1)} ${screen.y.toFixed(1)}`;
      })
      .join(' ');
  const reference = trace(sampleCurve('cycloid', anchors, 90, ASPECT));
  const path = trace(points);

  function move(event: PointerEvent<SVGSVGElement>) {
    const index = dragging.current;
    if (index === null || index === 0 || index === anchors.length - 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const next = anchors.map((point) => ({ ...point }));
    next[index] = {
      x: Math.max(
        next[index - 1].x + 0.04,
        Math.min(next[index + 1].x - 0.04, x),
      ),
      y: Math.max(0.035, Math.min(0.965, y)),
    };
    onChange(next);
  }

  return (
    <section
      className={`curve-editor ${open ? 'open' : 'collapsed'}`}
      aria-labelledby="curve-editor-title"
    >
      <button
        className="curve-editor-toggle"
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Collapse curve editor' : 'Open curve editor'}
        aria-expanded={open}
      >
        <SlidersHorizontal size={18} />
        <span>{open ? 'Close' : 'Tune'}</span>
      </button>
      <div className="curve-editor-heading">
        <div>
          <small>Experimental track</small>
          <h2 id="curve-editor-title">Shape the descent</h2>
        </div>
        <div
          className="point-stepper"
          aria-label={`${anchors.length} control points`}
        >
          <button
            type="button"
            aria-label="Remove a control point"
            disabled={anchors.length <= 3}
            onClick={() => onChange(resizeAnchors(anchors, anchors.length - 1))}
          >
            <Minus size={15} />
          </button>
          <strong>{anchors.length}</strong>
          <button
            type="button"
            aria-label="Add a control point"
            disabled={anchors.length >= 7}
            onClick={() => onChange(resizeAnchors(anchors, anchors.length + 1))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        onPointerMove={move}
        onPointerUp={(event) => {
          dragging.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
        aria-label="Editable Bézier track profile"
      >
        <defs>
          <pattern
            id="workbench-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".13"
            />
          </pattern>
        </defs>
        <rect
          width={WIDTH}
          height={HEIGHT}
          rx="12"
          fill="url(#workbench-grid)"
        />
        {/* The true brachistochrone, to draw against. */}
        <path d={reference} className="editor-reference" />
        <path d={path} className="editor-curve-shadow" />
        <path d={path} className="editor-curve" />
        {anchors.map((point, index) => {
          const screen = toScreen(point);
          const fixed = index === 0 || index === anchors.length - 1;
          return (
            <g key={index} transform={`translate(${screen.x} ${screen.y})`}>
              <circle
                r="11"
                className={fixed ? 'editor-point fixed' : 'editor-point'}
                tabIndex={fixed ? -1 : 0}
                role="slider"
                aria-label={
                  fixed
                    ? `${index ? 'Finish' : 'Start'} point, fixed`
                    : `Control point ${index + 1}`
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(point.y * 100)}
                onPointerDown={(event) => {
                  if (fixed) return;
                  dragging.current = index;
                  event.currentTarget.ownerSVGElement?.setPointerCapture(
                    event.pointerId,
                  );
                }}
              />
            </g>
          );
        })}
      </svg>
      <p>
        Drag the brass points. The wooden track changes as you draw. The dashed
        line is the true brachistochrone — try to beat it.
      </p>
    </section>
  );
}
