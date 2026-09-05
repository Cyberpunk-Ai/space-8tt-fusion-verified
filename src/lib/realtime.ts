import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

export type RealtimeHandlers = Record<string, (payload: any) => void>;

const CHANNEL_NAME = "spaces-app-events";

/**
 * Lightweight event bus backed by a Supabase broadcast channel with a local
 * window-event fallback so optimistic UI updates still propagate offline.
 */
export function emitRealtime(event: string, payload: any) {
  try {
    window.dispatchEvent(new CustomEvent(`rt:${event}`, { detail: payload }));
    window.dispatchEvent(
      new CustomEvent("rt:*", {
        detail: { ...(payload && typeof payload === "object" ? payload : { payload }), type: event, event },
      }),
    );
  } catch {
    /* non-browser */
  }
  try {
    supabase.channel(CHANNEL_NAME).send({ type: "broadcast", event, payload });
  } catch {
    /* ignore transport errors */
  }
}

export function useRealtime(
  handlers: RealtimeHandlers | ((payload: any) => void),
  deps: unknown[] = [],
) {
  const normalized: RealtimeHandlers =
    typeof handlers === "function" ? { "*": handlers } : handlers;
  const ref = useRef(normalized);
  ref.current = normalized;

  useEffect(() => {
    const events = Object.keys(ref.current);
    if (events.length === 0) return;

    const localListeners = events.map((event) => {
      const listener = (e: Event) => ref.current[event]?.((e as CustomEvent).detail);
      window.addEventListener(`rt:${event}`, listener);
      return { event, listener };
    });

    const channel = supabase.channel(CHANNEL_NAME);
    for (const event of events.filter((e) => e !== "*")) {
      channel.on("broadcast", { event }, ({ payload }) => ref.current[event]?.(payload));
    }
    channel.subscribe();

    return () => {
      for (const { event, listener } of localListeners) {
        window.removeEventListener(`rt:${event}`, listener);
      }
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
