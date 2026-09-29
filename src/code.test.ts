import { describe, expect, it } from "vitest";
import { dedent, renderCode } from "./code";

const offsets = (html: string) => [...html.matchAll(/data-at="(\d+)">([^<]*)</g)].map((m) => [Number(m[1]), m[2]] as const);

describe("renderCode", () => {
  it("keys every pattern token by its offset in the code", () => {
    const code = 's("bd*4 [~ sd]").gain(0.5)';
    for (const [at, text] of offsets(renderCode(code))) expect(code.slice(at, at + text.length)).toBe(text);
    expect(offsets(renderCode(code)).map(([, t]) => t)).toEqual(expect.arrayContaining(["bd", "4", "sd", "0.5"]));
  });
  it("marks function names and escapes HTML", () => {
    const html = renderCode('note("<c3 e3>")');
    expect(html).toContain('<span class="fn">note</span>');
    expect(html).toContain("&lt;");
    expect(html).not.toContain("<c3");
  });
  it("keeps offsets after comments and on later lines", () => {
    const code = '// hi "x"\nstack(\n  s("hh*8"),\n)';
    for (const [at, text] of offsets(renderCode(code))) expect(code.slice(at, at + text.length)).toBe(text);
    expect(offsets(renderCode(code)).some(([, t]) => t === "hh")).toBe(true);
  });
});

describe("dedent", () => {
  it("strips the shared indent and blank edges", () => {
    expect(dedent("\n    s(\"bd\")\n      .gain(1)\n  ")).toBe('s("bd")\n  .gain(1)');
  });
});
