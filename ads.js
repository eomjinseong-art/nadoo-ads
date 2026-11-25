/* 공용 광고 박스 — 사용법: <div class="nadoo-ad"></div> 를 원하는 자리에 두고
   <script src="https://nadoo-ads.vercel.app/ads.js" defer></script> 한 줄을 넣는다.
   광고 목록은 같은 위치의 ads.json 하나에서 관리한다. url이 빈 항목은 자동으로 숨긴다.
   선택: <div class="nadoo-ad" data-exclude="coupang,len3"> 로 특정 광고 제외. */
(function () {
  if (window.__nadooAds) return; window.__nadooAds = true;
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/[^\/]*$/, '') : 'https://nadoo-ads.vercel.app/';
  var ABACUS = 'https://abacus.jasoncameron.dev/hit/nadoo-ads/';
  var filled = typeof WeakSet === 'function' ? new WeakSet() : null;
  var used = {};          // 같은 페이지 안에서 이미 보여 준 광고 id
  var pool = null;        // 오늘 노출 가능한 광고
  var pending = [];

  function kstDay() { return new Date(Date.now() + 9 * 3600e3).getUTCDay(); }
  function kstDate() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function eligible(a) {
    if (!a || !a.url || !/^https:\/\//.test(a.url) || a.active === false) return false;
    if (Array.isArray(a.days) && a.days.indexOf(kstDay()) < 0) return false;
    var d = kstDate();
    if (a.start && d < a.start) return false;
    if (a.end && d > a.end) return false;
    return true;
  }
  function pick(exclude) {
    var c = pool.filter(function (a) { return !used[a.id] && exclude.indexOf(a.id) < 0; });
    if (!c.length) return null;
    var total = 0; c.forEach(function (a) { total += (+a.weight > 0 ? +a.weight : 1); });
    var r = Math.random() * total;
    for (var i = 0; i < c.length; i++) { r -= (+c[i].weight > 0 ? +c[i].weight : 1); if (r <= 0) return c[i]; }
    return c[c.length - 1];
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  var CSS = ':host{display:block;margin:20px 0;font-family:inherit;color:inherit;text-align:left;clear:both}' +
    'a.card{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;border:1px solid rgba(128,128,128,.35);border-radius:12px;background:rgba(128,128,128,.07);color:inherit;text-decoration:none;line-height:1.5;transition:background .15s,border-color .15s}' +
    'a.card:hover{background:rgba(128,128,128,.13);border-color:rgba(128,128,128,.55)}' +
    '.txt{flex:1 1 220px;min-width:0}' +
    '.lab{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border:1px solid rgba(128,128,128,.55);border-radius:999px;opacity:.8;margin-right:6px;vertical-align:1px}' +
    '.t{font-weight:700;font-size:15px}' +
    '.d{font-size:13.5px;opacity:.8;margin-top:3px}' +
    '.n{font-size:11.5px;opacity:.6;margin-top:6px}' +
    '.b{flex:0 0 auto;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid currentColor;white-space:nowrap}';
  function render(el, a) {
    var root = el.shadowRoot || (el.attachShadow ? el.attachShadow({ mode: 'open' }) : null);
    if (!root) return;
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<a class="card" href="' + esc(a.url) + '" target="_blank" rel="sponsored noopener" aria-label="광고: ' + esc(a.title) + '">' +
      '<div class="txt"><div><span class="lab">광고</span><span class="t">' + esc(a.title) + '</span></div>' +
      (a.desc ? '<div class="d">' + esc(a.desc) + '</div>' : '') +
      (a.note ? '<div class="n">' + esc(a.note) + '</div>' : '') +
      '</div><span class="b">' + esc(a.cta || '자세히 보기') + '</span></a>';
    root.querySelector('a').addEventListener('click', function () {
      try { fetch(ABACUS + 'click-' + encodeURIComponent(a.id), { mode: 'no-cors', keepalive: true }); } catch (e) {}
    });
  }
  function fill(el) {
    if (filled ? filled.has(el) : el.__nadooAd) return;
    if (filled) filled.add(el); else el.__nadooAd = 1;
    var ex = (el.getAttribute('data-exclude') || '').split(',').map(function (s) { return s.trim(); });
    var a = pick(ex);
    if (!a) return;              // 남은 광고가 없으면 자리를 비워 둔다
    used[a.id] = 1;
    render(el, a);
  }
  function scan() {
    var els = document.querySelectorAll('.nadoo-ad');
    for (var i = 0; i < els.length; i++) { if (pool) fill(els[i]); }
  }
  function start() {
    scan();
    if (window.MutationObserver) {
      var t = null;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () {
        // SPA 페이지 이동 시 새 자리가 생기면 다시 채운다(사라진 자리의 광고는 다시 쓸 수 있게 초기화)
        var live = {}; var els = document.querySelectorAll('.nadoo-ad');
        for (var i = 0; i < els.length; i++) { var s = els[i].shadowRoot; var h = s && s.querySelector('a'); if (h) live[h.getAttribute('href')] = 1; }
        pool && pool.forEach(function (a) { if (used[a.id] && !live[a.url]) delete used[a.id]; });
        scan();
      }, 150); }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  fetch(base + 'ads.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
    pool = (j.ads || []).filter(eligible);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }).catch(function () {});
})();
