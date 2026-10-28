"""Genera data/tablero.js (datos del tablero) y corrige data/datos.js.
Uso: python3 -I gen.py <dir_adjuntos> <dir_repo> <dir_salida> <ba_map_js>
"""
import sys, json, re, math, unicodedata, openpyxl, os

ATT, REPO, OUT, MAPJS = sys.argv[1:5]
f = lambda pat: [os.path.join(ATT, x) for x in os.listdir(ATT) if pat in x][0]

def norm(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'[^A-Z0-9]', '', s)

# ---------- Regionales ----------
REG = [  # id, nombre, color (validado: ver README)
    ('LA PLATA', 'La Plata', '#00589b'),
    ('NORTE', 'Norte', '#e8710a'),
    ('CENTRO OESTE', 'Centro Oeste', '#0094ae'),
    ('SUR', 'Sur', '#5b8c00'),
    ('MAGDALENA', 'Magdalena', '#7b3fc4'),
    ('VG', 'Villa Gesell', '#d91b6f'),
]

# ---------- Localidades (oficinas) ----------
wb = openpyxl.load_workbook(f('localidades_web'), data_only=True)
ws = wb.active
locs = []
for r in list(ws.iter_rows(values_only=True))[1:]:
    if not r[1] or str(r[1]).strip() == 'TRES ARROYOS':
        continue
    locs.append(dict(ur=r[0].strip(), loc=str(r[1]).strip(), cp=str(r[2]), dir=re.sub(r'\s+', ' ', str(r[3])).strip(),
                     hor=re.sub(r'\s+', ' ', str(r[4])).strip(), em=str(r[5]).strip(), at=str(r[6]).strip(), gas=r[7].strip()))

# ---------- Usuarios y consumo (planilla nov. 2025) ----------
ALIAS = {'AREA60N': 'AREA60NORTEVICTORIA', 'AREA60S': 'AREA60SURRESERVA', 'ARENALES': 'GENERALARENALES',
         'CAMPOSSALLES': 'CAMPOSALLES', 'LALSINA': 'LAGUNAALSINA', 'MAZUL': 'MARAZULLASGAVIOTAS',
         'OBLIGADO': 'RAFAELOBLIGADO', 'ROCA': 'AGUSTINROCA', 'BELLOCQ': 'BELLOCQ', 'RIESTRA': 'NORBERTODELARIESTRA',
         'SANBLAS': 'BAHIASANBLAS', 'SMARIA': 'SALVADORMARIA', 'VILLANUEVA': 'VILLANUEVA'}
wb = openpyxl.load_workbook(f('USUARIOS_Y_CONSUMO'), data_only=True)
ws = wb.active
usu = {}
for r in ws.iter_rows(values_only=True):
    for off in (1, 8):
        name = r[off] if len(r) > off else None
        if not name or not isinstance(r[off + 1], (int, float)):
            continue
        if str(name).strip().upper() == 'TOTALES':
            continue
        k = norm(name); k = ALIAS.get(k, k)
        m3 = r[off + 5]
        usu[k] = dict(con=r[off + 1], sin=r[off + 2], sgp=r[off + 3], tot=r[off + 4],
                      m3=round(m3) if isinstance(m3, (int, float)) else None, m3n=(m3 == 'N/I'))

# ---------- Conectados desde 2020 / potenciales ----------
wb = openpyxl.load_workbook(f('apertura_de_sesiones'), data_only=True)
conn = {}
for r in wb.active.iter_rows(values_only=True):
    r = [c for c in r if c is not None]
    if len(r) >= 2 and isinstance(r[0], int) and r[0] < 100 and isinstance(r[1], str):
        conn[norm(r[1])] = (r[2], r[3]) if len(r) >= 4 else (None, None)
CONN_ALIAS = {'VILLAGESELL': 'VILLAGESELL', 'DELCARRILPOLVAREDAS': None, 'GENERALMANSILLA': None}

