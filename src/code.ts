// The code view: the pattern in mono, with every token that can sound wrapped in
// a span keyed by its offset, so an event's `starts` light exactly the tokens
// that made it.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Renders `code` to HTML. Tokens get `data-at` with their offset. */
export function renderCode(code: string): string {
  let out = "", i = 0;
  const token = /[A-Za-z0-9_#]+(?:[.:][A-Za-z0-9_#]+)*/y;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      // a pattern string: its tokens are what Strudel reports locations for
      const end = code.indexOf(ch, i + 1);
      const stop = end < 0 ? code.length : end + 1;
      out += `<span class="str">${esc(ch)}`;
      let j = i + 1;
      while (j < stop - (end < 0 ? 0 : 1)) {
        token.lastIndex = j;
        const m = token.exec(code);
        if (m && m.index === j) {
          out += `<span class="t" data-at="${j}">${esc(m[0])}</span>`;
          j += m[0].length;
        } else {
          out += esc(code[j]);
          j++;
        }
      }
      if (end >= 0) out += esc(ch);
      out += "</span>";
      i = stop;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i);
      const stop = nl < 0 ? code.length : nl;
      out += `<span class="cm">${esc(code.slice(i, stop))}</span>`;
      i = stop;
      continue;
    }
    token.lastIndex = i;
    const m = token.exec(code);
    if (m && m.index === i) {
      // bare numbers and names outside strings (function args) can carry locations too
      const fn = code[i + m[0].length] === "(";
      out += fn ? `<span class="fn">${esc(m[0])}</span>` : `<span class="t" data-at="${i}">${esc(m[0])}</span>`;
      i += m[0].length;
      continue;
    }
    out += esc(ch);
    i++;
  }
  return out;
}

/** Indexes the rendered token spans under `root` by offset. */
export function indexTokens(root: ParentNode): Map<number, HTMLElement[]> {
  const map = new Map<number, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>("[data-at]").forEach((el) => {
    const at = Number(el.dataset.at);
    const list = map.get(at);
    if (list) list.push(el); else map.set(at, [el]);
  });
  return map;
}

/** Strips the common indent of inline code, so a <script> block can be indented with the page. */
export function dedent(code: string): string {
  const lines = code.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)![0].length));
  return Number.isFinite(indent) ? lines.map((l) => l.slice(indent)).join("\n") : "";
}
