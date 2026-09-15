import { useRef, type PointerEvent } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { CurvePoint } from './curveMath';
import { defaultAnchors, resizeAnchors, sampleBezierSpline } from './curveMath';

const WIDTH = 320;
const HEIGHT = 190;
const PAD = 16;
export default function BezierEditor({
  anchors,
  onChange,
  open,
  onToggle,
  disabled = false,
}: {
  anchors: CurvePoint[];
  onChange: (anchors: CurvePoint[]) => void;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
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
  const path = trace(points);

  function move(event: PointerEvent<SVGSVGElement>) {
    const index = dragging.current;
    if (disabled || index === null || index === 0 || index === anchors.length - 1) return;
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      transform.inverse(),
    );
    const x = (position.x - PAD) / (WIDTH - PAD * 2);
    const y = (position.y - PAD) / (HEIGHT - PAD * 2);
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

  if (!open) return null;

  return (
    <section
      id="curve-editor"
      className="curve-editor"
      aria-labelledby="curve-editor-title"
    >
      <button
        className="curve-editor-close"
        type="button"
        onClick={onToggle}
        aria-label="Close curve editor"
      >
        <X size={18} />
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
            disabled={disabled || anchors.length <= 3}
            onClick={() => onChange(resizeAnchors(anchors, anchors.length - 1))}
          >
            <Minus size={15} />
          </button>
          <strong>{anchors.length}</strong>
          <button
            type="button"
            aria-label="Add a control point"
            disabled={disabled || anchors.length >= 7}
            onClick={() => onChange(resizeAnchors(anchors, anchors.length + 1))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <svg
        preserveAspectRatio="xMidYMid meet"
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
                  if (fixed || disabled) return;
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
      <button
        className="curve-editor-reset"
        type="button"
        onClick={() => onChange(defaultAnchors(anchors.length))}
        title="Restore a straight ramp"
        disabled={disabled}
      >
        <RotateCcw size={15} /> Reset curve
      </button>
      <p>
        {disabled ? 'Wait for the carts to return before reshaping the track.' :
          'Drag the brass points. Your coral track changes as you draw. Experiment, then release the carts.'}
      </p>
    </section>
  );
}
