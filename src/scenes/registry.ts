import { sceneDefinition } from '../game/world';
import sceneManifest from './manifest.json';

const konigsberg = sceneManifest.find((scene) => scene.slug === 'konigsberg');
if (!konigsberg) throw new Error('Königsberg scene metadata is missing');
const brachistochrone = sceneManifest.find(
  (scene) => scene.slug === 'brachistochrone',
);
if (!brachistochrone)
  throw new Error('Brachistochrone scene metadata is missing');
const montyHall = sceneManifest.find((scene) => scene.slug === 'monty-hall');
if (!montyHall) throw new Error('Monty Hall scene metadata is missing');

const gauss = sceneManifest.find((scene) => scene.slug === 'gauss');
if (!gauss) throw new Error('Gauss scene metadata is missing');

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
  {
    id: 'monty-hall-1975',
    version: 1,
    seed: 1975,
    period: '1975',
    location: 'Hollywood, California',
    historicalNote:
      'An illustrative 1970s studio inspired by Let’s Make a Deal and Steve Selvin’s 1975 puzzle; generalized door counts are educational extensions.',
    ...montyHall,
    component: () => import('./monty-hall/MontyHallExperience'),
  },
  {
    id: 'gauss-schoolroom-1786',
    version: 1,
    seed: 1786,
    period: 'c. 1786',
    location: 'Braunschweig, German lands',
    historicalNote:
      'An illustrative classroom inspired by the later Gauss schoolboy anecdote; the familiar 1-to-100 task is not an eyewitness account.',
    ...gauss,
    component: () => import('./gauss/GaussExperience'),
  },
];
