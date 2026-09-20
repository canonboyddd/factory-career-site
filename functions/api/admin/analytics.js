function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function authorized(request, env) {
  const expected = String(env.ADMIN_TOKEN || '');
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(token && token === expected);
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      event_name TEXT NOT NULL,
      browser_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      page_name TEXT,
      page_type TEXT,
      page_title TEXT,
      landing_page TEXT,
      first_referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      program TEXT,
      placement TEXT,
      to_path TEXT,
      percent INTEGER,
      outbound_domain TEXT,
      device_type TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS owner_exclusions (
      browser_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_time ON analytics_events(occurred_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events(page_path)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_browser ON analytics_events(browser_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id)')
  ]);
}

function rows(result) {
  return result?.results || [];
}

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ ok:false, setup_required:true, missing:'ADMIN_TOKEN' }, 503);
  if (!authorized(request, env)) return json({ ok:false, error:'unauthorized' }, 401);
  if (!env.ANALYTICS_DB) return json({ ok:false, setup_required:true, missing:'ANALYTICS_DB' }, 503);

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') || 7);
  const days = [1,7,30,90].includes(requestedDays) ? requestedDays : 7;
  const modifier = `-${Math.max(days - 1, 0)} days`;
  const db = env.ANALYTICS_DB;

  try {
    await ensureSchema(db);
  } catch (error) {
    return json({
      ok:false,
      error:'schema_failed',
      detail:String(error?.message || error || 'unknown').slice(0,300)
    }, 500);
  }

  const cutoff = `datetime(date('now', '+9 hours', ?), '-9 hours')`;
  const external = `browser_id NOT IN (SELECT browser_id FROM owner_exclusions)`;
  const queryErrors = [];

  async function qFirst(name, sql, binds=[]) {
    try {
      let stmt = db.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.first();
    } catch (error) {
      queryErrors.push({name, detail:String(error?.message || error || 'unknown').slice(0,220)});
      return {};
    }
  }

  async function qAll(name, sql, binds=[]) {
    try {
      let stmt = db.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.all();
    } catch (error) {
      queryErrors.push({name, detail:String(error?.message || error || 'unknown').slice(0,220)});
      return {results:[]};
    }
  }

  const summary = await qFirst('summary', `SELECT
    COUNT(*) AS pv,
    COUNT(DISTINCT browser_id) AS browsers,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}`, [modifier]);

  const visitorMix = await qFirst('visitor_mix', `WITH period_browsers AS (
      SELECT DISTINCT browser_id
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
    ),
    first_seen AS (
      SELECT browser_id, MIN(occurred_at) AS first_seen
      FROM analytics_events
      WHERE event_name='page_view' AND ${external}
      GROUP BY browser_id
    )
    SELECT
      SUM(CASE WHEN first_seen.first_seen >= ${cutoff} THEN 1 ELSE 0 END) AS new_browsers,
      SUM(CASE WHEN first_seen.first_seen < ${cutoff} THEN 1 ELSE 0 END) AS returning_browsers
    FROM period_browsers
    JOIN first_seen ON first_seen.browser_id=period_browsers.browser_id`, [modifier, modifier]);

  const trend = await qAll('trend', `SELECT date(occurred_at, '+9 hours') AS day,
    COUNT(*) AS pv,
    COUNT(DISTINCT browser_id) AS browsers,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY date(occurred_at, '+9 hours')
    ORDER BY day ASC`, [modifier]);

  const hourly = await qAll('hourly', `SELECT strftime('%H', occurred_at, '+9 hours') AS hour,
    COUNT(*) AS pv,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY strftime('%H', occurred_at, '+9 hours')
    ORDER BY hour ASC`, [modifier]);

  const pages = await qAll('pages', `SELECT page_path,
    MAX(page_title) AS title,
    MAX(page_type) AS page_type,
    COUNT(*) AS pv,
    COUNT(DISTINCT browser_id) AS browsers,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY page_path
    ORDER BY pv DESC LIMIT 50`, [modifier]);

  const sources = await qAll('sources', `WITH session_source AS (
      SELECT session_id,
        COALESCE(NULLIF(MAX(utm_source),''), NULLIF(MAX(first_referrer),''), 'direct') AS source
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY session_id
    ),
    conversions AS (
      SELECT DISTINCT session_id
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
    )
    SELECT s.source,
      COUNT(*) AS sessions,
      SUM(CASE WHEN c.session_id IS NOT NULL THEN 1 ELSE 0 END) AS affiliate_sessions
    FROM session_source s
    LEFT JOIN conversions c ON c.session_id=s.session_id
    GROUP BY s.source
    ORDER BY sessions DESC LIMIT 30`, [modifier, modifier]);

  const landings = await qAll('landings', `SELECT
    CASE WHEN landing_page IS NULL OR landing_page='' THEN page_path ELSE landing_page END AS landing_page,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY CASE WHEN landing_page IS NULL OR landing_page='' THEN page_path ELSE landing_page END
    ORDER BY sessions DESC LIMIT 30`, [modifier]);

  const campaigns = await qAll('campaigns', `WITH session_campaign AS (
      SELECT session_id,
        MAX(utm_source) AS utm_source,
        MAX(utm_medium) AS utm_medium,
        MAX(utm_campaign) AS utm_campaign
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY session_id
    ),
    conversions AS (
      SELECT DISTINCT session_id
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
    )
    SELECT
      s.utm_source, s.utm_medium, s.utm_campaign,
      COUNT(*) AS sessions,
      SUM(CASE WHEN c.session_id IS NOT NULL THEN 1 ELSE 0 END) AS affiliate_sessions
    FROM session_campaign s
    LEFT JOIN conversions c ON c.session_id=s.session_id
    WHERE COALESCE(s.utm_source,'')<>'' OR COALESCE(s.utm_medium,'')<>'' OR COALESCE(s.utm_campaign,'')<>''
    GROUP BY s.utm_source, s.utm_medium, s.utm_campaign
    ORDER BY sessions DESC LIMIT 30`, [modifier, modifier]);

  const devices = await qAll('devices', `SELECT
    CASE WHEN device_type IS NULL OR device_type='' THEN 'unknown' ELSE device_type END AS device_type,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='page_view'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY CASE WHEN device_type IS NULL OR device_type='' THEN 'unknown' ELSE device_type END
    ORDER BY sessions DESC`, [modifier]);

  const actions = await qAll('actions', `SELECT event_name,
    COUNT(*) AS count,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE occurred_at >= ${cutoff}
      AND ${external}
      AND event_name IN (
        'comparison_page_click','diagnosis_entry_click','tool_entry_click',
        'affiliate_click_unified','engaged_30s'
      )
    GROUP BY event_name`, [modifier]);

  const affiliate = await qAll('affiliate', `WITH clicks AS (
      SELECT program, placement, page_path,
        COUNT(*) AS clicks,
        COUNT(DISTINCT session_id) AS click_sessions
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program, placement, page_path
    ),
    offers AS (
      SELECT program, page_path,
        COUNT(*) AS offer_views,
        COUNT(DISTINCT session_id) AS offer_view_sessions
      FROM analytics_events
      WHERE event_name='affiliate_offer_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program, page_path
    ),
    pvs AS (
      SELECT page_path, COUNT(*) AS pv
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    )
    SELECT clicks.program, clicks.placement, clicks.page_path,
      clicks.clicks, clicks.click_sessions,
      COALESCE(offers.offer_views,0) AS offer_views,
      COALESCE(offers.offer_view_sessions,0) AS offer_view_sessions,
      COALESCE(pvs.pv,0) AS pv
    FROM clicks
    LEFT JOIN offers ON offers.program=clicks.program AND offers.page_path=clicks.page_path
    LEFT JOIN pvs ON pvs.page_path=clicks.page_path
    ORDER BY clicks.clicks DESC LIMIT 50`, [modifier, modifier, modifier]);

  const engagement = await qAll('engagement', `WITH pv AS (
      SELECT page_path, MAX(page_title) AS title, COUNT(*) AS pv, COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    ),
    engaged AS (
      SELECT page_path, COUNT(*) AS engaged_30s
      FROM analytics_events
      WHERE event_name='engaged_30s'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    ),
    depth AS (
      SELECT page_path,
        SUM(CASE WHEN percent=25 THEN 1 ELSE 0 END) AS scroll_25,
        SUM(CASE WHEN percent=50 THEN 1 ELSE 0 END) AS scroll_50,
        SUM(CASE WHEN percent=75 THEN 1 ELSE 0 END) AS scroll_75,
        SUM(CASE WHEN percent=90 THEN 1 ELSE 0 END) AS scroll_90
      FROM analytics_events
      WHERE event_name='scroll_depth'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    ),
    clicks AS (
      SELECT page_path, COUNT(*) AS cta_clicks, COUNT(DISTINCT session_id) AS cta_sessions
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    )
    SELECT pv.page_path, pv.title, pv.pv, pv.sessions,
      COALESCE(engaged.engaged_30s,0) AS engaged_30s,
      COALESCE(depth.scroll_25,0) AS scroll_25,
      COALESCE(depth.scroll_50,0) AS scroll_50,
      COALESCE(depth.scroll_75,0) AS scroll_75,
      COALESCE(depth.scroll_90,0) AS scroll_90,
      COALESCE(clicks.cta_clicks,0) AS cta_clicks,
      COALESCE(clicks.cta_sessions,0) AS cta_sessions
    FROM pv
    LEFT JOIN engaged ON engaged.page_path=pv.page_path
    LEFT JOIN depth ON depth.page_path=pv.page_path
    LEFT JOIN clicks ON clicks.page_path=pv.page_path
    ORDER BY pv.pv DESC LIMIT 50`, [modifier, modifier, modifier, modifier]);

  const scrollDepth = await qAll('scroll_depth', `SELECT percent,
    COUNT(*) AS hits,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='scroll_depth'
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY percent ORDER BY percent ASC`, [modifier]);

  const navigation = await qAll('navigation', `SELECT page_path, to_path,
    COALESCE(NULLIF(placement,''),'link') AS link_area,
    COUNT(*) AS clicks,
    COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name='internal_navigation'
      AND occurred_at >= ${cutoff}
      AND ${external}
      AND COALESCE(to_path,'')<>''
    GROUP BY page_path, to_path, COALESCE(NULLIF(placement,''),'link')
    ORDER BY clicks DESC LIMIT 50`, [modifier]);

  const exits = await qAll('exits', `SELECT e.page_path,
    MAX(e.page_title) AS title,
    COUNT(*) AS exits
    FROM analytics_events e
    WHERE e.event_name='page_view'
      AND e.occurred_at >= ${cutoff}
      AND e.browser_id NOT IN (SELECT browser_id FROM owner_exclusions)
      AND NOT EXISTS (
        SELECT 1 FROM analytics_events e2
        WHERE e2.session_id=e.session_id
          AND e2.event_name='page_view'
          AND e2.id>e.id
      )
    GROUP BY e.page_path
    ORDER BY exits DESC LIMIT 30`, [modifier]);

  const sessionDepth = await qAll('session_depth', `WITH per_session AS (
      SELECT session_id, COUNT(*) AS pages
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY session_id
    )
    SELECT
      CASE
        WHEN pages=1 THEN '1ページ'
        WHEN pages BETWEEN 2 AND 3 THEN '2〜3ページ'
        WHEN pages BETWEEN 4 AND 5 THEN '4〜5ページ'
        ELSE '6ページ以上'
      END AS depth,
      COUNT(*) AS sessions,
      MIN(pages) AS sort_key
    FROM per_session
    GROUP BY
      CASE
        WHEN pages=1 THEN '1ページ'
        WHEN pages BETWEEN 2 AND 3 THEN '2〜3ページ'
        WHEN pages BETWEEN 4 AND 5 THEN '4〜5ページ'
        ELSE '6ページ以上'
      END
    ORDER BY sort_key ASC`, [modifier]);

  const funnel = await qFirst('funnel', `SELECT
    COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) AS visit_sessions,
    COUNT(DISTINCT CASE WHEN event_name='comparison_page_click' THEN session_id END) AS comparison_sessions,
    COUNT(DISTINCT CASE WHEN event_name='affiliate_click_unified' THEN session_id END) AS affiliate_sessions,
    COUNT(DISTINCT CASE WHEN event_name='diagnosis_entry_click' THEN session_id END) AS diagnosis_sessions
    FROM analytics_events
    WHERE occurred_at >= ${cutoff}
      AND ${external}`, [modifier]);

  const ownerCount = await qFirst('owner_count', 'SELECT COUNT(*) AS count FROM owner_exclusions');

  const pv = Number(summary?.pv || 0);
  const browsers = Number(summary?.browsers || 0);
  const sessions = Number(summary?.sessions || 0);

  return json({
    ok:true,
    generated_at:new Date().toISOString(),
    timezone:'Asia/Tokyo',
    days,
    summary:{
      pv,
      browsers,
      sessions,
      avg_pv_per_browser:browsers ? Number((pv / browsers).toFixed(2)) : 0,
      avg_pages_per_session:sessions ? Number((pv / sessions).toFixed(2)) : 0,
      new_browsers:Number(visitorMix?.new_browsers || 0),
      returning_browsers:Number(visitorMix?.returning_browsers || 0)
    },
    trend:rows(trend),
    hourly:rows(hourly),
    pages:rows(pages),
    sources:rows(sources),
    landings:rows(landings),
    campaigns:rows(campaigns),
    devices:rows(devices),
    actions:rows(actions),
    affiliate:rows(affiliate),
    engagement:rows(engagement),
    scroll_depth:rows(scrollDepth),
    navigation:rows(navigation),
    exits:rows(exits),
    session_depth:rows(sessionDepth),
    funnel:funnel || {},
    owner_exclusions:Number(ownerCount?.count || 0),
    query_errors:queryErrors
  });
}
