import { useCallback, useState } from "react";

export type ToastKind = "info" | "error";
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  leaving: boolean;
}
export type Notify = (text: string, kind?: ToastKind) => void;

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<Notify>((text, kind = "info") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, text, kind, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 2600);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2900);
  }, []);

  return { toasts, push };
}
