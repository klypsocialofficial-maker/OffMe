import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function rankSuggestedUsers(userInterests: string[], candidates: any[]) {
  if (candidates.length === 0) return [];
  
  const prompt = `
    Analyze the following user interests based on their liked/reposted content:
    "${userInterests.join(' | ')}"

    Rank the following candidate users from most relevant to least relevant for this user to follow.
    Candidates:
    ${candidates.map(c => `- ID: ${c.id}, Name: ${c.displayName}, Username: @${c.username}, Bio: ${c.bio || 'No bio'}`).join('\n')}

    Return ONLY a JSON array of user IDs in order of relevance.
    Example: ["id1", "id2", "id3"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const rankedIds = JSON.parse(response.text || '[]');
    return rankedIds;
  } catch (error) {
    console.error("Error ranking users with Gemini:", error);
    return candidates.map(c => c.id); // Fallback to original order
  }
}
