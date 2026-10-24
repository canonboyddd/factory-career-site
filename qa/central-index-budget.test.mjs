import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost} from '../functions/api/central/collect.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const collector=read('functions/api/central/collect.js');
function fixture(){
 const columns=collector.match(/INSERT INTO central_events\(([^)]+)\)/)[1].split(',');
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE central_events(id INTEGER PRIMARY KEY AUTOINCREMENT,occurred_at TEXT DEFAULT (datetime('now')),"+columns.map(c=>c+' TEXT').join(',')+')');
 db.exec(read('migrations/20261024-central-index-budget.sql'));db.exec(read('migrations/20261024-central-index-rollback.sql'));
 const statements=[];const env={ANALYTICS_DB:{prepare:sql=>{statements.push(sql);const statement=db.prepare(sql);return {bind:(...values)=>({run:async()=>statement.run(...values),first:async()=>statement.get(...values),all:async()=>({results:statement.all(...values)})}),run:async()=>statement.run(),all:async()=>({results:statement.all()})}}}};
 return {db,env,statements};
}
test('index migration preserves every raw event and is idempotent and reversible',()=>{
 const {db}=fixture();db.prepare("INSERT INTO central_events(site_key,event_name,browser_id,session_id,page_path) VALUES('fixture','page_view','browser','session','/fixture')").run();
 const before=db.prepare('SELECT * FROM central_events').all();
 for(let i=0;i<2;i++)db.exec(read('migrations/20261024-central-index-budget.sql'));
 assert.deepEqual(db.prepare('SELECT * FROM central_events').all(),before);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_schema WHERE type='index' AND tbl_name='central_events'").get().n,4);
 db.exec(read('migrations/20261024-central-index-rollback.sql'));
 assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_schema WHERE type='index' AND tbl_name='central_events'").get().n,20);db.close();
});
test('real collection handler preserves PV, scroll and conversion events without schema writes or sampling',async()=>{
 const {db,env,statements}=fixture();db.exec(read('migrations/20261024-central-index-budget.sql'));
 for(const event of ['page_view','scroll_90','affiliate_click']){
  const response=await onRequestPost({request:new Request('https://example.test/api/central/collect',{method:'POST',headers:{'user-agent':'Mozilla/5.0','content-type':'application/json'},body:JSON.stringify({site_key:'fixture',event_name:event,browser_id:'browser',session_id:'session',page_path:'/fixture',variant:'B',provider:'fixture-provider'})}),env});
  assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
 }
 assert.deepEqual(db.prepare('SELECT event_name FROM central_events ORDER BY id').all().map(x=>x.event_name),['page_view','scroll_90','affiliate_click']);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM central_events WHERE variant='B' AND provider='fixture-provider'").get().n,3);
 assert.equal(statements.filter(s=>/^INSERT/.test(s)).length,3);
 assert.equal(statements.some(s=>/CREATE|ALTER|DROP|PRAGMA/i.test(s)),false);
 for(const file of ['functions/api/admin/central-dashboard.js','functions/api/admin/okazu-analytics.js'])assert.equal(/CREATE INDEX|ALTER TABLE|CREATE TABLE|await schema\(/.test(read(file)),false,file);
 db.close();
});
