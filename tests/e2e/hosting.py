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
            if 'ok' in o:
                return o
    return {'raw': out[:200]}

def text(page):
    body = re.sub(r'<script.*?</script>', '', page, flags=re.S).split('</head>', 1)[-1].replace('<!-- -->', '')
    return H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

HOST, GUEST, STRANGER = '/tmp/j_host', '/tmp/j_guest', '/tmp/j_str'
d = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()
sign_in(HOST, '0244999000'); sign_in(GUEST, '0244777111'); sign_in(STRANGER, '0244777222')

# The guest has no name yet, so the booking form asks for one.
check('a guest without a name is asked for one when booking', 'Your name' in text(curl(GUEST, BASE + '/book/listing-01')))
bad = action(GUEST, '/account', 'updateName', 'Ama 0244123456')
check('a name carrying a phone number is refused', bad.get('ok') is False and 'Phone numbers' in bad.get('error', ''), bad)
check('a real name is saved', action(GUEST, '/account', 'updateName', '  Ama   Serwaa ').get('data', {}).get('name') == 'Ama Serwaa')
check('with a name saved, the form stops asking', 'Your name' not in text(curl(GUEST, BASE + '/book/listing-01')))

lease = action(GUEST, '/book/listing-01', 'createBooking', '0199aaaa-0000-7000-8000-000000000001', {'startsOn': d(40), 'months': 12, 'guests': 2}, str(uuid.uuid4()))
lid = lease['data']['id']

# The host sees who is asking, and the deadline to answer.
hub = text(curl(HOST, BASE + '/hosting'))
check('the hosting hub counts the waiting request', '1 Request waiting' in hub, hub[:300])
inbox = text(curl(HOST, BASE + '/hosting/bookings'))
check('the request shows the guest by name', 'Ama Serwaa' in inbox)
check('and how long they have been a member, and that their phone is verified', 'Member since' in inbox and 'Phone verified' in inbox)
check('and the deadline to answer', 'Answer by' in inbox)
check('the host can approve by name', 'Approve Ama' in inbox)

# Before payment the guest does not get the address.
page = curl(GUEST, f'{BASE}/bookings/{lid}')
check('a pending request does not reveal the address', 'GA-183-8164' not in page and 'Open in Maps' not in text(page))

# Only the host can answer.
check('a stranger cannot approve the request', action(STRANGER, '/hosting/bookings', 'approveBooking', lid).get('ok') is False)
check('the guest cannot approve their own request', action(GUEST, '/hosting/bookings', 'approveBooking', lid).get('ok') is False)
check('the host approves', action(HOST, '/hosting/bookings', 'approveBooking', lid).get('ok') is True)
check('approving twice is refused politely', 'can no longer be approved' in action(HOST, '/hosting/bookings', 'approveBooking', lid).get('error', ''))

page = curl(GUEST, f'{BASE}/bookings/{lid}')
check('approved but unpaid: the guest can pay, and still has no address', 'Pay GHS' in text(page) and 'GA-183-8164' not in page)

pay = action(GUEST, '/book/listing-01', 'startPayment', lid)
ref = pay['data']['url'].rsplit('/', 1)[-1]
subprocess.run(['curl', '-s', '-o', '/dev/null', '-X', 'POST', f'http://localhost:8099/checkout/{ref}/pay'])
page = text(curl(GUEST, f'{BASE}/bookings/{lid}'))
check('once paid, the guest sees the exact address', 'GhanaPost GA-183-8164' in page and 'Blue gate after the pharmacy' in page, page[:300])
check('with a link that opens the maps app', 'google.com/maps/search/?api=1&query=5.683612,-0.166734' in H.unescape(curl(GUEST, f'{BASE}/bookings/{lid}')))

# Declining with a reason.
second = action(GUEST, '/book/listing-02', 'createBooking', '0199aaaa-0000-7000-8000-000000000002', {'startsOn': d(60), 'months': 6, 'guests': 1}, str(uuid.uuid4()))
sid = second['data']['id']
check('the host declines with a reason', action(HOST, '/hosting/bookings', 'declineBooking', sid, 'I need a longer lease').get('ok') is True)
check('the guest learns it was declined and that they were not charged', 'not charged' in text(curl(GUEST, f'{BASE}/bookings/{sid}')))

# Payouts.
pp = text(curl(HOST, BASE + '/hosting/payouts'))
check('without an account the host is asked to add a number', 'Add a mobile money number' in pp)
check('and there is nothing to withdraw yet', 'Withdraw' not in pp.replace('Ready to withdraw', ''))
check('money guests paid shows as held until they move in', 'Held until guests move in' in pp and 'GHS 7,800' in pp, pp[:400])
check('a bad number is refused', action(HOST, '/hosting/payouts', 'savePayoutAccount', {'bankCode': 'MTN', 'number': '12345', 'name': 'Kofi Mensah'}).get('ok') is False)
check('a mobile money account is saved', action(HOST, '/hosting/payouts', 'savePayoutAccount', {'bankCode': 'MTN', 'number': '+233 24 499 9000', 'name': 'Kofi Mensah'}).get('ok') is True)
pp = text(curl(HOST, BASE + '/hosting/payouts'))
check('the account shows by brand and last four digits only', 'MTN MoMo ending 9000' in pp and '0244999000' not in pp, pp[:500])

urllib.request.urlopen('http://localhost:8099/debug/credit/500000').read()
pp = text(curl(HOST, BASE + '/hosting/payouts'))
check('released money is ready to withdraw', 'GHS 5,000' in pp and 'Withdraw' in pp)
over = action(HOST, '/hosting/payouts', 'requestPayout', '6000')
check('withdrawing more than is available is refused', over.get('ok') is False and over.get('error') == 'That is more than you can withdraw right now.', over)
urllib.request.urlopen('http://localhost:8099/debug/payouts').read()
check('a withdrawal is accepted', action(HOST, '/hosting/payouts', 'requestPayout', '1,250.50').get('ok') is True)
check('the amount sent is exactly what was typed, to the pesewa', json.load(urllib.request.urlopen('http://localhost:8099/debug/payouts')) == [125050])
check('a second withdrawal while one is in flight is refused', 'already on its way' in action(HOST, '/hosting/payouts', 'requestPayout', '10').get('error', ''))
check('the history shows it processing', 'Processing' in text(curl(HOST, BASE + '/hosting/payouts')))

# The stranger sees none of it.
check("a stranger's hosting has no requests", '0 Requests waiting' in text(curl(STRANGER, BASE + '/hosting')))
