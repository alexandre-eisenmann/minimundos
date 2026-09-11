# Minimundos

An educational atlas of the history of mathematics. First chapter: the seven bridges of Königsberg.

## Development

Node 22.13+ and pnpm. Run `pnpm install`, then `pnpm dev`. `pnpm build` checks TypeScript and builds the static Vite application. `pnpm test` verifies the bridge graph and enumerates possible walks.

React 19, TypeScript, Vite, Tailwind CSS, Three.js, React Three Fiber and Drei. The Sites starter's component library remains available for future interface work.

## Scene architecture

- `src/game/world.ts`: versioned scene identity, seeded-world metadata, regions, bridge connections and pure challenge rules.
- `src/scenes/Konigsberg.tsx`: reusable procedural scenery, animated water, birds, boats and traveller.
- `src/App.tsx`: URL routing, minimundo index, and unknown-path fallback.
- `src/scenes/KonigsbergExperience.tsx`: challenge state, accessible route buttons, field journal and graph view.

The scene preserves the historical multigraph: north–island twice, south–island twice, north–east, south–east, island–east. The geography is schematic; architecture, costumes and scenery are illustrative, not an archaeological reconstruction. The two eastern river outlets each have a full-channel cascade, with the visible current flowing east. These are diorama effects, not historical waterfalls.

WASD and arrow keys move the traveller relative to the camera; Shift runs. On-screen directional buttons support touch. Land, water, bridges and building footprints constrain movement. Clicking a bridge also offers a guided crossing. Progress is session-local. Future scenes can replace geometry with authored GLTF characters and costumes without changing the challenge rules. Generative terrain streaming, authored historical dialogue and time navigation are future work.

The public site is deployed to GitHub Pages at `https://alexandre-eisenmann.github.io/minimundos/`.

`src/scenes/assets/` contains reusable foliage, waterfall and architectural models; `src/scenes/registry.ts` records standalone scene metadata for the future atlas.

Keyboard users can Tab to the route buttons and activate them with Enter. Drag the scene to orbit and scroll to zoom. The connections overlay and field journal explain why the route is impossible.

The default view faces the eastern cascades, with neutral daylight and the sun on the opposite side of the scene to reverse the original shadow direction. Nine decorative townspeople follow tested, deterministic pedestrian routes with different speeds and endpoint pauses. They never update the player’s bridge-crossing state.

The traveller starts on the south bank. Low, unmasted cargo skiffs follow continuous closed routes, with hull clearance checked against banks and bridge piers. Boat hulls, cargo and bobbing remain below the bridge decks; the routes turn before the cascades.

Bridges remain traversable after use. The crossing log includes repeated bridge IDs, with separate totals for all crossings and distinct bridges visited. Manual and guided crossings count on arrival at the opposite bank; turning around midway does not count. Undo removes the last recorded crossing.

## Minimundo URLs

- `/`: index of registered minimundos (published at `/minimundos/` on GitHub Pages).
- `/scenes/konigsberg`: the complete Königsberg experience. Direct links and refreshes work in Vite and GitHub Pages.
- Unregistered paths show a world-not-found page with a link to the index.

To add a minimundo, create a self-contained experience component with a default export and add an entry to `src/scenes/registry.ts` with a unique slug and `/scenes/<slug>` path, title, learning objective, and dynamic component import. The entry automatically appears in the index and becomes a route. Keep scene-specific state inside its experience component and reusable assets in `src/scenes/assets`. The component is loaded only when its URL is opened. Use ordinary links between worlds so browser history and opening in new tabs work naturally.

Static hosts must serve `index.html` for application paths. The Pages build copies it to `404.html` so direct scene links also load the application.
