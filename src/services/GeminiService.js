export const generateMusicQueryWithGemini = async({
    mood,
    activity,
    note,
    recentEntries = [],
    favoriteGenres = [],
    favoriteArtists = [],
    isInstrumentalOnly = false,
    language = 'en' 
}) => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if(!apiKey) return null;

    const historySummary = recentEntries.length
        ? recentEntries.slice(0, 5).map((e, i) => 
            `Log ${i + 1}: Mood: ${(e.mood ?? 0.5).toFixed(1)}/1.0, Activity: ${e.activity || 'N/A'}, Note: "${e.note || 'None'}"`
          ).join('\n        ')
        : 'No prior logs';

    const prompt = `You are a music wellness curator. Recommend 1 natural search query for finding a YouTube playlist for:
        - Mood Score (0-1): ${mood}
        - Activity: ${activity}
        - Last 5 Logs (History):${historySummary}
        - User's Reflection/Note: "${note || 'None'}"
        - Favorite Genres: ${favoriteGenres?.join(', ') || 'Any'}
        - Favorite Artists: ${favoriteArtists?.join(', ') || 'Any'}
        - Instrumental Focus: ${isInstrumentalOnly ? 'Yes (No vocals)' : 'No'}
        
        ${language === 'pt' 
            ? 'LANGUAGE: The user speaks Portuguese. Generate the search query in natural Portuguese (e.g. "música calma para estudar", "MPB relaxante acústico").' 
            : 'LANGUAGE: The user speaks English.'}
        
        Return ONLY a single concise search phrase for YouTube (e.g. "calm lofi study beats"). No quotes, no markdown.`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                contents: [{parts: [{text: prompt}]}]
            })
        });

        const data = await response.json();
        console.log("🤖 Gemini API Response:", JSON.stringify(data, null, 2));

        const aiQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        console.log("Gemini Generated Query:" , aiQuery);
        return aiQuery || null;
    } catch (error) {
        console.error("Gemini AI error:" ,error);
        return null;
    }
}