/* =========================================================
   MAREA — landing
   Módulos: capabilities · header · reveal · mira (hscroll+parallax)
            · crea (deck drag) · quotes · mostra (tilt + obras) · newsletter
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
    caps.hijack = caps.hoverFine && matchMedia("(min-width: 1024px)").matches && !caps.reducedMotion;
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
    initMostraTilt();
    initMostraObras();
    initNewsletter();
    initCursor();

    window.addEventListener("resize", debounce(() => {
      readCaps();
      refreshMira();
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
    const panels = Array.from(track.querySelectorAll("[data-panel]"));
    const bar = document.querySelector("[data-hscroll-nav]");
    const indexEl = document.querySelector("[data-hscroll-index]");
    const eraTabs = Array.from(document.querySelectorAll(".mira-bar__tab"));
    const barrocoImg = document.querySelector("[data-parallax]");

    mira = { hscroll, track, panels, bar, indexEl, eraTabs, barrocoImg, start: 0, total: 0 };

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
      mira.barrocoImg.style.transform = `translateY(${(local - 0.5) * 90}px)`;
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

  /* ---------- 03 Mostrá: tilt sutil ---------- */
  function initMostraTilt() {
    document.querySelectorAll("[data-tilt]").forEach((wrap) => {
      const img = wrap.querySelector("img");
      if (!img) return;

      wrap.addEventListener("pointermove", (e) => {
        if (!caps.hoverFine) return;
        const rect = img.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        img.style.transition = "none";
        img.style.transform = `rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) scale(1.03)`;
      });
      wrap.addEventListener("pointerleave", () => {
        img.style.transition = "transform 500ms var(--ease-out)";
        img.style.transform = "rotateX(0) rotateY(0) scale(1)";
      });
    });
  }

  /* ---------- Obras del mes: deck horizontal, arrastre con mouse + dots ---------- */
  function initMostraObras() {
    const list = document.querySelector(".mostra__obras-deck");
    if (!list) return;
    const cards = Array.from(list.querySelectorAll(".mostra__obra-card"));
    const dotsWrap = document.querySelector("[data-obras-dots]");
    let drag = null;

    // dots: uno por card, click para deslizar, activo según posición de scroll
    let dots = [];
    if (dotsWrap && cards.length > 1) {
      dots = cards.map((card, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "mostra__obras-dots__dot";
        dot.setAttribute("aria-label", `Ir a la obra ${i + 1}`);
        dot.addEventListener("click", () => {
          list.scrollTo({ left: card.offsetLeft - list.offsetLeft, behavior: "smooth" });
        });
        dotsWrap.appendChild(dot);
        return dot;
      });
    }

    const step = () => (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0) || 1;
    function syncDots() {
      if (!dots.length) return;
      const maxScroll = list.scrollWidth - list.clientWidth;
      const active = list.scrollLeft >= maxScroll - 1
        ? cards.length - 1
        : clamp(Math.round(list.scrollLeft / step()), 0, cards.length - 1);
      dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
    }
    list.addEventListener("scroll", syncDots, { passive: true });
    syncDots();

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
    const stopDrag = () => { drag = null; list.classList.remove("is-dragging"); };
    list.addEventListener("pointerup", stopDrag);
    list.addEventListener("pointercancel", stopDrag);
  }

  /* ---------- Cursor personalizado: circle-follow nativo (sin GSAP) ---------- */
  let cursor = null;
  const CURSOR_TARGETS = "a, button, .cta, .btn";
  // mapeo color de fondo real (rgb) -> color sólido que toma el cursor sobre él
  const CURSOR_TINTS = [
    { r: 0,   g: 255, b: 208, fill: "#F137A5" }, // turquesa (botón primario) -> magenta
    { r: 206, g: 245, b: 100, fill: "#4100F5" }, // lima (banda/marquee)       -> azul
    { r: 241, g: 55,  b: 166, fill: "#CEF564" }, // magenta (banda "Por año")  -> lima
  ];

  function cursorBgColor(el) {
    let n = el;
    while (n && n.nodeType === 1 && n !== document.documentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(",").map((v) => parseFloat(v));
        if ((p[3] ?? 1) > 0) return { r: p[0], g: p[1], b: p[2] };
      }
      n = n.parentElement;
    }
    return null;
  }
  function cursorTintFor(el) {
    if (el.closest?.("img, picture")) return "#FFFFFF"; // sobre fotos: sólido, no invierte
    const c = cursorBgColor(el);
    if (!c) return null;
    for (const t of CURSOR_TINTS) {
      if (Math.abs(c.r - t.r) < 6 && Math.abs(c.g - t.g) < 6 && Math.abs(c.b - t.b) < 6) return t.fill;
    }
    return null;
  }

  function initCursor() {
    const root = document.querySelector("[data-cursor]");
    if (!root) return;
    const big = root.querySelector(".cursor__ball--big");
    const small = root.querySelector(".cursor__ball--small");

    const s = {
      on: false, raf: null, visible: false,
      tx: innerWidth / 2, ty: innerHeight / 2,
      bx: innerWidth / 2, by: innerHeight / 2,
      sx: innerWidth / 2, sy: innerHeight / 2,
    };

    function onMove(e) {
      s.tx = e.clientX; s.ty = e.clientY;
      if (!s.visible) { s.visible = true; root.classList.add("is-visible"); }
    }
    function applyTint(el) {
      const fill = el && cursorTintFor(el);
      if (fill) { root.style.setProperty("--cursor-fill", fill); root.classList.add("is-solid"); }
      else { root.style.removeProperty("--cursor-fill"); root.classList.remove("is-solid"); }
    }
    function onLeave() {
      s.visible = false;
      root.classList.remove("is-visible", "is-solid");
      root.style.removeProperty("--cursor-fill");
    }
    function onOver(e) {
      if (e.target.closest?.(CURSOR_TARGETS)) root.classList.add("is-hovering");
      applyTint(e.target); // recomputa el tinte al entrar a cada elemento
    }
    function onOut(e) {
      if (!e.relatedTarget?.closest?.(CURSOR_TARGETS)) root.classList.remove("is-hovering");
    }

    // loop: la grande sigue con retardo (lerp 0.18), la chica de cerca (lerp 0.45)
    function tick() {
      s.bx += (s.tx - s.bx) * 0.18; s.by += (s.ty - s.by) * 0.18;
      s.sx += (s.tx - s.sx) * 0.45; s.sy += (s.ty - s.sy) * 0.45;
      big.style.transform = `translate3d(${(s.bx - 20).toFixed(2)}px, ${(s.by - 20).toFixed(2)}px, 0)`;
      small.style.transform = `translate3d(${(s.sx - 5).toFixed(2)}px, ${(s.sy - 5).toFixed(2)}px, 0)`;
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
      root.classList.remove("is-visible", "is-hovering", "is-solid");
      root.style.removeProperty("--cursor-fill");
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
