import { sceneDefinition } from '../game/world';
/** Each scene can be developed and linked independently before an atlas exists. */
export const sceneRegistry = [
  {
    ...sceneDefinition,
    slug: 'konigsberg',
    path: '/scenes/konigsberg',
    title: 'The seven bridges of Königsberg',
    learningObjective:
      'Discover why four odd-degree vertices prevent an Euler walk.',
    component: () => import('./Konigsberg'),
  },
];
