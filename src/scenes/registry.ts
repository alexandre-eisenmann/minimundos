import { sceneDefinition } from '../game/world';
import sceneManifest from './manifest.json';

const konigsberg = sceneManifest.find((scene) => scene.slug === 'konigsberg');
if (!konigsberg) throw new Error('Königsberg scene metadata is missing');
const brachistochrone = sceneManifest.find(
  (scene) => scene.slug === 'brachistochrone',
);
if (!brachistochrone)
  throw new Error('Brachistochrone scene metadata is missing');

/** Each scene can be developed and linked independently before an atlas exists. */
export const sceneRegistry = [
  {
    ...sceneDefinition,
    ...konigsberg,
    component: () => import('./KonigsbergExperience'),
  },
  {
    id: 'brachistochrone-1696',
    version: 1,
    seed: 1696,
    period: '1696–1697',
    location: 'Groningen, Dutch Republic',
    historicalNote:
      'An illustrative workshop reconstruction grounded in Johann Bernoulli’s 1696 challenge.',
    ...brachistochrone,
    component: () => import('./brachistochrone/BrachistochroneExperience'),
  },
];
