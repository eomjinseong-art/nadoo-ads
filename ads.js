/* 공용 광고 박스 — 사용법: <div class="nadoo-ad"></div> 를 원하는 자리에 두고
   <script src="https://nadoo-ads.vercel.app/ads.js" defer></script> 한 줄을 넣는다.
   광고 목록은 같은 위치의 ads.json 하나에서 관리한다. url이 빈 항목은 자동으로 숨긴다.
   선택: <div class="nadoo-ad" data-exclude="coupang,len3"> 로 특정 광고 제외.
   선택: <div class="nadoo-ad" data-types="apple,coupang"> 로 특정 묶음만 노출(묶음: cpa, apple, coupang, linkprice, vpnpromo, lodge / type 이름도 가능).
   type: cpa(기본, 디비센스) · coupang(쿠팡 파트너스) · naver(네이버 쇼핑 커넥트) · hub(자체 허브) · linkprice(링크프라이스) · vpnpromo(영화 사이트용 VPN 비교 페이지 안내).
   type별 고지 문구가 자동으로 붙는다(note가 있으면 note 우선). 묶음(cpa/apple/coupang/linkprice)을 고르게 돌린다.
   sites가 있는 항목은 location.hostname이 그 목록과 일치할 때만 노출된다.
   하단 바로가기: <div class="nadoo-ad-bar"></div>. 코드 맵은 ads.json 의 bar.sites.
   사이트 코드나 merchants가 없으면 로고는 숨긴다. 나두게임즈(robingames)는 노출하지 않는다. */
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
    var root = el.shadowRoot || (el.attachShadow ? el.attachShadow({ mode: 'open' }) : null);
    if (!root) return;
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
    if (!a) return;
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
    var h = Math.round(sticky.getBoundingClientRect().height);
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
    '@media (max-width:767px){.footer{display:none}.sticky{display:block;position:fixed;left:0;right:0;z-index:9998;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(20,20,20,.94);color:#f4f4f4;box-shadow:0 -4px 18px rgba(0,0,0,.28);backdrop-filter:blur(8px)}}' +
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
    '@media (max-width:767px){.head{margin-bottom:8px}.ttl{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto}.logos{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}a.logo{padding:8px 8px 8px 10px;border-radius:10px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14)}a.logo:hover{background:rgba(255,255,255,.14)}a.logo img{height:22px;max-width:56px}.name{font-size:11px}.line{font-size:10.5px;opacity:.9}}' +
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
    sticky.style.bottom = otherBottomH() + 'px';
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
      '<div class="sticky">' +
        '<div class="head"><span class="lab">' + esc(lab) + '</span><span class="ttl">' + esc(title) + '</span>' + close + '</div>' +
        '<div class="logos">' + logos + '</div>' +
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

  function start() {
    scan();
    scanBar();
    if (window.MutationObserver) {
      var t = null;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () {
        var live = {}; var els = document.querySelectorAll('.nadoo-ad');
        for (var i = 0; i < els.length; i++) { var s = els[i].shadowRoot; var h = s && s.querySelector('a'); if (h) live[h.getAttribute('href')] = 1; }
        pool && pool.forEach(function (a) { if (used[a.id] && !live[a.url]) delete used[a.id]; });
        scan();
        scanBar();
      }, 150); }).observe(document.documentElement, { childList: true, subtree: true });
    }
    if (window.addEventListener) {
      window.addEventListener('resize', function () {
        var els = document.querySelectorAll('.nadoo-ad-bar');
        for (var i = 0; i < els.length; i++) {
          var r = els[i].shadowRoot; if (r) applyStickyOffset(r);
        }
        syncSpacer();
      });
      window.addEventListener('orientationchange', syncSpacer);
    }
  }
  fetch(base + 'ads.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
    pool = (j.ads || []).filter(eligible);
    barCfg = j.bar || null;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }).catch(function () {});
})();
