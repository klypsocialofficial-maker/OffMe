import { GoogleGenAI, Type } from "@google/genai";

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

  const { userInterests, candidates } = req.body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(200).json({ rankedIds: [] });
  }

  try {
    const ai = getGemini();

    const prompt = `
      Analyze the following user interests based on their liked/reposted content:
      "${(userInterests || []).join(' | ')}"

      Rank the following candidate users from most relevant to least relevant for this user to follow.
      Candidates:
      ${candidates.map((c: any) => `- ID: ${c.id}, Name: ${c.displayName}, Username: @${c.username}, Bio: ${c.bio || 'No bio'}`).join('\n')}

      Return ONLY a JSON array of user IDs in order of relevance.
      Example: ["id1", "id2", "id3"]
    `;

    // Race the Gemini model call against a 4-second timeout to avoid request hang on rate-limit/quota retries
    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ranking users via Gemini API")), 4000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const bodyText = response.text || "[]";
    let jsonStr = bodyText.trim();
    
    // Quick sanitization
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.substring(jsonStr.indexOf("["));
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf("]")) + "]";
    }

    const firstBracket = jsonStr.indexOf("[");
    const lastBracket = jsonStr.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
    }

    const rankedIds = JSON.parse(jsonStr);
    return res.status(200).json({ rankedIds, source: 'gemini' });
  } catch (error: any) {
    const errorStr = error?.message || error?.toString() || "";
    const isRateLimit = errorStr.includes("429") || error?.status === 429 || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
    
    if (isRateLimit) {
      console.warn("[Rank Suggested Users API] Rate limit or quota exhausted from Gemini. Serving inputs directly as fallback.");
    } else {
      console.warn("[Rank Suggested Users API] Error fetching from Gemini:", errorStr);
    }

    const originalIds = candidates.map((c: any) => c.id);
    return res.status(200).json({ rankedIds: originalIds, source: 'fallback' });
  }
}
