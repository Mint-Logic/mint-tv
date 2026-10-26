const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const THUMB_BASE_URL = 'https://image.tmdb.org/t/p/w185';

/* ==========================================================================
   TV API FUNCTIONS
   ========================================================================== */

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
      inProduction: data.in_production ?? true,
      genres,
      numberOfSeasons: data.number_of_seasons || 1,
      numberOfEpisodes: data.number_of_episodes || 0,
      isEnded: data.status === 'Ended' || data.status === 'Canceled',
      firstAirDate: data.first_air_date, // Passes the premiere date to the watchlist
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

/* ==========================================================================
   MOVIE API FUNCTIONS
   ========================================================================== */

/**
 * Search movies by text query
 */
export async function getTrendingMovies() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&include_adult=false`
    );
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Trending Movies Error:', err);
    return [];
  }
}

export async function searchMovies(query) {
  if (!query || !query.trim()) return [];
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
        query.trim()
      )}&include_adult=false`
    );
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Movie Search Error:', err);
    return [];
  }
}

/**
 * Fetch full movie details including credits (cast), release dates (MPAA certification),
 * and watch providers (streaming/rental options) in a single round-trip.
 */
export async function getMovieDetails(movieId, region = 'US') {
  try {
    const res = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,release_dates,watch/providers`
    );
    const data = await res.json();
    if (!data || data.success === false) return null;

    // 1. Extract US (or target region) MPAA Certification
    let mpaaRating = 'NR';
    const releaseResults = data.release_dates?.results || [];
    const regionRelease =
      releaseResults.find((r) => r.iso_3166_1 === region) ||
      releaseResults.find((r) => r.iso_3166_1 === 'US');

    if (regionRelease?.release_dates?.length > 0) {
      const match = regionRelease.release_dates.find(
        (d) => d.certification && d.certification.trim() !== ''
      );
      if (match) mpaaRating = match.certification;
    }

    // 2. Extract Top 3 Lead Actors (Option B Card Layout)
    const leadActors = (data.credits?.cast || [])
      .slice(0, 3)
      .map((actor) => actor.name);

    // 3. Extract Watch Providers for Target Region
    const regionProviders = data['watch/providers']?.results?.[region] || {};
    const flatrate = (regionProviders.flatrate || []).map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
    }));
    const free = (regionProviders.free || regionProviders.ads || []).map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
    }));
    const rent = (regionProviders.rent || []).map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
    }));
    const buy = (regionProviders.buy || []).map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
    }));

    // 4. Format Runtime (e.g., 124 -> "2h 04m")
    const runtimeFormatted = data.runtime
      ? `${Math.floor(data.runtime / 60)}h ${String(data.runtime % 60).padStart(2, '0')}m`
      : 'N/A';

    return {
      id: data.id,
      title: data.title,
      overview: data.overview || '',
      poster: data.poster_path || '',
      backdrop: data.backdrop_path || '',
      releaseDate: data.release_date || '',
      releaseYear: data.release_date ? data.release_date.split('-')[0] : '',
      runtime: data.runtime || 0,
      runtimeFormatted,
      mpaaRating,
      tmdbRating: data.vote_average ? data.vote_average.toFixed(1) : null,
      leadActors,
      imdbId: data.imdb_id || null,
      providers: {
        flatrate,
        free,
        rent,
        buy,
        link: regionProviders.link || null,
      },
      lastFetched: Date.now(),
    };
  } catch (err) {
    console.error(`TMDB Movie Details Error (${movieId}):`, err);
    return null;
  }
}

/**
 * Lightweight check to refresh only watch providers (for background revalidation)
 */
export async function getMovieWatchProviders(movieId, region = 'US') {
  try {
    const res = await fetch(
      `${BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`
    );
    const data = await res.json();
    const regionProviders = data.results?.[region] || {};

    return {
      flatrate: (regionProviders.flatrate || []).map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
      })),
      free: (regionProviders.free || regionProviders.ads || []).map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
      })),
      rent: (regionProviders.rent || []).map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
      })),
      buy: (regionProviders.buy || []).map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
      })),
      lastFetched: Date.now(),
    };
  } catch (err) {
    console.error(`TMDB Provider Refresh Error (${movieId}):`, err);
    return null;
  }
}

/**
 * Discover movies by Era and popularity for the For You tab
 */
export async function getMovieRecommendationsByEra(era = '2020s', page = 1) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;

  let dateFilter = '';
  if (era === '2020s') dateFilter = '&primary_release_date.gte=2020-01-01';
  else if (era === '2010s') dateFilter = '&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31';
  else if (era === '2000s') dateFilter = '&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31';
  else if (era === '1990s') dateFilter = '&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31';
  else if (era === 'Classic') dateFilter = '&primary_release_date.lte=1989-12-31';

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&vote_count.gte=300&include_adult=false&page=${page}${dateFilter}`
    );
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Movie Discover Error:', err);
    return [];
  }
}