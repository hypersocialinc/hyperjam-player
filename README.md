# HyperJam Player

`<hyperjam-player>` is a web component that plays [Strudel](https://strudel.cc) code
on any page. It looks like a record: a sleeve with the track's cover, a coloured vinyl that
slides out and spins while it plays, and the code underneath, with each token lighting up
in its part's colour as it sounds.

It can play a published [HyperJam](https://hyperjam.ai) track by its slug, or any Strudel
code you give it. While playing, it can swap in new code live.

## Use it

With one script tag, using the single-file build:

```html
<script src="hyperjam-player.iife.js"></script>

<hyperjam-player track="tidal-arpeggio"></hyperjam-player>
```

As an ES module, in an app with a bundler:

```js
import "@hyperjam/player"; // defines <hyperjam-player>
```

Your own code can go in an inline `<script type="text/strudel">` or the `code` attribute:

```html
<hyperjam-player title="Four on the floor" author="@you" color="#4FE0BE">
  <script type="text/strudel">
    stack(
      s("bd*4").bank("RolandTR909"),
      s("hh*8").bank("RolandTR909").gain(0.3)
    )
  </script>
</hyperjam-player>
```

The package isn't on npm yet. To try it locally:

```sh
pnpm install
pnpm dev     # open http://localhost:5173/examples/
pnpm build   # dist/hyperjam-player.js (ESM) and dist/hyperjam-player.iife.js (one file)
pnpm test
```

## Attributes

| Attribute | What it does |
| --- | --- |
| `track` | A HyperJam track slug. Loads its name, author, colour, tempo, code and cover. |
| `code` | Strudel code to play. You can also use a child `<script type="text/strudel">`. |
| `title`, `author` | Override or supply the name and byline. |
| `cover` | A cover image URL. The vinyl takes its colour from the image, so the image must allow cross-origin reads. Without a cover, a plain sleeve in the track colour is shown. |
| `color` | The track colour, as hex. |
| `bpm` | The tempo, used to time live swaps. When it's missing, it's read from the code. |
| `api` | A different HyperJam API base URL. |
| `fonts="none"` | Don't add the Google Fonts stylesheet to the page. |

Give the element a height (for example, fill a 16:9 box) and the code area stretches to fill it.

## API

```js
const player = document.querySelector("hyperjam-player");

await player.play();      // the first play must come from a click, tap or key press
player.pause();
player.toggle();
await player.setCode(code, { bpm: 120 }); // while playing, crossfades in on its own beat 1
player.code;              // the current code
player.playing;           // true while it plays
```

Only one player plays at a time. Starting another stops the one playing.

### Events

| Event | `detail` |
| --- | --- |
| `load` | `{ track }` when a `track` slug has loaded |
| `play`, `pause` | none |
| `hap` | `{ starts, at, dur, lane }` for every sound: the token offsets in the code, the AudioContext time it sounds, how long it lasts, and its lane (`drums`, `bass`, `chords` or `melody`) |
| `error` | `{ message, cause }` |

### Styling

The element uses shadow DOM. These parts can be styled with `::part()`: `card`, `title`, `author`, `play`, `jam-link` and `code`.

### Swapping the engine

The element talks to audio only through a small `Engine` interface (`src/engine/types.ts`).
To use a different engine, call `setEngineLoader(ctx => myEngine)` before the first play.

## Browser behaviour

- Audio starts only after a user gesture, because browsers block autoplay. Until then the
  player shows its idle state.
- Samples and soundfonts load from Strudel's CDN (`strudel.b-cdn.net`) on the first play.
  They're a few megabytes, so the first play takes a moment.
- `prefers-reduced-motion` stops the spin and the pulsing, and playback still works.

## Licence

AGPL-3.0-or-later (see `LICENSE`). This player bundles Strudel, which is licensed
AGPL-3.0-or-later, so the player is too. If you ship a modified version, you have to offer its
source under the same licence.
