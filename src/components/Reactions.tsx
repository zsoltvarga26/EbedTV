import { useCallback, useEffect, useRef, useState } from "react";
import { REACTIONS } from "../lib/protocol";

const MAX_FLOATING = 30;
const LIFETIME_MS = 3000;

interface Floater {
  id: number;
  emoji: string;
  x: number; // %
  drift: number; // px
}

/** Lebegő reakciók állapota; minden elem a saját élettartama után magától eltűnik. */
export function useFloaters() {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  const add = useCallback((emoji: string) => {
    const id = ++nextId.current;
    const f: Floater = { id, emoji, x: 8 + Math.random() * 84, drift: Math.round((Math.random() - 0.5) * 80) };
    setFloaters((cur) => [...cur, f].slice(-MAX_FLOATING));
    timers.current.push(window.setTimeout(() => setFloaters((cur) => cur.filter((x) => x.id !== id)), LIFETIME_MS));
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { floaters, add };
}

export function FloatLayer({ floaters }: { floaters: Floater[] }) {
  return (
    <div className="floats" aria-hidden="true">
      {floaters.map((f) => (
        <span
          key={f.id}
          className="float"
          style={{ left: `${f.x}%`, ["--drift" as string]: `${f.drift}px` }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}

export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="reactions" role="group" aria-label="Reakciók">
      {REACTIONS.map((e) => (
        <button key={e} type="button" className="react-btn" onClick={() => onReact(e)} aria-label={`Reakció: ${e}`}>
          {e}
        </button>
      ))}
    </div>
  );
}
