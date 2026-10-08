const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const THUMB_BASE_URL = 'https://image.tmdb.org/t/p/w185';

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
    if (!res.ok) return null; // Returns null silently on 404
    return await res.json();
  } catch (err) {
    // Silently return null when episode doesn't exist
    return null;
  }
}

export async function getShowMetadata(showId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}?api_key=${API_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    const network = data.networks?.[0]?.name || 'Unknown Streamer';
    const airTime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]} mins` : 'TBA';
    const genres = data.genres?.map((g) => g.name) || [];
    
    return { 
      network, 
      airTime, 
      status: data.status, 
      genres,
      numberOfSeasons: data.number_of_seasons || 1,
      numberOfEpisodes: data.number_of_episodes || 0,
      isEnded: data.status === 'Ended' || data.status === 'Canceled',
    };
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

export async function getShowExternalIds(showId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/external_ids?api_key=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('TMDB External IDs Error:', err);
    return null;
  }
}