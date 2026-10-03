import json, re, subprocess, urllib.request, html as H, datetime

BASE = 'http://localhost:3100'

def get(path):
    r = subprocess.run(['curl', '-s', '-D', '/tmp/h4.txt', BASE + path], capture_output=True, text=True)
    return r.stdout, open('/tmp/h4.txt').read()

def visible(page):
    body = re.sub(r'<script.*?</script>', '', page, flags=re.S)
    return body.split('</head>', 1)[-1]

def text(page):
    # React separates adjacent text with empty comments; a browser renders
    # them as nothing, so they are removed rather than turned into spaces.
    body = visible(page).replace('<!-- -->', '')
    return H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))

def meta(page, prop):
    m = re.search(r'<meta (?:property|name)="' + re.escape(prop) + r'" content="([^"]*)"', page)
    return H.unescape(m.group(1)) if m else None

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

urllib.request.urlopen('http://localhost:8099/debug/quote').read()

# listing-01: term, photos, a routed walk, a video and two reviews.
page, h = get('/s/listing-01')
t = text(page)
check('a listing renders with a 200', h.startswith('HTTP/1.1 200'))
check('title and monthly price are shown', 'self contained 1 in Osu' in t and 'GHS 600 /mo' in t, t[:200])

# The move-in total, from a quote starting next month for the advance period.
check('the move-in total is shown up front', 'To move in' in t and 'GHS 8,400' in t, re.findall(r'GHS [\d,]+', t)[:8])
q = json.load(urllib.request.urlopen('http://localhost:8099/debug/quote'))
today = datetime.date.today()
nxt = (today.replace(day=1) + datetime.timedelta(days=32)).replace(day=1).isoformat()
check('the quote asked for the first of next month and the advance period', q and q[-1] == {'starts_on': nxt, 'months': '12'}, q)

# Attribute labels come from the API schema, ordered by weight.
facts = re.findall(r'<dt class="text-body">([^<]+)</dt><dd[^>]*>([^<]+)</dd>', visible(page))
check('attribute labels and values come from the API schema', ('Water source', 'Borehole') in facts and ('Floor area', '42.5 m²') in facts, facts)
order = [f[0] for f in facts]
check('water and power come before floor area', order.index('Water source') < order.index('Floor area') and order.index('Power backup') < order.index('Floor area'), order)

# The named protection, claiming only what is built.
check('the protection is named', 'Findaspace Protect' in t)
check('it promises a refund when the host cancels', 'Full refund if the host cancels' in t)
check('it ties protection to paying through the platform', 'Payments made outside it are not protected' in t)
check('it does not promise refunds for "not as listed", which is not built', 'as listed' not in t.lower() and 'as described' not in t.lower())

# Walk, video, reviews, amenities.
check('the routed walk is shown', 'min walk to' in t)
vid = re.search(r'<video[^>]*>', page)
check('the walkthrough never preloads', vid and 'preload="none"' in vid.group(0))
check('reviews show the average and count', '4.5' in t and '2 reviews' in t)
check('amenity values are readable, not raw keys', 'Security guard' in t and 'security_guard' not in t)

# The link preview WhatsApp will build.
check('og:title carries the price', (meta(page, 'og:title') or '').endswith('GHS 600/mo'), meta(page, 'og:title'))
img = meta(page, 'og:image') or ''
check('og:image is the small JPEG card rendition', img.endswith('-card.jpg'), img)
check('og:image is an absolute URL', img.startswith('http'), img)
canon = re.search(r'<link rel="canonical" href="([^"]+)"', page)
check('canonical URL is absolute', canon and canon.group(1) == 'http://localhost:3000/s/listing-01', canon and canon.group(1))

# The page does not reveal an exact address.
check('the page says the address comes after booking', 'exact address is shared once your booking is confirmed' in t)

# Booking is honestly unavailable until Phase 6.
# Phase 6 replaced the disabled placeholder with the real booking flow.
check('the lease offers "Request to rent", linking to the booking form', re.search(r'href="/book/listing-01"[^>]*>Request to rent<', page) is not None)

# The phone price bar is the one element with the shadow.
check('the sticky price bar uses the reserved shadow', 'shadow-lift' in page)

# A listing with no photos, no walk and no video still renders cleanly.
page, h = get('/s/listing-00')
check('a listing with no photos renders a placeholder, not a broken image', h.startswith('HTTP/1.1 200') and '<img' not in visible(page).split('</header>', 1)[-1].split('The details')[0])
check('no walkthrough section when there is no video', 'Walkthrough' not in text(page))

# An enrichment failing must not take the page down.
page, h = get('/s/listing-07')
check('a failing walk-time endpoint does not break the page', h.startswith('HTTP/1.1 200') and 'The details' in text(page))

# An unknown listing is a real 404 with a way back.
page, h = get('/s/no-such-listing')
check('an unknown slug is a 404', h.startswith('HTTP/1.1 404'), h.split('\r\n')[0])
# A notFound() thrown from a layout renders client-side, so the page is in
# the RSC payload for the browser rather than in the initial HTML. The status,
# which is what crawlers act on, is set correctly on the response.
check('the 404 page, with its way back and the header, is sent for the browser to render',
      'no longer listed' in page and 'Find a space' in page and 'Sign in' in page)

# The search page no longer carries the banner.
page, _ = get('/')
check('the escrow banner is gone from search', 'money is held' not in text(page))
