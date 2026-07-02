/* =========================================================
   MAREA — landing
   Módulos: capabilities · header · reveal · mira (hscroll+parallax)
            · crea (deck drag) · quotes · mostra (hscroll: texto + 6 obras) · newsletter
            · cursor (circle-follow nativo)
   (aprendé: hover/focus-within puro en CSS, sin JS)
   ========================================================= */
(() => {
  "use strict";

  /* ---------- capabilities ---------- */
  const caps = { hijack: false, hoverFine: false, reducedMotion: false };

  function readCaps() {
    caps.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    caps.hoverFine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    // hijack en todos los dispositivos (desktop + touch/mobile): el scroll
    // vertical mueve los paneles horizontalmente. Solo se desactiva con
    // reduced-motion (cae a scroll horizontal nativo). hoverFine queda separado
    // y gobierna SOLO el cursor custom (sigue apagado en mobile).
    caps.hijack = !caps.reducedMotion;
  }
  readCaps();

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.remove("is-loading");

    initHeader();
    initHeroParallax();
    initReveal();
    initMira();
    initCrea();
    initQuotes();
    initMostraHscroll();
    initNewsletter();
    initCursor();
    initColorExplorer();
    initAuthorExplorer();
    initYearExplorer();
    initOverlayGlobals();

    window.addEventListener("resize", debounce(() => {
      readCaps();
      refreshMira();
      refreshMostra();
      cursor?.refresh();
    }, 200));
  });

  /* ---------- header ---------- */
  function initHeader() {
    const header = document.querySelector("[data-header]");
    const sentinel = document.querySelector("[data-header-sentinel]");
    if (header && sentinel && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        header.classList.toggle("site-header--scrolled", !entry.isIntersecting);
      }).observe(sentinel);
    }

    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-mobile-nav]");
    if (!toggle || !nav) return;

    const close = () => { toggle.setAttribute("aria-expanded", "false"); nav.hidden = true; };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ---------- hero: watermark reactivo al cursor ---------- */
  function initHeroParallax() {
    const hero = document.querySelector("[data-hero]");
    const watermark = document.querySelector("[data-watermark]");
    if (!hero || !watermark) return;
    hero.addEventListener("pointermove", (e) => {
      if (!caps.hoverFine) return;
      const rect = hero.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      watermark.style.setProperty("--wm-x", `${(px * 90).toFixed(1)}px`);
      watermark.style.setProperty("--wm-y", `${(py * 70).toFixed(1)}px`);
    });
    hero.addEventListener("pointerleave", () => {
      watermark.style.setProperty("--wm-x", "0px");
      watermark.style.setProperty("--wm-y", "0px");
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((t) => obs.observe(t));
  }

  /* ---------- 01 Mirá: hijack horizontal + parallax + barra superior ---------- */
  let mira = null;

  function initMira() {
    const hscroll = document.querySelector("[data-hscroll]");
    const track = document.querySelector("[data-hscroll-track]");
    if (!hscroll || !track) return;
    // allPanels = todos los [data-panel] del DOM; panels = solo los visibles (algunos
    // existen solo en una resolución, p.ej. el slide "Arte, ciencia..." solo-mobile).
    // panels se recalcula en refreshMira según display, para que el conteo del hijack
    // (alto = N×100vh) coincida con los paneles realmente renderizados.
    const allPanels = Array.from(track.querySelectorAll("[data-panel]"));
    const bar = document.querySelector("[data-hscroll-nav]");
    const indexEl = document.querySelector("[data-hscroll-index]");
    const eraTabs = Array.from(document.querySelectorAll(".mira-bar__tab"));
    const barrocoImg = document.querySelector("[data-parallax]");

    mira = { hscroll, track, allPanels, panels: allPanels, bar, indexEl, eraTabs, barrocoImg, start: 0, total: 0 };

    document.querySelectorAll("[data-hscroll-nav] [data-target]").forEach((btn) => {
      btn.addEventListener("click", () => { goToPanel(btn.dataset.target); closeEraTabs(); });
    });

    document.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => goToPanel(btn.dataset.goto));
    });

    eraTabs.forEach((tab) => {
      const toggle = tab.querySelector("[data-bar-toggle]");
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !tab.classList.contains("is-open");
        closeEraTabs();
        if (willOpen) {
          tab.classList.add("is-open");
          tab.querySelector(".mira-bar__dropdown")?.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
        }
      });
    });
    document.addEventListener("click", closeEraTabs);

    // flip de las cards del intro: en desktop es por hover (CSS); en touch (sin
    // hover) lo hacemos por tap, togglear .is-flipped. Solo cuando NO hay hover
    // fino, para no interferir con el hover del desktop.
    if (!caps.hoverFine) {
      track.querySelectorAll(".mira-intro__card-inner").forEach((inner) => {
        const card = inner.closest(".mira-intro__card");
        card.addEventListener("click", () => card.classList.toggle("is-flipped"));
      });
    }

    window.addEventListener("scroll", onMiraScroll, { passive: true });
    track.addEventListener("scroll", onTrackScroll, { passive: true });
    refreshMira();
  }

  function closeEraTabs() {
    mira?.eraTabs.forEach((tab) => {
      tab.classList.remove("is-open");
      tab.querySelector(".mira-bar__dropdown")?.classList.remove("is-open");
      tab.querySelector("[data-bar-toggle]")?.setAttribute("aria-expanded", "false");
    });
  }

  function refreshMira() {
    if (!mira) return;
    // recalcular paneles visibles (los solo-mobile/solo-desktop entran/salen según display)
    mira.panels = mira.allPanels.filter((p) => getComputedStyle(p).display !== "none");
    const wasHijack = mira.hscroll.dataset.hscrollMode === "hijack";
    if (caps.hijack) {
      mira.hscroll.dataset.hscrollMode = "hijack";
      mira.hscroll.style.height = `${mira.panels.length * 100}vh`;
      const rect = mira.hscroll.getBoundingClientRect();
      mira.start = window.scrollY + rect.top;
      mira.total = mira.hscroll.offsetHeight - window.innerHeight;
      if (!wasHijack) mira.track.scrollLeft = 0;
      updateMiraProgress(0);
    } else {
      delete mira.hscroll.dataset.hscrollMode;
      mira.hscroll.style.height = "";
      mira.track.scrollLeft = 0;
      mira.barrocoImg && (mira.barrocoImg.style.transform = "");
      updateMiraProgress(0);
    }
  }

  function onMiraScroll() {
    if (!mira || mira.hscroll.dataset.hscrollMode !== "hijack") return;
    const progress = clamp((window.scrollY - mira.start) / mira.total, 0, 1);
    mira.track.scrollLeft = progress * (mira.track.scrollWidth - mira.track.clientWidth);
    updateMiraProgress(progress);
  }

  function onTrackScroll() {
    if (!mira || mira.hscroll.dataset.hscrollMode === "hijack") return;
    const maxScroll = mira.track.scrollWidth - mira.track.clientWidth;
    const progress = maxScroll > 0 ? mira.track.scrollLeft / maxScroll : 0;
    updateMiraProgress(progress);
  }

  function updateMiraProgress(progress) {
    if (!mira || mira.total < 0) return;
    const idx = clamp(Math.round(progress * (mira.panels.length - 1)), 0, mira.panels.length - 1);
    const activePanel = mira.panels[idx];
    const era = activePanel?.dataset.panel === "barroco" || activePanel?.dataset.panel === "espectaculo" ? "barroco" : "renacimiento";

    if (mira.indexEl) mira.indexEl.textContent = activePanel?.dataset.index || "";
    mira.bar?.classList.toggle("mira-bar--no-tabs", activePanel?.dataset.panel === "intro");
    mira.eraTabs.forEach((tab) => {
      const isCurrent = tab.dataset.era === era;
      tab.classList.toggle("is-current", isCurrent);
      tab.querySelector("[data-bar-toggle]")?.setAttribute("aria-current", String(isCurrent));
    });

    if (mira.barrocoImg) {
      const barrocoIdx = mira.panels.findIndex((p) => p.dataset.panel === "barroco");
      const step = 1 / (mira.panels.length - 1);
      const local = clamp((progress - (barrocoIdx - 0.5) * step) / step, 0, 1);
      mira.barrocoImg.style.transform = `translateY(${(local - 0.5) * 220}px)`;
    }
  }

  function goToPanel(target) {
    if (!mira) return;
    const idx = mira.panels.findIndex((p) => p.dataset.panel === target);
    if (idx === -1) return;
    if (mira.hscroll.dataset.hscrollMode === "hijack") {
      const ratio = idx / (mira.panels.length - 1);
      window.scrollTo({ top: mira.start + ratio * mira.total, behavior: caps.reducedMotion ? "auto" : "smooth" });
    } else {
      mira.panels[idx].scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth", inline: "start", block: "nearest" });
    }
  }

  /* ---------- 02 Creá: cards en fila, scroll horizontal con snap ---------- */
  function initCrea() {
    const deck = document.querySelector("[data-crea-deck]");
    if (!deck) return;
    const list = deck.querySelector(".crea-deck__list");
    const cards = Array.from(list.querySelectorAll(".crea-card"));
    const monthLabel = document.querySelector("[data-crea-month-label]");
    const prevBtn = document.querySelector("[data-crea-prev]");
    const nextBtn = document.querySelector("[data-crea-next]");
    let active = 0;
    let drag = null;

    const step = () => (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0) || 1;

    function render() {
      if (monthLabel) monthLabel.textContent = cards[active].dataset.month;
      prevBtn && (prevBtn.disabled = active === 0);
      nextBtn && (nextBtn.disabled = active === cards.length - 1);
    }

    function syncActiveFromScroll() {
      const maxScroll = list.scrollWidth - list.clientWidth;
      active = list.scrollLeft >= maxScroll - 1
        ? cards.length - 1
        : clamp(Math.round(list.scrollLeft / step()), 0, cards.length - 1);
      render();
    }

    function go(delta) {
      active = clamp(active + delta, 0, cards.length - 1);
      list.scrollTo({ left: cards[active].offsetLeft, behavior: "smooth" });
      render();
    }

    prevBtn?.addEventListener("click", () => go(-1));
    nextBtn?.addEventListener("click", () => go(1));

    list.addEventListener("scroll", syncActiveFromScroll);

    // arrastre con mouse; touch usa el scroll nativo con snap
    list.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      drag = { startX: e.clientX, startScroll: list.scrollLeft };
      list.classList.add("is-dragging");
      list.setPointerCapture(e.pointerId);
    });
    list.addEventListener("pointermove", (e) => {
      if (!drag) return;
      list.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
    });
    const stopDrag = () => {
      if (!drag) return;
      drag = null;
      list.classList.remove("is-dragging");
      syncActiveFromScroll();
      list.scrollTo({ left: cards[active].offsetLeft, behavior: "smooth" });
    };
    list.addEventListener("pointerup", stopDrag);
    list.addEventListener("pointercancel", stopDrag);

    render();
  }

  /* ---------- Frases: carrusel en capas ---------- */
  function initQuotes() {
    const section = document.querySelector("[data-quotes]");
    if (!section) return;
    const slides = Array.from(section.querySelectorAll(".quotes__slide"));
    const tabs = Array.from(section.querySelectorAll("[data-quotes-tabs] .quotes__tab"));
    const prevBtn = section.querySelector("[data-go-prev]");
    const nextBtns = section.querySelectorAll("[data-go-next]");

    const data = slides.map((slide) => ({
      bg: slide.style.getPropertyValue("--slide-bg"),
      fg: slide.style.getPropertyValue("--slide-fg"),
      accent: slide.style.getPropertyValue("--slide-accent"),
      author: slide.querySelector(".quotes__author")?.textContent.trim() || "",
    }));

    let current = 0;
    const n = slides.length;

    // texto real (accesible, en .sr-only) tipeado letra por letra en la copia aria-hidden
    function typeQuote(slide) {
      const typed = slide.querySelector(".quotes__quote-typed");
      const full = slide.querySelector(".quotes__quote .sr-only")?.textContent || "";
      if (!typed) return;
      clearInterval(typed._typingTimer);
      if (caps.reducedMotion) { typed.textContent = full; typed.classList.remove("is-typing"); return; }
      typed.textContent = "";
      typed.classList.add("is-typing");
      let i = 0;
      typed._typingTimer = setInterval(() => {
        i++;
        typed.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(typed._typingTimer); typed.classList.remove("is-typing"); }
      }, 28);
    }

    function render() {
      slides.forEach((slide, i) => {
        const rel = (i - current + n) % n;
        slide.dataset.pos = rel === 0 ? "active" : rel === 1 ? "next" : "prev";
      });
      tabs.forEach((tab, i) => {
        const d = data[(current + i + 1) % n];
        tab.textContent = d.author;
        tab.style.setProperty("--tab-bg", d.bg);
        tab.style.setProperty("--tab-fg", d.fg);
      });
      section.style.setProperty("--slide-fg", data[current].fg);
      section.style.setProperty("--slide-accent", data[current].accent);
      typeQuote(slides[current]);
    }

    function go(delta) { current = (current + delta + n) % n; render(); }

    prevBtn?.addEventListener("click", () => go(-1));
    nextBtns.forEach((btn) => btn.addEventListener("click", () => go(1)));
    tabs.forEach((tab, i) => tab.addEventListener("click", () => go(i + 1)));

    render();
  }

  /* ---------- 03 Mostrá: hijack horizontal (mismo mecanismo que Mirá) ----------
     Toda la sección (texto + 6 obras, 7 paneles) se mueve como una sola unidad
     al scrollear, no solo la galería. En touch/mobile cae a scroll nativo. */
  let mostra = null;

  function initMostraHscroll() {
    const hscroll = document.querySelector("[data-mostra-hscroll]");
    const track = document.querySelector("[data-mostra-track]");
    if (!hscroll || !track) return;
    const panels = Array.from(track.querySelectorAll("[data-mpanel]"));
    // una imagen (o bloque de color) de parallax por panel; los paneles sin
    // .mostra-panel__media (el de texto) quedan en null y se ignoran
    const media = panels.map((p) => p.querySelector(".mostra-panel__media img, .mostra-panel__media .mostra__obra-card-cover"));

    mostra = { hscroll, track, panels, media, start: 0, total: 0 };

    document.querySelectorAll("[data-mostra-goto]").forEach((btn) => {
      btn.addEventListener("click", () => goToMostraPanel(btn.dataset.mostraGoto));
    });

    window.addEventListener("scroll", onMostraScroll, { passive: true });
    track.addEventListener("scroll", onMostraTrackScroll, { passive: true });
    refreshMostra();
  }

  function refreshMostra() {
    if (!mostra) return;
    const wasHijack = mostra.hscroll.dataset.hscrollMode === "hijack";
    if (caps.hijack) {
      mostra.hscroll.dataset.hscrollMode = "hijack";
      mostra.hscroll.style.height = `${mostra.panels.length * 100}vh`;
      const rect = mostra.hscroll.getBoundingClientRect();
      mostra.start = window.scrollY + rect.top;
      mostra.total = mostra.hscroll.offsetHeight - window.innerHeight;
      if (!wasHijack) mostra.track.scrollLeft = 0;
      updateMostraParallax(0);
    } else {
      delete mostra.hscroll.dataset.hscrollMode;
      mostra.hscroll.style.height = "";
      mostra.track.scrollLeft = 0;
      updateMostraParallax(0);
    }
  }

  function onMostraScroll() {
    if (!mostra || mostra.hscroll.dataset.hscrollMode !== "hijack") return;
    const progress = clamp((window.scrollY - mostra.start) / mostra.total, 0, 1);
    mostra.track.scrollLeft = progress * (mostra.track.scrollWidth - mostra.track.clientWidth);
    updateMostraParallax(progress);
  }

  function onMostraTrackScroll() {
    if (!mostra || mostra.hscroll.dataset.hscrollMode === "hijack") return;
    const maxScroll = mostra.track.scrollWidth - mostra.track.clientWidth;
    const progress = maxScroll > 0 ? mostra.track.scrollLeft / maxScroll : 0;
    updateMostraParallax(progress);
  }

  // parallax vertical: cada imagen se desplaza dentro de su propia "ventana" de
  // scroll (medio paso antes/después de que su panel quede centrado), igual que
  // el parallax del panel Barroco en Mirá, pero generalizado a los 6 paneles.
  function updateMostraParallax(progress) {
    if (!mostra) return;
    const n = mostra.panels.length;
    const step = 1 / (n - 1);
    mostra.media.forEach((el, i) => {
      if (!el) return;
      const local = clamp((progress - (i - 0.5) * step) / step, 0, 1);
      el.style.transform = `translateY(${(local - 0.5) * 70}px)`;
    });
  }

  function goToMostraPanel(target) {
    if (!mostra) return;
    const idx = mostra.panels.findIndex((p) => p.dataset.mpanel === target);
    if (idx === -1) return;
    if (mostra.hscroll.dataset.hscrollMode === "hijack") {
      const ratio = idx / (mostra.panels.length - 1);
      window.scrollTo({ top: mostra.start + ratio * mostra.total, behavior: caps.reducedMotion ? "auto" : "smooth" });
    } else {
      mostra.panels[idx].scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth", inline: "start", block: "nearest" });
    }
  }

  /* ---------- Cursor personalizado: circle-follow nativo (sin GSAP) ---------- */
  let cursor = null;
  // el círculo se agranda SOLO sobre texto — no sobre botones, links ni imágenes.
  const CURSOR_TEXT = "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, em, strong, [class*='text-'], .eyebrow, .hero";
  const CURSOR_BTN = "a, button, .btn, .cta, .link-cta, [role='button'], .hero ";
  const CURSOR_NOGROW = "a, button, input, textarea, label, img, picture, svg, .btn, .cta, .link-cta, [role='button'],";
  function isTextTarget(el) {
    return !!(el && el.closest && el.closest(CURSOR_TEXT) && !el.closest(CURSOR_NOGROW));
  }
  function isButtonTarget(el) {
    return !!(el && el.closest && el.closest(CURSOR_BTN));
  }
  // sobre fotos el cursor usa una lente duotono (no inversión); el resto del
  // tiempo es un solo círculo blanco con mix-blend-mode:difference, que invierte
  // el fondo (texto legible sobre cualquier superficie). Ver CSS .cursor__base.
  function isPhotoTarget(el) {
    return !!el?.closest?.("img, picture");
  }

  function initCursor() {
    const root = document.querySelector("[data-cursor]");
    if (!root) return;
    const ball = root.querySelector("[data-cursor-ball]");

    const s = {
      on: false, raf: null, visible: false,
      tx: innerWidth / 2, ty: innerHeight / 2,
      bx: innerWidth / 2, by: innerHeight / 2,
      scale: 1, targetScale: 1,
    };

    function onMove(e) {
      s.tx = e.clientX; s.ty = e.clientY;
      if (!s.visible) {
        // al aparecer, saltar exacto a la posición del cursor (no volar desde una
        // posición inicial vieja/0 si la página cargó con innerWidth aún sin medir)
        s.bx = s.tx; s.by = s.ty;
        s.visible = true;
        root.classList.add("is-visible");
      }
    }
    // estado del cursor según lo que tiene debajo:
    //   foto   → lente duotono (is-photo)
    //   botón  → sin inversión + leve agrandado (is-plain)
    //   texto  → agrandado mayor, manteniendo la inversión por defecto (is-hovering)
    //   resto  → círculo de inversión normal
    function applyState(el) {
      const photo = isPhotoTarget(el);
      const button = !photo && isButtonTarget(el);
      const text = !photo && !button && isTextTarget(el);
      root.classList.toggle("is-photo", photo);
      root.classList.toggle("is-plain", button);
      root.classList.toggle("is-hovering", text);
      s.targetScale = text ? 1.5 : button ? 1.25 : 1;
    }
    function onLeave() {
      s.visible = false;
      root.classList.remove("is-visible", "is-photo", "is-plain", "is-hovering");
      s.targetScale = 1;
    }
    function onOver(e) {
      applyState(e.target); // recomputa el estado al entrar a cada elemento
    }
    function onOut() {}

    // loop: la bola sigue al mouse con retardo (lerp) y el escalado en hover se
    // anima en el mismo transform (sin transition CSS, que laggearía el seguimiento)
    function tick() {
      s.bx += (s.tx - s.bx) * 0.18; s.by += (s.ty - s.by) * 0.18;
      s.scale += (s.targetScale - s.scale) * 0.2;
      ball.style.transform = `translate3d(${s.bx.toFixed(2)}px, ${s.by.toFixed(2)}px, 0) scale(${s.scale.toFixed(3)})`;
      s.raf = requestAnimationFrame(tick);
    }

    function activate() {
      if (s.on) return;
      s.on = true;
      document.body.classList.add("is-cursor-custom");
      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);
      document.addEventListener("pointerover", onOver, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      s.raf = requestAnimationFrame(tick);
    }
    function deactivate() {
      if (!s.on) return;
      s.on = false;
      document.body.classList.remove("is-cursor-custom");
      root.classList.remove("is-visible", "is-hovering", "is-photo");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = null;
    }

    cursor = { refresh: () => (caps.hoverFine && !caps.reducedMotion ? activate() : deactivate()) };
    cursor.refresh();
  }

  /* ---------- Newsletter ---------- */
  function initNewsletter() {
    const form = document.querySelector("[data-newsletter-form]");
    if (!form) return;
    const input = form.querySelector("input[type=email]");
    const button = form.querySelector("button");
    const originalLabel = button.innerHTML;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!input.checkValidity()) { input.reportValidity(); return; }
      button.disabled = true;
      button.textContent = "¡Listo! ✓";
      setTimeout(() => {
        input.value = "";
        button.disabled = false;
        button.innerHTML = originalLabel;
      }, 2400);
    });
  }

  /* ---------- Overlays de subpágina (genérico) ----------
     Maneja apertura/cierre y foco de las subpáginas Aprendé (por color / por autor).
     z-index por debajo del header → el nav del index queda visible y operativo. */
  const _overlays = [];
  function registerOverlay(overlay, openSelector) {
    const closeBtn = overlay.querySelector("[data-overlay-close]");
    let lastTrigger = null;
    function open(trigger) {
      lastTrigger = trigger || null;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("overlay-open");
      // diferir el foco: el overlay recién pasa de visibility:hidden a visible
      setTimeout(() => (closeBtn || overlay).focus(), 60);
    }
    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      if (!_overlays.some((o) => o.isOpen())) document.body.classList.remove("overlay-open");
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    }
    const isOpen = () => overlay.classList.contains("is-open");
    document.querySelectorAll(openSelector).forEach((trigger) => {
      trigger.addEventListener("click", (e) => { e.preventDefault(); open(trigger); });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(trigger); }
      });
    });
    closeBtn && closeBtn.addEventListener("click", close);
    const api = { open, close, isOpen };
    _overlays.push(api);
    return api;
  }
  function initOverlayGlobals() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") _overlays.forEach((o) => o.isOpen() && o.close());
    });
    // los links del nav cierran cualquier overlay abierto para que la navegación funcione
    document.querySelectorAll(".site-header a[href^='#'], .mobile-nav a[href^='#']").forEach((a) => {
      a.addEventListener("click", () => _overlays.forEach((o) => o.isOpen() && o.close()));
    });
  }

  /* ---------- Aprendé por color (overlay con rueda cromática) ----------
     Se abre desde la banda "Por color". Al elegir un color carga una obra al azar
     de img/por color/<CARPETA>/ con crossfade y muestra su ficha (autor, año,
     título, descripción). Metadatos editables abajo (algunos son aproximados). */
  function initColorExplorer() {
    const overlay = document.querySelector("[data-porcolor]");
    if (!overlay) return;

    // dir = carpeta; obras = [{ file, titulo, autor, anio, desc }]
    const COLORS = {
      amarillo: { name: "Amarillo", dir: "AMARILLO", obras: [
        { file: "Gloria Ballestrin, Codo amarillo , 2020. Escultura, Madera sobre madera (1).jpg", titulo: "Codo amarillo", autor: "Gloria Ballestrin", anio: "2020", desc: "Escultura realizada en madera sobre madera." },
        { file: "Infinity Mirror Room (1).jpg", titulo: "Infinity Mirror Room", autor: "Yayoi Kusama", anio: "", desc: "Instalación inmersiva de espejos y luces repetidas al infinito." },
        { file: "Norris Yim, Nameless (1).jpg", titulo: "Nameless", autor: "Norris Yim", anio: "", desc: "Retrato contemporáneo de atmósfera introspectiva." },
        { file: "images (12) (1).jpg", titulo: "Composición en amarillo", autor: "", anio: "", desc: "Obra seleccionada por su uso protagónico del amarillo." },
      ]},
      azul: { name: "Azul", dir: "AZUL", obras: [
        { file: "A Bigger Splash (1).jpg", titulo: "A Bigger Splash", autor: "David Hockney", anio: "1967", desc: "Una piscina californiana y el instante exacto del salto." },
        { file: "La gran ola de Kanagawa (1).jpg", titulo: "La gran ola de Kanagawa", autor: "Katsushika Hokusai", anio: "c. 1831", desc: "Estampa ukiyo-e con la ola gigante frente al monte Fuji." },
        { file: "The Physical Impossibility of Death in the Mind of Someone Living (1).jpg", titulo: "The Physical Impossibility of Death in the Mind of Someone Living", autor: "Damien Hirst", anio: "1991", desc: "Un tiburón conservado en formol, ícono del Young British Art." },
        { file: "koons-the-balloon-animal-editions-1995-2023-a-composition-gallery-102-1730997475-99478_345x345 (1).jpeg", titulo: "Balloon Dog", autor: "Jeff Koons", anio: "", desc: "Escultura de acero inoxidable pulido con forma de globo." },
      ]},
      marron: { name: "Marrón", dir: "MARRON", obras: [
        { file: "Autumn Lake, New Hampshire - Edward W Nichols (1).jpg", titulo: "Autumn Lake, New Hampshire", autor: "Edward W. Nichols", anio: "", desc: "Paisaje otoñal en la tradición de la Escuela del río Hudson." },
        { file: "Battersea Reach - James McNeill Whistler (1).jpg", titulo: "Battersea Reach", autor: "James McNeill Whistler", anio: "", desc: "Vista del Támesis en una gama de tonos sobrios." },
      ]},
      rojo: { name: "Rojo", dir: "ROJO", obras: [
        { file: "Zdzisław Beksiński (1).jpg", titulo: "Sin título", autor: "Zdzisław Beksiński", anio: "", desc: "Surrealismo distópico: atmósferas oníricas y desoladas." },
        { file: "Zdzisław Beksiński 02 (1).jpg", titulo: "Sin título", autor: "Zdzisław Beksiński", anio: "", desc: "Mundos imaginarios y arquitecturas imposibles." },
      ]},
      rosa: { name: "Rosa", dir: "ROSA", obras: [
        { file: "BALLON FUCSIA(11).jpg", titulo: "Balloon Dog (Magenta)", autor: "Jeff Koons", anio: "", desc: "Versión fucsia de la célebre escultura de globo." },
        { file: "Damien Hirst Cherry Blossoms.jpg", titulo: "Cherry Blossoms", autor: "Damien Hirst", anio: "2018", desc: "Grandes lienzos de flores en una explosión de color." },
        { file: "Hell is a Teenage Girl (1).jpg", titulo: "Hell is a Teenage Girl", autor: "", anio: "", desc: "Obra contemporánea de estética pop y tono provocador." },
        { file: "Takashi Murakami Seasons (1).jpg", titulo: "Seasons", autor: "Takashi Murakami", anio: "", desc: "Estética superflat: flores sonrientes y color saturado." },
      ]},
      verde: { name: "Verde", dir: "VERDE", obras: [
        { file: "Early Spring in Central Park - Paul Cornoyer (1).jpg", titulo: "Early Spring in Central Park", autor: "Paul Cornoyer", anio: "", desc: "Impresionismo estadounidense; Nueva York en primavera." },
        { file: "El jardín del Prado (1).webp", titulo: "El jardín del Prado", autor: "", anio: "", desc: "Vegetación y luz en una composición de verdes." },
        { file: "La Trinidad - Colección (1).jpg", titulo: "La Trinidad", autor: "", anio: "", desc: "Obra de colección en una paleta de verdes." },
        { file: "Van Gogh além das obras-primas (1).jpg", titulo: "Naturaleza en verde", autor: "Vincent van Gogh", anio: "", desc: "Pincelada vibrante característica del autor." },
      ]},
    };

    const wheel = overlay.querySelector("[data-colorwheel]");
    const segs = Array.from(overlay.querySelectorAll(".colorwheel__seg"));
    const img = overlay.querySelector("[data-porcolor-img]");
    const empty = overlay.querySelector("[data-porcolor-empty]");
    const center = overlay.querySelector("[data-porcolor-center]");
    const info = overlay.querySelector("[data-porcolor-info]");
    const elAnio = overlay.querySelector("[data-pc-anio]");
    const elAutor = overlay.querySelector("[data-pc-autor]");
    const elTitulo = overlay.querySelector("[data-pc-titulo]");
    const elDesc = overlay.querySelector("[data-pc-desc]");

    function pickObra(key) {
      const list = COLORS[key].obras;
      return list[Math.floor(Math.random() * list.length)];
    }

    function selectColor(key, seg) {
      const data = COLORS[key];
      if (!data) return;
      const obra = pickObra(key);
      wheel.classList.add("has-selection");
      segs.forEach((s) => {
        const active = s === seg;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-pressed", String(active));
      });
      if (center) center.textContent = data.name;
      if (empty) empty.style.display = "none";

      // crossfade de imagen + ficha
      img.style.opacity = "0";
      if (info) info.classList.remove("is-shown");
      setTimeout(() => {
        img.onload = () => { img.style.opacity = "1"; };
        img.onerror = () => { img.style.opacity = "0"; };
        img.src = encodeURI(`img/por color/${data.dir}/${obra.file}`);
        img.alt = obra.titulo ? `${obra.titulo}${obra.autor ? ", " + obra.autor : ""}` : `Obra en color ${data.name.toLowerCase()}`;
        if (info) {
          elAnio.textContent = obra.anio || "";
          elAutor.textContent = obra.autor || "";
          elTitulo.textContent = obra.titulo || "";
          elDesc.textContent = obra.desc || "";
          info.hidden = false;
          info.classList.add("is-shown");
        }
      }, 150);
    }

    segs.forEach((seg) => {
      const key = seg.dataset.color;
      seg.addEventListener("click", () => selectColor(key, seg));
      seg.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectColor(key, seg); }
      });
    });

    registerOverlay(overlay, "[data-porcolor-open]");
  }

  /* ---------- Aprendé por autor (overlay: índice alfabético + ficha) ----------
     Datos en AUTORES (ficha completa) + INDICE (agrupación por letra). Agregar un
     artista = sumarlo a AUTORES y referenciar su id en INDICE. Imágenes opcionales
     en img/por-autor/<imagen> (si falta, el retrato simplemente no se muestra). */
  function initAuthorExplorer() {
    const overlay = document.querySelector("[data-porautor]");
    if (!overlay) return;

    const AUTORES = {
"sandro-botticelli": { 
        nombre: "Sandro Botticelli", 
        nacimiento: "1445", 
        fallecimiento: "1510", 
        nacionalidad: "Italiano", 
        imagen: "sandro-botticelli.jpg", 
        biografia: [
            "Pintor del Renacimiento florentino, célebre por El nacimiento de Venus y La primavera.", 
            "Su estilo se distingue por la elegancia de la línea, la gracia de las figuras y los temas mitológicos.",
            "Gozó del importante mecenazgo de la familia Médici, lo que le permitió insertarse en los círculos intelectuales y humanistas más destacados de la Florencia del Quattrocento.",
            "Hacia el final de su vida, profundamente afectado por las predicaciones apocalípticas del monje Girolamo Savonarola, su pintura adoptó un tono más severo y místico, y terminó sus días sumido en la pobreza y el olvido hasta ser redescubierto en el siglo XIX."
        ] 
      },
      "louise-bourgeois": { 
        nombre: "Louise Bourgeois", 
        nacimiento: "1911", 
        fallecimiento: "2010", 
        nacionalidad: "Francesa-estadounidense", 
        imagen: "louise-bourgeois.jpg", 
        biografia: [
            "Escultora y artista plástica conocida por sus arañas monumentales (Maman).", 
            "Su obra explora la memoria, el cuerpo, la maternidad y la infancia con gran carga emocional.",
            "Profundamente marcada por los traumas de su niñez, en especial por las infidelidades de su padre y la enfermedad de su madre, Bourgeois utilizó el arte como una herramienta de purga psicológica y psicoanálisis visual.",
            "A lo largo de su extensa carrera experimentó con una amplia variedad de materiales, incluyendo madera, bronce, látex y tejidos, logrando el reconocimiento internacional masivo recién en las últimas décadas de su vida."
        ] 
      },
      "jean-michel-basquiat": { 
        nombre: "Jean-Michel Basquiat", 
        nacimiento: "1960", 
        fallecimiento: "1988", 
        nacionalidad: "Estadounidense", 
        imagen: "jean-michel-basquiat.jpg", 
        biografia: [
            "Figura del neoexpresionismo surgido del arte urbano de Nueva York.", 
            "Su pintura combina texto, símbolos y crítica social con una energía cruda e inmediata.",
            "Comenzó su carrera artística en la década de 1970 bajo el seudónimo SAMO, llenando las calles del Lower East Side de Manhattan con grafitis de mensajes poéticos y subversivos.",
            "Tras entablar una intensa amistad y colaboración con Andy Warhol, alcanzó el éxito comercial internacional en tiempo récord, abordando en sus lienzos temas como el racismo, la desigualdad y la historia afroamericana, antes de su trágica muerte por sobredosis a los 27 años."
        ] 
      },
      "william-blake": { 
        nombre: "William Blake", 
        nacimiento: "1757", 
        fallecimiento: "1827", 
        nacionalidad: "Inglés", 
        imagen: "william-blake.jpg", 
        biografia: [
            "Poeta, pintor y grabador, figura visionaria del Romanticismo.", 
            "Integró imagen y palabra en obras de fuerte carga simbólica y espiritual.",
            "Rechazó la religión ortodoxa y la racionalidad de la Ilustración, creando en su lugar una compleja mitología propia poblada de seres divinos y demoníacos que plasmó en sus famosos 'libros iluminados'.",
            "Considerado un loco e incomprendido por sus contemporáneos, vivió gran parte de su vida en la pobreza, pero su genio fue reivindicado por generaciones posteriores que lo reconocieron como un pilar fundamental del arte y la literatura inglesa."
        ] 
      },
      "caravaggio": { 
        nombre: "Caravaggio", 
        nacimiento: "1571", 
        fallecimiento: "1610", 
        nacionalidad: "Italiano", 
        imagen: "caravaggio.jpg", 
        biografia: [
            "Maestro del Barroco que revolucionó la pintura con el claroscuro y el tenebrismo.", 
            "Llevó un realismo intenso y dramático a las escenas religiosas.",
            "Desafió las convenciones estéticas de su tiempo al utilizar a prostitutas, mendigos y gente de los bajos fondos romanos como modelos para representar a santos y figuras bíblicas, lo que le valió tantos encargos prestigiosos como severos rechazos por parte de la Iglesia.",
            "Su vida personal fue tan turbulenta como sus lienzos, marcada por peleas, problemas legales y un asesinato que lo obligó a vivir sus últimos años huyendo de la justicia entre Nápoles, Malta y Sicilia."
        ] 
      },
      "paul-cezanne": { 
        nombre: "Paul Cézanne", 
        nacimiento: "1839", 
        fallecimiento: "1906", 
        nacionalidad: "Francés", 
        imagen: "paul-cezanne.jpg", 
        biografia: [
            "Pintor postimpresionista que buscó la estructura y la forma esencial de las cosas.", 
            "Su trabajo abrió el camino al cubismo y al arte moderno.",
            "Insatisfecho con la fugacidad del impresionismo, Cézanne se propuso 'hacer del impresionismo algo sólido y duradero como el arte de los museos', analizando la naturaleza a través de formas geométricas básicas como el cilindro, la esfera y el cono.",
            "Aislado en su Provenza natal, trabajó obsesivamente en naturalezas muertas, bañistas y los paisajes de la montaña Sainte-Victoire, sentando las bases visuales que inspirarían profundamente a Picasso y Georges Braque."
        ] 
      },
      "camille-claudel": { 
        nombre: "Camille Claudel", 
        nacimiento: "1864", 
        fallecimiento: "1943", 
        nacionalidad: "Francesa", 
        imagen: "camille-claudel.jpg", 
        biografia: [
            "Escultora de gran fuerza expresiva, conocida por obras como La valse.", 
            "Desarrolló un lenguaje propio dentro de la escultura de su época.",
            "Su talento la llevó a trabajar en el taller de Auguste Rodin, con quien mantuvo una apasionada, productiva y finalmente destructiva relación artística y sentimental que eclipsó temporalmente su propio genio individual.",
            "Tras su ruptura con Rodin, logró crear piezas de una sensibilidad e innovación asombrosas en mármol y bronce, pero los problemas económicos y el deterioro de su salud mental la llevaron a pasar los últimos 30 años de su vida recluida contra su voluntad en un hospital psiquiátrico."
        ] 
      },
      "canaletto": { 
        nombre: "Canaletto", 
        nacimiento: "1697", 
        fallecimiento: "1768", 
        nacionalidad: "Italiano", 
        imagen: "canaletto.jpg", 
        biografia: [
            "Pintor veneciano célebre por sus vistas urbanas (vedute) de Venecia.", 
            "Sus paisajes destacan por la precisión arquitectónica y el manejo de la luz.",
            "Sus detalladas pinturas eran sumamente populares entre los aristócratas británicos que realizaban el 'Grand Tour' europeo, quienes las compraban como suntuosos recuerdos de sus viajes por Italia.",
            "Para lograr la exactitud milimétrica de sus perspectivas, Canaletto a menudo se ayudaba de la cámara oscura, técnica que luego llevó a Inglaterra, donde residió varios años pintando los paisajes londinenses y las residencias de sus acaudalados clientes."
        ] 
      },
      "salvador-dali": { 
        nombre: "Salvador Dalí", 
        nacimiento: "1904", 
        fallecimiento: "1989", 
        nacionalidad: "Español", 
        imagen: "salvador-dali.jpg", 
        biografia: [
            "Fue un pintor, escultor y escritor, reconocido como una de las figuras más destacadas del surrealismo.", 
            "Su obra se caracterizó por imágenes oníricas, escenas fantásticas y una técnica detallada que desafiaba la lógica y la realidad, inspirada por los sueños, el subconsciente y las teorías del psicoanálisis de Sigmund Freud.",
            "A través de su método 'paranoico-crítico', creó composiciones icónicas llenas de simbolismos como relojes derretidos, elefantes de patas alargadas y huevos, siendo 'La persistencia de la memoria' y 'El gran masturbador' algunas de sus piezas más veneradas.",
            "Su genio artístico iba acompañado de una personalidad excéntrica y narcisista que lo convirtió en un maestro del marketing de sí mismo. Junto a su musa y esposa Gala, construyó un universo mediático sin precedentes, consolidándose como uno de los artistas más influyentes, polémicos y singulares del siglo XX."
        ] 
      },
      "edgar-degas": { 
        nombre: "Edgar Degas", 
        nacimiento: "1834", 
        fallecimiento: "1917", 
        nacionalidad: "Francés", 
        imagen: "edgar-degas.jpg", 
        biografia: [
            "Asociado al impresionismo, retrató el movimiento y la vida moderna.", 
            "Es célebre por sus bailarinas, trabajadas en pintura, pastel y escultura.",
            "A diferencia de otros impresionistas que preferían pintar al aire libre (plein air), Degas se definía como un realista que componía meticulosamente sus escenas en el estudio, obsesionado con la luz artificial y los ángulos inusuales influenciados por la fotografía y las estampas japonesas.",
            "En sus últimos años, a medida que su visión se deterioraba drásticamente, abandonó el óleo para enfocarse casi exclusivamente en el pastel y la escultura en cera, volviéndose un hombre solitario y misántropo vagando por las calles de París."
        ] 
      },
      "honore-daumier": { 
        nombre: "Honoré Daumier", 
        nacimiento: "1808", 
        fallecimiento: "1879", 
        nacionalidad: "Francés", 
        imagen: "honore-daumier.jpg", 
        biografia: [
            "Pintor, grabador y caricaturista de gran agudeza.", 
            "Su obra retrató con sentido crítico la sociedad y la política de su tiempo.",
            "A través de miles de litografías publicadas en revistas satíricas, Daumier expuso la hipocresía de la burguesía, la corrupción de los abogados y los excesos de la monarquía, lo que incluso le costó varios meses de prisión tras caricaturizar al rey Luis Felipe I como el gigante Gargantúa.",
            "Aunque en su época fue valorado casi exclusivamente por su talento humorístico, sus magistrales óleos y acuarelas sobre las clases trabajadoras, como 'El vagón de tercera clase', lo consagraron póstumamente como un pionero del realismo pictórico."
        ] 
      },
      "leonardo-da-vinci": { 
        nombre: "Leonardo da Vinci", 
        nacimiento: "1452", 
        fallecimiento: "1519", 
        nacionalidad: "Italiano", 
        imagen: "leonardo-da-vinci.jpg", 
        biografia: [
            "Pintor, científico e inventor del Alto Renacimiento.", 
            "Autor de La Gioconda y La última cena, es símbolo del genio universal.",
            "Su insaciable curiosidad lo llevó a llenar miles de páginas de cuadernos (códices) con estudios detallados de anatomía, botánica, óptica e ingeniería, diseñando máquinas voladoras, armas y obras hidráulicas siglos antes de que pudieran construirse.",
            "En la pintura, perfeccionó la técnica del 'sfumato', difuminando los contornos para crear una sensación de volumen y atmósfera envolvente, aunque su afán perfeccionista y experimental hizo que muchas de sus obras quedaran inacabadas o sufrieran un rápido deterioro técnico."
        ] 
      },
      "albrecht-durer": { 
        nombre: "Albrecht Dürer", 
        nacimiento: "1471", 
        fallecimiento: "1528", 
        nacionalidad: "Alemán", 
        imagen: "albrecht-durer.jpg", 
        biografia: [
            "Pintor y grabador del Renacimiento.", 
            "Renovó el grabado europeo y unió la tradición nórdica con los ideales italianos.",
            "Tras viajar a Venecia y estudiar el arte y la teoría matemática del Renacimiento italiano, Durero integró la perspectiva científica y el canon de proporciones humanas al intenso detallismo y la expresividad del arte gótico alemán.",
            "Sus magistrales grabados en madera y cobre, como 'Melancolía I' y 'El caballero, la muerte y el diablo', circularon por toda Europa, convirtiéndolo en el primer artista nórdico en lograr un impacto y reconocimiento genuinamente internacionales durante su vida."
        ] 
      },
      "alberto-giacometti": { 
        nombre: "Alberto Giacometti", 
        nacimiento: "1901", 
        fallecimiento: "1966", 
        nacionalidad: "Suizo", 
        imagen: "alberto-giacometti.jpg", 
        biografia: [
            "Escultor y pintor del siglo XX.", 
            "Sus figuras humanas extremadamente alargadas y frágiles son íconos del arte moderno.",
            "En sus inicios estuvo vinculado al movimiento surrealista en París, explorando temas del inconsciente y el trauma, pero en la década de 1940 se volcó a la observación directa del modelo vivo, buscando capturar la esencia fenoménica de la realidad.",
            "Sus emblemáticas esculturas filiformes, con texturas rasgadas y proporciones demacradas, fueron aclamadas por filósofos como Jean-Paul Sartre, quienes vieron en ellas la perfecta encarnación visual de la angustia y el aislamiento del existencialismo de posguerra."
        ] 
      },
      "amedeo-modigliani": { 
        nombre: "Amedeo Modigliani", 
        nacimiento: "1884", 
        fallecimiento: "1920", 
        nacionalidad: "Italiano", 
        imagen: "amedeo-modigliani.jpg", 
        biografia: [
            "Pintor y escultor reconocido por sus retratos y desnudos.", 
            "Su estilo se distingue por los cuellos alargados y los rostros estilizados.",
            "Establecido en el barrio parisino de Montparnasse, desarrolló una estética única que fusionaba la elegancia del arte renacentista sienés con el primitivismo de las máscaras africanas y la estatuaria cicládica.",
            "Su vida bohemia estuvo plagada de excesos, pobreza extrema y mala salud por la tuberculosis. Su trágica muerte a los 35 años, seguida del suicidio de su compañera Jeanne Hébuterne, cimentó el mito del 'artista maldito', mientras sus cuadros alcanzaban cotizaciones astronómicas años después."
        ] 
      },

      /* --- A --- */
      "giuseppe-arcimboldo": { nombre: "Giuseppe Arcimboldo", nacimiento: "1526", fallecimiento: "1593", nacionalidad: "Italiano", imagen: "giuseppe-arcimboldo.jpg", biografia: ["Pintor manierista célebre por sus retratos compuestos con frutas, flores y objetos."] },
      "sofonisba-anguissola": { nombre: "Sofonisba Anguissola", nacimiento: "1532", fallecimiento: "1625", nacionalidad: "Italiana", imagen: "sofonisba-anguissola.jpg", biografia: ["Retratista del Renacimiento, pionera entre las mujeres artistas de su tiempo."] },
      "josef-albers": { nombre: "Josef Albers", nacimiento: "1888", fallecimiento: "1976", nacionalidad: "Alemán-estadounidense", imagen: "josef-albers.jpg", biografia: ["Artista y docente de la Bauhaus, conocido por la serie Homenaje al cuadrado."] },

      /* --- E --- */
      "m-c-escher": { nombre: "M. C. Escher", nacimiento: "1898", fallecimiento: "1972", nacionalidad: "Neerlandés", imagen: "m-c-escher.jpg", biografia: ["Grabador célebre por sus construcciones imposibles, teselados y juegos de perspectiva."] },
      "max-ernst": { nombre: "Max Ernst", nacimiento: "1891", fallecimiento: "1976", nacionalidad: "Alemán", imagen: "max-ernst.jpg", biografia: ["Figura del dadaísmo y el surrealismo; experimentó con el frottage y el collage."] },
      "james-ensor": { nombre: "James Ensor", nacimiento: "1860", fallecimiento: "1949", nacionalidad: "Belga", imagen: "james-ensor.jpg", biografia: ["Precursor del expresionismo, reconocido por sus máscaras y escenas grotescas."] },

      /* --- F --- */
      "lucian-freud": { nombre: "Lucian Freud", nacimiento: "1922", fallecimiento: "2011", nacionalidad: "Británico", imagen: "lucian-freud.jpg", biografia: ["Pintor figurativo célebre por sus retratos y desnudos de intensa carnalidad."] },
      "caspar-david-friedrich": { nombre: "Caspar David Friedrich", nacimiento: "1774", fallecimiento: "1840", nacionalidad: "Alemán", imagen: "caspar-david-friedrich.jpg", biografia: ["Máximo paisajista del Romanticismo, de atmósferas contemplativas y sublimes."] },
      "lucio-fontana": { nombre: "Lucio Fontana", nacimiento: "1899", fallecimiento: "1968", nacionalidad: "Argentino-italiano", imagen: "lucio-fontana.jpg", biografia: ["Creador del espacialismo, conocido por sus lienzos perforados y cortados."] },
      "helen-frankenthaler": { nombre: "Helen Frankenthaler", nacimiento: "1928", fallecimiento: "2011", nacionalidad: "Estadounidense", imagen: "helen-frankenthaler.jpg", biografia: ["Pintora del color field, pionera de la técnica de empapado del lienzo (soak-stain)."] },

      /* --- H --- */
      "katsushika-hokusai": { nombre: "Katsushika Hokusai", nacimiento: "1760", fallecimiento: "1849", nacionalidad: "Japonés", imagen: "katsushika-hokusai.jpg", biografia: ["Maestro del ukiyo-e, autor de La gran ola de Kanagawa."] },
      "david-hockney": { nombre: "David Hockney", nacimiento: "1937", fallecimiento: "", nacionalidad: "Británico", imagen: "david-hockney.jpg", biografia: ["Figura clave del pop británico, célebre por sus piscinas y paisajes luminosos."] },
      "keith-haring": { nombre: "Keith Haring", nacimiento: "1958", fallecimiento: "1990", nacionalidad: "Estadounidense", imagen: "keith-haring.jpg", biografia: ["Artista del arte urbano de Nueva York, de figuras sintéticas y activismo social."] },
      "hans-holbein": { nombre: "Hans Holbein el Joven", nacimiento: "1497", fallecimiento: "1543", nacionalidad: "Alemán", imagen: "hans-holbein.jpg", biografia: ["Retratista del Renacimiento, célebre por su precisión y los retratos de la corte Tudor."] },

      /* --- I --- */
      "jean-auguste-dominique-ingres": { nombre: "Jean-Auguste-Dominique Ingres", nacimiento: "1780", fallecimiento: "1867", nacionalidad: "Francés", imagen: "jean-auguste-dominique-ingres.jpg", biografia: ["Maestro del neoclasicismo, de dibujo impecable y sensualidad de la línea."] },
      "robert-indiana": { nombre: "Robert Indiana", nacimiento: "1928", fallecimiento: "2018", nacionalidad: "Estadounidense", imagen: "robert-indiana.jpg", biografia: ["Artista del pop art, conocido por su icónica escultura LOVE."] },

      /* --- J --- */
      "jasper-johns": { nombre: "Jasper Johns", nacimiento: "1930", fallecimiento: "", nacionalidad: "Estadounidense", imagen: "jasper-johns.jpg", biografia: ["Precursor del pop y el minimalismo, célebre por sus banderas y dianas."] },
      "donald-judd": { nombre: "Donald Judd", nacimiento: "1928", fallecimiento: "1994", nacionalidad: "Estadounidense", imagen: "donald-judd.jpg", biografia: ["Referente del minimalismo, conocido por sus objetos específicos y módulos seriados."] },

      /* --- K --- */
      "frida-kahlo": { nombre: "Frida Kahlo", nacimiento: "1907", fallecimiento: "1954", nacionalidad: "Mexicana", imagen: "frida-kahlo.jpg", biografia: ["Pintora célebre por sus autorretratos cargados de simbolismo y dolor personal."] },
      "wassily-kandinsky": { nombre: "Wassily Kandinsky", nacimiento: "1866", fallecimiento: "1944", nacionalidad: "Ruso", imagen: "wassily-kandinsky.jpg", biografia: ["Pionero de la abstracción, relacionó color y forma con la música y lo espiritual."] },
      "gustav-klimt": { nombre: "Gustav Klimt", nacimiento: "1862", fallecimiento: "1918", nacionalidad: "Austríaco", imagen: "gustav-klimt.jpg", biografia: ["Figura del modernismo vienés, autor de El beso y de superficies doradas ornamentales."] },
      "paul-klee": { nombre: "Paul Klee", nacimiento: "1879", fallecimiento: "1940", nacionalidad: "Suizo-alemán", imagen: "paul-klee.jpg", biografia: ["Artista de la Bauhaus, de un lenguaje poético entre la abstracción y el signo."] },

      /* --- L --- */
      "roy-lichtenstein": { nombre: "Roy Lichtenstein", nacimiento: "1923", fallecimiento: "1997", nacionalidad: "Estadounidense", imagen: "roy-lichtenstein.jpg", biografia: ["Referente del pop art, conocido por sus obras inspiradas en el cómic y los puntos Ben-Day."] },
      "fernand-leger": { nombre: "Fernand Léger", nacimiento: "1881", fallecimiento: "1955", nacionalidad: "Francés", imagen: "fernand-leger.jpg", biografia: ["Pintor del cubismo, de formas tubulares y una estética ligada a la era de la máquina."] },

      /* --- N --- */
      "niki-de-saint-phalle": { nombre: "Niki de Saint Phalle", nacimiento: "1930", fallecimiento: "2002", nacionalidad: "Francesa-estadounidense", imagen: "niki-de-saint-phalle.jpg", biografia: ["Escultora célebre por sus Nanas, figuras femeninas monumentales y coloridas."] },
      "isamu-noguchi": { nombre: "Isamu Noguchi", nacimiento: "1904", fallecimiento: "1988", nacionalidad: "Estadounidense-japonés", imagen: "isamu-noguchi.jpg", biografia: ["Escultor y diseñador que unió la escultura moderna con el diseño y el paisaje."] },
      "barnett-newman": { nombre: "Barnett Newman", nacimiento: "1905", fallecimiento: "1970", nacionalidad: "Estadounidense", imagen: "barnett-newman.jpg", biografia: ["Figura del expresionismo abstracto, conocido por sus campos de color y sus zips."] },

      /* --- O --- */
      "georgia-okeeffe": { nombre: "Georgia O'Keeffe", nacimiento: "1887", fallecimiento: "1986", nacionalidad: "Estadounidense", imagen: "georgia-okeeffe.jpg", biografia: ["Madre del modernismo estadounidense, célebre por sus flores y paisajes del suroeste."] },
      "odilon-redon": { nombre: "Odilon Redon", nacimiento: "1840", fallecimiento: "1916", nacionalidad: "Francés", imagen: "odilon-redon.jpg", biografia: ["Pintor simbolista de un mundo onírico, entre el negro del carbón y el color floral."] },
      "oswaldo-guayasamin": { nombre: "Oswaldo Guayasamín", nacimiento: "1919", fallecimiento: "1999", nacionalidad: "Ecuatoriano", imagen: "oswaldo-guayasamin.jpg", biografia: ["Pintor expresionista, su obra denuncia el sufrimiento y la injusticia en América Latina."] },

      /* --- P --- */
      "pablo-picasso": { nombre: "Pablo Picasso", nacimiento: "1881", fallecimiento: "1973", nacionalidad: "Español", imagen: "pablo-picasso.jpg", biografia: ["Cofundador del cubismo y figura central del arte del siglo XX, autor del Guernica."] },
      "piero-della-francesca": { nombre: "Piero della Francesca", nacimiento: "1415", fallecimiento: "1492", nacionalidad: "Italiano", imagen: "piero-della-francesca.jpg", biografia: ["Pintor del Renacimiento, maestro de la perspectiva y la composición serena."] },
      "jackson-pollock": { nombre: "Jackson Pollock", nacimiento: "1912", fallecimiento: "1956", nacionalidad: "Estadounidense", imagen: "jackson-pollock.jpg", biografia: ["Referente del expresionismo abstracto, célebre por su técnica de goteo (dripping)."] },
      "camille-pissarro": { nombre: "Camille Pissarro", nacimiento: "1830", fallecimiento: "1903", nacionalidad: "Francés", imagen: "camille-pissarro.jpg", biografia: ["Figura fundamental del impresionismo, pintor de paisajes rurales y urbanos."] },

      /* --- Q --- */
      "qi-baishi": { nombre: "Qi Baishi", nacimiento: "1864", fallecimiento: "1957", nacionalidad: "Chino", imagen: "qi-baishi.jpg", biografia: ["Maestro de la pintura tradicional china, célebre por sus motivos de la naturaleza."] },
      "quinten-massys": { nombre: "Quinten Massys", nacimiento: "1466", fallecimiento: "1530", nacionalidad: "Flamenco", imagen: "quinten-massys.jpg", biografia: ["Pintor del Renacimiento nórdico, de retratos minuciosos y escenas de género."] },

      /* --- R --- */
      "rembrandt": { nombre: "Rembrandt", nacimiento: "1606", fallecimiento: "1669", nacionalidad: "Neerlandés", imagen: "rembrandt.jpg", biografia: ["Genio del Barroco, maestro del claroscuro, el retrato y el autorretrato."] },
      "pierre-auguste-renoir": { nombre: "Pierre-Auguste Renoir", nacimiento: "1841", fallecimiento: "1919", nacionalidad: "Francés", imagen: "pierre-auguste-renoir.jpg", biografia: ["Impresionista célebre por sus escenas luminosas de la vida y el retrato."] },
      "auguste-rodin": { nombre: "Auguste Rodin", nacimiento: "1840", fallecimiento: "1917", nacionalidad: "Francés", imagen: "auguste-rodin.jpg", biografia: ["Padre de la escultura moderna, autor de El pensador y Los burgueses de Calais."] },
      "raphael": { nombre: "Raphael (Rafael Sanzio)", nacimiento: "1483", fallecimiento: "1520", nacionalidad: "Italiano", imagen: "raphael.jpg", biografia: ["Maestro del Alto Renacimiento, célebre por la armonía y claridad de sus composiciones."] },

      /* --- S --- */
      "egon-schiele": { nombre: "Egon Schiele", nacimiento: "1890", fallecimiento: "1918", nacionalidad: "Austríaco", imagen: "egon-schiele.jpg", biografia: ["Expresionista de línea angulosa e intensa, célebre por sus retratos y desnudos."] },
      "georges-seurat": { nombre: "Georges Seurat", nacimiento: "1859", fallecimiento: "1891", nacionalidad: "Francés", imagen: "georges-seurat.jpg", biografia: ["Creador del puntillismo, construyó la imagen con pequeños puntos de color puro."] },
      "jenny-saville": { nombre: "Jenny Saville", nacimiento: "1970", fallecimiento: "", nacionalidad: "Británica", imagen: "jenny-saville.jpg", biografia: ["Pintora contemporánea de figuración monumental centrada en el cuerpo."] },
      "david-smith": { nombre: "David Smith", nacimiento: "1906", fallecimiento: "1965", nacionalidad: "Estadounidense", imagen: "david-smith.jpg", biografia: ["Escultor pionero de la obra en acero soldado, ligado al expresionismo abstracto."] },
      "joaquin-sorolla": { nombre: "Joaquín Sorolla", nacimiento: "1863", fallecimiento: "1923", nacionalidad: "Español", imagen: "joaquin-sorolla.jpg", biografia: ["Maestro del luminismo, célebre por sus playas mediterráneas bañadas de sol."] },

      /* --- T --- */
      "henri-de-toulouse-lautrec": { nombre: "Henri de Toulouse-Lautrec", nacimiento: "1864", fallecimiento: "1901", nacionalidad: "Francés", imagen: "henri-de-toulouse-lautrec.jpg", biografia: ["Postimpresionista que retrató la vida nocturna del París de la Belle Époque."] },
      "titian": { nombre: "Titian (Tiziano)", nacimiento: "1488", fallecimiento: "1576", nacionalidad: "Italiano", imagen: "titian.jpg", biografia: ["Maestro del Renacimiento veneciano, de un color rico y una pincelada libre."] },
      "antoni-tapies": { nombre: "Antoni Tàpies", nacimiento: "1923", fallecimiento: "2012", nacionalidad: "Español", imagen: "antoni-tapies.jpg", biografia: ["Referente del informalismo, trabajó la materia, el muro y el signo."] },
      "tintoretto": { nombre: "Tintoretto", nacimiento: "1518", fallecimiento: "1594", nacionalidad: "Italiano", imagen: "tintoretto.jpg", biografia: ["Pintor del manierismo veneciano, de composiciones dinámicas y luz dramática."] },

      /* --- U --- */
      "paolo-uccello": { nombre: "Paolo Uccello", nacimiento: "1397", fallecimiento: "1475", nacionalidad: "Italiano", imagen: "paolo-uccello.jpg", biografia: ["Pintor del Renacimiento temprano, obsesionado con la perspectiva geométrica."] },
      "utagawa-hiroshige": { nombre: "Utagawa Hiroshige", nacimiento: "1797", fallecimiento: "1858", nacionalidad: "Japonés", imagen: "utagawa-hiroshige.jpg", biografia: ["Maestro del ukiyo-e, célebre por sus series de paisajes y estampas de viaje."] },

      /* --- V --- */
      "vincent-van-gogh": { nombre: "Vincent van Gogh", nacimiento: "1853", fallecimiento: "1890", nacionalidad: "Neerlandés", imagen: "vincent-van-gogh.jpg", biografia: ["Postimpresionista de pincelada vibrante y color intenso, autor de La noche estrellada."] },
      "diego-velazquez": { nombre: "Diego Velázquez", nacimiento: "1599", fallecimiento: "1660", nacionalidad: "Español", imagen: "diego-velazquez.jpg", biografia: ["Maestro del Barroco español, autor de Las meninas, referente del retrato de corte."] },
      "victor-vasarely": { nombre: "Victor Vasarely", nacimiento: "1906", fallecimiento: "1997", nacionalidad: "Húngaro-francés", imagen: "victor-vasarely.jpg", biografia: ["Padre del op art, exploró la ilusión óptica con patrones geométricos."] },
      "johannes-vermeer": { nombre: "Johannes Vermeer", nacimiento: "1632", fallecimiento: "1675", nacionalidad: "Neerlandés", imagen: "johannes-vermeer.jpg", biografia: ["Maestro del Barroco neerlandés, célebre por su luz y por La joven de la perla."] },

      /* --- W --- */
      "andy-warhol": { nombre: "Andy Warhol", nacimiento: "1928", fallecimiento: "1987", nacionalidad: "Estadounidense", imagen: "andy-warhol.jpg", biografia: ["Figura central del pop art, célebre por sus serigrafías de la cultura de masas."] },
      "james-mcneill-whistler": { nombre: "James McNeill Whistler", nacimiento: "1834", fallecimiento: "1903", nacionalidad: "Estadounidense", imagen: "james-mcneill-whistler.jpg", biografia: ["Pintor tonalista, defensor del 'arte por el arte' y la armonía cromática."] },
      "franz-xaver-winterhalter": { nombre: "Franz Xaver Winterhalter", nacimiento: "1805", fallecimiento: "1873", nacionalidad: "Alemán", imagen: "franz-xaver-winterhalter.jpg", biografia: ["Retratista de la realeza y la aristocracia europea del siglo XIX."] },

      /* --- X --- */
      "xu-beihong": { nombre: "Xu Beihong", nacimiento: "1895", fallecimiento: "1953", nacionalidad: "Chino", imagen: "xu-beihong.jpg", biografia: ["Pintor que fusionó la tinta tradicional china con la técnica occidental; célebre por sus caballos."] },
      "xia-gui": { nombre: "Xia Gui", nacimiento: "1195", fallecimiento: "1224", nacionalidad: "Chino", imagen: "xia-gui.jpg", biografia: ["Pintor de paisaje de la dinastía Song del Sur, maestro del espacio y el vacío."] },

      /* --- Y --- */
      "yayoi-kusama": { nombre: "Yayoi Kusama", nacimiento: "1929", fallecimiento: "", nacionalidad: "Japonesa", imagen: "yayoi-kusama.jpg", biografia: ["Artista contemporánea célebre por sus lunares y sus Infinity Mirror Rooms."] },
      "yun-fei-ji": { nombre: "Yun-Fei Ji", nacimiento: "1963", fallecimiento: "", nacionalidad: "Chino-estadounidense", imagen: "yun-fei-ji.jpg", biografia: ["Artista contemporáneo que actualiza la pintura de tinta china con temas sociales."] },

      /* --- Z --- */
      "francisco-de-zurbaran": { nombre: "Francisco de Zurbarán", nacimiento: "1598", fallecimiento: "1664", nacionalidad: "Español", imagen: "francisco-de-zurbaran.jpg", biografia: ["Pintor del Barroco español, de intensos claroscuros y temática religiosa."] },
      "zhang-daqian": { nombre: "Zhang Daqian", nacimiento: "1899", fallecimiento: "1983", nacionalidad: "Chino", imagen: "zhang-daqian.jpg", biografia: ["Maestro de la pintura china del siglo XX, célebre por su técnica de tinta salpicada."] },
      "zao-wou-ki": { nombre: "Zao Wou-Ki", nacimiento: "1920", fallecimiento: "2008", nacionalidad: "Chino-francés", imagen: "zao-wou-ki.jpg", biografia: ["Pintor de la abstracción lírica que unió la tradición china con la modernidad europea."] },
    };

    // Índice A–Z. Algunas letras quedan sin artistas por ahora y simplemente no se
    // muestran. Agregar uno: sumarlo a AUTORES y referenciar su id en la letra.
    const INDICE = [
      { letra: "A", autores: ["giuseppe-arcimboldo", "sofonisba-anguissola", "josef-albers"] },
      { letra: "B", autores: ["sandro-botticelli", "louise-bourgeois", "jean-michel-basquiat", "william-blake"] },
      { letra: "C", autores: ["caravaggio", "paul-cezanne", "camille-claudel", "canaletto"] },
      { letra: "D", autores: ["salvador-dali", "edgar-degas", "honore-daumier", "leonardo-da-vinci", "albrecht-durer"] },
      { letra: "E", autores: ["m-c-escher", "max-ernst", "james-ensor"] },
      { letra: "F", autores: ["lucian-freud", "caspar-david-friedrich", "lucio-fontana", "helen-frankenthaler"] },
      { letra: "G", autores: ["alberto-giacometti"] },
      { letra: "H", autores: ["katsushika-hokusai", "david-hockney", "keith-haring", "hans-holbein"] },
      { letra: "I", autores: ["jean-auguste-dominique-ingres", "robert-indiana"] },
      { letra: "J", autores: ["jasper-johns", "donald-judd"] },
      { letra: "K", autores: ["frida-kahlo", "wassily-kandinsky", "gustav-klimt", "paul-klee"] },
      { letra: "L", autores: ["roy-lichtenstein", "fernand-leger"] },
      { letra: "M", autores: ["amedeo-modigliani"] },
      { letra: "N", autores: ["niki-de-saint-phalle", "isamu-noguchi", "barnett-newman"] },
      { letra: "O", autores: ["georgia-okeeffe", "odilon-redon", "oswaldo-guayasamin"] },
      { letra: "P", autores: ["pablo-picasso", "piero-della-francesca", "jackson-pollock", "camille-pissarro"] },
      { letra: "Q", autores: ["qi-baishi", "quinten-massys"] },
      { letra: "R", autores: ["rembrandt", "pierre-auguste-renoir", "auguste-rodin", "raphael"] },
      { letra: "S", autores: ["egon-schiele", "georges-seurat", "jenny-saville", "david-smith", "joaquin-sorolla"] },
      { letra: "T", autores: ["henri-de-toulouse-lautrec", "titian", "antoni-tapies", "tintoretto"] },
      { letra: "U", autores: ["paolo-uccello", "utagawa-hiroshige"] },
      { letra: "V", autores: ["vincent-van-gogh", "diego-velazquez", "victor-vasarely", "johannes-vermeer"] },
      { letra: "W", autores: ["andy-warhol", "james-mcneill-whistler", "franz-xaver-winterhalter"] },
      { letra: "X", autores: ["xu-beihong", "xia-gui"] },
      { letra: "Y", autores: ["yayoi-kusama", "yun-fei-ji"] },
      { letra: "Z", autores: ["francisco-de-zurbaran", "zhang-daqian", "zao-wou-ki"] },
    ];

    const indexEl = overlay.querySelector("[data-porautor-index]");
    const ficha = overlay.querySelector("[data-porautor-ficha]");
    const fa = {
      dates: overlay.querySelector("[data-fa-dates]"),
      nac: overlay.querySelector("[data-fa-nac]"),
      name: overlay.querySelector("[data-fa-name]"),
      bio: overlay.querySelector("[data-fa-bio]"),
      img: overlay.querySelector("[data-fa-img]"),
    };

    // construir el índice alfabético (solo letras con artistas)
    INDICE.forEach((grupo) => {
      const col = document.createElement("div");
      col.className = "porautor__letter-col";
      const letra = document.createElement("p");
      letra.className = "porautor__letter";
      letra.textContent = grupo.letra;
      const list = document.createElement("ul");
      list.className = "porautor__list";
      grupo.autores.forEach((id) => {
        const a = AUTORES[id];
        if (!a) return;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "porautor__author";
        btn.dataset.author = id;
        btn.textContent = a.nombre;
        btn.addEventListener("click", () => showAuthor(id));
        li.appendChild(btn);
        list.appendChild(li);
      });
      col.appendChild(letra);
      col.appendChild(list);
      indexEl.appendChild(col);
    });

    function showAuthor(id) {
      const a = AUTORES[id];
      if (!a) return;
      indexEl.querySelectorAll(".porautor__author").forEach((b) => {
        const on = b.dataset.author === id;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-current", on ? "true" : "false");
      });
      ficha.classList.add("is-swapping");
      setTimeout(() => {
        fa.dates.textContent = a.fallecimiento ? `${a.nacimiento} – ${a.fallecimiento}` : `n. ${a.nacimiento}`;
        fa.nac.textContent = a.nacionalidad;
        fa.name.textContent = a.nombre;
        fa.bio.innerHTML = a.biografia.map((p) => `<p class="text-body">${p}</p>`).join("");
        if (a.imagen) {
          fa.img.style.opacity = "0";
          fa.img.onload = () => { fa.img.style.opacity = "1"; };
          fa.img.onerror = () => { fa.img.style.opacity = "0"; };
          fa.img.src = encodeURI(`img/por-autor/${a.imagen}`);
          fa.img.alt = `Retrato de ${a.nombre}`;
        } else {
          fa.img.removeAttribute("src"); fa.img.style.opacity = "0"; fa.img.alt = "";
        }
        ficha.classList.remove("is-swapping");
      }, 150);
    }

    // carrusel del índice: flechas para desplazar la fila + estado activado/desactivado
    const prevBtn = overlay.querySelector("[data-porautor-prev]");
    const nextBtn = overlay.querySelector("[data-porautor-next]");
    function updateArrows() {
      const max = indexEl.scrollWidth - indexEl.clientWidth;
      if (prevBtn) prevBtn.disabled = indexEl.scrollLeft <= 1;
      if (nextBtn) nextBtn.disabled = indexEl.scrollLeft >= max - 1;
    }
    function nudge(dir) {
      indexEl.scrollBy({ left: dir * Math.max(indexEl.clientWidth * 0.8, 220), behavior: "smooth" });
    }
    prevBtn && prevBtn.addEventListener("click", () => nudge(-1));
    nextBtn && nextBtn.addEventListener("click", () => nudge(1));
    indexEl.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", debounce(updateArrows, 150));
    updateArrows();

    showAuthor("salvador-dali"); // ficha por defecto al abrir
    registerOverlay(overlay, "[data-porautor-open]");
  }

  /* ---------- Aprendé por año (overlay: línea de tiempo editorial) ----------
     38 artistas ordenados por año de nacimiento (lista provista, no se agregan
     otros). Desktop/tablet: scroll horizontal nativo (rueda/trackpad/drag) con
     eventos alternados arriba/abajo de un eje central. Mobile: columna vertical.
     Imagen opcional en img/por-anio/<slug>.jpg — si falta, la miniatura no se
     muestra (no rompe el layout). Agregar un artista: sumar un objeto al array
     TIMELINE respetando el orden cronológico. */
  function initYearExplorer() {
    const overlay = document.querySelector("[data-porano]");
    if (!overlay) return;

    const TIMELINE = [
      { year: 1401, nombre: "Masaccio", movimiento: "Renacimiento temprano", slug: "masaccio", desc: "Introdujo la perspectiva científica y dio volumen real a las figuras.", detalle: "Su capilla Brancacci marcó un antes y un después para generaciones de pintores florentinos." },
      { year: 1452, nombre: "Leonardo da Vinci", movimiento: "Alto Renacimiento", slug: "leonardo-da-vinci", desc: "Unió arte y ciencia con una curiosidad sin límites.", detalle: "La Gioconda y La última cena siguen siendo dos de las imágenes más estudiadas de la historia." },
      { year: 1475, nombre: "Miguel Ángel", movimiento: "Alto Renacimiento", slug: "miguel-angel", desc: "Escultor y pintor; el cuerpo humano como ideal absoluto.", detalle: "Sus frescos en la Capilla Sixtina redefinieron la escala y la ambición del arte religioso." },
      { year: 1483, nombre: "Rafael", movimiento: "Alto Renacimiento", slug: "rafael", desc: "Maestro de la armonía, la claridad y la composición equilibrada.", detalle: "La escuela de Atenas condensa el ideal clásico del Renacimiento en una sola pared." },
      { year: 1571, nombre: "Caravaggio", movimiento: "Barroco", slug: "caravaggio", desc: "Revolucionó la pintura con el claroscuro y el realismo crudo.", detalle: "Su vida turbulenta y su pintura violenta cambiaron para siempre la forma de narrar lo sagrado." },
      { year: 1599, nombre: "Diego Velázquez", movimiento: "Barroco español", slug: "diego-velazquez", desc: "Retratista de corte; la luz y la verdad por encima del decoro.", detalle: "Las meninas sigue siendo uno de los enigmas compositivos más comentados del arte occidental." },
      { year: 1770, nombre: "Caspar David Friedrich", movimiento: "Romanticismo", slug: "caspar-david-friedrich", desc: "Paisajes sublimes que hacen del silencio una experiencia.", detalle: "El caminante sobre el mar de nubes resume su idea del ser humano frente a lo inmenso." },
      { year: 1775, nombre: "J. M. W. Turner", movimiento: "Romanticismo", slug: "jmw-turner", desc: "Disolvió la forma en luz, color y atmósfera.", detalle: "Sus últimas obras, casi abstractas, anticiparon el impresionismo décadas antes de que existiera." },
      { year: 1798, nombre: "Eugène Delacroix", movimiento: "Romanticismo", slug: "eugene-delacroix", desc: "Color, movimiento y pasión frente al rigor neoclásico.", detalle: "La libertad guiando al pueblo convirtió la pintura en un manifiesto político." },
      { year: 1819, nombre: "Gustave Courbet", movimiento: "Realismo", slug: "gustave-courbet", desc: "Pintó la vida cotidiana sin idealizarla.", detalle: "Se negó a pintar ángeles porque, decía, nunca había visto uno." },
      { year: 1830, nombre: "Camille Pissarro", movimiento: "Impresionismo", slug: "camille-pissarro", desc: "El más constante de los impresionistas; maestro de sus pares.", detalle: "Fue mentor de Cézanne, Gauguin y Seurat, entre muchos otros." },
      { year: 1832, nombre: "Édouard Manet", movimiento: "Impresionismo (bisagra)", slug: "edouard-manet", desc: "El puente entre el realismo y la modernidad pictórica.", detalle: "Su almuerzo sobre la hierba escandalizó al Salón oficial de París en 1863." },
      { year: 1834, nombre: "Edgar Degas", movimiento: "Impresionismo", slug: "edgar-degas", desc: "El movimiento capturado: bailarinas, carreras, instantes.", detalle: "Prefería definirse como realista antes que como impresionista." },
      { year: 1840, nombre: "Claude Monet", movimiento: "Impresionismo", slug: "claude-monet", desc: "La luz como tema; el instante como método.", detalle: "Su serie de los nenúfares en Giverny ocupó las últimas tres décadas de su vida." },
      { year: 1841, nombre: "Pierre-Auguste Renoir", movimiento: "Impresionismo", slug: "pierre-auguste-renoir", desc: "Celebró el placer, el color cálido y la vida social.", detalle: "Sus escenas de baile y sociabilidad retratan la vida moderna parisina." },
      { year: 1848, nombre: "Paul Gauguin", movimiento: "Postimpresionismo", slug: "paul-gauguin", desc: "Buscó lo primitivo y el color simbólico lejos de Europa.", detalle: "Sus años en Tahití produjeron algunas de las imágenes más discutidas del arte moderno." },
      { year: 1853, nombre: "Vincent van Gogh", movimiento: "Postimpresionismo", slug: "vincent-van-gogh", desc: "Pincelada vibrante y color intenso como lenguaje emocional.", detalle: "Pintó más de dos mil obras en apenas una década de actividad." },
      { year: 1859, nombre: "Georges Seurat", movimiento: "Puntillismo", slug: "georges-seurat", desc: "Construyó la imagen punto a punto, con rigor científico.", detalle: "Una tarde de domingo en la Grande Jatte le tomó más de dos años completarla." },
      { year: 1862, nombre: "Gustav Klimt", movimiento: "Modernismo vienés", slug: "gustav-klimt", desc: "Ornamento dorado y erotismo simbolista.", detalle: "El beso combina pintura, mosaico bizantino y hoja de oro en una sola superficie." },
      { year: 1863, nombre: "Edvard Munch", movimiento: "Expresionismo", slug: "edvard-munch", desc: "La angustia existencial hecha imagen.", detalle: "El grito existe en varias versiones; ninguna agota su intensidad." },
      { year: 1869, nombre: "Henri Matisse", movimiento: "Fauvismo", slug: "henri-matisse", desc: "El color liberado de la descripción; alegría pura.", detalle: "En sus últimos años, ya sin poder pintar, creó obras maestras solo con tijera y papel." },
      { year: 1881, nombre: "Pablo Picasso", movimiento: "Cubismo", slug: "pablo-picasso", desc: "Descompuso la forma y reinventó la pintura del siglo XX.", detalle: "Guernica condensó el horror de la guerra en una sola pared monumental." },
      { year: 1883, nombre: "Kazimir Malevich", movimiento: "Suprematismo", slug: "kazimir-malevich", desc: "Redujo la pintura a la forma pura: el cuadrado negro.", detalle: "Cuadrado negro sobre fondo blanco buscaba llegar al 'grado cero' de la pintura." },
      { year: 1887, nombre: "Marcel Duchamp", movimiento: "Dadaísmo / conceptual", slug: "marcel-duchamp", desc: "El objeto cotidiano como pregunta sobre qué es el arte.", detalle: "Su urinario titulado Fuente sigue siendo la obra más provocadora del siglo XX." },
      { year: 1890, nombre: "Joan Miró", movimiento: "Surrealismo", slug: "joan-miro", desc: "Un lenguaje propio de signos, biomorfismo y color.", detalle: "Decía que quería asesinar la pintura tal como se la conocía hasta entonces." },
      { year: 1892, nombre: "Georgia O'Keeffe", movimiento: "Modernismo estadounidense", slug: "georgia-okeeffe", desc: "Flores y paisajes llevados a una escala monumental.", detalle: "Vivió gran parte de su vida en Nuevo México, entre huesos, flores y desierto." },
      { year: 1898, nombre: "René Magritte", movimiento: "Surrealismo", slug: "rene-magritte", desc: "Imágenes lógicas que esconden preguntas imposibles.", detalle: "Esto no es una pipa desafía la relación entre las palabras, las imágenes y las cosas." },
      { year: 1904, nombre: "Salvador Dalí", movimiento: "Surrealismo", slug: "salvador-dali", desc: "Lo onírico llevado a una técnica obsesivamente precisa.", detalle: "La persistencia de la memoria convirtió los relojes blandos en un ícono universal." },
      { year: 1912, nombre: "Jackson Pollock", movimiento: "Expresionismo abstracto", slug: "jackson-pollock", desc: "El gesto y el goteo como forma de pintar sin tocar el lienzo.", detalle: "Pintaba en el piso, caminando alrededor del lienzo en vez de frente a él." },
      { year: 1923, nombre: "Roy Lichtenstein", movimiento: "Pop art", slug: "roy-lichtenstein", desc: "El cómic elevado a la escala y el estatus del arte.", detalle: "Ampliaba viñetas de cómic hasta volverlas monumentales pinturas de galería." },
      { year: 1928, nombre: "Andy Warhol", movimiento: "Pop art", slug: "andy-warhol", desc: "La cultura de masas repetida hasta volverse ícono.", detalle: "Sus latas de sopa Campbell's preguntan qué separa el arte del producto." },
      { year: 1930, nombre: "Jasper Johns", movimiento: "Pop / neodadaísmo", slug: "jasper-johns", desc: "Banderas y dianas: lo familiar vuelto extraño.", detalle: "Pintaba banderas estadounidenses con una técnica antigua, la encáustica." },
      { year: 1935, nombre: "David Hockney", movimiento: "Pop / contemporáneo", slug: "david-hockney", desc: "Piscinas, luz de California y una mirada siempre curiosa.", detalle: "En sus últimos años adoptó el iPad como herramienta habitual de dibujo." },
      { year: 1938, nombre: "Yayoi Kusama", movimiento: "Arte contemporáneo", slug: "yayoi-kusama", desc: "Lunares e infinito como obsesión y refugio.", detalle: "Sus Infinity Rooms convirtieron la repetición y el espejo en experiencia inmersiva." },
      { year: 1941, nombre: "Anselm Kiefer", movimiento: "Neoexpresionismo", slug: "anselm-kiefer", desc: "Historia, memoria y materia bruta a gran escala.", detalle: "Trabaja con plomo, ceniza y paja para abordar la historia alemana del siglo XX." },
      { year: 1955, nombre: "Jean-Michel Basquiat", movimiento: "Neoexpresionismo / arte urbano", slug: "jean-michel-basquiat", desc: "Texto, símbolo y crítica social con energía cruda.", detalle: "Pasó de pintar grafitis en las calles de Nueva York a exhibir junto a Warhol." },
      { year: 1960, nombre: "Damien Hirst", movimiento: "Arte conceptual (YBA)", slug: "damien-hirst", desc: "La muerte, la ciencia y el shock como material artístico.", detalle: "Un tiburón en formol, titulado La imposibilidad física de la muerte, lo hizo célebre." },
      { year: 1965, nombre: "Banksy", movimiento: "Arte urbano", slug: "banksy", desc: "Anonimato, ironía y crítica en la calle.", detalle: "Su identidad real sigue sin confirmarse oficialmente hasta el día de hoy." },
    ];

    const scroller = overlay.querySelector("[data-porano-scroll]");
    const track = overlay.querySelector("[data-porano-track]");
    if (!scroller || !track) return;

    // eje central: línea base + relleno magenta (el relleno se dibuja con el scroll)
    const spine = document.createElement("div");
    spine.className = "porano__spine";
    const spineFill = document.createElement("div");
    spineFill.className = "porano__spine-fill";
    spine.appendChild(spineFill);
    track.appendChild(spine);

    const events = TIMELINE.map((item, i) => {
      const li = document.createElement("li");
      li.className = "porano__event";
      li.dataset.index = String(i);

      const content = document.createElement("div");
      content.className = "porano__content";
      content.innerHTML = `
        <p class="porano__year">${item.year}</p>
        <div class="porano__thumb-wrap">
          <img class="porano__thumb" src="${encodeURI(`img/por-anio/${item.slug}.jpg`)}" alt="${item.nombre}" loading="lazy" decoding="async">
        </div>
        <h3 class="porano__name">${item.nombre}</h3>
        <p class="porano__movement">${item.movimiento}</p>
        <p class="porano__desc">${item.desc}</p>
      `;
      // si la miniatura no existe todavía (se agrega más adelante), no dejar el
      // hueco de una imagen rota: se oculta el wrapper entero
      const thumb = content.querySelector(".porano__thumb");
      const thumbWrap = content.querySelector(".porano__thumb-wrap");
      thumb.addEventListener("error", () => { thumbWrap.style.display = "none"; }, { once: true });

      // alternancia arriba/abajo (solo tiene efecto visual en desktop/tablet vía CSS)
      const padUp = document.createElement("div");
      padUp.className = "porano__pad-up";
      const padDown = document.createElement("div");
      padDown.className = "porano__pad-down";
      if (i % 2 === 0) padDown.appendChild(content); else padUp.appendChild(content);

      const dot = document.createElement("span");
      dot.className = "porano__dot";
      dot.setAttribute("aria-hidden", "true");

      li.append(padUp, dot, padDown);
      track.appendChild(li);

      return li;
    });

    // ---- revelado progresivo (IntersectionObserver) + año/punto activo ----
    // el root cambia según el layout: en desktop/tablet los eventos scrollean
    // dentro de .porano__scroller; en mobile el scroll es el del overlay entero.
    const mqMobile = matchMedia("(max-width: 900px)");
    let io = null;
    function buildObserver() {
      if (io) io.disconnect();
      const root = mqMobile.matches ? overlay : scroller;
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      }, { root, threshold: 0.35 });
      events.forEach((el) => io.observe(el));
    }
    buildObserver();
    mqMobile.addEventListener("change", buildObserver);

    // año activo = el evento más cercano al centro del área visible + progreso
    // de scroll aplicado al relleno de la línea (--p), en el eje que corresponda
    let ticking = false;
    function updateActiveAndProgress() {
      ticking = false;
      const mobile = mqMobile.matches;
      const box = mobile ? overlay.getBoundingClientRect() : scroller.getBoundingClientRect();
      const centerAxis = mobile ? box.top + box.height / 2 : box.left + box.width / 2;

      let closest = null, closestDist = Infinity;
      events.forEach((el) => {
        const r = el.getBoundingClientRect();
        const c = mobile ? r.top + r.height / 2 : r.left + r.width / 2;
        const d = Math.abs(c - centerAxis);
        if (d < closestDist) { closestDist = d; closest = el; }
        el.classList.remove("is-current");
      });
      if (closest) closest.classList.add("is-current");

      // progreso 0–1 a lo largo del recorrido total
      let progress = 0;
      if (mobile) {
        const total = track.scrollHeight - overlay.clientHeight * 0.5;
        progress = total > 0 ? clamp((overlay.scrollTop - (track.offsetTop - overlay.clientHeight * 0.5)) / total, 0, 1) : 0;
      } else {
        const max = scroller.scrollWidth - scroller.clientWidth;
        progress = max > 0 ? clamp(scroller.scrollLeft / max, 0, 1) : 0;
      }
      spineFill.style.setProperty("--p", progress.toFixed(4));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActiveAndProgress);
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    overlay.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", debounce(updateActiveAndProgress, 150));

    // rueda vertical → desplazamiento horizontal (desktop/tablet); en mobile
    // .porano__scroller no tiene overflow-x, así que esto no tiene efecto
    scroller.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scroller.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // arrastre con mouse (mismo patrón que el deck de Creá)
    let drag = null;
    scroller.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || mqMobile.matches) return;
      drag = { startX: e.clientX, startScroll: scroller.scrollLeft };
      scroller.classList.add("is-dragging");
      scroller.setPointerCapture(e.pointerId);
    });
    scroller.addEventListener("pointermove", (e) => {
      if (!drag) return;
      scroller.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
    });
    const stopDrag = () => { drag = null; scroller.classList.remove("is-dragging"); };
    scroller.addEventListener("pointerup", stopDrag);
    scroller.addEventListener("pointercancel", stopDrag);

    // flechas prev/next: otra forma intuitiva de mover la línea además del
    // arrastre y la rueda; se deshabilitan solas en cada extremo del recorrido
    const prevBtn = overlay.querySelector("[data-porano-prev]");
    const nextBtn = overlay.querySelector("[data-porano-next]");
    function updateArrows() {
      const max = scroller.scrollWidth - scroller.clientWidth;
      if (prevBtn) prevBtn.disabled = scroller.scrollLeft <= 1;
      if (nextBtn) nextBtn.disabled = scroller.scrollLeft >= max - 1;
    }
    function nudge(dir) {
      scroller.scrollBy({ left: dir * scroller.clientWidth * 0.7, behavior: "smooth" });
    }
    prevBtn && prevBtn.addEventListener("click", () => nudge(-1));
    nextBtn && nextBtn.addEventListener("click", () => nudge(1));
    scroller.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", debounce(updateArrows, 150));
    updateArrows();

    updateActiveAndProgress();
    registerOverlay(overlay, "[data-porano-open]");
  }
})();
