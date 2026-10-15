"use client";

import { useRef, useState } from "react";

/**
 * A text input bound to a URL param: typing updates the box immediately, and the URL
 * (which triggers the refetch) is updated after a short pause. `reset()` hands control
 * back to the URL, e.g. after "clear filters".
 */
export function useDebouncedParam(urlValue: string, commit: (value: string) => void, delay = 350) {
  const [draft, setDraft] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return {
    value: draft ?? urlValue,
    onChange(next: string) {
      setDraft(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => commit(next), delay);
    },
    reset() {
      clearTimeout(timer.current);
      setDraft(undefined);
    },
  };
}
