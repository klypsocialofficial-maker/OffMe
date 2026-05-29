export const generateSmartSummary = async (posts: any[]): Promise<string> => {
  try {
    const response = await fetch('/api/smart-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ posts }),
    });

    if (!response.ok) {
      throw new Error(`Endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    return data.summary || "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
  } catch (error) {
    console.error("Error calling server smart-summary API:", error);
    return "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
  }
};

export const suggestPostContent = async (draft: string): Promise<string> => {
  try {
    const response = await fetch('/api/suggest-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ draft }),
    });

    if (!response.ok) {
      throw new Error(`Endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    return data.suggestion || draft;
  } catch (error) {
    console.error("AI service error:", error);
    return draft;
  }
};
