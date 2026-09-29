import type { Lane } from "./engine/types";

// Sorts a Strudel event into a lane from its sound and note, so the code view
// can light each token in the colour of the part it plays.

const DRUM = /(^|_)(bd|sd|hh|oh|cp|rim|lt|mt|ht|cr|rd|cb|perc|tom|kick|snare|hat|clap|shaker|tabla|mridangam)(\b|_|\d|$)|drum|808|909|707|606|casio|jazz|metal|east/;
const BASS = /bass|sub/;
const CHORDS = /pad|string|choir|voice|organ|epiano|piano|rhodes|ensemble|aahs|oohs|harpsichord|clav/;

type Value = { s?: unknown; sound?: unknown; note?: unknown } | null | undefined;

const midi = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const m = /^([a-gA-G])([#bs]*)(-?\d+)?$/.exec(v.trim());
  if (!m) return null;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase() as "c"];
  const acc = [...m[2]].reduce((a, c) => a + (c === "b" ? -1 : 1), 0);
  const oct = m[3] === undefined ? 3 : Number(m[3]);
  return 12 * (oct + 1) + base + acc;
};

export function laneOf(value: Value): Lane {
  const sound = String(value?.s ?? value?.sound ?? "").toLowerCase();
  if (sound && DRUM.test(sound)) return "drums";
  if (BASS.test(sound)) return "bass";
  const m = midi(value?.note);
  if (m !== null && m < 48) return "bass";
  if (CHORDS.test(sound)) return "chords";
  return "melody";
}
