export async function rankSuggestedUsers(userInterests: string[], candidates: any[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  
  try {
    const response = await fetch("/api/rank-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userInterests: userInterests.slice(0, 10),
        candidates: candidates.map(c => ({
          id: c.id,
          displayName: c.displayName,
          username: c.username,
          bio: c.bio || ''
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data.rankedIds)) {
      return data.rankedIds;
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.warn("[Ranking Fallback] Using local browser heuristic ranking due to 429 quota exception or API error:", error);
    
    // Heuristic fallback ranking: rank candidates based on user interests overlaps inside their profile description
    try {
      const interestsLower = userInterests.map(i => i.toLowerCase());
      const scoredCandidates = candidates.map(c => {
        let score = 0;
        const textToMatch = `${c.displayName || ''} ${c.username || ''} ${c.bio || ''}`.toLowerCase();
        
        for (const interest of interestsLower) {
          if (textToMatch.includes(interest)) {
            // Give higher weights for interesting keyword matches
            score += 1;
          }
        }
        return { id: c.id, score };
      });
      
      // Sort candidates by score descending, then fallback to original order
      return scoredCandidates
        .sort((a, b) => b.score - a.score)
        .map(x => x.id);
    } catch (fallbackError) {
      console.warn("Local ranking heuristic failed, falling back to primitive order:", fallbackError);
      return candidates.map(c => c.id);
    }
  }
}

