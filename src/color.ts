// The vinyl's colour: the cover's dominant vivid hue. Pixels are bucketed into
// 12 hue bins weighted by chroma and closeness to mid lightness (greys skipped),
// and the heaviest bin's average colour wins. Falls back to the track colour.

export type RGB = [number, number, number];

/** Pure part, testable without a canvas: RGBA bytes in, a colour (or null) out. */
export function dominantVivid(data: ArrayLike<number>): RGB | null {
  const bins = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
  for (let p = 0; p + 3 < data.length; p += 4) {
    if (data[p + 3] < 128) continue;
    const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn, l = (mx + mn) / 2;
    if (ch < 0.12) continue;
    const h = mx === r ? ((g - b) / ch + 6) % 6 : mx === g ? (b - r) / ch + 2 : (r - g) / ch + 4;
    const w = ch * (1 - Math.abs(l - 0.5) * 1.4);
    if (w <= 0) continue;
    const bin = bins[Math.floor(h * 2) % 12];
    bin[0] += data[p] * w; bin[1] += data[p + 1] * w; bin[2] += data[p + 2] * w; bin[3] += w;
  }
  const top = bins.reduce((a, b) => (b[3] > a[3] ? b : a));
  return top[3] > 0 ? [Math.round(top[0] / top[3]), Math.round(top[1] / top[3]), Math.round(top[2] / top[3])] : null;
}

const cache = new Map<string, Promise<RGB | null>>();

/** Loads `url` (it must allow cross-origin reads) and finds its dominant vivid colour. */
export function coverColour(url: string): Promise<RGB | null> {
  let hit = cache.get(url);
  if (!hit) {
    hit = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 32;
          const x = c.getContext("2d", { willReadFrequently: true });
          if (!x) return resolve(null);
          x.drawImage(img, 0, 0, 32, 32);
          resolve(dominantVivid(x.getImageData(0, 0, 32, 32).data));
        } catch {
          resolve(null); // a tainted canvas: the image did not allow cross-origin reads
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    cache.set(url, hit);
  }
  return hit;
}

export const rgbCss = ([r, g, b]: RGB) => `rgb(${r} ${g} ${b})`;
