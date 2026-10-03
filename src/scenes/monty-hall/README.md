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
count. Scores count completed decisions only. Prizes remain hidden until the host reveal or final resolution; no peeking is included in experimental outcomes.

## Scene organization

- Manifest / registry: metadata, atlas card and independent lazy route.
- `rules.ts`: pure puzzle and simulation functions.
- `navigation.ts`: floor bounds, booth partitions and aisle routing.
- `MontyHallWorld.tsx`: studio composition, host, doors and avatar.
- `../assets/StudioProps.tsx`: reusable car, goat, camera, signs and forms.
- `MontyHallExperience.tsx`: accessible choices, session scores and journal.

Closed prizes are omitted from the render tree, preventing camera-orbit peeks.
Clicking a door routes the avatar to its approach. The first choice takes effect when the nearby Choose button or E is pressed. The host then reveals goats and the decision panel offers explicit Keep and Switch buttons from anywhere on the stage. Clicking a different floor routes to the current lift landing; the up/down buttons on multi-floor sets move the central red platform one floor at a time, whether occupied or empty. Ordinary walking routes never change levels. The avatar boards only through user movement and can walk while the platform moves. Stepping off its edge causes a fall onto the floor below. The stage lever expands the studio through its supported counts. The 50-door set has five rectangular rows of ten. A red circular platform rises on a silver piston, connecting the central gallery landings. Empty space around the raised platform does not support the avatar. Open booths admit the avatar through their actual doorway; click routes between booths go through the front aisle. Keyboard / joystick movement is camera-relative.

Run `npm test` and `npm run build`. Local preview: `/scenes/monty-hall`.

In development only, `/scenes/monty-hall?capture=atlas` hides the interface for
capturing a fresh atlas image directly from the playable scene.

The procedural goat asset uses individually phased breathing, gentle head turns, occasional chewing, blinks, ear twitches and tail flicks. Hooves remain planted during idle animation.

Sound follows the shared minimundo preference, with gesture-unlocked footsteps and quiet reveal, decision and result cues. The mobile interface starts muted.
