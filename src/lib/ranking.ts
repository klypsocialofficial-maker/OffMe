export async function rankSuggestedUsers(userInterests: string[], candidates: any[]) {
  if (candidates.length === 0) return [];
  
  // Gemini dependency removed. Falling back to original order.
  return candidates.map(c => c.id);
}
