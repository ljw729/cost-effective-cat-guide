// 高性价比猫猫指南 — client script. No tracking, no network calls except the local search index.
// Works on the website (fetches search-index.json) and in offline.html (index embedded inline).
(function () {
  'use strict';
  var BASE = (document.querySelector('meta[name="base-path"]') || {}).content || '/';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  // ---------- theme ----------
  function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  applyTheme(store.get('theme', null));
  var themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var cur = store.get('theme', null);
      var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = dark ? 'light' : 'dark';
      store.set('theme', next); applyTheme(next);
    });
  }

  // ---------- favorites ----------
  var favs = new Set(store.get('favorites', []));
  function saveFavs() { store.set('favorites', Array.from(favs)); }
  function favButton(id) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fav';
    b.setAttribute('aria-pressed', favs.has(id) ? 'true' : 'false');
    b.setAttribute('aria-label', '收藏'); b.title = '收藏（只保存在你的浏览器里）';
    b.textContent = favs.has(id) ? '★' : '☆';
    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavs();
      b.setAttribute('aria-pressed', favs.has(id) ? 'true' : 'false');
      b.textContent = favs.has(id) ? '★' : '☆';
      if (typeof render === 'function' && state.onlyFavs) render();
    });
    return b;
  }
  document.querySelectorAll('[data-fav-entry]').forEach(function (el) {
    var id = el.getAttribute('data-fav-entry');
    var b = favButton(id); b.className = 'btn';
    var sync = function () { b.textContent = favs.has(id) ? '★ 已收藏' : '☆ 收藏'; };
    sync(); b.addEventListener('click', sync); el.appendChild(b);
  });

  // ---------- offline (service worker; website only) ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:' && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register(BASE + 'sw.js').catch(function () { /* ignore */ });
  }

  // ---------- search ----------
  var app = document.getElementById('finder');
  if (!app) return;
  var state = { q: '', category: '', audience: '', grade: '', evidence: '', type: '', onlyFavs: false };
  var data = null;
  var listEl = app.querySelector('.cards');
  var countEl = app.querySelector('.result-count');

  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Synonym groups: a query token that contains, or is contained in, any term of a group
  // also matches entries tagged with that group (and text containing any of its terms).
  function groupsFor(token) {
    var out = [];
    data.synonyms.forEach(function (g) {
      for (var i = 0; i < g.terms.length; i++) {
        var t = norm(g.terms[i]);
        if (t.length < 2 && token.length < 2) continue;
        if (token.indexOf(t) !== -1 || (token.length >= 2 && t.indexOf(token) !== -1)) { out.push(g); return; }
      }
      if (g.tag === token) out.push(g);
    });
    return out;
  }

  function scoreEntry(e, tokens) {
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i], s = 0;
      if (e._title.indexOf(tok) !== -1) s += 6;
      if (e._summary.indexOf(tok) !== -1) s += 3;
      if (e._text.indexOf(tok) !== -1) s += 1;
      var gs = groupsFor(tok);
      for (var j = 0; j < gs.length; j++) {
        if (e.tags.indexOf(gs[j].tag) !== -1) { s += 4; break; }
        for (var k = 0; k < gs[j].terms.length; k++) { if (e._text.indexOf(norm(gs[j].terms[k])) !== -1) { s += 1; break; } }
      }
      if (!s) return 0; // every token must match something
      total += s;
    }
    return total;
  }

  function passFilters(e) {
    if (state.category && e.category !== state.category) return false;
    if (state.audience && e.applies_to.indexOf(state.audience) === -1 && e.applies_to.indexOf('all') === -1) return false;
    if (state.grade) { if (state.grade === 'none' ? e.grade : e.grade !== state.grade) return false; }
    if (state.evidence && e.evidence !== state.evidence) return false;
    if (state.type && e.type !== state.type) return false;
    if (state.onlyFavs && !favs.has(e.id)) return false;
    return true;
  }

  var render = function () {
    var tokens = norm(state.q).split(' ').filter(Boolean);
    var rows = [];
    data.entries.forEach(function (e, idx) {
      if (!passFilters(e)) return;
      var sc = tokens.length ? scoreEntry(e, tokens) : 1;
      if (sc > 0) rows.push({ e: e, sc: sc, idx: idx });
    });
    rows.sort(function (a, b) { return b.sc - a.sc || a.idx - b.idx; });
    listEl.innerHTML = '';
    rows.forEach(function (r) { var li = cardNodes[r.e.id]; if (li) listEl.appendChild(li); });
    if (!rows.length) {
      var li = document.createElement('li'); li.className = 'empty';
      li.textContent = tokens.length ? '没有找到。换个说法试试，比如“尿不出来”“吐”“不吃饭”。紧急情况请直接联系兽医。' : '没有符合筛选条件的条目。';
      listEl.appendChild(li);
    }
    countEl.textContent = rows.length + ' / ' + data.entries.length + ' 条';
    try {
    var url = new URL(location.href);
    ['q', 'category', 'audience', 'grade', 'evidence', 'type'].forEach(function (k) { if (state[k]) url.searchParams.set(k, state[k]); else url.searchParams.delete(k); });
    history.replaceState(null, '', url);
    } catch (e) { /* file:// or sandboxed: skip URL sync */ }
  };

  function bind() {
    var params = new URL(location.href).searchParams;
    app.querySelectorAll('[data-filter]').forEach(function (el) {
      var key = el.getAttribute('data-filter');
      if (params.get(key)) { state[key] = params.get(key); el.value = state[key]; }
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () { state[key] = el.value; render(); });
    });
    var favBtn = app.querySelector('[data-only-favs]');
    if (favBtn) favBtn.addEventListener('click', function () {
      state.onlyFavs = !state.onlyFavs; favBtn.setAttribute('aria-pressed', state.onlyFavs ? 'true' : 'false'); render();
    });
    var rnd = app.querySelector('[data-random]');
    if (rnd) rnd.addEventListener('click', function () {
      var pool = data.entries.filter(passFilters);
      if (!pool.length) pool = data.entries;
      var e = pool[Math.floor(Math.random() * pool.length)];
      location.href = e.href;
    });
    var reset = app.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      Object.keys(state).forEach(function (k) { state[k] = k === 'onlyFavs' ? false : ''; });
      app.querySelectorAll('[data-filter]').forEach(function (el) { el.value = ''; });
      if (favBtn) favBtn.setAttribute('aria-pressed', 'false');
      render();
    });
  }

  var cardNodes = {};
  function init(d) {
    data = d;
    listEl.querySelectorAll('li.card').forEach(function (li) {
      var id = li.getAttribute('data-id'); cardNodes[id] = li; li.appendChild(favButton(id));
    });
    data.entries.forEach(function (e) {
      e._title = norm(e.title); e._summary = norm(e.summary); e._text = norm(e.text);
    });
    bind(); render();
  }

  if (window.__GUIDE_INDEX__) init(window.__GUIDE_INDEX__);
  else fetch(BASE + 'search-index.json').then(function (r) { return r.json(); }).then(init).catch(function () {
    countEl.textContent = '搜索索引加载失败，可以按分类浏览。';
  });

})();
