import { sceneDefinition } from '../game/world';
import sceneManifest from './manifest.json';

const konigsberg = sceneManifest.find((scene) => scene.slug === 'konigsberg');
if (!konigsberg) throw new Error('Königsberg scene metadata is missing');

/** Each scene can be developed and linked independently before an atlas exists. */
export const sceneRegistry = [
  {
    ...sceneDefinition,
    ...konigsberg,
    component: () => import('./KonigsbergExperience'),
  },
];
