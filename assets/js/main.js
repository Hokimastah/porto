/* Satrio Puji Danutirto — portfolio scripts
   1. Theme toggle   2. Mobile menu   3. Header + active link   4. Hero illustration */

(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function onMediaChange(query, handler) {
    if (query.addEventListener) query.addEventListener('change', handler);
    else if (query.addListener) query.addListener(handler);
  }

  /* ---------- 1. Theme toggle ---------- */
  var themeBtn = document.getElementById('theme-toggle');

  function currentTheme() {
    return root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  }

  function syncThemeButton() {
    if (!themeBtn) return;
    var theme = currentTheme();
    themeBtn.setAttribute('data-state', theme);
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function announceTheme() {
    syncThemeButton();
    document.dispatchEvent(new CustomEvent('themechange'));
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
      announceTheme();
    });
  }
  onMediaChange(darkQuery, announceTheme);
  syncThemeButton();

  /* ---------- 2. Mobile menu ---------- */
  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- 3. Header border + active nav link ---------- */
  var header = document.getElementById('site-header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { observer.observe(s); });
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 4. Hero illustration: continual learning on a hypersphere ---------- */
  var canvas = document.getElementById('embedding-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var SLOTS = 10;
  // Base session first, then two new classes per incremental session.
  var SESSIONS = [[0, 2, 5, 7], [1, 6], [3, 8], [4, 9]];
  var PER_CLASS = 22;
  var REPLAY_PER_CLASS = 3;
  var DURATION = 950;

  var statusEl = document.getElementById('viz-status');
  var nextBtn = document.getElementById('viz-next');
  var modeInputs = document.querySelectorAll('input[name="viz-mode"]');

  var state = { session: 0, mode: 'sawit' };
  var size = 0;
  var colors = {};
  var raf = null;
  var animStart = 0;

  // Small seeded RNG so the picture is the same on every visit.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260418);
  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function slotAngle(k) { return -Math.PI / 2 + k * (2 * Math.PI / SLOTS); }
  function wrap(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  var sessionOf = [];
  SESSIONS.forEach(function (s, i) { s.forEach(function (k) { sessionOf[k] = i; }); });

  // Points, with fixed noise so transitions are smooth and repeatable.
  var points = [];
  for (var k = 0; k < SLOTS; k++) {
    var cls = [];
    for (var i = 0; i < PER_CLASS; i++) {
      cls.push({ k: k, i: i, na: gauss(), nr: gauss(), drift: rand(), x: 0, y: 0, a: 0, ring: 0 });
    }
    // Herding keeps the samples closest to the class centre.
    cls.slice().sort(function (p, q) {
      return (Math.abs(p.na) + Math.abs(p.nr)) - (Math.abs(q.na) + Math.abs(q.nr));
    }).slice(0, REPLAY_PER_CLASS).forEach(function (p) { p.replay = true; });
    points = points.concat(cls);
  }

  var protos = [];
  for (var s = 0; s < SLOTS; s++) protos.push({ k: s, a: 0 });

  function targetFor(p) {
    var theta = slotAngle(p.k);
    var learned = sessionOf[p.k] <= state.session;
    if (!learned) {
      return { x: Math.cos(theta) * 0.12, y: Math.sin(theta) * 0.12, a: 0, ring: 0 };
    }
    var isOld = sessionOf[p.k] < state.session;
    var sigA = 0.07;
    var sigR = 0.035;

    if (state.mode === 'finetune' && isOld) {
      // Without replay or distillation, old classes slide toward the newest ones.
      var newest = SESSIONS[state.session];
      var best = Infinity;
      newest.forEach(function (n) {
        var d = wrap(slotAngle(n) - theta);
        if (Math.abs(d) < Math.abs(best)) best = d;
      });
      var age = state.session - sessionOf[p.k];
      var pull = Math.min(0.85, 0.5 + 0.12 * (age - 1)) * (0.55 + 0.6 * p.drift);
      theta = theta + best * pull;
      sigA = 0.24 + 0.05 * age;
      sigR = 0.15;
    }

    var a = theta + p.na * sigA;
    var r = Math.max(0.55, Math.min(1.2, 1 + p.nr * sigR));
    var showRing = state.mode === 'sawit' && isOld && p.replay ? 1 : 0;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, a: 1, ring: showRing };
  }

  function setTargets(instant) {
    var newest = SESSIONS[state.session];
    points.forEach(function (p) {
      var t = targetFor(p);
      p.fx = p.x; p.fy = p.y; p.fa = p.a; p.fring = p.ring;
      p.tx = t.x; p.ty = t.y; p.ta = t.a; p.tring = t.ring;
      var entering = newest.indexOf(p.k) !== -1 && p.a < 0.5;
      p.delay = p.i * 12 + (entering ? 160 : 0);
    });
    protos.forEach(function (pr) {
      pr.fa = pr.a;
      pr.ta = sessionOf[pr.k] <= state.session ? 1 : 0;
    });

    if (instant || reduceMotion.matches) {
      points.forEach(function (p) { p.x = p.tx; p.y = p.ty; p.a = p.ta; p.ring = p.tring; });
      protos.forEach(function (pr) { pr.a = pr.ta; });
      draw();
      return;
    }
    animStart = performance.now();
    if (!raf) raf = requestAnimationFrame(step);
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function step(now) {
    var done = true;
    points.forEach(function (p) {
      var t = Math.max(0, Math.min(1, (now - animStart - p.delay) / DURATION));
      if (t < 1) done = false;
      var e = ease(t);
      p.x = lerp(p.fx, p.tx, e);
      p.y = lerp(p.fy, p.ty, e);
      p.a = lerp(p.fa, p.ta, e);
      p.ring = lerp(p.fring, p.tring, e);
    });
    var pt = Math.max(0, Math.min(1, (now - animStart) / DURATION));
    protos.forEach(function (pr) { pr.a = lerp(pr.fa, pr.ta, ease(pt)); });
    draw();
    raf = done ? null : requestAnimationFrame(step);
  }

  function readColors() {
    var cs = getComputedStyle(root);
    colors.ink = cs.getPropertyValue('--ink').trim();
    colors.rule = cs.getPropertyValue('--rule').trim();
    colors.muted = cs.getPropertyValue('--muted').trim();
    colors.paper = cs.getPropertyValue('--paper').trim();
    colors.classes = [];
    for (var c = 0; c < SLOTS; c++) colors.classes.push(cs.getPropertyValue('--c' + c).trim());
  }

  function draw() {
    if (!size) return;
    var w = size;
    var cx = w / 2, cy = w / 2, R = w * 0.38;
    var dot = Math.max(1.8, w / 175);

    ctx.clearRect(0, 0, w, w);

    // Hypersphere outline and centre
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = colors.rule;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Spokes to prototypes
    protos.forEach(function (pr) {
      if (pr.a < 0.01) return;
      var th = slotAngle(pr.k);
      ctx.globalAlpha = pr.a * 0.55;
      ctx.strokeStyle = colors.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(th) * R, cy + Math.sin(th) * R);
      ctx.stroke();
    });

    // Embeddings
    points.forEach(function (p) {
      if (p.a < 0.01) return;
      ctx.globalAlpha = p.a * 0.88;
      ctx.fillStyle = colors.classes[p.k];
      ctx.beginPath();
      ctx.arc(cx + p.x * R, cy + p.y * R, dot, 0, Math.PI * 2);
      ctx.fill();
    });

    // Prototype rings show where each class belongs
    protos.forEach(function (pr) {
      if (pr.a < 0.01) return;
      var th = slotAngle(pr.k);
      var px = cx + Math.cos(th) * R, py = cy + Math.sin(th) * R;
      ctx.globalAlpha = pr.a;
      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = colors.classes[pr.k];
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(px, py, dot * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Replay exemplars sit on top so they stay visible next to the prototype
    points.forEach(function (p) {
      if (p.ring < 0.01 || p.a < 0.01) return;
      var x = cx + p.x * R, y = cy + p.y * R;
      ctx.globalAlpha = p.ring * p.a;
      ctx.fillStyle = colors.classes[p.k];
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, dot + 2.4, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = rect.width;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.width * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function learnedCount() {
    var n = 0;
    for (var i = 0; i <= state.session; i++) n += SESSIONS[i].length;
    return n;
  }

  function updateText() {
    var last = state.session === SESSIONS.length - 1;
    var msg = 'Session ' + (state.session + 1) + ' of ' + SESSIONS.length + ': ';
    if (state.session === 0) {
      msg += learnedCount() + ' base classes learned.';
    } else {
      msg += learnedCount() + ' classes learned. ';
      msg += state.mode === 'sawit'
        ? 'Old classes stay next to their prototypes.'
        : 'Old classes drift toward the new ones. That is catastrophic forgetting.';
    }
    if (statusEl) statusEl.textContent = msg;
    if (nextBtn) {
      nextBtn.textContent = last ? 'Start over' : 'Add ' + SESSIONS[state.session + 1].length + ' new classes';
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      state.session = state.session === SESSIONS.length - 1 ? 0 : state.session + 1;
      updateText();
      setTargets(false);
    });
  }

  Array.prototype.forEach.call(modeInputs, function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      state.mode = input.value;
      updateText();
      setTargets(false);
    });
  });

  document.addEventListener('themechange', function () { readColors(); draw(); });

  // Browsers can restore a radio choice on reload, so start from what is checked.
  Array.prototype.forEach.call(modeInputs, function (input) {
    if (input.checked) state.mode = input.value;
  });

  readColors();
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();
  updateText();
  // One orchestrated entrance: embeddings spread out from the centre.
  setTargets(false);
})();
