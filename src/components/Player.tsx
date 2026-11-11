import type { ReactNode, RefObject } from "react";

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
  src: string | null;
  nonce: number;
  onLoad: () => void;
  /** A lejátszó fölé rétegzett tartalom (pl. lebegő reakciók). */
  overlay?: ReactNode;
}

export function Player({ iframeRef, src, nonce, onLoad, overlay }: Props) {
  return (
    <div className={"player" + (src ? " has" : "")}>
      {src && (
        <iframe
          key={nonce}
          ref={iframeRef}
          src={src}
          onLoad={onLoad}
          title="YouTube lejátszó"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
      {!src && (
        <div className="empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" />
          </svg>
          <h2>Még nincs betöltött videó</h2>
          <p>Másold be egy YouTube videó linkjét fent, és már indulhat is a vetítés.</p>
        </div>
      )}
      {overlay}
    </div>
  );
}
