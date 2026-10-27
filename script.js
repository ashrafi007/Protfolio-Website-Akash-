(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Media
  $$('video[data-vid]').forEach(v => { v.src = VID[v.dataset.vid]; if (v.dataset.poster) v.poster = IMG[v.dataset.poster]; });

  // Hero video: autoplays muted, paused for reduced motion or by the viewer
  const heroVid = $('#heroVid'), heroToggle = $('#heroToggle');
  let heroPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setHeroLabel(){ const t = heroVid.paused ? 'Play' : 'Pause'; heroToggle.textContent = t; heroToggle.setAttribute('aria-label', t + ' hero video'); }
  function playHero(){ if (heroPaused) { heroVid.pause(); setHeroLabel(); return; } heroVid.play().then(setHeroLabel).catch(setHeroLabel); }
  heroToggle.addEventListener('click', () => { heroPaused = !heroVid.paused; if (heroPaused) heroVid.pause(); else heroVid.play().catch(()=>{}); setHeroLabel(); });

  let heroTw = null;
  const loaderEl = $('#loader');
  if (loaderEl) document.documentElement.classList.add('loading');
  // Hero name: GSAP letter rise, then weight swells (Bodoni Moda 400-600) near the pointer
  (function(){
    const name = $('.hero .name');
    if (!name || !window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    name.classList.add('gs');
    const letters = [];
    $$('span i', name).forEach(i => {
      const txt = i.textContent; i.textContent = '';
      Array.from(txt).forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden','true'); s.textContent = c; i.append(s); letters.push(s); });
    });
    heroTw = gsap.from(letters, { yPercent: 115, rotate: 6, duration: 0.7, ease: "power4.out", stagger: 0.025, delay: 0.05, paused: !!loaderEl });
    const hero = name.closest('.hero'), setters = letters.map(l => gsap.quickTo(l, 'fontWeight', { duration: 0.5, ease: 'power2.out' }));
    hero.addEventListener('pointermove', e => {
      letters.forEach((l, k) => {
        const r = l.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
        setters[k](400 + 200 * Math.max(0, 1 - d / 260));
      });
    });
    hero.addEventListener('pointerleave', () => setters.forEach(s => s(400)));
  })();

  // Loading screen: waits for fonts, the hero video's first frames and the page load (never longer than 5s)
  (function(){
    const root = document.documentElement;
    const done = () => { root.classList.remove('loading'); if (loaderEl) loaderEl.remove(); if (heroTw) heroTw.play(); };
    if (!loaderEl) return;
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    const nameEl = $('.ld-name', loaderEl), letters = [];
    $$('span', nameEl).forEach(sp => { const t = sp.textContent; sp.textContent = ''; Array.from(t).forEach(c => { const e = document.createElement('span'); e.className = 'ch'; e.textContent = c; sp.append(e); letters.push(e); }); });
    const bar = $('#ldBar'), num = $('#ldN'), st = { p: 0 }, t0 = performance.now();
    const paint = () => { gsap.set(bar, { scaleX: st.p / 100 }); num.textContent = String(Math.round(st.p)).padStart(3, '0'); };
    gsap.from(letters, { yPercent: 115, rotate: 6, duration: 0.8, ease: 'power4.out', stagger: 0.035 });
    const creep = gsap.to(st, { p: 88, duration: 3.2, ease: 'power2.out', onUpdate: paint });
    const wait = new Promise(r => { const f = () => r(); if (document.readyState === 'complete') f(); else window.addEventListener('load', f, { once: true }); });
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const vid = new Promise(r => { if (heroVid.readyState >= 3) r(); else { heroVid.addEventListener('canplay', () => r(), { once: true }); heroVid.addEventListener('error', () => r(), { once: true }); } });
    Promise.race([Promise.all([wait, fonts, vid]), new Promise(r => setTimeout(r, 5000))]).then(() => {
      const left = Math.max(0, 1500 - (performance.now() - t0));
      setTimeout(() => {
        creep.kill();
        gsap.to(st, { p: 100, duration: 0.45, ease: 'power2.out', onUpdate: paint, onComplete: () => {
          gsap.timeline({ onComplete: done })
            .to(letters, { yPercent: -115, rotate: -4, duration: 0.55, ease: 'power3.in', stagger: 0.025 })
            .to('.ld-row, .ld-bar', { yPercent: 0, opacity: 0, duration: 0.3 }, '<0.1')
            .to(loaderEl, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.1')
            .add(() => { if (heroTw) heroTw.play(); }, '-=0.45');
        } });
      }, left * 1000 / 1000);
    });
  })();

  // Router
  
  let prefill = '';
  let currentView = 'home';

  // Home + Portfolio are one scroll-driven flow: hero -> Fashion -> Commercial -> rest of home.
  // Each category pins and slides its images sideways; the nav and URL hash follow the scroll.
  const hsMQ = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const FLOW = ['home','portfolio','motion','brands','about','book'];
  let flowOn = false, hsCtxs = [], spies = [], hsTimer;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  // Smooth (inertial) scrolling, driven by the GSAP ticker so pinned animations stay in sync
  let lenis = null;
  if (window.Lenis && window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  if (lenis) ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  let routeLock = false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toY = (y, animate, done) => {
    if (!lenis) { window.scrollTo(0, y); if (done) done(); return; }
    if (!animate) { lenis.scrollTo(y, { immediate: true, force: true }); if (done) done(); return; }
    routeLock = true;
    lenis.scrollTo(y, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), force: true, lock: true, onComplete: () => { routeLock = false; if (done) done(); } });
  };
  $$('[data-panel] .grid').forEach(g => {
    const panel = g.closest('[data-panel]'), tab = $('#t-' + panel.dataset.panel);
    const view = document.createElement('div'); view.className = 'hs-view';
    const title = document.createElement('h3'); title.className = 'hs-title'; title.textContent = tab ? tab.textContent : (panel.dataset.label || '');
    const shotsEl = $$('.shot', g), cat = tab ? tab.textContent : (panel.dataset.label || '');
    shotsEl.forEach((sh, i) => {
      const im = $('img, video', sh), info = document.createElement('div'); info.className = 'card-info'; info.setAttribute('aria-hidden', 'true');
      const ln = txt => '<span class="ln"><span>' + txt + '</span></span>';
      info.innerHTML = ln(cat) + '<h4 class="ci-t">' + ln(im.dataset.cap || '') + '</h4>' + '<p class="ci-d">' + ln(im.dataset.desc || im.alt || '') + '</p>';
      sh.append(info);
    });
    g.before(view); view.append(title, g);
  });
  [$('#pfh'), $('#mh'), $('#brh'), $('#bh')].forEach(hd => {
    if (!hd) return;
    const t = hd.textContent; hd.textContent = ''; hd.classList.add('rv');
    Array.from(t).forEach(c => { const e = document.createElement('span'); e.className = 'ch'; e.setAttribute('aria-hidden','true'); e.textContent = c; hd.append(e); });
    hd.setAttribute('aria-label', t);
  });
  // About name: same letter split as the hero; rises in on scroll and swells near the pointer
  const aboutName = $('#ah'), aboutLetters = [];
  if (aboutName) {
    $$('span i', aboutName).forEach(i => {
      const txt = i.textContent; i.textContent = '';
      Array.from(txt).forEach(c => { const e = document.createElement('span'); e.className = 'ch'; e.setAttribute('aria-hidden', 'true'); e.textContent = c; i.append(e); aboutLetters.push(e); });
    });
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const set = aboutLetters.map(l => gsap.quickTo(l, 'fontWeight', { duration: 0.5, ease: 'power2.out' }));
      const head = aboutName.closest('.about-head');
      head.addEventListener('pointermove', e => aboutLetters.forEach((l, k) => { const r = l.getBoundingClientRect(); set[k](400 + 200 * Math.max(0, 1 - Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / 260)); }));
      head.addEventListener('pointerleave', () => set.forEach(s => s(400)));
    }
  }
  // entrance tweens per section, so they can be replayed when a nav click lands there
  const intro = { portfolio: [], motion: [], brands: [], about: [], book: [] };
  const keep = (name, tw) => { intro[name].push(tw); return tw; };
  function replay(h){ (intro[h] || []).forEach(tw => tw.restart()); }
  function killFlow(){
    Object.keys(intro).forEach(k => intro[k].length = 0);
    flowOn = false;
    hsCtxs.forEach(c => c.revert()); hsCtxs = [];
    spies.forEach(t => t.kill()); spies = [];
    $$('[data-panel]').forEach(p => p.classList.remove('hs'));
  }
  function buildPanel(panel){
    const grid = $('.grid', panel), view = $('.hs-view', panel), shots = $$('.shot', grid);
    panel.classList.add('hs');
    $$('img', grid).forEach(im => { im.loading = 'eager'; if (!im.complete) im.addEventListener('load', () => { clearTimeout(hsTimer); hsTimer = setTimeout(() => ScrollTrigger.refresh(), 80); }, { once: true }); });
    // Cards: photo left, writing right. Scrolling slides the whole row sideways, one card per step;
    // the writing rises out of a mask as each card arrives (slide only, no fades).
    const n = shots.length, lines = sh => $$('.ln > span', $('.card-info', sh));
    hsCtxs.push(gsap.context(() => {
      shots.forEach((sh, i) => { if (i > 0) gsap.set(lines(sh), { yPercent: 115 }); });
      if (n > 1) {
        const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
          trigger: view, pin: true, start: 'top top+=' + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head')) || 64),
          end: () => '+=' + ((n - 1) * innerHeight * 0.9), scrub: 0.4, invalidateOnRefresh: true, anticipatePin: 1
        } });
        tl.to(grid, { x: () => -(shots[n - 1].offsetLeft - shots[0].offsetLeft), duration: n - 1 }, 0);
        shots.forEach((sh, i) => {
          const img = $('img, video', sh);
          gsap.set(img, { scale: 1.06 });
          if (i > 0) {
            tl.fromTo(img, { xPercent: 4 }, { xPercent: -4, duration: 1 }, i - 1);
            tl.to(lines(shots[i - 1]), { yPercent: -115, stagger: 0.03, duration: 0.25, ease: 'power2.in' }, i - 0.95);
            tl.to(lines(sh), { yPercent: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }, i - 0.75);
          }
        });
      } else {
        // single card: it wipes open from the left and the photo settles as you scroll to it
        const card = shots[0], img = $('img, video', card);
        keep('brands', gsap.fromTo(card, { clipPath: 'inset(0 100% 0 0)', y: 60 }, { clipPath: 'inset(0 0% 0 0)', y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: panel, start: 'top 85%', once: true } }));
        gsap.fromTo(img, { scale: 1.2 }, { scale: 1.04, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 92%', end: 'bottom 30%', scrub: 0.5 } });
      }
      // first card's writing is static: visible straight away, no entrance animation
    }, panel));
  }
  function buildFlow(){
    killFlow();
    if (!window.gsap || !window.ScrollTrigger || !FLOW.includes(currentView)) return;
    flowOn = true;
    if (hsMQ.matches) $$('[data-panel]:not([hidden])').forEach(buildPanel);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) hsCtxs.push(gsap.context(() => {
      keep('portfolio', gsap.from($$('#pfh .ch'), { yPercent: 115, rotate: 5, duration: 0.7, ease: 'power4.out', stagger: 0.04, scrollTrigger: { trigger: '#pfh', start: 'top 85%', once: true } }));
      keep('portfolio', gsap.from('#pfh ~ .lede', { opacity: 0, y: 28, duration: 0.7, delay: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '#pfh', start: 'top 85%', once: true } }));
      keep('brands', gsap.from($$('#brh .ch'), { yPercent: 115, rotate: 5, duration: 0.7, ease: 'power4.out', stagger: 0.04, scrollTrigger: { trigger: '#brh', start: 'top 85%', once: true } }));
      keep('brands', gsap.from('#brh ~ .lede', { opacity: 0, y: 28, duration: 0.7, delay: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '#brh', start: 'top 85%', once: true } }));
      keep('motion', gsap.from($$('#mh .ch'), { yPercent: 115, rotate: 5, duration: 0.7, ease: 'power4.out', stagger: 0.05, scrollTrigger: { trigger: '#mh', start: 'top 85%', once: true } }));
      keep('motion', gsap.from('.motion-copy .lede', { yPercent: 40, opacity: 0, duration: 0.7, delay: 0.25, ease: 'power3.out', scrollTrigger: { trigger: '#mh', start: 'top 85%', once: true } }));
    }));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) hsCtxs.push(gsap.context(() => {
      keep('book', gsap.from($$('#bh .ch'), { yPercent: 115, rotate: 5, duration: 0.7, ease: 'power4.out', stagger: 0.04, scrollTrigger: { trigger: '#bh', start: 'top 85%', once: true } }));
      keep('book', gsap.from('.contact-head .lede', { opacity: 0, y: 28, duration: 0.7, delay: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '#bh', start: 'top 85%', once: true } }));
      keep('book', gsap.from('.ccard', { y: 56, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.contact-cards', start: 'top 90%', once: true } }));
    }));
    if (aboutName && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) hsCtxs.push(gsap.context(() => {
      keep('about', gsap.from(aboutLetters, { yPercent: 115, rotate: 6, duration: 0.7, ease: 'power4.out', stagger: 0.025, scrollTrigger: { trigger: '#ah', start: 'top 85%', once: true } }));
      keep('about', gsap.from('.about-head .eyebrow', { yPercent: 100, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '#ah', start: 'top 85%', once: true } }));
      keep('about', gsap.fromTo('.about figure img', { clipPath: 'inset(0 0 100% 0)', scale: 1.15 }, { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.about', start: 'top 85%', once: true } }));
      keep('about', gsap.from('.about .bio p', { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.about .bio', start: 'top 85%', once: true } }));
      keep('about', gsap.from('.about .stats tr, .about .exp li', { x: -24, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.about .stats', start: 'top 85%', once: true } }));
    }));
    spies = FLOW.map(name => [name, 'section[data-view="' + name + '"]'])
      .map(([name, sel]) => ScrollTrigger.create({ trigger: $(sel), start: 'top 55%', end: 'bottom 45%', onToggle: self => { if (self.isActive) setRoute(name); } }));
    ScrollTrigger.refresh();
  }
  hsMQ.addEventListener('change', () => { if (flowOn) buildFlow(); });

  function setNav(h){
    document.documentElement.dataset.route = h;
    $$('#nav a').forEach(a => { if (a.getAttribute('href') === '#'+h) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    document.title = 'Intazar Akash';
  }
  // Scroll changed which part of the flow is on screen: update nav and hash without jumping
  function setRoute(h){
    if (h === currentView || routeLock) return;
    currentView = h; setNav(h); history.replaceState(null, '', '#' + h);
  }
  function jump(h, animate){
    const sec = $('[data-view="' + h + '"]');
    toY(h === 'home' ? 0 : sec.getBoundingClientRect().top + window.scrollY, animate, () => { setRoute(h); if (animate) replay(h); });
  }

  function show(){
    let h = (location.hash || '').slice(1);
    if (!FLOW.includes(h)) h = 'home';
    const wasFlow = flowOn;
    currentView = h; setNav(h);
    $$('[data-view]').forEach(s => s.classList.toggle('on', s.hasAttribute('data-flow')));
    nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false');
    if (h === 'book' && prefill) { $('#b-type').value = prefill; prefill = ''; }
    playHero();
    if (wasFlow) jump(h, true); else requestAnimationFrame(() => {
      buildFlow(); jump(h, false);
      // images and fonts shift the layout after first paint: keep re-aiming until the visitor scrolls
      if (h !== 'home') {
        const reaim = () => requestAnimationFrame(() => jump(h, false));
        const stop = () => ScrollTrigger.removeEventListener('refresh', reaim);
        ScrollTrigger.addEventListener('refresh', reaim);
        ['wheel','touchstart','keydown','pointerdown'].forEach(ev => window.addEventListener(ev, stop, { once: true, passive: true }));
        setTimeout(stop, 6000);
      }
    });
  }
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (a.dataset.prefill) prefill = a.dataset.prefill;
    if (a.getAttribute('href') === location.hash) { e.preventDefault(); show(); }
  });
  window.addEventListener('hashchange', show);
  const top = $('#top');
  window.addEventListener('scroll', () => top.classList.toggle('scrolled', window.scrollY > 8), {passive:true});

  // Lightbox
  const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let set = [], idx = 0;
  function openLb(list, i){ set = list; idx = i; renderLb(); if (lb.showModal) lb.showModal(); else lb.setAttribute('open',''); }
  function renderLb(){ const im = set[idx]; lbImg.src = im.src; lbImg.alt = im.alt; lbCap.textContent = im.dataset.cap || ''; }
  $$('.shot button').forEach(b => b.addEventListener('click', () => {
    const panel = b.closest('[data-panel]');
    const list = $$('.shot img', panel);
    openLb(list, list.indexOf($('img', b)));
  }));
  $('#lbClose').addEventListener('click', () => lb.close());
  $('#lbPrev').addEventListener('click', () => { idx = (idx - 1 + set.length) % set.length; renderLb(); });
  $('#lbNext').addEventListener('click', () => { idx = (idx + 1) % set.length; renderLb(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') $('#lbNext').click(); if (e.key === 'ArrowLeft') $('#lbPrev').click(); });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-in')) lb.close(); });

  // Motion intro film plays only while it is on screen
  const motionBg = $('#motionBg');
  const fxTc = $('#fxTc');
  if (motionBg && fxTc) motionBg.addEventListener('timeupdate', () => { const t = motionBg.currentTime, p = n => String(Math.floor(n)).padStart(2, '0'); fxTc.textContent = p(t / 3600) + ':' + p(t / 60 % 60) + ':' + p(t % 60); });
  if (motionBg && window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(motionBg, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.motion-intro', start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  if (motionBg && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) motionBg.play().catch(() => {}); else motionBg.pause(); }), { threshold: 0.15 }).observe(motionBg);
  }

  // Film cards: each clip plays muted while it is on screen
  $$('.films video').forEach(v => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { v.controls = true; return; }
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.35 }).observe(v);
  });

  // Contacts: cards for every channel set in config.js, plus the brief and comp card
  const cards = $('#contactCards'), foot = $('#footNav');
  const link = (v, base) => /^https?:\/\//i.test(v) ? v : base + v.replace(/^@/, '');
  function addCard(label, text, href, opts = {}){
    const a = document.createElement(href ? 'a' : 'button'); a.className = 'ccard'; if (!href) a.type = 'button';
    if (href) { a.href = href; if (!opts.download && !opts.internal) { a.target = '_blank'; a.rel = 'noopener'; } if (opts.download) a.setAttribute('download', ''); }
    a.innerHTML = '<span class="cc-l"></span><span class="cc-v"></span><i class="cc-a" aria-hidden="true">' + (opts.icon || '\u2197') + '</i>';
    $('.cc-l', a).textContent = label; $('.cc-v', a).textContent = text;
    cards.append(a);
    if (opts.footer) { const f = document.createElement('a'); f.href = href; f.target = '_blank'; f.rel = 'noopener'; f.textContent = label; foot.insertBefore(f, foot.lastElementChild); }
    return a;
  }
  const waNum = (CONFIG.whatsapp || '').replace(/\D/g,'');
  if (waNum) { addCard('WhatsApp', '+' + waNum.replace(/^(880)(\d{4})(\d+)$/, '$1 $2 $3'), 'https://wa.me/' + waNum, { footer: true }); const wa = $('#wa'); wa.href = 'https://wa.me/' + waNum; wa.classList.add('on'); }
  if (CONFIG.email) addCard('Email', CONFIG.email, 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(CONFIG.email), { footer: true });
  if (CONFIG.instagram) addCard('Instagram', '@' + CONFIG.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, ''), link(CONFIG.instagram, 'https://instagram.com/'), { footer: true });
  if (CONFIG.facebook) addCard('Facebook', /^https?:\/\//i.test(CONFIG.facebook) ? 'Facebook page' : CONFIG.facebook, link(CONFIG.facebook, 'https://facebook.com/'), { footer: true });
  const hs = $('#heroSocial');
  if (hs) {
    const hl = [];
    if (waNum) hl.push(['WhatsApp', 'https://wa.me/' + waNum]);
    if (CONFIG.email) hl.push(['Gmail', 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(CONFIG.email)]);
    if (CONFIG.instagram) hl.push(['Instagram', link(CONFIG.instagram, 'https://instagram.com/')]);
    if (CONFIG.facebook) hl.push(['Facebook', link(CONFIG.facebook, 'https://facebook.com/')]);
    hl.forEach(([t, u]) => { const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t; hs.append(a); });
  }
  addCard('Send a brief', 'Booking or casting', '', { icon: '\u2193' }).addEventListener('click', () => toY($('#brief').getBoundingClientRect().top + window.scrollY - 96, true));
  addCard('Comp card', 'Download the PDF', 'assets/Intazar-Akash-CompCard-2026.pdf', { download: true, icon: '\u2193' });

  // Brief form
  const form = $('#brief'), result = $('#result'), briefText = $('#briefText'), sendActions = $('#sendActions');
  function setErr(input, msg){ const e = input.parentElement.querySelector('.err'); if (e) e.textContent = msg; input.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  form.addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    [['#b-name','Enter your name.'],['#b-email','Enter an email address so Akash can reply.'],['#b-type','Choose a project type.'],['#b-dates','Add the dates, even if they are provisional.']].forEach(([sel,msg]) => {
      const el = $(sel); let bad = !el.value.trim();
      if (sel === '#b-email' && !bad && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) { bad = true; msg = 'Check the email address; it looks incomplete.'; }
      setErr(el, bad ? msg : ''); if (bad && !first) first = el;
    });
    if (first) { first.focus(); return; }
    const fd = new FormData(form); const lines = ['Booking enquiry for Intazar Akash', ''];
    for (const [k,v] of fd.entries()) { if (String(v).trim()) lines.push(k + ': ' + String(v).trim()); }
    const text = lines.join('\n');
    briefText.value = text;
    $$('[data-send]', sendActions).forEach(n => n.remove());
    const subject = 'Booking enquiry: ' + fd.get('Project type') + ' (' + fd.get('Dates') + ')';
    let n = 0;
    if (waNum) { const a = document.createElement('a'); a.className = 'btn'; a.dataset.send = ''; a.target = '_blank'; a.rel = 'noopener'; a.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(text); a.textContent = 'Send on WhatsApp'; sendActions.prepend(a); n++; }
    if (CONFIG.email) { const a = document.createElement('a'); a.className = 'btn' + (n ? ' ghost' : ''); a.dataset.send = ''; a.target = '_blank'; a.rel = 'noopener'; a.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(CONFIG.email) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text); a.textContent = 'Send by Gmail'; sendActions.insertBefore(a, $('#copyBrief')); n++; }
    $('#resultNote').textContent = n ? 'Send it using one of the options below. You’ll hear back within 24 hours, Sunday to Thursday.' : 'Copy the brief and send it to Akash directly.';
    result.classList.add('on'); result.focus();
  });
  $$('#brief input, #brief select').forEach(el => el.addEventListener('input', () => setErr(el, '')));
  $('#copyBrief').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(briefText.value); toast('Brief copied'); }
    catch { briefText.select(); toast('Brief selected. Press Ctrl+C or Cmd+C to copy.'); }
  });

  // Toast
  let tt; function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); }

  show();
})();
