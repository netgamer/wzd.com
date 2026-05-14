import { wrap, jsonResponse } from "../_lib/auth.js";

// Reimplementation of supabase RPC `get_home_payload`. Hero / trends / feed /
// rediscovery / actions are computed against the D1 dataset. If the insight
// reader tables are empty (fresh install), every field gracefully returns
// null / [] so the existing client normalizer can still produce a usable shape.

const safeAll = async (db, query, ...args) => {
  try {
    const result = await db.prepare(query).bind(...args).all();
    return result?.results ?? [];
  } catch (error) {
    if (error?.message?.includes("no such table")) {
      return [];
    }
    throw error;
  }
};

const safeFirst = async (db, query, ...args) => {
  try {
    return (await db.prepare(query).bind(...args).first()) ?? null;
  } catch (error) {
    if (error?.message?.includes("no such table")) {
      return null;
    }
    throw error;
  }
};

const HERO_SQL = `
  SELECT id, title, summary_short, url, published_at,
         score_importance, score_monetization, score_relevance,
         (score_importance * 0.45 + score_monetization * 0.35 + score_relevance * 0.20) AS total_score
    FROM items
   WHERE status = 'processed'
   ORDER BY total_score DESC, published_at DESC NULLS LAST
   LIMIT 1
`;

const TRENDS_SQL = `
  SELECT c.id, c.name, c.description, c.score_trend,
         (SELECT COUNT(*) FROM cluster_items ci WHERE ci.cluster_id = c.id) AS item_count
    FROM clusters c
   ORDER BY c.score_trend DESC, item_count DESC
   LIMIT 5
`;

const FEED_SQL = `
  SELECT id, title, summary_short,
         COALESCE(canonical_url, url) AS url,
         published_at, score_importance, score_monetization, score_relevance
    FROM items
   WHERE status = 'processed'
   ORDER BY published_at DESC NULLS LAST, created_at DESC
   LIMIT 12
`;

const REDISCOVERY_SQL = `
  SELECT b.id AS bookmark_id, b.saved_at, b.note,
         i.id AS item_id, i.title, i.summary_short, i.url,
         i.score_importance, i.score_monetization
    FROM bookmarks b
    JOIN items i ON i.id = b.item_id
   WHERE b.user_id = ?
     AND b.saved_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
   ORDER BY i.score_monetization DESC, i.score_importance DESC, b.saved_at ASC
   LIMIT 5
`;

const ACTIONS_SQL = `
  SELECT id, title, description, action_type, difficulty, expected_value,
         item_id, cluster_id, created_at
    FROM action_suggestions
   ORDER BY created_at DESC
   LIMIT 6
`;

export const onRequestGet = wrap(async ({ env, data, request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || data?.user?.id || null;
  const db = env.DB;

  const [hero, trends, feed, rediscovery, actions] = await Promise.all([
    safeFirst(db, HERO_SQL),
    safeAll(db, TRENDS_SQL),
    safeAll(db, FEED_SQL),
    userId ? safeAll(db, REDISCOVERY_SQL, userId) : Promise.resolve([]),
    safeAll(db, ACTIONS_SQL)
  ]);

  return jsonResponse({
    hero: hero ?? null,
    trends,
    feed,
    rediscovery,
    actions
  });
});
