import type { Citation, RagWsFrame } from "@/types/domain";

export interface AssembledStream {
  text: string;
  citations: Citation[] | null;
  error: string | null;
  isDone: boolean;
}

const EMPTY: AssembledStream = { text: "", citations: null, error: null, isDone: false };

/** Folds the raw `/rag/ws` frame log for one turn into displayable state. */
export function assembleStream(frames: unknown[] | undefined): AssembledStream {
  if (!frames || frames.length === 0) return EMPTY;

  let text = "";
  let citations: Citation[] | null = null;
  let error: string | null = null;
  let isDone = false;

  for (const raw of frames) {
    const frame = raw as RagWsFrame;
    if (frame.type === "token") {
      text += frame.content;
    } else if (frame.type === "done") {
      citations = frame.citations;
      isDone = true;
    } else if (frame.type === "error") {
      error = typeof frame.detail === "string" ? frame.detail : "The assistant couldn't answer that.";
      isDone = true;
    }
  }

  return { text, citations, error, isDone };
}
