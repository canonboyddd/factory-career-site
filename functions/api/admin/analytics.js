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
  return token && token === expected;
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
  if (!env.ADMIN_TOKEN) {
    return json({ ok: false, setup_required: true, missing: 'ADMIN_TOKEN' }, 503);
  }
  if (!authorized(request, env)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!env.ANALYTICS_DB) {
    return json({ ok: false, setup_required: true, missing: 'ANALYTICS_DB' }, 503);
  }

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') || 7);
  const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 7;
  const modifier = `-${Math.max(days - 1, 0)} days`;
  const db = env.ANALYTICS_DB;

  await ensureSchema(db);

  const external = `browser_id NOT IN (SELECT browser_id FROM owner_exclusions)`;
  const since = `occurred_at >= datetime(date('now', '+9 hours', ?), '-9 hours')`;

  const [
    summary,
    trend,
    pages,
    sources,
    landings,
    devices,
    actions,
    affiliate,
    engagement,
    funnel,
    ownerCount
  ] = await Promise.all([
    db.prepare(`SELECT
      COUNT(*) AS pv,
      COUNT(DISTINCT browser_id) AS browsers,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}`)
      .bind(modifier).first(),

    db.prepare(`SELECT date(occurred_at, '+9 hours') AS day,
      COUNT(*) AS pv,
      COUNT(DISTINCT browser_id) AS browsers
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY day ORDER BY day ASC`)
      .bind(modifier).all(),

    db.prepare(`SELECT page_path,
      MAX(page_title) AS title,
      COUNT(*) AS pv,
      COUNT(DISTINCT browser_id) AS browsers,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY page_path
      ORDER BY pv DESC LIMIT 30`)
      .bind(modifier).all(),

    db.prepare(`SELECT
      CASE WHEN first_referrer IS NULL OR first_referrer='' THEN 'direct' ELSE first_referrer END AS source,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY source
      ORDER BY sessions DESC LIMIT 20`)
      .bind(modifier).all(),

    db.prepare(`SELECT
      CASE WHEN landing_page IS NULL OR landing_page='' THEN page_path ELSE landing_page END AS landing_page,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY landing_page
      ORDER BY sessions DESC LIMIT 20`)
      .bind(modifier).all(),

    db.prepare(`SELECT
      CASE WHEN device_type IS NULL OR device_type='' THEN 'unknown' ELSE device_type END AS device_type,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY device_type
      ORDER BY sessions DESC`)
      .bind(modifier).all(),

    db.prepare(`SELECT event_name,
      COUNT(*) AS count,
      COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events
      WHERE ${since} AND ${external}
        AND event_name IN (
          'comparison_page_click','diagnosis_entry_click','tool_entry_click',
          'affiliate_click_unified','engaged_30s'
        )
      GROUP BY event_name`)
      .bind(modifier).all(),

    db.prepare(`WITH clicks AS (
      SELECT program, placement, page_path,
        COUNT(*) AS clicks,
        COUNT(DISTINCT session_id) AS click_sessions
      FROM analytics_events
      WHERE event_name='affiliate_click_unified' AND ${since} AND ${external}
      GROUP BY program, placement, page_path
    ),
    pvs AS (
      SELECT page_path, COUNT(*) AS pv
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY page_path
    )
    SELECT clicks.program, clicks.placement, clicks.page_path,
      clicks.clicks, clicks.click_sessions,
      COALESCE(pvs.pv,0) AS pv
    FROM clicks
    LEFT JOIN pvs ON pvs.page_path=clicks.page_path
    ORDER BY clicks.clicks DESC LIMIT 40`)
      .bind(modifier, modifier).all(),

    db.prepare(`WITH pv AS (
      SELECT page_path, COUNT(*) AS pv
      FROM analytics_events
      WHERE event_name='page_view' AND ${since} AND ${external}
      GROUP BY page_path
    ),
    engaged AS (
      SELECT page_path, COUNT(*) AS engaged_30s
      FROM analytics_events
      WHERE event_name='engaged_30s' AND ${since} AND ${external}
      GROUP BY page_path
    ),
    depth AS (
      SELECT page_path, COUNT(*) AS scroll_90
      FROM analytics_events
      WHERE event_name='scroll_depth' AND percent=90 AND ${since} AND ${external}
      GROUP BY page_path
    )
    SELECT pv.page_path, pv.pv,
      COALESCE(engaged.engaged_30s,0) AS engaged_30s,
      COALESCE(depth.scroll_90,0) AS scroll_90
    FROM pv
    LEFT JOIN engaged ON engaged.page_path=pv.page_path
    LEFT JOIN depth ON depth.page_path=pv.page_path
    WHERE pv.pv > 0
    ORDER BY pv.pv DESC LIMIT 30`)
      .bind(modifier, modifier, modifier).all(),

    db.prepare(`SELECT
      COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) AS visit_sessions,
      COUNT(DISTINCT CASE WHEN event_name='comparison_page_click' THEN session_id END) AS comparison_sessions,
      COUNT(DISTINCT CASE WHEN event_name='affiliate_click_unified' THEN session_id END) AS affiliate_sessions,
      COUNT(DISTINCT CASE WHEN event_name='diagnosis_entry_click' THEN session_id END) AS diagnosis_sessions
      FROM analytics_events
      WHERE ${since} AND ${external}`)
      .bind(modifier).first(),

    db.prepare('SELECT COUNT(*) AS count FROM owner_exclusions').first()
  ]);

  const pv = Number(summary?.pv || 0);
  const browsers = Number(summary?.browsers || 0);
  const sessions = Number(summary?.sessions || 0);

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    days,
    summary: {
      pv,
      browsers,
      sessions,
      avg_pv_per_browser: browsers ? Number((pv / browsers).toFixed(2)) : 0
    },
    trend: rows(trend),
    pages: rows(pages),
    sources: rows(sources),
    landings: rows(landings),
    devices: rows(devices),
    actions: rows(actions),
    affiliate: rows(affiliate),
    engagement: rows(engagement),
    funnel: funnel || {},
    owner_exclusions: Number(ownerCount?.count || 0)
  });
}
