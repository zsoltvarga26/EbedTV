import { useEffect, useRef, useState } from "react";
import { describeRoom, randomCode, type RoomApi } from "../hooks/useRoom";
import type { Notify } from "../hooks/useToasts";

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomApi;
  notify: Notify;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function RoomDialog({ open, onClose, room, notify }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"local" | "p2p">("local");
  const [code, setCode] = useState("");
  const [lanOnly, setLanOnly] = useState(false);
  const [offerOut, setOfferOut] = useState<string | null>(null);
  const [answerIn, setAnswerIn] = useState("");
  const [offerIn, setOfferIn] = useState("");
  const [answerOut, setAnswerOut] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Ha egy vendég sikeresen csatlakozott, a meghívó doboz elrejthető.
  useEffect(() => {
    if (room.peerCount > 0) setOfferOut(null);
  }, [room.peerCount]);

  const run = async (fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Valami hiba történt.", "error");
    }
  };

  const joinLocal = (raw: string) =>
    run(() => {
      setCode(room.joinLocal(raw));
    });

  const copy = (text: string) => copyText(text).then(() => notify("Kimásolva a vágólapra."));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="d-head">
        <h2>Közös nézés</h2>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Bezárás">
          ✕
        </button>
      </div>

      <div className="d-body">
        <div className="tabs">
          <button className={"tab" + (tab === "local" ? " on" : "")} type="button" onClick={() => setTab("local")}>
            Ugyanaz a böngésző
          </button>
          <button className={"tab" + (tab === "p2p" ? " on" : "")} type="button" onClick={() => setTab("p2p")}>
            Hálózaton át (P2P)
          </button>
        </div>

        {tab === "local" && (
          <div className="card">
            <h4>Helyi szoba</h4>
            <p>
              Ugyanabban a böngészőben megnyitott fülek között működik, szerver nélkül. Nyisd meg az oldalt egy második
              fülön is, és add meg ugyanazt a kódot. Remek tesztelésre.
            </p>
            <div className="row">
              <input
                type="text"
                value={code}
                maxLength={6}
                placeholder="KÓD"
                aria-label="Szobakód"
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn" type="button" onClick={() => joinLocal(code)}>
                Belépés
              </button>
              <button className="btn ghost" type="button" onClick={() => joinLocal(randomCode())}>
                Új szoba
              </button>
            </div>
          </div>
        )}

        {tab === "p2p" && (
          <>
            <label className="chk">
              <input type="checkbox" checked={lanOnly} onChange={(e) => setLanOnly(e.target.checked)} />
              Csak helyi hálózat (STUN nélkül, internet nélkül is működik)
            </label>

            <div className="card">
              <h4>1. Szobát nyitok (host)</h4>
              <p>Minden vendéghez külön meghívó kell. Küldd el neki a kódot, majd illeszd be a válaszát.</p>
              <button
                className="btn small"
                type="button"
                onClick={() =>
                  run(async () => {
                    setAnswerIn("");
                    setOfferOut(await room.hostInvite(lanOnly));
                  })
                }
              >
                Új vendég meghívása
              </button>

              {offerOut && (
                <div>
                  <textarea readOnly value={offerOut} placeholder="Meghívó kód" />
                  <button className="btn ghost small" type="button" onClick={() => copy(offerOut)}>
                    Másolás
                  </button>
                  <textarea
                    value={answerIn}
                    onChange={(e) => setAnswerIn(e.target.value)}
                    placeholder="Ide illeszd be a vendég válasz kódját"
                  />
                  <button
                    className="btn small"
                    type="button"
                    onClick={() =>
                      run(async () => {
                        await room.hostFinish(answerIn);
                        notify("Kapcsolódás folyamatban…");
                      })
                    }
                  >
                    Összekapcsolás
                  </button>
                </div>
              )}
              {room.role === "host" && <div className="status-line">Csatlakozott vendégek: {room.peerCount}</div>}
            </div>

            <div className="card">
              <h4>2. Csatlakozom (vendég)</h4>
              <p>Illeszd be a hosttól kapott meghívó kódot, majd a generált választ küldd vissza neki.</p>
              <textarea value={offerIn} onChange={(e) => setOfferIn(e.target.value)} placeholder="Meghívó kód a hosttól" />
              <button
                className="btn small"
                type="button"
                onClick={() =>
                  run(async () => {
                    setAnswerOut(await room.guestAnswer(offerIn, lanOnly));
                  })
                }
              >
                Válasz generálása
              </button>
              {answerOut && (
                <div>
                  <textarea readOnly value={answerOut} placeholder="Válasz kód" />
                  <button className="btn ghost small" type="button" onClick={() => copy(answerOut)}>
                    Másolás
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="row between">
          <span className="status-line">{describeRoom(room) ?? "Nem vagy szobában."}</span>
          <button
            className="btn ghost small"
            type="button"
            onClick={() => {
              room.leave();
              setOfferOut(null);
              setAnswerOut(null);
              notify("Kiléptél.");
            }}
          >
            Kilépés a szobákból
          </button>
        </div>
      </div>
    </dialog>
  );
}
