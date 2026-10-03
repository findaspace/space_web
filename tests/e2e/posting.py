import json, re, subprocess, time, urllib.request, html as H, os

BASE = 'http://localhost:3100'
M = json.load(open('.next/server/server-reference-manifest.json'))['node']
IDS = {v.get('exportedName'): k for k, v in M.items() if any('post/page' in w for w in v.get('workers', {}))}

def curl(jar, *args):
    return subprocess.run(['curl', '-s', '-b', jar, '-c', jar, *args], capture_output=True, text=True).stdout

def sign_in(jar, phone):
    open(jar, 'w').close()
    def hidden(h):
        return re.findall(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?', h)
    def submit(h, extra):
        args = ['-X', 'POST', BASE + '/login?next=/post']
        for n, v in hidden(h):
            args += ['-F', f"{n}={(v or '').replace('&quot;', '\"').replace('&amp;', '&')}"]
        for k, v in extra.items():
            args += ['-F', f'{k}={v}']
        return curl(jar, *args)
    page = curl(jar, BASE + '/login?next=/post')
    page = submit(page, {'intent': 'send', 'phone': phone})
    submit(page, {'intent': 'verify', 'code': '123456'})

def action(jar, name, *args):
    out = curl(jar, '-X', 'POST', BASE + '/post', '-H', f'Next-Action: {IDS[name]}',
               '-H', 'Content-Type: text/plain;charset=UTF-8', '-H', 'Origin: http://localhost:3100',
               '--data', json.dumps(list(args)))
    for line in out.splitlines():
        m = re.match(r'^[0-9a-f]+:(\{.*\})$', line)
        if m:
            try:
                obj = json.loads(m.group(1))
            except ValueError:
                continue
            if 'ok' in obj:
                return obj
    return {'raw': out[:200]}

def log(path):
    return json.load(urllib.request.urlopen('http://localhost:8099' + path))

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

A, B, NONE = '/tmp/jar_a.txt', '/tmp/jar_b.txt', '/tmp/jar_none.txt'
open(NONE, 'w').close()
log('/debug/create')

# Signed out, posting asks you to sign in and brings you back.
h = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', BASE + '/post'], capture_output=True, text=True).stdout.lower()
check('signed-out /post redirects to sign in and back', 'location: /login?next=%2fpost' in h)

sign_in(A, '0244111222')
page = curl(A, BASE + '/post')
check('the posting page opens on photos', 'Show the space' in page)
inp = re.search(r'<input type="file"[^>]*>', page)
check('the photo input accepts images from camera or gallery', inp and 'accept="image/*"' in inp.group(0) and 'multiple' in inp.group(0), inp and inp.group(0))
check('no capture attribute, so the gallery is offered too', inp and 'capture' not in inp.group(0))
check('the header offers "Post a space"', 'Post a space' in page)

good = {'space_type': 'chamber_and_hall', 'rental_mode': 'term', 'title': 'Chamber and hall in Madina',
        'base_price_minor': 130000, 'advance_months': 12, 'max_occupancy': 2,
        'latitude': 5.683612, 'longitude': -0.166734, 'locality': 'Madina', 'landmark': 'Near Madina Market'}

# Invalid input never reaches the API.
bad = action(A, 'createListing', {**good, 'title': 'Room', 'base_price_minor': 0})
check('an invalid listing is refused before the API is called', bad.get('ok') is False and log('/debug/create') == [], bad)

# The type-to-mode rule comes back from the API as a readable failure, not a crash.
shop = action(A, 'createListing', {**good, 'space_type': 'shop', 'rental_mode': 'nightly'})
check('a shop rented nightly is refused gracefully', shop.get('ok') is False and 'not allowed' in json.dumps(shop), shop)
log('/debug/create')

created = action(A, 'createListing', good)
check('a valid listing is created', created.get('ok') is True and created['data'].get('id'), created)
sid = created.get('data', {}).get('id', '')
sent = log('/debug/create')
body = sent[-1] if sent else {}
check('the API receives the monthly period, GHS and Ghana', body.get('price_period') == 'month' and body.get('currency') == 'GHS' and body.get('location', {}).get('country') == 'GH', body)

# Upload through the presigned URL, with exactly the signed headers.
ticket = action(A, 'requestUpload', sid)
check('an upload ticket is issued', ticket.get('ok') is True, ticket)
t = ticket.get('data', {})
with open('/tmp/photo.bin', 'wb') as f:
    f.write(os.urandom(50_000))
wrong = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', t['uploadUrl'], '-H', 'Content-Type: image/png', '--data-binary', '@/tmp/photo.bin'], capture_output=True, text=True).stdout
check('storage refuses an upload with different headers than were signed', wrong == '403', wrong)
right = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', t['uploadUrl'], *sum([['-H', f'{k}: {v}'] for k, v in t['headers'].items()], []), '--data-binary', '@/tmp/photo.bin'], capture_output=True, text=True).stdout
check('the upload succeeds with the signed headers', right == '200', right)
check('confirming the upload succeeds', action(A, 'confirmUpload', sid, t['mediaId']).get('ok') is True)

# The trap: processing is asynchronous, so submitting at once is refused.
early = action(A, 'submitForReview', sid)
check('submitting before a photo is processed is refused', early.get('ok') is False, early)
check('no photo is ready yet right after upload', action(A, 'readyPhotos', sid).get('data') == 0)
time.sleep(2)
check('the photo is ready once the worker has processed it', action(A, 'readyPhotos', sid).get('data') == 1)

# Quick answers are validated before being saved.
check('one-tap answers are saved', action(A, 'saveAttributes', sid, {'water_source': 'borehole', 'self_contained': True}).get('ok') is True)
check('hostile attribute keys are refused', action(A, 'saveAttributes', sid, {'__proto__': 'x', 'a b': 'y'}).get('ok') is False)

check('sending for review succeeds once a photo is ready', action(A, 'submitForReview', sid).get('ok') is True)
hosting = H.unescape(re.sub(r'<[^>]+>', ' ', curl(A, BASE + '/hosting').replace('<!-- -->', '')))
check('My listings shows the listing as In review', 'Chamber and hall in Madina' in hosting and 'In review' in hosting)

# Another user cannot touch it.
sign_in(B, '0244333444')
check("another user cannot upload to someone else's listing", action(B, 'requestUpload', sid).get('ok') is False)
check("another user cannot see someone else's photos", action(B, 'readyPhotos', sid).get('ok') is False)
check("another user's My listings does not show it", 'Chamber and hall in Madina' not in curl(B, BASE + '/hosting'))

# No session: a clear signed-out answer, not an error.
r = action(NONE, 'readyPhotos', sid)
check('an action without a session reports signed out', r.get('signedOut') is True, r)

check('the account page links to My listings', '/hosting' in curl(A, BASE + '/account'))
