import { thumbUrl } from "../lib/youtube";

interface Props {
  queue: string[];
  index: number;
  onSelect: (i: number) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
}

export function Queue({ queue, index, onSelect, onRemove, onClear }: Props) {
  return (
    <aside className="queue">
      <div className="q-head">
        <h3>Lejátszási lista</h3>
        <small>{queue.length} videó</small>
      </div>

      {queue.length > 0 ? (
        <ul id="queue">
          {queue.map((id, i) => (
            <li key={i + id} className={"qitem" + (i === index ? " active" : "")}>
              <button type="button" className="qmain" onClick={() => onSelect(i)}>
                <div className="thumb">
                  <img src={thumbUrl(id)} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
                  <span className="num">{i === index ? "▶ megy" : i + 1}</span>
                </div>
                <div className="meta">
                  <strong>Videó {i + 1}</strong>
                  <span>youtu.be/{id}</span>
                </div>
              </button>
              <button type="button" className="qdel" aria-label="Eltávolítás" onClick={() => onRemove(i)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="q-empty">A hozzáadott videók itt jelennek meg.</div>
      )}

      {queue.length > 0 && (
        <div className="q-foot">
          <button className="btn ghost small" type="button" onClick={onClear}>
            Lista törlése
          </button>
        </div>
      )}
    </aside>
  );
}
