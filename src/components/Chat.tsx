import { useEffect, useRef, useState, type FormEvent } from "react";
import { colorFor, initial } from "../lib/identity";
import { MAX_NAME, MAX_TEXT } from "../lib/protocol";

export type ChatItem =
  | { id: number; kind: "msg"; name: string; text: string; mine: boolean }
  | { id: number; kind: "sys"; text: string };

interface Props {
  items: ChatItem[];
  myName: string;
  onSend: (text: string) => void;
  onRename: (name: string) => void;
}

export function Chat({ items, myName, onSend, onRename }: Props) {
  const [open, setOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [nick, setNick] = useState(myName);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  useEffect(() => setNick(myName), [myName]);

  // Olvasatlan számláló: csak a mások által írt üzenetek számítanak, zárt panelnél.
  useEffect(() => {
    const fresh = items.filter((i) => i.id > lastId.current);
    lastId.current = items[items.length - 1]?.id ?? lastId.current;
    if (!open) setUnread((n) => n + fresh.filter((i) => i.kind === "msg" && !i.mine).length);
  }, [items, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Automatikus görgetés, ha az olvasó az alján volt (vagy ő írt).
  useEffect(() => {
    const el = listRef.current;
    if (!el || !open) return;
    const last = items[items.length - 1];
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom || (last?.kind === "msg" && last.mine)) el.scrollTop = el.scrollHeight;
  }, [items, open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const commitNick = () => {
    const n = nick.replace(/\s+/g, " ").trim();
    if (!n) setNick(myName);
    else if (n !== myName) onRename(n);
  };

  return (
    <section className="chat" aria-label="Chat">
      <button type="button" className="chat-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3>Chat</h3>
        {unread > 0 && <span className="badge" aria-label={`${unread} olvasatlan üzenet`}>{unread}</span>}
        <span className="chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <>
          <div className="chat-me">
            <span className="avatar" style={{ background: colorFor(myName) }} aria-hidden="true">
              {initial(myName)}
            </span>
            <input
              value={nick}
              maxLength={MAX_NAME}
              aria-label="Neved"
              onChange={(e) => setNick(e.target.value)}
              onBlur={commitNick}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>

          <div className="chat-list" ref={listRef} role="log" aria-live="polite">
            {items.length === 0 && <div className="q-empty">Még nincs üzenet. Az üzenetek csak a munkamenet idejére élnek.</div>}
            {items.map((it, i) => {
              if (it.kind === "sys") {
                return (
                  <div key={it.id} className="sys">
                    {it.text}
                  </div>
                );
              }
              const prev = items[i - 1];
              const grouped = prev?.kind === "msg" && prev.name === it.name && prev.mine === it.mine;
              const color = colorFor(it.name);
              return (
                <div key={it.id} className={"msg" + (it.mine ? " mine" : "") + (grouped ? " grouped" : "")}>
                  <span className="avatar" style={{ background: color }} aria-hidden="true">
                    {initial(it.name)}
                  </span>
                  <div className="bubble" style={it.mine ? undefined : { borderLeftColor: color }}>
                    {!grouped && (
                      <strong className="who" style={{ color: it.mine ? undefined : color }}>
                        {it.mine ? "Te" : it.name}
                      </strong>
                    )}
                    <span className="txt">{it.text}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <input
              value={draft}
              maxLength={MAX_TEXT}
              placeholder="Írj valamit…"
              aria-label="Üzenet"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn small" type="submit" disabled={!draft.trim()}>
              Küldés
            </button>
          </form>
        </>
      )}
    </section>
  );
}
