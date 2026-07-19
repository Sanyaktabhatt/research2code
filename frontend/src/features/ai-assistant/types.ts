import type { Citation } from "@/types/domain";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Only ever present on assistant messages. */
  citations?: Citation[];
  createdAt: string;
  /** Set when this turn's request errored - lets the composer offer Retry inline. */
  error?: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
