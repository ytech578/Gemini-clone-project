// src/services/geminiService.ts
// Frontend-only service that talks to your backend endpoints (no API key here).
// Provides createChatSession() and generateImage() used by App.tsx.

export type Part = {
  // minimal shape used by the frontend UI
  text?: string;
  mimeType?: string;
  // inlineData for image editing (base64)
  inlineData?: {
    data: string; // base64 string
    mimeType: string;
  };
  // allow other shape fields the backend may return
  [k: string]: unknown;
};

export type StreamChunk = {
  text?: string;
  candidates?: unknown[];
  // any other fields your server emits
};

type HistoryMessage = {
  role: 'user' | 'model';
  parts: Part[];
};

type SendMessageStreamArgs = {
  message: string;
  model?: string;
  parts?: Part[]; // Add support for multimodal content (images)
  history?: HistoryMessage[]; // Conversation history for context
};

/**
 * createChatSession
 * Returns a lightweight "chat session" object that has a sendMessageStream method.
 * sendMessageStream returns an async iterable that yields partial results as they arrive.
 *
 * Implementation: calls your server endpoint /api/gemini/generate-stream (POST).
 * Server should implement streaming response as NDJSON or server-sent chunks.
 */
export function createChatSession() {
  return {
    async *sendMessageStream({ message, model, parts, history }: SendMessageStreamArgs) {
      // Build the request body
      const body: Record<string, unknown> = { model };

      if (parts && parts.length > 0) {
        // Multimodal request: send parts array (includes text + images)
        body.parts = parts;
      } else {
        // Text-only request: send as prompt
        body.prompt = message;
      }

      // Include conversation history for context
      if (history && history.length > 0) {
        body.history = history;
      }

      // POST to server streaming endpoint
      const res = await fetch("/api/gemini/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // read text error for helpful message
        const errText = await res.text().catch(() => "");
        throw new Error(`Server responded ${res.status}: ${errText}`);
      }

      // If server is sending a streaming response (chunked), try to read it
      const reader = res.body?.getReader();
      if (!reader) {
        // not streaming: parse full JSON
        const json = await res.json().catch(() => null);
        if (json?.text) {
          yield { text: json.text } as StreamChunk;
        }
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // If server sends NDJSON (newline-delimited JSON) chunks, parse lines:
        let lines = buffer.split("\n");
        // keep last partial line in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // the server can send either raw text chunks or JSON chunks
          try {
            const obj = JSON.parse(trimmed);
            // standard shape: { text: "...", candidates: [...] }
            yield obj as StreamChunk;
          } catch {
            // not JSON — treat as plain text chunk
            yield { text: trimmed } as StreamChunk;
          }
        }
      }

      // If there's remaining buffer after stream end, try to parse it
      if (buffer.trim()) {
        try {
          const last = JSON.parse(buffer);
          yield last as StreamChunk;
        } catch {
          yield { text: buffer } as StreamChunk;
        }
      }
    },
  };
}

/**
 * generateImage(parts)
 * Calls the server endpoint that runs the GenAI image flow with fallback.
 * Expects server to return JSON: { parts: [...] }
 */
export async function generateImage(parts: Part[]) {
  try {
    const res = await fetch("/api/gemini/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Image API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    // server sends { parts: [...] } (or fallback: { parts: [...], fallback: true })
    return (json?.parts ?? []) as Part[];
  } catch (err) {
    console.error("generateImage error:", err);
    // Bubble up so App.tsx can render an error message
    throw err;
  }
}
