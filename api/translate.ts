import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, targetLanguage } = req.body;

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text must be a non-empty string.' });
  }

  const validLanguages = ['pt', 'en', 'es'];
  const target = targetLanguage || 'pt';
  if (!validLanguages.includes(target)) {
    return res.status(400).json({ error: 'Invalid target language. Supported: pt, en, es' });
  }

  try {
    const ai = getGemini();

    const prompt = `Translate the following user-generated social media text to ${
      target === 'pt' ? 'Portuguese (Brazil)' : target === 'es' ? 'Spanish' : 'English'
    }.
- Preserve the exact emojis, hashtags, mentions, and line breaks.
- Preserve the original emotional intent, informal tone, slangs, or formatting perfectly.
- Translate ONLY the requested text. Absolutely do not output any introductory words, commentary, context, notes, quotes or explanations.

Text:
${text}`;

    // Race the Gemini model call against a 4-second timeout to avoid request hang on rate-limit/quota retries
    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout translating text via Gemini API")), 4000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const translatedText = response.text?.trim() || text;
    res.status(200).json({ translatedText });
  } catch (error: any) {
    const errorStr = error?.message || error?.toString() || "";
    const isRateLimit = errorStr.includes("429") || error?.status === 429 || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
    
    if (isRateLimit) {
      console.warn("[Translation API Warning] Rate limit or quota exhausted from Gemini. Serving original text.");
    } else {
      console.warn("[Translation API Error] Error fetching from Gemini:", errorStr);
    }
    // Beautiful local fallback: return original text to client
    return res.status(200).json({ translatedText: text });
  }
}
