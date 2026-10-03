# Monty Hall · Hollywood, 1975

## Historical grounding

The setting represents the decade in which Steve Selvin published the puzzle,
not a documented game-show episode. The television programme began in 1963;
the mathematical puzzle appeared in 1975 and reached a wider audience through
Marilyn vos Savant's 1990 column. Actual television deals did not guarantee the
idealised host protocol. Original studio architecture, characters, costumes,
and the unnamed wedge sports car are illustrative period-inspired assets. The 5-, 10-, 20-, 30- and 50-door sets are explicitly educational extensions. The sports car takes design cues from the early Countach LP400, rather than depicting a documented show prize.

Sources consulted:

- [Television Academy: Monty Hall](https://www.televisionacademy.com/bios/monty-hall)
  — original host, 1963 premiere, and costumed audience.
- [Mark Huber, The Monty Hall Problem, 2013](https://www1.cmc.edu/pages/faculty/MHuber/Research/talks/huber_talk_2013d.pdf)
  — Selvin's 1975 publication, knowledgeable host, switching and host policies.
- [Lamborghini: Countach design history](https://www.lamborghini.com/en-en/news/lamborghini-countach-design-that-made-history) — period sports-car design cues.
- [Scientific American, revisiting the problem, 2010](https://www.scientificamerican.com/blog/observations/lets-make-a-deal-revisiting-the-monty-hall-problem/)
  — historical context and the 1990 popularisation.

## Mathematical protocol

`rules.ts` deals one uniformly random car among N doors before any player choice.
The host knows the contents and opens N−2 unchosen goats. When the first choice
is the car, the retained alternative goat is chosen uniformly at random. The
host always offers the switch. Keeping wins with probability 1/N; switching
wins with probability (N−1)/N. This protocol makes the displayed probabilities
valid even after observing the particular doors retained by the host.

The simulation compares both policies on the same independent random deals.
Simulation results and played-round scores are kept separately for each door
count. Scores count completed decisions only. A collapsible scoreboard under the door picker tallies wins and losses for every door count, split into Keep and Switch, with each measured rate shown beside the theoretical one (1/n for keeping, (n−1)/n for switching). Prizes remain hidden until the host reveal or final resolution; no peeking is included in experimental outcomes.

## Scene organization

- Manifest / registry: metadata, atlas card and independent lazy route.
- `rules.ts`: pure puzzle and simulation functions.
- `navigation.ts`: floor bounds, booth partitions and aisle routing.
- `MontyHallWorld.tsx`: studio composition, host, doors and avatar.
- `../assets/StudioProps.tsx`: reusable car, goat, camera, signs and forms.
- `MontyHallExperience.tsx`: accessible choices, session scores and journal.

Closed prizes are omitted from the render tree, preventing camera-orbit peeks.
Clicking or tapping a door routes the avatar to that exact door: on the same floor it walks there; on another floor it rides the lift floor by floor, stops in front of the door and steps inside if the door is already open. A tapped closed door is then acted on, as if Space were pressed: it is chosen, kept or switched to, or opened if it is the final door. Arrow keys and the lift buttons remain the manual alternative. The first choice takes effect when the nearby Choose button or Space is pressed. The host then reveals goats while a floating panel tracks progress; a compact Keep / Switch panel follows without covering or pausing the studio, and stage lamps light the first choice (warm) and the other closed door (cool) on whichever floor they stand. The final choice automatically guides the avatar to the red platform, calls it to the current floor if needed, rides one floor at a time, and stops in front of the still-closed final door. The door opens on arrival (or with Space / Open if the journey was interrupted); only then do the outcome sound, score and result panel appear. A car brings falling confetti, a fanfare and synthesized applause; a goat brings a sad trombone. The avatar then steps inside and the remaining doors open. Manual movement cancels that journey. Clicking a different floor routes to the current lift landing; the up/down buttons on multi-floor sets move the central red platform one floor at a time, whether occupied or empty. Ordinary walking routes never change levels. The avatar boards only through user movement and can walk while the platform moves. Stepping off its edge causes a fall onto the floor below. The stage lever expands the studio through its supported counts. The 50-door set has five rectangular rows of ten. A red circular platform rises on a silver piston, connecting the central gallery landings. Empty space around the raised platform does not support the avatar. Open booths admit the avatar through their actual doorway; click routes between booths go through the front aisle. Keyboard / joystick movement is camera-relative.

Run `npm test` and `npm run build`. Local preview: `/scenes/monty-hall`.

In development only, `/scenes/monty-hall?capture=atlas` hides the interface for
capturing a fresh atlas image directly from the playable scene.

The procedural goat asset uses individually phased breathing, gentle head turns, occasional chewing, blinks, ear twitches and tail flicks. Hooves remain planted during idle animation.

Sound follows the shared minimundo preference, with gesture-unlocked footsteps and quiet reveal, decision and result cues. The mobile interface starts muted.

## Rendering and interface

The world fills the screen behind transparent controls. Repeated studio boxes,
lamps and goat forms share geometry/materials and render in instance batches;
lightweight hit targets preserve the original door interaction hierarchy. Batch
buffers and shared assets are released when their last user leaves. Sign textures
use 512-pixel canvases, and large studios cap pixel density to limit mobile GPU
memory. Replaying keeps the existing booths mounted.

The set is framed by a striped 1970s backdrop wall, a sunburst stage floor radiating from the lift, and a layered plinth matching the other dioramas.

A silver box truss spans the stage in front of the doors, held by two raked arms bolted to the back wall; nothing reaches the floor. A follow spot hangs from a trolley on the truss: it slides along the span, pans and tilts its yoke, and keeps a soft beam and a real spot-light pool on the avatar, including while it rides the lift. The trolley lags behind a walking avatar, so the head swings and the beam rakes across the stage before it catches up. A wide soft wash from the same lamp, over deliberately low ambient light, lets the far corners of the stage fall into shadow. Both spot lights cast shadow maps, so props carry a second shadow pointing away from the lamp, and slabs and walls block its light; the visible beam stops at the first gallery slab or door header in its path. On tall door walls the truss sits further forward so the beam clears every gallery edge to reach a door approach. The truss doesn't cast shadows, so its lattice doesn't stripe the doors.

The platform starts with a hydraulic clunk, hums with a motor tone and soft hiss while moving in either direction, and chimes on arrival. A finite
instanced confetti shower celebrates arrival at the winning car; reduced-motion
users retain the written result without falling confetti.
