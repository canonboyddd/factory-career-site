const CATEGORIES = {
  work: { label: '仕事用品', keyword: '作業用品 工場 便利', sort: '-reviewCount' },
  shoes: { label: '作業靴・足元', keyword: '安全靴 軽量 作業靴', sort: '-reviewCount' },
  summer: { label: '暑さ対策', keyword: '冷感 ベスト 作業 暑さ対策', sort: '-reviewCount' },
  night: { label: '夜勤・睡眠環境', keyword: 'アイマスク 遮光 睡眠', sort: '-reviewCount' },
  commute: { label: '通勤・持ち物', keyword: '通勤 リュック 大容量', sort: '-reviewCount' },
  hydration: { label: '水分補給', keyword: '水筒 1L 保冷', sort: '-reviewCount' },
  interview: { label: '転職準備', keyword: 'A4 書類ケース ビジネス', sort: '-reviewCount' },
  light: { label: '作業ライト', keyword: 'LED ライト 作業用 充電式', sort: '-reviewCount' }
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=900, s-maxage=21600',
      ...extra
    }
  });
}

function debugHtml(data) {
  const safe = JSON.stringify(data).replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]));
  return new Response(`<!doctype html><meta charset="utf-8"><title>Rakuten diagnostic</title><pre>${safe}</pre>`, {
    status: 200,
    headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' }
  });
}

function imageOf(item) {
  const list = item.mediumImageUrls || item.smallImageUrls || item.imageUrls || [];
  const first = Array.isArray(list) ? list[0] : '';
  if (typeof first === 'string') return first;
  return first?.imageUrl || first?.url || '';
}

function unwrap(raw) {
  return raw?.item || raw?.Item || raw || {};
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function onRequestGet({ request, env }) {
  const appId = String(env.RAKUTEN_APP_ID || '').trim();
  const accessKey = String(env.RAKUTEN_ACCESS_KEY || '').trim();
  const affiliateId = String(env.RAKUTEN_AFFILIATE_ID || '').trim();
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';

  const missing = [];
  if (!appId) missing.push('RAKUTEN_APP_ID');
  if (!accessKey) missing.push('RAKUTEN_ACCESS_KEY');
  if (!affiliateId) missing.push('RAKUTEN_AFFILIATE_ID');
  if (missing.length) {
    const payload = { ok:false, setup_required:true, missing };
    return debug ? debugHtml(payload) : json(payload, 503);
  }

  const key = String(url.searchParams.get('category') || 'work');
  const category = CATEGORIES[key] || CATEGORIES.work;
  const hits = Math.min(8, Math.max(3, Number(url.searchParams.get('hits') || 6)));

  const params = new URLSearchParams({
    applicationId: appId,
    affiliateId,
    keyword: category.keyword,
    hits: String(hits),
    sort: category.sort,
    format: 'json',
    formatVersion: '2',
    elements: 'itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,shopName,reviewAverage,reviewCount,itemCaption,postageFlag'
  });

  const endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`;

  try {
    const res = await fetch(endpoint, {
      headers: { accessKey },
      cf: { cacheEverything: true, cacheTtl: 21600 }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const payload = {
        ok:false,
        error:'rakuten_api_error',
        status:res.status,
        detail:String(body?.error_description || body?.error || 'Rakuten API error').slice(0,240),
        diagnostics:{ app_id_present:!!appId, access_key_present:!!accessKey, affiliate_id_present:!!affiliateId }
      };
      return debug ? debugHtml(payload) : json(payload, res.status === 429 ? 429 : 502);
    }

    const rawItems = body.items || body.Items || [];
    const items = rawItems.map(unwrap).map(item => ({
      name: String(item.itemName || '').slice(0,180),
      price: safeNumber(item.itemPrice),
      url: String(item.affiliateUrl || item.itemUrl || ''),
      image: imageOf(item),
      shop: String(item.shopName || '').slice(0,100),
      reviewAverage: safeNumber(item.reviewAverage),
      reviewCount: safeNumber(item.reviewCount),
      caption: String(item.itemCaption || '').replace(/<[^>]*>/g,'').slice(0,220),
      postageFlag: safeNumber(item.postageFlag)
    })).filter(item => item.name && item.url);

    const payload = {
      ok:true,
      category:key,
      label:category.label,
      updated_at:new Date().toISOString(),
      items
    };
    return debug ? debugHtml({ ...payload, diagnostics:{ app_id_present:!!appId, access_key_present:!!accessKey, affiliate_id_present:!!affiliateId } }) : json(payload);
  } catch (error) {
    const payload = { ok:false, error:'rakuten_fetch_failed', detail:String(error?.message || error).slice(0,240), diagnostics:{ app_id_present:!!appId, access_key_present:!!accessKey, affiliate_id_present:!!affiliateId } };
    return debug ? debugHtml(payload) : json(payload, 502);
  }
}
