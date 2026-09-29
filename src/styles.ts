// The player's shadow-DOM stylesheet and the theme variables pages may set.

/** The theme variables a page may set on the element (documented in the README).
 *  Every colour the player draws comes from these, the track colour, or the cover. */
export const THEME_VARS = [
  "--hj-bg", "--hj-text", "--hj-muted", "--hj-accent", "--hj-accent-text", "--hj-code-bg", "--hj-focus",
  "--hj-drums", "--hj-bass", "--hj-chords", "--hj-melody", "--hj-radius", "--hj-font", "--hj-title-font", "--hj-code-font",
] as const;

// theme="light", and theme="auto" when the viewer's system is light
const LIGHT = "--hj-bg:#F6EEE3;--hj-text:#201B17;--hj-muted:#6E625A;--hj-code-bg:rgba(32,27,23,.06);--hj-error:#B3261E;--hj-shadow:0 6px 20px rgba(32,27,23,.12)";

export const CSS = /* css */ `
:host{display:block;container-type:inline-size;
  --hj-bg:#1D1419;--hj-text:#EFE4D4;--hj-muted:#A3948B;--hj-accent:#EB6C32;--hj-accent-text:#201B17;--hj-code-bg:rgba(0,0,0,.28);--hj-focus:#4FE0BE;
  --hj-drums:#FF7A3D;--hj-bass:#A897FF;--hj-chords:#4FE0BE;--hj-melody:#FFC266;--hj-radius:18px;
  --hj-font:Nunito,system-ui,sans-serif;--hj-title-font:Archivo,system-ui,sans-serif;--hj-code-font:"JetBrains Mono",ui-monospace,monospace;
  --hj-error:#FFB4A0;--hj-shadow:0 10px 30px rgba(0,0,0,.25);
  --tc:var(--hj-accent);--vc:#2a2420;font-family:var(--hj-font);color:var(--hj-text)}
:host([hidden]){display:none}
:host([theme=light]){${LIGHT}}
@media (prefers-color-scheme: light){:host([theme=auto]){${LIGHT}}}
*{box-sizing:border-box}
.card{position:relative;height:100%;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"deck info" "code code";gap:12px 14px;padding:14px;border-radius:var(--hj-radius);overflow:hidden;
  background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 16%,transparent),transparent 55%),var(--hj-bg);box-shadow:var(--hj-shadow);transition:background .6s}
.deck{--sl:clamp(72px,24cqw,104px);grid-area:deck;position:relative;width:calc(var(--sl) * 1.3);height:var(--sl);align-self:start}
.sleeve{position:absolute;left:0;top:0;width:var(--sl);aspect-ratio:1;border-radius:6px;z-index:2;background-size:cover;background-position:center;
  background-color:color-mix(in srgb,var(--tc) 24%,#2B2328);box-shadow:0 10px 22px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.07)}
.sleeve .hole{position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:repeating-radial-gradient(circle,color-mix(in srgb,var(--vc) 30%,#0b0908) 0 1.3px,color-mix(in srgb,var(--vc) 46%,#15110f) 1.3px 2.4px);box-shadow:inset 0 3px 8px rgba(0,0,0,.6)}
.sleeve .hole i{position:absolute;inset:32%;border-radius:50%;background:var(--tc)}
.sleeve .hole i::after,.lab::after{content:"";position:absolute;inset:42%;border-radius:50%;background:#EFE4D4}
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
.title{margin:0;color:inherit;font:900 clamp(20px,6cqw,34px)/.95 var(--hj-title-font);font-stretch:72%;letter-spacing:-.01em;overflow-wrap:anywhere}
.by{font-weight:800;font-size:13px;color:var(--hj-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;margin-top:8px}
.key{appearance:none;border:0;height:40px;padding:0 16px 0 12px;border-radius:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;
  font:900 14px var(--hj-font);color:var(--hj-accent-text);background:linear-gradient(color-mix(in srgb,var(--hj-accent),#fff 18%),var(--hj-accent));
  box-shadow:0 4px 0 color-mix(in srgb,var(--hj-accent),#000 45%);transition:transform .08s,box-shadow .08s}
.key svg{width:18px;height:18px;fill:currentColor}
.key:active{transform:translateY(3px);box-shadow:0 1px 0 color-mix(in srgb,var(--hj-accent),#000 45%)}
.key:focus-visible,.jam:focus-visible,.code:focus-visible{outline:2px solid var(--hj-focus);outline-offset:3px}
.key[disabled]{opacity:.6;cursor:progress}
.idle .key{animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{0%,100%{box-shadow:0 4px 0 color-mix(in srgb,var(--hj-accent),#000 45%),0 0 0 0 color-mix(in srgb,var(--hj-accent) 45%,transparent)}
  50%{box-shadow:0 4px 0 color-mix(in srgb,var(--hj-accent),#000 45%),0 0 0 10px transparent}}
.jam{font-weight:800;font-size:13px;color:var(--hj-text);text-decoration:none;opacity:.8;white-space:nowrap;border-bottom:1.5px solid color-mix(in srgb,var(--tc) 70%,transparent)}
.jam:hover{opacity:1}
.title a{color:inherit;text-decoration:none}
.title a:hover{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.title a:focus-visible{outline:2px solid var(--hj-focus);outline-offset:3px;border-radius:4px}
.msg{margin:6px 0 0;font-size:12.5px;font-weight:700;color:var(--hj-error);min-height:0}
.msg:empty{display:none}
.code{grid-area:code;margin:0;min-height:0;max-height:220px;overflow:auto;padding:12px 14px;border-radius:12px;background:var(--hj-code-bg);
  font:500 11.5px/1.6 var(--hj-code-font);white-space:pre;color:color-mix(in srgb,var(--tc) 45%,color-mix(in srgb,var(--hj-text) 50%,transparent));tab-size:2;scrollbar-width:thin}
.code .fn{color:color-mix(in srgb,var(--hj-text) 72%,transparent)}
.code .cm{color:color-mix(in srgb,var(--hj-text) 30%,transparent)}
.code .t{border-radius:3px;transition:color .12s,background-color .12s,text-shadow .12s}
.code .t.on{color:var(--c);background:color-mix(in srgb,var(--c) 18%,transparent);text-shadow:0 0 10px var(--c)}
.meter{display:inline-flex;gap:2px;align-items:flex-end;height:12px;margin-left:8px;vertical-align:middle;opacity:0;transition:opacity .3s}
.playing .meter{opacity:1}
.meter i{width:3px;height:30%;background:var(--hj-accent);border-radius:1px;transition:height .08s}
/* wide: the record on the left, the code filling the right */
@container (min-width:560px){
  .card{grid-template-rows:auto minmax(0,1fr);grid-template-areas:"deck info" "deck code";padding:20px;gap:14px 22px}
  .deck{--sl:min(28cqw,200px)}
  .code{max-height:none}
}
/* size="compact": one row, the record and the controls; wide enough, the code too */
:host([size=compact]) .card{grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr);grid-template-areas:"deck info";padding:14px 16px;gap:0 18px;align-items:center}
:host([size=compact]) .deck{--sl:min(104px,calc(100cqw * .26));align-self:center}
:host([size=compact]) .code{display:none}
@container (min-width:720px){
  :host([size=compact]) .card{grid-template-columns:auto minmax(180px,.8fr) minmax(0,1.4fr);grid-template-areas:"deck info code"}
  :host([size=compact]) .code{display:block;align-self:stretch;max-height:none;padding:10px 12px}
}
@media (prefers-reduced-motion: reduce){.vinyl{transition:none}.idle .key{animation:none}.code .t{transition:none}}
`;
