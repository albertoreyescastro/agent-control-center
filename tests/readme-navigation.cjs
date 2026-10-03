/* Anonymous, bounded observation of GitHub's public README surface. No page text,
 * cookies, HTML, traces or arbitrary redirect URLs are retained in diagnostics. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function category(status,article,transport){
 if(article&&status===200)return 'ready';
 if(transport)return 'navigation_unavailable';
 if([401,403,429].includes(status))return 'access_or_rate_limit';
 if(status>=500)return 'github_unavailable';
 if(status===404)return 'resource_missing';
 return 'render_unobserved';
}
async function observe(page,url,out,label){
 const attempts=[];
 for(let attempt=1;attempt<=2;attempt++){
  let status=null,transport=false;
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   status=response?response.status():null;
   await page.locator('article').waitFor({timeout:30000});
  }catch(error){
   // An article timeout after navigation is not proof of an outage or regression.
   transport=status===null;
  }
  const article=await page.locator('article').isVisible().catch(()=>false);
  const current=new URL(page.url());
  const evidence={attempt,status,article,transport,
   expected_location:current.origin+current.pathname===url,
   category:category(status,article,transport)};
  attempts.push(evidence);
  if(evidence.category==='ready'&&evidence.expected_location)return;
  const retryable=['navigation_unavailable','access_or_rate_limit','github_unavailable'].includes(evidence.category);
  if(attempt===1&&retryable){await page.waitForTimeout(1000);continue;}
  break;
 }
 fs.mkdirSync(out,{recursive:true});
 const result={status:'BLOCKED',label,attempts,rendering_pass:false};
 fs.writeFileSync(path.join(out,`navigation-${label}.json`),JSON.stringify(result,null,2));
 await page.screenshot({path:path.join(out,`navigation-${label}.jpg`),type:'jpeg',quality:75}).catch(()=>{});
 const error=new Error(`GitHub README observation BLOCKED: ${attempts.at(-1).category}; see diagnostic artifact. Rendering was not validated.`);
 error.observation=result;throw error;
}
module.exports={category,observe};
