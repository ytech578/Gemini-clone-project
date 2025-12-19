// src/types.ts
// Browser-friendly shared types — do NOT import Node-only SDK types here.

export type Part = {
  // Minimal shape used by the frontend UI
  text?: string;
  mimeType?: string;
  inlineData?: {
    data: string; // base64
    mimeType: string;
  };
  // Allow other arbitrary fields the backend might return
  [k: string]: unknown;
};

export type GenerationChunk = {
  text?: string;
  candidates?: {
    content?: { parts?: Part[] };
    groundingMetadata?: {
      groundingChunks?: {
        web?: { uri: string; title?: string };
      }[];
    };
  }[];
};

export type HistoryMessage = {
  role: 'user' | 'model';
  parts: Part[];
};

/**
 * A lightweight ChatSession shape for the frontend.
 * The real backend uses the Google SDK; frontend only needs something that
 * has sendMessageStream which returns an async generator of chunks.
 */
export type Chat = {
  sendMessageStream: (args: {
    message: string;
    model?: string;
    parts?: Part[]; // Support for multimodal content (images)
    history?: HistoryMessage[]; // Conversation history for context
  }) => AsyncGenerator<GenerationChunk, void, unknown>;
};

export type ChatRole = "user" | "model" | "error";

export interface GroundingSource {
  uri: string;
  title?: string;
}

export interface ChatMessage {
  role: ChatRole;
  parts: Part[];
  sources?: GroundingSource[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  // Chat session is optional to allow creating a conversation before session exists
  chatSession?: Chat;
}
