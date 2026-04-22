import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const generateSmartSummary = async (posts: any[]) => {
  if (!ai) return "Inteligência Artificial não configurada.";

  const postsText = posts
    .map(p => `@${p.authorUsername}: ${p.content}`)
    .join("\n---\n");

  const prompt = `
    Você é o assistente do Klyp, uma rede social focada em anonimato e comunidade.
    Abaixo estão os posts mais recentes da rede. Crie um resumo curto, informal e "descolado" (estilo Gen-Z brasileira)
    dos assuntos que estão dominando agora. Use emojis. Máximo de 3 frases. 
    Linguagem: Português Brasileiro.
    IMPORTANTE: Não mencione que você é uma IA, apenas dê o "papo reto".

    POSTS:
    ${postsText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
  }
};

export const suggestPostContent = async (draft: string): Promise<string> => {
  if (!ai) return draft;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Melhore este draft de post para uma rede social moderna, tornando-o mais engajador e autêntico: "${draft}"`,
    });
    return response.text || draft;
  } catch (error) {
    console.error("AI service error:", error);
    return draft;
  }
};
