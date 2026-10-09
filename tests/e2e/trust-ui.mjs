import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] });
let count=0;
function check(name,value){assert.ok(value,name);count++;console.log(`PASS ${name}`);}
async function go(page,path){const r=await page.goto(base+path,{waitUntil:'networkidle'});assert.ok(r.status()<500,`${path} failed`);}
async function login(page){await go(page,'/login?next=%2Faccount');await page.getByLabel('Phone number',{exact:true}).fill('0244888123');await page.getByRole('button',{name:'Send code',exact:true}).click();await page.getByLabel('6-digit code').fill('123456');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL(base+'/account');}
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await go(page,'/');const button=page.getByRole('button',{name:'Open account menu'});const menu=page.getByRole('navigation',{name:'Account menu'});
 await button.click();check('Account menu opens',await menu.isVisible());await page.mouse.click(100,200);await menu.waitFor({state:'detached'});check('Outside pointer dismisses menu',await menu.count()===0);
 await button.click();await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});check('Escape dismisses menu and restores trigger focus',await menu.count()===0&&await button.evaluate(el=>el===document.activeElement));
 await button.click();await page.getByRole('link',{name:'Findaspace, home',exact:true}).focus();await menu.waitFor({state:'detached'});check('Focus leaving account menu dismisses it',await menu.count()===0);
 await button.click();await menu.getByRole('link',{name:'Saved spaces'}).click();await page.waitForURL(base+'/saved');check('Menu navigation dismisses menu',await menu.count()===0);
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});let top;
  for(const mode of ['', 'monthly','nightly','hourly']){
   await go(page,`/?group=homes${mode?'&mode='+mode:''}`);await page.getByTestId('results-controls').waitFor();
   const geometry=await page.evaluate(()=>{const h=document.querySelector('[data-testid="results-heading"] h1').getBoundingClientRect();const c=document.querySelector('[data-testid="results-controls"]').getBoundingClientRect();return {top:c.top,headingBottom:h.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   check(`${width}px ${mode||'any'}: filters occupy a separate stable row`,geometry.top>geometry.headingBottom&&!geometry.overflow);
   if(top!==undefined)check(`${width}px ${mode||'any'}: filter row does not jump`,Math.abs(top-geometry.top)<=1);top=geometry.top;
  }
 }
 await login(page);await go(page,'/s/listing-02');await page.getByRole('button',{name:'Report this listing'}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:width<768?844:1000});
  const rect=await dialog.boundingBox();const view=page.viewportSize();
  check(`Report popup ${width}px is centred and fits`,Math.abs(rect.x+rect.width/2-view.width/2)<2&&Math.abs(rect.y+rect.height/2-view.height/2)<2&&rect.width<=width&&rect.height<=view.height);
 }

 await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});const violations=await page.evaluate(async()=> (await window.axe.run(document)).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id));check('Report popup has no serious accessibility violations',violations.length===0);
 await dialog.getByRole('button',{name:'Submit report'}).click();await page.getByText('Your report is saved for review. Thank you for flagging it.').waitFor();check('Report saves through authenticated action',true);await page.keyboard.press('Escape');check('Escape closes modal',await page.getByRole('dialog').count()===0);
 await go(page,'/message/listing-02');await page.getByRole('button',{name:'Is it still available?',exact:true}).click();await page.getByRole('button',{name:'Send',exact:true}).click();await page.waitForURL(/\/inbox\//);
 await page.getByRole('button',{name:'Block this person',exact:true}).click();await page.getByRole('button',{name:'Block person',exact:true}).click();await page.getByText('Messaging is unavailable for this conversation. Previous messages remain readable.').waitFor();check('Blocked conversation stays readable with composer disabled',await page.locator('textarea').isDisabled());
 await page.getByRole('button',{name:'Unblock this person',exact:true}).click();await page.getByRole('button',{name:'Unblock',exact:true}).click();await page.getByRole('button',{name:'Block this person',exact:true}).waitFor();check('Unblocking restores composer',await page.locator('textarea').isEnabled());
 await go(page,'/account');await page.getByRole('button',{name:'Delete my account'}).click();check('Deletion requires explicit confirmation',await page.getByRole('button',{name:'Permanently delete account'}).isDisabled());await page.getByLabel('Type DELETE to confirm').fill('DELETE');await page.getByRole('button',{name:'Permanently delete account'}).click();await page.waitForURL(base+'/?account=deleted');await go(page,'/account');check('Deleted account cannot reopen private area',page.url().includes('/login'));
 check('No browser runtime errors',errors.length===0);console.log(`${count} trust and UI checks passed`);
}finally{await browser.close();}
