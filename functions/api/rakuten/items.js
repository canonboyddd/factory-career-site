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

const SITE_ORIGIN = 'https://factory-career-site.pages.dev';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra
    }
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

function redact(text, secrets = []) {
  let out = String(text || '');
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out.slice(0, 1000);
}

function parseBody(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch (_) { return {}; }
}

function errorDetail(body, raw, secrets) {
  return body?.error_description
    || body?.error
    || body?.errors?.[0]?.errorMessage
    || body?.errors?.[0]?.message
    || redact(raw, secrets)
    || 'Rakuten API error';
}

function normalizeItems(body) {
  const rawItems = body.items || body.Items || [];
  return rawItems.map(unwrap).map(item => ({
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
}

export async function onRequestGet({ request, env }) {
  const appId = String(env.RAKUTEN_APP_ID || '').trim();
  const accessKey = String(env.RAKUTEN_ACCESS_KEY || '').trim();
  const affiliateId = String(env.RAKUTEN_AFFILIATE_ID || '').trim();
  const url = new URL(request.url);
  const diag = url.searchParams.get('diag') === '1';

  const missing = [];
  if (!appId) missing.push('RAKUTEN_APP_ID');
  if (!accessKey) missing.push('RAKUTEN_ACCESS_KEY');
  if (missing.length) {
    return json({ ok:false, setup_required:true, missing }, diag ? 200 : 503);
  }

  const key = String(url.searchParams.get('category') || 'work');
  const category = CATEGORIES[key] || CATEGORIES.work;
  const hits = Math.min(8, Math.max(3, Number(url.searchParams.get('hits') || 6)));

  async function callRakuten(useAffiliate) {
    const params = new URLSearchParams({
      applicationId: appId,
      accessKey,
      keyword: category.keyword,
      hits: String(hits),
      sort: category.sort,
      format: 'json',
      formatVersion: '2',
      elements: 'itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,shopName,reviewAverage,reviewCount,itemCaption,postageFlag'
    });
    if (useAffiliate && affiliateId) params.set('affiliateId', affiliateId);

    const endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('upstream-timeout'), 10000);
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Origin': SITE_ORIGIN,
          'Referer': `${SITE_ORIGIN}/`,
          'Accept': 'application/json',
          'User-Agent': `factory-career-site/1.0 (+${SITE_ORIGIN}/)`
        },
        signal: controller.signal,
        cf: { cacheEverything: false }
      });
      const raw = await res.text();
      return { res, raw, body: parseBody(raw) };
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    let selected = await callRakuten(Boolean(affiliateId));
    let affiliateActive = Boolean(affiliateId && selected.res.ok);
    let affiliateWarning = '';

    if (!selected.res.ok && affiliateId) {
      const withoutAffiliate = await callRakuten(false);
      if (withoutAffiliate.res.ok) {
        selected = withoutAffiliate;
        affiliateActive = false;
        affiliateWarning = 'affiliate_id_rejected';
      }
    }

    const { res, raw, body } = selected;
    if (!res.ok) {
      const detail = errorDetail(body, raw, [appId, accessKey, affiliateId]);
      const payload = {
        ok:false,
        error:'rakuten_api_error',
        status:res.status,
        detail:String(detail).slice(0,500)
      };
      if (diag) {
        payload.diagnostics = {
          app_id_present:true,
          access_key_present:true,
          affiliate_id_present:Boolean(affiliateId),
          request_origin:SITE_ORIGIN,
          content_type:res.headers.get('content-type') || '',
          body_preview:redact(raw, [appId, accessKey, affiliateId])
        };
      }
      return json(payload, diag ? 200 : (res.status === 429 ? 429 : 502));
    }

    const items = normalizeItems(body);

    return json({
      ok:true,
      category:key,
      label:category.label,
      updated_at:new Date().toISOString(),
      affiliate_active:affiliateActive,
      affiliate_warning:affiliateWarning,
      items,
      ...(diag ? { diagnostics:{ item_count:items.length, request_origin:SITE_ORIGIN, content_type:res.headers.get('content-type') || '', affiliate_active:affiliateActive, affiliate_warning:affiliateWarning } } : {})
    }, 200, { 'cache-control': diag ? 'no-store' : 'public, max-age=900, s-maxage=21600' });
  } catch (error) {
    const payload = {
      ok:false,
      error:'rakuten_fetch_failed',
      detail:String(error?.message || error).slice(0,500)
    };
    return json(payload, diag ? 200 : 502);
  }
}
