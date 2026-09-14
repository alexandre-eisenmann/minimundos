import { Globe2 } from 'lucide-react';

/** Shared mark for the atlas and each independently loaded world. */
export default function MiniMundosWordmark() {
  return (
    <>
      <Globe2 strokeWidth={1.3} aria-hidden="true" />
      <span>MiniMundos<span className="brand-period">.</span></span>
    </>
  );
}
