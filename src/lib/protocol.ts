import { ID_RE } from "./youtube";

export const MAX_QUEUE = 100;

/** A szobában résztvevők között küldött üzenetek. */
export type Msg =
  | { t: "play"; time: number }
  | { t: "pause"; time: number }
  | { t: "seek"; time: number }
  | { t: "queue"; queue: string[]; index: number; load: boolean }
  | { t: "state"; queue: string[]; index: number; time: number; playing: boolean }
  | { t: "hello" };

const isTime = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;

function cleanQueue(q: unknown): string[] | null {
  if (!Array.isArray(q)) return null;
  return q.filter((x): x is string => typeof x === "string" && ID_RE.test(x)).slice(0, MAX_QUEUE);
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
    case "hello":
      return { t };
    default:
      return null;
  }
}
