// Real Strudel in the browser, loaded on the first play. The same modules in
// scope and the same sample and soundfont banks as Fizz FM's app and site, so
// a track sounds here as it does there, and its code sounds the same pasted
// into strudel.cc.

import { entryLevel, fadeCurve, swapTimings } from "./fade";
import { laneOf } from "../lanes";
import type { Engine, HapEvent } from "./types";

export type { Engine, HapEvent };

const BASE_CDN = "https://strudel.b-cdn.net";
/** How far ahead Strudel's scheduler sounds what it schedules (the runtime's SCHEDULER_LATENCY_S). */
const SCHEDULER_LATENCY_S = 0.1;
// strudel.cc's custom Dirt-Samples map (prebake.mjs), as the runtime inlines it.
const DIRT_SAMPLES_INLINE: Record<string, string[]> = {
  casio: ["casio/high.wav", "casio/low.wav", "casio/noise.wav"],
  crow: ["crow/000_crow.wav", "crow/001_crow2.wav", "crow/002_crow3.wav", "crow/003_crow4.wav"],
  insect: [
    "insect/000_everglades_conehead.wav",
    "insect/001_robust_shieldback.wav",
    "insect/002_seashore_meadow_katydid.wav",
  ],
  wind: [
    "wind/000_wind1.wav", "wind/001_wind10.wav", "wind/002_wind2.wav", "wind/003_wind3.wav",
    "wind/004_wind4.wav", "wind/005_wind5.wav", "wind/006_wind6.wav", "wind/007_wind7.wav",
    "wind/008_wind8.wav", "wind/009_wind9.wav",
  ],
  jazz: [
    "jazz/000_BD.wav", "jazz/001_CB.wav", "jazz/002_FX.wav", "jazz/003_HH.wav",
    "jazz/004_OH.wav", "jazz/005_P1.wav", "jazz/006_P2.wav", "jazz/007_SN.wav",
  ],
  metal: [
    "metal/000_0.wav", "metal/001_1.wav", "metal/002_2.wav", "metal/003_3.wav",
    "metal/004_4.wav", "metal/005_5.wav", "metal/006_6.wav", "metal/007_7.wav",
    "metal/008_8.wav", "metal/009_9.wav",
  ],
  east: [
    "east/000_nipon_wood_block.wav", "east/001_ohkawa_mute.wav", "east/002_ohkawa_open.wav",
    "east/003_shime_hi.wav", "east/004_shime_hi_2.wav", "east/005_shime_mute.wav",
    "east/006_taiko_1.wav", "east/007_taiko_2.wav", "east/008_taiko_3.wav",
  ],
  space: [
    "space/000_0.wav", "space/001_1.wav", "space/002_11.wav", "space/003_12.wav",
    "space/004_13.wav", "space/005_14.wav", "space/006_15.wav", "space/007_16.wav",
    "space/008_17.wav", "space/009_18.wav", "space/010_2.wav", "space/011_3.wav",
    "space/012_4.wav", "space/013_5.wav", "space/014_6.wav", "space/015_7.wav",
    "space/016_8.wav", "space/017_9.wav",
  ],
  numbers: [
    "numbers/0.wav", "numbers/1.wav", "numbers/2.wav", "numbers/3.wav", "numbers/4.wav",
    "numbers/5.wav", "numbers/6.wav", "numbers/7.wav", "numbers/8.wav",
  ],
  num: [
    "num/00.wav", "num/01.wav", "num/02.wav", "num/03.wav", "num/04.wav", "num/05.wav",
    "num/06.wav", "num/07.wav", "num/08.wav", "num/09.wav", "num/10.wav", "num/11.wav",
    "num/12.wav", "num/13.wav", "num/14.wav", "num/15.wav", "num/16.wav", "num/17.wav",
    "num/18.wav", "num/19.wav", "num/20.wav",
  ],
};

