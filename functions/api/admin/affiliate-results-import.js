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

function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function amount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function validDate(value) {
  const v = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

function validStatus(value) {
  const v = text(value, 20).toLowerCase();
  return ['pending','confirmed','cancelled','unknown'].includes(v) ? v : 'unknown';
}

function validProvider(value) {
  const v = text(value, 30).toLowerCase();
  return ['rakuten','a8','accesstrade'].includes(v) ? v : '';
}

async function ensureSchema(db) {
  await db.batch([
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
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_provider ON affiliate_results(provider)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_occurred ON affiliate_results(occurred_on)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_confirmed ON affiliate_results(confirmed_on)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_program ON affiliate_results(program_key, program_name)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_aff_results_status ON affiliate_results(status)')
  ]);
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ok:false, setup_required:true, missing:'ADMIN_TOKEN'}, 503);
  if (!authorized(request, env)) return json({ok:false, error:'unauthorized'}, 401);
  if (!env.ANALYTICS_DB) return json({ok:false, setup_required:true, missing:'ANALYTICS_DB'}, 503);

  let body = {};
  try { body = await request.json(); }
  catch (_) { return json({ok:false, error:'invalid_json'}, 400); }

  const provider = validProvider(body.provider);
  const importId = text(body.import_id, 120);
  const fileName = text(body.file_name, 240);
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 150) : [];
  if (!provider) return json({ok:false, error:'invalid_provider'}, 400);
  if (!importId) return json({ok:false, error:'missing_import_id'}, 400);
  if (!rows.length) return json({ok:false, error:'no_rows'}, 400);

  const db = env.ANALYTICS_DB;
  try { await ensureSchema(db); }
  catch (error) {
    return json({ok:false, error:'schema_failed', detail:text(error?.message || error, 300)}, 500);
  }

  const statements = [];
  let accepted = 0;
  for (const raw of rows) {
    const sourceKey = text(raw?.source_key, 180);
    if (!sourceKey) continue;
    const sourceId = text(raw?.source_id, 180);
    const occurredOn = validDate(raw?.occurred_on);
    const confirmedOn = validDate(raw?.confirmed_on);
    const status = validStatus(raw?.status);
    const programKey = text(raw?.program_key, 60);
    const programId = text(raw?.program_id, 120);
    const programName = text(raw?.program_name, 240);
    const siteName = text(raw?.site_name, 240);
    const pageUrl = text(raw?.page_url, 1000);
    const salesAmount = amount(raw?.sales_amount);
    const rewardAmount = amount(raw?.reward_amount);
    const rawJson = text(JSON.stringify(raw?.raw || {}), 5000);

    statements.push(db.prepare(`INSERT INTO affiliate_results (
      provider,source_key,source_id,occurred_on,confirmed_on,status,program_key,program_id,program_name,
      site_name,page_url,sales_amount,reward_amount,currency,imported_at,raw_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'JPY',datetime('now'),?)
    ON CONFLICT(provider,source_key) DO UPDATE SET
      source_id=excluded.source_id,
      occurred_on=COALESCE(NULLIF(excluded.occurred_on,''),affiliate_results.occurred_on),
      confirmed_on=COALESCE(NULLIF(excluded.confirmed_on,''),affiliate_results.confirmed_on),
      status=CASE WHEN excluded.status='unknown' THEN affiliate_results.status ELSE excluded.status END,
      program_key=COALESCE(NULLIF(excluded.program_key,''),affiliate_results.program_key),
      program_id=COALESCE(NULLIF(excluded.program_id,''),affiliate_results.program_id),
      program_name=COALESCE(NULLIF(excluded.program_name,''),affiliate_results.program_name),
      site_name=COALESCE(NULLIF(excluded.site_name,''),affiliate_results.site_name),
      page_url=COALESCE(NULLIF(excluded.page_url,''),affiliate_results.page_url),
      sales_amount=excluded.sales_amount,
      reward_amount=excluded.reward_amount,
      imported_at=datetime('now'),
      raw_json=excluded.raw_json`).bind(
        provider,sourceKey,sourceId,occurredOn,confirmedOn,status,programKey,programId,programName,
        siteName,pageUrl,salesAmount,rewardAmount,rawJson
      ));
    accepted += 1;
  }

  if (!statements.length) return json({ok:false, error:'no_valid_rows'}, 400);

  try {
    await db.batch(statements);
    await db.prepare(`INSERT INTO affiliate_imports(import_id,provider,file_name,row_count,imported_at)
      VALUES(?,?,?,?,datetime('now'))
      ON CONFLICT(import_id) DO UPDATE SET
        row_count=affiliate_imports.row_count + excluded.row_count,
        imported_at=datetime('now')`)
      .bind(importId, provider, fileName, accepted).run();
  } catch (error) {
    return json({ok:false, error:'import_failed', detail:text(error?.message || error, 400)}, 500);
  }

  return json({ok:true, provider, accepted, import_id:importId});
}
