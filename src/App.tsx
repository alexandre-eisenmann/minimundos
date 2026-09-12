import { lazy, Suspense, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sceneRegistry } from './scenes/registry';
import { useSoundPreference } from './game/sound';
import './atlas.css';

// Keep scene bundles independent: only the requested minimundo is loaded.
const routes = sceneRegistry.map((scene) => ({
  ...scene,
  Experience: lazy(scene.component),
}));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const hrefFor = (path: string) => `${basePath}${path || '/'}`;

export default function App() {
  const [soundEnabled, setSoundEnabled] = useSoundPreference();
  const fullPathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const pathname = (basePath && fullPathname.startsWith(basePath)
    ? fullPathname.slice(basePath.length)
    : fullPathname) || '/';
  const scene = routes.find((entry) => entry.path === pathname);
  const isAtlas = pathname === '/';

  useEffect(() => {
    document.title = scene
      ? `MiniMundos · ${scene.title}`
      : isAtlas ? 'MiniMundos · Atlas' : 'MiniMundos · World not found';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content', scene?.learningObjective ?? 'Explore independent miniature worlds and discover mathematics.',
    );
  }, [scene, isAtlas]);

  if (scene) {
    const { Experience } = scene;
    return (
      <Suspense fallback={<main className="atlas"><p role="status">Opening {scene.title}…</p></main>}>
        <Experience />
      </Suspense>
    );
  }

  return (
    <main className="atlas">
      <header className="atlas-menu">
        <a className="atlas-brand" href={hrefFor('/')}>MiniMundos</a>
        <button
          className="sound-toggle"
          type="button"
          aria-label={soundEnabled ? 'Mute walking sounds' : 'Turn on walking sounds'}
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>Sound</span>
          <small>{soundEnabled ? 'On' : 'Off'}</small>
        </button>
      </header>
      <h1>{isAtlas ? 'Choose a minimundo' : 'World not found'}</h1>
      {isAtlas ? (
        <nav className="atlas-worlds" aria-label="Minimundos">
          {sceneRegistry.map((entry) => (
            <a className="atlas-world" key={entry.slug} href={hrefFor(entry.path)}>
              <h2>{entry.title}</h2>
              <p>{entry.learningObjective}</p>
              <span>Explore world →</span>
            </a>
          ))}
        </nav>
      ) : (
        <><p>This URL does not match a minimundo.</p><a href={hrefFor('/')}>Back to all worlds</a></>
      )}
    </main>
  );
}
