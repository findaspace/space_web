import json, re, subprocess, urllib.request, html as H, datetime, uuid

BASE = 'http://localhost:3100'
M = json.load(open('.next/server/server-reference-manifest.json'))['node']
aid = lambda name: next(k for k, v in M.items() if v.get('exportedName') == name)

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
            # The first line is React's response header, not the result.
            if isinstance(o, dict) and {'a', 'b'} <= o.keys():
                continue
            return o
    return {'raw': out[:200]}

def text(page):
    body = re.sub(r'<script.*?</script>', '', page, flags=re.S).split('</head>', 1)[-1].replace('<!-- -->', '')
    return H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

HOST, GUEST, STRANGER = '/tmp/k_host', '/tmp/k_guest', '/tmp/k_str'
TERM_ID = '0199aaaa-0000-7000-8000-000000000001'
sign_in(HOST, '0244999000'); sign_in(GUEST, '0244888111'); sign_in(STRANGER, '0244888222')
action(HOST, '/account', 'updateName', 'Kofi Mensah'); action(GUEST, '/account', 'updateName', 'Kojo Asante')

# Messaging starts from the listing.
check('the listing offers "Message the host"', 'href="/message/listing-01"' in curl('/dev/null', BASE + '/s/listing-01'))
h = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', BASE + '/message/listing-01'], capture_output=True, text=True).stdout.lower()
check('messaging while signed out redirects to sign in and back', h.startswith('http/1.1 307') and 'next=%2fmessage%2flisting-01' in h)
check('the compose page offers one-tap starters', 'Is it still available?' in text(curl(GUEST, BASE + '/message/listing-01')))

sent = action(GUEST, '/message/listing-01', 'sendToHost', TERM_ID, 'Is it still available? Call me on 0244 123 456')
check('the first message opens a conversation', sent.get('ok') is True, sent)
tid = sent['data']['threadId']

# Before a paid booking, the number is hidden, and both sides are told why.
page = text(curl(GUEST, f'{BASE}/inbox/{tid}'))
check('the conversation shows who it is with and which listing', 'Kofi Mensah' in page and 'self contained 1 in Osu' in page, page[:200])
check('the phone number is hidden before a booking is paid', '0244 123 456' not in page and '[hidden]' in page)
check('and the sender is told why, instead of it silently changing', 'Contact details hidden until a booking is paid' in page)

# The host's inbox is readable: a name, a listing, a preview, an unread mark.
inbox = text(curl(HOST, BASE + '/inbox'))
check("the host's inbox names the guest and the listing", 'Kojo Asante' in inbox and 'self contained 1 in Osu' in inbox, inbox[:250])
check('with a preview of the last message, already redacted', 'Is it still available?' in inbox and '0244 123 456' not in inbox)
check('and marks it unread', '(unread)' in inbox)
counts = action(HOST, '/inbox', 'unreadCounts')
check('the header count reports one unread conversation', counts.get('messages') == 1, counts)

action(HOST, f'/inbox/{tid}', 'markThreadRead', tid)
check('opening the conversation marks it read', '(unread)' not in text(curl(HOST, BASE + '/inbox')))

rep = action(HOST, f'/inbox/{tid}', 'reply', tid, 'Yes, it is. Saturday at 10?')
check('the host replies', rep.get('ok') is True, rep)
latest = action(GUEST, f'/inbox/{tid}', 'messagePage', tid)
check('the guest receives the reply on the next poll', any(m['body'] == 'Yes, it is. Saturday at 10?' for m in latest['data']['messages']))

# Strangers and self-messaging.
h = subprocess.run(['curl', '-s', '-b', STRANGER, '-D', '-', '-o', '/dev/null', f'{BASE}/inbox/{tid}'], capture_output=True, text=True).stdout
check("a stranger gets a 404 for someone else's conversation", h.startswith('HTTP/1.1 404'), h.split(chr(13))[0])
check("a stranger cannot post into it", action(STRANGER, f'/inbox/{tid}', 'reply', tid, 'hi').get('ok') is False)
own = action(HOST, '/message/listing-01', 'sendToHost', TERM_ID, 'testing')
check('a host messaging their own listing is told so plainly', own.get('error') == 'This is your own listing.', own)

# Paging back through a long conversation, with no duplicates.
for i in range(33):
    action(GUEST, f'/inbox/{tid}', 'reply', tid, f'message {i}')
first = action(GUEST, f'/inbox/{tid}', 'messagePage', tid)['data']
check('a long conversation arrives a page at a time, with a cursor', len(first['messages']) == 30 and first.get('nextBefore'))
older = action(GUEST, f'/inbox/{tid}', 'messagePage', tid, first['nextBefore'])['data']
ids = [m['id'] for m in first['messages']] + [m['id'] for m in older['messages']]
check('scrolling back loads the rest, nothing repeated', len(ids) == 35 and len(set(ids)) == 35, len(ids))

# Once the guest has paid, contact details go through.
d = (datetime.date.today() + datetime.timedelta(days=90)).isoformat()
b = action(GUEST, '/book/listing-01', 'createBooking', TERM_ID, {'startsOn': d, 'months': 12, 'guests': 1}, str(uuid.uuid4()))
bid = b['data']['id']
action(HOST, '/hosting/bookings', 'approveBooking', bid)
ref = action(GUEST, '/book/listing-01', 'startPayment', bid)['data']['url'].rsplit('/', 1)[-1]
subprocess.run(['curl', '-s', '-o', '/dev/null', '-X', 'POST', f'http://localhost:8099/checkout/{ref}/pay'])
after = action(GUEST, f'/inbox/{tid}', 'reply', tid, 'Paid. My number is 0244 123 456')
check('after payment, contact details are no longer hidden', after['data']['redacted'] is False and '0244 123 456' in after['data']['body'], after)

# Notifications.
notes = text(curl(GUEST, BASE + '/notifications'))
check("the guest's notifications show the confirmation", 'Booking confirmed' in notes)
check('and it links to the booking', f'href="/bookings/{bid}"' in curl(GUEST, BASE + '/notifications'))
check('the header counts it unread', action(GUEST, '/notifications', 'unreadCounts').get('notifications', 0) >= 1)
host_page = text(curl(HOST, f'{BASE}/bookings/{bid}'))
check('the host opening that booking sees the host view, not a Pay button', 'Booked and paid' in host_page and 'Pay GHS' not in host_page and 'Kojo Asante' in host_page, host_page[:250])
check('mark all read clears the count', action(GUEST, '/notifications', 'markAllNotificationsRead').get('ok') is True and action(GUEST, '/notifications', 'unreadCounts').get('notifications') == 0)

# The header.
signed_in = curl(GUEST, BASE + '/inbox')
check('signed-in pages carry the header, with inbox and bell', 'Findaspace</a>' in signed_in and 'href="/inbox"' in signed_in and 'href="/notifications"' in signed_in)
check('signed out, there is no inbox in the header', 'href="/inbox"' not in curl('/dev/null', BASE + '/'))
