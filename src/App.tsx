import { useRef, useState } from "react";
import { Chat, type ChatItem } from "./components/Chat";
import { AddBar } from "./components/AddBar";
import { Header } from "./components/Header";
import { Player } from "./components/Player";
import { Queue } from "./components/Queue";
import { RoomDialog } from "./components/RoomDialog";
import { Toasts } from "./components/Toasts";
import { useRoom, describeRoom } from "./hooks/useRoom";
import { useTheme } from "./hooks/useTheme";
import { useToasts } from "./hooks/useToasts";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { randomName } from "./lib/identity";
import { MAX_QUEUE, type Msg } from "./lib/protocol";

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export default function App() {
  const { toasts, push } = useToasts();
  const { toggle } = useTheme();
  const [roomOpen, setRoomOpen] = useState(false);

  // A lista csak memóriában él (session), sehova nem mentjük.
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const q = useRef({ queue: [] as string[], index: -1 }); // mindig friss érték a callbackeknek

  const commit = (nextQueue: string[], nextIndex: number) => {
    q.current = { queue: nextQueue, index: nextIndex };
    setQueue(nextQueue);
    setIndex(nextIndex);
  };

  // A lejátszó és a szoba kölcsönösen hivatkozik egymásra, ezért ref-en át küldünk.
  const sendRef = useRef<(m: Msg) => void>(() => {});
  const send = (m: Msg) => sendRef.current(m);

  const player = useYouTubePlayer({
    onPlay: (time) => send({ t: "play", time }),
    onPause: (time) => send({ t: "pause", time }),
    onSeek: (time) => send({ t: "seek", time }),
    onEnded: () => {
      const { queue: list, index: i } = q.current;
      if (i + 1 < list.length) select(i + 1);
    },
  });

  /* ---------- chat (csak memóriában) ---------- */
  const [name, setName] = useState(randomName);
  const nameRef = useRef(name);
  nameRef.current = name;
  const [chat, setChat] = useState<ChatItem[]>([]);
  const chatId = useRef(0);
  const addChat = (item: DistributiveOmit<ChatItem, "id">) =>
    setChat((c) => [...c, { ...item, id: ++chatId.current } as ChatItem].slice(-200));

  const sendChat = (text: string) => {
    addChat({ kind: "msg", name: nameRef.current, text, mine: true });
    send({ t: "chat", name: nameRef.current, text });
  };

  const rename = (next: string) => {
    const old = nameRef.current;
    setName(next);
    nameRef.current = next;
    addChat({ kind: "sys", text: `Új neved: ${next}` });
    // A host maga hirdeti a névváltást, a vendég a hostnak jelzi.
    if (room.role === "host") send({ t: "presence", kind: "rename", name: next, old });
    else send({ t: "nick", name: next });
  };

  /* ---------- lista műveletek (helyi) ---------- */
  const broadcastQueue = (load: boolean) =>
    send({ t: "queue", queue: q.current.queue, index: q.current.index, load });

  const addIds = (ids: string[]) => {
    const cur = q.current;
    const next = [...cur.queue, ...ids].slice(0, MAX_QUEUE);
    if (cur.queue.length === 0 && next.length > 0) {
      commit(next, 0);
      player.load(next[0], { autoplay: true });
      broadcastQueue(true);
    } else {
      commit(next, cur.index);
      broadcastQueue(false);
    }
  };

  const select = (i: number) => {
    const list = q.current.queue;
    if (i < 0 || i >= list.length) return;
    commit(list, i);
    player.load(list[i], { autoplay: true });
    broadcastQueue(true);
  };

  const removeAt = (i: number) => {
    const { queue: list, index: cur } = q.current;
    const wasCurrent = i === cur;
    const next = list.filter((_, k) => k !== i);
    let nextIndex = cur;
    if (i < cur) nextIndex = cur - 1;
    else if (wasCurrent) nextIndex = next.length ? Math.min(i, next.length - 1) : -1;

    commit(next, nextIndex);
    if (wasCurrent) {
      if (nextIndex < 0) player.clear();
      else player.load(next[nextIndex], { autoplay: true });
    }
    broadcastQueue(wasCurrent);
  };

  const clearAll = () => {
    commit([], -1);
    player.clear();
    broadcastQueue(true);
  };

  /* ---------- távoli üzenetek ---------- */
  const applyQueue = (list: string[], nextIndex: number, load: boolean, start = 0, autoplay = load) => {
    const old = q.current.index;
    commit(list, nextIndex);
    if (nextIndex < 0) {
      if (player.currentId()) player.clear();
      return;
    }
    const id = list[nextIndex];
    if (id !== player.currentId() || (load && nextIndex !== old)) player.load(id, { start, autoplay });
  };

  const handleMessage = (m: Msg, reply: (m: Msg) => void) => {
    switch (m.t) {
      case "play":
        if (player.currentId()) {
          player.remotePlay(m.time);
          push("Lejátszás (szinkron)");
        }
        break;
      case "pause":
        if (player.currentId()) {
          player.remotePause(m.time);
          push("Szünet (szinkron)");
        }
        break;
      case "seek":
        if (player.currentId()) player.remoteSeek(m.time);
        break;
      case "queue":
        applyQueue(m.queue, m.index, m.load);
        break;
      case "state": {
        const had = player.currentId();
        applyQueue(m.queue, m.index, false, m.time, m.playing);
        if (had && had === player.currentId() && m.index >= 0) {
          if (m.playing) player.remotePlay(m.time);
          else player.remotePause(m.time);
        }
        break;
      }
      case "chat":
        addChat({ kind: "msg", name: m.name, text: m.text, mine: false });
        break;
      case "presence": {
        const text =
          m.kind === "join"
            ? `${m.name} csatlakozott`
            : m.kind === "leave"
              ? `${m.name} kilépett`
              : `${m.old ?? "Valaki"} új neve: ${m.name}`;
        addChat({ kind: "sys", text });
        if (m.kind !== "rename") push(text);
        break;
      }
      case "hello": {
        const st = currentState();
        if (st) reply(st);
        break;
      }
    }
  };

  const currentState = (): Msg | null =>
    q.current.queue.length
      ? {
          t: "state",
          queue: q.current.queue,
          index: q.current.index,
          time: player.estTime(),
          playing: player.isPlaying(),
        }
      : null;

  const room = useRoom({ onMessage: handleMessage, getState: currentState, getName: () => nameRef.current, notify: push });
  sendRef.current = room.send;

  return (
    <div className="wrap">
      <Header roomLabel={describeRoom(room)} onOpenRoom={() => setRoomOpen(true)} onToggleTheme={toggle} />

      <main className="layout">
        <section>
          <AddBar onAdd={addIds} notify={push} />
          <Player iframeRef={player.iframeRef} src={player.src} nonce={player.nonce} onLoad={player.onLoad} />
          <p className="hint">A lista csak a munkamenet idejére él: oldalfrissítés után eltűnik, sehova nem mentjük.</p>
        </section>

        <div className="side">
          <Queue queue={queue} index={index} onSelect={select} onRemove={removeAt} onClear={clearAll} />
          <Chat items={chat} myName={name} onSend={sendChat} onRename={rename} />
        </div>
      </main>

      <RoomDialog open={roomOpen} onClose={() => setRoomOpen(false)} room={room} notify={push} />
      <Toasts toasts={toasts} />
    </div>
  );
}
