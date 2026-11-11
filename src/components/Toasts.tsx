import type { Toast } from "../hooks/useToasts";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div id="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={"toast" + (t.kind === "error" ? " err" : "") + (t.leaving ? " out" : "")}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
