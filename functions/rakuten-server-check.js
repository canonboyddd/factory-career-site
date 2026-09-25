function esc(v='') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function page(lines) {
  return new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Rakuten server diagnostics</title></head><body><h1>Rakuten server diagnostics</h1><pre>${esc(lines.join('\n'))}</pre></body></html>`, {
    status: 200,
    headers: {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}
  });
}

export async function onRequestGet({ env }) {
  const appId = String(env.RAKUTEN_APP_ID || '').trim();
  const accessKey = String(env.RAKUTEN_ACCESS_KEY || '').trim();
  const affiliateId = String(env.RAKUTEN_AFFILIATE_ID || '').trim();
  const lines = [];
  lines.push(`RAKUTEN_APP_ID: ${appId ? 'present' : 'missing'}`);
  lines.push(`RAKUTEN_ACCESS_KEY: ${accessKey ? 'present' : 'missing'}`);
  lines.push(`RAKUTEN_AFFILIATE_ID: ${affiliateId ? 'present' : 'missing'}`);

  if (!appId || !accessKey) return page(lines);

  async function test(useAffiliate) {
    const p = new URLSearchParams({
      applicationId: appId,
      accessKey,
      keyword: '楽天',
      hits: '1',
      format: 'json',
      formatVersion: '2'
    });
    if (useAffiliate && affiliateId) p.set('affiliateId', affiliateId);
    const endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${p}`;
    try {
      const r = await fetch(endpoint, { cf:{cacheEverything:false} });
      const raw = await r.text();
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch (_) {}
      const msg = body?.error_description || body?.error || (r.ok ? `items:${Array.isArray(body.items) ? body.items.length : 0}` : 'non-json error');
      return { status:r.status, ok:r.ok, msg:String(msg).slice(0,300), contentType:r.headers.get('content-type') || '' };
    } catch (e) {
      return { status:0, ok:false, msg:`fetch_failed:${String(e?.message || e).slice(0,300)}`, contentType:'' };
    }
  }

  const withAffiliate = await test(Boolean(affiliateId));
  lines.push(`WITH_AFFILIATE: HTTP ${withAffiliate.status} / ${withAffiliate.msg}`);
  lines.push(`WITH_AFFILIATE_CONTENT_TYPE: ${withAffiliate.contentType}`);

  const withoutAffiliate = await test(false);
  lines.push(`WITHOUT_AFFILIATE: HTTP ${withoutAffiliate.status} / ${withoutAffiliate.msg}`);
  lines.push(`WITHOUT_AFFILIATE_CONTENT_TYPE: ${withoutAffiliate.contentType}`);

  if (!withAffiliate.ok && withoutAffiliate.ok) lines.push('DIAGNOSIS: affiliate_id_rejected');
  else if (!withoutAffiliate.ok) lines.push('DIAGNOSIS: app_id_or_access_key_or_app_approval_problem');
  else lines.push('DIAGNOSIS: api_ok');

  return page(lines);
}
