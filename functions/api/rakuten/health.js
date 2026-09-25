function html(data){
  const safe=JSON.stringify(data,null,2).replace(/[<>&]/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]));
  return new Response(`<!doctype html><meta charset="utf-8"><title>Rakuten health</title><pre>${safe}</pre>`,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestGet({env}){
  const appId=String(env.RAKUTEN_APP_ID||'').trim();
  const accessKey=String(env.RAKUTEN_ACCESS_KEY||'').trim();
  const affiliateId=String(env.RAKUTEN_AFFILIATE_ID||'').trim();
  const present={
    app_id_present:!!appId,
    access_key_present:!!accessKey,
    affiliate_id_present:!!affiliateId
  };
  if(!appId||!accessKey||!affiliateId) return html({ok:false,stage:'env',present});

  const params=new URLSearchParams({
    applicationId:appId,
    affiliateId,
    keyword:'安全靴',
    hits:'1',
    format:'json',
    formatVersion:'2',
    elements:'itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,shopName,reviewAverage,reviewCount,postageFlag'
  });
  const endpoint=`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`;
  try{
    const res=await fetch(endpoint,{headers:{accessKey}});
    const text=await res.text();
    let body={};
    try{body=JSON.parse(text)}catch(_){body={raw:text.slice(0,240)}}
    return html({
      ok:res.ok,
      stage:'rakuten',
      upstream_status:res.status,
      upstream_error:body?.error||'',
      upstream_detail:body?.error_description||'',
      item_count:Array.isArray(body?.items)?body.items.length:0,
      present
    });
  }catch(error){
    return html({ok:false,stage:'fetch',detail:String(error?.message||error).slice(0,240),present});
  }
}
