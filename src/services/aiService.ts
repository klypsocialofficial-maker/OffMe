const CACHE_KEY = 'offme_smart_summary';
const CACHE_TIME_KEY = 'offme_smart_summary_time';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const generateLocalHeuristicSummary = (posts: any[]): string => {
  let summary = "";
  try {
    if (posts && posts.length > 0) {
      const tags: string[] = [];
      const users: string[] = [];
      posts.slice(0, 15).forEach((p: any) => {
        const username = p?.authorUsername || (p?.author && typeof p.author === 'object' ? p.author.username : '') || 'anonimo';
        if (username && username !== 'anonimo' && !users.includes(username)) {
          users.push(username);
        }
        const words = (p.content || '').split(/\s+/);
        words.forEach((w: string) => {
          if (w.startsWith('#') && w.length > 1 && !tags.includes(w)) {
            tags.push(w);
          }
        });
      });

      if (tags.length > 0) {
        summary = `A galera tá comentando forte sobre ${tags.slice(0, 2).join(' e ')}! Principalmente com @${users[0] || 'anonimo'} agitando o feed agora. Fica de olho! 👀🔥`;
      } else if (users.length > 0) {
        summary = `O papo tá rendendo no feed! @${users[0]} e outros perfis movimentando o OffMe com babados quentes hoje. Acompanhe! ⚡🤫`;
      }
    }
  } catch (e) {
    // silent pass
  }

  if (!summary) {
    const fallbacks = [
      "O papo no OffMe tá tão movimentado agora que o processador cansou! 🥵 Dá uma espiada direto no feed, tem fofoca quentíssima rolando!",
      "A inteligência cósmica tá de ressaca com tanto babado anônimo hoje! 😵💫 Se joga na aba do lado pra ver os posts mais recentes!",
      "O OffMe tá voando alto e com acessos recordes agora! 🔥 Corre no feed pra conferir as últimas novidades de hoje!"
    ];
    summary = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  return summary;
};

export const generateSmartSummary = async (posts: any[]): Promise<string> => {
  try {
    // 1. Check client-side session cache to avoid repeated network spam
    const cached = sessionStorage.getItem(CACHE_KEY);
    const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    if (cached && cachedTime && (now - parseInt(cachedTime, 10)) < CACHE_DURATION) {
      return cached;
    }

    // Keep only essential fields to stay well under size limits and prevent connection issues
    const lightweightPosts = (posts || []).map((p: any) => ({
      authorUsername: p?.authorUsername || (p?.author && typeof p.author === 'object' ? p.author.username : '') || 'anonimo',
      content: p?.content || '',
    }));

    const response = await fetch('/api/smart-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ posts: lightweightPosts }),
    });

    if (!response.ok) {
      throw new Error(`Endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    const result = data.summary || "O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻";
    
    // Save to cache
    sessionStorage.setItem(CACHE_KEY, result);
    sessionStorage.setItem(CACHE_TIME_KEY, now.toString());

    return result;
  } catch (error: any) {
    // Graceful fallback when rate limited (429) or endpoint is unavailable
    console.warn("[Smart Summary Warning] Server API reached limit or returned error. Using local heuristic summary.", error.message || error);
    
    const localSummary = generateLocalHeuristicSummary(posts);
    
    // Cache the heuristic result briefly so we don't spam the server on every tab click
    try {
      sessionStorage.setItem(CACHE_KEY, localSummary);
      sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {}

    return localSummary;
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
