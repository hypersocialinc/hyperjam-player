import { dedent, indexTokens, renderCode } from "./code";
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

const LANES: Record<Lane, string> = { drums: "#FF7A3D", bass: "#A897FF", chords: "#4FE0BE", melody: "#FFC266" };
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

const CSS = /* css */ `
:host{display:block;container-type:inline-size;--hj-stage:#1D1419;--hj-ink:#EFE4D4;--hj-muted:#A3948B;--hj-key:#EB6C32;--hj-key-top:#F58A55;--hj-edge:#9C4218;
  --hj-code-bg:rgba(0,0,0,.28);--hj-code-ink:rgba(239,228,212,.5);--hj-code-fn:rgba(239,228,212,.72);--hj-code-cm:rgba(239,228,212,.3);--hj-shadow:0 10px 30px rgba(0,0,0,.25);
  --tc:#EB6C32;--vc:#2a2420;font-family:Nunito,system-ui,sans-serif;color:var(--hj-ink)}
:host([hidden]){display:none}
/* theme="light": a paper card for light pages */
:host([theme=light]){--hj-stage:#F6EEE3;--hj-ink:#201B17;--hj-muted:#6E625A;--hj-code-bg:rgba(32,27,23,.06);--hj-code-ink:rgba(32,27,23,.55);--hj-code-fn:rgba(32,27,23,.8);--hj-code-cm:rgba(32,27,23,.4);--hj-shadow:0 6px 20px rgba(32,27,23,.12)}
*{box-sizing:border-box}
.card{position:relative;height:100%;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"deck info" "code code";gap:14px 16px;padding:16px;border-radius:18px;overflow:hidden;
  background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 16%,transparent),transparent 55%),var(--hj-stage);box-shadow:var(--hj-shadow);transition:background .6s}
.deck{--sl:104px;grid-area:deck;position:relative;width:calc(var(--sl) * 1.3);height:var(--sl);align-self:start}
.sleeve{position:absolute;left:0;top:0;width:var(--sl);aspect-ratio:1;border-radius:6px;z-index:2;background-size:cover;background-position:center;
  background-color:color-mix(in srgb,var(--tc) 24%,#2B2328);box-shadow:0 10px 22px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.07)}
.sleeve .hole{position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:repeating-radial-gradient(circle,color-mix(in srgb,var(--vc) 30%,#0b0908) 0 1.3px,color-mix(in srgb,var(--vc) 46%,#15110f) 1.3px 2.4px);box-shadow:inset 0 3px 8px rgba(0,0,0,.6)}
.sleeve .hole i{position:absolute;inset:32%;border-radius:50%;background:var(--tc)}
.sleeve .hole i::after,.lab::after{content:"";position:absolute;inset:42%;border-radius:50%;background:var(--hj-ink)}
.sleeve.cover .hole{display:none}
.vinyl{position:absolute;left:0;top:4%;width:calc(var(--sl) * .92);aspect-ratio:1;border-radius:50%;z-index:1;transform:translateX(12%);transition:transform .6s cubic-bezier(.2,.9,.25,1.05);
  background:radial-gradient(circle,transparent 0 31%,rgba(0,0,0,.55) 31.5% 33%,transparent 33.5%),
    repeating-radial-gradient(circle,color-mix(in srgb,var(--vc) 30%,#0b0908) 0 1.4px,color-mix(in srgb,var(--vc) 46%,#15110f) 1.4px 2.6px);
  box-shadow:0 10px 22px rgba(0,0,0,.5)}
.vinyl::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 20deg,transparent 0 10%,rgba(255,255,255,.1) 14%,transparent 20% 60%,rgba(255,255,255,.07) 64%,transparent 70%);z-index:1}
.spin{position:absolute;inset:0;border-radius:50%}
.lab{position:absolute;inset:32%;border-radius:50%;background:var(--tc) center/cover}
.playing .vinyl{transform:translateX(38%)}
.info{grid-area:info;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px}
.title{margin:0;color:inherit;font:900 clamp(20px,6cqw,34px)/.95 Archivo,system-ui,sans-serif;font-stretch:72%;letter-spacing:-.01em;overflow-wrap:anywhere}
.by{font-weight:800;font-size:13px;color:var(--hj-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px}
.key{appearance:none;border:0;height:40px;padding:0 16px 0 12px;border-radius:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;
  font:900 14px Nunito,system-ui,sans-serif;color:#201B17;background:linear-gradient(var(--hj-key-top),var(--hj-key));box-shadow:0 4px 0 var(--hj-edge);transition:transform .08s,box-shadow .08s}
.key svg{width:18px;height:18px;fill:currentColor}
.key:active{transform:translateY(3px);box-shadow:0 1px 0 var(--hj-edge)}
.key:focus-visible,.jam:focus-visible,.code:focus-visible{outline:2px solid #4FE0BE;outline-offset:3px}
.key[disabled]{opacity:.6;cursor:progress}
.idle .key{animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{0%,100%{box-shadow:0 4px 0 var(--hj-edge),0 0 0 0 rgba(235,108,50,.45)}50%{box-shadow:0 4px 0 var(--hj-edge),0 0 0 10px rgba(235,108,50,0)}}
.jam{font-weight:800;font-size:13px;color:var(--hj-ink);text-decoration:none;opacity:.8;border-bottom:1.5px solid color-mix(in srgb,var(--tc) 70%,transparent)}
.jam:hover{opacity:1}
.title a{color:inherit;text-decoration:none}
.title a:hover{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.title a:focus-visible{outline:2px solid #4FE0BE;outline-offset:3px;border-radius:4px}
.msg{margin:6px 0 0;font-size:12.5px;font-weight:700;color:#FFB4A0;min-height:0}
.msg:empty{display:none}
.code{grid-area:code;margin:0;min-height:0;max-height:220px;overflow:auto;padding:12px 14px;border-radius:12px;background:var(--hj-code-bg);
  font:500 11.5px/1.6 "JetBrains Mono",ui-monospace,monospace;white-space:pre;color:color-mix(in srgb,var(--tc) 45%,var(--hj-code-ink));tab-size:2;scrollbar-width:thin}
.code .fn{color:var(--hj-code-fn)}
.code .cm{color:var(--hj-code-cm)}
.code .t{border-radius:3px;transition:color .12s,background-color .12s,text-shadow .12s}
.code .t.on{color:var(--c);background:color-mix(in srgb,var(--c) 18%,transparent);text-shadow:0 0 10px var(--c)}
.meter{display:inline-flex;gap:2px;align-items:flex-end;height:12px;margin-left:8px;vertical-align:middle;opacity:0;transition:opacity .3s}
.playing .meter{opacity:1}
.meter i{width:3px;height:30%;background:var(--hj-key);border-radius:1px;transition:height .08s}
/* wide: the record on the left, the code filling the right */
@container (min-width:560px){
  .card{grid-template-rows:auto minmax(0,1fr);grid-template-areas:"deck info" "deck code";padding:20px;gap:14px 22px}
  .deck{--sl:min(30cqw,240px)}
  .code{max-height:none}
}
/* size="compact": one row, the record and the controls, no code */
:host([size=compact]) .card{grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr);grid-template-areas:"deck info";padding:16px;gap:0 18px;align-items:center}
:host([size=compact]) .deck{--sl:min(104px,calc(100cqw * .26));align-self:center}
:host([size=compact]) .code{display:none}
@media (prefers-reduced-motion: reduce){.vinyl{transition:none}.idle .key{animation:none}.code .t{transition:none}}
`;

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
    const colour = t.color && /^#?[0-9a-f]{3,8}$/i.test(t.color) ? (t.color.startsWith("#") ? t.color : `#${t.color}`) : "#EB6C32";
    this.style.setProperty("--tc", colour);
    this.style.setProperty("--vc", colour);
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
    const colour = LANES[e.lane];
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
