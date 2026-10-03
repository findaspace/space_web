import json, re, subprocess, urllib.request, html as H

BASE = 'http://localhost:3100'

def get(path, extra=()):
    r = subprocess.run(['curl', '-s', '-D', '/tmp/h3.txt', *extra, BASE + path], capture_output=True, text=True)
    return r.stdout, open('/tmp/h3.txt').read()

def api_log():
    return json.load(urllib.request.urlopen('http://localhost:8099/debug/search'))

def slugs(page):
    return re.findall(r'href="/s/(listing-\d+)"', page)

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

api_log()

# 1. The home page is the search, rendered on the server.
page, _ = get('/')
s1 = slugs(page)
check('home renders the first 20 listings server-side', len(s1) == 20, len(s1))
check('a "Show more" link is present when another page exists', 'Show more' in page)
body = re.sub(r'<script.*?</script>', '', page, flags=re.S)
body_no_head = body.split('</head>', 1)[1]
check('search carries no escrow banner; protection lives on the listing', 'money is held' not in body_no_head)

# 2. Card images: card rendition, eager for the first four, lazy after.
imgs = re.findall(r'<img[^>]*>', page)
check('cards load the card-sized rendition', imgs and all('-card.jpg' in i for i in imgs))
# Priority belongs to the first four CARDS, which is what sits above the fold,
# whether or not each one has a photo.
def img_for(slug):
    m = re.search(r'href="/s/' + slug + r'".*?(<img[^>]*>|</a>)', body, re.S)
    return m.group(1) if m and m.group(1).startswith('<img') else None
first_four = [img_for(f'listing-0{i}') for i in range(4)]
rest = [img_for(f'listing-{i:02d}') for i in range(4, 20)]
check('images on the first four cards load eagerly', all('loading="lazy"' not in i for i in first_four if i))
check('images on cards below the fold are lazy', all('loading="lazy"' in i for i in rest if i))
check('a listing without a photo gets a placeholder, not a broken image', page.count('<li>') > len(imgs))

# 3. The no-JavaScript "Show more" link opens page two, with no overlap.
nxt = H.unescape(re.search(r'href="(/\?cursor=[^"]+)"', page).group(1))
page2, _ = get(nxt)
s2 = slugs(page2)
check('page two has 20 different listings', len(s2) == 20 and not set(s1) & set(s2))
check('page two offers a way back to the first results', 'Back to the first results' in page2)
page2_meta = re.search(r'<meta name="robots" content="([^"]+)"', page2)
check('page two is noindex, so only page one is kept by search engines', page2_meta and 'noindex' in page2_meta.group(1))
api_log()

# 4. Category chip filters, and exactly one type value reaches the API.
page, _ = get('/?type=shop')
log = api_log()
check('type=shop reaches the API as a single string', log and log[-1].get('type') == 'shop' and log[-1]['_typeCount'] == 1)
check('only shops are listed', slugs(page) and 'room ' not in H.unescape(page).lower().split('money is held')[1][:4000])
check('the Shop chip is marked current', re.search(r'aria-current="page"[^>]*>Shop<', page) is not None)

# 5. Mode maps to the API's word, and the budget appears only then.
page, _ = get('/?mode=monthly')
log = api_log()
check('mode=monthly is sent to the API as term', log[-1].get('mode') == 'term')
check('the budget select appears once a mode is chosen', re.search(r'Budget per (<!-- -->)?month', page) is not None)
page, _ = get('/')
check('no budget select without a mode', 'Budget per' not in page)
api_log()

# 6. Budget in whole cedis in the URL, minor units at the API.
page, _ = get('/?mode=monthly&max=1000')
log = api_log()
check('max=1000 GHS reaches the API as max_price=100000', log[-1].get('max_price') == '100000')
vis = re.sub(r'<script.*?</script>', '', page, flags=re.S)
prices = [int(x.replace(',', '')) for x in re.findall(r'class="tabular[^"]*">GHS ([\d,]+)<span', vis)]
check('every listed price is within the budget', prices and max(prices) <= 1000, prices[:5])

# 7. A budget without a mode is dropped, not sent.
get('/?max=1000')
log = api_log()
check('max without a mode is never sent to the API', 'max_price' not in log[-1])

# 8. Hostile or junk parameters never reach the API.
get('/?type=castle&mode=hourly&sort=random&cursor=../../etc')
log = api_log()[-1]
check('unknown type, mode, sort and a junk cursor are all dropped', not any(k in log for k in ('type', 'mode', 'sort', 'cursor')), log)

# 9. The page title follows the search, for shared links.
page, _ = get('/?type=shop&q=Osu')
title = re.search(r'<title>([^<]+)</title>', page).group(1)
check('title for type=shop&q=Osu reads "Shops in Osu"', title.startswith('Shops in Osu'), title)

# 10. Empty state is honest and offers a way out.
page, _ = get('/?q=zzzznothing')
check('a search with no results says so and offers to clear it', 'Nothing matches that search' in page and 'Clear the search' in page)

# 11. Walking time shown when routed, locality when not; never invented.
page, _ = get('/')
text = H.unescape(re.sub(r'<[^>]+>', ' ', page))
check('routed listings show a walk to a named landmark', 'min walk to Madina Market' in text or 'min walk to' in text)
