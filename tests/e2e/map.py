import re, subprocess, sys, html as H

BASE = 'http://localhost:3100'
TILES = sys.argv[1] == 'with'
get = lambda p: subprocess.run(['curl', '-s', BASE + p], capture_output=True, text=True).stdout

def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ''))

page = get('/?type=room')
if TILES:
    btn = re.search(r'href="([^"]*)"[^>]*>Show map<', page)
    check('phones get a "Show map" button', btn is not None)
    check('it opens the map view and keeps the filters', btn and H.unescape(btn.group(1)) == '/?type=room&view=map', btn and btn.group(1))
    check('desktop has the map beside the list', 'lg:grid-cols-[minmax(0,1fr)_42%]' in page)
    mp = get('/?type=room&view=map')
    lst = re.search(r'href="([^"]*)"[^>]*>Show list<', mp)
    check('the map view offers the way back to the list', lst and H.unescape(lst.group(1)) == '/?type=room', lst and lst.group(1))
    check('the phone map view renders its full-screen container', 'fixed inset-x-0 top-14 bottom-0 z-20 lg:hidden' in mp)
    robots = re.search(r'<meta name="robots" content="([^"]+)"', mp)
    check('the map view is not indexed; it repeats page one', robots and 'noindex' in robots.group(1))
    chip = re.search(r'href="([^"]*)"[^>]*>Shop<', mp)
    check('choosing a category from the map keeps the map open', chip and 'view=map' in H.unescape(chip.group(1)), chip and chip.group(1))
    check('an empty search offers no map button', 'Show map' not in get('/?q=zzzznothing'))
else:
    check('without tiles there is no map button', 'Show map' not in page)
    check('and no map column: the list is the whole page', 'lg:grid-cols-[minmax(0,1fr)_42%]' not in page)
    check('asking for the map view anyway just shows the list', 'fixed inset-x-0 top-14' not in get('/?view=map') and 'room 0 in Madina' in get('/?view=map'))
