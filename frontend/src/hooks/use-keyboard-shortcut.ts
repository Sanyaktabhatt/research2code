"use client";

import { useEffect } from "react";

interface ShortcutOptions {
  key: string;
  /** true = Cmd/Ctrl must be held, false = it must NOT be held, undefined = don't care. */
  mod?: boolean;
  shift?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcut(options: ShortcutOptions, handler: () => void) {
  const { key, mod, shift, preventDefault = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      const hasMod = event.metaKey || event.ctrlKey;
      const modMatches = mod === undefined || mod === hasMod;
      const shiftMatches = shift === undefined || event.shiftKey === shift;

      if (event.key.toLowerCase() === key.toLowerCase() && modMatches && shiftMatches) {
        if (preventDefault) event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, mod, shift, preventDefault, enabled, handler]);
}
