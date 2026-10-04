const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const HOST = 'https://factory-career-site.pages.dev';
const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const RAW_HTML_SKIP = new Set(['google8d061a8385e0755b.html']);
const HTML_SKIP_CANONICAL = new Set([
  '404.html','admin-analytics.html','ops-dashboard.html','rakuten-check.html','google8d061a8385e0755b.html',
  'shorts-content-factory/index.html','shorts-content-factory/privacy.html','shorts-content-factory/terms.html','shorts-content-factory/data-management.html',
  'shorts-content-factory-audit/index.html','shorts-content-factory-audit/privacy.html','shorts-content-factory-audit/terms.html','shorts-content-factory-audit/data-deletion.html'
]);
const ADMIN_PREFIXES = ['admin-', 'ops-dashboard', 'rakuten-check'];

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function rel(p){ return path.relative(ROOT,p).replaceAll('\\','/'); }
function stripHtml(s){ return s.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''); }
function attrs(html, attr){
  const re = new RegExp('\\b'+attr+'\\s*=\\s*["\\\']([^"\\\']+)["\\\']','gi');
  return [...html.matchAll(re)].map(m=>m[1]);
}
function cleanTarget(v){ return v.split('#')[0].split('?')[0].trim(); }
function isExternal(v){ return /^(?:https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(v); }
function mapPublicPath(target, fromFile){
  if (!target || target.startsWith('#') || isExternal(target)) return null;
  if (target.startsWith('/api/')) return {api: target};
  const raw = cleanTarget(target);
  if (!raw) return null;
  let abs;
  if (raw.startsWith('/')) abs = path.join(ROOT, raw.slice(1));
  else abs = path.resolve(path.dirname(fromFile), raw);
  const candidates = [abs];
  if (raw.endsWith('/')) candidates.push(path.join(abs,'index.html'));
  if (!path.extname(abs)) {
    candidates.push(abs+'.html');
    candidates.push(path.join(abs,'index.html'));
  }
  return {candidates};
}
function apiCandidates(apiPath){
  const p = cleanTarget(apiPath).replace(/^\/api\//,'');
  return [path.join(ROOT,'functions','api',p+'.js'), path.join(ROOT,'functions','api',p,'index.js')];
}
function expectedCanonical(file){
  const r = rel(file);
  if (r === 'index.html') return HOST + '/';
  if (r.endsWith('/index.html')) return HOST + '/' + r.slice(0,-'index.html'.length);
  return HOST + '/' + r.replace(/\.html$/,'');
}

const files = walk(ROOT);
const htmlFiles = files.filter(f=>f.endsWith('.html'));
const jsFiles = files.filter(f=>/\.(?:js|cjs|mjs)$/.test(f));
const errors=[]; const warnings=[];

for (const f of jsFiles) {
  const r = cp.spawnSync(process.execPath, ['--check', f], {encoding:'utf8'});
  if (r.status !== 0) errors.push(`JS_SYNTAX ${rel(f)} :: ${(r.stderr||r.stdout).trim().split('\n').slice(-2).join(' ')}`);
}

for (const file of htmlFiles) {
  const r = rel(file);
  const html = fs.readFileSync(file,'utf8');
  const visible = stripHtml(html);
  if (!RAW_HTML_SKIP.has(r) && (!/<html\b/i.test(html) || !/<body\b/i.test(html) || !/<\/body>/i.test(html))) errors.push(`HTML_STRUCTURE ${r} :: html/body tag missing`);
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
  const dup = ids.filter((x,i)=>ids.indexOf(x)!==i);
  if (dup.length) errors.push(`DUPLICATE_ID ${r} :: ${[...new Set(dup)].join(', ')}`);

  for (const attr of ['href','src']) for (const v of attrs(html,attr)) {
    if (!v || v.startsWith('#') || isExternal(v)) continue;
    const mapped = mapPublicPath(v,file);
    if (!mapped) continue;
    if (mapped.api) {
      if (!apiCandidates(mapped.api).some(fs.existsSync)) errors.push(`MISSING_API ${r} :: ${v}`);
      continue;
    }
    if (!mapped.candidates.some(fs.existsSync)) errors.push(`BROKEN_${attr.toUpperCase()} ${r} :: ${v}`);
  }

  for (const v of attrs(html,'href')) {
    if (v.startsWith('#') && v.length > 1) {
      const id = decodeURIComponent(v.slice(1));
      if (!ids.includes(id)) warnings.push(`BROKEN_ANCHOR ${r} :: ${v}`);
    }
  }

  // Runtime affiliate cards intentionally start hidden with href="#" and are resolved by offers.js.
  for (const m of visible.matchAll(/<a\b([^>]*)href\s*=\s*["']([^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const openAttrs=(m[1]+' '+m[3]);
    const href=m[2].trim();
    const text=m[4].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
    if (/\bdata-program-link\b/i.test(openAttrs)) continue;
    if (href==='#' || /^javascript:/i.test(href)) warnings.push(`PLACEHOLDER_LINK ${r} :: ${JSON.stringify(text)} -> ${href}`);
  }
  if (/\b(?:TODO|FIXME|TBD)\b/i.test(visible)) warnings.push(`PUBLIC_TODO ${r}`);

  if (!HTML_SKIP_CANONICAL.has(r) && !ADMIN_PREFIXES.some(p=>r.startsWith(p))) {
    const cm = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i)
      || html.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
    if (!cm) warnings.push(`NO_CANONICAL ${r}`);
    else {
      const got=cm[1].replace(/\/$/,''); const exp=expectedCanonical(file).replace(/\/$/,'');
      if (got!==exp) errors.push(`CANONICAL_MISMATCH ${r} :: ${cm[1]} expected ${expectedCanonical(file)}`);
    }
  }

  // Admin pages assemble some widgets dynamically, so DOM contracts there are covered by live admin QA instead.
  if (!ADMIN_PREFIXES.some(p=>r.startsWith(p))) {
    const scripts = attrs(html,'src').filter(v=>!isExternal(v) && /\.js(?:[?#].*)?$/.test(v));
    for (const s of scripts) {
      const mapped=mapPublicPath(s,file); if(!mapped || !mapped.candidates) continue;
      const sf=mapped.candidates.find(fs.existsSync); if(!sf) continue;
      const sr=rel(sf);
      const shared = /assets\/(?:main|analytics|central-tracker|clean-url-seo|seo-|runtime-fixes|article-conversion|benchmark-layout|top-sites-layout|discovery-hubs|pillar-content|core-intent|job-change|application-funnel|offers|rakuten-display-fix)\.?.*\.js$/.test(sr);
      if (shared) continue;
      const js=fs.readFileSync(sf,'utf8');
      for (const mm of js.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) {
        if (!ids.includes(mm[1])) errors.push(`DOM_ID_MISSING ${r} <- ${sr} :: #${mm[1]}`);
      }
    }
  }
}

// Verify literal runtime API references. Tests are not runtime code, and central-tracker's /api/ops-collect is a fallback for other domains.
for (const f of [...jsFiles,...htmlFiles]) {
  const rf=rel(f);
  if (rf.startsWith('qa/')) continue;
  const txt=fs.readFileSync(f,'utf8');
  for (const m of txt.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/]+)(?:\?[^"'`]*)?["'`]/g)) {
    const api=m[1];
    if (rf==='assets/central-tracker.js' && api==='/api/ops-collect') continue;
    if (!apiCandidates(api).some(fs.existsSync)) errors.push(`MISSING_API_REF ${rf} :: ${api}`);
  }
}

for (const sm of ['sitemap.xml','sitemap-core.xml']) if (fs.existsSync(sm)) {
  const txt=fs.readFileSync(sm,'utf8');
  for (const m of txt.matchAll(/<loc>(https:\/\/factory-career-site\.pages\.dev\/[^<]*)<\/loc>/g)) {
    const u=new URL(m[1]);
    const mapped=mapPublicPath(u.pathname,path.join(ROOT,'index.html'));
    if (mapped && mapped.candidates && !mapped.candidates.some(fs.existsSync)) errors.push(`SITEMAP_BROKEN ${sm} :: ${m[1]}`);
  }
}

const uniq = a=>[...new Set(a)].sort();
const E=uniq(errors), W=uniq(warnings);
console.log(`Full-site integrity audit: ${htmlFiles.length} HTML, ${jsFiles.length} JS/CJS/MJS`);
if (W.length) { console.log(`\nWARNINGS (${W.length})`); W.forEach(x=>console.log('WARN',x)); }
if (E.length) { console.error(`\nERRORS (${E.length})`); E.forEach(x=>console.error('ERROR',x)); process.exit(1); }
console.log(`\nPASS: no fatal repository integrity mismatches. Warnings: ${W.length}`);
