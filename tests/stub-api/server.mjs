// A stand-in for space_api, faithful to its contract: the same paths, bodies,
// statuses and rules. It lets the web app run and be tested with no Go,
// Postgres or Paystack. Test-only: it trusts every code and pays anything.

// A stand-in for space_api's auth contract, faithful to the Go handlers:
// same paths, same bodies, same statuses, same rotation and reuse detection.
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
const DEMO = process.env.DEMO_PHOTOS === 'true';
const demoPhoto = (index) => `http://localhost:${process.env.PORT ?? 8099}/demo-photo/${index % 6}.jpg`;

const ACCESS_TTL = Number(process.env.ACCESS_TTL ?? 35);   // seconds
const GRACE = Number(process.env.GRACE ?? 0);              // seconds; 0 = no grace, like today's Go
const SECRET = process.env.BFF_SECRET ?? '';

const challenges = new Map();                 // phone -> { code, attempts }
const sessions = new Map();                   // refresh -> { user, family, rotatedAt, revoked }
const users = new Map();                      // phone -> user
const seen = [];
const searchLog = [];
const quoteLog = [];
const createLog = [];
const spaces = new Map();
const media = new Map();
const tickets = new Map();
const objects = new Map();
const bookings = new Map();
const payments = new Map();
const payoutState = {};
const payoutLog = [];
const blocks = new Set();
const reports = [];
const threads = new Map();
const messages = [];
const notifications = [];
const reveals = [];
const CONTACT_DAILY_CAP = Number(process.env.CONTACT_DAILY_CAP ?? 5);
let seq = 0;
// Time-ordered like the UUIDv7 ids space_api issues, so sorting by id is sorting by time.
const uuidv7 = () => {
  const ts = Date.now().toString(16).padStart(12, '0');
  const a = (seq++ & 0xfff).toString(16).padStart(3, '0');
  const r = crypto.randomBytes(8).toString('hex');
  return `${ts.slice(0, 8)}-${ts.slice(8)}-7${a}-8${r.slice(0, 3)}-${r.slice(3, 15)}`;
};
const TYPES = DEMO ? ['self_contained', 'apartment', 'house', 'hostel_bed', 'office', 'event_space', 'room', 'shop'] : ['room', 'self_contained', 'chamber_and_hall', 'shop', 'apartment', 'garage_is_not_real'.slice(0, 0) || 'office'];
const PLACES = [['Madina', 'Madina Market'], ['Osu', 'Kwame Nkrumah Interchange'], ['Haatso', 'Atomic Junction'], ['Ayeduase', 'KNUST Main Gate'], ['East Legon', 'A&C Mall']];
const LISTINGS = Array.from({ length: 45 }, (_, i) => {
  const type = TYPES[i % TYPES.length];
  const nightly = type === 'event_space' || (i % 4 === 0 && !['shop','office','hostel_bed'].includes(type));
  const [locality, landmark] = PLACES[i % PLACES.length];
  return {
    slug: `listing-${String(i).padStart(2, '0')}`,
    title: DEMO ? `${({self_contained:'Bright self-contained room',apartment:'A calm apartment',house:'A home with room to grow',hostel_bed:'Your next campus room',office:'A workspace for your ideas',event_space:'A space to bring people together',room:'A room to make your own',shop:'A shop for your next chapter'})[type]} in ${locality}` : `${type.replace(/_/g, ' ')} ${i} in ${locality}`,
    space_type: type,
    rental_mode: nightly ? 'nightly' : 'term',
    price_minor: nightly ? 20000 + i * 1000 : 50000 + i * 10000,
    currency: 'GHS',
    price_period: nightly ? 'night' : 'month',
    locality,
    ...(i % 3 === 0 ? {} : { landmark_name: landmark, walk_minutes: 2 + (i % 12) }),
    latitude: 5.6, longitude: -0.18,
    photo_count: i % 5,
    ...(DEMO ? { cover_url: demoPhoto(type === 'office' || type === 'shop' ? 3 : type === 'event_space' ? 4 : i) } : i % 5 === 0 ? {} : { cover_url: `http://localhost:9000/space-media/spaces/s${i}/m${i}-card.jpg` }),
    review_count: 0,
  };
});
                              // what the BFF sent us

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'EdDSA' })}.${b64({ sub, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL })}.sig`;
const iso = (s) => new Date(Date.now() + s * 1000).toISOString();

function problem(res, status, title, errors) {
  res.writeHead(status, { 'content-type': 'application/problem+json' });
  res.end(JSON.stringify({ type: 'about:blank', title, status, ...(errors ? { errors } : {}) }));
}
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
function tokens(user, family) {
  const refresh = crypto.randomBytes(32).toString('base64url');
  sessions.set(refresh, { user, family, rotatedAt: null, revoked: false });
  return {
    user, access_token: jwt(user.id), token_type: 'Bearer', expires_at: iso(ACCESS_TTL),
    refresh_token: refresh, refresh_expires_at: iso(30 * 86400),
  };
}
async function body(req) {
  let raw = ''; for await (const c of req) raw += c;
  return raw ? JSON.parse(raw) : {};
}
// Mirrors Go's DisallowUnknownFields.
function exact(b, keys, res) {
  const extra = Object.keys(b).filter((k) => !keys.includes(k));
  if (extra.length) { problem(res, 400, 'malformed request body'); return false; }
  return true;
}

http.createServer(async (req, res) => {
  // Local test storage only. Production storage must configure its own CORS.
  if (req.headers.origin === 'http://localhost:3100') {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3100');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  seen.push({ path: req.url, bff: req.headers['x-space-bff'] === SECRET, xff: req.headers['x-forwarded-for'] ?? null, ua: req.headers['user-agent'] ?? null });

  if (/^\/demo-photo\/[0-5]\.jpg$/.test(req.url)) { res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=3600' }); return res.end(readFileSync(new URL(`./photos/${req.url.split('/').at(-1)}`, import.meta.url))); }
  if (req.url === '/readyz') return json(res, 200, { status: 'ok' });
  if (req.url === '/debug/seen') return json(res, 200, seen.splice(0));

  if (req.method === 'POST' && req.url === '/v1/auth/otp') {
    const b = await body(req); if (!exact(b, ['phone'], res)) return;
    const digits = String(b.phone).replace(/\D/g, '');
    if (!/^(0|233)?[25]\d{8}$/.test(digits)) return problem(res, 422, 'invalid phone number', [{ field: 'phone', code: 'invalid' }]);
    const phone = '+233' + digits.slice(-9);
    challenges.set(phone, { code: '123456', attempts: 0 });
    return json(res, 202, { phone: phone.slice(0, 6) + '****' + phone.slice(-2), expires_at: iso(300) });
  }

  if (req.method === 'POST' && req.url === '/v1/auth/verify') {
    const b = await body(req); if (!exact(b, ['phone', 'code'], res)) return;
    const phone = '+233' + String(b.phone).replace(/\D/g, '').slice(-9);
    const ch = challenges.get(phone);
    if (!ch) return problem(res, 422, 'no active code');
    ch.attempts++;
    if (ch.attempts > 5) return problem(res, 429, 'too many attempts');
    if (b.code !== ch.code) return problem(res, 422, 'incorrect code', [{ field: 'code', code: 'mismatch' }]);
    challenges.delete(phone);
    let user = users.get(phone);
    if (!user) { user = { id: crypto.randomUUID(), phone, phone_verified: true, display_name: '', roles: ['guest'], created_at: new Date().toISOString() }; users.set(phone, user); }
    return json(res, 200, tokens(user, crypto.randomUUID()));
  }

  if (req.method === 'POST' && req.url === '/v1/auth/refresh') {
    const b = await body(req); if (!exact(b, ['refresh_token'], res)) return;
    const s = sessions.get(b.refresh_token);
    if (!s || s.revoked) return problem(res, 401, 'invalid session');
    const now = Date.now();
    const withinGrace = s.rotatedAt !== null && now - s.rotatedAt < GRACE * 1000;
    if (s.rotatedAt !== null && !withinGrace) {
      // Replayed after rotation: treated as theft, whole family revoked.
      for (const v of sessions.values()) if (v.family === s.family) v.revoked = true;
      return problem(res, 401, 'session revoked');
    }
    s.rotatedAt ??= now;
    return json(res, 200, tokens(s.user, s.family));
  }

  if (req.method === 'POST' && req.url === '/v1/auth/logout') {
    const b = await body(req); if (!exact(b, ['refresh_token'], res)) return;
    const s = sessions.get(b.refresh_token);
    if (s) for (const v of sessions.values()) if (v.family === s.family) v.revoked = true;
    res.writeHead(204); return res.end();
  }

  if (req.method === 'GET' && req.url === '/v1/me/sign-in-methods') { return json(res, 200, { methods: [] }); }
  if (req.method === 'GET' && req.url === '/v1/me') {
    const tok = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const payload = tok.split('.')[1];
    if (!payload) return problem(res, 401, 'authentication required');
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (exp < Date.now() / 1000) return problem(res, 401, 'authentication required');
    const user = [...users.values()].find((u) => u.id === sub);
    return user ? json(res, 200, user) : problem(res, 401, 'invalid session');
  }


  if (req.method === 'GET' && req.url.startsWith('/v1/search')) {
    const u = new URL(req.url, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    searchLog.push({ ...q, _typeCount: u.searchParams.getAll('type').length });
    let rows = LISTINGS.filter((l) =>
      (!q.type || q.type.split(',').includes(l.space_type)) &&
      (!q.mode || l.rental_mode === q.mode) &&
      (!q.price_period || l.price_period === q.price_period) &&
      (!q.max_price || l.price_minor <= Number(q.max_price)) &&
      (!q.q || (l.title + ' ' + l.locality).toLowerCase().includes(q.q.toLowerCase())));
    if (q.sort === 'price_asc') rows = [...rows].sort((a, b) => a.price_minor - b.price_minor);
    const limit = Math.min(Number(q.limit ?? 20), 50);
    const offset = q.cursor ? Number(Buffer.from(q.cursor, 'base64url').toString()) : 0;
    const results = rows.slice(offset, offset + limit);
    const more = offset + limit < rows.length;
    return json(res, 200, { results, ...(more ? { next_cursor: Buffer.from(String(offset + limit)).toString('base64url') } : {}) });
  }

  const lm = req.url.match(/^\/v1\/listings\/([a-z0-9-]+)(\/[a-z]+)?(\?.*)?$/);
  if (req.method === 'GET' && lm) {
    const [, slug, sub] = lm;
    const l = LISTINGS.find((x) => x.slug === slug);
    if (!l) return problem(res, 404, 'not found');
    const n = Number(slug.slice(-2));
    if (!sub) {
      return json(res, 200, {
        id: `0199aaaa-0000-7000-8000-0000000000${slug.slice(-2)}`, slug, space_type: l.space_type,
        rental_mode: l.rental_mode, title: l.title,
        description: 'Quiet compound off the main road.\nBorehole water and an inverter.',
        base_price_minor: l.price_minor, currency: 'GHS', price_period: l.price_period,
        deposit_minor: l.rental_mode === 'term' ? l.price_minor : 0, advance_months: l.rental_mode === 'term' ? (DEMO ? 6 : 12) : 0,
        max_occupancy: 3,
        location: { latitude: 5.6825, longitude: -0.1675, locality: l.locality, region: 'Greater Accra', country: 'GH', landmark: 'Near the main junction', approximate: true },
        amenities: ['wifi', 'parking', 'security_guard'],
        attributes: { floor_area_sqm: 42.5, bedrooms: 1, water_source: 'borehole', power_backup: 'inverter', self_contained: true },
        published_at: '2026-09-01T10:00:00Z',
      });
    }
    if (sub === '/media') {
      if (!DEMO && n % 5 === 0) return json(res, 200, { media: [] });
      return json(res, 200, { media: [0, 1, 2, 3, 4].map((i) => ({
        id: `m${n}-${i}`, url: DEMO ? demoPhoto(n + i) : `http://localhost:9000/space-media/spaces/s${n}/m${i}.jpg`,
        card_url: DEMO ? demoPhoto(n + i) : `http://localhost:9000/space-media/spaces/s${n}/m${i}-card.jpg`,
        width: 2048, height: 1536, position: i, status: 'ready' })) });
    }
    if (sub === '/walks') {
      if (slug === 'listing-07') return problem(res, 500, 'boom');
      return json(res, 200, { walks: l.landmark_name ? [{ name: l.landmark_name, kind: 'market', locality: l.locality, minutes: l.walk_minutes, metres: l.walk_minutes * 80 }] : [] });
    }
    if (sub === '/video') {
      if (slug !== 'listing-01') return problem(res, 404, 'no walkthrough');
      return json(res, 200, { status: 'ready', video_url: 'http://localhost:9000/v/listing-01.mp4', poster_url: 'http://localhost:9000/v/listing-01-poster.jpg', duration_seconds: 48, width: 854, height: 480 });
    }
    if (sub === '/reviews') {
      return json(res, 200, n === 1
        ? { summary: { count: 2, average: 4.5 }, reviews: [{ rating: 5, body: 'Exactly as the photos showed.', published_at: '2026-08-01T00:00:00Z' }, { rating: 4, body: 'Water was steady all month.', published_at: '2026-07-01T00:00:00Z' }] }
        : { summary: { count: 0, average: 0 }, reviews: [] });
    }
    if (sub === '/quote') {
      const u = new URL(req.url, 'http://x');
      quoteLog.push(Object.fromEntries(u.searchParams));
      if (u.searchParams.get('check_in')) {
        const n = Math.round((Date.parse(u.searchParams.get('check_out')) - Date.parse(u.searchParams.get('check_in'))) / 86400000);
        return json(res, 200, { mode: 'nightly', currency: 'GHS', nights: n, lines: [{ code: 'nights', label: `${n} nights`, amount_minor: n * l.price_minor }],
          subtotal_minor: n * l.price_minor, discount_minor: 0, fees_minor: 0, total_minor: n * l.price_minor, due_now_minor: n * l.price_minor });
      }
      const months = Number(u.searchParams.get('months'));
      const rent = l.price_minor, advance = rent * months, fee = rent;
      return json(res, 200, { mode: 'term', currency: 'GHS', months,
        lines: [{ code: 'rent', label: 'Monthly rent', amount_minor: rent }, { code: 'advance', label: 'Rent in advance', amount_minor: advance }, { code: 'deposit', label: 'Security deposit', amount_minor: rent }, { code: 'service_fee', label: 'Service fee', amount_minor: fee }],
        subtotal_minor: advance, discount_minor: 0, fees_minor: fee, total_minor: advance, due_now_minor: advance + rent + fee });
    }
  }
  if (req.url === '/v1/space-types') {
    const fields = [
      { key: 'bedrooms', label: 'Bedrooms', kind: 'int', weight: 3 },
      { key: 'self_contained', label: 'Self contained', kind: 'bool', weight: 3 },
      { key: 'floor_area_sqm', label: 'Floor area', kind: 'float', weight: 1, unit: 'm2' },
      { key: 'water_source', label: 'Water source', kind: 'enum', weight: 3, options: ['pipe', 'borehole'] },
      { key: 'power_backup', label: 'Power backup', kind: 'enum', weight: 3, options: ['none', 'inverter'] },
    ];
    return json(res, 200, { types: (DEMO ? ['room','self_contained','chamber_and_hall','apartment','house','hostel_bed','shop','office','warehouse','event_space','land','parking','boys_quarters','studio','football_pitch','sports_court','sports_facility'] : ['room', 'self_contained', 'chamber_and_hall', 'shop', 'apartment', 'office']).map((t) => ({ type: t, label: t, fields, modes: ['football_pitch','sports_court','sports_facility'].includes(t)?['flexible']:t==='studio'?['flexible','term']:['shop','warehouse','land'].includes(t)?['term']:t==='event_space'?['nightly','flexible']:t==='office'?['term','flexible']:['term','nightly'] })) });
  }
  if (req.url === '/debug/quote') return json(res, 200, quoteLog.splice(0));


  // ---- hosting: faithful to space_api's rules ----
  const bearer = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const who = () => { try { const p = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()); return p.exp > Date.now() / 1000 ? p.sub : null; } catch { return null; } };

  if (req.method === 'PUT' && req.url.startsWith('/storage/')) {
    const key = req.url.slice('/storage/'.length);
    const t = tickets.get(key);
    if (!t) return problem(res, 403, 'no such presigned url');
    if (req.headers['content-type'] !== t.contentType) return problem(res, 403, 'signature does not match');
    let n = 0; for await (const c of req) n += c.length;
    objects.set(key, n); res.writeHead(200); return res.end();
  }

  const editMedia=req.url.match(/^\/v1\/spaces\/([0-9a-f-]{36})\/media\/(order|[0-9a-f-]{36})$/);
  if(editMedia){const [,id,target]=editMedia;const own=spaces.get(id);if(!own||own.owner!==who())return problem(res,404,'not found');
    if(req.method==='DELETE'&&target!=='order'){const m=media.get(target);if(!m||m.space!==id)return problem(res,404,'not found');if(own.status==='published'&&[...media.values()].filter((m)=>m.space===id&&m.status==='ready').length<=1)return problem(res,409,'keep at least one photo');media.delete(target);res.writeHead(204);return res.end();}
    if(req.method==='PUT'&&target==='order'){const b=await body(req);const ready=[...media.values()].filter((m)=>m.space===id&&m.status==='ready');if(!Array.isArray(b.ids)||b.ids.length!==ready.length||new Set(b.ids).size!==b.ids.length||b.ids.some((mid)=>!ready.some((m)=>m.id===mid)))return problem(res,404,'not found');b.ids.forEach((mid,i)=>media.get(mid).position=i);return json(res,200,{media:b.ids.map((mid,i)=>({id:mid,url:demoPhoto(i),width:2048,height:1536,position:i,status:'ready'}))});}
  }
  const sm = req.url.match(/^\/v1\/spaces(?:\/([0-9a-f-]{36}))?(\/[a-z]+)?(?:\/([\w-]+)\/confirm)?(\?.*)?$/);
  if (sm && sm[2] !== '/messages' && sm[2] !== '/contact' && sm[2] !== '/reports') {
    const uid = who();
    if (!uid) return problem(res, 401, 'authentication required');
    const [, id, sub] = sm;
    const own = id ? spaces.get(id) : null;
    if (id && (!own || own.owner !== uid)) return problem(res, 404, 'not found');

    if (req.method === 'POST' && !id) {
      const b = await body(req);
      if (!exact(b, ['space_type', 'rental_mode', 'title', 'description', 'base_price_minor', 'currency', 'price_period', 'deposit_minor', 'advance_months', 'max_occupancy', 'location', 'amenities', 'attributes'], res)) return;
      if (!exact(b.location ?? {}, ['latitude', 'longitude', 'locality', 'region', 'country', 'landmark', 'digital_address'], res)) return;
      const termOnly = ['shop', 'warehouse', 'land'].includes(b.space_type);
      if ((termOnly && b.rental_mode !== 'term') || (b.space_type === 'event_space' && !['nightly','flexible'].includes(b.rental_mode)))
        return problem(res, 422, 'invalid request', [{ field: 'rental_mode', code: 'not_allowed', detail: 'not allowed for this space type' }]);
      const periodOk = (b.rental_mode === 'nightly' && ['night', 'week'].includes(b.price_period)) || (b.rental_mode === 'term' && ['month', 'year',...(b.space_type==='hostel_bed'?['semester','academic_year']:[])].includes(b.price_period)) || (b.rental_mode==='flexible'&&['hour','day','week'].includes(b.price_period));
      if (!periodOk || (b.title ?? '').trim().length < 8 || !(b.base_price_minor > 0)) return problem(res, 422, 'invalid request');
      createLog.push(b);
      const nid = crypto.randomUUID();
      const sp = { id: nid, owner: uid, slug: `${b.space_type}-${nid.slice(0, 6)}`, space_type: b.space_type, rental_mode: b.rental_mode, status: 'draft', title: b.title, description: b.description ?? '', base_price_minor: b.base_price_minor, currency: 'GHS', price_period: b.price_period, deposit_minor: b.deposit_minor ?? 0, advance_months: b.advance_months ?? 0, max_occupancy: b.max_occupancy, location: { ...b.location, region: b.location.region ?? '', digital_address: b.location.digital_address ?? '' }, amenities: [], attributes: {}, published_at: null, created_at: new Date().toISOString() };
      spaces.set(nid, sp);
      const { owner, ...out } = sp; return json(res, 201, out);
    }
    if (req.method === 'GET' && !id) {
      const u = new URL(req.url, 'http://x'); const offset = Number(u.searchParams.get('offset') ?? 0), limit = Number(u.searchParams.get('limit') ?? 100);
      return json(res, 200, { spaces: [...spaces.values()].filter((x) => x.owner === uid).slice(offset, offset + limit).map(({ owner, ...x }) => x) });
    }
    if (req.method === 'PATCH' && id && !sub) {
      const b = await body(req); if (!exact(b, ['attributes','title','description','base_price_minor','deposit_minor','advance_months','max_occupancy','rental_mode','price_period','latitude','longitude','locality','region','landmark','digital_address'], res)) return;
      if(!['draft','in_review'].includes(own.status))return problem(res,409,'withdraw before editing');
      for(const [k,v] of Object.entries(b)){if(['latitude','longitude','locality','region','landmark','digital_address'].includes(k))own.location[k]=v;else own[k]=v;}own.status='draft'; const { owner, ...out } = own; return json(res, 200, out);
    }
    if(req.method==='GET'&&id&&!sub){const {owner,...out}=own;return json(res,200,out);}
    if(req.method==='POST'&&sub==='/withdraw'){own.status='draft';const {owner,...out}=own;return json(res,200,out);}
    if (req.method === 'POST' && sub === '/submit') {
      const readyCount = [...media.values()].filter((m) => m.space === id && m.status === 'ready').length;
      if (readyCount < 1) return problem(res, 422, 'listing is not ready', [{ field: 'photos', code: 'required', detail: 'at least one ready photo' }]);
      own.status = 'in_review'; const { owner, ...out } = own; return json(res, 200, out);
    }
    if (req.method === 'POST' && sub === '/media' && !sm[3]) {
      const b = await body(req); if (!exact(b, ['content_type'], res)) return;
      const mid = crypto.randomUUID(); const key = `spaces/${id}/${mid}.jpg`;
      media.set(mid, { id: mid, space: id, key, position:[...media.values()].filter((m)=>m.space===id).length,status: 'pending' });
      tickets.set(key, { contentType: b.content_type });
      return json(res, 201, { media: { id: mid, url: '', width: 0, height: 0, position: 0, status: 'pending' }, upload_url: `http://localhost:8099/storage/${key}`, expires_at: iso(900), max_bytes: 10485760, method: 'PUT', headers: { 'Content-Type': b.content_type } });
    }
    if (req.method === 'POST' && sm[3]) {
      const m = media.get(sm[3]);
      if (!m || m.space !== id) return problem(res, 404, 'not found');
      if (!objects.has(m.key)) return problem(res, 409, 'no upload found');
      // The worker processes asynchronously; ready about 1.5s later.
      setTimeout(() => { m.status = 'ready'; }, 1500);
      return json(res, 200, { id: m.id, url: '', width: 0, height: 0, position: 0, status: 'pending' });
    }
    if (req.method === 'GET' && sub === '/media') {
      return json(res, 200, { media: [...media.values()].filter((m) => m.space === id && m.status === 'ready').sort((a,b)=>(a.position??0)-(b.position??0)).map((m) => ({ id: m.id, url: DEMO ? demoPhoto(m.position??1) : `http://localhost:9000/space-media/${m.key}`, width: 2048, height: 1536, position: m.position??0, status: 'ready' })) });
    }
  }

  // ---- bookings: faithful to space_api, with the request and payment windows ----
  const listingById = (id) => LISTINGS.find((l) => `0199aaaa-0000-7000-8000-0000000000${l.slug.slice(-2)}` === id);
  const LIVE = ['held', 'approved', 'confirmed', 'active'];
  const sweep = () => { for (const b of bookings.values()) if (['held', 'approved'].includes(b.status) && b.hold_expires_at && Date.parse(b.hold_expires_at) <= Date.now()) b.status = 'expired'; };
  const view = (b, viewer) => {
    const l = listingById(b.space_id); const { guest, host, idem, ref, ...out } = b;
    const isHost = viewer === host, paid = ['confirmed', 'active', 'completed'].includes(b.status);
    const g = [...users.values()].find((u) => u.id === guest);
    return { ...out, space: l ? { slug: l.slug, title: l.title } : undefined,
      ...(isHost && g ? { guest: { display_name: g.display_name, member_since: g.created_at, phone_verified: true } } : {}),
      ...((isHost || (viewer === guest && paid)) ? { location: { latitude: 5.683612, longitude: -0.166734, locality: l?.locality ?? '', landmark: 'Blue gate after the pharmacy', digital_address: 'GA-183-8164' } } : {}) };
  };
  const nightsOf = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const overlaps = (b, start, end) => b.starts_on < end && start < b.ends_on;

  const cal = req.url.match(/^\/v1\/listings\/([a-z0-9-]+)\/calendar/);
  if (req.method === 'GET' && cal) {
    sweep();
    const l = LISTINGS.find((x) => x.slug === cal[1]);
    if (!l) return problem(res, 404, 'not found');
    const u = new URL(req.url, 'http://x'); const from = u.searchParams.get('from'), to = u.searchParams.get('to');
    const id = `0199aaaa-0000-7000-8000-0000000000${l.slug.slice(-2)}`;
    const nights = [];
    for (let d = Date.parse(from); d < Date.parse(to); d += 86400000) {
      const iso = new Date(d).toISOString().slice(0, 10);
      const busy = [...bookings.values()].some((b) => b.space_id === id && LIVE.includes(b.status) && b.starts_on <= iso && iso < b.ends_on);
      nights.push({ date: `${iso}T00:00:00Z`, price_minor: l.price_minor, source: 'base', available: !busy });
    }
    return json(res, 200, { currency: 'GHS', nights });
  }

  const bm = req.url.match(/^\/v1\/bookings(?:\/([0-9a-f-]{36}))?(\/[a-z]+)?(\?.*)?$/);
  if (bm) {
    const uid = who();
    if (!uid) return problem(res, 401, 'authentication required');
    sweep();
    const [, id, sub] = bm;
    if (req.method === 'POST' && !id) {
      const b = await body(req);
      if (!exact(b, ['space_id', 'check_in', 'check_out', 'starts_on', 'months', 'guests'], res)) return;
      const key = req.headers['idempotency-key'];
      if (key) { const prior = [...bookings.values()].find((x) => x.guest === uid && x.idem === key); if (prior) return json(res, 201, view(prior, uid)); }
      const l = listingById(b.space_id);
      if (!l) return problem(res, 404, 'not found');
      const nightly = l.rental_mode === 'nightly';
      const start = nightly ? b.check_in : b.starts_on;
      const end = nightly ? b.check_out : new Date(Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1 + b.months, +start.slice(8, 10))).toISOString().slice(0, 10);
      if (!start || !end || end <= start) return problem(res, 422, 'invalid dates');
      if ([...bookings.values()].some((x) => x.space_id === b.space_id && LIVE.includes(x.status) && overlaps(x, start, end)))
        return problem(res, 409, 'dates unavailable');
      // Priced here, always; the client never sends a price.
      const nights = nightly ? nightsOf(start, end) : 0;
      const due = nightly ? nights * l.price_minor : l.price_minor * b.months + l.price_minor;
      const nid = crypto.randomUUID();
      const bk = { id: nid, reference: `SPC-${nid.slice(0, 6).toUpperCase()}`, space_id: b.space_id, guest: uid, host: [...users.values()].find((u) => u.phone === '+233244999000')?.id ?? 'someone-else',
        rental_mode: l.rental_mode, status: 'held', starts_on: start, ends_on: end, nights, months: nightly ? 0 : b.months,
        guests: b.guests ?? 1, currency: 'GHS', total_minor: due, due_now_minor: due, cancellation_policy: 'moderate',
        hold_expires_at: new Date(Date.now() + (nightly ? 30 * 60 : 48 * 3600) * 1000).toISOString(),
        created_at: new Date().toISOString(), idem: key };
      bookings.set(nid, bk);
      return json(res, 201, view(bk, uid));
    }
    if (req.method === 'GET' && !id) {
      const asHost = new URL(req.url, 'http://x').searchParams.get('role') === 'host';
      return json(res, 200, { bookings: [...bookings.values()].filter((x) => (asHost ? x.host : x.guest) === uid).reverse().map((x) => view(x, uid)) });
    }
    const bk = bookings.get(id);
    if (!bk || (bk.guest !== uid && bk.host !== uid)) return problem(res, 404, 'not found');
    if (req.method === 'GET' && !sub) return json(res, 200, view(bk, uid));
    if (req.method === 'POST' && (sub === '/approve' || sub === '/decline')) {
      if (bk.host !== uid) return problem(res, 404, 'not found');
      if (bk.status !== 'held' || bk.rental_mode !== 'term') return problem(res, 409, 'booking cannot be answered');
      if (sub === '/decline') { const b = await body(req); if (!exact(b, ['reason'], res)) return; bk.status = 'declined'; bk.cancel_reason = b.reason; bk.hold_expires_at = undefined; }
      else { bk.status = 'approved'; bk.hold_expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); }
      return json(res, 200, view(bk, uid));
    }
    if (bk.guest !== uid) return problem(res, 404, 'not found');
    if (req.method === 'POST' && sub === '/pay') {
      const payable = bk.rental_mode === 'term' ? bk.status === 'approved' : bk.status === 'held';
      if (!payable) return problem(res, 409, 'booking is not payable');
      bk.ref = bk.ref ?? `pay-${crypto.randomUUID().slice(0, 8)}`;
      payments.set(bk.ref, bk.id);
      return json(res, 201, { payment_id: 'p1', reference: bk.ref, access_code: 'x', authorization_url: `http://localhost:8099/checkout/${bk.ref}`,
        amount_minor: bk.due_now_minor, currency: 'GHS', status: 'pending' });
    }
  }

  // ---- profile and payouts ----
  if (req.method === 'PATCH' && req.url === '/v1/me') {
    const uid = who(); if (!uid) return problem(res, 401, 'authentication required');
    const b = await body(req); if (!exact(b, ['display_name'], res)) return;
    const name = String(b.display_name).trim().split(/\s+/).join(' ');
    const digits = (name.match(/\d/g) ?? []).length, lower = name.toLowerCase();
    if (name.length < 2 || name.length > 60 || digits >= 7 || /@|http|www\.|wa\.me|\.com/.test(lower))
      return problem(res, 422, 'invalid name', [{ field: 'display_name', code: 'invalid' }]);
    const u = [...users.values()].find((x) => x.id === uid); u.display_name = name;
    return json(res, 200, u);
  }
  if (req.url.startsWith('/v1/payouts')) {
    const uid = who(); if (!uid) return problem(res, 401, 'authentication required');
    const st = (payoutState[uid] ??= { account: null, available: 0, inFlight: 0, list: [] });
    const pending = [...bookings.values()].filter((b) => b.host === uid && b.status === 'confirmed').reduce((a, b) => a + b.due_now_minor, 0);
    if (req.url === '/v1/payouts/account') {
      if (req.method === 'GET') return st.account ? json(res, 200, st.account) : problem(res, 404, 'not found');
      const b = await body(req); if (!exact(b, ['channel', 'bank_code', 'account_number', 'account_name'], res)) return;
      if (!['MTN', 'VOD', 'ATL'].includes(b.bank_code)) return problem(res, 422, 'invalid payout', [{ field: 'bank_code', code: 'unknown' }]);
      st.account = { id: 'acct1', channel: 'mobile_money', bank_code: b.bank_code, account_number: b.account_number, account_name: b.account_name, verified: true };
      return json(res, 200, st.account);
    }
    if (req.url === '/v1/payouts/balance') {
      return json(res, 200, { currency: 'GHS', total_minor: pending + st.available, available_minor: st.available, pending_minor: pending, in_flight_minor: st.inFlight, withdrawable_minor: st.available - st.inFlight });
    }
    if (req.url === '/v1/payouts' && req.method === 'GET') return json(res, 200, { payouts: st.list });
    if (req.url === '/v1/payouts' && req.method === 'POST') {
      const b = await body(req); if (!exact(b, ['amount_minor'], res)) return;
      if (!st.account) return problem(res, 409, 'no payout account');
      if (st.inFlight > 0) return problem(res, 409, 'payout already in progress');
      if (b.amount_minor < 100) return problem(res, 422, 'invalid payout', [{ field: 'amount_minor', code: 'min', detail: 'the minimum payout is GHS 1' }]);
      if (b.amount_minor > st.available - st.inFlight) return problem(res, 422, 'invalid payout', [{ field: 'amount_minor', code: 'insufficient', detail: 'more than your withdrawable balance' }]);
      st.inFlight += b.amount_minor;
      const po = { id: crypto.randomUUID(), reference: 'PO-1', status: 'pending', currency: 'GHS', amount_minor: b.amount_minor, failure_reason: '', settled_at: null, created_at: new Date().toISOString() };
      st.list.unshift(po); payoutLog.push(b.amount_minor);
      return json(res, 202, po);
    }
  }
  const credit = req.url.match(/^\/debug\/credit\/(\d+)$/);
  if (credit) { const host = [...users.values()].find((u) => u.phone === '+233244999000'); (payoutState[host.id] ??= { account: null, available: 0, inFlight: 0, list: [] }).available += Number(credit[1]); return json(res, 200, {}); }
  if (req.url === '/debug/payouts') return json(res, 200, payoutLog.splice(0));



  // ---- contact reveal: signed in, published listings, a daily cap per viewer ----
  const cm = req.url.match(/^\/v1\/spaces\/([0-9a-f-]{36})\/contact$/);
  if (req.method === 'GET' && cm) {
    const uid = who(); if (!uid) return problem(res, 401, 'authentication required');
    const l = listingById(cm[1]); if (!l) return problem(res, 404, 'not found');
    const today = reveals.filter((r) => r.viewer === uid && Date.now() - r.at < 86400000);
    if (today.length >= CONTACT_DAILY_CAP) return problem(res, 429, 'too many contact reveals');
    reveals.push({ viewer: uid, space: cm[1], at: Date.now() });
    const host = [...users.values()].find((u) => u.phone === '+233244999000');
    return json(res, 200, { display_name: host?.display_name || 'Kofi Mensah', phone: '+233244999000' });
  }
  if (req.url === '/debug/reveals') return json(res, 200, reveals.length);

  const reportPath = req.url.match(/^\/v1\/spaces\/([0-9a-f-]{36})\/reports$/);
  if (reportPath && req.method === 'POST') {
    const uid = who(); if (!uid) return problem(res,401,'authentication required');
    const b = await body(req); if (!listingById(reportPath[1])) return problem(res,404,'not found');
    const report = {id:crypto.randomUUID(),space_id:reportPath[1],reason:b.reason,details:b.details || '',status:'open',created_at:new Date().toISOString()}; reports.push(report); return json(res,201,{id:report.id,status:'open'});
  }
  if (req.url === '/v1/me' && req.method === 'DELETE') {
    const uid=who(); if (!uid) return problem(res,401,'authentication required');
    const b=await body(req); if (b.confirmation!=='DELETE') return problem(res,422,'confirmation required');
    for (const [phone,user] of users) if(user.id===uid) users.delete(phone);
    for (const session of sessions.values()) if(session.user.id===uid) session.revoked=true;
    res.writeHead(204);return res.end();
  }
  // ---- messaging and notifications, faithful to space_api ----
  const mt = req.url.match(/^\/v1\/(?:spaces\/([0-9a-f-]{36})\/messages|threads(?:\/([0-9a-f-]{36}))?(\/[a-z]+)?)(\?.*)?$/);
  if (mt) {
    const uid = who(); if (!uid) return problem(res, 401, 'authentication required');
    const [, spaceId, threadId, sub] = mt;
    const hostId = [...users.values()].find((u) => u.phone === '+233244999000')?.id;
    const nameOf = (id) => [...users.values()].find((u) => u.id === id)?.display_name ?? '';
    // Contact details stay hidden until the guest has a paid booking for the space.
    const paid = (t) => [...bookings.values()].some((b) => b.space_id === t.space_id && b.guest === t.guest && ['confirmed', 'active', 'completed'].includes(b.status));
    const redact = (t, text) => {
      if (paid(t)) return [text, false];
      const out = text.replace(/wa\.me\/\S+|https?:\/\/\S+|\S+@\S+\.\S+|\+?\d[\d\s-]{6,}\d/g, '[hidden]');
      return [out, out !== text];
    };
    const post = (t, sender, text) => {
      if (!text || !text.trim()) return null;
      const [body2, redacted] = redact(t, text);
      const m = { id: uuidv7(), thread: t.id, sender_id: sender, body: body2, redacted, created_at: new Date().toISOString() };
      messages.push(m); t.last_message_at = m.created_at; t.read[sender] = m.id;
      return m;
    };
    const out = (m) => ({ id: m.id, sender_id: m.sender_id, body: m.body, redacted: m.redacted, created_at: m.created_at });
    const summary = (t) => {
      const l = listingById(t.space_id); const other = uid === t.guest ? t.host : t.guest;
      const last = messages.filter((m) => m.thread === t.id).at(-1);
      return { id: t.id, space_id: t.space_id, role: uid === t.host ? 'host' : 'guest',
        unread: Boolean(last && last.sender_id !== uid && (t.read[uid] ?? '') < last.id), last_message_at: t.last_message_at,
        last_message: last?.body, space: l ? { slug: l.slug, title: l.title } : undefined, with: { display_name: nameOf(other) } };
    };

    if (req.method === 'POST' && spaceId) {
      const b = await body(req); if (!exact(b, ['body'], res)) return;
      if (!listingById(spaceId)) return problem(res, 404, 'not found');
      if (uid === hostId) return problem(res, 422, 'cannot message yourself');
      let t = [...threads.values()].find((x) => x.space_id === spaceId && x.guest === uid);
      if (!t) { t = { id: crypto.randomUUID(), space_id: spaceId, guest: uid, host: hostId, read: {}, last_message_at: null }; threads.set(t.id, t); }
      const m = post(t, uid, b.body); if (!m) return problem(res, 422, 'message is empty', [{ field: 'body', code: 'required' }]);
      return json(res, 201, { thread_id: t.id, message: out(m) });
    }
    if (req.method === 'GET' && !threadId) {
      return json(res, 200, { threads: [...threads.values()].filter((t) => t.guest === uid || t.host === uid).sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')).map(summary) });
    }
    const t = threads.get(threadId);
    if (!t || (t.guest !== uid && t.host !== uid)) return problem(res, 404, 'not found');
    const counterpart = t.guest === uid ? t.host : t.guest;
    const blocked = blocks.has(`${uid}:${counterpart}`);
    const allowed = !blocked && !blocks.has(`${counterpart}:${uid}`);
    if (req.method === 'GET' && sub === '/safety') return json(res,200,{blocked,messaging_allowed:allowed});
    if ((req.method === 'POST' || req.method === 'DELETE') && sub === '/block') {
      if(req.method==='POST') blocks.add(`${uid}:${counterpart}`);else blocks.delete(`${uid}:${counterpart}`);
      res.writeHead(204);return res.end();
    }
    if (req.method === 'POST' && sub === '/messages') {
      if (!allowed) return problem(res,403,'Messaging is unavailable for this conversation');
      const b = await body(req); if (!exact(b, ['body'], res)) return;
      const m = post(t, uid, b.body); if (!m) return problem(res, 422, 'message is empty', [{ field: 'body', code: 'required' }]);
      return json(res, 201, out(m));
    }
    if (req.method === 'POST' && sub === '/read') {
      const last = messages.filter((m) => m.thread === t.id).at(-1); if (last) t.read[uid] = last.id;
      res.writeHead(204); return res.end();
    }
    if (req.method === 'GET' && sub === '/messages') {
      const u = new URL(req.url, 'http://x'); const before = u.searchParams.get('before'); const limit = Number(u.searchParams.get('limit') ?? 30);
      const page = messages.filter((m) => m.thread === t.id && (!before || m.id < before)).reverse().slice(0, limit);
      const s2 = summary(t);
      return json(res, 200, { thread: { id: t.id, role: s2.role, space: s2.space, with: s2.with }, messages: page.map(out), ...(page.length === limit ? { next_before: page.at(-1).id } : {}) });
    }
  }
  const nt = req.url.match(/^\/v1\/notifications(?:\/([0-9a-f-]{36}))?(\/read|\/read-all)?(\?.*)?$/);
  if (nt) {
    const uid = who(); if (!uid) return problem(res, 401, 'authentication required');
    const mine = notifications.filter((n) => n.user === uid);
    if (req.method === 'GET') {
      const limit = Number(new URL(req.url, 'http://x').searchParams.get('limit') ?? 30);
      return json(res, 200, { notifications: [...mine].reverse().slice(0, limit).map(({ user, ...n }) => n), unread: mine.filter((n) => !n.read).length });
    }
    if (nt[2] === '/read-all') { mine.forEach((n) => (n.read = true)); return json(res, 200, { marked: mine.length }); }
    const n = mine.find((x) => x.id === nt[1]); if (!n) return problem(res, 404, 'not found');
    n.read = true; res.writeHead(204); return res.end();
  }

  // Test-only: the host approves a lease request, which starts the 24 hour payment window.
  const ap = req.url.match(/^\/debug\/approve\/([0-9a-f-]{36})$/);
  if (ap) { const b = bookings.get(ap[1]); b.status = 'approved'; b.hold_expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); return json(res, 200, { ok: true }); }
  // Fake Paystack checkout: the webhook confirms first, then the browser is sent back.
  const co = req.url.match(/^\/checkout\/([\w-]+)\/pay$/);
  if (req.method === 'POST' && co) {
    const b = bookings.get(payments.get(co[1]));
    if (b) {
      b.status = 'confirmed'; b.hold_expires_at = undefined;
      for (const [user, title] of [[b.guest, 'Booking confirmed'], [b.host, 'New booking']])
        notifications.push({ id: crypto.randomUUID(), user, event: 'booking.confirmed', title, body: `Reference ${b.reference}.`, data: { booking_id: b.id }, read: false, created_at: new Date().toISOString() });
    }
    res.writeHead(303, { location: `http://localhost:3100/bookings/${b.id}?trxref=${co[1]}&reference=${co[1]}` }); return res.end();
  }

  if (req.url === '/debug/create') return json(res, 200, createLog.splice(0));

  if (req.url === '/debug/search') return json(res, 200, searchLog.splice(0));

  problem(res, 404, 'not found');
}).listen(Number(process.env.PORT ?? 8099), () => console.log('fake api up, grace', GRACE));
