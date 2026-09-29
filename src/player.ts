import { dedent, indexTokens, renderCode } from "./code";
import { CSS } from "./styles";
import { coverColour, rgbCss } from "./color";
import { claim, release, unlockAudio } from "./engine/context";
import type { Engine, HapEvent, Lane } from "./engine/types";
import { DEFAULT_API, SITE, fetchTrack, type Track } from "./track";

/** Loads the engine. Replaceable, so the element never depends on Strudel directly. */
export type EngineLoader = (ctx: AudioContext) => Promise<Engine>;
let loadEngine: EngineLoader = (ctx) => import("./engine/strudel").then((m) => m.loadStrudel(ctx));
/** Swap the engine every player on the page uses (call before the first play). */
export function setEngineLoader(loader: EngineLoader) {
  loadEngine = loader;
}

const FONTS = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,700..900&family=JetBrains+Mono:wght@500;700&family=Nunito:wght@700;800;900&display=swap";
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

function injectFonts() {
  if (typeof document === "undefined" || document.querySelector("link[data-hyperjam-player-fonts]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONTS;
  link.dataset.hyperjamPlayerFonts = "";
  document.head.appendChild(link);
}


type State = "idle" | "loading" | "playing";

export class HyperJamPlayer extends HTMLElement {
  static observedAttributes = ["track", "code", "name", "author", "cover", "color", "api", "bpm"];
  // theme and size are styling only (:host selectors), so they need no re-render

  #root: ShadowRoot;
  #track: Track | null = null;
  #state: State = "idle";
  #engine: Engine | null = null;
  #tokens = new Map<number, HTMLElement[]>();
  #lit = new Map<HTMLElement, number>();
  #raf = 0;
  #load: AbortController | null = null;
  /** Settles when the current track has loaded (or failed to). */
  #ready: Promise<void> = Promise.resolve();
  #hapHandler = (e: HapEvent) => this.#onHap(e);
  #reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = `<style>${CSS}</style>
<div class="card idle" part="card">
  <div class="deck" aria-hidden="true">
    <div class="vinyl"><div class="spin"><div class="lab"></div></div></div>
    <div class="sleeve"><span class="hole"><i></i></span></div>
  </div>
  <div class="info">
    <h3 class="title" part="title"></h3>
    <div class="by" part="author"></div>
    <div class="row">
      <button class="key" type="button" part="play">${PLAY}<span>Play</span></button>
      <a class="jam" part="jam-link" target="_blank" rel="noopener" hidden>Jam on this in HyperJam</a>
    </div>
    <p class="msg" role="status" aria-live="polite"></p>
  </div>
  <pre class="code" part="code" tabindex="0" aria-label="Strudel code"></pre>
</div>`;
    this.#$(".key").addEventListener("click", () => this.toggle());
  }

  connectedCallback() {
    if (!this.hasAttribute("fonts") || this.getAttribute("fonts") !== "none") injectFonts();
    void this.#init();
    // Loaded by a <script> in <head>, the element upgrades before its inline
    // <script type="text/strudel"> child is parsed; read it again once it is.
    if (document.readyState === "loading" && !this.hasAttribute("code") && !this.hasAttribute("track")) {
      document.addEventListener("DOMContentLoaded", () => this.isConnected && void this.#init(), { once: true });
    }
  }

  disconnectedCallback() {
    this.#load?.abort();
    if (this.#state !== "idle") this.pause();
  }

  attributeChangedCallback(_name: string, old: string | null, value: string | null) {
    if (old !== value && this.isConnected) void this.#init();
  }

  /* ---------- public API ---------- */

  /** The code that plays (or will play). */
  get code(): string {
    return this.#track?.code ?? "";
  }

  get playing(): boolean {
    return this.#state === "playing";
  }

  /** Start playback. The first call must come from a user gesture (browser autoplay rules). */
  async play(): Promise<void> {
    const ctx = unlockAudio(); // synchronously, inside the gesture
    if (!ctx) return this.#fail("This browser can't play Web Audio.");
    if (this.#state !== "idle") return;
    this.#setState("loading");
    await this.#ready; // a track still loading plays as soon as it arrives
    if (!this.#is("loading")) return; // paused while waiting
    if (!this.#track?.code) {
      this.#setState("idle");
      return this.#fail("Nothing to play yet.");
    }
    claim(this, () => this.#stopped());
    try {
      this.#engine = this.#engine ?? (await loadEngine(ctx));
      if (!this.#is("loading")) return; // paused while loading
      await this.#engine.play(this.#track.code, this.#hapHandler);
      this.#setState("playing");
      this.#message("");
      this.dispatchEvent(new CustomEvent("play"));
      this.#spin();
    } catch (err) {
      release(this);
      this.#setState("idle");
      this.#fail(`This code didn't play: ${err instanceof Error ? err.message : String(err)}`, err);
    }
  }

  pause(): void {
    if (this.#state === "idle") return;
    this.#engine?.stop();
    release(this);
    this.#stopped();
  }

  toggle(): Promise<void> | void {
    return this.#state === "idle" ? this.play() : this.pause();
  }

  /** Replace the code. While playing, the new code crossfades in on its own beat 1. */
  async setCode(code: string, meta: { bpm?: number } = {}): Promise<void> {
    const outBpm = this.#bpm();
    this.#track = { ...(this.#track ?? { name: "Untitled", author: "" }), code, bpm: meta.bpm ?? this.#track?.bpm };
    this.#renderCode();
    if (this.#state === "playing" && this.#engine) {
      try {
        await this.#engine.crossfade(code, this.#hapHandler, outBpm, this.#bpm());
      } catch (err) {
        this.#fail(`The new code didn't play: ${err instanceof Error ? err.message : String(err)}`, err);
      }
    }
  }

  /* ---------- loading ---------- */

  #init() {
    this.#ready = this.#loadTrack();
    return this.#ready;
  }

  async #loadTrack() {
    this.#load?.abort();
    const load = (this.#load = new AbortController());
    const slug = this.getAttribute("track");
    const inline = this.getAttribute("code") ?? this.querySelector('script[type="text/strudel"]')?.textContent ?? "";
    const base: Track = {
      name: this.getAttribute("name") ?? "",
      author: this.getAttribute("author") ?? "",
      code: dedent(inline),
      color: this.getAttribute("color") ?? undefined,
      cover: this.getAttribute("cover") ?? undefined,
      bpm: Number(this.getAttribute("bpm")) || undefined,
    };
    if (slug && base.code) {
      // the page already has the track (a server-rendered embed): no fetch, no flash
      this.#apply({ ...base, slug, name: base.name || slug, cover: base.cover });
    } else if (slug) {
      this.#apply({ ...base, name: base.name || "Loading…", code: "" });
      try {
        const t = await fetchTrack(slug, this.getAttribute("api") ?? DEFAULT_API, load.signal);
        if (load.signal.aborted) return;
        // attributes override what the API says
        this.#apply({ ...t, name: base.name || t.name, author: base.author || t.author, color: base.color ?? t.color, cover: base.cover ?? t.cover });
        this.dispatchEvent(new CustomEvent("load", { detail: { track: this.#track } }));
      } catch (err) {
        if (load.signal.aborted) return;
        this.#apply({ ...base, name: base.name || slug });
        this.#fail(err instanceof Error ? err.message : String(err), err);
      }
    } else {
      this.#apply({ ...base, name: base.name || "Untitled" });
    }
  }

  #apply(t: Track) {
    this.#track = t;
    const colour = t.color && /^#?[0-9a-f]{3,8}$/i.test(t.color) ? (t.color.startsWith("#") ? t.color : `#${t.color}`) : null;
    // no track colour: the tint and the vinyl follow the theme's accent
    if (colour) this.style.setProperty("--tc", colour);
    else this.style.removeProperty("--tc");
    this.style.setProperty("--vc", colour ?? "#EB6C32");
    const page = t.slug ? `${SITE}/tracks/${encodeURIComponent(t.slug)}` : "";
    const name = page ? `<a href="${escapeHtml(page)}" target="_blank" rel="noopener">${escapeHtml(t.name)}</a>` : escapeHtml(t.name);
    this.#$(".title").innerHTML = `${name}<span class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
    this.#$(".by").textContent = t.author;
    const jam = this.#$<HTMLAnchorElement>(".jam");
    jam.hidden = !page;
    if (page) jam.href = page;
    this.#$(".key").setAttribute("aria-label", `Play ${t.name}`);
    this.#setCover(t.cover);
    this.#renderCode();
  }

  #setCover(url: string | undefined) {
    const sleeve = this.#$(".sleeve"), lab = this.#$(".lab");
    sleeve.classList.remove("cover");
    sleeve.style.backgroundImage = "";
    lab.style.backgroundImage = "";
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      if (this.#track?.cover !== url) return;
      sleeve.classList.add("cover");
      sleeve.style.backgroundImage = lab.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
    };
    img.src = url; // on error the blank die-cut sleeve stays
    void coverColour(url).then((rgb) => {
      if (rgb && this.#track?.cover === url) this.style.setProperty("--vc", rgbCss(rgb));
    });
  }

  #renderCode() {
    const pre = this.#$(".code");
    pre.innerHTML = renderCode(this.#track?.code ?? "");
    this.#tokens = indexTokens(pre);
    this.#lit.clear();
  }

  /* ---------- playback visuals ---------- */

  #onHap(e: HapEvent) {
    this.dispatchEvent(new CustomEvent("hap", { detail: e }));
    const ctx = this.#engine?.context;
    if (!ctx) return;
    const colour = `var(--hj-${e.lane})`; // the lane colours are theme variables
    const delay = Math.max(0, (e.at - ctx.currentTime) * 1000);
    const hold = Math.min(Math.max(e.dur * 1000, 110), 600);
    setTimeout(() => {
      if (this.#state !== "playing") return;
      const until = performance.now() + hold;
      for (const start of e.starts) {
        for (const el of this.#tokens.get(start) ?? []) {
          el.style.setProperty("--c", colour);
          el.classList.add("on");
          this.#lit.set(el, until);
        }
      }
      this.#bump();
    }, delay);
  }

  #level = 0;
  #bump() {
    this.#level = 1;
  }

  #spin() {
    cancelAnimationFrame(this.#raf);
    const spin = this.#$(".spin");
    const bars = [...this.#root.querySelectorAll<HTMLElement>(".meter i")];
    const tick = () => {
      if (this.#state !== "playing") return;
      const now = performance.now();
      for (const [el, until] of this.#lit) if (now >= until) { el.classList.remove("on"); this.#lit.delete(el); }
      const cycle = this.#engine?.cycle();
      if (!this.#reduce && cycle != null) spin.style.transform = `rotate(${(cycle * 360) % 360}deg)`;
      this.#level *= 0.9;
      bars.forEach((b, i) => (b.style.height = `${30 + 70 * this.#level * Math.abs(Math.sin(now / 90 + i * 1.7))}%`));
      this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  #stopped() {
    cancelAnimationFrame(this.#raf);
    const was = this.#state;
    this.#setState("idle");
    for (const el of this.#lit.keys()) el.classList.remove("on");
    this.#lit.clear();
    if (was !== "idle") this.dispatchEvent(new CustomEvent("pause"));
  }

  /* ---------- helpers ---------- */

  #setState(s: State) {
    this.#state = s;
    const card = this.#$(".card"), key = this.#$<HTMLButtonElement>(".key");
    card.classList.toggle("idle", s === "idle");
    card.classList.toggle("playing", s === "playing");
    key.disabled = s === "loading";
    key.innerHTML = s === "playing" ? `${PAUSE}<span>Pause</span>` : s === "loading" ? `${PLAY}<span>Loading…</span>` : `${PLAY}<span>Play</span>`;
    key.setAttribute("aria-label", `${s === "playing" ? "Pause" : "Play"} ${this.#track?.name ?? ""}`.trim());
  }

  /** State checks that TypeScript won't narrow across awaits. */
  #is(s: State) {
    return this.#state === s;
  }

  #bpm() {
    const b = this.#track?.bpm;
    if (b && b > 0) return b;
    const cps = this.#engine?.cps();
    return cps ? cps * 240 : 120; // Strudel's default: 1 cycle = 4 beats
  }

  #message(text: string) {
    this.#$(".msg").textContent = text;
  }

  #fail(message: string, cause?: unknown) {
    this.#message(message);
    this.dispatchEvent(new CustomEvent("error", { detail: { message, cause } }));
  }

  #$<T extends HTMLElement = HTMLElement>(sel: string): T {
    return this.#root.querySelector(sel) as T;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
