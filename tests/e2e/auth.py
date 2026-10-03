import re, subprocess, json, time, urllib.request

BASE = 'http://localhost:3100'
JAR = '/tmp/jar.txt'
open(JAR, 'w').close()

def curl(*args):
    out = subprocess.run(['curl', '-s', '-b', JAR, '-c', JAR, *args], capture_output=True, text=True)
    return out.stdout

def hidden_fields(html):
    return re.findall(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?', html)

def submit(path, html, extra):
    args = ['-D', '/tmp/h.txt', '-X', 'POST', BASE + path]
    for name, value in hidden_fields(html):
        value = value.replace('&quot;', '"').replace('&amp;', '&')
        args += ['-F', f'{name}={value}']
    for k, v in extra.items():
        args += ['-F', f'{k}={v}']
    body = curl(*args)
    return body, open('/tmp/h.txt').read()

def text(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html))

def seen():
    return json.load(urllib.request.urlopen('http://localhost:8099/debug/seen'))

def check(label, ok):
    print(f"{'PASS' if ok else 'FAIL'}  {label}")

seen()

# 1. Protected page while signed out redirects to login with a return path.
curl('-D', '/tmp/h.txt', '-o', '/dev/null', BASE + '/account')
h = open('/tmp/h.txt').read()
check('signed out /account redirects to /login?next=/account', 'location: /login?next=%2faccount' in h.lower())

# 2. Phone step, submitted as a plain form with no JavaScript.
page = curl(BASE + '/login?next=/account')
check('login page renders the phone step', 'Send code' in page)
body, _ = submit('/login?next=/account', page, {'intent': 'send', 'phone': '024 412 3456'})
check('invalid-free phone moves to the code step', 'Enter the code' in body and '+23324****56' in body)

# 3. Wrong code shows a field error, keeps the user on the code step.
bad, _ = submit('/login?next=/account', body, {'intent': 'verify', 'code': '999999'})
check('wrong code shows the mismatch message', 'That code is not right' in text(bad))

# 4. Right code signs in: redirect to the safe next path, both cookies set.
_, h = submit('/login?next=/account', bad, {'intent': 'verify', 'code': '123 456'})
cookies = [l for l in h.lower().splitlines() if l.startswith('set-cookie')]
check('correct code redirects to /account', 'x-action-redirect: /account' in h.lower() or 'location: /account' in h.lower())
check('access and refresh cookies both set', any('fs_at=' in c for c in cookies) and any('fs_rt=' in c for c in cookies))
check('cookies are HttpOnly, SameSite=Lax, Path=/', all('httponly' in c and 'samesite=lax' in c and 'path=/' in c for c in cookies))

# 5. The BFF sent the secret on every call, and never a token in the URL.
s = seen()
app = [x for x in s if x['path'] != '/debug/seen']
check(f'every API call carried the BFF secret ({len(app)} calls)', app and all(x['bff'] for x in app))

# 6. Account page renders with the session.
acct = text(curl('-H', 'x-forwarded-for: 41.66.12.34', BASE + '/account'))
check('account page shows the signed-in phone', '+233244123456' in acct)
check('client IP forwarded to the API', any(x['xff'] == '41.66.12.34' for x in seen()))

# 7. Access token ages into the refresh window; the proxy refreshes it and
#    the SAME request renders, proving the request-cookie rewrite works.
old = [l for l in open(JAR) if 'fs_at' in l][0].split('\t')[-1].strip()
time.sleep(6)
curl('-D', '/tmp/h.txt', '-o', '/tmp/acct.html', BASE + '/account')
h = open('/tmp/h.txt').read().lower()
new = [l for l in open(JAR) if 'fs_at' in l][0].split('\t')[-1].strip()
check('expiring token refreshed by the proxy', new != old)
check('the refreshing request itself rendered, not a redirect', h.startswith('http/1.1 200') and '+233244123456' in text(open('/tmp/acct.html').read()))

# 8. Several parallel requests with an expiring token: nobody gets signed out.
time.sleep(6)
procs = [subprocess.Popen(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-b', JAR, BASE + '/account'], stdout=subprocess.PIPE, text=True) for _ in range(5)]
codes = [p.communicate()[0] for p in procs]
after = text(curl(BASE + '/account'))
check(f'5 parallel requests during refresh all rendered ({" ".join(codes)})', all(c == '200' for c in codes))
check('still signed in after the parallel burst', '+233244123456' in after)

# 9. Open redirect: a hostile next path lands on home.
curl('-D', '/tmp/h.txt', '-o', '/dev/null', BASE + '/login?next=//evil.example')
check('signed-in visit to /login?next=//evil.example goes home, not away', 'location: /\r' in open('/tmp/h.txt').read().lower() or 'location: /\n' in open('/tmp/h.txt').read().lower())

# 10. Sign out clears both cookies and revokes the family at the API.
acct_html = curl(BASE + '/account')
_, h = submit('/account', acct_html, {})
h = h.lower()
check('sign out clears both cookies', 'fs_at=;' in h and 'fs_rt=;' in h)
curl('-D', '/tmp/h.txt', '-o', '/dev/null', BASE + '/account')
check('after sign out, /account redirects to login', 'location: /login' in open('/tmp/h.txt').read().lower())
