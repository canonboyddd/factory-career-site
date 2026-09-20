const ALLOWED_EVENTS = new Set([
  'scroll_depth',
  'engaged_30s',
  'affiliate_click_unified',
  'comparison_page_click',
  'diagnosis_entry_click',
  'tool_entry_click',
  'internal_navigation',
  'external_link_click',
  'affiliate_offer_view'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
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

export async function onRequestPost({ request, env }) {
  if (!env.ANALYTICS_DB) {
    return json({ ok: false, setup_required: true, missing: 'ANALYTICS_DB' }, 503);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== requestUrl.origin) {
    return json({ ok: false, error: 'origin_not_allowed' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const eventName = clean(body.event_name, 64);
  const isPageView = eventName === 'page_view';
  if (!isPageView && !ALLOWED_EVENTS.has(eventName)) {
    return json({ ok: false, error: 'event_not_allowed' }, 400);
  }

  const browserId = clean(body.browser_id, 80);
  const sessionId = clean(body.session_id, 80);
  const pagePath = clean(body.page_path || '/', 300);
  if (!browserId || !sessionId || !pagePath.startsWith('/')) {
    return json({ ok: false, error: 'missing_required_fields' }, 400);
  }

  await ensureSchema(env.ANALYTICS_DB);

  const excluded = await env.ANALYTICS_DB
    .prepare('SELECT browser_id FROM owner_exclusions WHERE browser_id = ? LIMIT 1')
    .bind(browserId)
    .first();

  if (excluded) {
    return json({ ok: true, excluded: true });
  }

  const percent = Number.isFinite(Number(body.percent))
    ? Math.max(0, Math.min(100, Math.round(Number(body.percent))))
    : null;

  await env.ANALYTICS_DB.prepare(`INSERT INTO analytics_events (
    event_name, browser_id, session_id, page_path, page_name, page_type, page_title,
    landing_page, first_referrer, utm_source, utm_medium, utm_campaign,
    program, placement, to_path, percent, outbound_domain, device_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      eventName,
      browserId,
      sessionId,
      pagePath,
      clean(body.page_name, 120),
      clean(body.page_type, 40),
      clean(body.page_title, 200),
      clean(body.landing_page, 300),
      clean(body.first_referrer, 180),
      clean(body.utm_source, 120),
      clean(body.utm_medium, 120),
      clean(body.utm_campaign, 160),
      clean(body.program, 80),
      clean(body.placement, 140),
      clean(body.to_path, 300),
      percent,
      clean(body.outbound_domain, 180),
      clean(body.device_type, 24)
    )
    .run();

  return json({ ok: true });
}
