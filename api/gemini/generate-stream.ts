import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.GEMINI_API_KEY;

// Models configuration
const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemma-3-27b-it"];
const DEFAULT_TEXT_MODEL = process.env.GEMINI_MODEL || TEXT_MODELS[0];

/**
 * Extract text from Gemini API response
 */
function extractResponseText(response: any): string {
    const candidate = response?.candidates?.[0];
    if (!candidate) return "";

    const blocks = Array.isArray(candidate.content)
        ? candidate.content
        : [candidate.content].filter(Boolean);

    return blocks.reduce((text: string, b: any) => {
        if (!b?.parts) return text;
        return text + b.parts
            .filter((p: any) => typeof p?.text === "string")
            .map((p: any) => p.text)
            .join("");
    }, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const { prompt, parts, model, history } = req.body || {};

        // Build contents based on what was sent
        let contents: any[] = [];

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

        // Use the specified model or default
        const usedModel = model || DEFAULT_TEXT_MODEL;

        const response = await ai.models.generateContent({
            model: usedModel,
            contents
        });

        const text = extractResponseText(response) || "No answer returned from model.";

        return res.json({ text, raw: response });
    } catch (err: any) {
        console.error("generate-stream error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
}