# ---------- Partido de cada localidad (para ubicarla en el mapa) ----------
PARTIDO = {
 'MAGDALENA': 'Magdalena', 'BAVIO': 'Magdalena', 'VIEYTES': 'Magdalena', 'ATALAYA': 'Magdalena',
 'PIPINAS': 'Punta Indio', 'VERONICA': 'Punta Indio', 'ALVAREZJONTE': 'Punta Indio',
 'DUDIGNAC': '9 de Julio', 'PATRICIOS': '9 de Julio',
 'GENERALARENALES': 'General Arenales', 'FERRE': 'General Arenales',
 'LAGUNAALSINA': 'Guaminí', 'GUAMINI': 'Guaminí', 'CASBAS': 'Guaminí',
 'QUENUMA': 'Salliqueló', 'NORBERTODELARIESTRA': '25 de Mayo', 'PEDERNALES': '25 de Mayo',
 'ROBERTS': 'Lincoln', 'PASTEUR': 'Lincoln', 'BAYAUCA': 'Lincoln', 'AGUSTINROCA': 'Junín',
 'SANMANUEL': 'Lobería', 'MOQUEHUA': 'Chivilcoy', 'BAHIASANBLAS': 'Patagones',
 'SALVADORMARIA': 'Lobos', 'CARBONI': 'Lobos',
 'COPETONAS': 'Tres Arroyos', 'CASCALLARES': 'Tres Arroyos', 'CLAROMECO': 'Tres Arroyos', 'ORENSE': 'Tres Arroyos', 'BELLOCQ': 'Tres Arroyos',
 'TODD': 'Arrecifes', 'BUNGE': 'General Pinto', 'GERMANIA': 'General Pinto', 'GRANADA': 'General Pinto',
 'PIEDRITAS': 'General Villegas', 'PUEBLODOYLE': 'San Pedro', 'RIOTALA': 'San Pedro', 'SANTALUCIA': 'San Pedro',
 'OBRIEN': 'Bragado', 'COMODOROPY': 'Bragado', 'VILLAVENTANA': 'Tornquist',
 'CAMPOSALLES': 'San Nicolás', 'SANNICOLAS': 'San Nicolás', 'MECHONGUE': 'General Alvarado',
 'ARTUROSEGUI': 'La Plata', 'PLA': 'Alberti', 'CARABELAS': 'Rojas', 'RAFAELOBLIGADO': 'Rojas',
 'ORIENTE': 'Coronel Dorrego', 'ELPERDIDO': 'Coronel Dorrego', 'CLARAZ': 'Necochea', 'MAXIMOPAZ': 'Cañuelas',
 'VILLANUEVA': 'General Belgrano', 'TRESSARGENTOS': 'Carmen de Areco', 'MONESCAZON': 'Pehuajó', 'SALAZAR': 'Daireaux',
 'LACOLINA': 'General La Madrid', 'PIROVANO': 'Bolívar', 'DELCARRIL': 'Saladillo', 'POLVAREDAS': 'Saladillo',
 'NAPALEOFU': 'Balcarce', 'PORTELA': 'Baradero', 'RAWSON': 'Chacabuco', 'FONTEZUELA': 'Pergamino',
 'VILLAGESELL': 'Villa Gesell', 'MARDELASPAMPAS': 'Villa Gesell', 'MARAZULLASGAVIOTAS': 'Villa Gesell',
 'LALUISA': 'Capitán Sarmiento', 'GARDEY': 'Tandil', 'INESINDART': 'Salto',
 'AREA60NORTEVICTORIA': 'La Plata', 'ELRODEO': 'La Plata', 'AREA60SURRESERVA': 'Brandsen', 'BOSQUECITOS': 'Brandsen', 'GOMEZ': 'Brandsen',
 'CUCULLU': 'San Andrés de Giles', 'BLAQUIER': 'Florentino Ameghino', 'PEARSON': 'Colón',
}

