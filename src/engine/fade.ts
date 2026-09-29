// Swap shaping for live code swaps (setCode while playing).
//
// A swap fades the outgoing loop out over about a beat of its tempo, restarts
// the scheduler under the silence so the incoming loop enters on its own beat
// 1, then fades in over about two beats. Both fades are equal-power (cosine
// out, sine in): a linear ramp is heard as a drop at the end of a fade-out and
// a jump at the start of a fade-in.

export const SWAP = {
  outBeats: 1,
  outMinMs: 350,
  outMaxMs: 700,
  inBeats: 2,
  inMinMs: 600,
  inMaxMs: 1200,
  /** Share of the fade-in treated as done when beat 1 sounds, so the downbeat itself is heard. */
  inPreRoll: 0.25,
  curvePointsPerSecond: 200,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const beatMs = (bpm: number) => 60000 / (Number.isFinite(bpm) && bpm > 0 ? bpm : 120);

/** Fade lengths for a swap from `outBpm` to `inBpm`. */
export function swapTimings(outBpm: number, inBpm: number) {
  return {
    outMs: Math.round(clamp(beatMs(outBpm) * SWAP.outBeats, SWAP.outMinMs, SWAP.outMaxMs)),
    inMs: Math.round(clamp(beatMs(inBpm) * SWAP.inBeats, SWAP.inMinMs, SWAP.inMaxMs)),
  };
}

/** An equal-power gain curve from `from` to `to` over `ms`, for AudioParam.setValueCurveAtTime. */
export function fadeCurve(from: number, to: number, ms: number): Float32Array {
  const n = Math.max(16, Math.ceil((ms / 1000) * SWAP.curvePointsPerSecond) + 1);
  const curve = new Float32Array(n);
  const rising = to > from;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const shape = rising ? Math.sin((x * Math.PI) / 2) : 1 - Math.cos((x * Math.PI) / 2);
    curve[i] = from + (to - from) * shape;
  }
  curve[0] = from;
  curve[n - 1] = to;
  return curve;
}

/** The level the incoming loop's beat 1 sounds at. */
export const entryLevel = () => Math.sin((SWAP.inPreRoll * Math.PI) / 2);
