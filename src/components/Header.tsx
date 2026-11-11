interface Props {
  roomLabel: string | null;
  onOpenRoom: () => void;
  onToggleTheme: () => void;
}

export function Header({ roomLabel, onOpenRoom, onToggleTheme }: Props) {
  return (
    <header className="top">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        EbédTV
      </div>
      <div className="top-actions">
        <button className={"pill" + (roomLabel ? " on" : "")} type="button" onClick={onOpenRoom} aria-label="Szoba megnyitása">
          <span className="dot" />
          <span className="label">{roomLabel ?? "Nincs szoba"}</span>
        </button>
        <button className="icon-btn" type="button" onClick={onToggleTheme} aria-label="Téma váltása">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
