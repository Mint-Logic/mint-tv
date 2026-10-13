// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')!;

webpush.setVapidDetails(
  'mailto:admin@minttv.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Get all active push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (error || !subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ message: 'No subscriptions found' }), { status: 200 });
  }

  const today = new Date().toISOString().split('T')[0];
  let sentCount = 0;

  for (const item of subscriptions) {
    // 2. Fetch user watchlist (adjust table/column name as stored in your DB schema)
    const { data: userShows } = await supabase
      .from('user_watchlists')
      .select('show_id, show_name')
      .eq('user_id', item.user_id);

    if (!userShows) continue;

    for (const show of userShows) {
      // 3. Query TMDB for today's release info
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${show.show_id}?api_key=${TMDB_API_KEY}`
      );
      const details = await res.json();

      if (details.next_episode_to_air?.air_date === today) {
        const payload = JSON.stringify({
          title: 'Episode Airing Today!',
          body: `${show.show_name} S${details.next_episode_to_air.season_number}E${details.next_episode_to_air.episode_number} drops today!`,
          url: `/show/${show.show_id}`,
        });

        try {
          await webpush.sendNotification(item.subscription, payload);
          sentCount++;
        } catch (pushErr) {
          console.error('Failed to send push notification:', pushErr);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, notifications_sent: sentCount }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );
});