type Repl = {
  evaluate: (code: string, autoplay?: boolean) => Promise<unknown>;
  stop: () => void;
  scheduler?: { now?: () => number; cps?: number; started?: boolean };
};
type Hap = {
  value?: Record<string, unknown>;
  duration?: { valueOf(): number };
  context?: { locations?: Array<{ start: number; end: number }> };
};

const TAP = "__hyperjamPlayerHap";
let loading: Promise<Engine> | null = null;

/** Load Strudel once per page (on the first play) and wrap it as an Engine. */
export function loadStrudel(ctx: AudioContext): Promise<Engine> {
  if (!loading) {
    const attempt = boot(ctx).catch((err) => {
      // a transient CDN failure should not poison every later play
      if (loading === attempt) loading = null;
      throw err;
    });
    loading = attempt;
  }
  return loading;
}

async function boot(ctx: AudioContext): Promise<Engine> {
  const [core, mini, tonal, webaudio, transpiler, soundfonts] = await Promise.all([
    import("@strudel/core"),
    import("@strudel/mini"),
    import("@strudel/tonal"),
    import("@strudel/webaudio"),
    import("@strudel/transpiler"),
    import("@strudel/soundfonts"),
  ]);
  const wa = webaudio;
  wa.setAudioContext?.(ctx);
  await core.evalScope(Promise.resolve(core), Promise.resolve(mini), Promise.resolve(tonal), Promise.resolve(webaudio), Promise.resolve(transpiler));
  mini.miniAllStrings?.();

  let evalError: unknown = null;
  const repl = wa.webaudioRepl({
    transpiler: transpiler.transpiler,
    onEvalError: (err: unknown) => { evalError = err; },
  }) as Repl;
  core.setTime?.(() => repl.scheduler?.now?.() ?? 0);
  await Promise.resolve(wa.initAudio?.());

  // Each bank loads on its own: a missing drum bank costs that bank, not the synths.
  // The synths and soundfonts register without the network; the sample banks
  // come from Strudel's CDN. If none of those load, the engine can't play the
  // tracks (they are mostly drum machines), so it fails and callers fall back.
  const local = [wa.registerSynthSounds?.(), wa.registerZZFXSounds?.(), soundfonts.registerSoundfonts?.()];
  const banks: [string, Promise<unknown>][] = [
    ["piano", wa.samples(`${BASE_CDN}/piano.json`, `${BASE_CDN}/piano/`, { prebake: true })],
    ["vcsl", wa.samples(`${BASE_CDN}/vcsl.json`, `${BASE_CDN}/VCSL/`, { prebake: true })],
    ["tidal-drum-machines", wa.samples(`${BASE_CDN}/tidal-drum-machines.json`, `${BASE_CDN}/tidal-drum-machines/machines/`, { prebake: true, tag: "drum-machines" })],
    ["uzu-drumkit", wa.samples(`${BASE_CDN}/uzu-drumkit.json`, `${BASE_CDN}/uzu-drumkit/`, { prebake: true, tag: "drum-machines" })],
    ["uzu-wavetables", wa.samples(`${BASE_CDN}/uzu-wavetables.json`, `${BASE_CDN}/uzu-wavetables/`, { prebake: true })],
    ["mridangam", wa.samples(`${BASE_CDN}/mridangam.json`, `${BASE_CDN}/mrid/`, { prebake: true, tag: "drum-machines" })],
    ["dirt-samples", wa.samples(DIRT_SAMPLES_INLINE, `${BASE_CDN}/Dirt-Samples/`, { prebake: true })],
  ];
  await Promise.all(local);
  const settled = await Promise.allSettled(banks.map(([, p]) => p));
  const failed = settled.flatMap((r, i) => (r.status === "rejected" ? [[banks[i][0], r.reason] as const] : []));
  for (const [name, reason] of failed) console.warn(`[hyperjam-player] Strudel sound bank "${name}" failed to load:`, reason);
  if (failed.length === banks.length) throw new Error("No Strudel sample banks loaded");
  try {
    await wa.aliasBank?.(`${BASE_CDN}/tidal-drum-machines-alias.json`);
  } catch (err) {
    console.warn("[hyperjam-player] drum machine aliases failed to load:", err);
  }

  let onHap: ((e: HapEvent) => void) | null = null;
  (globalThis as Record<string, unknown>)[TAP] = (hap: Hap, _now: number, cps: number, targetTime: number) => {
    try {
      const locs = hap.context?.locations ?? [];
      onHap?.({ starts: locs.map((l) => l.start), at: targetTime, dur: (hap.duration?.valueOf() ?? 0) / (cps || 0.5), lane: laneOf(hap.value) });
    } catch {
      // a display tap must never break the audio path
    }
  };

  /* the master fader: superdough's output runs through one gain node */
  const master = (): GainNode | null => wa.getSuperdoughAudioController?.()?.output?.destinationGain ?? null;
  const setMaster = (v: number) => {
    const g = master();
    if (!g) return;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(v, ctx.currentTime);
  };
  /** An equal-power fade from where the fader is (or `from`) to `to`, starting at `startAt`; returns its end time. */
  const fade = (to: number, ms: number, startAt = 0, from?: number) => {
    const g = master(), now = ctx.currentTime;
    if (!g) return now;
    const level = from ?? g.gain.value;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(level, now);
    if (ms <= 0 || Math.abs(level - to) < 1e-4) { g.gain.setValueAtTime(to, now); return now; }
    const start = Math.max(now + 0.005, startAt); // a value curve may not share its start with another event
    g.gain.setValueCurveAtTime(fadeCurve(level, to, ms), start, ms / 1000);
    return start + ms / 1000;
  };
  const until = (time: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, (time - ctx.currentTime) * 1000)));
  /* tails: reverb and delay sum in before the fader, so a swap rebuilds them under the silence */
  const cutTails = () => { try { wa.getSuperdoughAudioController?.()?.reset?.(); } catch (err) { console.warn("[hyperjam-player] tail cut failed", err); } };
  let fadeToken = 0;

  let playing = false;
  const evaluate = async (code: string, cb: (e: HapEvent) => void) => {
    onHap = cb;
    evalError = null;
    // The tap is appended on its own line, so every token keeps its offset
    // and a trailing `// comment` cannot swallow it.
    const pattern = await repl.evaluate(`${code}\n.onTrigger(globalThis.${TAP}, false)`, true);
    if (evalError) throw evalError;
    if (pattern === undefined) throw new Error("pattern did not evaluate");
    playing = true;
  };
  return {
    context: ctx,
    async play(code, cb) {
      fadeToken++; // a plain play takes the fader from any swap in flight
      setMaster(1);
      await evaluate(code, cb);
    },
    async crossfade(code, cb, outBpm, inBpm) {
      const token = ++fadeToken;
      const { outMs, inMs } = swapTimings(outBpm, inBpm);
      if (playing) await until(fade(0, outMs));
      if (token !== fadeToken) return;
      cutTails();
      repl.stop(); // the next evaluation starts the scheduler again at cycle 0
      setMaster(0);
      await evaluate(code, cb);
      if (token !== fadeToken) return;
      // beat 1 is exact: the restarted scheduler dates cycle 0 on its first tick and sounds it one latency later
      const sched = repl.scheduler as { seconds_at_cps_change?: number } | undefined;
      const beat1 = (typeof sched?.seconds_at_cps_change === "number" ? sched.seconds_at_cps_change : ctx.currentTime) + SCHEDULER_LATENCY_S;
      fade(1, inMs, beat1, entryLevel());
    },
    stop() {
      fadeToken++;
      playing = false;
      onHap = null;
      repl.stop();
      setMaster(1);
    },
    cycle() {
      return playing && repl.scheduler?.started !== false ? (repl.scheduler?.now?.() ?? null) : null;
    },
    cps() {
      return repl.scheduler?.cps ?? 0.5;
    },
  };
}
