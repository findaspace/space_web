// Local integration only: requires a fresh migrated PostgreSQL database, running Go API/worker,
// S3 test service and development LogSender. It reads local test OTPs and grants a fixture admin.
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { runMapChecks } from './maps.mjs';
const api=process.env.REAL_API_URL??'http://localhost:8080';
const base=process.env.E2E_BASE_URL??'http://localhost:3200';
const db=process.env.REAL_API_DATABASE_URL??'postgres://postgres@127.0.0.1:55432/findaspace?sslmode=disable';
for(const url of [api,base,db])assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname),'This fixture must run locally');
const log=process.env.REAL_API_LOG??'/tmp/findaspace-real-api.log';
const checks=[];function check(name,truth){assert.ok(truth,name);checks.push(name);console.log('PASS '+name);}
const delay=(n)=>new Promise((r)=>setTimeout(r,n));
async function call(path,{token,method='GET',body,status=200}={}){const res=await fetch(api+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=res.status===204?null:await res.json();assert.equal(res.status,status,`${path}: ${JSON.stringify(data)}`);return data;}
async function code(phone){for(let i=0;i<30;i++){const lines=(await readFile(log,'utf8')).trim().split('\n').reverse();for(const line of lines){try{const item=JSON.parse(line);if(item.to===phone&&item.body){const m=item.body.match(/\b(\d{6})\b/);if(m)return m[1];}}catch{}}await delay(100);}throw Error('No local development OTP found');}
async function loginApi(phone){await call('/v1/auth/otp',{method:'POST',body:{phone},status:202});return call('/v1/auth/verify',{method:'POST',body:{phone,code:await code(phone)}});}
const suffix=String(Date.now()).slice(-7),hostPhone='+23324'+suffix,guestPhone='+23355'+suffix;
let host=await loginApi(hostPhone);let hostToken=host.access_token;
const create={space_type:'football_pitch',rental_mode:'flexible',title:'A floodlit football pitch in Madina',description:'A community pitch with artificial turf, floodlights and changing rooms.',base_price_minor:15000,currency:'GHS',price_period:'hour',max_occupancy:22,location:{latitude:5.68,longitude:-0.16,locality:'Madina',country:'GH',digital_address:'GA-123-4567'},attributes:{sport:'football',surface:'artificial_turf',floodlights:true}};
let listing=await call('/v1/spaces',{token:hostToken,method:'POST',body:create,status:201});
check('Real API creates hourly sports inventory',listing.price_period==='hour'&&listing.rental_mode==='flexible');
for(let i=0;i<2;i++){const ticket=await call(`/v1/spaces/${listing.id}/media`,{token:hostToken,method:'POST',body:{content_type:'image/jpeg'},status:201});const bytes=await readFile(`tests/stub-api/photos/${i}.jpg`);const put=await fetch(ticket.upload_url,{method:ticket.method,headers:ticket.headers,body:bytes});assert.ok(put.ok);await call(`/v1/spaces/${listing.id}/media/${ticket.media.id}/confirm`,{token:hostToken,method:'POST'});}
let photos=[];for(let i=0;i<60;i++){photos=(await call(`/v1/spaces/${listing.id}/media`,{token:hostToken})).media;if(photos.length===2)break;await delay(500);}
check('Real background worker produces both ready photographs',photos.length===2&&photos.every((p)=>p.width>0&&p.url));
listing=await call(`/v1/spaces/${listing.id}`,{token:hostToken,method:'PATCH',body:{title:'An updated sports space in Madina',price_period:'day'}});
check('Core edits persist through the real API',listing.price_period==='day'&&listing.title.startsWith('An updated'));
await call(`/v1/spaces/${listing.id}`,{token:hostToken,method:'PATCH',body:{price_period:'month'},status:422});check('Invalid sports pricing combination is rejected',true);
await call(`/v1/spaces/${listing.id}/submit`,{token:hostToken,method:'POST'});
const user=await call('/v1/me',{token:hostToken});assert.match(user.id,/^[0-9a-f-]{36}$/);
execFileSync('psql',[db,'-v','ON_ERROR_STOP=1','-c',`INSERT INTO role_grants(user_id,role) VALUES('${user.id}','admin') ON CONFLICT DO NOTHING`],{stdio:'pipe'});
host=await loginApi(hostPhone);hostToken=host.access_token;
await call(`/v1/spaces/${listing.id}/publish`,{token:hostToken,method:'POST'});
check('Admin publication makes real inventory searchable',(await call('/v1/search?type=football_pitch&mode=flexible&price_period=day')).results.some((p)=>p.slug===listing.slug));
check('Exact price-period search excludes other rates',!(await call('/v1/search?type=football_pitch&price_period=hour')).results.some((p)=>p.slug===listing.slug));
const guest=await loginApi(guestPhone),guestToken=guest.access_token;
await call(`/v1/spaces/${listing.id}`,{token:guestToken,status:404});
await call(`/v1/spaces/${listing.id}`,{token:guestToken,method:'PATCH',body:{title:'A malicious edit'},status:404});
check('Other accounts cannot read or edit private listings',true);
const sent=await call(`/v1/spaces/${listing.id}/messages`,{token:guestToken,method:'POST',body:{body:'Please call me on 0241234567 to arrange a visit.'},status:201});
check('Direct-contact messages retain contact details without a payment',sent.message?.redacted===false&&sent.message.body.includes('0241234567'));
const contact=await call(`/v1/spaces/${listing.id}/contact`,{token:guestToken});check('Real contact reveal returns the host number',JSON.stringify(contact).includes(hostPhone));
await call('/v1/bookings',{token:guestToken,status:404});check('Backend payment routes are disabled',true);
const binary=process.env.BROWSER_EXECUTABLE_PATH;
const browser=await chromium.launch({headless:true,...(binary?{executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',(e)=>errors.push(e.message));
const guestContext=await browser.newContext({viewport:{width:390,height:844}}),guestPage=await guestContext.newPage();guestPage.on('pageerror',(e)=>errors.push(e.message));
async function loginBrowser(target,phone,next){
 await target.goto(`${base}/login?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
 await target.getByLabel('Phone number',{exact:true}).fill(phone);
 await target.getByRole('button',{name:'Send code',exact:true}).click();
 await target.getByLabel('6-digit code').waitFor();
 await target.getByLabel('6-digit code').fill(await code(phone));
 await target.getByRole('button',{name:'Continue',exact:true}).click();
 await target.waitForURL(base+next);
}
try{
 await page.goto(`${base}/login?next=${encodeURIComponent('/hosting/'+listing.id)}`,{waitUntil:'networkidle'});
 await page.getByLabel('Phone number',{exact:true}).fill(hostPhone);
 await page.getByRole('button',{name:'Send code',exact:true}).click();
 await page.getByLabel('6-digit code').waitFor();
 await page.getByLabel('6-digit code').fill(await code(hostPhone));
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL(`${base}/hosting/${listing.id}`);

 // Two isolated browsers hold different accounts and use only the site UI.
 await loginBrowser(guestPage,guestPhone,'/message/'+listing.slug);
 const question='Can we view the pitch tomorrow? Call 0241234567.';
 await guestPage.getByLabel('Your message',{exact:true}).fill(question);
 await guestPage.getByRole('button',{name:'Send',exact:true}).click();
 await guestPage.waitForURL(`${base}/inbox/${sent.thread_id}`);
 check('Renter starts a conversation through the website',await guestPage.getByText(question,{exact:true}).isVisible());
 check('Host inbox marks incoming renter message unread',(await call('/v1/threads',{token:hostToken})).threads.some((t)=>t.id===sent.thread_id&&t.unread));
 for(const width of [320,360,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  const nav=page.getByRole('navigation',{name:'Account',exact:true});
  const inbox=await nav.getByRole('link',{name:/^Inbox/}).boundingBox();
  const bell=await nav.getByRole('link',{name:/^Notifications/}).boundingBox();
  check(`Header buttons are side by side at ${width}px`,inbox&&bell&&Math.abs(inbox.y-bell.y)<1&&inbox.x+inbox.width<=bell.x&&inbox.height>=44&&bell.height>=44);
  check(`Signed-in header fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(`${base}/inbox`,{waitUntil:'networkidle'});
 await page.locator(`a[href='/inbox/${sent.thread_id}']`).click();
 await page.getByText(question,{exact:true}).waitFor();
 const answer='Yes, tomorrow at 3pm. You can use this chat to confirm.';
 await page.getByLabel('Message',{exact:true}).fill(answer);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await guestPage.getByText(answer,{exact:true}).waitFor({timeout:15000});
 check('Host replies and renter receives it without reloading',true);
 const followup='Great, see you then!';
 await guestPage.getByLabel('Message',{exact:true}).fill(followup);
 await guestPage.getByRole('button',{name:'Send',exact:true}).click();
 await page.getByText(followup,{exact:true}).waitFor({timeout:15000});
 check('Renter reply arrives in the host browser without reloading',true);
 await guestPage.reload({waitUntil:'networkidle'});
 check('Conversation persists after reloading',await guestPage.getByText(answer,{exact:true}).isVisible()&&await guestPage.getByText(question,{exact:true}).isVisible());
 const outsider=await loginApi('+23320'+suffix);
 for(const [path,method,body] of [[`/v1/threads/${sent.thread_id}/messages`,'GET',undefined],[`/v1/threads/${sent.thread_id}/messages`,'POST',{body:'Uninvited'}],[`/v1/threads/${sent.thread_id}/read`,'POST',undefined]]){
  await call(path,{token:outsider.access_token,method,body,status:404});
 }
 check('Third account cannot read, reply to, or mark someone else’s chat',true);
 await mkdir('artifacts/qa',{recursive:true});
 await page.screenshot({path:'artifacts/qa/real-chat-host-phone.png',fullPage:true});
 await guestPage.screenshot({path:'artifacts/qa/real-chat-renter-phone.png',fullPage:true});
 await page.goto(`${base}/hosting/${listing.id}`,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Move photo 2 earlier',exact:true}).click();await page.getByText('Photo order saved. The first photo is your cover.',{exact:true}).waitFor();
 check('Phone photo reordering persists',(await call(`/v1/spaces/${listing.id}/media`,{token:hostToken})).media[0].id===photos[1].id);
 await page.getByRole('button',{name:'Remove photo 2',exact:true}).click();await page.getByText('Photo removed.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Remove photo 1',exact:true}).click();await page.getByText('Upload a replacement photo or withdraw the listing before deleting its last photo.',{exact:true}).waitFor();check('Phone cannot delete the last public photo',true);
 if(process.env.VERIFY_MAPS==='true') await runMapChecks(browser,base,listing.slug,check);
 await page.getByRole('button',{name:'Withdraw to edit',exact:true}).click();await page.getByText('Your listing is now a draft. Edit it, then send it for review.',{exact:true}).waitFor();
 await page.getByLabel('Title',{exact:true}).fill('A sports space edited on my phone');await page.getByLabel('Price in GHS',{exact:true}).fill('250');
 await page.getByRole('button',{name:'Save listing information',exact:true}).click();await page.getByText('Your listing information has been saved. Send it for review when ready.',{exact:true}).waitFor();
 const updated=await call(`/v1/spaces/${listing.id}`,{token:hostToken});check('Phone core edits save to PostgreSQL',updated.base_price_minor===25000&&updated.title==='A sports space edited on my phone'&&updated.status==='draft');
 check('Real connected manager has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await mkdir('artifacts/qa',{recursive:true});await page.screenshot({path:'artifacts/qa/real-host-manager-phone.png',fullPage:true});
 check('Connected browser has no runtime errors',errors.length===0);
 await writeFile('artifacts/qa/real-api-results.json',JSON.stringify({checks,runtimeErrors:errors,database:'PostgreSQL 18/PostGIS',storage:'Local Moto S3 emulator',worker:'Real Go River worker'},null,2));
}finally{await guestContext.close();await context.close();await browser.close();}
