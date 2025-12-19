import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
        const { prompt, model } = req.body || {};

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Missing 'prompt' string in body." });
        }

        const usedModel = model || DEFAULT_TEXT_MODEL;
        const response = await ai.models.generateContent({
            model: usedModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const text = extractResponseText(response);

        return res.json({ text: text || "", raw: response });
    } catch (err: any) {
        console.error("Text generation error:", err);
        return res.status(500).json({ error: err?.message || String(err) });
    }
}
