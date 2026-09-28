import { generateMusicQueryWithGemini } from "./GeminiService";

const getYoutubePlaylists = async(mood, activity, userContext = {}) => {
  const {
    language = 'en', // 
    favoriteGenres = [],
    favoriteArtists= [],
    isInstrumentalOnly = false,
    recentEntries = []
  } = userContext;
  
  const Youtube_API = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

  // 1. Multi-language Activity Dictionary
  const ACTIVITY_TERMS = {
    en: { work_study: 'study focus', relax: 'chill relaxing', exercise: 'workout gym hype' },
    pt: { work_study: 'estudo foco', relax: 'relaxar calmo', exercise: 'treino academia motivacao' }
  };
  const activityTerm = ACTIVITY_TERMS[language]?.[activity] || (language === 'pt' ? 'música' : 'music');

  const recentAvgMood = recentEntries.length 
    ? (recentEntries.reduce((sum, e) => sum + (e.mood ?? 0.5), 0) / recentEntries.length) 
    : null;

  // 2. Multi-language Mood Dictionary
  let moodTerm = language === 'pt' ? 'tranquilo' : 'chill';
  
  if (language === 'pt') {
    if (recentAvgMood !== null && recentAvgMood < 0.35) moodTerm = 'paz cura relaxante';
    else if (mood <= 0.33) moodTerm = 'calmo suave';
    else if (mood > 0.66) moodTerm = 'animado alto astral';
  } else {
    if (recentAvgMood !== null && recentAvgMood < 0.35) moodTerm = 'peaceful healing';
    else if (mood <= 0.33) moodTerm = 'calm soothing';
    else if (mood > 0.66) moodTerm = 'upbeat feel good';
  }

  // 3. Fallback Construction
  const preferArtist = favoriteArtists.length > 0 && (favoriteGenres.length === 0 || Math.random() < 0.5);
  let fallbackQuery = '';
  const instrumentalString = isInstrumentalOnly ? 'instrumental' : '';
  const songsString = language === 'pt' ? 'músicas' : 'songs';
  
  if (preferArtist) {
    const artist = favoriteArtists[Math.floor(Math.random() * favoriteArtists.length)];
    fallbackQuery = `${artist} ${moodTerm} ${isInstrumentalOnly ? instrumentalString : songsString} playlist`;
  } else if (favoriteGenres.length > 0) {
    const genre = favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)];
    fallbackQuery = `${genre} ${moodTerm} ${activityTerm} ${instrumentalString} playlist`;
  } else {
    const defaultEnGenre = activity === 'work_study' ? 'lofi' : (activity === 'exercise' ? 'rock workout' : 'chill acoustic');
    const defaultPtGenre = activity === 'work_study' ? 'lofi' : (activity === 'exercise' ? 'rock treino' : 'acústico calmo');
    const defaultGenre = language === 'pt' ? defaultPtGenre : defaultEnGenre;
    
    fallbackQuery = `${defaultGenre} ${moodTerm} ${activityTerm} ${instrumentalString} playlist`;
  }

  const aiQuery = await generateMusicQueryWithGemini({mood, activity, ...userContext});
  const searchQuery = aiQuery || fallbackQuery;
  
  console.log("🎵 Music Query Generated:", {
    isAI: Boolean(aiQuery),
    language: language,
    query: searchQuery,
  });

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=6&q=${encodeURIComponent(searchQuery)}&key=${Youtube_API}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Youtube API DATA: ", data);
    
    if(!data.items) return [];
    
    const formattedPlaylists = data.items.map(item => {
      return {
        id: item.id.playlistId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle
      };
    });
    
    return formattedPlaylists;
 } catch (error) {
    console.error(error);
    return [];
 }
}

export default getYoutubePlaylists;