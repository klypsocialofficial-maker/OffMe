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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Melhore este draft de post para uma rede social moderna, tornando-o mais engajador e autêntico: "${draft}"`,
    });

    const suggestion = response.text || draft;
    res.status(200).json({ suggestion });
  } catch (error: any) {
    console.error("Error generating post suggestion backend:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
