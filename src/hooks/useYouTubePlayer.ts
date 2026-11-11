import { useCallback, useEffect, useRef, useState } from "react";
import { buildEmbedUrl, type EmbedOptions } from "../lib/youtube";

export interface PlayerEvents {
  /** A felhasználó indította el a lejátszást (nem távoli parancs). */
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onEnded: () => void;
}

/**
 * YouTube iframe vezérlése a beépített postMessage felületen keresztül
 * (enablejsapi=1), külső <script> nélkül.
 *
 * Visszacsatolás elkerülése: távoli parancs alkalmazásakor rövid ideig
 * „elnémítjuk” a kimenő eseményeket (suppress).
 */
export function useYouTubePlayer(events: PlayerEvents) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // key az iframe-en: azonos URL esetén is újratölt

  const currentId = useRef<string | null>(null);
  const ps = useRef({ time: 0, state: -1, stamp: Date.now() });
  const suppressUntil = useRef(0);
  const ev = useRef(events);
  ev.current = events;

  const suppress = useCallback((ms = 2000) => {
    suppressUntil.current = Date.now() + ms;
  }, []);

  const estTime = useCallback(() => {
    const p = ps.current;
    return p.time + (p.state === 1 ? (Date.now() - p.stamp) / 1000 : 0);
  }, []);

  const command = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  /* --- bejövő események a YouTube iframe-ből --- */
  useEffect(() => {
    const onState = (s: number) => {
      const p = ps.current;
      if (s === p.state) return;
      const t = p.time + (p.state === 1 ? (Date.now() - p.stamp) / 1000 : 0);
      p.time = t;
      p.stamp = Date.now();
      p.state = s;
      if (Date.now() < suppressUntil.current) return;
      if (s === 1) ev.current.onPlay(t);
      else if (s === 2) ev.current.onPause(t);
      else if (s === 0) ev.current.onEnded();
    };

    const onTime = (t: number) => {
      const p = ps.current;
      const now = Date.now();
      if (now >= suppressUntil.current) {
        const expected = p.time + (p.state === 1 ? (now - p.stamp) / 1000 : 0);
        if (Math.abs(t - expected) > 1.5) ev.current.onSeek(t);
      }
      p.time = t;
      p.stamp = now;
    };

    const onMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      let d: unknown = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      if (!d || typeof d !== "object") return;
      const msg = d as { event?: string; info?: unknown };
      if (msg.event === "onStateChange" && typeof msg.info === "number") {
        onState(msg.info);
      } else if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
        const info = msg.info as { currentTime?: unknown; playerState?: unknown };
        if (typeof info.currentTime === "number") onTime(info.currentTime);
        if (typeof info.playerState === "number") onState(info.playerState);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /** Az iframe onLoad-jára kell kötni: feliratkozás a lejátszó eseményeire. */
  const onLoad = useCallback(() => {
    const listen = () =>
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        "*",
      );
    listen();
    setTimeout(listen, 600);
    setTimeout(listen, 1800);
  }, []);

  /* --- vezérlés --- */
  const load = useCallback(
    (id: string, opts: EmbedOptions = {}) => {
      currentId.current = id;
      ps.current = { time: opts.start ?? 0, state: -1, stamp: Date.now() };
      suppress(2500);
      setSrc(buildEmbedUrl(id, opts));
      setNonce((n) => n + 1);
    },
    [suppress],
  );

  const clear = useCallback(() => {
    currentId.current = null;
    setSrc(null);
  }, []);

  const remotePlay = useCallback(
    (t: number) => {
      suppress(2200);
      if (Math.abs(estTime() - t) > 1.2) command("seekTo", [t, true]);
      command("playVideo");
      ps.current.time = t;
      ps.current.stamp = Date.now();
    },
    [command, estTime, suppress],
  );

  const remotePause = useCallback(
    (t: number) => {
      suppress(2200);
      if (Math.abs(estTime() - t) > 0.5) command("seekTo", [t, true]);
      command("pauseVideo");
      ps.current.time = t;
      ps.current.stamp = Date.now();
    },
    [command, estTime, suppress],
  );

  const remoteSeek = useCallback(
    (t: number) => {
      suppress(2200);
      command("seekTo", [t, true]);
      ps.current.time = t;
      ps.current.stamp = Date.now();
    },
    [command, suppress],
  );

  return {
    iframeRef,
    src,
    nonce,
    onLoad,
    load,
    clear,
    remotePlay,
    remotePause,
    remoteSeek,
    estTime,
    isPlaying: () => ps.current.state === 1,
    currentId: () => currentId.current,
  };
}
