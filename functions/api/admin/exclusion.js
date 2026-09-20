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

function clean(value, max = 100) {
  return String(value ?? '').trim().slice(0, max);
}

async function ensureOwnerTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS owner_exclusions (
    browser_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
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

  try {
    const db = env.ANALYTICS_DB;
    await ensureOwnerTable(db);

    if (action === 'add') {
      await db.prepare(
        'INSERT INTO owner_exclusions (browser_id) VALUES (?) ON CONFLICT(browser_id) DO NOTHING'
      ).bind(browserId).run();
    } else {
      await db.prepare(
        'DELETE FROM owner_exclusions WHERE browser_id = ?'
      ).bind(browserId).run();
    }

    const countResult = await db.prepare(
      'SELECT COUNT(*) AS count FROM owner_exclusions'
    ).all();
    const count = Number(countResult?.results?.[0]?.count || 0);

    return json({
      ok: true,
      excluded: action === 'add',
      owner_exclusions: count
    });
  } catch (error) {
    return json({
      ok: false,
      error: 'exclusion_db_failed',
      detail: String(error?.message || error || 'unknown').slice(0, 240)
    }, 500);
  }
}
