import { useCallback, useEffect, useRef, useState } from "react";
import { parseMsg, type Msg } from "../lib/protocol";

export type Role = "host" | "guest" | null;
type Reply = (m: Msg) => void;

interface Peer {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  /** A vendég neve; a `hello` üzenettel érkezik, a host ezt írja a vendég üzeneteire. */
  name?: string;
}

export interface RoomOptions {
  /** Érvényes, validált üzenet érkezett. A `reply` csak a feladónak válaszol. */
  onMessage: (m: Msg, reply: Reply) => void;
  /** Az aktuális állapot, amit új vendégnek küldünk (null, ha nincs mit). */
  getState: () => Msg | null;
  /** A saját megjelenítendő nevünk (a belépéskor küldjük el). */
  getName: () => string;
  notify: (text: string, kind?: "info" | "error") => void;
}

const iceConfig = (lanOnly: boolean): RTCConfiguration => ({
  iceServers: lanOnly ? [] : [{ urls: "stun:stun.l.google.com:19302" }],
});

const encode = (d: RTCSessionDescriptionInit) => btoa(JSON.stringify(d));
const decode = (s: string): RTCSessionDescriptionInit => JSON.parse(atob(s.trim()));

function waitIce(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timer = setTimeout(resolve, 4000);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

export function normalizeCode(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Szoba kezelése szerver nélkül:
 *  - BroadcastChannel: ugyanazon böngésző fülei között
 *  - WebRTC DataChannel: különböző eszközök között, kézi jelzéscserével
 *    (host ↔ vendégek csillag topológia, a host továbbítja az üzeneteket)
 */
export function useRoom(options: RoomOptions) {
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [peerCount, setPeerCount] = useState(0);

  const bc = useRef<BroadcastChannel | null>(null);
  const peers = useRef<Peer[]>([]);
  const guestDc = useRef<RTCDataChannel | null>(null);
  const pending = useRef<Peer | null>(null);
  const opts = useRef(options);
  opts.current = options;

  const send = useCallback((m: Msg) => {
    bc.current?.postMessage(m);
    const s = JSON.stringify(m);
    peers.current.forEach((p) => p.dc.readyState === "open" && p.dc.send(s));
    if (guestDc.current?.readyState === "open") guestDc.current.send(s);
  }, []);

  /* ---------- helyi szoba ---------- */
  const joinLocal = useCallback((raw: string) => {
    const code = normalizeCode(raw);
    if (code.length < 3) throw new Error("Adj meg legalább 3 karakteres kódot.");
    if (!("BroadcastChannel" in window)) throw new Error("Ez a böngésző nem támogatja a BroadcastChannel-t.");
    bc.current?.close();
    const ch = new BroadcastChannel("kozos-mozi-" + code);
    ch.onmessage = (e) => {
      const m = parseMsg(e.data);
      if (m) opts.current.onMessage(m, (r) => ch.postMessage(r));
    };
    bc.current = ch;
    setLocalCode(code);
    ch.postMessage({ t: "hello", name: opts.current.getName() } satisfies Msg);
    opts.current.notify("Belépve a helyi szobába: " + code);
    return code;
  }, []);

  /** Host: jelenlét-üzenet mindenkinek (vendégeknek hálózaton, magának helyben). */
  const announce = useCallback((m: Msg) => {
    const s = JSON.stringify(m);
    peers.current.forEach((p) => p.dc.readyState === "open" && p.dc.send(s));
    opts.current.onMessage(m, () => {});
  }, []);

  /* ---------- P2P: host oldal ---------- */
  const hostInvite = useCallback(async (lanOnly: boolean) => {
    if (!("RTCPeerConnection" in window)) throw new Error("A WebRTC nem elérhető ebben a böngészőben.");
    pending.current?.pc.close();

    const pc = new RTCPeerConnection(iceConfig(lanOnly));
    const dc = pc.createDataChannel("kozos-mozi");
    const peer: Peer = { pc, dc };
    pending.current = peer;

    dc.onopen = () => {
      peers.current.push(peer);
      pending.current = null;
      setPeerCount(peers.current.length);
      setRole("host");
      const st = opts.current.getState();
      if (st) dc.send(JSON.stringify(st));
    };
    const relay = (m: Msg) => {
      const s = JSON.stringify(m);
      peers.current.forEach((o) => o !== peer && o.dc.readyState === "open" && o.dc.send(s));
    };
    dc.onmessage = (e) => {
      const m = parseMsg(e.data);
      if (!m) return;
      switch (m.t) {
        case "hello": {
          const first = peer.name === undefined;
          peer.name = m.name ?? peer.name ?? "Vendég";
          opts.current.onMessage(m, (r) => dc.send(JSON.stringify(r)));
          if (first) announce({ t: "presence", kind: "join", name: peer.name });
          break;
        }
        case "nick": {
          const old = peer.name ?? "Vendég";
          if (m.name === old) break;
          peer.name = m.name;
          announce({ t: "presence", kind: "rename", name: m.name, old });
          break;
        }
        case "chat": {
          // A feladó nevét a host állapítja meg, a vendég saját állítását eldobjuk.
          const stamped: Msg = { t: "chat", name: peer.name ?? "Vendég", text: m.text };
          opts.current.onMessage(stamped, () => {});
          relay(stamped);
          break;
        }
        case "presence":
          break; // vendég nem küldhet jelenlétet
        default:
          opts.current.onMessage(m, (r) => dc.send(JSON.stringify(r)));
          relay(m);
      }
    };
    dc.onclose = () => {
      const wasOpen = peers.current.includes(peer);
      peers.current = peers.current.filter((o) => o !== peer);
      setPeerCount(peers.current.length);
      if (!peers.current.length) setRole((r) => (r === "host" ? null : r));
      if (wasOpen) announce({ t: "presence", kind: "leave", name: peer.name ?? "Vendég" });
    };

    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    return encode(pc.localDescription!);
  }, [announce]);

  const hostFinish = useCallback(async (answer: string) => {
    if (!pending.current) throw new Error("Előbb generálj meghívó kódot.");
    try {
      await pending.current.pc.setRemoteDescription(decode(answer));
    } catch {
      throw new Error("Érvénytelen válasz kód.");
    }
  }, []);

  /* ---------- P2P: vendég oldal ---------- */
  const guestAnswer = useCallback(async (offerCode: string, lanOnly: boolean) => {
    if (!("RTCPeerConnection" in window)) throw new Error("A WebRTC nem elérhető ebben a böngészőben.");
    let offer: RTCSessionDescriptionInit;
    try {
      offer = decode(offerCode);
    } catch {
      throw new Error("Érvénytelen meghívó kód.");
    }
    const pc = new RTCPeerConnection(iceConfig(lanOnly));
    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.onopen = () => {
        guestDc.current = dc;
        setRole("guest");
        dc.send(JSON.stringify({ t: "hello", name: opts.current.getName() } satisfies Msg));
        opts.current.notify("Csatlakoztál a hosthoz.");
      };
      dc.onmessage = (ev) => {
        const m = parseMsg(ev.data);
        if (m) opts.current.onMessage(m, (r) => dc.send(JSON.stringify(r)));
      };
      dc.onclose = () => {
        guestDc.current = null;
        setRole(null);
        opts.current.notify("A kapcsolat megszakadt.", "error");
      };
    };
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    return encode(pc.localDescription!);
  }, []);

  /* ---------- kilépés ---------- */
  const leave = useCallback(() => {
    bc.current?.close();
    bc.current = null;
    peers.current.forEach((p) => p.pc.close());
    peers.current = [];
    guestDc.current?.close();
    guestDc.current = null;
    pending.current?.pc.close();
    pending.current = null;
    setLocalCode(null);
    setRole(null);
    setPeerCount(0);
  }, []);

  useEffect(() => leave, [leave]);

  return { localCode, role, peerCount, send, joinLocal, hostInvite, hostFinish, guestAnswer, leave };
}

export type RoomApi = ReturnType<typeof useRoom>;

export function describeRoom(r: Pick<RoomApi, "localCode" | "role" | "peerCount">): string | null {
  const parts: string[] = [];
  if (r.localCode) parts.push("Helyi: " + r.localCode);
  if (r.role === "host") parts.push(`Host · ${r.peerCount} vendég`);
  if (r.role === "guest") parts.push("Vendég");
  return parts.length ? parts.join(" · ") : null;
}
