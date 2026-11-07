const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
async function main(){
  const statements=[];
  const db={batch:async()=>[],prepare(sql){let binds=[];return{bind(...values){binds=values;return this;},all:async()=>{statements.push({sql,binds});return{results:[]};},first:async()=>{statements.push({sql,binds});return{};},run:async()=>({})};}};
  const oldFetch=global.fetch;global.fetch=async()=>new Response('{}',{status:503});
  try{
    for(const file of ['central-dashboard','ops-revenue','ops-intelligence']){
      const mod=await import(pathToFileURL(path.join(root,'functions/api/admin',file+'.js')));
      const response=await mod.onRequestGet({request:new Request('https://example.invalid/api/admin/'+file,{headers:{authorization:'Bearer fixture'}}),env:{ADMIN_TOKEN:'fixture',ANALYTICS_DB:db}});
      assert.equal(response.status,200);
      const data=await response.json();if(file!=='central-dashboard')assert.equal(data.revenue_data_status.available,false);
    }
  }finally{global.fetch=oldFetch;}
  const query=statements.find(x=>x.sql.startsWith('WITH e AS (')&&x.sql.includes(' affiliate_clicks FROM e'));
  assert(query,'capture the real dashboard totals query');
  const python=String.raw`import json,sqlite3,sys
x=json.load(sys.stdin);d=sqlite3.connect(':memory:');d.row_factory=sqlite3.Row
columns='site_key TEXT,event_name TEXT,browser_id TEXT,session_id TEXT,page_path TEXT,page_title TEXT,occurred_at TEXT,program TEXT,placement TEXT,device_type TEXT'
d.execute('CREATE TABLE central_events('+columns+')');d.execute('CREATE TABLE analytics_events('+columns+')')
base=['factory','page_view','legacy','legacy','/','fixture','2026-11-07 16:37:29','','','mobile']
d.execute('INSERT INTO analytics_events VALUES(?,?,?,?,?,?,?,?,?,?)',base)
base[2]=base[3]='local-modern';base[6]='2026-11-07 16:37:31';d.execute('INSERT INTO analytics_events VALUES(?,?,?,?,?,?,?,?,?,?)',base)
base[2]=base[3]='central-modern';d.execute('INSERT INTO central_events VALUES(?,?,?,?,?,?,?,?,?,?)',base)
print(json.dumps(dict(d.execute(x['sql'],['-99999 days']).fetchone())))`;
  const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',python],{input:JSON.stringify(query),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).pv,2,'legacy local + modern central; never count mirrored modern local twice');
  const server=http.createServer((req,res)=>{let rel=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!path.extname(rel))rel+='.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(fs.readFileSync(file));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));server.unref();
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  const errors=[];
  try{
    const context=await browser.newContext();
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.pathname.startsWith('/api/admin/')){
        const common={ok:true,days:Number(u.searchParams.get('days')||7),generated_at:new Date().toISOString(),totals:{},executive:{},sites:[],daily:[],pages:[],affiliates:[],sources:{car:{}},revenue_data_status:{available:false,providers:[]},providers:[{provider:'a8'}],programs:[{program:'makersjob',revenue_available:false}]};
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(common)});
      }
      if(u.origin!==base||route.request().method()!=='GET')return route.abort();
      return route.continue();
    });
    const page=await context.newPage();page.on('pageerror',err=>errors.push(err.message));
    await page.goto(base+'/ops-dashboard');await page.locator('#token').fill('fixture');await page.locator('#load').click();
    await page.waitForFunction(()=>document.querySelector('#revenueMetrics')?.innerText.includes('未取得'));
    assert((await page.locator('#intelligenceMetrics').innerText()).includes('未取得'));
    assert(!(await page.locator('#revenueMetrics').innerText()).includes('¥0'));
    assert(!(await page.locator('#programPerformanceRows').innerText()).includes('0円'));
    assert((await page.locator('[data-measurement-definition]').innerText()).includes('実ユーザーであることは保証できません'));
    assert(!(await page.locator('.qa-panel').innerText()).includes('起動前失敗'));
    assert.equal(errors.length,0,errors.join('\n'));
    await page.screenshot({path:path.join(root,'reports/affiliate-revenue-qa/dashboard-fixture-unavailable.jpg'),type:'jpeg',quality:80,fullPage:true});
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
  console.log('PASS: real SQL excludes mirrored factory events; missing ASP data stays unavailable in API and dashboard');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
