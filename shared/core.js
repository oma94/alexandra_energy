/* Shared engine for the design versions.
   Each version is pure HTML + CSS; this file only:
   - injects the SVG sprite and builds repeated fragments (rosettes, lists, steps)
   - handles EN/FR, WhatsApp links, the 4-tab routing
   - toggles state classes that the version's CSS animates:
       body.has-intro            intro on screen (replays on every reload)
       #intro.is-opening         after the click, for data-intro-ms
       body.is-ready             site revealed → home entrance plays
       body.is-leaving / .is-entering   page change, for data-leave-ms / data-enter-ms
       body[data-page="reiki"]   current tab (per-page tint)
       --cx / --cy               last click position (circular reveals)
       --ind-x / --ind-w         active tab geometry (sliding nav indicator)      */

(function () {
  'use strict';

  const CONFIG = {
    whatsapp: '66XXXXXXXXX',            // digits only, international format
    line: 'https://line.me/ti/p/XXXXXX'
  };

  const PAGES = ['home', 'reiki', 'intuitive-communication', 'about'];
  const body = document.body;
  const root = document.documentElement;
  const num = (k, d) => parseInt(body.dataset[k] || d, 10);
  const INTRO_MS = num('introMs', 2500);
  const LEAVE_MS = num('leaveMs', 350);
  const ENTER_MS = num('enterMs', 700);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ================= Sprite ================= */
  const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  <path id="petal" d="M0 0 C 46 -58, 46 -142, 0 -196 C -46 -142, -46 -58, 0 0 Z"/>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8-1.1 1.6-2.5 1.9-2.5 1-2.5 2 1.1 1.8 2.5 1.8 2.5-.8 2.5-1.8M12 6.5v11"/></symbol>
  <symbol id="i-lang" viewBox="0 0 24 24"><path d="M4 6h9M8.5 4v2M6 14c2.2-1.6 4-4 5-8M4.5 8.5c.8 2.6 2.6 4.6 5 6"/><path d="M12.5 20l3.5-9 3.5 9M13.8 17h4.4"/></symbol>
  <symbol id="i-wifi" viewBox="0 0 24 24"><path d="M3.5 10a12 12 0 0 1 17 0M6.5 13.2a8 8 0 0 1 11 0M9.5 16.3a4 4 0 0 1 5 0"/><circle cx="12" cy="19.2" r=".9" fill="currentColor"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A8.5 8.5 0 0 1 15.5 3.5Z"/></symbol>
  <symbol id="i-fork" viewBox="0 0 24 24"><path d="M8 3v7a3 3 0 0 0 3 3v8M5 3v5M11 3v5M17 3c-2 0-3 2.5-3 6v3h3v9"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 8a4 4 0 0 1 7.5 2c0 5.4-7.5 10-7.5 10Z"/></symbol>
  <symbol id="i-zap" viewBox="0 0 24 24"><path d="M13.5 3 6 13.5h5.5L10.5 21 18 10.5h-5.5Z"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6L16.6 13"/><path d="M14 10a4 4 0 0 1 0 5.6l-2.4 2.4a4 4 0 0 1-5.6-5.6L7.4 11"/></symbol>
  <symbol id="i-rainbow" viewBox="0 0 24 24"><path d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-wa" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z"/><path stroke="none" fill="currentColor" d="M9.2 8.6c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.5l-.5.6c-.1.1-.1.3 0 .4.6 1 1.5 1.9 2.6 2.5.2.1.3.1.4 0l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.3.1.4.3.4.5-.1.9-.8 1.6-1.7 1.6-2.9 0-6-3.1-6-6 0-.9.5-1.5.9-1.7Z"/></symbol>
</defs></svg>`;
  body.insertAdjacentHTML('afterbegin', SPRITE);

  const icon = id => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
  const pad = n => String(n).padStart(2, '0');

  /* ================= Fragment builders ================= */
  // <svg data-rosette> → two rings of 8 petals
  $$('svg[data-rosette]').forEach(svg => {
    const ring = (cls, offset) => `<g class="ros__ring ros__ring--${cls}">` +
      Array.from({ length: 8 }, (_, i) =>
        `<use href="#petal" class="ros__petal" style="--r:${offset + i * 45}deg;--i:${i}"/>`).join('') + '</g>';
    svg.setAttribute('viewBox', '-220 -220 440 440');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML =
      '<circle class="ros__glow" r="210"/>' +
      '<g class="ros__rays">' + Array.from({ length: 12 }, (_, i) =>
        `<line x1="0" y1="0" x2="0" y2="-214" transform="rotate(${i * 30})" style="--i:${i}"/>`).join('') + '</g>' +
      ring('outer', 0) + ring('inner', 22.5) +
      '<circle class="ros__seed" r="7"/>';
  });

  // <ul data-list="reiki.when" data-count="6">
  $$('[data-list]').forEach(ul => {
    const p = ul.dataset.list, n = +ul.dataset.count;
    ul.innerHTML = Array.from({ length: n }, (_, i) =>
      `<li style="--i:${i}" data-i18n="${p}.${i + 1}"></li>`).join('');
  });

  // <ul data-iconlist="ic.when.b" data-icons="moon,fork,heart,zap">
  $$('[data-iconlist]').forEach(ul => {
    const p = ul.dataset.iconlist;
    ul.innerHTML = ul.dataset.icons.split(',').map((ic, i) =>
      `<li style="--i:${i}">${icon(ic)}<span data-i18n="${p}${i + 1}"></span></li>`).join('');
  });

  // <ul data-practical="reiki">
  $$('[data-practical]').forEach(ul => {
    const p = ul.dataset.practical;
    ul.innerHTML = [['clock', 'duration'], ['coin', 'price'], ['lang', 'lang'], ['wifi', 'where']].map(([ic, k], i) =>
      `<li style="--i:${i}">${icon(ic)}<span data-i18n="${p}.p.${k}"></span></li>`).join('');
  });

  // <div data-steps="ic.s" data-count="6">
  $$('[data-steps]').forEach(el => {
    const p = el.dataset.steps, n = +el.dataset.count;
    el.innerHTML = Array.from({ length: n }, (_, i) =>
      `<article class="step" data-reveal style="--i:${i}"><span class="step__n" aria-hidden="true">${pad(i + 1)}</span>` +
      `<h3 data-i18n="${p}${i + 1}.title"></h3><p data-i18n="${p}${i + 1}.text"></p></article>`).join('');
  });

  // [data-icon="wa"] → prepend an icon
  $$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

  /* ================= Language ================= */
  let lang = 'en';
  try { lang = localStorage.getItem('lang') || 'en'; } catch (e) { /* private mode */ }
  if (!I18N[lang]) lang = 'en';
  const t = key => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || '';

  function applyLang() {
    root.lang = lang;
    document.title = t('meta.title');
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    const wa = 'https://wa.me/' + CONFIG.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(t('cta.prefill'));
    $$('.js-wa').forEach(a => { a.href = wa; a.target = '_blank'; a.rel = 'noopener'; });
    $$('.js-line').forEach(a => { a.href = CONFIG.line; a.target = '_blank'; a.rel = 'noopener'; });
    requestAnimationFrame(moveIndicator);
  }

  /* ================= Routing + page transitions ================= */
  const currentHash = () => {
    const id = location.hash.replace(/^#/, '');
    return PAGES.includes(id) ? id : 'home';
  };
  let shown = null;
  let token = 0;

  function swap(id) {
    $$('.page').forEach(sec => { sec.hidden = sec.dataset.page !== id; });
    $$('.nav__link').forEach(a => {
      if (a.dataset.page === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    body.dataset.page = id;
    shown = id;
    window.scrollTo(0, 0);
    moveIndicator();
    observeReveals();
  }

  function navigate() {
    const id = currentHash();
    if (id === shown) return;
    const mine = ++token;
    // Cancellable: a newer click always wins, and final state never depends on animationend.
    body.classList.remove('is-entering');
    if (shown === null || reduceMotion) { swap(id); return; }
    body.dataset.next = id;
    body.classList.add('is-leaving');
    setTimeout(() => {
      if (mine !== token) return;
      swap(id);
      body.classList.remove('is-leaving');
      body.classList.add('is-entering');
      setTimeout(() => { if (mine === token) body.classList.remove('is-entering'); }, ENTER_MS);
    }, LEAVE_MS);
  }

  // Remember where the click happened (circular reveals start there)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    root.style.setProperty('--cx', e.clientX + 'px');
    root.style.setProperty('--cy', e.clientY + 'px');
  }, true);

  /* ================= Sliding nav indicator ================= */
  function moveIndicator() {
    const nav = $('.nav');
    const active = $('.nav__link[aria-current="page"]');
    if (!nav || !active) return;
    nav.style.setProperty('--ind-x', active.offsetLeft + 'px');
    nav.style.setProperty('--ind-w', active.offsetWidth + 'px');
  }
  window.addEventListener('resize', moveIndicator);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

  /* ================= Scroll reveals ================= */
  let io = null;
  function observeReveals() {
    const els = $$('.page:not([hidden]) [data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(el => { el.classList.remove('is-in'); io.observe(el); });
  }

  /* ================= Intro — replays on every reload ================= */
  const intro = $('#intro');
  const introBtn = $('#introBtn');

  function finishIntro() {
    if (!intro || !intro.isConnected) return;
    intro.remove();
    body.classList.remove('has-intro', 'is-opening');
    body.classList.add('is-ready');
    moveIndicator();
  }
  function openIntro() {
    if (intro.classList.contains('is-opening')) return;
    if (reduceMotion) { finishIntro(); return; }
    intro.classList.add('is-opening');
    body.classList.add('is-opening');
    setTimeout(finishIntro, INTRO_MS);
  }
  if (intro && introBtn) {
    body.classList.add('has-intro');
    introBtn.addEventListener('click', openIntro);
    intro.addEventListener('click', e => { if (e.target === intro) openIntro(); });
  } else {
    body.classList.add('is-ready');
  }

  /* ================= Wire up ================= */
  const langBtn = $('#langToggle');
  if (langBtn) langBtn.addEventListener('click', () => {
    lang = lang === 'en' ? 'fr' : 'en';
    try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
    applyLang();
  });
  window.addEventListener('hashchange', navigate);

  applyLang();
  navigate();
  const resetScroll = () => window.scrollTo(0, 0);
  window.addEventListener('load', () => { resetScroll(); requestAnimationFrame(resetScroll); setTimeout(resetScroll, 60); moveIndicator(); });
})();
