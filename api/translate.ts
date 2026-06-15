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

  // Gemini is removed, just returning the original text as a fallback
  res.status(200).json({ translatedText: text });
}
