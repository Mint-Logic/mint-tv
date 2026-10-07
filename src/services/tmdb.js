const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export async function searchShows(query) {
  if (!query) return [];
  try {
    const res = await fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Search Error:', err);
    return [];
  }
}

export async function getShowDetails(showId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}?api_key=${API_KEY}`);
    return await res.json();
  } catch (err) {
    console.error('TMDB Details Error:', err);
    return null;
  }
}

export async function getEpisodeDetails(showId, seasonNumber, episodeNumber) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}`);
    return await res.json();
  } catch (err) {
    console.error('TMDB Episode Error:', err);
    return null;
  }
}

export async function getNextEpisodeInfo(showId, seasonNumber, episodeNumber) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('TMDB Next Episode Error:', err);
    return null;
  }
}

export async function getShowMetadata(showId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}?api_key=${API_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    // Extract network name (e.g., Netflix, HBO, Apple TV+)
    const network = data.networks?.[0]?.name || 'Unknown Streamer';
    const airTime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]} mins` : 'TBA';
    
    return { network, airTime, status: data.status };
  } catch (err) {
    console.error('TMDB Metadata Error:', err);
    return null;
  }
}

export async function getShowRecommendations(showId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Recommendations Error:', err);
    return [];
  }
}

export async function getSeasonInfo(showId, seasonNumber) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('TMDB Season Error:', err);
    return null;
  }
}