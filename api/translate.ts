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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const translatedText = response.text?.trim() || text;
    res.status(200).json({ translatedText });
  } catch (error: any) {
    console.error("[Translation API Error]", error);
    res.status(500).json({ error: 'Failed to translate content via Gemini' });
  }
}
