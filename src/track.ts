// Loads a published HyperJam track by slug through Convex's public HTTP API.

export const DEFAULT_API = "https://jovial-porcupine-426.convex.cloud";
export const SITE = "https://hyperjam.ai";

export type Track = {
  name: string;
  author: string;
  code: string;
  color?: string;
  bpm?: number;
  slug?: string;
  cover?: string;
};

type Row = {
  name: string;
  author: string;
  bpm: number;
  color: string;
  slug: string;
  heroCode: string | null;
  coverUrl?: string | null;
};

export async function fetchTrack(slug: string, api = DEFAULT_API, signal?: AbortSignal): Promise<Track> {
  const res = await fetch(`${api.replace(/\/$/, "")}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "tracks:getBySlug", args: { slug }, format: "json" }),
    signal,
  });
  if (!res.ok) throw new Error(`HyperJam API returned ${res.status}`);
  const body = (await res.json()) as { status: string; value?: Row | null; errorMessage?: string };
  if (body.status !== "success") throw new Error(body.errorMessage || "HyperJam API error");
  const row = body.value;
  if (!row) throw new Error(`No public track called "${slug}"`);
  if (!row.heroCode) throw new Error(`"${row.name}" has no code to play`);
  return {
    name: row.name,
    author: row.author,
    code: row.heroCode,
    color: row.color,
    bpm: row.bpm,
    slug: row.slug,
    // the track's own cover, else the one hyperjam.ai hosts for it (may not exist)
    cover: row.coverUrl || `${SITE}/covers/${encodeURIComponent(row.slug)}.jpg`,
  };
}
