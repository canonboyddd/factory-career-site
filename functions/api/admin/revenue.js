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
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(expected && token && token === expected);
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
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_program ON analytics_events(program)')
  ]);
}

function rows(result) { return result?.results || []; }

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ok:false, setup_required:true, missing:'ADMIN_TOKEN'}, 503);
  if (!authorized(request, env)) return json({ok:false, error:'unauthorized'}, 401);
  if (!env.ANALYTICS_DB) return json({ok:false, setup_required:true, missing:'ANALYTICS_DB'}, 503);

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') || 7);
  const days = [1,7,30,90].includes(requestedDays) ? requestedDays : 7;
  const modifier = `-${Math.max(days - 1, 0)} days`;
  const cutoff = `datetime(date('now', '+9 hours', ?), '-9 hours')`;
  const external = `browser_id NOT IN (SELECT browser_id FROM owner_exclusions)`;
  const db = env.ANALYTICS_DB;
  const queryErrors = [];

  try { await ensureSchema(db); }
  catch (error) {
    return json({ok:false,error:'schema_failed',detail:String(error?.message || error).slice(0,300)},500);
  }

  async function qFirst(name, sql, binds=[]) {
    try {
      let stmt = db.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.first();
    } catch (error) {
      queryErrors.push({name,detail:String(error?.message || error).slice(0,220)});
      return {};
    }
  }
  async function qAll(name, sql, binds=[]) {
    try {
      let stmt = db.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.all();
    } catch (error) {
      queryErrors.push({name,detail:String(error?.message || error).slice(0,220)});
      return {results:[]};
    }
  }

  const programSummary = await qAll('program_summary', `WITH program_list(program) AS (
      VALUES ('rakuten'),('zen'),('makersJob'),('samuraiJob')
    ),
    views AS (
      SELECT program, COUNT(*) AS views, COUNT(DISTINCT session_id) AS view_sessions
      FROM analytics_events
      WHERE event_name='affiliate_offer_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program
    ),
    clicks AS (
      SELECT program, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS click_sessions,
        COUNT(DISTINCT page_path) AS clicked_pages
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program
    )
    SELECT p.program,
      COALESCE(v.views,0) AS views,
      COALESCE(v.view_sessions,0) AS view_sessions,
      COALESCE(c.clicks,0) AS clicks,
      COALESCE(c.click_sessions,0) AS click_sessions,
      COALESCE(c.clicked_pages,0) AS clicked_pages
    FROM program_list p
    LEFT JOIN views v ON v.program=p.program
    LEFT JOIN clicks c ON c.program=p.program
    ORDER BY clicks DESC, views DESC`, [modifier, modifier]);

  const pageProgram = await qAll('page_program', `WITH keys AS (
      SELECT DISTINCT program, page_path
      FROM analytics_events
      WHERE event_name IN ('affiliate_offer_view','affiliate_click_unified')
        AND occurred_at >= ${cutoff}
        AND ${external}
        AND COALESCE(program,'')<>''
    ),
    views AS (
      SELECT program, page_path, COUNT(*) AS views, COUNT(DISTINCT session_id) AS view_sessions
      FROM analytics_events
      WHERE event_name='affiliate_offer_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program,page_path
    ),
    clicks AS (
      SELECT program, page_path, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS click_sessions
      FROM analytics_events
      WHERE event_name='affiliate_click_unified'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY program,page_path
    ),
    pvs AS (
      SELECT page_path, MAX(page_title) AS title, COUNT(*) AS pv
      FROM analytics_events
      WHERE event_name='page_view'
        AND occurred_at >= ${cutoff}
        AND ${external}
      GROUP BY page_path
    )
    SELECT k.program,k.page_path,COALESCE(p.title,'') AS title,COALESCE(p.pv,0) AS pv,
      COALESCE(v.views,0) AS views,COALESCE(v.view_sessions,0) AS view_sessions,
      COALESCE(c.clicks,0) AS clicks,COALESCE(c.click_sessions,0) AS click_sessions
    FROM keys k
    LEFT JOIN views v ON v.program=k.program AND v.page_path=k.page_path
    LEFT JOIN clicks c ON c.program=k.program AND c.page_path=k.page_path
    LEFT JOIN pvs p ON p.page_path=k.page_path
    ORDER BY clicks DESC,views DESC,pv DESC LIMIT 120`, [modifier, modifier, modifier, modifier]);

  const rakutenPlacement = await qAll('rakuten_placement', `SELECT event_name,
      COALESCE(NULLIF(placement,''),'unknown') AS placement,
      COUNT(*) AS count,
      COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE program='rakuten'
      AND event_name IN ('affiliate_offer_view','affiliate_click_unified')
      AND occurred_at >= ${cutoff}
      AND ${external}
    GROUP BY event_name,COALESCE(NULLIF(placement,''),'unknown')
    ORDER BY count DESC`, [modifier]);

  const daily = await qAll('daily_program', `SELECT date(occurred_at,'+9 hours') AS day,
      program,event_name,COUNT(*) AS count,COUNT(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE event_name IN ('affiliate_offer_view','affiliate_click_unified')
      AND occurred_at >= ${cutoff}
      AND ${external}
      AND program IN ('rakuten','zen','makersJob','samuraiJob')
    GROUP BY date(occurred_at,'+9 hours'),program,event_name
    ORDER BY day ASC,program ASC,event_name ASC`, [modifier]);

  const totals = await qFirst('totals', `SELECT
      SUM(CASE WHEN event_name='affiliate_offer_view' THEN 1 ELSE 0 END) AS offer_views,
      SUM(CASE WHEN event_name='affiliate_click_unified' THEN 1 ELSE 0 END) AS clicks,
      COUNT(DISTINCT CASE WHEN event_name='affiliate_click_unified' THEN session_id END) AS click_sessions,
      COUNT(DISTINCT CASE WHEN event_name='affiliate_click_unified' THEN page_path END) AS clicked_pages
    FROM analytics_events
    WHERE occurred_at >= ${cutoff}
      AND ${external}
      AND program IN ('rakuten','zen','makersJob','samuraiJob')`, [modifier]);

  return json({
    ok:true,
    days,
    generated_at:new Date().toISOString(),
    totals:totals || {},
    programs:rows(programSummary),
    page_program:rows(pageProgram),
    rakuten_placement:rows(rakutenPlacement),
    daily:rows(daily),
    query_errors:queryErrors
  });
}
