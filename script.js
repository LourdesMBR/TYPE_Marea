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
  const CURSOR_TARGETS = "a, button, .cta, .btn";
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
    // sobre fotos → lente duotono (is-photo); en cualquier otra superficie el
    // círculo de inversión basta (sin clases extra).
    function applyTint(el) {
      root.classList.toggle("is-photo", isPhotoTarget(el));
    }
    function onLeave() {
      s.visible = false;
      root.classList.remove("is-visible", "is-photo");
    }
    function onOver(e) {
      if (e.target.closest?.(CURSOR_TARGETS)) { root.classList.add("is-hovering"); s.targetScale = 4; }
      applyTint(e.target); // recomputa la lente al entrar a cada elemento
    }
    function onOut(e) {
      if (!e.relatedTarget?.closest?.(CURSOR_TARGETS)) { root.classList.remove("is-hovering"); s.targetScale = 1; }
    }

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
})();
