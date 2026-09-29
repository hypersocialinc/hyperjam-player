import { describe, expect, it } from "vitest";
import { dominantVivid } from "./color";

const px = (r: number, g: number, b: number, n: number) => Array.from({ length: n }, () => [r, g, b, 255]).flat();

describe("dominantVivid", () => {
  it("prefers a vivid hue over a larger grey area", () => {
    const data = [...px(128, 128, 128, 800), ...px(230, 90, 60, 100)];
    const [r, g, b] = dominantVivid(data)!;
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });
  it("returns null when everything is grey or transparent", () => {
    expect(dominantVivid(px(40, 40, 40, 50))).toBeNull();
    expect(dominantVivid([255, 0, 0, 0])).toBeNull();
  });
  it("picks the heavier of two hues", () => {
    const [r, g, b] = dominantVivid([...px(40, 120, 220, 300), ...px(230, 90, 60, 100)])!;
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });
});
