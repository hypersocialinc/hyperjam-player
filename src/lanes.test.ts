import { describe, expect, it } from "vitest";
import { laneOf } from "./lanes";

describe("laneOf", () => {
  it("puts drum machines and drum names in drums", () => {
    expect(laneOf({ s: "rolandtr909_bd" })).toBe("drums");
    expect(laneOf({ s: "rolandtr808_cp" })).toBe("drums");
    expect(laneOf({ s: "hh" })).toBe("drums");
  });
  it("finds bass by sound name or by a low note", () => {
    expect(laneOf({ s: "gm_electric_bass_finger", note: "e4" })).toBe("bass");
    expect(laneOf({ s: "sawtooth", note: "e2" })).toBe("bass");
    expect(laneOf({ s: "sawtooth", note: 40 })).toBe("bass");
  });
  it("finds chords by pad-like sounds and falls back to melody", () => {
    expect(laneOf({ s: "gm_pad_warm", note: "e3" })).toBe("chords");
    expect(laneOf({ s: "gm_electric_guitar_clean", note: "e5" })).toBe("melody");
    expect(laneOf({})).toBe("melody");
  });
});
