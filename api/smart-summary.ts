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

  const { posts } = req.body;

  if (!posts || !Array.isArray(posts)) {
    return res.status(400).json({ error: 'Posts must be provided as an array.' });
  }

  try {
    const ai = getGemini();

    const postsText = posts
      .map((p: any) => `@${p.authorUsername || 'anonimo'}: ${p.content || ''}`)
      .join("\n---\n");

    const prompt = `
      Você é o assistente do Klyp, uma rede social focada em anonimato e comunidade (também conhecida por OffMe).
      Abaixo estão os posts mais recentes da rede. Crie um resumo curto, informal e "descolado" (estilo Gen-Z brasileira)
      dos assuntos que estão dominando agora. Use emojis. Máximo de 3 frases. 
      Linguagem: Português Brasileiro.
      IMPORTANTE: Não mencione que você é uma IA, apenas dê o "papo reto".

      POSTS:
      ${postsText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const summary = response.text || "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error generating smart summary backend:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
