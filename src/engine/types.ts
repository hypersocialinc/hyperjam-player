// The engine boundary. The player only talks to an Engine, so the Strudel
// implementation behind it can be replaced without touching the element.

/** Which part of the band an event belongs to; the player colours tokens by it. */
export type Lane = "drums" | "bass" | "chords" | "melody";

export type HapEvent = {
  /** Offsets into the evaluated code of every token behind this event. */
  starts: number[];
  /** AudioContext time the event sounds, and how long it lasts (seconds). */
  at: number;
  dur: number;
  lane: Lane;
};

export interface Engine {
  /** Evaluate and play `code`; every event is reported to `onHap` as it is scheduled. */
  play(code: string, onHap: (e: HapEvent) => void): Promise<void>;
  /** Fade what plays out, then bring `code` in on its own beat 1. */
  crossfade(code: string, onHap: (e: HapEvent) => void, outBpm: number, inBpm: number): Promise<void>;
  stop(): void;
  /** The scheduler's position in cycles (one cycle = one bar), or null when stopped. */
  cycle(): number | null;
  /** Cycles per second. */
  cps(): number;
  /** The AudioContext the engine plays into (for timing visuals). */
  readonly context: AudioContext;
}