# ---------- Mapa (IGN, vía argentina-map-react, MIT) ----------
src = open(MAPJS, encoding='utf-8').read()
paths = dict(re.findall(r'var (d\d*) = `([^`]*)`', src))
parts = []
for m in re.finditer(r'ProvinceBase_default, \{ id: "(\d+)", name: "([^"]+)", d(?:: (d\d+))?,', src):
    pid, name, var = m.groups(); var = var or 'd'
    name = name.encode('ascii').decode('unicode_escape')
    parts.append(dict(id=pid, n=name, d=paths[var]))
vb = re.search(r'viewBox: "([^"]+)"', src).group(1)

def centroid(d):
    best = None
    for sub in re.findall(r'M[^M]+', d):
        pts = [tuple(map(float, p)) for p in re.findall(r'(-?[\d.]+)[ ,](-?[\d.]+)', sub)]
        if len(pts) < 3: continue
        A = cx = cy = 0
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
        if A == 0: continue
        A /= 2; cand = (abs(A), cx / (6 * A), cy / (6 * A))
        if not best or cand[0] > best[0]: best = cand
    return round(best[1], 2), round(best[2], 2)

byname = {norm(p['n']): p for p in parts}
for p in parts:
    p['c'] = centroid(p['d'])

# ---------- Armado de localidades ----------
groups = {}
for l in locs:
    k = norm(l['loc'])
    u = usu.get(k)
    l.update(con=None, sin=None, sgp=None, tot=None, m3=None, m3n=None)
    if u: l.update(u)
    c = conn.get(k)
    l['sc'], l['sp'] = (c if c else (None, None))
    if k in ('DELCARRIL', 'POLVAREDAS'):
        l['sg'] = 'Del Carril y Polvaredas'
    pk = PARTIDO[k]
    l['pdo'] = byname[norm(pk)]['n']
    l['pid'] = byname[norm(pk)]['id']
    groups.setdefault(pk, []).append(l)
dc = conn.get('DELCARRILPOLVAREDAS')
for l in locs:
    if norm(l['loc']) == 'DELCARRIL':
        l['sc'], l['sp'] = dc
missing = [l['loc'] for l in locs if l['tot'] is None]
unused = set(usu) - {norm(l['loc']) for l in locs}
print('Localidades:', len(locs), '| sin usuarios:', missing, '| filas de planilla sin localidad:', unused)

# posición del punto: centro del partido, separando si hay varias localidades
for pk, ls in groups.items():
    cx, cy = byname[norm(pk)]['c']
    n = len(ls); r = 0 if n == 1 else (1.6 if n <= 3 else 2.2)
    for i, l in enumerate(sorted(ls, key=lambda x: x['loc'])):
        a = -math.pi / 2 + 2 * math.pi * i / n
        l['x'] = round(cx + r * math.cos(a), 2); l['y'] = round(cy + r * math.sin(a), 2)

# ---------- Datos existentes (demanda, presupuesto, SEF, obras) ----------
ds = open(os.path.join(REPO, 'data', 'datos.js'), encoding='utf-8').read()
head, js = ds.split('window.BAGSA_DATA=', 1)
D = json.loads(js.strip().rstrip(';'))

OB_REG = {0: ['LA PLATA'], 1: ['CENTRO OESTE'], 2: ['VG'], 3: ['NORTE'], 4: ['NORTE'], 5: ['SUR'], 6: ['CENTRO OESTE'],
          7: ['LA PLATA'], 8: ['LA PLATA'], 9: ['MAGDALENA'], 10: ['CENTRO OESTE'], 11: ['CENTRO OESTE'], 12: ['LA PLATA'],
          13: ['LA PLATA'], 14: ['NORTE', 'CENTRO OESTE'], 15: [], 16: [], 17: ['MAGDALENA'], 18: ['CENTRO OESTE', 'LA PLATA'], 19: []}
