/* 공용 광고 박스 — 사용법: <div class="nadoo-ad"></div> 를 원하는 자리에 두고
   <script src="https://nadoo-ads.vercel.app/ads.js" defer></script> 한 줄을 넣는다.
   광고 목록은 같은 위치의 ads.json 하나에서 관리한다. url이 빈 항목은 자동으로 숨긴다.
   선택: <div class="nadoo-ad" data-exclude="coupang,len3"> 로 특정 광고 제외.
   선택: <div class="nadoo-ad" data-types="apple,coupang"> 로 특정 묶음만 노출(묶음: cpa, apple, coupang, linkprice, vpnpromo, lodge / type 이름도 가능).
   type: cpa(기본, 디비센스) · coupang(쿠팡 파트너스) · naver(네이버 쇼핑 커넥트) · hub(자체 허브) · linkprice(링크프라이스) · vpnpromo(영화 사이트용 VPN 비교 페이지 안내).
   type별 고지 문구가 자동으로 붙는다(note가 있으면 note 우선). 묶음(cpa/apple/coupang/linkprice)을 고르게 돌린다.
   sites가 있는 항목은 location.hostname이 그 목록과 일치할 때만 노출된다.
   하단 바로가기: <div class="nadoo-ad-bar"></div>. 코드 맵은 ads.json 의 bar.sites.
   사이트 코드나 merchants가 없으면 로고는 숨긴다. 나두게임즈(robingames)는 노출하지 않는다.
   모바일 하단 고정 띠는 사이트당 하나(60px 이하 한 줄): 바로가기 줄이 뜨는 사이트는 [data-coupang-sticky]를 숨기고,
   둘 다 약 1화면 스크롤한 뒤에 나타난다. 지정 묶음이 비면 쿠팡으로 채우고, 그래도 없으면 칸을 숨긴다.
   사이트에 직접 박힌 쿠팡 링크 클릭은 click-site-coupang-<사이트>-inline|sticky 로 센다.
   자동 배치: ads.json 의 auto.hosts[호스트] = { ctx, rot, every, cap, anchor, end, skipPaths }.
   첫 화면 끝에 ctx 광고 1개, 긴 목록은 every개마다(rot 순환), 본문 광고 합계 cap(긴 목록 4, 그 외 3) 이하,
   광고끼리 90px 안으로 붙지 않게 하고, 넘치면 아래쪽 칸부터 숨긴다. */
