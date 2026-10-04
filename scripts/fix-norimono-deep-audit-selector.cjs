const fs=require('fs');
const p='scripts/audit-norimono-deep.mjs';
let s=fs.readFileSync(p,'utf8');
const from="await br.locator('#bikeRecForm button[type=\"submit\"]').click();";
const to="await br.locator('#bikeRecommendSubmit').click();";
if(!s.includes(from)) throw new Error('stale bike audit selector not found');
s=s.replace(from,to);
fs.writeFileSync(p,s);
console.log('Updated bike recommendation audit selector.');
