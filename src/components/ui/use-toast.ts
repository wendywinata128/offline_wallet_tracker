// Adapted from shadcn/ui's toast hook — a tiny external store of toasts.
import * as React from "react";
import type { ToastActionElement, ToastProps } from "./toast";

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 6000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function dispatch(next: State) {
  memoryState = next;
  listeners.forEach((l) => l(memoryState));
}

function scheduleRemoval(id: string) {
  if (timeouts.has(id)) return;
  const t = setTimeout(() => {
    timeouts.delete(id);
    dispatch({ toasts: memoryState.toasts.filter((x) => x.id !== id) });
  }, TOAST_REMOVE_DELAY);
  timeouts.set(id, t);
}

export interface ToastInput extends Omit<ToasterToast, "id"> {}

function toast(props: ToastInput) {
  const id = genId();

  const update = (patch: Partial<ToasterToast>) =>
    dispatch({
      toasts: memoryState.toasts.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });

  const dismiss = () =>
    dispatch({
      toasts: memoryState.toasts.map((t) =>
        t.id === id ? { ...t, open: false } : t,
      ),
    });

  const newToast: ToasterToast = {
    ...props,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        dismiss();
        scheduleRemoval(id);
      }
    },
  };

  dispatch({ toasts: [newToast, ...memoryState.toasts].slice(0, TOAST_LIMIT) });
  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return {
    ...state,
    toast,
    dismiss: (id?: string) =>
      dispatch({
        toasts: memoryState.toasts.map((t) =>
          id === undefined || t.id === id ? { ...t, open: false } : t,
        ),
      }),
  };
}

export { useToast, toast };
