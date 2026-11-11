import { useState, type FormEvent } from "react";
import { parseYouTube } from "../lib/youtube";
import type { Notify } from "../hooks/useToasts";

interface Props {
  onAdd: (ids: string[]) => void;
  notify: Notify;
}

export function AddBar({ onAdd, notify }: Props) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parts = value.split(/[\s,]+/).filter(Boolean);
    const ids = parts.map(parseYouTube).filter((x): x is string => x !== null);
    if (!ids.length) {
      setShake((n) => n + 1);
      notify("Nem sikerült YouTube azonosítót találni a linkben.", "error");
      return;
    }
    if (ids.length < parts.length) notify("Néhány linket kihagytam, mert érvénytelen volt.", "error");
    onAdd(ids);
    setValue("");
  };

  return (
    <form className="addbar" onSubmit={submit} autoComplete="off">
      <input
        key={shake}
        className={shake ? "shake" : undefined}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Illeszd be a YouTube linket (több is mehet, szóközzel vagy új sorral elválasztva)"
        aria-label="YouTube link"
      />
      <button className="btn" type="submit">
        Hozzáadás
      </button>
    </form>
  );
}
