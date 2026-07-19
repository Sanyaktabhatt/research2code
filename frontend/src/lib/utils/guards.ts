export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function assertNever(value: never, message = "Unhandled case"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

/** True when the given element is a text input the user is actively typing into - guards global single-key shortcuts (zoom, page nav, fullscreen) from firing while e.g. a search box has focus. */
export function isTypingElement(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (element as HTMLElement).isContentEditable;
}
