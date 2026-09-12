import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react';
import { analogInput, keyboardInput, type MovementInput } from '../../game/movement';

export default function MovementJoystick({ input, disabled }: {
  input: MutableRefObject<MovementInput>;
  disabled: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const keys = useRef(new Set<string>());
  const [thumb, setThumb] = useState({ x: 0, z: 0 });
  const publish = (value: MovementInput) => {
    input.current = value;
    setThumb({ x: value.x, z: value.z });
  };
  useEffect(() => {
    const clear = () => {
      keys.current.clear();
      const id = pointer.current;
      pointer.current = null;
      if (id !== null && surface.current?.hasPointerCapture(id)) surface.current.releasePointerCapture(id);
      input.current = { x: 0, z: 0 };
      setThumb({ x: 0, z: 0 });
    };
    clear();
    const update = () => { if (pointer.current === null) publish(keyboardInput(keys.current)); };
    const down = (event: KeyboardEvent) => {
      if (disabled || event.metaKey || event.ctrlKey || event.altKey || document.querySelector('dialog:modal')) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, [contenteditable="true"], [role="tab"]')) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
      update();
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); update(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
    window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', clear);
    const focus = () => { if (document.activeElement !== surface.current) clear(); };
    document.addEventListener('focusin', focus);
    return () => {
      clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pagehide', clear);
      window.removeEventListener('resize', clear);
      document.removeEventListener('visibilitychange', clear);
      document.removeEventListener('focusin', focus);
    };
  }, [disabled, input]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    publish(analogInput(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, rect.width * 0.3));
  }
  function release(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    publish(disabled ? { x: 0, z: 0 } : keyboardInput(keys.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className="movement-joystick" data-disabled={disabled}>
      <div ref={surface} className="joystick-surface" role="group" tabIndex={disabled ? -1 : 0}
        aria-label="Movement joystick" aria-describedby="joystick-help" aria-disabled={disabled}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (disabled || pointer.current !== null || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
        <span className="joystick-axis" aria-hidden="true" />
        <span className="joystick-thumb" aria-hidden="true" style={{ transform: `translate(calc(-50% + ${thumb.x * 30}cqw), calc(-50% + ${thumb.z * 30}cqw))` }} />
      </div>
      <span id="joystick-help" className="joystick-help"><span className="joystick-touch-hint">Drag to walk</span><span className="joystick-key-hint">↑ ↓ ← → / WASD</span></span>
    </div>
  );
}
