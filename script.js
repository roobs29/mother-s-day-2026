/* ═══════════════════════════════════════════════════════════
   FOR YOU,  — A LOVE LETTER
   script.js
   ───────────────────────────────────────────────────────────
   Vanilla JS only. No build step. No external libraries.
   Modules:
     1. Loader
     2. Custom cursor
     3. Reveal-on-scroll (IntersectionObserver)
     4. Scroll progress thread
     5. Hero particles (canvas)
     6. Parallax for frames
     7. Reasons card mouse-follow gradient
     8. Polaroid lightbox
     9. Music toggle (file-first, Web Audio fallback)
    10. Constellation (text-to-particle)
    11. Easter egg
    12. Smooth anchor scroll
   ═══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // Honor reduced motion globally — disables most heavy animations
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── 1 · LOADER ─────────────────────────────────────────
  const loader = document.getElementById('loader');
  const dismissLoader = () => {
    if (!loader) return;
    loader.classList.add('is-done');
    // After fade, remove from DOM to avoid intercepting interactions
    setTimeout(() => loader && loader.remove(), 1400);
    // Trigger initial reveals slightly after
    setTimeout(initialReveal, 200);
  };
  // Wait for fonts and a mini dwell for elegance
  const minLoadTime = prefersReduced ? 200 : 1800;
  const startTime = performance.now();
  const finishLoad = () => {
    const elapsed = performance.now() - startTime;
    setTimeout(dismissLoader, Math.max(0, minLoadTime - elapsed));
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(finishLoad);
  } else {
    window.addEventListener('load', finishLoad);
  }
  // Hard fallback in case fonts hang
  setTimeout(dismissLoader, 5000);


  // ─── 2 · CUSTOM CURSOR ──────────────────────────────────
  const cursor = document.getElementById('cursor');
  const dot = cursor && cursor.querySelector('.cursor__dot');
  const ring = cursor && cursor.querySelector('.cursor__ring');
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let dotX = mouseX, dotY = mouseY;
  let ringX = mouseX, ringY = mouseY;

  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursor && supportsHover) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
    });
    window.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
    });

    const tickCursor = () => {
      // Dot follows almost instantly, ring lags for elegance
      dotX += (mouseX - dotX) * 0.6;
      dotY += (mouseY - dotY) * 0.6;
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      if (dot)  dot.style.transform  = `translate(${dotX}px, ${dotY}px)`;
      if (ring) ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(tickCursor);
    };
    tickCursor();

    // Hover state on interactive elements
    const hoverables = document.querySelectorAll(
      'a, button, [data-cursor="hover"], .polaroid, .reason-card, input, select, textarea'
    );
    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    // Switch cursor color when over dark sections
    const darkSections = document.querySelectorAll('.constellation, .finale, .lightbox.is-open, .secret.is-visible');
    const updateCursorTheme = () => {
      const el = document.elementFromPoint(mouseX, mouseY);
      if (!el) return;
      const inDark = el.closest('.constellation, .finale, .lightbox.is-open, .secret');
      cursor.classList.toggle('is-dark', !!inDark);
    };
    setInterval(updateCursorTheme, 200);
  } else if (cursor) {
    cursor.remove();
  }


  // ─── 3 · REVEAL-ON-SCROLL ───────────────────────────────
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !prefersReduced) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Stagger by index within parent for cards & lines
          const parent = entry.target.parentElement;
          const siblings = Array.from(parent.querySelectorAll('[data-reveal]'));
          const i = Math.max(0, siblings.indexOf(entry.target));
          entry.target.style.transitionDelay = `${Math.min(i * 0.08, 0.6)}s`;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(el => obs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Force reveal of immediately-visible elements right after load
  function initialReveal() {
    revealEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        el.classList.add('is-visible');
      }
    });
  }


  // ─── 4 · SCROLL PROGRESS THREAD ─────────────────────────
  const threadFill = document.getElementById('threadFill');
  const updateThread = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (threadFill) threadFill.style.width = pct + '%';
  };
  window.addEventListener('scroll', updateThread, { passive: true });
  updateThread();


  // ─── 5 · HERO PARTICLES (canvas) ────────────────────────
  const particleCanvas = document.getElementById('particleCanvas');
  if (particleCanvas && !prefersReduced) {
    const ctx = particleCanvas.getContext('2d');
    let W, H, dpr;
    let particles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = particleCanvas.clientWidth;
      H = particleCanvas.clientHeight;
      particleCanvas.width  = W * dpr;
      particleCanvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    // Density scaled down on small screens
    const PARTICLE_COUNT = Math.min(80, Math.floor((W * H) / 22000));

    const make = () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.25 - 0.05,
      a: Math.random() * 0.5 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
    });
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(make());

    let lastT = performance.now();
    const draw = (t) => {
      const dt = Math.min(50, t - lastT) / 16.67; // normalize to 60fps frame
      lastT = t;

      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.twinkle += 0.02 * dt;

        // wrap around
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.twinkle));

        // soft glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `rgba(217, 182, 119, ${alpha})`);
        grad.addColorStop(1, `rgba(217, 182, 119, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();

        // bright core
        ctx.fillStyle = `rgba(254, 240, 210, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }


  // ─── 6 · PARALLAX FOR FRAMES ────────────────────────────
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !prefersReduced) {
    let ticking = false;
    const apply = () => {
      const wh = window.innerHeight;
      parallaxEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - wh / 2) * parseFloat(el.dataset.parallax || '0.05');
        el.style.transform = `translate3d(0, ${-offset}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
    apply();
  }


  // ─── 7 · REASONS CARDS · MOUSE-FOLLOW GRADIENT ──────────
  document.querySelectorAll('.reason-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width)  * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });


  // ─── 8 · POLAROID LIGHTBOX ──────────────────────────────
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lightboxImg');
  const lbCap     = document.getElementById('lightboxCaption');
  const lbClose   = document.getElementById('lightboxClose');

  const openLightbox = (src, caption) => {
    if (!lightbox) return;
    lbImg.src = src;
    lbCap.textContent = caption || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 500);
  };

  document.querySelectorAll('.polaroid').forEach(p => {
    const trigger = () => {
      const img = p.querySelector('img');
      const cap = p.querySelector('.polaroid__caption');
      if (img) openLightbox(img.src, cap ? cap.textContent : '');
    };
    p.addEventListener('click', trigger);
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });


  // ─── 9 · MUSIC TOGGLE ───────────────────────────────────
  /*
    Strategy:
    - Try the audio file first (assets/audio/ambient.mp3).
    - If it can't play (missing/corrupt), gracefully fall back to a
      Web Audio API ambient drone — a slow warm pad.
  */
  const musicBtn = document.getElementById('musicToggle');
  const audioEl  = document.getElementById('ambientAudio');
  let isPlaying = false;
  let audioCtx, masterGain, oscNodes = [];
  let usingFallback = false;

  const buildSynth = () => {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);

    // Soft low-pass for warmth
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    filter.connect(masterGain);

    // Slow LFO modulating filter cutoff for breathing
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // Three soft sine oscillators — A2, E3, A3 (perfect fifth + octave)
    [110, 164.81, 220].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const og = audioCtx.createGain();
      og.gain.value = i === 0 ? 0.12 : (i === 1 ? 0.07 : 0.05);
      osc.connect(og).connect(filter);
      osc.start();

      // Slight detune drift
      const drift = audioCtx.createOscillator();
      drift.frequency.value = 0.05 + i * 0.02;
      const dg = audioCtx.createGain();
      dg.gain.value = 0.5;
      drift.connect(dg).connect(osc.detune);
      drift.start();

      oscNodes.push(osc, drift);
    });
  };

  const fadeMaster = (target, duration) => {
    if (!masterGain) return;
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(target, now + duration);
  };

  const startFallback = () => {
    buildSynth();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    fadeMaster(0.35, 1.2);
    usingFallback = true;
  };
  const stopFallback = () => {
    if (!audioCtx) return;
    fadeMaster(0, 1.0);
  };

  const playMusic = () => {
    if (!audioEl) return Promise.reject();
    audioEl.volume = 0;
    const playPromise = audioEl.play();
    if (playPromise && playPromise.then) {
      return playPromise.then(() => {
        // fade in
        let v = 0;
        const fade = setInterval(() => {
          v = Math.min(0.6, v + 0.04);
          audioEl.volume = v;
          if (v >= 0.6) clearInterval(fade);
        }, 40);
      });
    }
    return Promise.resolve();
  };
  const stopMusic = () => {
    if (!audioEl) return;
    let v = audioEl.volume;
    const fade = setInterval(() => {
      v = Math.max(0, v - 0.05);
      audioEl.volume = v;
      if (v <= 0) { audioEl.pause(); clearInterval(fade); }
    }, 40);
  };

  if (musicBtn) {
    musicBtn.addEventListener('click', async () => {
      isPlaying = !isPlaying;
      musicBtn.classList.toggle('is-playing', isPlaying);

      if (isPlaying) {
        // Try audio file first
        try {
          await playMusic();
          usingFallback = false;
        } catch (err) {
          // Fallback to Web Audio ambient pad
          startFallback();
        }
      } else {
        if (usingFallback) stopFallback();
        else stopMusic();
      }
    });
  }


  // ─── 10 · CONSTELLATION (text-to-particle) ──────────────
  const cCanvas = document.getElementById('constellationCanvas');
  const cBtn    = document.getElementById('constellationBtn');
  const cHint   = document.getElementById('constellationHint');

  if (cCanvas) {
    const cctx = cCanvas.getContext('2d');
    let cW, cH, cdpr;
    let stars = [];
    let phase = 'drift'; // 'drift' → 'forming' → 'settled'
    let formProgress = 0;

    const messageLines = ['I LOVE YOU', 'AMMA'];

    const cResize = () => {
      cdpr = Math.min(window.devicePixelRatio || 1, 2);
      cW = cCanvas.clientWidth;
      cH = cCanvas.clientHeight;
      cCanvas.width  = cW * cdpr;
      cCanvas.height = cH * cdpr;
      cctx.setTransform(cdpr, 0, 0, cdpr, 0, 0);

      // If already settled, recompute targets
      if (phase !== 'drift' && stars.length) computeTargets();
    };
    window.addEventListener('resize', cResize);
    cResize();

    // Build initial drifting starfield
    const initStars = () => {
      stars = [];
      const count = Math.min(420, Math.max(220, Math.floor((cW * cH) / 1800)));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * cW,
          y: Math.random() * cH,
          tx: 0, ty: 0,
          r: Math.random() * 1.4 + 0.3,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          a: Math.random() * 0.6 + 0.3,
          twinkle: Math.random() * Math.PI * 2,
          assigned: false,
        });
      }
    };
    initStars();

    // Sample text pixels to find target positions
    const computeTargets = () => {
      const off = document.createElement('canvas');
      off.width = cW; off.height = cH;
      const ox = off.getContext('2d');
      ox.fillStyle = '#ffffff';

      // Choose a font size that fits comfortably
      const fontSize = Math.min(cW / 8, cH / 4);
      ox.font = `400 ${fontSize}px "Cormorant Garamond", "Times New Roman", serif`;
      ox.textAlign = 'center';
      ox.textBaseline = 'middle';

      const lineHeight = fontSize * 1.05;
      const totalH = lineHeight * messageLines.length;
      const startY = cH / 2 - totalH / 2 + lineHeight / 2;
      messageLines.forEach((line, i) => {
        ox.fillText(line, cW / 2, startY + i * lineHeight);
      });

      const data = ox.getImageData(0, 0, cW, cH).data;
      const targets = [];
      // Sample every K pixels
      const step = Math.max(3, Math.floor(cW / 200));
      for (let y = 0; y < cH; y += step) {
        for (let x = 0; x < cW; x += step) {
          const idx = (y * cW + x) * 4;
          if (data[idx + 3] > 128) {
            targets.push([x + (Math.random()-0.5)*1.5, y + (Math.random()-0.5)*1.5]);
          }
        }
      }

      // Shuffle for organic distribution
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }

      // Make sure we have enough stars to cover targets — add if needed
      while (stars.length < targets.length) {
        stars.push({
          x: Math.random() * cW, y: Math.random() * cH,
          tx: 0, ty: 0,
          r: Math.random() * 1.4 + 0.3,
          vx: 0, vy: 0,
          a: Math.random() * 0.6 + 0.3,
          twinkle: Math.random() * Math.PI * 2,
          assigned: false,
        });
      }

      // Assign targets to first N stars; the rest become "background drift"
      stars.forEach((s, i) => {
        if (i < targets.length) {
          s.tx = targets[i][0];
          s.ty = targets[i][1];
          s.assigned = true;
          s.r = Math.random() * 1.6 + 0.6;
        } else {
          s.assigned = false;
          s.r = Math.random() * 1.0 + 0.2;
          s.a *= 0.6;
        }
      });
    };

    const cTick = (t) => {
      cctx.clearRect(0, 0, cW, cH);

      // Subtle nebula glow at center
      const neb = cctx.createRadialGradient(cW/2, cH/2, 0, cW/2, cH/2, Math.max(cW, cH) * 0.6);
      neb.addColorStop(0, 'rgba(217, 182, 119, 0.04)');
      neb.addColorStop(1, 'rgba(217, 182, 119, 0)');
      cctx.fillStyle = neb;
      cctx.fillRect(0, 0, cW, cH);

      for (const s of stars) {
        s.twinkle += 0.02;

        if (phase === 'drift' || !s.assigned) {
          // gentle wandering
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x += cW;
          if (s.x > cW) s.x -= cW;
          if (s.y < 0) s.y += cH;
          if (s.y > cH) s.y -= cH;
        } else {
          // ease toward target
          const k = phase === 'forming' ? 0.06 : 0.08;
          s.x += (s.tx - s.x) * k;
          s.y += (s.ty - s.y) * k;
          // breathing once settled
          if (phase === 'settled') {
            s.x += Math.sin(s.twinkle * 0.5) * 0.06;
            s.y += Math.cos(s.twinkle * 0.5) * 0.06;
          }
        }

        const alpha = s.a * (0.55 + 0.45 * Math.sin(s.twinkle));

        // glow halo for assigned stars
        if (s.assigned && phase !== 'drift') {
          const grad = cctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 8);
          grad.addColorStop(0, `rgba(255, 230, 180, ${alpha * 0.6})`);
          grad.addColorStop(1, `rgba(255, 230, 180, 0)`);
          cctx.fillStyle = grad;
          cctx.beginPath();
          cctx.arc(s.x, s.y, s.r * 8, 0, Math.PI * 2);
          cctx.fill();
        }

        cctx.fillStyle = s.assigned && phase !== 'drift'
          ? `rgba(255, 244, 220, ${alpha})`
          : `rgba(217, 182, 119, ${alpha * 0.7})`;
        cctx.beginPath();
        cctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        cctx.fill();
      }

      if (phase === 'forming') {
        formProgress++;
        if (formProgress > 120) phase = 'settled';
      }

      requestAnimationFrame(cTick);
    };
    requestAnimationFrame(cTick);

    if (cBtn) {
      cBtn.addEventListener('click', () => {
        if (prefersReduced) {
          // Just show the hint text in reduced motion mode
          if (cHint) {
            cHint.textContent = 'I love you, Amma.';
            cHint.classList.add('is-visible');
          }
          cBtn.classList.add('is-hidden');
          return;
        }
        computeTargets();
        phase = 'forming';
        formProgress = 0;
        cBtn.classList.add('is-hidden');
        if (cHint) {
          setTimeout(() => {
            cHint.textContent = '— always.';
            cHint.classList.add('is-visible');
          }, 1800);
        }
      });
    }
  }


  // ─── 11 · EASTER EGG (press M) ──────────────────────────
  const secret = document.getElementById('secret');
  const easterEgg = document.getElementById('easterEgg');
  let secretTimer = null;
  const showSecret = () => {
    if (!secret) return;
    secret.classList.add('is-visible');
    secret.setAttribute('aria-hidden', 'false');
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => {
      secret.classList.remove('is-visible');
      secret.setAttribute('aria-hidden', 'true');
    }, 3500);
  };
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') &&
        !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      showSecret();
    }
  });
  if (easterEgg) easterEgg.addEventListener('click', showSecret);


  // ─── 12 · SMOOTH ANCHOR SCROLL ──────────────────────────
  // Native CSS handles this; ensure the anchor click respects prefers-reduced
  document.querySelectorAll('[data-scroll-to], a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({
        top,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    });
  });


  // ─── BONUS: Year in footer ─────────────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  // ─── BONUS: Image error fallback ───────────────────────
  // If a placeholder image fails to load, swap to a soft gradient panel
  // so the layout never breaks visually.
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = 'linear-gradient(135deg, #f3c8a8, #d9b677, #c8b8d8)';
      img.style.opacity = '0.6';
      img.removeAttribute('src');
    }, { once: true });
  });

})();
