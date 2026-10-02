/* GitHub-native README QA, isolated from the application's local-only browser tests. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
module.exports=async function(browser,out){
 const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const head=event.pull_request?event.pull_request.head.sha:process.env.GITHUB_SHA;
 assert(/^[a-f0-9]{40}$/.test(head));
 const url=`https://github.com/albertoreyescastro/agent-control-center/blob/${head}/README.md`;
 const results=[];
 for(const width of [1200,390])for(const colorScheme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme,reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  const article=page.locator('article');await article.waitFor({timeout:30000});
  await page.waitForFunction(()=>{const a=document.querySelector('article');return a&&a.querySelectorAll('img').length===6&&[...a.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0);},{},{timeout:30000});
  const sources=await article.locator('img').evaluateAll(images=>images.map(i=>i.currentSrc));
  for(const name of ['hero','control-plane','trust-boundary'])assert(sources.some(s=>s.endsWith(`/docs/readme/${name}${width<600?'-narrow':''}.svg`)),`responsive ${name}`);
  const links=await article.locator('a').evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),label:n.textContent,anchor:!n.getAttribute('href').startsWith('#')||!!document.getElementById('user-content-'+n.getAttribute('href').slice(1))||!!document.getElementById(n.getAttribute('href').slice(1))})));
  assert(links.every(x=>x.anchor),'internal anchors');
  assert(links.some(x=>x.label==='LIVE DEMO ↗'&&x.href==='https://albertoreyescastro.github.io/agent-control-center/'));
  assert.equal(await article.locator('details').count(),2);
  for(const summary of await article.locator('summary').all()){await summary.focus();await page.keyboard.press('Enter');assert(await summary.evaluate(n=>n.parentElement.open));await page.keyboard.press('Enter');assert(!(await summary.evaluate(n=>n.parentElement.open)));}
  await article.getByRole('link',{name:'ARCHITECTURE ↓',exact:true}).click();
  assert((await page.url()).endsWith('#architecture'));
  await page.goto(url+'#engineering-the-space-between-agents',{waitUntil:'domcontentloaded'});
  await article.getByRole('link',{name:'SCENARIOS ↓',exact:true}).click();
  assert((await page.url()).endsWith('#scenarios'));
  await article.getByRole('link',{name:'SECURITY / TRUST MODEL ↓',exact:true}).click();assert((await page.url()).endsWith('#security-and-trust-model'));
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));assert.equal(overflow,0,'page overflow');
  const theme=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.querySelector('article')).color}));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  // Scroll the README's hero into view without removing GitHub context.
  await article.locator('picture').first().scrollIntoViewIfNeeded();
  const shot=await page.screenshot({path:path.join(out,`readme-${width}-${colorScheme}.jpg`),type:'jpeg',quality:70});
  console.log(`README_IMAGE_${width}_${colorScheme}_BEGIN`);console.log(shot.toString('base64'));console.log(`README_IMAGE_${width}_${colorScheme}_END`);
  results.push({width,colorScheme,theme,head,images:'PASS',responsive_sources:'PASS',anchors:'PASS',details_keyboard:'PASS',overflow});
  await context.close();
 }
 assert.notEqual(results[0].theme.background,results[1].theme.background,'GitHub light/dark background changes');
 fs.writeFileSync(path.join(out,'readme-results.json'),JSON.stringify(results,null,2));
 console.log('GitHub README rendering: PASS '+JSON.stringify(results));
};
