import { lazy, Suspense, useEffect } from 'react';
import Atlas from './Atlas';
import { sceneRegistry } from './scenes/registry';
import './atlas.css';

// Keep scene bundles independent: only the requested minimundo is loaded.
const routes = sceneRegistry.map((scene) => ({
  ...scene,
  Experience: lazy(scene.component),
}));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const hrefFor = (path: string) => `${basePath}${path || '/'}`;

export default function App() {
  const fullPathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const pathname =
    (basePath && fullPathname.startsWith(basePath)
      ? fullPathname.slice(basePath.length)
      : fullPathname) || '/';
  const scene = routes.find((entry) => entry.path === pathname);
  const isAtlas = pathname === '/';

  useEffect(() => {
    document.title = scene
      ? `MiniMundos · ${scene.title}`
      : isAtlas
        ? 'MiniMundos · Atlas'
        : 'MiniMundos · World not found';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        scene?.learningObjective ??
          'Step into miniature worlds where maths, science, and history meet. A moment in time. A place in the world. An idea to discover.',
      );
  }, [scene, isAtlas]);

  if (scene) {
    const { Experience } = scene;
    return (
      <Suspense
        fallback={
          <main className="atlas">
            <p role="status">Opening {scene.title}…</p>
          </main>
        }
      >
        <Experience />
      </Suspense>
    );
  }

  if (isAtlas) return <Atlas />;
  return (
    <main className="atlas atlas-not-found">
      <a className="atlas-brand" href={hrefFor('/')}>
        MiniMundos.
      </a>
      <h1>World not found</h1>
      <p>This URL does not match a minimundo.</p>
      <a href={hrefFor('/')}>Back to all worlds →</a>
    </main>
  );
}
