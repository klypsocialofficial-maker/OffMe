export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { draft } = req.body;

  if (typeof draft !== 'string') {
    return res.status(400).json({ error: 'Draft must be a string.' });
  }

  // Gemini is removed, just returning the draft
  res.status(200).json({ suggestion: draft, fallback: true });
}
