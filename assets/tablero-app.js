/* Tablero de gestión BAGSA — lógica de las 7 pantallas.
   Lee window.TABLERO (data/tablero.js). Sin dependencias externas. */
(function () {
  'use strict';
  var T = window.TABLERO, L = T.locs, O = T.obras;
  var $ = function (id) { return document.getElementById(id); };
  var REG = {}; T.reg.forEach(function (r, i) { r.i = i; REG[r.id] = r; });
  var state = { tab: 'resumen', reg: null, comp: 'tot', gas: 'all', ob: 'all', sort: { k: 'tot', d: -1 }, open: {} };

  /* ---------- Utilidades ---------- */
  var nf = function (n, d) { return n == null ? '—' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var pct = function (a, b, d) { return nf(a / b * 100, d == null ? 0 : d) + '%'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cap = function (s) { return s.toLowerCase().replace(/(^|[\s\-\/'’])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|La|Las|Del|Y)\b/g, function (m) { return m.toLowerCase(); }).replace(/^./, function (c) { return c.toUpperCase(); }); };
  var plain = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var sum = function (a, k) { return a.reduce(function (s, r) { return s + (r[k] || 0); }, 0); };
  var locName = function (l) { var m = { 'AREA 60 NORTE-VICTORIA': 'Área 60 Norte (Victoria)', 'AREA 60 SUR-RESERVA': 'Área 60 Sur (Reserva)', "O'BRIEN": 'O’Brien', 'GUAMINI': 'Guaminí', 'QUENUMA': 'Quenumá', 'MOQUEHUA': 'Moquehuá', 'BAHIA SAN BLAS': 'Bahía San Blas', 'SALVADOR MARIA': 'Salvador María', 'CLAROMECO': 'Claromecó', 'MECHONGUE': 'Mechongué', 'ARTURO SEGUI': 'Arturo Seguí', 'MAXIMO PAZ': 'Máximo Paz', 'MONES CAZON': 'Mones Cazón', 'NAPALEOFU': 'Napaleofú', 'RIO TALA': 'Río Tala', 'ALVAREZ JONTE': 'Álvarez Jonte', 'SAN NICOLAS': 'San Nicolás', 'INES INDART': 'Inés Indart', 'GOMEZ': 'Gómez', 'VERONICA': 'Verónica', 'FERRE': 'Ferré', 'AGUSTIN ROCA': 'Agustín Roca', 'SANTA LUCIA': 'Santa Lucía', 'PLA': 'Plá', 'GRANADA': 'Coronel Granada', 'MAR AZUL LAS GAVIOTAS': 'Mar Azul y Las Gaviotas', 'VILLANUEVA': 'Villanueva', 'CAMPO SALLES': 'Campos Salles' }; return m[l.loc] || cap(l.loc); };
  var tip = $('tip');
  function showTip(html, e) { tip.innerHTML = html; tip.classList.add('on'); moveTip(e); }
  function moveTip(e) { var x = e.clientX + 14, y = e.clientY + 14, w = tip.offsetWidth, h = tip.offsetHeight; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.classList.remove('on'); }
  function setH(id, html) { $(id).innerHTML = html; }

  /* Forma de cada regional: color + forma, para que no dependa solo del color */
  function shape(i, x, y, r) {
    var p = [], k, a;
    switch (i % 6) {
      case 0: return 'M' + (x - r) + ',' + y + 'a' + r + ',' + r + ' 0 1,0 ' + 2 * r + ',0a' + r + ',' + r + ' 0 1,0 ' + (-2 * r) + ',0Z';
      case 1: r *= .9; return 'M' + (x - r) + ',' + (y - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + (-2 * r) + 'Z';
      case 2: r *= 1.25; return 'M' + x + ',' + (y - r) + 'L' + (x + r) + ',' + y + 'L' + x + ',' + (y + r) + 'L' + (x - r) + ',' + y + 'Z';
      case 3: r *= 1.25; return 'M' + x + ',' + (y - r) + 'L' + (x + r * .95) + ',' + (y + r * .7) + 'L' + (x - r * .95) + ',' + (y + r * .7) + 'Z';
      case 4: r *= 1.25; return 'M' + x + ',' + (y + r) + 'L' + (x + r * .95) + ',' + (y - r * .7) + 'L' + (x - r * .95) + ',' + (y - r * .7) + 'Z';
      default: for (k = 0; k < 6; k++) { a = Math.PI / 3 * k; p.push((x + r * 1.1 * Math.cos(a)).toFixed(2) + ',' + (y + r * 1.1 * Math.sin(a)).toFixed(2)); } return 'M' + p.join('L') + 'Z';
    }
  }
  function swatch(r, size) { size = size || 12; return '<svg viewBox="0 0 12 12" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="' + shape(r.i, 6, 6, 4.6) + '" fill="' + r.c + '"/></svg>'; }

  /* ---------- Agregados ---------- */
  var byReg = T.reg.map(function (r) {
    var ls = L.filter(function (l) { return l.ur === r.id; });
    return { r: r, ls: ls, n: ls.length, gn: ls.filter(function (l) { return l.gas === 'GN'; }).length, glp: ls.filter(function (l) { return l.gas === 'GLP'; }).length, tot: sum(ls, 'tot'), m3: sum(ls, 'm3'), con: sum(ls, 'con'), sin: sum(ls, 'sin'), sgp: sum(ls, 'sgp'), sc: sum(ls, 'sc') };
  });
  var ALL = { n: L.length, gn: L.filter(function (l) { return l.gas === 'GN'; }).length, glp: L.filter(function (l) { return l.gas === 'GLP'; }).length, tot: sum(L, 'tot'), m3: sum(L, 'm3'), con: sum(L, 'con'), sin: sum(L, 'sin'), sgp: sum(L, 'sgp'), sc: sum(L, 'sc') };
  var aggOf = function (id) { return byReg.filter(function (a) { return a.r.id === id; })[0]; };

  /* Demanda: series por mes */
  var lab = T.dem.lab, MES = { ene: 'enero', feb: 'febrero', mar: 'marzo', abr: 'abril', may: 'mayo', jun: 'junio', jul: 'julio', ago: 'agosto', sep: 'septiembre', oct: 'octubre', nov: 'noviembre', dic: 'diciembre' };
  var mesLargo = function (l) { return MES[l.slice(0, 3)] + ' ' + (2000 + +l.slice(4)); };
  var mesCorto = function (l) { return l.slice(0, 1).toUpperCase() + l.slice(1, 3); };
  var dias = function (l) { var m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'].indexOf(l.slice(0, 3)) + 1; return new Date(2000 + +l.slice(4), m, 0).getDate(); };
  function serie(gas) { return lab.map(function (_, i) { return T.dem.s.filter(function (s) { return gas === 'all' || s.gas === gas; }).reduce(function (t, s) { return t + s.v[i]; }, 0); }); }
  var N = lab.length, CUR = [N - 12, N - 1], PREV = [N - 24, N - 13];
  function anual(gas, a, b) { var v = serie(gas), t = 0; for (var i = a; i <= b; i++) t += v[i] * dias(lab[i]); return t; }

  /* Presupuesto */
  var P = T.pres, row = function (tbl, c) { return P[tbl].filter(function (r) { return r.c.indexOf(c) === 0; })[0]; };
  var sem = function (r) { return (r.v[1] || 0) + (r.v[2] || 0); };
  var gCor = row('corr', 'GASTOS CORRIENTES'), iCor = row('corr', 'INGRESOS CORRIENTES'), gCap = row('cap', 'GASTOS DE CAPITAL'), aCor = row('corr', 'APORTE DE CAPITAL PBA'), aCap = row('cap', 'APORTE DE CAPITAL PBA');
  var gastoPrev = gCor.v[4] + gCap.v[4], gastoEj = sem(gCor) + sem(gCap), gasto25 = gCor.v[0] + gCap.v[0];
  var money = function (v) { return (v < 0 ? '−' : '') + '$\u00a0' + nf(Math.abs(v)) + '\u00a0M'; };

  /* Obras */
  var EST = { 'En ejecución': 'ej', 'Finalizada': 'fi', 'Planificada': 'pl' };
  var obrasDe = function (id) { return O.filter(function (o) { return !id || o.reg.indexOf(id) > -1; }); };
  var ejec = O.filter(function (o) { return o.estado === 'En ejecución'; });
  var num = function (s) { return s ? +String(s).replace(/\./g, '').replace(',', '.') : 0; };

  /* ---------- Pestañas y filtro ---------- */
  var TABS = [['resumen', 'Resumen'], ['mapa', 'Mapa por regional'], ['comparativo', 'Comparativo'], ['demanda', 'Demanda y SEF'], ['presupuesto', 'Presupuesto'], ['obras', 'Obras'], ['localidades', 'Localidades']];
  $('tabs').innerHTML = TABS.map(function (t, i) { return '<button class="tab" role="tab" id="t-' + t[0] + '" aria-controls="s-' + t[0] + '" aria-selected="false" data-t="' + t[0] + '"><b>' + (i + 1) + '</b>' + t[1] + '</button>'; }).join('');
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) go(b.getAttribute('data-t')); });
  function go(t, noHash) {
    state.tab = t;
    TABS.forEach(function (x) { var on = x[0] === t; $('t-' + x[0]).setAttribute('aria-selected', on); $('s-' + x[0]).hidden = !on; });
    $('t-' + t).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!noHash) history.replaceState(null, '', '#' + t + (state.reg ? '/' + encodeURIComponent(state.reg) : ''));
    $('main').scrollTop = 0; if (!document.body.classList.contains('pres')) window.scrollTo(0, 0);
    if (t === 'demanda') renderDem();
  }
  $('chips').insertAdjacentHTML('beforeend', '<button class="chip" data-r="" aria-pressed="true">Todas</button>' + T.reg.map(function (r) { return '<button class="chip" data-r="' + r.id + '" aria-pressed="false">' + swatch(r) + r.n + '</button>'; }).join(''));
  $('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) setReg(b.getAttribute('data-r') || null); });
  function setReg(id) {
    state.reg = (id && id === state.reg) ? null : id;
    [].forEach.call(document.querySelectorAll('#chips .chip'), function (c) { c.setAttribute('aria-pressed', (c.getAttribute('data-r') || null) === state.reg); });
    history.replaceState(null, '', '#' + state.tab + (state.reg ? '/' + encodeURIComponent(state.reg) : ''));
    renderAll();
  }
  var regLabel = function () { return state.reg ? REG[state.reg].n : null; };
  var scopeAll = '<span class="scope">Dato de toda la empresa</span>';

  /* ---------- 1. Resumen ---------- */
  function deltaHtml(v, txt, unit) { var c = Math.abs(v) < 0.05 ? 'flat' : v > 0 ? 'up' : 'down', ar = c === 'flat' ? '■' : v > 0 ? '▲' : '▼'; return '<span class="delta ' + c + '">' + ar + ' ' + (v > 0 ? '+' : '') + nf(v, 1) + (unit || '%') + ' <span>' + txt + '</span></span>'; }
  function renderResumen() {
    var g = state.reg ? aggOf(state.reg) : null, k = [];
    var cur = anual('all', CUR[0], CUR[1]), prev = anual('all', PREV[0], PREV[1]);
    var gnOf = T.res.dem.gn, glpOf = T.res.dem.glp; // totales oficiales de la presentación
    var tot = serie('all'), mNow = tot[N - 1], mPrev = tot[N - 13];
    var sefP = T.sef.per, resNow = sefP[1][3], resPrev = sefP[0][3];
    var obR = obrasDe(state.reg), obE = obR.filter(function (o) { return o.estado === 'En ejecución'; }), obF = obR.filter(function (o) { return o.estado === 'Finalizada'; });
    if (!g) {
      k.push({ l: 'Localidades con servicio', v: nf(T.res.loc), s: T.res.gn + ' con gas natural · ' + T.res.glp + ' con GLP', x: '<span class="delta flat">+2 <span>redes en construcción</span></span>', src: 'Presentación 19/08/2026' });
      k.push({ l: 'Usuarios', v: nf(T.res.usuarios), s: 'El 94% son residenciales', x: deltaHtml((resNow - resPrev) / resPrev * 100, 'residenciales vs. dic. 2025'), src: 'Julio de 2026' });
      k.push({ l: 'Consumo de los últimos 12 meses', v: nf(gnOf + glpOf), u: 'mil m³', s: nf(gnOf) + ' de gas natural · ' + nf(glpOf) + ' de GLP', x: deltaHtml((cur - prev) / prev * 100, 'vs. 12 meses anteriores'), src: 'Abril 2025 – marzo 2026' });
    } else {
      k.push({ l: 'Localidades con servicio', v: nf(g.n), s: g.gn + ' con gas natural · ' + g.glp + ' con GLP', x: '<span class="delta flat">' + pct(g.n, ALL.n) + ' <span>de las ' + ALL.n + ' localidades</span></span>', src: 'Regional ' + g.r.n });
      k.push({ l: 'Usuarios', v: nf(g.tot), s: nf(g.con) + ' residenciales con SEF · ' + nf(g.sgp) + ' SGP', x: '<span class="delta flat">' + pct(g.tot, ALL.tot) + ' <span>del total de usuarios</span></span>', src: 'Planilla de noviembre de 2025' });
      k.push({ l: 'Consumo del mes', v: nf(g.m3), u: 'm³', s: 'Consumo registrado en noviembre de 2025', x: '<span class="delta flat">' + pct(g.m3, ALL.m3) + ' <span>del consumo total</span></span>', src: 'Planilla de noviembre de 2025' });
    }
    k.push({ l: 'Presupuesto 2026', v: '$ ' + nf(gastoPrev), u: 'millones', s: 'Gasto previsto (corriente y de capital)', bar: gastoEj / gastoPrev, x: '<span class="delta flat">' + pct(gastoEj, gastoPrev) + ' <span>ejecutado en el primer semestre</span></span>', src: 'Actualización a julio de 2026', all: !!g });
    k.push({ l: g ? 'Obras de la regional' : 'Obras en curso', v: nf(obE.length), u: obE.length === 1 ? 'en ejecución' : 'en ejecución', s: obE.length ? obE.map(function (o) { return o.corto + ' ' + nf(o.avance, 0) + '%'; }).join(' · ') : 'Ninguna en ejecución', x: '<span class="delta flat">' + obF.length + ' <span>' + (obF.length === 1 ? 'finalizada' : 'finalizadas') + ' desde 2020</span></span>', src: 'Informe de obras, octubre de 2026' });
    k.push({ l: 'Demanda del mes', v: nf(mNow, 1), u: 'mil m³/día', s: 'Promedio diario de ' + mesLargo(lab[N - 1]), x: deltaHtml((mNow - mPrev) / mPrev * 100, 'vs. ' + mesLargo(lab[N - 13])), src: 'Último mes informado', all: !!g });
    $('kpis').innerHTML = k.map(function (c) {
      return '<div class="card kpi"><div class="lab">' + c.l + (c.all ? scopeAll : '') + '</div><div class="val">' + c.v + (c.u ? '<small>' + c.u + '</small>' : '') + '</div>' +
        (c.bar != null ? '<div class="mini-bar" role="img" aria-label="' + pct(c.bar, 1) + ' ejecutado"><i style="width:' + (c.bar * 100) + '%"></i></div>' : '') +
        '<div class="sub">' + c.s + '</div>' + c.x + '<div class="src">' + c.src + '</div></div>';
    }).join('');
    if (!g) {
      setH('h-resumen', 'BAGSA lleva gas a ' + T.res.loc + ' localidades y ' + nf(T.res.usuarios) + ' usuarios');
      setH('l-resumen', 'El consumo de los últimos 12 meses creció ' + nf((cur - prev) / prev * 100, 1) + '% y hay ' + ejec.length + ' obras en ejecución. Al primer semestre se ejecutó el ' + pct(gastoEj, gastoPrev) + ' del gasto previsto para 2026.');
      setH('n-resumen', 'Las variaciones comparan contra el período anterior equivalente. El consumo de 12 meses suma gas natural y GLP; la variación se calcula con la demanda diaria de cada mes. Elegí una regional arriba para ver sus números.');
    } else {
      setH('h-resumen', 'Regional ' + g.r.n + ': ' + g.n + ' localidades y ' + nf(g.tot) + ' usuarios');
      setH('l-resumen', 'Representa el ' + pct(g.tot, ALL.tot) + ' de los usuarios y el ' + pct(g.m3, ALL.m3) + ' del consumo de BAGSA. Presupuesto y demanda se informan para toda la empresa.');
      setH('n-resumen', 'Los datos por regional salen de la planilla de usuarios y consumo de noviembre de 2025 (' + nf(ALL.tot) + ' usuarios en total); el dato de toda la empresa a julio de 2026 es ' + nf(T.res.usuarios) + '.');
    }
  }

  /* ---------- 2. Mapa ---------- */
  var mapBuilt = false;
  function buildMap() {
    var vb = T.mapa.vb.split(' ').map(Number), has = {};
    L.forEach(function (l) { has[l.pid] = 1; });
    var s = '<svg viewBox="' + vb.join(' ') + '" role="img" aria-label="Mapa de la provincia de Buenos Aires con las localidades de BAGSA por regional"><g>';
    s += T.mapa.p.map(function (p) { return '<path class="pdo' + (has[p.id] ? ' has' : '') + '" d="' + p.d + '" data-pdo="' + esc(p.n) + '"/>'; }).join('');
    s += '</g><g id="mks">';
    L.forEach(function (l, i) { var r = REG[l.ur]; s += '<g class="mk" data-i="' + i + '" data-r="' + l.ur + '"><path d="' + shape(r.i, l.x, l.y, 1.35) + '" fill="' + r.c + '"/></g>'; });
    // sede central (La Plata)
    var lp = L.filter(function (l) { return l.loc === 'ARTURO SEGUI'; })[0];
    s += '</g>';
    if (lp) s += '<text x="' + (lp.x + 2.4) + '" y="' + (lp.y - 2.6) + '" font-size="3.4" font-weight="700" fill="#14171f">La Plata</text>';
    s += '</svg>';
    $('map').innerHTML = s;
    var mk = $('map');
    mk.addEventListener('mousemove', function (e) {
      var g = e.target.closest('.mk');
      if (g) { var l = L[+g.getAttribute('data-i')], r = REG[l.ur]; showTip('<b>' + esc(locName(l)) + '</b> · ' + l.gas + '<br><small>Partido de ' + esc(l.pdo) + ' · Regional ' + r.n + '</small><br>' + nf(l.tot) + ' usuarios' + (l.m3 != null ? ' · ' + nf(l.m3) + ' m³' : ''), e); return; }
      var p = e.target.closest('.pdo'); if (p) { showTip('<small>Partido de</small> <b>' + esc(p.getAttribute('data-pdo')) + '</b>', e); return; }
      hideTip();
    });
    mk.addEventListener('mouseleave', hideTip);
    mk.addEventListener('click', function (e) { var g = e.target.closest('.mk'); if (g) setReg(g.getAttribute('data-r')); });
    mapBuilt = true;
  }
  function renderMapa() {
    if (!mapBuilt) buildMap();
    [].forEach.call(document.querySelectorAll('#mks .mk'), function (g) { g.classList.toggle('dim', !!state.reg && g.getAttribute('data-r') !== state.reg); });
    $('regList').innerHTML = byReg.slice().sort(function (a, b) { return b.tot - a.tot; }).map(function (a) {
      var on = state.reg === a.r.id;
      return '<button class="reg-card' + (state.reg && !on ? ' dim' : '') + '" data-r="' + a.r.id + '" aria-pressed="' + on + '">' + swatch(a.r, 18) + '<span class="nm">' + a.r.n + '</span>' +
        '<span class="n"><b>' + a.n + '</b><span>' + a.gn + ' GN · ' + a.glp + ' GLP</span></span><span class="n"><b>' + nf(a.tot) + '</b><span>' + pct(a.tot, ALL.tot) + '</span></span><span class="n"><b>' + nf(a.m3 / 1000) + ' mil</b><span>' + pct(a.m3, ALL.m3) + '</span></span></button>';
    }).join('');
    var g = state.reg ? aggOf(state.reg) : null;
    if (g) setH('h-mapa', 'Regional ' + g.r.n + ': ' + g.n + ' localidades en ' + Object.keys(g.ls.reduce(function (o, l) { o[l.pdo] = 1; return o; }, {})).length + ' partidos');
    else {
      var mL = byReg.slice().sort(function (a, b) { return b.n - a.n; })[0], mU = byReg.slice().sort(function (a, b) { return b.tot - a.tot; })[0];
      setH('h-mapa', mL.r.n + ' tiene más localidades (' + mL.n + '); ' + mU.r.n + ', más usuarios (' + pct(mU.tot, ALL.tot) + ')');
    }
  }
  $('regList').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) setReg(b.getAttribute('data-r')); });

  /* ---------- 3. Comparativo ---------- */
  var MED = [['tot', 'Usuarios', 'usuarios'], ['m3', 'Consumo', 'm³ en nov. 2025'], ['n', 'Localidades', 'localidades'], ['sc', 'Conectados desde 2020', 'conexiones nuevas']];
  $('compSeg').innerHTML = MED.map(function (m) { return '<button type="button" data-m="' + m[0] + '" aria-pressed="' + (m[0] === state.comp) + '">' + m[1] + '</button>'; }).join('');
  $('compSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; state.comp = b.getAttribute('data-m'); [].forEach.call($('compSeg').children, function (x) { x.setAttribute('aria-pressed', x === b); }); renderComp(); });
  function renderComp() {
    var m = MED.filter(function (x) { return x[0] === state.comp; })[0], k = m[0], tot = ALL[k];
    var arr = byReg.slice().sort(function (a, b) { return b[k] - a[k]; }), max = arr[0][k] || 1;
    $('bars').innerHTML = arr.map(function (a) {
      var v = a[k], dim = state.reg && state.reg !== a.r.id;
      return '<div class="bar-row' + (dim ? ' dim' : '') + '" data-r="' + a.r.id + '" role="button" tabindex="0" aria-label="' + a.r.n + ': ' + nf(v) + ' ' + m[2] + '"><div class="nm">' + swatch(a.r, 14) + a.r.n + '</div><div class="track"><div class="fill" style="width:' + (v / max * 100) + '%;background:' + a.r.c + '"></div></div><div class="v">' + (k === 'm3' ? nf(v / 1000) + ' mil' : nf(v)) + '<span>' + pct(v, tot) + ' del total</span></div></div>';
    }).join('');
    var top = arr[0], fr = top[k] / tot;
    var titles = {
      tot: top.r.n + ' reúne ' + (fr > .3 ? 'casi un tercio' : 'el ' + pct(top.tot, tot)) + ' de los usuarios de BAGSA',
      m3: top.r.n + ' y ' + arr[1].r.n + ' concentran el ' + pct(arr[0].m3 + arr[1].m3, tot) + ' del consumo',
      n: top.r.n + ' es la regional con más localidades: ' + top.n + ' de ' + tot,
      sc: top.r.n + ' sumó la mayor parte de las conexiones nuevas desde 2020'
    };
    setH('h-comp', titles[k]);
    var ldes = { tot: 'Usuarios residenciales y SGP por regional, noviembre de 2025.', m3: 'Consumo registrado en noviembre de 2025, en metros cúbicos.', n: 'Localidades con servicio de cada regional (gas natural y GLP).', sc: 'Usuarios conectados a partir del 01/01/2020 en las localidades con obras nuevas (' + nf(ALL.sc) + ' en total en esas localidades).' };
    setH('l-comp', ldes[k]);
    setH('n-comp', k === 'm3' ? 'Bavio (regional Magdalena) informa 680.940 m³ con 568 usuarios: conviene confirmar el dato, porque pesa en el total de esa regional.' : k === 'sc' ? 'Fuente: datos para el informe de apertura de sesiones 2027. BAGSA informa 8.300 usuarios conectados desde 2020 en todas sus localidades; el gráfico muestra solo las localidades con detalle.' : 'Tocá una barra para filtrar el tablero por esa regional.');
  }
  $('bars').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) setReg(b.getAttribute('data-r')); });
  $('bars').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var b = e.target.closest('[data-r]'); if (b) { e.preventDefault(); setReg(b.getAttribute('data-r')); } } });

  /* ---------- 4. Demanda y SEF ---------- */
  var GAS = [['all', 'GN + GLP'], ['GN', 'Gas natural'], ['GLP', 'GLP']];
  $('demSeg').innerHTML = GAS.map(function (g) { return '<button type="button" data-g="' + g[0] + '" aria-pressed="' + (g[0] === state.gas) + '">' + g[1] + '</button>'; }).join('');
  $('demSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; state.gas = b.getAttribute('data-g'); [].forEach.call($('demSeg').children, function (x) { x.setAttribute('aria-pressed', x === b); }); renderDem(); });
  function renderDem() {
    var v = serie(state.gas), cur = v.slice(CUR[0]), prev = v.slice(PREV[0], PREV[1] + 1), labs = lab.slice(CUR[0]);
    var mx = Math.max.apply(0, cur), iMx = cur.indexOf(mx), mn = Math.min.apply(0, cur), iMn = cur.indexOf(mn), thr = mx * .75;
    var W = 760, H = 340, l = 54, r = 16, t = 26, b = 36, top = Math.max(mx, Math.max.apply(0, prev));
    var step = top > 300 ? 100 : top > 120 ? 50 : 25; top = Math.ceil(top / step) * step;
    var X = function (i) { return l + i * (W - l - r) / 11; }, Y = function (y) { return t + (H - t - b) * (1 - y / top); };
    var s = '', i;
    // banda del pico: meses que superan el 75% del máximo
    var band = cur.map(function (x) { return x >= thr; }), b0 = band.indexOf(true), b1 = band.lastIndexOf(true);
    if (b0 > -1) s += '<rect x="' + (X(b0) - (W - l - r) / 22) + '" y="' + t + '" width="' + (X(b1) - X(b0) + (W - l - r) / 11) + '" height="' + (H - t - b) + '" fill="#fbe3ee"/><text x="' + ((X(b0) + X(b1)) / 2) + '" y="' + (H - b - 10) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="#a3134f">Pico de invierno</text>';
    for (var y = 0; y <= top; y += step) s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + Y(y) + '" y2="' + Y(y) + '" stroke="' + (y ? '#e6eaf0' : '#b8c0cc') + '"/><text x="' + (l - 8) + '" y="' + (Y(y) + 4) + '" text-anchor="end" font-size="12" fill="#6b7280">' + nf(y) + '</text>';
    for (i = 0; i < 12; i++) s += '<text x="' + X(i) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="#444b59">' + mesCorto(labs[i]) + (i === 0 || labs[i].slice(0, 3) === 'ene' ? " '" + labs[i].slice(4) : '') + '</text>';
    s += '<polyline fill="none" stroke="#9aa3b2" stroke-width="2" stroke-dasharray="5 4" points="' + prev.map(function (y, i) { return X(i) + ',' + Y(y); }).join(' ') + '"/>';
    s += '<polyline fill="none" stroke="#00589b" stroke-width="3" stroke-linejoin="round" points="' + cur.map(function (y, i) { return X(i) + ',' + Y(y); }).join(' ') + '"/>';
    s += '<circle cx="' + X(iMx) + '" cy="' + Y(mx) + '" r="5.5" fill="#00589b" stroke="#fff" stroke-width="2"/><text x="' + X(iMx) + '" y="' + (Y(mx) - 12) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#14171f">' + nf(mx, 0) + '</text>';
    s += '<g id="dx" style="display:none"><line id="dxl" y1="' + t + '" y2="' + (H - b) + '" stroke="#14171f" stroke-width="1"/><circle id="dxc" r="5" fill="#00589b" stroke="#fff" stroke-width="2"/></g>';
    s += '<rect id="dhit" x="' + (l - 20) + '" y="' + t + '" width="' + (W - l - r + 40) + '" height="' + (H - t - b) + '" fill="transparent"/>';
    $('dchart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Demanda diaria promedio por mes, ' + mesLargo(labs[0]) + ' a ' + mesLargo(labs[11]) + '">' + s + '</svg>';
    var svg = $('dchart').firstChild, hit = $('dhit');
    hit.addEventListener('mousemove', function (e) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var p = pt.matrixTransform(svg.getScreenCTM().inverse());
      var k = Math.max(0, Math.min(11, Math.round((p.x - l) / ((W - l - r) / 11))));
      $('dx').style.display = ''; $('dxl').setAttribute('x1', X(k)); $('dxl').setAttribute('x2', X(k)); $('dxc').setAttribute('cx', X(k)); $('dxc').setAttribute('cy', Y(cur[k]));
      var d = (cur[k] - prev[k]) / prev[k] * 100;
      showTip('<b>' + cap(mesLargo(labs[k])) + '</b><br>' + nf(cur[k], 1) + ' mil m³/día<br><small>Año anterior: ' + nf(prev[k], 1) + ' (' + (d > 0 ? '+' : '') + nf(d, 1) + '%)</small>', e);
    });
    hit.addEventListener('mouseleave', function () { $('dx').style.display = 'none'; hideTip(); });
    $('dleg').innerHTML = '<span><i style="border-color:#00589b"></i>' + cap(mesLargo(labs[0])) + ' – ' + mesLargo(labs[11]) + '</span><span><i style="border-color:#9aa3b2;border-top-style:dashed"></i>12 meses anteriores</span><span><i class="band"></i>Meses sobre el 75% del máximo</span>';
    var a = anual(state.gas, CUR[0], CUR[1]), ap = anual(state.gas, PREV[0], PREV[1]), of = { all: T.res.dem.gn + T.res.dem.glp, GN: T.res.dem.gn, GLP: T.res.dem.glp }[state.gas];
    var times = mx / mn;
    var gasTxt = { all: 'La demanda', GN: 'La demanda de gas natural', GLP: 'La demanda de GLP' }[state.gas];
    setH('h-dem', gasTxt + ' tiene su pico en ' + MES[labs[iMx].slice(0, 3)] + (times >= 2 ? ' y es ' + (times >= 3.5 ? nf(Math.round(times)) + ' veces' : 'más del doble de') + ' la de ' + MES[labs[iMn].slice(0, 3)] : ''));
    setH('dread', 'El pico se da en ' + MES[labs[iMx].slice(0, 3)] + ': ' + nf(mx, 0) + ' mil m³ por día. Entre ' + MES[labs[b0].slice(0, 3)] + ' y ' + MES[labs[b1].slice(0, 3)] + ' la demanda supera el 75% del máximo. En los 12 meses se consumieron ' + nf(of, 0) + ' mil m³, ' + nf((a - ap) / ap * 100, 1) + '% ' + (a >= ap ? 'más' : 'menos') + ' que en el año anterior.');
    $('demScope').innerHTML = state.reg ? 'Dato de toda la empresa (no hay apertura por regional)' : 'Toda la empresa';
    renderSef();
  }
  function renderSef() {
    var P2 = T.sef.per, j = T.sef.jul, con = P2[1][1], sin = P2[1][2], tot = P2[1][3], dc = con - P2[0][1];
    var g = state.reg ? aggOf(state.reg) : null;
    var h = '<p class="kicker" style="color:var(--ink-2)">Subsidios (SEF) · julio de 2026</p>';
    if (g) {
      var rc = g.con, rs = g.sin, rt = rc + rs;
      h += '<div class="sef-big">' + pct(rc, rt) + '</div><p style="margin:6px 0 0;font-size:17px">de los usuarios residenciales de la regional ' + g.r.n + ' tiene subsidio</p>' +
        '<div class="stack" role="img" aria-label="Con subsidio ' + nf(rc) + ', sin subsidio ' + nf(rs) + '"><span style="width:' + (rc / rt * 100) + '%;background:#00589b">' + nf(rc) + '</span><span style="width:' + (rs / rt * 100) + '%;background:#9aa3b2">' + nf(rs) + '</span></div>' +
        '<dl class="kv"><dt>Con subsidio</dt><dd>' + nf(rc) + '</dd><dt>Sin subsidio</dt><dd>' + nf(rs) + '</dd><dt>Promedio de BAGSA</dt><dd>' + pct(ALL.con, ALL.con + ALL.sin) + '</dd></dl><p class="note">Regional: planilla de noviembre de 2025.</p>';
    } else {
      h += '<div class="sef-big">' + pct(con, tot) + '</div><p style="margin:6px 0 0;font-size:17px">de los usuarios residenciales tiene subsidio: <b>' + Math.round(con / tot * 10) + ' de cada 10</b></p>' +
        '<div class="stack" role="img" aria-label="Con subsidio ' + nf(con) + ', sin subsidio ' + nf(sin) + '"><span style="width:' + (con / tot * 100) + '%;background:#00589b">Con ' + nf(con) + '</span><span style="width:' + (sin / tot * 100) + '%;background:#9aa3b2">Sin ' + nf(sin) + '</span></div>' +
        '<dl class="kv"><dt>Con subsidio vs. dic. 2025</dt><dd style="color:var(--down)">' + nf(dc) + ' (' + nf(dc / P2[0][1] * 100, 1) + '%)</dd><dt>Gas natural con subsidio</dt><dd>' + nf(j.GN[0]) + ' de ' + nf(j.GN[0] + j.GN[1]) + '</dd><dt>GLP con subsidio</dt><dd>' + nf(j.GLP[0]) + ' de ' + nf(j.GLP[0] + j.GLP[1]) + '</dd><dt>Comercios y pymes (SGP)</dt><dd>' + nf(j.GN[2] + j.GLP[2]) + '</dd></dl>';
    }
    $('sef').innerHTML = h;
  }

  /* ---------- 5. Presupuesto ---------- */
  function progRow(t, ej, prev, cls, color) {
    var p = prev ? ej / prev : 0;
    return '<div class="prog-row ' + (cls || '') + '"><div class="top-l"><span class="t">' + t + '</span><span class="p">' + (prev ? pct(ej, prev) : '—') + '</span></div><div class="track" role="img" aria-label="' + t + ': ' + (prev ? pct(ej, prev) : 'sin previsión') + ' ejecutado"><div class="fill" style="width:' + Math.min(100, p * 100) + '%;' + (color ? 'background:' + color : '') + '"></div>' + (cls ? '' : '<div class="half"></div>') + '</div><div class="meta"><span>Ejecutado: <b>' + money(ej) + '</b></span><span>Previsto 2026: ' + money(prev) + '</span></div></div>';
  }
  function renderPres() {
    var aP = aCor.v[4] + aCap.v[4], aE = sem(aCor) + sem(aCap);
    $('prog').innerHTML = progRow('Gasto total', gastoEj, gastoPrev) + progRow('Gastos corrientes', sem(gCor), gCor.v[4], '', '#2b82e6') + progRow('Gastos de capital (obras)', sem(gCap), gCap.v[4], '', '#0094ae') + progRow('Ingresos corrientes', sem(iCor), iCor.v[4], '', '#5b8c00') + progRow('Aportes de la Provincia', aE, aP, '', '#7b3fc4');
    var ob = P.cap.filter(function (r) { return !r.main && r.v[4] > 0; });
    $('progObras').innerHTML = ob.map(function (r) { return progRow(r.c, sem(r), r.v[4], 'small', '#0094ae'); }).join('');
    var rc = row('corr', 'RESULTADO FINANCIERO CORRIENTE NETO'), ro = row('cap', 'RESULTADO FINANCIERO DE OBRAS');
    $('pstats').innerHTML = (state.reg ? '<p style="margin:0 0 10px">' + scopeAll + '</p>' : '') +
      '<div class="stat"><b>' + money(gastoPrev) + '</b><span>Gasto previsto 2026 · ' + (gastoPrev > gasto25 ? '+' : '') + nf((gastoPrev - gasto25) / gasto25 * 100, 0) + '% nominal frente a lo ejecutado en 2025 (' + money(gasto25) + ')</span></div>' +
      '<div class="stat"><b>' + money(rc.v[4]) + '</b><span>Resultado corriente proyectado 2026, después del aporte de la Provincia (2025: ' + money(rc.v[0]) + ')</span></div>' +
      '<div class="stat"><b>' + money(ro.v[4]) + '</b><span>Resultado de obras proyectado 2026, después del aporte de la Provincia (2025: ' + money(ro.v[0]) + ')</span></div>';
    setH('h-pres', 'Al primer semestre se ejecutó el ' + pct(gastoEj, gastoPrev) + ' del gasto previsto para 2026');
  }

  /* ---------- 6. Obras ---------- */
  var OBF = [['all', 'Todas'], ['En ejecución', 'En ejecución'], ['Planificada', 'Planificadas'], ['Finalizada', 'Finalizadas']];
  $('obSeg').innerHTML = OBF.map(function (f) { return '<button type="button" data-o="' + f[0] + '" aria-pressed="' + (f[0] === state.ob) + '">' + f[1] + '</button>'; }).join('');
  $('obSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (!b) return; state.ob = b.getAttribute('data-o'); [].forEach.call($('obSeg').children, function (x) { x.setAttribute('aria-pressed', x === b); }); renderObras(); });
  function regTag(o) { if (!o.reg.length) return '<span class="r"><span class="dot" style="background:#c3c9d4"></span>Nueva localidad</span>'; return o.reg.map(function (id) { var r = REG[id]; return '<span class="r">' + swatch(r) + r.n + '</span>'; }).join(''); }
  function card(o) {
    var i = O.indexOf(o), c = EST[o.estado], col = c === 'fi' ? '#13804a' : c === 'ej' ? '#e8710a' : '#9aa3b2';
    var ic = c === 'fi' ? '✓' : c === 'ej' ? '●' : '○';
    var conx = o.con ? (/^[\d.]+$/.test(o.con) ? o.con + ' conexiones' : o.con) : '';
    var mt = o.estado === 'Planificada' ? (o.inv ? '$ ' + o.inv + ' M (estimado)' : '') : (o.montoN ? '$ ' + nf(o.montoN / 1e6, 0) + ' M' : '');
    return '<button class="ob" data-i="' + i + '"><span class="st ' + c + '">' + ic + ' ' + o.estado + '</span><h3>' + esc(o.corto) + '</h3><div class="meta"><span>' + esc(o.mun) + '</span>' + regTag(o) + '</div>' +
      (o.avance != null ? '<div><div class="prow"><span>Avance</span><span>' + nf(o.avance, o.avance % 1 ? 1 : 0) + '%</span></div><div class="pbar"><i style="width:' + o.avance + '%;background:' + col + '"></i></div></div>' : '<div class="prow" style="color:var(--ink-3)"><span>Sujeta a aprobación presupuestaria</span></div>') +
      '<div class="foot"><span>' + (o.fin ? (c === 'ej' ? 'Fin previsto: ' : 'Finalizó: ') + '<b>' + esc(o.fin) + '</b>' : '') + '</span><span>' + esc(conx) + '</span></div>' + (mt ? '<div class="meta"><span>Monto: <b style="color:var(--ink)">' + mt + '</b></span></div>' : '') + '</button>';
  }
  function renderObras() {
    var base = obrasDe(state.reg), f = base.filter(function (o) { return state.ob === 'all' || o.estado === state.ob; });
    var grp = ['En ejecución', 'Planificada', 'Finalizada'], lbl = { 'En ejecución': 'En ejecución', 'Planificada': 'Planificadas', 'Finalizada': 'Finalizadas desde 2020' };
    $('obras').innerHTML = grp.map(function (g) {
      var a = f.filter(function (o) { return o.estado === g; }); if (!a.length) return '';
      if (g === 'Finalizada') a.sort(function (x, y) { return (y.anio || 0) - (x.anio || 0); });
      return '<div class="ob-sec">' + lbl[g] + ' <span class="scope">' + a.length + '</span></div><div class="ob-grid">' + a.map(card).join('') + '</div>';
    }).join('') || '<p class="lede">No hay obras de esta regional con ese estado.</p>';
    var e = base.filter(function (o) { return o.estado === 'En ejecución'; }), fi = base.filter(function (o) { return o.estado === 'Finalizada'; }), pl = base.filter(function (o) { return o.estado === 'Planificada'; });
    var top = e.slice().sort(function (a, b) { return b.avance - a.avance; })[0];
    if (state.reg) setH('h-obras', 'Regional ' + REG[state.reg].n + ': ' + (e.length ? e.length + ' obra' + (e.length > 1 ? 's' : '') + ' en ejecución y ' : '') + fi.length + ' finalizada' + (fi.length === 1 ? '' : 's'));
    else setH('h-obras', e.length + ' obras en ejecución: ' + top.corto + ' ya está al ' + nf(top.avance, 0) + '% y termina en ' + (top.fin.indexOf('/12/') > -1 ? 'diciembre' : top.fin));
    var conE = e.reduce(function (t, o) { return t + num(/^[\d.]+$/.test(o.con || '') ? o.con : 0); }, 0);
    setH('l-obras', fi.length + ' finalizadas desde 2020, ' + e.length + ' en ejecución' + (conE ? ' (' + nf(conE) + ' conexiones proyectadas)' : '') + ' y ' + pl.length + ' planificadas' + (pl.length ? ' sujetas a aprobación presupuestaria' : '') + '.' + (state.reg ? ' Las obras en localidades nuevas (Mechita, Juan Anchorena, Rancagua) no tienen regional asignada y se ven con “Todas”.' : ''));
  }
  $('obras').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]'); if (!b) return; var o = O[+b.getAttribute('data-i')];
    var rows = [['Estado de situación', o.sit], ['Partido', o.mun], ['Localidades', o.loc], ['Fecha de finalización', o.fecha || o.fin], ['Conexiones proyectadas', o.con], ['Monto del informe', o.monto], ['Inversión valorizada a jun. 2026', o.inv && o.estado !== 'Planificada' ? o.inv + ' millones de pesos' : null], ['Inversión estimada (nov. 2025)', o.inv && o.estado === 'Planificada' ? o.inv + ' millones de pesos' : null], ['Potencial de industrias', o.pot], ['Memoria técnica', o.mem]].filter(function (r) { return r[1]; });
    $('dlgBody').innerHTML = '<button class="close" type="button" aria-label="Cerrar" onclick="this.closest(\'dialog\').close()">×</button><span class="st ' + EST[o.estado] + '">' + o.estado + '</span><h2>' + esc(o.titulo) + '</h2><dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
    $('dlg').showModal();
  });
  $('dlg').addEventListener('click', function (e) { if (e.target === this) this.close(); });

  /* ---------- 7. Localidades ---------- */
  var COLS = [['loc', 'Localidad'], ['ur', 'Regional'], ['pdo', 'Partido'], ['gas', 'Gas'], ['tot', 'Usuarios', 1], ['con', 'Con SEF', 1], ['sin', 'Sin SEF', 1], ['sgp', 'SGP', 1], ['m3', 'Consumo nov. 2025 (m³)', 1], ['sc', 'Conectados desde 2020', 1], ['sp', 'Potenciales', 1]];
  $('lt').tHead.innerHTML = '<tr>' + COLS.map(function (c) { return '<th class="' + (c[2] ? 'n' : '') + '" scope="col" aria-sort="none"><button type="button" data-k="' + c[0] + '">' + c[1] + '</button></th>'; }).join('') + '</tr>';
  $('lt').tHead.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var k = b.getAttribute('data-k'); state.sort = state.sort.k === k ? { k: k, d: -state.sort.d } : { k: k, d: COLS.filter(function (c) { return c[0] === k; })[0][2] ? -1 : 1 }; renderLoc(); });
  $('lt').tBodies[0].addEventListener('click', function (e) { var tr = e.target.closest('tr[data-i]'); if (!tr) return; var i = tr.getAttribute('data-i'); state.open[i] = !state.open[i]; renderLoc(); });
  ['lq', 'lg'].forEach(function (id) { $(id).addEventListener('input', renderLoc); });
  function renderLoc() {
    var q = plain($('lq').value.trim()), g = $('lg').value;
    var f = L.filter(function (l) { return (!state.reg || l.ur === state.reg) && (!g || l.gas === g) && (!q || plain(locName(l) + ' ' + l.loc + ' ' + l.pdo).indexOf(q) > -1); });
    var k = state.sort.k, d = state.sort.d;
    f.sort(function (a, b) { var x = k === 'loc' ? locName(a) : k === 'ur' ? REG[a.ur].n : a[k], y = k === 'loc' ? locName(b) : k === 'ur' ? REG[b.ur].n : b[k]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' ? x - y : String(x).localeCompare(y, 'es')) * d; });
    $('lt').tBodies[0].innerHTML = f.map(function (l) {
      var i = L.indexOf(l), r = REG[l.ur];
      var tds = COLS.map(function (c) {
        var v = l[c[0]];
        if (c[0] === 'loc') return '<td><b>' + esc(locName(l)) + '</b></td>';
        if (c[0] === 'ur') return '<td><span style="display:inline-flex;gap:6px;align-items:center">' + swatch(r) + r.n + '</span></td>';
        if (c[0] === 'm3' && v == null && l.m3n) return '<td class="n nd" title="Sin dato informado">N/I</td>';
        if (c[0] === 'sc' && l.sg && l.loc === 'POLVAREDAS') return '<td class="n nd" title="Incluido en Del Carril">(con Del Carril)</td>';
        if (v == null) return '<td class="' + (c[2] ? 'n ' : '') + 'nd">—</td>';
        return '<td' + (c[2] ? ' class="n"' : '') + '>' + (c[2] ? nf(v) : esc(v)) + '</td>';
      }).join('');
      var det = state.open[i] ? '<tr class="det"><td colspan="' + COLS.length + '"><dl><div><dt>Oficina comercial</dt><dd>' + esc(l.dir) + '</dd></div><div><dt>Horario</dt><dd>' + esc(cap(l.hor)) + '</dd></div><div><dt>Atención comercial</dt><dd>' + esc(l.at) + '</dd></div><div><dt>Emergencias (24 hs)</dt><dd>' + esc(l.em) + '</dd></div><div><dt>Código postal</dt><dd>' + esc(l.cp) + '</dd></div></dl></td></tr>' : '';
      return '<tr data-i="' + i + '" aria-expanded="' + !!state.open[i] + '">' + tds + '</tr>' + det;
    }).join('');
    [].forEach.call($('lt').tHead.rows[0].cells, function (th) { var kk = th.firstChild.getAttribute('data-k'); th.setAttribute('aria-sort', kk === k ? (d > 0 ? 'ascending' : 'descending') : 'none'); });
    $('lt').tFoot.innerHTML = '<tr><td colspan="4">Total de la selección (' + f.length + ')</td>' + COLS.slice(4).map(function (c) { return '<td class="n">' + nf(sum(f, c[0])) + '</td>'; }).join('') + '</tr>';
    $('lc').textContent = f.length + (f.length === 1 ? ' localidad' : ' localidades');
    setH('h-loc', state.reg ? 'Localidades de la regional ' + REG[state.reg].n : 'Las ' + L.length + ' localidades, una por una');
  }

  /* ---------- General ---------- */
  function renderAll() { renderResumen(); renderMapa(); renderComp(); renderDem(); renderPres(); renderObras(); renderLoc(); }

  // Modo presentación
  function setHdr() { document.body.style.setProperty('--hdr', ($('top').offsetHeight + $('filter').offsetHeight) + 'px'); $('filter').style.top = $('top').offsetHeight + 'px'; }
  $('presBtn').addEventListener('click', function () {
    var on = !document.body.classList.contains('pres');
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement) document.exitFullscreen();
    document.body.classList.toggle('pres', on); this.setAttribute('aria-pressed', on); setHdr();
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement) { document.body.classList.remove('pres'); $('presBtn').setAttribute('aria-pressed', false); } setHdr(); });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea') || $('dlg').open) return;
    var i = TABS.map(function (t) { return t[0]; }).indexOf(state.tab);
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(TABS[Math.min(TABS.length - 1, i + 1)][0]); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(TABS[Math.max(0, i - 1)][0]); }
    else if (/^[1-7]$/.test(e.key)) go(TABS[+e.key - 1][0]);
    else if (e.key === 'Escape' && document.body.classList.contains('pres') && !document.fullscreenElement) { document.body.classList.remove('pres'); setHdr(); }
  });
  window.addEventListener('resize', setHdr);
  window.addEventListener('hashchange', function () {
    var p = decodeURIComponent(location.hash.slice(1)).split('/'), r = p[1] && REG[p[1]] ? p[1] : null;
    if (r !== state.reg) { state.reg = null; setReg(r); }
    if (TABS.some(function (t) { return t[0] === p[0]; }) && p[0] !== state.tab) go(p[0], true);
  });

  // Estado inicial desde la dirección (#pantalla/regional)
  var h = decodeURIComponent(location.hash.slice(1)).split('/');
  if (h[1] && REG[h[1]]) { state.reg = h[1]; [].forEach.call(document.querySelectorAll('#chips .chip'), function (c) { c.setAttribute('aria-pressed', (c.getAttribute('data-r') || null) === state.reg); }); }
  renderAll(); setHdr();
  go(TABS.some(function (t) { return t[0] === h[0]; }) ? h[0] : 'resumen', true);
})();
