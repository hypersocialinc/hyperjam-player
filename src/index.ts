// @hyperjam/player: a <hyperjam-player> element that plays Strudel code.
import { HyperJamPlayer, setEngineLoader, type EngineLoader } from "./player";

export { HyperJamPlayer, setEngineLoader };
export type { EngineLoader };
export type { Engine, HapEvent, Lane } from "./engine/types";
export type { Track } from "./track";

if (typeof customElements !== "undefined" && !customElements.get("hyperjam-player")) {
  customElements.define("hyperjam-player", HyperJamPlayer);
}

declare global {
  interface HTMLElementTagNameMap {
    "hyperjam-player": HyperJamPlayer;
  }
}
