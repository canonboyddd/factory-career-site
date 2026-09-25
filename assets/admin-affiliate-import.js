(() => {
  const tokenKey = 'factory_admin_token';
  const $ = id => document.getElementById(id);
  const aliases = {
    source_id:['成果id','成果番号','注文番号','注文id','オーダーid','orderid','transactionid','トランザクションid','識別id'],
    occurred_on:['成果発生日','成果発生日時','発生日','発生日時','注文日','注文日時','売上日','売上日時','成果日'],
    confirmed_on:['成果確定日','確定日','承認日','確定日時','承認日時'],
    status:['成果状況','成果ステータス','ステータス','状態','確定状況','成果確定状況','承認状況'],
    program_id:['プログラムid','広告プログラムid','案件id','広告主id','ショップid','merchantid'],
    program_name:['プログラム名','広告プログラム名','案件名','広告主名','ショップ名','店舗名','サービス名','成果種別'],
    site_name:['サイト名','掲載サイト名','媒体名','メディア名'],
    page_url:['掲載サイトurl','掲載url','サイトurl','媒体url','ページurl','referer','referrer'],
    sales_amount:['売上金額','売上額','購入金額','注文金額','商品金額','売上','sales','amount'],
    reward_amount:['成果報酬','成果報酬額','報酬','報酬額','確定報酬額','発生報酬額','アフィリエイト報酬','commission','reward'],
    click_on:['クリック日時','クリック日','広告クリック日時','clickdate','clickedat'],
    material_id:['広告素材id','素材id','バナーid'],
    site_id:['サイトid','媒体id'],
    pbid:['pbid'],
    rk:['rk']
  };

  const state = {rows:[], headers:[], file:null, provider:'rakuten'};

  function normalizeHeader(value) {
    return String(value ?? '')
      .replace(/^\uFEFF/,'')
      .replace(/[\s　_\-()（）【】［］\[\]\.・:：/]/g,'')
      .toLowerCase();
  }

  function buildLookup(row) {
    const out = new Map();
    Object.entries(row).forEach(([key,value]) => out.set(normalizeHeader(key), value));
    return out;
  }

  function pick(lookup, names) {
    for (const name of names) {
      const key = normalizeHeader(name);
      if (lookup.has(key) && String(lookup.get(key) ?? '').trim() !== '') return String(lookup.get(key)).trim();
    }
    return '';
  }

  function money(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const negative = /^[-▲△]/.test(raw) || /^\(.*\)$/.test(raw);
    const cleaned = raw.replace(/[¥￥円,%％\s　,()▲△]/g,'').replace(/[^0-9.\-]/g,'');
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return 0;
    return negative && n > 0 ? -n : n;
  }

  function dateOnly(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const normalized = raw
      .replace(/[年月]/g,'-').replace(/日/g,'')
      .replace(/\./g,'-').replace(/\//g,'-')
      .replace(/\s+.*/,'');
    const m = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
    if (!m) return '';
    return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  }

  function statusOf(value) {
    const v = String(value ?? '').trim().toLowerCase();
    if (!v) return 'unknown';
    if (/(キャンセル|否認|却下|破棄|無効|cancel|rejected|denied)/i.test(v)) return 'cancelled';
    if (/(確定|承認|approved|confirmed|確定済)/i.test(v)) return 'confirmed';
    if (/(未確定|発生|保留|審査|pending|未承認)/i.test(v)) return 'pending';
    return 'unknown';
  }

  function programKey(provider, programName) {
    const name = String(programName || '').toLowerCase();
    if (provider === 'rakuten') return 'rakuten';
    if (/メーカーズジョブ|makers.?job/i.test(name)) return 'makersJob';
    if (/samurai|サムライ/i.test(name)) return 'samuraiJob';
    if (/\bzen\b|退職代行.*zen|zen.*退職代行/i.test(name)) return 'zen';
    return provider === 'a8' ? 'a8Other' : provider === 'accesstrade' ? 'accessTradeOther' : provider;
  }

  function parseCsv(text) {
    const rows=[];
    let row=[], field='', quoted=false;
    const pushField=()=>{ row.push(field); field=''; };
    const pushRow=()=>{ pushField(); if(row.some(v=>String(v).trim()!=='')) rows.push(row); row=[]; };
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){
        if(ch==='"' && text[i+1]==='"'){ field+='"'; i++; }
        else if(ch==='"') quoted=false;
        else field+=ch;
      } else {
        if(ch==='"') quoted=true;
        else if(ch===',') pushField();
        else if(ch==='\n') pushRow();
        else if(ch==='\r') { if(text[i+1]==='\n') i++; pushRow(); }
        else field+=ch;
      }
    }
    if(field || row.length) pushRow();
    if(rows.length < 2) return {headers:rows[0]||[], records:[]};
    const headers=rows[0].map((h,i)=>String(h||`column_${i+1}`).replace(/^\uFEFF/,''));
    const records=rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
    return {headers,records};
  }

  async function readText(file) {
    const buffer=await file.arrayBuffer();
    const utf8=new TextDecoder('utf-8').decode(buffer);
    const replacements=(utf8.match(/\uFFFD/g)||[]).length;
    if(replacements===0) return utf8.replace(/^\uFEFF/,'');
    try { return new TextDecoder('shift_jis').decode(buffer).replace(/^\uFEFF/,''); }
    catch (_) { return utf8.replace(/^\uFEFF/,''); }
  }

  async function sha256(value) {
    const data=new TextEncoder().encode(value);
    const hash=await crypto.subtle.digest('SHA-256',data);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,48);
  }

  async function normalizeRecord(provider, raw) {
    const lookup=buildLookup(raw);
    const sourceId=pick(lookup,aliases.source_id);
    const occurrenceRaw=pick(lookup,aliases.occurred_on);
    const confirmedRaw=pick(lookup,aliases.confirmed_on);
    const programName=pick(lookup,aliases.program_name);
    const programId=pick(lookup,aliases.program_id);
    const sales=money(pick(lookup,aliases.sales_amount));
    const reward=money(pick(lookup,aliases.reward_amount));
    const clickRaw=pick(lookup,aliases.click_on);
    const siteName=pick(lookup,aliases.site_name);
    const pageUrl=pick(lookup,aliases.page_url);
    const status=statusOf(pick(lookup,aliases.status));

    const stablePairs=Object.entries(raw)
      .filter(([key])=>!aliases.status.concat(aliases.confirmed_on).some(a=>normalizeHeader(a)===normalizeHeader(key)))
      .map(([key,value])=>[normalizeHeader(key),String(value??'').trim()])
      .filter(([,value])=>value!=='')
      .sort((a,b)=>a[0].localeCompare(b[0]));
    const fingerprint=sourceId
      ? `${provider}|id|${sourceId}`
      : `${provider}|${occurrenceRaw}|${clickRaw}|${programId}|${programName}|${sales}|${reward}|${siteName}|${pageUrl}|${JSON.stringify(stablePairs)}`;
    const sourceKey=await sha256(fingerprint);

    return {
      source_key:sourceKey,
      source_id:sourceId,
      occurred_on:dateOnly(occurrenceRaw),
      confirmed_on:dateOnly(confirmedRaw),
      status,
      program_key:programKey(provider,programName),
      program_id:programId,
      program_name:programName || (provider==='rakuten' ? '楽天アフィリエイト' : ''),
      site_name:siteName,
      page_url:pageUrl,
      sales_amount:sales,
      reward_amount:reward,
      raw
    };
  }

  function fmt(n){ return Number(n||0).toLocaleString('ja-JP'); }

  function setStatus(message, type='') {
    const el=$('affiliateImportStatus');
    if(!el) return;
    el.textContent=message;
    el.dataset.type=type;
  }

  function renderPreview() {
    const target=$('affiliateImportPreview');
    if(!target) return;
    if(!state.rows.length){ target.innerHTML='<div class="empty">CSVを選ぶと取込内容を確認できます。</div>'; return; }
    const reward=state.rows.reduce((a,x)=>a+Number(x.reward_amount||0),0);
    const sales=state.rows.reduce((a,x)=>a+Number(x.sales_amount||0),0);
    const confirmed=state.rows.filter(x=>x.status==='confirmed').length;
    target.innerHTML=`<div class="import-preview-grid">
      <div><span>成果行</span><strong>${fmt(state.rows.length)}件</strong></div>
      <div><span>報酬合計</span><strong>¥${fmt(reward)}</strong></div>
      <div><span>売上合計</span><strong>¥${fmt(sales)}</strong></div>
      <div><span>確定扱い</span><strong>${fmt(confirmed)}件</strong></div>
    </div>`;
  }

  async function prepareFile() {
    const provider=$('affiliateImportProvider')?.value || 'rakuten';
    const file=$('affiliateImportFile')?.files?.[0];
    state.provider=provider; state.file=file||null; state.rows=[]; state.headers=[];
    renderPreview();
    if(!file){ setStatus('CSVファイルを選択してください。'); return; }
    setStatus('CSVを解析中…');
    try{
      const parsed=parseCsv(await readText(file));
      state.headers=parsed.headers;
      const normalized=[];
      for(const raw of parsed.records){
        const row=await normalizeRecord(provider,raw);
        if(row.source_id || row.occurred_on || row.program_name || row.reward_amount || row.sales_amount) normalized.push(row);
      }
      state.rows=normalized;
      renderPreview();
      if(!normalized.length){
        setStatus('成果行を認識できませんでした。CSVの種類を確認してください。','error');
        return;
      }
      const dateCount=normalized.filter(x=>x.occurred_on).length;
      const rewardCount=normalized.filter(x=>x.reward_amount!==0).length;
      setStatus(`解析完了: ${normalized.length}件（発生日認識 ${dateCount}件 / 報酬認識 ${rewardCount}件）`,'ok');
    }catch(error){
      setStatus('CSV解析に失敗しました: '+String(error?.message||error),'error');
    }
  }

  async function importRows() {
    const token=sessionStorage.getItem(tokenKey)||'';
    if(!token){ setStatus('先にADMIN_TOKENで管理画面を読み込んでください。','error'); return; }
    if(!state.rows.length || !state.file){ setStatus('先にCSVを選択してください。','error'); return; }
    const btn=$('affiliateImportBtn');
    if(btn) btn.disabled=true;
    const importId=crypto.randomUUID ? crypto.randomUUID() : `imp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let sent=0;
    try{
      for(let i=0;i<state.rows.length;i+=100){
        const chunk=state.rows.slice(i,i+100);
        setStatus(`D1へ保存中… ${Math.min(i+chunk.length,state.rows.length)} / ${state.rows.length}`);
        const res=await fetch('/api/admin/affiliate-results-import',{
          method:'POST',
          headers:{'content-type':'application/json',authorization:'Bearer '+token},
          body:JSON.stringify({provider:state.provider,import_id:importId,file_name:state.file.name,rows:chunk})
        });
        let data={};
        try{ data=await res.json(); }catch(_){}
        if(!res.ok || !data.ok) throw new Error(data.detail||data.error||`HTTP ${res.status}`);
        sent+=Number(data.accepted||chunk.length);
      }
      setStatus(`${sent}件を取り込みました。同じ成果を再取込した場合は更新されます。`,'ok');
      setTimeout(()=>window.loadRevenueAnalytics?.(),150);
    }catch(error){
      setStatus(`取込に失敗しました（${sent}件保存済み）: ${String(error?.message||error)}`,'error');
    }finally{ if(btn) btn.disabled=false; }
  }

  document.addEventListener('change',e=>{
    if(e.target.matches('#affiliateImportProvider,#affiliateImportFile')) prepareFile();
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('#affiliateImportBtn')) importRows();
  });
})();
