export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let posts: any[] = [];

  try {
    const body = req.body || {};
    posts = body.posts;

    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: 'Posts must be provided as an array.' });
    }

    let summary = "";
    if (posts && posts.length > 0) {
      const tags: string[] = [];
      const users: string[] = [];
      posts.slice(0, 10).forEach((p: any) => {
        if (p.authorUsername && !users.includes(p.authorUsername)) {
          users.push(p.authorUsername);
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
        summary = `O papo tá rendendo! @${users[0]} e outros perfis anônimos movimentando o universo OffMe hoje. Acompanhe! ⚡🤫`;
      }
    }

    if (!summary) {
      const fallbacks = [
        "O papo no OffMe tá tão movimentado agora que o processador cansou! 🥵 Dá uma espiada direto no feed, tem fofoca quentíssima rolando!",
        "A inteligência cósmica tá de ressaca com tanto babado anônimo hoje! 😵💫 Se joga na aba do lado pra ver os posts mais recentes!",
        "O OffMe tá voando alto e com acessos recordes agora! 🔥 Corre no feed pra conferir as últimas novidades de hoje!"
      ];
      summary = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    
    res.status(200).json({ summary, fallback: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to summarize' });
  }
}
