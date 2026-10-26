const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const THUMB_BASE_URL = 'https://image.tmdb.org/t/p/w185';

/* ==========================================================================
   STRING SIMILARITY UTILITIES (Dice's Bigram Coefficient)
   ========================================================================== */

function getSimilarityScore(str1, str2) {
  const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  return (2.0 * intersection) / (b1.size + b2.size);
}

/* ==========================================================================
   TV API FUNCTIONS
   ========================================================================== */

export async function searchShows(query) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  const clean = query?.trim();
  if (!clean) return [];

  const rawUrl = (q) =>
    `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(
      q
    )}&include_adult=false`;

  try {
    // 1. Direct query
    const res = await fetch(rawUrl(clean));
    const data = await res.json();
    let results = data.results || [];
    if (results.length > 0) return results;

    // 2. Typo recovery: Query truncated prefixes and filter by Dice similarity
    if (clean.length >= 4) {
      const variants = [
        clean.slice(0, -1),
        clean.slice(0, -2),
        clean.slice(0, -3),
        clean.replace(/[aeiou]/gi, ''),
      ].filter((v) => v.length >= 3);

      for (const variant of variants) {
        const fallbackRes = await fetch(rawUrl(variant));
        const fallbackData = await fallbackRes.json();
        const candidates = fallbackData.results || [];

        if (candidates.length > 0) {
          const scored = candidates
            .map((item) => ({
              ...item,
              _score: getSimilarityScore(clean, item.name || ''),
            }))
            .filter((item) => item._score >= 0.35)
            .sort((a, b) => b._score - a._score);

          if (scored.length > 0) return scored;
        }
      }
    }

    return [];
  } catch (err) {
    console.error('TMDB TV Search Error:', err);
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
    const res = await fetch(
      `${BASE_URL}/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}`
    );
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
      firstAirDate: data.first_air_date,
    };
  } catch (err) {
    console.error('TMDB Metadata Error:', err);
    return null;
  }
}

export async function getShowRecommendations(showId) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${showId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`
    );
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
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  const clean = query?.trim();
  if (!clean) return [];

  const rawUrl = (q) =>
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      q
    )}&include_adult=false`;

  try {
    // 1. Direct query
    const res = await fetch(rawUrl(clean));
    const data = await res.json();
    let results = data.results || [];
    if (results.length > 0) return results;

    // 2. Typo recovery: Query truncated prefixes and filter by Dice similarity
    if (clean.length >= 4) {
      const variants = [
        clean.slice(0, -1),
        clean.slice(0, -2),
        clean.slice(0, -3),
        clean.replace(/[aeiou]/gi, ''),
      ].filter((v) => v.length >= 3);

      for (const variant of variants) {
        const fallbackRes = await fetch(rawUrl(variant));
        const fallbackData = await fallbackRes.json();
        const candidates = fallbackData.results || [];

        if (candidates.length > 0) {
          const scored = candidates
            .map((item) => ({
              ...item,
              _score: getSimilarityScore(clean, item.title || ''),
            }))
            .filter((item) => item._score >= 0.35)
            .sort((a, b) => b._score - a._score);

          if (scored.length > 0) return scored;
        }
      }
    }

    return [];
  } catch (err) {
    console.error('TMDB Movie Search Error:', err);
    return [];
  }
}

export async function getMovieDetails(movieId, region = 'US') {
  try {
    const res = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,release_dates,watch/providers`
    );
    const data = await res.json();
    if (!data || data.success === false) return null;

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

    const leadActors = (data.credits?.cast || []).slice(0, 3).map((actor) => actor.name);

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

export async function getMovieWatchProviders(movieId, region = 'US') {
  try {
    const res = await fetch(`${BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`);
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

export async function getMovieRecommendationsByEra(era, page = 1) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  const eraDateRanges = {
    '2020s': { gte: '2020-01-01', lte: '2029-12-31' },
    '2010s': { gte: '2010-01-01', lte: '2019-12-31' },
    '2000s': { gte: '2000-01-01', lte: '2009-12-31' },
    '1990s': { gte: '1990-01-01', lte: '1999-12-31' },
    Classic: { gte: '1920-01-01', lte: '1989-12-31' },
  };

  const range = eraDateRanges[era] || eraDateRanges['2020s'];

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&primary_release_date.gte=${range.gte}&primary_release_date.lte=${range.lte}&sort_by=vote_count.desc&vote_count.gte=300&page=${page}&include_adult=false`
    );
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('TMDB Era Recommendations Error:', err);
    return [];
  }
}