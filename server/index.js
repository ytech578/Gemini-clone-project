// server/index.js
// Single-file backend for Gemini Clone
// Usage:
// 1) cd server
// 2) npm install express cors dotenv @google/genai
// 3) create server/.env with GEMINI_API_KEY=your_key_here
// 4) node index.js
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Please set GEMINI_API_KEY in server/.env");
  process.exit(1);
}

// Initialize AI client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Models for text and vision (Gemini does NOT support image generation)
const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemma-3-27b-it"];
const DEFAULT_TEXT_MODEL = process.env.GEMINI_MODEL || TEXT_MODELS[0];

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

/* -------------------------
   Utilities
   ------------------------- */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract text from parts array
 */
function extractTextPrompt(parts = []) {
  try {
    return parts
      .map((p) => (typeof p === "object" && "text" in p ? p.text : typeof p === "string" ? p : ""))
      .filter(Boolean)
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}

/**
 * Extract text from Gemini API response
 * Consolidates duplicate logic from multiple endpoints
 */
function extractResponseText(response) {
  const candidate = response?.candidates?.[0];
  if (!candidate) return "";

  const blocks = Array.isArray(candidate.content)
    ? candidate.content
    : [candidate.content].filter(Boolean);

  return blocks.reduce((text, b) => {
    if (!b?.parts) return text;
    return text + b.parts
      .filter(p => typeof p?.text === "string")
      .map(p => p.text)
      .join("");
  }, "");
}

/**
 * Generate image using Pollinations.AI
 * This is a free service that doesn't require an API key
 */
async function generateImageWithPollinations(prompt) {
  try {
    // Clean and encode the prompt
    const cleanPrompt = prompt.trim().replace(/\s+/g, " ");
    const encodedPrompt = encodeURIComponent(cleanPrompt);

    // Pollinations.AI endpoint - completely free, no API key needed
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

    // Fetch the image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Pollinations API returned ${response.status}`);
    }

    // Get image as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to base64
    const base64Image = buffer.toString('base64');

    // Return in the format expected by frontend
    return [{
      inlineData: {
        data: base64Image,
        mimeType: 'image/png'
      }
    }];
  } catch (err) {
    console.error("Pollinations.AI image generation error:", err);
    throw err;
  }
}

/* -------------------------
   Routes
   ------------------------- */

// Text/Chat/Vision endpoint - supports both text-only and multimodal (text + images)
app.post("/api/gemini/generate-stream", async (req, res) => {
  try {
    const { prompt, parts, model, history } = req.body || {};

    // Build contents based on what was sent
    let contents = [];

    // Add conversation history first if provided
    if (history && Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg.role && msg.parts && msg.parts.length > 0) {
          contents.push({
            role: msg.role,
            parts: msg.parts
          });
        }
      }
    }

    // Add the current user message
    if (parts && Array.isArray(parts) && parts.length > 0) {
      // Multimodal request (text + images for vision)
      contents.push({ role: "user", parts });
    } else if (prompt && typeof prompt === "string") {
      // Text-only request
      contents.push({ role: "user", parts: [{ text: prompt }] });
    } else {
      return res.status(400).json({ error: "Missing 'prompt' string or 'parts' array in body." });
    }

    // Use the specified model or default (vision models like gemini-1.5-flash support images)
    const usedModel = model || DEFAULT_TEXT_MODEL;

    const response = await ai.models.generateContent({
      model: usedModel,
      contents
    });

    const text = extractResponseText(response) || "No answer returned from model.";

    res.json({ text, raw: response });
  } catch (err) {
    console.error("generate-stream error:", err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get("/api/gemini/test", (_req, res) => {
  res.json({ ok: true, message: "Gemini backend is running" });
});

// Text generation endpoint
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, model } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' string in body." });
    }
    const usedModel = model || DEFAULT_TEXT_MODEL;
    const resp = await ai.models.generateContent({
      model: usedModel,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = extractResponseText(resp);

    res.json({ text: text || "", raw: resp });
  } catch (err) {
    console.error("Text generation error:", err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// Image GENERATION endpoint (uses Pollinations.AI, NOT Gemini)
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { parts } = req.body || {};
    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ error: "Missing 'parts' array in body. Example: { parts: [{ text: '...'}] }" });
    }

    // Extract the text prompt from parts
    const prompt = extractTextPrompt(parts);

    if (!prompt) {
      return res.status(400).json({ error: "No text prompt found in parts array" });
    }

    // Generate image using Pollinations.AI
    const imageParts = await generateImageWithPollinations(prompt);

    res.json({ parts: imageParts });
  } catch (err) {
    console.error("Image generation endpoint error:", err);

    // Return a helpful error message
    res.status(500).json({
      error: "Failed to generate image. Please try again with a different prompt.",
      details: err?.message || String(err)
    });
  }
});

/* -------------------------
   Start server
   ------------------------- */
const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => console.log(`✨ Gemini API server live on http://localhost:${PORT}`));
