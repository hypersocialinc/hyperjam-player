import { describe, expect, it } from "vitest";
import readme from "../README.md?raw";
import { CSS, THEME_VARS } from "./styles";

const host = /:host\{([^}]*)\}/.exec(CSS)![1];

describe("theme variables", () => {
  it("each has a default on the element", () => {
    for (const v of THEME_VARS) expect(host, v).toContain(`${v}:`);
  });

  it("are all documented in the README", () => {
    for (const v of THEME_VARS) expect(readme, v).toContain(`\`${v}\``);
  });

  it("light and auto share one light palette", () => {
    const light = /:host\(\[theme=light\]\)\{([^}]*)\}/.exec(CSS)![1];
    const auto = /prefers-color-scheme: light\)\{:host\(\[theme=auto\]\)\{([^}]*)\}/.exec(CSS)![1];
    expect(light).toBe(auto);
    expect(light).toContain("--hj-bg:");
    expect(light).toContain("--hj-text:");
  });

  it("draws no part colour outside the variables", () => {
    // lanes come from --hj-drums and friends, the key from --hj-accent
    expect(CSS).not.toMatch(/(color|background):#(FF7A3D|A897FF|FFC266)/i);
    expect(CSS).toMatch(/\.key\{[^}]*var\(--hj-accent\)/);
  });
});
