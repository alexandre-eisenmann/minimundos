# Mercator

An educational atlas of the history of mathematics. First chapter: the seven bridges of Königsberg.

## Development

Node 22.13+ and pnpm. Run `pnpm install`, then `pnpm dev`. `pnpm build` checks TypeScript and builds the static Vite application. `pnpm test` verifies the bridge graph and enumerates possible walks.

React 19, TypeScript, Vite, Tailwind CSS, Three.js, React Three Fiber and Drei. The Sites starter's component library remains available for future interface work.

## Scene architecture

- `src/game/world.ts`: versioned scene identity, seeded-world metadata, regions, bridge connections and pure challenge rules.
- `src/scenes/Konigsberg.tsx`: reusable procedural scenery, animated water, birds, boats and traveller.
- `src/App.tsx`: challenge state, accessible route buttons, field journal and graph view.

The scene preserves the historical multigraph: north–island twice, south–island twice, north–east, south–east, island–east. The geography is schematic; architecture, costumes and scenery are illustrative, not an archaeological reconstruction. The cascading water at the miniature's outer edge is a diorama effect, not a historical waterfall.

This is a click-to-cross prototype. Movement follows bridge waypoints; it is not a free-roaming collision simulation. Progress is session-local. Future scenes can replace geometry with authored GLTF characters and costumes without changing the challenge rules. Generative terrain streaming, authored historical dialogue and time navigation are future work.

Keyboard users can Tab to the route buttons and activate them with Enter. Drag the scene to orbit and scroll to zoom. The connections overlay and field journal explain why the route is impossible.
