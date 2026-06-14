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

  const { draft } = req.body;

  if (typeof draft !== 'string') {
    return res.status(400).json({ error: 'Draft must be a string.' });
  }

  try {
    const ai = getGemini();

    // Race the Gemini model call against a 4-second timeout to avoid request hang on rate-limit/quota retries
    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Melhore este draft de post para uma rede social moderna, tornando-o mais engajador e autêntico: "${draft}"`,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout generating post suggestion via Gemini API")), 4000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const suggestion = response.text || draft;
    res.status(200).json({ suggestion });
  } catch (error: any) {
    console.log("[Gemini Status] Suggest post rate limited or unavailable. Using draft content as dynamic suggestions.");
    res.status(200).json({ suggestion: draft, fallback: true });
  }
}
