import json, re, subprocess, urllib.request, html as H, datetime, uuid

BASE = 'http://localhost:3100'
M = json.load(open('.next/server/server-reference-manifest.json'))['node']
def aid(name):
    return next(k for k, v in M.items() if v.get('exportedName') == name and any('book' in w for w in v.get('workers', {})))

def curl(jar, *args):
    return subprocess.run(['curl', '-s', '-b', jar, '-c', jar, *args], capture_output=True, text=True).stdout

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
    page = submit(curl(jar, BASE + '/login'), {'intent': 'send', 'phone': phone})
    submit(page, {'intent': 'verify', 'code': '123456'})

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
            if 'ok' in o:
                return o
    return {'raw': out[:200]}

def text(page):
    body = re.sub(r'<script.*?</script>', '', page, flags=re.S).split('</head>', 1)[-1].replace('<!-- -->', '')
    return H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

A, B = '/tmp/jar_ga.txt', '/tmp/jar_gb.txt'
NIGHTLY, TERM = 'listing-00', 'listing-01'
NIGHTLY_ID, TERM_ID = '0199aaaa-0000-7000-8000-000000000000', '0199aaaa-0000-7000-8000-000000000001'
d = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()

# The listing's button says which flow it starts.
check('a nightly listing offers "Reserve"', re.search(r'href="/book/listing-00"[^>]*>Reserve<', curl('/dev/null', BASE + '/s/' + NIGHTLY)) is not None)
check('a lease offers "Request to rent"', re.search(r'href="/book/listing-01"[^>]*>Request to rent<', curl('/dev/null', BASE + '/s/' + TERM)) is not None)
h = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', BASE + '/book/listing-00'], capture_output=True, text=True).stdout.lower()
check('booking while signed out redirects to sign in and back, as a real 307', h.startswith('http/1.1 307') and 'location: /login?next=%2fbook%2flisting-00' in h, h.split(chr(13))[0])
h = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', BASE + '/book/no-such-listing'], capture_output=True, text=True).stdout.lower()
check('booking a listing that does not exist asks for sign-in first, never revealing it', h.startswith('http/1.1 307'))

sign_in(A, '0244555111')
h = subprocess.run(['curl', '-s', '-b', A, '-D', '-', '-o', '/dev/null', BASE + '/book/no-such-listing'], capture_output=True, text=True).stdout
check('signed in, booking a listing that does not exist is a real 404', h.startswith('HTTP/1.1 404'), h.split(chr(13))[0])
book = '/book/listing-00'
check('the nightly form offers "Reserve and pay"', 'Reserve and pay' in curl(A, BASE + book))

# A live quote, priced by the API.
q = action(A, book, 'getQuote', NIGHTLY, {'checkIn': d(10), 'checkOut': d(13), 'guests': 1})
check('the quote prices three nights', q.get('ok') and q['data']['due_now_minor'] == 3 * 20000, q)

# The same form submitted twice creates one booking, not two.
key = str(uuid.uuid4())
first = action(A, book, 'createBooking', NIGHTLY_ID, {'checkIn': d(10), 'checkOut': d(13), 'guests': 1}, key)
again = action(A, book, 'createBooking', NIGHTLY_ID, {'checkIn': d(10), 'checkOut': d(13), 'guests': 1}, key)
check('the nightly booking is held', first.get('ok') and first['data']['status'] == 'held', first)
check('a double submit returns the same booking, not a second one', again.get('data', {}).get('id') == first.get('data', {}).get('id'))
bid = first['data']['id']

# Another guest cannot take the same nights.
sign_in(B, '0244555222')
race = action(B, book, 'createBooking', NIGHTLY_ID, {'checkIn': d(11), 'checkOut': d(12), 'guests': 1}, str(uuid.uuid4()))
check('a second guest cannot book held nights', race.get('ok') is False and 'Someone has just booked' in race.get('error', ''), race)
check('the held nights arrive at the form as taken, so the picker refuses them instantly', d(11) in curl(B, BASE + book))

# Payment starts at checkout; returning shows "confirming", never "paid".
pay = action(A, book, 'startPayment', bid)
check('payment starts with a checkout address', pay.get('ok') and '/checkout/' in pay['data']['url'], pay)
ref = pay['data']['url'].rsplit('/', 1)[-1]
back = text(curl(A, f'{BASE}/bookings/{bid}?trxref={ref}&reference={ref}'))
check('back from checkout before the webhook, the page says confirming, not paid', 'Confirming your payment with Paystack' in back and "You're booked" not in back, back[:200])

# The fake Paystack checkout: webhook first, then the redirect.
loc = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', '-X', 'POST', f'http://localhost:8099/checkout/{ref}/pay'], capture_output=True, text=True).stdout
check('paying redirects back to the booking page with the reference', f'/bookings/{bid}?trxref={ref}&reference={ref}' in loc)
done = text(curl(A, f'{BASE}/bookings/{bid}?trxref={ref}&reference={ref}'))
check('once the webhook has confirmed it, the page says booked', "You're booked" in done and 'Pay GHS' not in done, done[:200])
check('a confirmed booking offers no Pay button', 'Pay GHS' not in done)

# A lease is a request: nothing to pay until the host approves.
lease = action(A, '/book/listing-01', 'createBooking', TERM_ID, {'startsOn': d(40), 'months': 12, 'guests': 2}, str(uuid.uuid4()))
lid = lease['data']['id']
page = text(curl(A, f'{BASE}/bookings/{lid}'))
check('a lease request says it is waiting for the host', 'Request sent to the host' in page and 'You pay nothing unless they approve' in page, page[:250])
check('a lease request shows no Pay button', 'Pay GHS' not in page)
early = action(A, '/book/listing-01', 'startPayment', lid)
check('paying a lease before approval is refused', early.get('ok') is False, early)

urllib.request.urlopen(f'http://localhost:8099/debug/approve/{lid}').read()
page = text(curl(A, f'{BASE}/bookings/{lid}'))
check('once approved, the lease shows a Pay button with the amount due', 'The host approved your request' in page and 'Pay GHS' in page, page[:250])
check('the approval gives a deadline to pay', 'Pay by' in page)

# Someone else's booking does not exist for them.
h = subprocess.run(['curl', '-s', '-b', B, '-D', '-', '-o', '/dev/null', f'{BASE}/bookings/{bid}'], capture_output=True, text=True).stdout
check("another user gets a 404 for someone else's booking", h.startswith('HTTP/1.1 404'), h.split('\r\n')[0])
check("another user cannot start payment on someone else's booking", action(B, book, 'startPayment', bid).get('ok') is False)

# My bookings lists both, by title, with their states.
mine = text(curl(A, BASE + '/bookings'))
check('My bookings lists both by listing title', 'room 0 in Madina' in mine and 'self contained 1 in Osu' in mine, mine[:300])
check('My bookings shows each state', 'Booked' in mine and 'Approved' in mine)
check('the account page links to My bookings', 'href="/bookings"' in curl(A, BASE + '/account'))
