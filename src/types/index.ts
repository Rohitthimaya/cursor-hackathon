/**
 * Jethalal AI Brain - Type Definitions
 */

export type Platform = "slack" | "telegram" | "whatsapp";

/** Incoming message from bots (POST /api/message) */
export interface IncomingMessage {
  platform: Platform;
  group_id: string;
  user_id: string;
  user_name: string;
  content: string;
  timestamp: string; // ISO8601
  message_id: string;
}

/** AI response schema returned to bots */
export interface AIResponse {
  should_respond: boolean;
  platform: Platform;
  group_id: string;
  response?: {
    type: "text" | "poll" | "reaction" | "dm";
    content: string;
    options?: string[]; // for polls
    mention_user?: string;
  };
}

/** Normalized message for internal processing */
export interface NormalizedMessage extends IncomingMessage {
  normalized_at: string;
  content_trimmed: string;
}

/** Group context loaded from MongoDB */
export interface GroupContext {
  group_id: string;
  recent_messages: Array<{
    user_name: string;
    content: string;
    timestamp: string;
  }>;
  participant_stats: Record<string, { message_count: number; last_active: string }>;
  sentiment_summary?: string;
}

/** RAG-retrieved context from Vector DB */
export interface RetrievedContext {
  messages: Array<{
    content: string;
    timestamp: string;
    relevance_score?: number;
  }>;
}
