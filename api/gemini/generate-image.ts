import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Extract text from parts array
 */
function extractTextPrompt(parts: any[] = []): string {
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
 * Generate image using Pollinations.AI
 * This is a free service that doesn't require an API key
 */
async function generateImageWithPollinations(prompt: string) {
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

        return res.json({ parts: imageParts });
    } catch (err: any) {
        console.error("Image generation endpoint error:", err);

        // Return a helpful error message
        return res.status(500).json({
            error: "Failed to generate image. Please try again with a different prompt.",
            details: err?.message || String(err)
        });
    }
}