OB_CORTO = ['Máximo Paz', 'Guaminí y Laguna Alsina', 'Interconexión Villa Gesell – Mar de las Pampas', 'Fontezuela',
            'Parque Industrial Todd', 'Claraz', 'Dudignac (conversión GLP a GN)', 'Comodoro Py', 'Pla',
            'Planta de General Mansilla', 'Pirovano', 'Mones Cazón y Salazar', 'Patricios', 'Polvaredas y Del Carril',
            'Supervisión remota (Agustín Roca, O’Brien y Casbas)', 'Mechita', 'Juan Anchorena',
            'Planta de transferencia Chascomús', 'Moquehuá, N. de la Riestra y Pedernales (GLP a GN)',
            'Rancagua, Villa San José y Arroyo Dulce']
obras = D['obras']
# completar con la presentación del 19/08/2026
obras[4].update(con='15 industrias', inv='385', loc='Parque Industrial Todd')
obras[8].update(con='148', inv='1.984', loc='Pla')
obras[14]['loc'] = 'Agustín Roca, O’Brien y Casbas'
for i, o in enumerate(obras):
    o['reg'] = OB_REG[i]; o['corto'] = OB_CORTO[i]
    if o['estado'] == 'Finalizada': o['avance'] = 100
    o['montoN'] = None
    m = re.search(r'\$\s?([\d.]+)', o.get('monto') or '')
    if m: o['montoN'] = int(m.group(1).replace('.', ''))
    y = re.search(r'(20\d\d)', o.get('fin') or o.get('fecha') or '')
    o['anio'] = int(y.group(1)) if y else None

T = dict(
    generado='2026-10-28',
    reg=[dict(id=a, n=b, c=c) for a, b, c in REG],
    locs=locs,
    mapa=dict(vb=vb, p=[dict(id=p['id'], n=p['n'], d=p['d']) for p in parts]),
    obras=obras, dem=D['dem'], pres=D['pres'], sef=D['sef'], res=D['res'],
    conTotal=8300,
)
os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
with open(os.path.join(OUT, 'data', 'tablero.js'), 'w', encoding='utf-8') as fh:
    fh.write('// Tablero de gestión BAGSA. Generado el 28/10/2026 a partir de:\n'
             '// USUARIOS_Y_CONSUMO_BAGSA.xlsx (usuarios y consumo, nov. 2025), localidades_web-preliminar.xlsx,\n'
             '// Datos_para_armar_informe_de_apertura_de_sesiones_2027.xlsx, 2026.08.19_BAGSA.pptx,\n'
             '// 54 - INFORME OBRAS BAGSA Octubre 2026.pdf. Límites de partidos: IGN (vía argentina-map-react, MIT).\n')
    fh.write('window.TABLERO=' + json.dumps(T, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------- Corrección de datos.js (columnas de GN corridas) ----------
fix = {norm(l['loc']): l for l in locs}
for l in D['locs']:
    n = fix.get(norm(l['loc']))
    if n:
        for k in ('con', 'sin', 'sgp', 'tot', 'm3', 'm3n'):
            l[k] = n[k]
        if l['loc'] == 'POLVAREDAS':
            l['sc'] = l['sp'] = None  # el dato compartido queda en Del Carril (evita contarlo dos veces)
for i in (4, 8):
    D['obras'][i].update(con=obras[i]['con'], inv=obras[i]['inv'], loc=obras[i]['loc'])
for o in D['obras']:
    for k in ('reg', 'corto', 'montoN', 'anio'):
        o.pop(k, None)
    if o['estado'] == 'Finalizada': o['avance'] = None
with open(os.path.join(OUT, 'data', 'datos.js'), 'w', encoding='utf-8') as fh:
    fh.write(head + 'window.BAGSA_DATA=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';')

# resumen por regional para control
agg = {}
for l in locs:
    a = agg.setdefault(l['ur'], dict(n=0, u=0, m3=0))
    a['n'] += 1; a['u'] += l['tot'] or 0; a['m3'] += l['m3'] or 0
print(json.dumps(agg, ensure_ascii=False))
print('Totales:', sum(a['n'] for a in agg.values()), sum(a['u'] for a in agg.values()), sum(a['m3'] for a in agg.values()))
