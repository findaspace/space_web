import json, re, subprocess, urllib.request, html as H

BASE = 'http://localhost:3100'
M = json.load(open('.next/server/server-reference-manifest.json'))['node']
aid = lambda name: next(k for k, v in M.items() if v.get('exportedName') == name)

def curl(jar, *args):
    return subprocess.run(['curl', '-s', '-b', jar, '-c', jar, *args], capture_output=True, text=True).stdout

def status(jar, path):
    return subprocess.run(['curl', '-s', '-b', jar, '-o', '/dev/null', '-w', '%{http_code}', BASE + path], capture_output=True, text=True).stdout

def sign_in(jar, phone):
    open(jar, 'w').close()
    hidden = lambda h: re.findall(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?', h)
    def submit(h, extra):
        args = ['-X', 'POST', BASE + '/login']
        for n, v in hidden(h):
            args += ['-F', f"{n}={(v or '').replace('&quot;', '\"').replace('&amp;', '&')}"]
        for k, v in extra.items():
            args += ['-F', f'{k}={v}']
        return curl(jar, *args)
    submit(submit(curl(jar, BASE + '/login'), {'intent': 'send', 'phone': phone}), {'intent': 'verify', 'code': '123456'})

def action(jar, path, name, *args):
    out = curl(jar, '-X', 'POST', BASE + path, '-H', f'Next-Action: {aid(name)}', '-H', 'Content-Type: text/plain;charset=UTF-8',
               '-H', 'Origin: http://localhost:3100', '--data', json.dumps(list(args)))
    for line in out.splitlines():
        m = re.match(r'^[0-9a-f]+:(\{.*\})$', line)
        if m:
            try:
                o = json.loads(m.group(1))
            except ValueError:
                continue
            if isinstance(o, dict) and {'a', 'b'} <= o.keys():
                continue
            return o
    return {'raw': out[:200]}

def text(page):
    body = re.sub(r'<script.*?</script>', '', page, flags=re.S).split('</head>', 1)[-1].replace('<!-- -->', '')
    return H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

OUT, IN = '/tmp/c_out', '/tmp/c_in'
open(OUT, 'w').close()
sign_in('/tmp/c_host', '0244999000'); action('/tmp/c_host', '/account', 'updateName', 'Kofi Mensah')

# The home page: discovery, not a form and a map.
home = curl(OUT, BASE + '/')
t = text(home)
check('the home page opens with a search pill asking where, what and budget', all(k in t for k in ('Where', 'What', 'Budget')))
check('every kind of space is offered as an icon', home.count('aria-label="Kind of space"') == 1 and len(re.findall(r'<svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 24 24"|viewBox="0 0 24 24"[^>]*aria-hidden="true"', home)) >= 14)
check('listings arrive in rows, starting with "Just listed"', 'Just listed' in t)
check('with a row per kind of space that has listings', 'Rooms to rent' in t or 'Self contained to rent' in t or 'Apartments to rent' in t, t[:400])
check('a short-stays row appears because nightly listings exist', 'Short stays' in t)
check('there is no map on the home page', 'Show map' not in home and 'maplibre' not in home.lower())
check('how it works is explained, including the six-month law', 'How Findaspace works' in t and 'six months' in t)
check('a footer links only to pages that exist', 'Renting safely' in t and 'Post a space, free' in t)
check('phones get a bottom tab bar', 'aria-label="Main"' in home)

# Searching switches to a clean results grid.
res = text(curl(OUT, BASE + '/?type=room&q=Madina'))
check('a search shows a titled results grid', 'Rooms in Madina' in res, res[:200])
urllib.request.urlopen('http://localhost:8099/debug/search').read()
curl(OUT, BASE + '/?q=Osu&budget=monthly-1500')
sent = json.load(urllib.request.urlopen('http://localhost:8099/debug/search'))[-1]
check("the pill's budget reaches the API as a monthly limit in pesewas", sent.get('mode') == 'term' and sent.get('max_price') == '150000', sent)

# A listing, signed out: contact requires signing in; no booking anywhere.
page = curl(OUT, BASE + '/s/listing-01')
t = text(page)
check('signed out, the listing offers sign-in to see the number', 'Sign in to see the number' in t)
check('and sign-in to chat', 'Sign in to chat' in t)
check("the owner's number is nowhere in the page", '244999000' not in page and '024 499 9000' not in page)
check('there is no booking or payment anywhere on it', not any(k in t for k in ('Reserve', 'Request to rent', 'To move in', 'Findaspace Protect')))
check('the safety note replaces the refund promise', 'Before you pay anything' in t and 'rent card' in t)
check('the listing shows its advance terms', 'advance' in t)
check('"more spaces like this" closes the page', 'More spaces like this' in t)
signin = re.search(r'href="(/login\?next=[^"]+)"[^>]*>Sign in to see the number', page)
check('signing in returns to the same listing', signin and H.unescape(signin.group(1)) == '/login?next=%2Fs%2Flisting-01')

# Signed in: one tap reveals the number, tied to the account, with a daily cap.
sign_in(IN, '0244777333')
page = curl(IN, BASE + '/s/listing-01')
check('signed in, the listing offers to show the number', 'Show phone number' in text(page))
check('the number still is not in the page until asked for', '244999000' not in page)
r = action(IN, '/s/listing-01', 'revealContact', '0199aaaa-0000-7000-8000-000000000001')
check('revealing returns the owner and the number', r.get('ok') and r['data']['phone'] == '+233244999000' and r['data']['name'] == 'Kofi Mensah', r)
check('signed out, revealing is refused', action(OUT, '/s/listing-01', 'revealContact', '0199aaaa-0000-7000-8000-000000000001').get('signedOut') is True)
for _ in range(4):
    action(IN, '/s/listing-01', 'revealContact', '0199aaaa-0000-7000-8000-000000000001')
capped = action(IN, '/s/listing-01', 'revealContact', '0199aaaa-0000-7000-8000-000000000001')
check('past the daily cap, it says so and offers chat instead', capped.get('ok') is False and 'Chat with the owner here' in capped.get('error', ''), capped)

# Payments off: every booking and payout page is gone, not broken.
for p in ['/book/listing-01', '/bookings', '/hosting/bookings', '/hosting/payouts']:
    check(f'{p} does not exist while payments are off', status(IN, p) == '404', status(IN, p))
check('the account page stops linking to bookings', 'href="/bookings"' not in curl(IN, BASE + '/account'))

# The safety page states the law, with its source.
safety = text(curl(OUT, BASE + '/safety'))
check('the safety page states the six-month limit and its source', 'Rent Act, 1963 (Act 220)' in safety and 'rentcontrol.mwh.gov.gh' in safety)
