---
name: hyperjam-player
description: Put a playable Strudel music player on a website with one script tag, using the <hyperjam-player> web component, or embed a published HyperJam track with an iframe, and theme it to match the site (light, dark, auto, accent colour, fonts, radius). Use when someone wants to add music, a beat, a Strudel pattern or live-coded audio to a web page, blog, portfolio or docs site, embed a HyperJam track, or swap Strudel code in a page while it plays.
---

# HyperJam Player

`<hyperjam-player>` plays [Strudel](https://strudel.cc) code on any web page. It looks
like a record: a sleeve, a coloured vinyl that spins while it plays, and the code, with
each token lighting up as it sounds. It works in plain HTML and in any framework.

## Pick the path

- **A published HyperJam track, no code on the page:** use the iframe (below). The track
  page's **Embed** button on hyperjam.ai gives the exact code.
- **The user's own Strudel code, or a track they want to control from JavaScript:** load
  the script and use the element.

## Your own Strudel: one script tag

```html
<script src="https://hyperjam.ai/player.js"></script>

<hyperjam-player name="Four on the floor" author="@you" color="#4FE0BE">
  <script type="text/strudel">
    stack(
      s("bd*4").bank("RolandTR909"),
      s("hh*8").bank("RolandTR909").gain(0.3)
    )
  </script>
</hyperjam-player>
```

- The inline `<script type="text/strudel">` keeps the code readable. The `code` attribute
  also works, for code built in JavaScript.
- A published track by slug: `<hyperjam-player track="tidal-arpeggio"></hyperjam-player>`.
  It loads the name, author, colour, cover and code.
- The script is about 250 KB gzipped (it includes Strudel). Samples and soundfonts load
  from Strudel's CDN on the first play, so the first play takes a moment.

In a bundled app (React, Vue, Svelte, Astro), the same script tag works in the page
head. The element is a standard custom element, so render `<hyperjam-player>` like any tag.
In React, pass its attributes as strings.

## Attributes

| Attribute | Use |
| --- | --- |
| `track` | A HyperJam track slug. With `code` also set, nothing is fetched and the slug only links to the track. |
| `code` | Strudel code (or use a child `<script type="text/strudel">`). |
| `name`, `author` | Title and byline. |
| `color` | Track colour, hex. |
| `cover` | Cover image URL. The vinyl takes its colour from it, so it must allow CORS. |
| `bpm` | Tempo, used to time live swaps (read from the code if missing). |
| `theme` | `dark` (default), `light`, or `auto` to follow the viewer's system setting. |
| `size="compact"` | One row: record, title and play key, plus the code when it is 720 px or wider. Give it about 152 px of height. |
| `fonts="none"` | Don't add the Google Fonts stylesheet. |

Give the element a height (for example `style="height:352px"`, or fill a 16:9 box) and
the code area stretches to fill it.

## Match the site's look

First read the site's own colours, fonts and corner radius (its CSS variables, Tailwind
config or design tokens), then set the player's variables to them. Put them on the
element, or on a parent to theme every player on the page:

```css
hyperjam-player {
  --hj-accent: #7C5CFF;        /* Play key and meter: use the site's primary colour */
  --hj-accent-text: #fff;      /* must stay readable on --hj-accent */
  --hj-bg: #0E1726;            /* card background */
  --hj-text: #E6EDF7;
  --hj-muted: #93A1B5;
  --hj-radius: 8px;
  --hj-font: "Inter", system-ui, sans-serif;
}
```

All variables: `--hj-bg`, `--hj-text`, `--hj-muted`, `--hj-accent`, `--hj-accent-text`,
`--hj-code-bg`, `--hj-focus`, `--hj-drums`, `--hj-bass`, `--hj-chords`, `--hj-melody`
(token colours by part), `--hj-radius`, `--hj-font`, `--hj-title-font`, `--hj-code-font`.

- Leave anything out and it keeps its default; `theme` still picks the light or dark defaults.
- A site with light and dark modes: use `theme="auto"`, or set the variables inside the
  site's own dark-mode selector.
- With the site's own fonts, add `fonts="none"` so the player doesn't load Google Fonts.
- Keep `--hj-text` on `--hj-bg`, and `--hj-accent-text` on `--hj-accent`, at 4.5:1 contrast or better.
- A track's own `color` still tints the card and vinyl; that's intended.

## JavaScript

```js
const player = document.querySelector("hyperjam-player");
await player.play();               // must come from a click, tap or key press
player.pause();
await player.setCode(newCode);     // while playing, crossfades in on its own beat 1
player.addEventListener("hap", (e) => console.log(e.detail.lane)); // drums, bass, chords, melody
```

Events: `load`, `play`, `pause`, `hap` and `error` (`detail.message`). Only one player
plays at a time on a page.

## Embed a published track (iframe)

```html
<iframe src="https://hyperjam.ai/embed/tidal-arpeggio" width="100%" height="352"
  title="Tidal Arpeggio on HyperJam" allow="autoplay" loading="lazy"
  style="border:0;border-radius:18px;max-width:100%"></iframe>
```

- Optional: `?size=compact` (height 152), `?theme=light` or `?theme=auto`, and
  `?accent=7C5CFF` (hex, no `#`) for the Play key. Other variables need the script-tag path.
- Pasting a `https://hyperjam.ai/tracks/<slug>` link into Notion, Ghost, Medium or
  Discourse turns it into the player automatically (oEmbed). WordPress, Discord and X
  show a link card instead; use the iframe there.

## Rules that trip people up

- **No autoplay.** Browsers only start audio after a user gesture, so never call
  `play()` on load. `allow="autoplay"` on an iframe only lets the viewer's tap work.
- **iPhone silent switch.** iOS may mute Web Audio when the ringer is off. Mention it if
  someone reports no sound on iPhone.
- **Cross-origin covers.** A `cover` from another host must send
  `Access-Control-Allow-Origin`, or the vinyl keeps the track colour.
- **Test it in a browser.** Serve the page over http (not `file://`) and click Play.

## Licence

The player bundles Strudel, which is AGPL-3.0-or-later, so the player is too
(https://github.com/hypersocialinc/hyperjam-player). Using it on a page is fine. If someone
ships a modified copy of the player, they must offer its source under the same licence.
