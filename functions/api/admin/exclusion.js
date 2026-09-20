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

function clean(value, max = 100) {
  return String(value ?? '').trim().slice(0, max);
}

async function ensureSchema(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS owner_exclusions (
    browser_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_TOKEN) {
    return json({ ok: false, setup_required: true, missing: 'ADMIN_TOKEN' }, 503);
  }
  if (!authorized(request, env)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!env.ANALYTICS_DB) {
    return json({ ok: false, setup_required: true, missing: 'ANALYTICS_DB' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const browserId = clean(body.browser_id, 80);
  const action = clean(body.action, 20);
  if (!browserId || !['add', 'remove'].includes(action)) {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  await ensureSchema(env.ANALYTICS_DB);

  if (action === 'add') {
    await env.ANALYTICS_DB
      .prepare('INSERT OR IGNORE INTO owner_exclusions(browser_id) VALUES (?)')
      .bind(browserId)
      .run();
  } else {
    await env.ANALYTICS_DB
      .prepare('DELETE FROM owner_exclusions WHERE browser_id = ?')
      .bind(browserId)
      .run();
  }

  const row = await env.ANALYTICS_DB
    .prepare('SELECT COUNT(*) AS count FROM owner_exclusions')
    .first();

  return json({
    ok: true,
    excluded: action === 'add',
    owner_exclusions: Number(row?.count || 0)
  });
}
