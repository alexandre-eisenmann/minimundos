import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';

/** Scroll a duplicate visual copy so the end joins the beginning without a jump. */
export default function TallyMarquee({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const original = useRef<HTMLOListElement>(null);
  const cycle = useRef(0);
  const interacting = useRef(false);
  const hovering = useRef(false);
  const focused = useRef(false);
  const resumeAt = useRef(0);
  const [overflow, setOverflow] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !original.current) return;
      cycle.current = original.current.getBoundingClientRect().width;
      const needsScroll = cycle.current > viewport.current.clientWidth + 1;
      setOverflow(needsScroll);
      if (!needsScroll) viewport.current.scrollLeft = 0;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current!);
    observer.observe(original.current!);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!overflow || paused || reducedMotion) return;
    let frame = 0;
    let previous = 0;
    let fractional = 0;
    const tick = (now: number) => {
      const delta = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      const node = viewport.current;
      if (node && !document.hidden && !interacting.current && !hovering.current && !focused.current && now >= resumeAt.current) {
        fractional += delta * 0.022;
        const pixels = Math.floor(fractional);
        fractional -= pixels;
        if (pixels && cycle.current) node.scrollLeft = (node.scrollLeft + pixels) % cycle.current;
      }
      frame = requestAnimationFrame(tick);
    };
    resumeAt.current = performance.now() + 1800;
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [overflow, paused, reducedMotion]);
  useEffect(() => {
    const release = () => { interacting.current = false; resumeAt.current = performance.now() + 1800; };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, []);

  return <aside className="bridge-tallies" aria-label="Bridge crossing tallies">
    <div className="tally-viewport" ref={viewport} tabIndex={overflow ? 0 : -1}
      aria-label="Bridge numbers, names and tally marks. Swipe or use arrow keys to scroll."
      onKeyDown={(event) => event.stopPropagation()}
      onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') hovering.current = true; }}
      onPointerLeave={() => { hovering.current = false; }}
      onPointerDown={() => { interacting.current = true; }}
      onWheel={() => { resumeAt.current = performance.now() + 1800; }}>
      <div className="tally-track">
        <ol ref={original}>{children}</ol>
        {overflow && !reducedMotion && <ol aria-hidden="true">{children}</ol>}
      </div>
    </div>
    {overflow && !reducedMotion && <button className="tally-pause" onClick={() => setPaused((value) => !value)}
      aria-label={paused ? 'Resume tally scrolling' : 'Pause tally scrolling'} title={paused ? 'Resume tally scrolling' : 'Pause tally scrolling'}>
      {paused ? <Play size={12} /> : <Pause size={12} />}
    </button>}
  </aside>;
}
