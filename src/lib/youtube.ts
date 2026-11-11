export const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Linkből (vagy nyers azonosítóból) kinyeri a YouTube videó azonosítót. */
export function parseYouTube(input: string): string | null {
  const str = input.trim();
  if (ID_RE.test(str)) return str;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(str) ? str : "https://" + str);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

export interface EmbedOptions {
  start?: number;
  autoplay?: boolean;
}

/** https://www.youtube-nocookie.com/embed/{id}?enablejsapi=1&... */
export function buildEmbedUrl(id: string, { start = 0, autoplay = false }: EmbedOptions = {}): string {
  const p = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    playsinline: "1",
    autoplay: autoplay ? "1" : "0",
    start: String(Math.floor(start)),
  });
  if (/^https?:/.test(window.location.origin)) p.set("origin", window.location.origin);
  return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
}

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
