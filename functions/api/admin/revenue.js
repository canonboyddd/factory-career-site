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
    db.prepare(`CREATE TABLE IF NOT EXISTS affiliate_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      source_key TEXT NOT NULL,
      source_id TEXT,
      occurred_on TEXT,
      confirmed_on TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      program_key TEXT,
      program_id TEXT,
      program_name TEXT,
      site_name TEXT,
      page_url TEXT,
      sales_amount REAL NOT NULL DEFAULT 0,
      reward_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'JPY',
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      raw_json TEXT,
      UNIQUE(provider, source_key)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS affiliate_imports (
      import_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      file_name TEXT,
      row_count INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_time ON analytics_events(occurred_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_program ON analytics_events(program)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_provider ON affiliate_results(provider)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_occurred ON affiliate_results(occurred_on)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_confirmed ON affiliate_results(confirmed_on)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_program ON affiliate_results(program_key, program_name)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_status ON affiliate_results(status)')
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

  const actualProviders = await qAll('actual_providers', `WITH p(provider) AS (
      VALUES ('rakuten'),('a8'),('accesstrade')
    ), cutoff_day(day) AS (
      SELECT date('now','+9 hours', ?)
    ), a AS (
      SELECT provider,
        SUM(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS generated_reward,
        COUNT(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN 1 END) AS generated_count,
        SUM(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN sales_amount ELSE 0 END) AS sales_amount,
        SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on) >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS confirmed_reward,
        COUNT(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on) >= (SELECT day FROM cutoff_day) THEN 1 END) AS confirmed_count,
        SUM(CASE WHEN status='cancelled' AND occurred_on >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS cancelled_reward,
        COUNT(CASE WHEN status='cancelled' AND occurred_on >= (SELECT day FROM cutoff_day) THEN 1 END) AS cancelled_count
      FROM affiliate_results
      GROUP BY provider
    )
    SELECT p.provider,
      COALESCE(a.generated_reward,0) AS generated_reward,
      COALESCE(a.generated_count,0) AS generated_count,
      COALESCE(a.sales_amount,0) AS sales_amount,
      COALESCE(a.confirmed_reward,0) AS confirmed_reward,
      COALESCE(a.confirmed_count,0) AS confirmed_count,
      COALESCE(a.cancelled_reward,0) AS cancelled_reward,
      COALESCE(a.cancelled_count,0) AS cancelled_count
    FROM p LEFT JOIN a ON a.provider=p.provider
    ORDER BY confirmed_reward DESC, generated_reward DESC`, [modifier]);

  const actualPrograms = await qAll('actual_programs', `WITH cutoff_day(day) AS (
      SELECT date('now','+9 hours', ?)
    )
    SELECT provider,
      COALESCE(NULLIF(program_key,''),provider) AS program_key,
      COALESCE(NULLIF(program_name,''),COALESCE(NULLIF(program_key,''),provider)) AS program_name,
      SUM(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS generated_reward,
      COUNT(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN 1 END) AS generated_count,
      SUM(CASE WHEN occurred_on >= (SELECT day FROM cutoff_day) THEN sales_amount ELSE 0 END) AS sales_amount,
      SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on) >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS confirmed_reward,
      COUNT(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on) >= (SELECT day FROM cutoff_day) THEN 1 END) AS confirmed_count,
      SUM(CASE WHEN status='cancelled' AND occurred_on >= (SELECT day FROM cutoff_day) THEN reward_amount ELSE 0 END) AS cancelled_reward
    FROM affiliate_results
    GROUP BY provider,COALESCE(NULLIF(program_key,''),provider),COALESCE(NULLIF(program_name,''),COALESCE(NULLIF(program_key,''),provider))
    HAVING generated_count>0 OR confirmed_count>0
    ORDER BY confirmed_reward DESC, generated_reward DESC, generated_count DESC
    LIMIT 100`, [modifier]);

  const actualDaily = await qAll('actual_daily', `WITH cutoff_day(day) AS (
      SELECT date('now','+9 hours', ?)
    ), x AS (
      SELECT occurred_on AS day,provider,'generated' AS kind,reward_amount AS reward
      FROM affiliate_results
      WHERE occurred_on >= (SELECT day FROM cutoff_day)
      UNION ALL
      SELECT COALESCE(NULLIF(confirmed_on,''),occurred_on) AS day,provider,'confirmed' AS kind,reward_amount AS reward
      FROM affiliate_results
      WHERE status='confirmed'
        AND COALESCE(NULLIF(confirmed_on,''),occurred_on) >= (SELECT day FROM cutoff_day)
    )
    SELECT day,provider,kind,COUNT(*) AS count,SUM(reward) AS reward
    FROM x
    WHERE COALESCE(day,'')<>''
    GROUP BY day,provider,kind
    ORDER BY day ASC,provider ASC,kind ASC`, [modifier]);

  const latestImports = await qAll('latest_imports', `SELECT import_id,provider,file_name,row_count,imported_at
    FROM affiliate_imports
    ORDER BY imported_at DESC
    LIMIT 12`);

  return json({
    ok:true,
    days,
    generated_at:new Date().toISOString(),
    totals:totals || {},
    programs:rows(programSummary),
    page_program:rows(pageProgram),
    rakuten_placement:rows(rakutenPlacement),
    daily:rows(daily),
    actual_providers:rows(actualProviders),
    actual_programs:rows(actualPrograms),
    actual_daily:rows(actualDaily),
    latest_imports:rows(latestImports),
    query_errors:queryErrors
  });
}
