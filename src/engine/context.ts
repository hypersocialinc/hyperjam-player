// One AudioContext for the page. It is created and resumed inside the first tap
// (Safari only unlocks audio synchronously within a user gesture), before
// Strudel has even loaded.

let ctx: AudioContext | null = null;

/** Call synchronously from a click/pointer/key handler. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
  }
  if (ctx.state === "suspended") void ctx.resume().catch((err) => console.warn("[hyperjam-player] audio could not resume", err));
  return ctx;
}

/* ---- one player at a time: Strudel's scheduler is page-global ---- */
let holder: { id: object; lose: () => void } | null = null;

/** Take the speakers. Whoever had them is told it has stopped. */
export function claim(id: object, lose: () => void) {
  const prev = holder;
  holder = { id, lose };
  if (prev && prev.id !== id) prev.lose();
}
export function release(id: object) {
  if (holder?.id === id) holder = null;
}
export const holds = (id: object) => holder?.id === id;
