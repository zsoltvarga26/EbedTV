import { ID_RE } from "./youtube";

export const MAX_QUEUE = 100;
export const MAX_NAME = 24;
export const MAX_TEXT = 500;
/** Az elküldhető emoji-reakciók fix listája; bármi más érkezik, eldobjuk. */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥", "👀"] as const;

/** Csúszóablakos korlát: legfeljebb `max` esemény `ms` időn belül. */
export function makeLimiter(max: number, ms: number) {
  let times: number[] = [];
  return () => {
    const now = Date.now();
    times = times.filter((t) => now - t < ms);
    if (times.length >= max) return false;
    times.push(now);
    return true;
  };
}

/** A szobában résztvevők között küldött üzenetek. */
export type Msg =
  | { t: "play"; time: number }
  | { t: "pause"; time: number }
  | { t: "seek"; time: number }
  | { t: "queue"; queue: string[]; index: number; load: boolean }
  | { t: "state"; queue: string[]; index: number; time: number; playing: boolean }
  | { t: "hello"; name?: string }
  /** Vendég → host: névváltás. A host nem továbbítja, hanem `presence` üzenetet küld belőle. */
  | { t: "nick"; name: string }
  /** A `name` mezőt a host írja felül a kapcsolat neve alapján, a vendég által küldött érték nem számít. */
  | { t: "chat"; name: string; text: string }
  | { t: "react"; emoji: string }
  | { t: "presence"; kind: "join" | "leave" | "rename"; name: string; old?: string };

const isTime = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;

function cleanQueue(q: unknown): string[] | null {
  if (!Array.isArray(q)) return null;
  return q.filter((x): x is string => typeof x === "string" && ID_RE.test(x)).slice(0, MAX_QUEUE);
}

/** Megjelenítendő név: vezérlő- és irányító karakterek nélkül, egyetlen szóközökkel, korlátozott hosszal. */
export function cleanName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x
    .replace(/[\p{Cc}\u200b-\u200f\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME)
    .trim();
  return s || null;
}

export function cleanText(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.replace(/[^\P{Cc}\n]/gu, "").trim();
  return s ? s.slice(0, MAX_TEXT) : null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Idegen forrásból érkező adat validálása: soha nem bízunk a hálózatban. */
export function parseMsg(raw: unknown): Msg | null {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  const t = m.t;

  switch (t) {
    case "play":
    case "pause":
    case "seek": {
      const time = m.time;
      return isTime(time) ? { t, time } : null;
    }
    case "queue": {
      const queue = cleanQueue(m.queue);
      const index = m.index;
      if (!queue || typeof index !== "number" || !Number.isInteger(index)) return null;
      return { t, queue, index: clamp(index, -1, queue.length - 1), load: !!m.load };
    }
    case "state": {
      const queue = cleanQueue(m.queue);
      const index = m.index;
      const time = m.time;
      if (!queue || typeof index !== "number" || !Number.isInteger(index) || !isTime(time)) return null;
      return { t, queue, index: clamp(index, -1, queue.length - 1), time, playing: !!m.playing };
    }
    case "hello": {
      const name = cleanName(m.name);
      return name ? { t: "hello", name } : { t: "hello" };
    }
    case "nick": {
      const name = cleanName(m.name);
      return name ? { t: "nick", name } : null;
    }
    case "chat": {
      const text = cleanText(m.text);
      return text ? { t: "chat", name: cleanName(m.name) ?? "Vendég", text } : null;
    }
    case "react": {
      const emoji = m.emoji;
      return REACTIONS.some((r) => r === emoji) ? { t: "react", emoji: emoji as string } : null;
    }
    case "presence": {
      const name = cleanName(m.name);
      const kind = m.kind;
      if (!name || (kind !== "join" && kind !== "leave" && kind !== "rename")) return null;
      const old = cleanName(m.old);
      return old ? { t: "presence", kind, name, old } : { t: "presence", kind, name };
    }
    default:
      return null;
  }
}