(function () {
  if (window.__nadooAds) return; window.__nadooAds = true;
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/[^\/]*$/, '') : 'https://nadoo-ads.vercel.app/';
  var ABACUS = 'https://abacus.jasoncameron.dev/hit/nadoo-ads/';
  var filled = typeof WeakSet === 'function' ? new WeakSet() : null;
  var used = {};
  var pool = null;
  var barCfg = null;
  var barFilled = typeof WeakSet === 'function' ? new WeakSet() : null;
  var DISMISS_KEY = 'nadoo-ad-bar-dismissed';
  var SPACER_ID = 'nadoo-bar-spacer';

  function kstDay() { return new Date(Date.now() + 9 * 3600e3).getUTCDay(); }
  function kstDate() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function normHost(s) {
    s = String(s || '').toLowerCase();
    if (s.indexOf('www.') === 0) s = s.slice(4);
    return s;
  }
  function currentHost() {
    try { return normHost(location.hostname); } catch (e) { return ''; }
  }
  function hostAllowed(a) {
    if (!Array.isArray(a.sites) || !a.sites.length) return true;
    var h = currentHost();
    if (!h) return false;
    for (var i = 0; i < a.sites.length; i++) {
      var s = normHost(a.sites[i]);
      if (s && h === s) return true;
    }
    return false;
  }
  function eligible(a) {
    if (!a || !a.url || !/^https:\/\//.test(a.url) || a.active === false) return false;
    if (!hostAllowed(a)) return false;
    if (Array.isArray(a.days) && a.days.indexOf(kstDay()) < 0) return false;
    var d = kstDate();
    if (a.start && d < a.start) return false;
    if (a.end && d > a.end) return false;
    return true;
  }
  var NOTES = {
    coupang: '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
    naver: '네이버 쇼핑 커넥트 활동의 일환으로 수수료를 제공받을 수 있습니다.',
    linkprice: '이 포스팅은 제휴마케팅이 포함된 광고로 커미션을 지급 받습니다.'
  };
  function typeOf(a) { return a.type || 'cpa'; }
  function groupOf(a) {
    var t = typeOf(a);
    return a.group || (t === 'coupang' ? 'coupang' : t === 'naver' ? 'apple' : t === 'linkprice' ? 'linkprice' : t === 'vpnpromo' ? 'vpnpromo' : 'cpa');
  }
  function pick(exclude, types) {
    var c = pool.filter(function (a) {
      if (used[a.id] || exclude.indexOf(a.id) >= 0 || exclude.indexOf(typeOf(a)) >= 0 || exclude.indexOf(groupOf(a)) >= 0) return false;
      if (types.length && types.indexOf(typeOf(a)) < 0 && types.indexOf(groupOf(a)) < 0) return false;
      return true;
    });
    if (!c.length) return null;
    var cnt = {}; pool.forEach(function (a) { if (used[a.id]) cnt[groupOf(a)] = (cnt[groupOf(a)] || 0) + 1; });
    var groups = []; c.forEach(function (a) { var g = groupOf(a); if (groups.indexOf(g) < 0) groups.push(g); });
    var min = Infinity; groups.forEach(function (g) { min = Math.min(min, cnt[g] || 0); });
    groups = groups.filter(function (g) { return (cnt[g] || 0) === min; });
    var g = groups[Math.floor(Math.random() * groups.length)];
    c = c.filter(function (a) { return groupOf(a) === g; });
    var total = 0; c.forEach(function (a) { total += (+a.weight > 0 ? +a.weight : 1); });
    var r = Math.random() * total;
    for (var i = 0; i < c.length; i++) { r -= (+c[i].weight > 0 ? +c[i].weight : 1); if (r <= 0) return c[i]; }
    return c[c.length - 1];
  }
  function fallbackCoupang() {
    if (!pool) return null;
    for (var i = 0; i < pool.length; i++) if (typeOf(pool[i]) === 'coupang') return pool[i];
    return null;
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function pickLine(arr, fallback) {
    if (Array.isArray(arr) && arr.length) return arr[Math.floor(Math.random() * arr.length)];
    return fallback || '';
  }
  var CSS = ':host{display:block;margin:20px 0;font-family:inherit;color:inherit;text-align:left;clear:both}' +
    'a.card{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;border:1px solid rgba(128,128,128,.35);border-radius:12px;background:rgba(128,128,128,.07);color:inherit;text-decoration:none;line-height:1.5;transition:background .15s,border-color .15s,transform .15s}' +
    'a.card:hover{background:rgba(128,128,128,.13);border-color:rgba(128,128,128,.55);transform:translateY(-1px)}' +
    'a.card.lodge{box-shadow:inset 3px 0 0 #3b82f6}' +
    '.txt{flex:1 1 220px;min-width:0}' +
    '.lab{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border:1px solid rgba(128,128,128,.55);border-radius:999px;opacity:.8;margin-right:6px;vertical-align:1px}' +
    '.t{font-weight:700;font-size:15px}' +
    '.d{font-size:13.5px;opacity:.8;margin-top:3px}' +
    '.n{font-size:11.5px;opacity:.6;margin-top:6px}' +
    '.b{flex:0 0 auto;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid currentColor;white-space:nowrap}';
  function render(el, a) {
    var root = null;
    try { root = el.shadowRoot || (el.attachShadow ? el.attachShadow({ mode: 'open' }) : null); } catch (e) { root = null; }
    if (!root) { el.style.display = 'none'; return; }
    var lab = a.label || (a.internal ? '추천' : '광고');
    var note = a.note || NOTES[typeOf(a)] || '';
    var rel = a.internal ? 'noopener' : 'sponsored noopener';
    var title = pickLine(a.titles, a.title);
    var desc = pickLine(a.lines, a.desc);
    var cta = a.cta || '자세히 보기';
    var klass = 'card' + (groupOf(a) === 'lodge' ? ' lodge' : '');
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<a class="' + klass + '" href="' + esc(a.url) + '" target="_blank" rel="' + rel + '" aria-label="' + esc(lab) + ': ' + esc(title) + '" data-type="' + esc(typeOf(a)) + '">' +
      '<div class="txt"><div><span class="lab">' + esc(lab) + '</span><span class="t">' + esc(title) + '</span></div>' +
      (desc ? '<div class="d">' + esc(desc) + '</div>' : '') +
      (note ? '<div class="n">' + esc(note) + '</div>' : '') +
      '</div><span class="b">' + esc(cta) + '</span></a>';
    root.querySelector('a').addEventListener('click', function () {
      try { fetch(ABACUS + 'click-' + encodeURIComponent(a.id), { mode: 'no-cors', keepalive: true }); } catch (e) {}
    });
  }
  function fill(el) {
    if (filled ? filled.has(el) : el.__nadooAd) return;
    if (filled) filled.add(el); else el.__nadooAd = 1;
    var ex = (el.getAttribute('data-exclude') || '').split(',').map(function (s) { return s.trim(); });
    var ty = (el.getAttribute('data-types') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var a = pick(ex, ty);
    // 빈 칸 방지: 지정 묶음이 다 쓰였으면 쿠팡으로 채우고, 그래도 없으면 칸을 숨긴다.
    if (!a && ex.indexOf('coupang') < 0) a = pick(ex, ['coupang']) || fallbackCoupang();
    if (!a) { el.style.display = 'none'; return; }
    el.style.display = '';
    used[a.id] = 1;
    render(el, a);
  }
  function scan() {
    var els = document.querySelectorAll('.nadoo-ad');
    for (var i = 0; i < els.length; i++) { if (pool) fill(els[i]); }
  }

  function barExcluded() {
    var h = currentHost();
    var ex = (barCfg && barCfg.excludeHosts) || [];
    for (var i = 0; i < ex.length; i++) if (normHost(ex[i]) === h) return true;
    return h === 'robingames.vercel.app';
  }
  function siteRec() {
    if (!barCfg || !barCfg.sites) return null;
    var rec = barCfg.sites[currentHost()];
    if (!rec || !rec.code) return null;
    return rec;
  }
  function merchantList(rec) {
    var m = rec && rec.merchants;
    if (!m) return [];
    if (Object.prototype.toString.call(m) === '[object Array]') return m;
    if (typeof m === 'object') return Object.keys(m);
    return [];
  }
  function merchantHost(rec, item) {
    var m = rec && rec.merchants;
    var host = '';
    if (m && Object.prototype.toString.call(m) !== '[object Array]' && m[item.m]) host = m[item.m];
    if (!host) host = item.clickHost || (barCfg && barCfg.clickHost) || 'bestmore.net';
    return host;
  }
  function visibleBarItems() {
    var rec = siteRec();
    if (!rec || barExcluded()) return [];
    var allowed = merchantList(rec);
    if (!allowed.length) return [];
    return (barCfg.items || []).filter(function (it) {
      if (!it || it.active === false || !it.m) return false;
      return allowed.indexOf(it.m) >= 0 || allowed.indexOf(it.id) >= 0;
    });
  }
  function clickUrl(item, rec) {
    var host = merchantHost(rec, item);
    var baseUrl = String(host);
    if (baseUrl.indexOf('://') < 0) baseUrl = 'https://' + baseUrl.replace(/^\/+/, '');
    if (baseUrl.indexOf('click.php') < 0) {
      baseUrl = baseUrl.replace(/\/?$/, '/') + 'click.php';
    }
    return baseUrl + '?m=' + encodeURIComponent(item.m) + '&a=' + encodeURIComponent(rec.code) + '&l=0000';
  }
  function logoSrc(item) {
    if (!item.logo) return '';
    if (/^https?:\/\//.test(item.logo)) return item.logo;
    return base + item.logo.replace(/^\//, '');
  }
  function isDismissed() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var days = (barCfg && +barCfg.dismissDays) || 1;
      if (raw === '1' || raw === 'true') return true;
      var t = Date.parse(raw);
      if (isNaN(t)) return raw === kstDate();
      return (Date.now() - t) < days * 86400e3;
    } catch (e) { return false; }
  }
  function dismissBar() {
    try { localStorage.setItem(DISMISS_KEY, new Date().toISOString()); } catch (e) {}
    var els = document.querySelectorAll('.nadoo-ad-bar');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].shadowRoot; if (r) r.innerHTML = '';
      els[i].style.display = 'none';
    }
    clearSpacer();
  }
  function otherBottomH() {
    var n = 0;
    var nodes = document.querySelectorAll('[data-coupang-sticky]');
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.height > 0) n = Math.max(n, Math.round(r.height));
    }
    return n;
  }
  var innerY = 0;
  function scrolledEnough() {
    try {
      var lim = (window.innerHeight || 800) * 0.9;
      return (window.scrollY || window.pageYOffset || 0) > lim || innerY > lim;
    } catch (e) { return true; }
  }
  function barActive() {
    return !!barCfg && !barExcluded() && visibleBarItems().length > 0;
  }
  // 모바일 하단 고정 띠는 사이트당 하나: 바로가기 줄이 있는 사이트는 쿠팡 띠를 숨기고,
  // 없는 사이트는 쿠팡 띠를 약 1화면 스크롤 뒤에 보여 준다.
  function syncStickies() {
    var mob = isMobile();
    var hideCp = mob && barActive();
    var gate = mob && !scrolledEnough();
    var nodes = document.querySelectorAll('[data-coupang-sticky]');
    for (var i = 0; i < nodes.length; i++) {
      if (hideCp || gate) nodes[i].style.setProperty('display', 'none', 'important');
      else nodes[i].style.removeProperty('display');
    }
    var els = document.querySelectorAll('.nadoo-ad-bar');
    for (var j = 0; j < els.length; j++) {
      var r = els[j].shadowRoot; var s = r && r.querySelector('.sticky');
      if (s) s.classList.toggle('on', scrolledEnough() && !isDismissed());
    }
    syncSpacer();
  }
  function hostSlug() {
    return currentHost().replace(/\.vercel\.app$/, '').replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'site';
  }
  // 사이트에 직접 박힌 쿠팡 배너도 클릭을 센다(광고 박스 안 링크는 render에서 따로 센다).
  function trackSiteCoupang(ev) {
    if (ev.type === 'auxclick' && ev.button !== 1) return;
    var t = ev.target;
    var a = t && t.closest ? t.closest('a[href*="coupang.com"]') : null;
    if (!a) return;
    var where = a.closest('[data-coupang-sticky]') ? 'sticky' : 'inline';
    try { fetch(ABACUS + 'click-site-coupang-' + hostSlug() + '-' + where, { mode: 'no-cors', keepalive: true }); } catch (e) {}
  }
  function isMobile() {
    try { return window.matchMedia && window.matchMedia('(max-width: 767px)').matches; } catch (e) { return false; }
  }
  function spacerEl() {
    var el = document.getElementById(SPACER_ID);
    if (!el && document.body) {
      el = document.createElement('div');
      el.id = SPACER_ID;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'display:none;width:100%;pointer-events:none;flex:none;';
      document.body.appendChild(el);
    }
    return el;
  }
  function clearSpacer() {
    var el = document.getElementById(SPACER_ID);
    if (el) { el.style.display = 'none'; el.style.height = '0px'; }
  }
  function syncSpacer() {
    if (!isMobile() || isDismissed()) { clearSpacer(); return; }
    var sticky = null;
    var els = document.querySelectorAll('.nadoo-ad-bar');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].shadowRoot;
      var s = r && r.querySelector('.sticky');
      if (s) { sticky = s; break; }
    }
    if (!sticky) { clearSpacer(); return; }
    var h = sticky.classList.contains('on') ? Math.round(sticky.getBoundingClientRect().height) : 0;
    if (h <= 0) { clearSpacer(); return; }
    var sp = spacerEl();
    if (!sp) return;
    sp.style.display = 'block';
    sp.style.height = h + 'px';
  }
  var BAR_CSS =
    ':host{display:block;font-family:inherit;color:inherit;text-align:left;clear:both}' +
    '.footer{display:none;margin:16px 0 8px;padding:14px 16px 12px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.06);border-radius:16px}' +
    '.sticky{display:none}' +
    '@media (min-width:768px){.footer{display:block}.sticky{display:none !important}}' +
    '@media (max-width:767px){.footer{display:none}.sticky{display:none;position:fixed;left:0;right:0;bottom:0;z-index:9998;box-sizing:border-box;max-height:calc(60px + env(safe-area-inset-bottom,0px));padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px)) 8px;background:rgba(20,20,20,.94);color:#f4f4f4;box-shadow:0 -4px 18px rgba(0,0,0,.28);backdrop-filter:blur(8px);overflow:hidden}.sticky.on{display:flex;align-items:center;gap:6px}}' +
    '.row{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
    '.row::-webkit-scrollbar{display:none}' +
    '.sticky .lab{color:#f4f4f4}' +
    '.hl{flex:0 0 auto;max-width:118px;font-size:11px;font-weight:800;line-height:1.25;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}' +
    '.sticky a.logo{flex:0 0 auto;max-width:200px;height:44px;box-sizing:border-box;padding:4px 8px 4px 9px;gap:6px;border-radius:10px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}' +
    '.sticky a.logo img{height:20px;max-width:48px}' +
    '.sticky .name{font-size:11px}' +
    '.sticky .line{font-size:10.5px;-webkit-line-clamp:1;white-space:nowrap;text-overflow:ellipsis;display:block;max-width:132px}' +
    '.sticky .arrow{display:none}' +
    '.sticky .x{margin-left:0;padding:4px 6px}' +
    '.head{display:flex;align-items:center;gap:8px;margin-bottom:10px;min-width:0}' +
    '.lab{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.02em;padding:1px 6px;border:1px solid currentColor;border-radius:999px;opacity:.8;flex:0 0 auto}' +
    '.ttl{font-size:13px;font-weight:800;letter-spacing:-.02em;line-height:1.3;min-width:0}' +
    '.logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}' +
    'a.logo{display:flex;align-items:center;gap:8px;min-width:0;padding:10px 10px 10px 12px;text-decoration:none;color:inherit;border-radius:12px;border:1px solid rgba(128,128,128,.28);background:rgba(128,128,128,.08);box-shadow:inset 3px 0 0 var(--accent,#888);transition:transform .15s,box-shadow .15s,background .15s,border-color .15s}' +
    'a.logo:hover{background:rgba(128,128,128,.16);border-color:rgba(128,128,128,.5);transform:translateY(-1px);box-shadow:inset 3px 0 0 var(--accent,#888),0 4px 12px rgba(0,0,0,.08)}' +
    'a.logo img{display:block;height:28px;width:auto;max-width:72px;border-radius:6px;flex:0 0 auto;background:#fff;padding:2px 4px}' +
    'a.logo .txt{flex:0 0 auto;font-size:12px;font-weight:800}' +
    '.copy{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}' +
    '.name{font-size:12px;font-weight:800;line-height:1.2}' +
    '.line{font-size:11.5px;opacity:.85;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.arrow{flex:0 0 auto;font-size:14px;font-weight:700;opacity:.55}' +
    '.note{font-size:10.5px;opacity:.65;margin-top:8px;line-height:1.4}' +
    '.x{flex:0 0 auto;margin-left:auto;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px 6px;opacity:.8;cursor:pointer}' +
    '.x:hover{opacity:1}' +
    
    '@media (min-width:768px){.x{display:none}}';

  function barTitle(rec) {
    if (rec && rec.title) return rec.title;
    var mood = (rec && rec.mood) || (barCfg && barCfg.defaultMood) || 'shop';
    var set = barCfg && barCfg.headlines && barCfg.headlines[mood];
    return pickLine(set, (barCfg && barCfg.title) || '자주 쓰는 곳 바로가기');
  }
  function logoHtml(item, rec) {
    var href = clickUrl(item, rec);
    var src = logoSrc(item);
    var name = item.name || item.m;
    var line = pickLine(item.lines, '');
    var accent = item.accent || '#888888';
    var badge = src
      ? '<img src="' + esc(src) + '" alt="' + esc(name) + '" width="120" height="36" />'
      : '<span class="txt">' + esc(name) + '</span>';
    var lab = '광고: ' + name + (line ? ' — ' + line : '');
    return '<a class="logo" href="' + esc(href) + '" target="_blank" rel="sponsored noopener" data-id="' + esc(item.id || item.m) + '" aria-label="' + esc(lab) + '" style="--accent:' + esc(accent) + '">' +
      badge +
      '<span class="copy"><span class="name">' + esc(name) + '</span>' +
      (line ? '<span class="line">' + esc(line) + '</span>' : '') +
      '</span><span class="arrow" aria-hidden="true">→</span></a>';
  }
  function bindBarClicks(root) {
    var links = root.querySelectorAll('a.logo');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        var id = ev.currentTarget.getAttribute('data-id') || 'bar';
        try { fetch(ABACUS + 'click-' + encodeURIComponent(id), { mode: 'no-cors', keepalive: true }); } catch (e) {}
      });
    }
    var closeBtn = root.querySelector('.x');
    if (closeBtn) closeBtn.addEventListener('click', function () { dismissBar(); });
  }
  function applyStickyOffset(root) {
    var sticky = root.querySelector('.sticky');
    if (!sticky) return;
    sticky.style.bottom = '0px';
    sticky.classList.toggle('on', scrolledEnough());
  }
  function renderBar(el, items, rec) {
    var root = el.shadowRoot || (el.attachShadow ? el.attachShadow({ mode: 'open' }) : null);
    if (!root) return;
    el.style.display = '';
    var lab = (barCfg && barCfg.label) || '광고';
    var title = barTitle(rec);
    var note = (barCfg && barCfg.note) || NOTES.linkprice;
    var logos = items.map(function (it) { return logoHtml(it, rec); }).join('');
    var close = '<button type="button" class="x" aria-label="바로가기 닫기">×</button>';
    root.innerHTML = '<style>' + BAR_CSS + '</style>' +
      '<div class="footer">' +
        '<div class="head"><span class="lab">' + esc(lab) + '</span><span class="ttl">' + esc(title) + '</span></div>' +
        '<div class="logos">' + logos + '</div>' +
        '<p class="note">' + esc(note) + '</p>' +
      '</div>' +
      '<div class="sticky" role="complementary" aria-label="' + esc(lab + ': ' + title) + '">' +
        '<span class="lab">' + esc(lab) + '</span>' +
        '<div class="row"><span class="hl">' + esc(title) + '</span>' + logos + '</div>' + close +
      '</div>';
    bindBarClicks(root);
    applyStickyOffset(root);
    var imgs = root.querySelectorAll('a.logo img');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener('error', function () {
        var name = this.getAttribute('alt') || '';
        var ph = document.createElement('span');
        ph.className = 'txt';
        ph.textContent = name;
        if (this.parentNode) this.parentNode.replaceChild(ph, this);
        syncSpacer();
      });
      imgs[i].addEventListener('load', function () { syncSpacer(); });
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncSpacer);
    else setTimeout(syncSpacer, 0);
  }
  function fillBar(el) {
    if (barFilled ? barFilled.has(el) : el.__nadooBar) return;
    var items = visibleBarItems();
    var rec = siteRec();
    if (!items.length || !rec || isDismissed()) {
      el.style.display = 'none';
      return;
    }
    if (barFilled) barFilled.add(el); else el.__nadooBar = 1;
    renderBar(el, items, rec);
  }
  function ensureMount() {
    if (barExcluded() || !visibleBarItems().length || isDismissed()) return;
    if (document.querySelector('.nadoo-ad-bar')) return;
    if (!document.body) return;
    var el = document.createElement('div');
    el.className = 'nadoo-ad-bar';
    el.setAttribute('data-nadoo-auto', '1');
    document.body.appendChild(el);
  }
  function scanBar() {
    if (!barCfg) return;
    ensureMount();
    var els = document.querySelectorAll('.nadoo-ad-bar');
    for (var i = 0; i < els.length; i++) fillBar(els[i]);
    syncSpacer();
  }


  /* ---------- 자동 배치: ads.json 의 auto.hosts[호스트] 설정이 있는 사이트만 ----------
     mid: 첫 화면 끝(또는 본문 1/3) 블록 경계에 문맥 광고 1개.
     feed: 긴 목록은 항목 N개마다 1개(문맥→쿠팡→네이버 순환), 본문 광고 합계 cap 이하.
     collapse: 붙어 있는 광고 칸은 1개만 남긴다. end: 글 끝 40% 안에 광고가 없으면 1개. */
  var autoAll = null;
  var autoPath = null;
  var autoTimer = null;
  var autoPlaced = 0;
  var autoRuns = 0;
  function autoCfg() {
    if (!autoAll || !autoAll.hosts) return null;
    var c = autoAll.hosts[currentHost()];
    if (!c) return null;
    var path = location.pathname || '/';
    var sk = c.skipPaths || [];
    for (var i = 0; i < sk.length; i++) { try { if (new RegExp(sk[i]).test(path)) return null; } catch (e) {} }
    return c;
  }
  function absTop(el) { var r = el.getBoundingClientRect(); return r.top + (window.scrollY || 0); }
  function absBottom(el) { var r = el.getBoundingClientRect(); return r.bottom + (window.scrollY || 0); }
  function shown(el) { return el && el.nodeType === 1 && el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0; }
  function inChrome(el) { return !!(el.closest && el.closest('header,nav,footer,[role=navigation],[data-coupang-sticky],.nadoo-ad-bar,dialog')); }
  function isAdish(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.matches && el.matches('.nadoo-ad,[data-nadoo-auto-slot]')) return true;
    var h = el.getBoundingClientRect().height;
    if (h > 0 && h < 380 && el.querySelector && el.querySelector('.nadoo-ad,a[href*="link.coupang.com"],a[rel~="sponsored"]')) return true;
    return false;
  }
  function slotGroup(el) {
    var a = el.shadowRoot && el.shadowRoot.querySelector('a');
    if (!a) return null;
    var href = a.getAttribute('href');
    for (var i = 0; i < (pool || []).length; i++) if (pool[i].url === href) return groupOf(pool[i]);
    return null;
  }
  function staticSlots() {
    var out = []; var els = document.querySelectorAll('.nadoo-ad:not([data-nadoo-auto-slot])');
    for (var i = 0; i < els.length; i++) if (shown(els[i]) && els[i].shadowRoot && els[i].shadowRoot.querySelector('a')) out.push(els[i]);
    return out;
  }
  function releaseSlot(el) {
    var a = el.shadowRoot && el.shadowRoot.querySelector('a');
    if (a) { var href = a.getAttribute('href'); (pool || []).forEach(function (x) { if (x.url === href) delete used[x.id]; }); }
    if (el.shadowRoot) el.shadowRoot.innerHTML = '';
    el.style.display = 'none';
    el.setAttribute('data-nadoo-moved', '1');
  }
  function contentRoot() { return document.querySelector('main') || document.querySelector('[role=main]') || document.body; }
  function kidsOf(node) {
    var out = [];
    for (var i = 0; i < node.children.length; i++) {
      var k = node.children[i];
      if (/^(SCRIPT|STYLE|TEMPLATE|LINK|NOSCRIPT)$/.test(k.tagName) || !shown(k)) continue;
      out.push(k);
    }
    return out;
  }
  function keyOf(el) { return el.tagName + '.' + String(el.getAttribute('class') || '').split(/\s+/)[0]; }
  function findLists(root) {
    var all = root.querySelectorAll('*'); var cands = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length < 6 || inChrome(el) || el.closest('.nadoo-ad,[data-nadoo-auto-slot]')) continue;
      if (/^(TBODY|TABLE|THEAD|TR|SELECT|SVG|svg|P)$/.test(el.tagName)) continue;
      var kids = kidsOf(el); if (kids.length < 6) continue;
      var cnt = {}, best = 0, bk = '';
      kids.forEach(function (k) { if (k.hasAttribute('data-nadoo-auto-slot')) return; var kk = keyOf(k); cnt[kk] = (cnt[kk] || 0) + 1; if (cnt[kk] > best) { best = cnt[kk]; bk = kk; } });
      if (best < 6 || best < kids.length * 0.8) continue;
      var tot = 0; kids.forEach(function (k) { tot += k.getBoundingClientRect().height; });
      if (tot / kids.length < 44) continue;
      cands.push(el);
    }
    return cands.filter(function (c) { return !cands.some(function (o) { return o !== c && c.contains(o); }); });
  }
  function makeSlot(types, parent) {
    var el = document.createElement('div');
    el.className = 'nadoo-ad';
    el.setAttribute('data-nadoo-auto-slot', '1');
    if (types) el.setAttribute('data-types', types);
    var cs = getComputedStyle(parent);
    var css = 'list-style:none;width:100%;max-width:100%;box-sizing:border-box;' +
      (cs.display.indexOf('grid') >= 0 ? 'grid-column:1/-1;' : '') + (cs.display.indexOf('flex') >= 0 ? 'flex:0 0 100%;' : '');
    if (/^(UL|OL)$/.test(parent.tagName)) {
      // li 는 shadow root 를 못 붙이므로 li 안에 칸을 둔다.
      var li = document.createElement('li');
      li.setAttribute('data-nadoo-auto-slot', '1');
      li.setAttribute('aria-label', '광고');
      li.style.cssText = css;
      li.appendChild(el);
      return li;
    }
    el.style.cssText = css;
    return el;
  }
  function safeAfter(ref) {
    // 광고끼리 붙지 않게: 앞뒤가 광고면 한 칸 뒤로 민다.
    var guard = 0;
    while (ref && guard++ < 4 && (isAdish(ref) || isAdish(ref.nextElementSibling))) ref = ref.nextElementSibling;
    return ref;
  }
  function insertAfter(ref, el) { if (ref && ref.parentNode) ref.parentNode.insertBefore(el, ref.nextSibling); }
  function clearAuto() {
    var olds = document.querySelectorAll('[data-nadoo-auto-slot]');
    for (var i = 0; i < olds.length; i++) if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]);
  }
  function collapseStatic() {
    var sl = staticSlots().sort(function (a, b) { return absTop(a) - absTop(b); });
    for (var i = 1; i < sl.length; i++) {
      var prev = sl[i - 1];
      if (prev.style.display === 'none') continue;
      if (absTop(sl[i]) - absBottom(prev) < 90) releaseSlot(sl[i]);
    }
  }
  // 본문 안 광고 덩어리(광고 박스, 사이트에 박힌 쿠팡·제휴 카드)의 위치. 머리·바닥글·고정 띠는 뺀다.
  function adBoxes(root, skip) {
    var out = [];
    var els = root.querySelectorAll('.nadoo-ad,[data-nadoo-auto-slot]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e === skip || (skip && (skip.contains(e) || e.contains(skip)))) continue;
      if (e.tagName === 'LI' && e.querySelector('.nadoo-ad')) continue;
      if (!e.hasAttribute('data-nadoo-auto-slot') && !(shown(e) && e.shadowRoot && e.shadowRoot.querySelector('a'))) continue;
      if (e.style.display === 'none' || inChrome(e)) continue;
      out.push({ el: e, top: absTop(e), bottom: absBottom(e), auto: e.hasAttribute('data-nadoo-auto-slot') });
    }
    var links = root.querySelectorAll('a[href*="link.coupang.com"],a[rel~="sponsored"]');
    for (var k = 0; k < links.length; k++) {
      var a = links[k];
      if (!shown(a) || inChrome(a) || a.closest('.nadoo-ad')) continue;
      var box = a, p = a.parentElement, g = 0;
      while (p && p !== root && g++ < 4) { var h = p.getBoundingClientRect().height; if (h > 420) break; box = p; p = p.parentElement; }
      var t = absTop(box), b = absBottom(box);
      var dup = out.some(function (o) { return !o.auto && o.el.nodeType === 1 && Math.abs(o.top - t) < 160 && o.site; });
      if (dup) continue;
      out.push({ el: box, top: t, bottom: b, site: true });
    }
    return out.sort(function (x, y) { return x.top - y.top; });
  }
  function nearAd(root, slot) {
    var t = absTop(slot);
    return adBoxes(root, slot).some(function (o) {
      return (o.bottom <= t + 1 && t - o.bottom < 90) || (o.top >= t - 1 && o.top - t < 90) || (o.top < t && o.bottom > t);
    });
  }
  // 문서 순서대로 "이 요소 뒤에 넣을 수 있는" 경계 후보. 큰 덩어리(1.4화면 초과)는 안으로 들어간다.
  function boundaries(node, VH, out, depth) {
    var kids = kidsOf(node);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (inChrome(k) || isAdish(k)) { out.push(null); continue; }
      if (k.getBoundingClientRect().height > VH * 1.4 && depth < 6 && kidsOf(k).length) boundaries(k, VH, out, depth + 1);
      out.push(k);
    }
    return out;
  }
  function placeNear(root, T, maxY, types, VH, anchor) {
    var cand = anchor ? [anchor] : boundaries(root, VH, [], 0);
    var tries = 0;
    for (var i = 0; i < cand.length && tries < 10; i++) {
      var ref = cand[i];
      if (!ref || !ref.parentNode) continue;
      var b = absBottom(ref);
      if (!anchor && b < T) continue;
      if (b > maxY) break;
      tries++;
      var sl = makeSlot(types, ref.parentNode);
      insertAfter(ref, sl);
      if (!nearAd(root, sl)) return sl;
      sl.parentNode.removeChild(sl);
    }
    return null;
  }
  function autoPlace() {
    var cfg = autoCfg();
    if (!cfg || !pool) return;
    var root = contentRoot(); if (!root) return;
    var VH = window.innerHeight || 800;
    var ctx = cfg.ctx || '';
    var ctxList = ctx ? ctx.split(',') : [];
    var every = +cfg.every || +autoAll.every || 10;
    clearAuto();
    collapseStatic();
    // 사이트에 박힌 쿠팡·제휴 카드와 붙은 광고 칸은 숨긴다(광고끼리 붙이지 않기).
    staticSlots().forEach(function (sl) {
      var t = absTop(sl), bt = absBottom(sl);
      var touch = adBoxes(root, sl).some(function (o) { return o.site && ((o.bottom <= t + 1 && t - o.bottom < 90) || (o.top >= bt - 1 && o.top - bt < 90)); });
      if (touch) releaseSlot(sl);
    });
    var H = Math.max(document.documentElement.scrollHeight, root.scrollHeight);
    var lists = cfg.feed === false ? [] : findLists(root);
    var listItems = 0, listH = 0, lastBottom = 0;
    lists.forEach(function (l) { listItems += kidsOf(l).length; listH += l.getBoundingClientRect().height; lastBottom = Math.max(lastBottom, absBottom(l)); });
    var longList = listItems >= 16 && listH > VH * 3;
    var cap = +cfg.cap || (longList ? 4 : 3);
    var placed = 0;
    // 긴 목록: 끝까지 내려가는 사람이 드무니 목록 아래쪽 정적 칸은 위로 옮긴다(숨김).
    if (longList) {
      var cut = Math.max(lastBottom - 10, H * 0.7);
      staticSlots().forEach(function (s) { if (absTop(s) > cut) releaseSlot(s); });
    }
    // mid: 첫 화면 끝(또는 본문 1/3)
    var T = Math.max(260, Math.min(VH * 0.85, H * 0.34));
    var haveTop = staticSlots().some(function (s) { return absTop(s) < VH * 1.5 && (!ctxList.length || ctxList.indexOf(slotGroup(s)) >= 0); });
    var mid = null;
    if (!haveTop) {
      if (ctxList.length) {
        var free = pool.some(function (a) { return !used[a.id] && (ctxList.indexOf(groupOf(a)) >= 0 || ctxList.indexOf(typeOf(a)) >= 0); });
        if (!free) {
          var low = staticSlots().filter(function (s) { return ctxList.indexOf(slotGroup(s)) >= 0; });
          if (low.length) releaseSlot(low[low.length - 1]);
        }
      }
      var anchor = cfg.anchor ? document.querySelector(cfg.anchor) : null;
      mid = placeNear(root, T, T + VH * 2.5, ctx, VH, anchor && shown(anchor) ? anchor : null);
      if (mid) placed++;
      else if (ctxList.length) {
        // 붙지 않는 새 자리가 없으면 위쪽(3화면 안) 기존 칸을 문맥 광고로 바꾼다.
        var up = staticSlots().filter(function (s) { return absTop(s) < VH * 3; })[0];
        if (up) {
          var ua = up.shadowRoot && up.shadowRoot.querySelector('a');
          if (ua) { var uh = ua.getAttribute('href'); pool.forEach(function (x) { if (x.url === uh) delete used[x.id]; }); }
          up.shadowRoot.innerHTML = '';
          up.setAttribute('data-types', ctx);
          if (filled && filled.delete) filled.delete(up); else up.__nadooAd = 0;
          fill(up);
        }
      }
    }
    // feed: 긴 목록은 N개마다(문맥→쿠팡→네이버)
    if (longList) {
      var rot = (cfg.rot && cfg.rot.length) ? cfg.rot : [ 'coupang', 'apple', ctx || 'cpa' ];
      var n = 0, k = 0;
      for (var li = 0; li < lists.length; li++) {
        var items = kidsOf(lists[li]);
        for (var j = 0; j < items.length; j++) {
          if (items[j].hasAttribute('data-nadoo-auto-slot')) continue;
          n++;
          if (n % every !== 0 || j === items.length - 1) continue;
          if (adBoxes(root).length >= cap) break;
          var sl = makeSlot(rot[k % rot.length], lists[li]);
          insertAfter(items[j], sl);
          if (nearAd(root, sl)) { sl.parentNode.removeChild(sl); n--; continue; }
          k++; placed++;
        }
      }
    }
    // 합계 제한: 넘치면 아래쪽 정적 칸부터 숨긴다(위로 옮긴 셈).
    var guard = 0;
    while (guard++ < 10) {
      var boxes = adBoxes(root);
      if (boxes.length <= cap) break;
      var victim = null;
      for (var b = boxes.length - 1; b >= 0; b--) { var e = boxes[b].el; if (!boxes[b].site && !boxes[b].auto && e.classList && e.classList.contains('nadoo-ad')) { victim = e; break; } }
      if (victim) { releaseSlot(victim); continue; }
      for (var c = boxes.length - 1; c >= 0; c--) { if (boxes[c].auto && boxes[c].el !== mid) { victim = boxes[c].el; break; } }
      if (victim && victim.parentNode) { victim.parentNode.removeChild(victim); placed--; continue; }
      break;
    }
    // end: 글 끝 40% 안에 광고가 하나도 없으면 1개
    if (cfg.end) {
      var H2 = document.documentElement.scrollHeight;
      var anyLow = adBoxes(root).some(function (o) { return o.top > H2 * 0.6; });
      if (!anyLow && adBoxes(root).length < cap) {
        var last = kidsOf(root); var lastEl = last[last.length - 1];
        if (lastEl && !isAdish(lastEl)) { var e2 = makeSlot('', root); root.appendChild(e2); if (nearAd(root, e2)) root.removeChild(e2); else placed++; }
      }
    }
    autoPlaced = placed;
    if (placed) scan();
  }
  function scheduleAuto(delay) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoPath = location.pathname + location.search; try { autoPlace(); } catch (e) {} }, delay);
  }
  function start() {
    scan();
    scanBar();
    syncStickies();
    // 하이드레이션이 끝난 뒤에 자동 배치(React 화면과 충돌하지 않게).
    if (document.readyState === 'complete') scheduleAuto(900);
    else window.addEventListener('load', function () { scheduleAuto(900); });
    document.addEventListener('click', trackSiteCoupang, true);
    document.addEventListener('auxclick', trackSiteCoupang, true);
    var st = false;
    // 문서 자체가 스크롤되지 않는 화면(지도형 앱 등)은 잠시 머문 뒤 보여 준다.
    setTimeout(function () {
      var de = document.documentElement;
      if (de && de.scrollHeight <= (window.innerHeight || 800) + 60) { innerY = 1e9; syncStickies(); }
    }, 6000);
    // 본문이 내부 스크롤 영역인 사이트(지도형 등)도 스크롤 양을 잡는다.
    document.addEventListener('scroll', function (ev) {
      var t = ev.target;
      if (t && t.nodeType === 1 && t.scrollTop > innerY) innerY = t.scrollTop;
      if (st) return; st = true;
      setTimeout(function () { st = false; syncStickies(); }, 120);
    }, { passive: true, capture: true });
    if (window.MutationObserver) {
      var t = null;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () {
        var live = {}; var els = document.querySelectorAll('.nadoo-ad');
        for (var i = 0; i < els.length; i++) { var s = els[i].shadowRoot; var h = s && s.querySelector('a'); if (h) live[h.getAttribute('href')] = 1; }
        pool && pool.forEach(function (a) { if (used[a.id] && !live[a.url]) delete used[a.id]; });
        scan();
        scanBar();
        syncStickies();
        var cur = location.pathname + location.search;
        if (autoPath !== null && cur !== autoPath) { autoPath = cur; autoRuns = 0; clearAuto(); scheduleAuto(900); }
        // 목록을 다시 그리는 화면(필터·정렬)에서 자동 칸이 지워졌으면 다시 넣는다(같은 주소에서 최대 6번).
        else if (autoPath !== null && autoPlaced && autoRuns < 6 && !document.querySelector('[data-nadoo-auto-slot]')) { autoRuns++; scheduleAuto(600); }
      }, 150); }).observe(document.documentElement, { childList: true, subtree: true });
    }
    if (window.addEventListener) {
      window.addEventListener('resize', function () {
        var els = document.querySelectorAll('.nadoo-ad-bar');
        for (var i = 0; i < els.length; i++) {
          var r = els[i].shadowRoot; if (r) applyStickyOffset(r);
        }
        syncStickies();
      });
      window.addEventListener('orientationchange', syncSpacer);
    }
  }
  fetch(base + 'ads.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
    pool = (j.ads || []).filter(eligible);
    barCfg = j.bar || null;
    autoAll = j.auto || null;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }).catch(function () {});
})();
