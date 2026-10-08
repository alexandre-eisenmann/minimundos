import { useEffect, useMemo, useState } from 'react';
import { students } from './students';

export const crossedLines: Record<string, readonly number[]> = {
  running: [5],
  columns: [10],
  restart: [3, 6],
  groups: [4, 5],
  counting: [9],
  pairs: [],
};
let fontLoading: Promise<unknown> | undefined;
function loadChalkFonts() {
  fontLoading ??= Promise.all([
    new FontFace(
      'Gauss Chalk',
      `url(${import.meta.env.BASE_URL}fonts/gauss-caveat.ttf)`,
      { weight: '400 700' },
    ).load(),
    new FontFace(
      'Pupil Chalk',
      `url(${import.meta.env.BASE_URL}fonts/gauss-patrick-hand.ttf)`,
    ).load(),
  ]).then((fonts) => fonts.forEach((font) => document.fonts.add(font)));
  return fontLoading;
}
export function useHandwritingReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void loadChalkFonts()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return ready;
}
const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export function drawSlate(
  lines: readonly string[],
  method = 'pairs',
  board = false,
  fontReady = true,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = board ? 480 : 1200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = board ? '#263e36' : '#303b3b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(235,235,210,${noise(i) * 0.04})`;
    ctx.fillRect(
      noise(i + 5) * 1024,
      noise(i + 19) * canvas.height,
      8 + noise(i + 7) * 40,
      1,
    );
  }
  const neat = method === 'pairs' || board;
  if (!neat) {
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.translate(150 + noise(i + 41) * 660, 180 + noise(i + 90) * 800);
      ctx.rotate(noise(i + 78) * 0.18);
      ctx.fillStyle = '#e5e2c50c';
      ctx.font = '48px "Pupil Chalk"';
      ctx.fillText('12 + 17 =  ?', 0, 0);
      ctx.restore();
    }
  }
  lines.forEach((line, row) => {
    const size = board
      ? row === 1
        ? 66
        : 44
      : neat
        ? 58
        : 49 + noise(row + 2) * 9;
    ctx.save();
    ctx.font = `${board || neat ? 500 : 400} ${size}px "${fontReady ? (neat ? 'Gauss Chalk' : 'Pupil Chalk') : 'cursive'}", cursive`;
    const width = ctx.measureText(line.trim()).width;
    const x = board
      ? Math.max(50, (1024 - width) / 2)
      : neat
        ? 92
        : 55 + noise(row + method.length) * 42;
    const y = (board ? 100 : 112) + row * (board ? 116 : 89);
    ctx.translate(x, y);
    ctx.rotate((noise(row + method.length * 8) - 0.5) * (neat ? 0.012 : 0.045));
    ctx.fillStyle = '#eee9d0';
    let advance = 0;
    for (const [i, char] of Array.from(
      new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(
        line.trim(),
      ),
      (part) => part.segment,
    ).entries()) {
      ctx.save();
      ctx.translate(advance, (noise(i + row * 79) - 0.5) * (neat ? 1.4 : 5));
      ctx.rotate((noise(i * 7 + row) - 0.5) * (neat ? 0.024 : 0.095));
      ctx.globalAlpha = 0.8 + noise(i * 3 + row) * 0.2;
      ctx.fillText(char, 0, 0);
      ctx.restore();
      advance += ctx.measureText(char).width + (neat ? 0.2 : 0.6);
    }
    if (crossedLines[method]?.includes(row)) {
      ctx.strokeStyle = '#d9dfc7b0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const px = (i / 18) * Math.min(advance + 12, 880);
        const py = -size * 0.28 + Math.sin(i * 1.8) * 5;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.15);
      ctx.lineTo(Math.min(advance, 880), -size * 0.48);
      ctx.stroke();
    }
    if (neat && !board && line.includes('5050')) {
      ctx.strokeStyle = '#eee9d0c0';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 11 + i * 9);
        ctx.quadraticCurveTo(advance * 0.5, 8 + i * 9, advance, 12 + i * 9);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  // Fine gaps in the chalk, like pressure variations on a rough slate.
  for (let i = 0; i < 9500; i++) {
    ctx.fillStyle = board ? '#263e3670' : '#303b3b70';
    ctx.fillRect(
      noise(i + 201) * 1024,
      noise(i + 509) * canvas.height,
      0.7 + noise(i) * 1.5,
      0.7,
    );
  }
  return canvas;
}
export function HandwrittenSlate({
  index,
  preview = false,
}: {
  index: number;
  preview?: boolean;
}) {
  const ready = useHandwritingReady();
  const student = students[index];
  const src = useMemo(() => {
    return drawSlate(student.lines, student.method, false, ready).toDataURL();
  }, [student, ready]);
  return (
    // Local canvas artwork: preserve identical pixels in every inspection view.
    // eslint-disable-next-line next/no-img-element
    <img
      className={preview ? 'gauss-chalk-preview' : 'gauss-chalk-image'}
      src={src}
      alt={`${student.name}’s handwritten work: ${student.lines.map((line, i) => (crossedLines[student.method]?.includes(i) ? `crossed out: ${line}` : line)).join('; ')}`}
    />
  );
}
