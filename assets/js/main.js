/* =====================================================================
   Renders the site from window.SITE (assets/js/content.js).
   You shouldn't need to edit this file to change content.
   ===================================================================== */
(function () {
  "use strict";
  const S = window.SITE || {};
  const M = S.meta || {};
  const page = document.body.dataset.page || "home";
  const isHome = page === "home";
  const home = isHome ? "" : "index.html";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, "0");
  const fullName = `${M.firstName || ""} ${M.lastName || ""}`.trim();

  /* ---------------- Icons ---------------- */
  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    moon: '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.8 2.3h7l4.8 6.3 5.6-6.3zm-1.2 17.9h1.9L7.1 4.2H5.1L17 20.2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    medium: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6.5" cy="12" r="5.5"/><ellipse cx="17" cy="12" rx="2.8" ry="5.2"/><ellipse cx="22.2" cy="12" rx="1" ry="4.6"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.5-1 7.5-.6 10.5 1M7.5 13c2.8-.7 6-.4 8.5 1M8 16.3c2.2-.5 4.5-.3 6.5.8"/></svg>',
  };
  const icon = (n) => ICONS[n] || "";

  /* ---------------- Theme ---------------- */
  const root = document.documentElement;
  function currentTheme() {
    return root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch (e) {}
  }
  if (!root.dataset.theme) root.dataset.theme = currentTheme();

  /* ---------------- Header & footer ---------------- */
  const NAV = [
    { id: "about", label: "About", href: `${home}#about` },
    { id: "experience", label: "Experience", href: `${home}#experience` },
    { id: "projects", label: "Work", href: "projects.html", homeHref: "#work" },
    { id: "beyond", label: "Beyond", href: `${home}#beyond` },
    { id: "writing", label: "Writing", href: "writing.html" },
    { id: "gallery", label: "Gallery", href: "gallery.html" },
    { id: "contact", label: "Contact", href: `${home}#contact` },
  ];

  function renderHeader() {
    const el = $("#site-header");
    if (!el) return;
    const initials = (M.firstName || "P")[0] + (M.lastName || "S")[0];
    el.className = "site-header";
    el.innerHTML = `
      <div class="wrap nav">
        <a class="brand" href="index.html" aria-label="${fullName} — home">
          <span class="brand-mark">${initials}</span>
          <span class="brand-name">${fullName}</span>
        </a>
        <ul class="nav-links" id="nav-links">
          ${NAV.map((n) => `<li><a href="${isHome && n.homeHref ? n.homeHref : n.href}" data-nav="${n.id}">${n.label}</a></li>`).join("")}
        </ul>
        <div class="nav-actions">
          ${M.resume ? `<a class="btn sm" href="${M.resume}" target="_blank" rel="noopener">Résumé ${icon("arrow")}</a>` : ""}
          <button class="icon-btn theme-toggle" type="button" aria-label="Toggle dark mode">${icon("moon")}${icon("sun")}</button>
          <button class="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">${icon("menu")}</button>
        </div>
      </div>`;

    $(".theme-toggle", el).addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));

    const links = $("#nav-links");
    const menuBtn = $(".menu-btn", el);
    menuBtn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
      menuBtn.innerHTML = icon(open ? "close" : "menu");
    });
    $$("a", links).forEach((a) => a.addEventListener("click", () => {
      links.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.innerHTML = icon("menu");
    }));

    // Mark current page in nav
    const pageNav = { projects: "projects", writing: "writing", gallery: "gallery" }[page];
    if (pageNav) $(`[data-nav="${pageNav}"]`, el)?.classList.add("active");

    // Header: solid after scroll, hide when scrolling down
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      el.classList.toggle("scrolled", y > 30);
      el.classList.toggle("hidden", y > 400 && y > lastY && !links.classList.contains("open"));
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const el = $("#site-footer");
    if (!el) return;
    el.className = "site-footer";
    el.innerHTML = `
      <div class="wrap">
        <div class="footer-name" aria-hidden="true">${M.firstName || ""}</div>
        <div class="footer-row">
          <span>© ${new Date().getFullYear()} ${fullName}. ${(S.footer && S.footer.credit) || ""}</span>
          <div class="footer-links">
            ${(S.socials || []).map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`).join("")}
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </div>`;
  }

  /* ---------------- Shared renderers ---------------- */
  const sectionHead = (index, label, title, extra = "") => `
    <div class="section-head reveal">
      <span class="mono section-index">${index} — ${label}</span>
      <h2 class="section-title">${title}</h2>
      ${extra}
    </div>`;

  const projectCard = (p, wide = false) => {
    const main = p.links?.live || p.links?.code || "";
    const img = p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy">` : "";
    const media = `<div class="project-media">${img}${p.year ? `<span class="mono year">${p.year}</span>` : ""}</div>`;
    return `
      <article class="project reveal ${wide ? "wide" : ""}" data-cat="${p.category || ""}">
        ${main ? `<a href="${main}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${media}</a>` : media}
        <div class="project-body">
          <span class="mono project-cat">${p.category || ""}</span>
          <h3 class="project-title">${main ? `<a href="${main}" target="_blank" rel="noopener">${p.title}</a>` : p.title}</h3>
          <p class="project-summary">${p.summary || ""}</p>
          ${p.tags?.length ? `<ul class="tags">${p.tags.map((t) => `<li class="tag">${t}</li>`).join("")}</ul>` : ""}
          <div class="project-links">
            ${p.links?.live ? `<a class="link-arrow" href="${p.links.live}" target="_blank" rel="noopener">Live ${icon("arrow")}</a>` : ""}
            ${p.links?.code ? `<a class="link-arrow" href="${p.links.code}" target="_blank" rel="noopener">Code ${icon("arrow")}</a>` : ""}
          </div>
        </div>
      </article>`;
  };

  const galleryFigures = (items) => items.map((g, i) => `
    <figure class="reveal" data-i="${i}">
      <img src="${g.src}" alt="${g.caption || ""}" loading="lazy">
      ${g.caption || g.place ? `<figcaption><span>${g.caption || ""}</span><span class="mono">${g.place || ""}</span></figcaption>` : ""}
    </figure>`).join("");

  const fmtDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt) ? d || "" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const postsSorted = () => (S.posts || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const postRow = (p) => `
    <li class="post-row reveal">
      <a href="writing.html?p=${encodeURIComponent(p.slug)}">
        <span class="mono post-date">${fmtDate(p.date)}</span>
        <div><h3 class="post-title">${p.title}</h3>${p.excerpt ? `<p class="post-excerpt">${p.excerpt}</p>` : ""}</div>
        <span class="mono post-tags">${(p.tags || []).join(" · ")}</span>
      </a>
    </li>`;

  /* ---------------- Home sections ---------------- */
  function renderHome() {
    const H = S.hero || {};
    let n = 0; // running section number
    const next = () => pad(++n);

    // HERO
    $("#hero").innerHTML = `
      <div class="wrap hero-grid">
        <div>
          <div class="hero-kicker reveal"><span class="line"></span><span class="mono">${H.greeting || "Hello, I'm"}</span></div>
          <h1 class="hero-name reveal"><span>${M.firstName || ""}</span><span class="last">${M.lastName || ""}</span></h1>
          <div class="hero-role reveal"><span class="muted">→</span><span class="typed" aria-live="polite"></span></div>
          ${H.intro ? `<p class="hero-intro reveal">${H.intro}</p>` : ""}
          <div class="hero-cta reveal">
            <a class="btn" href="#work">See my work ${icon("down")}</a>
            <a class="btn ghost" href="#contact">Get in touch</a>
            ${M.available ? `<span class="badge"><span class="pulse"></span>${M.availableText || "Available"}</span>` : ""}
          </div>
        </div>
        ${H.image ? `
        <figure class="portrait reveal">
          <span class="corner tl"></span><span class="corner br"></span>
          <div class="portrait-frame"><img src="${H.image}" alt="Portrait of ${fullName}"></div>
          <figcaption class="mono"><span>${H.imageCaption || ""}</span><span>${M.location || ""}</span></figcaption>
        </figure>` : ""}
      </div>
      ${(H.roles || []).length ? `
      <div class="marquee" aria-hidden="true"><div class="marquee-track">
        ${[0, 1].map(() => H.roles.map((r) => `<span class="marquee-item">${r} <span class="star">✦</span></span>`).join("")).join("")}
      </div></div>` : ""}`;
    typeRoles($(".typed"), H.roles || []);

    // STATS
    const stats = S.stats || [];
    $("#stats").innerHTML = stats.length ? `<div class="wrap"><div class="stats">
      ${stats.map((s) => `<div class="stat reveal"><div class="stat-value"><span class="count" data-to="${s.value}">0</span><span class="suffix">${s.suffix || ""}</span></div><div class="mono stat-label">${s.label}</div></div>`).join("")}
    </div></div>` : "";

    // ABOUT
    const A = S.about || {};
    $("#about").innerHTML = `<div class="wrap">
      ${sectionHead(next(), "About", "A little about <em>me</em>")}
      <div class="about-grid">
        <span class="mono muted">Profile</span>
        <div>
          <p class="about-lead reveal">${A.heading || ""}</p>
          <div class="about-body">
            <div class="about-text reveal">${(A.paragraphs || []).map((p) => `<p>${p}</p>`).join("")}</div>
            <ul class="facts reveal">${(A.facts || []).map((f) => `<li><span class="mono k">${f.label}</span><span class="v">${f.value}</span></li>`).join("")}</ul>
          </div>
        </div>
      </div>
    </div>`;

    // EXPERIENCE
    const E = S.experience || [];
    $("#experience").innerHTML = E.length ? `<div class="wrap">
      ${sectionHead(next(), "Journey", "Experience &amp; <em>education</em>", M.resume ? `<a class="link-arrow" href="${M.resume}" target="_blank" rel="noopener">Full résumé ${icon("arrow")}</a>` : "")}
      <ol class="timeline">${E.map((e) => `
        <li class="tl-item reveal">
          <div><div class="mono tl-period">${e.period || ""}</div>${e.type ? `<span class="mono tl-type">${e.type}</span>` : ""}</div>
          <div>
            <h3 class="tl-role">${e.role}</h3>
            <div class="tl-org">${e.link ? `<a href="${e.link}" target="_blank" rel="noopener">${e.org}</a>` : e.org || ""}</div>
            ${e.points?.length ? `<ul class="tl-points">${e.points.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}
          </div>
        </li>`).join("")}
      </ol>
    </div>` : "";
    if (!E.length) $("#experience").remove();

    // PROJECTS (featured)
    const P = (S.projects || []).filter((p) => p.featured);
    $("#work").innerHTML = `<div class="wrap">
      ${sectionHead(next(), "Selected work", "Things I've <em>built</em>", `<a class="link-arrow" href="projects.html">All projects ${icon("arrow")}</a>`)}
      <div class="projects">${P.map((p, i) => projectCard(p, i === 0)).join("") || `<p class="empty">Mark projects with <code>featured: true</code> in content.js</p>`}</div>
    </div>`;

    // SKILLS
    const SK = S.skills || [], C = S.certifications || [];
    $("#skills").innerHTML = SK.length || C.length ? `<div class="wrap">
      ${sectionHead(next(), "Toolkit", "Skills &amp; <em>tools</em>")}
      <div class="skills-grid">${SK.map((g) => `<div class="skill-group reveal"><h3>${g.group}</h3><ul>${g.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`).join("")}</div>
      ${C.length ? `<div class="certs"><span class="mono muted">Certifications &amp; courses</span>
        <ul class="cert-list">${C.map((c) => {
          const inner = `<strong>${c.title}</strong><span>${c.issuer || ""}${c.year ? ` · ${c.year}` : ""}</span>`;
          return `<li>${c.link ? `<a class="cert reveal" href="${c.link}" target="_blank" rel="noopener">${inner}</a>` : `<div class="cert reveal">${inner}</div>`}</li>`;
        }).join("")}</ul></div>` : ""}
    </div>` : "";

    // BEYOND
    const B = S.passions || [];
    $("#beyond").innerHTML = B.length ? `<div class="wrap">
      ${sectionHead(next(), "Beyond engineering", "Off the <em>clock</em>")}
      <div class="passions">${B.map((b, i) => `
        <article class="passion reveal" tabindex="0">
          ${b.image ? `<img src="${b.image}" alt="" loading="lazy">` : ""}
          <span class="mono num">${pad(i + 1)}</span>
          <span class="mono kicker">${b.kicker || ""}</span>
          <h3>${b.title}</h3>
          <p>${b.text || ""}</p>
          ${b.link ? `<a class="link-arrow" href="${b.link.url}" ${/^https?:/.test(b.link.url) ? 'target="_blank" rel="noopener"' : ""}>${b.link.label} ${icon("arrow")}</a>` : ""}
        </article>`).join("")}</div>
    </div>` : "";

    // WRITING (latest 3)
    const posts = postsSorted().slice(0, 3);
    $("#writing").innerHTML = posts.length ? `<div class="wrap">
      ${sectionHead(next(), "Writing", "Notes, essays &amp; <em>poems</em>", `<a class="link-arrow" href="writing.html">All writing ${icon("arrow")}</a>`)}
      <ul class="posts">${posts.map(postRow).join("")}</ul>
    </div>` : "";

    // GALLERY preview
    const G = S.gallery || [];
    $("#gallery").innerHTML = G.length ? `<div class="wrap">
      ${sectionHead(next(), "Frames", "Through my <em>lens</em>", `<a class="link-arrow" href="gallery.html">Full gallery ${icon("arrow")}</a>`)}
      <div class="gallery preview">${galleryFigures(G)}</div>
    </div>` : "";

    // QUOTES
    const Q = S.quotes || [];
    $("#quotes").innerHTML = Q.length ? `<div class="wrap">
      ${sectionHead(next(), "Words I live by", "Favourite <em>quotes</em>")}
      <div class="quote-wrap reveal">${Q.map((q, i) => `
        <figure class="quote ${i === 0 ? "active" : ""}">
          <blockquote>${q.text}</blockquote>
          <figcaption class="mono">— <strong>${q.author}</strong>${q.source ? `, ${q.source}` : ""}</figcaption>
        </figure>`).join("")}</div>
      ${Q.length > 1 ? `<div class="quote-dots">${Q.map((_, i) => `<button type="button" aria-label="Quote ${i + 1}" class="${i === 0 ? "active" : ""}"></button>`).join("")}</div>` : ""}
    </div>` : "";
    setupQuotes();

    // CONTACT
    renderContact(next());

    // Hide empty sections
    $$("main > section").forEach((s) => { if (!s.innerHTML.trim()) s.remove(); });
  }

  function renderContact(num) {
    const C = S.contact || {};
    const el = $("#contact");
    if (!el) return;
    el.innerHTML = `<div class="wrap">
      ${sectionHead(num, "Contact", C.heading || "Say <em>hello</em>")}
      <div class="contact-grid">
        <div class="reveal">
          <p>${C.text || ""}</p>
          ${M.email ? `<a class="contact-big" href="mailto:${M.email}">${M.email}</a>` : ""}
          <ul class="socials">${(S.socials || []).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${icon(s.icon)} ${s.name}</a></li>`).join("")}</ul>
        </div>
        <form class="form reveal" novalidate>
          <div class="field"><label class="mono" for="f-name">Name</label><input id="f-name" name="name" required autocomplete="name"></div>
          <div class="field"><label class="mono" for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label class="mono" for="f-msg">Message</label><textarea id="f-msg" name="message" rows="4" required></textarea></div>
          <button class="btn" type="submit">Send message ${icon("arrow")}</button>
          <p class="form-status" role="status"></p>
        </form>
      </div>
    </div>`;

    const form = $("form", el), status = $(".form-status", el);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (!data.name || !data.email || !data.message) { status.textContent = "Please fill in all fields."; return; }
      if (C.formEndpoint) {
        status.textContent = "Sending…";
        try {
          const r = await fetch(C.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
          if (!r.ok) throw new Error();
          form.reset(); status.textContent = "Thanks! Your message has been sent.";
        } catch (err) { status.textContent = "Something went wrong — please email me directly."; }
      } else {
        const subject = encodeURIComponent(`Hello from ${data.name}`);
        const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
        window.location.href = `mailto:${M.email}?subject=${subject}&body=${body}`;
        status.textContent = "Opening your email app…";
      }
    });
  }

  /* ---------------- Inner pages ---------------- */
  function renderProjectsPage() {
    const P = S.projects || [];
    const cats = ["All", ...new Set(P.map((p) => p.category).filter(Boolean))];
    const count = (c) => (c === "All" ? P.length : P.filter((p) => p.category === c).length);
    $("#filters").innerHTML = cats.map((c, i) => `<button type="button" class="filter ${i === 0 ? "active" : ""}" data-cat="${c}">${c}<span class="count">${count(c)}</span></button>`).join("");
    const grid = $("#project-grid");
    grid.innerHTML = P.map((p) => projectCard(p)).join("") || `<p class="empty">No projects yet.</p>`;
    $$(".filter").forEach((b) => b.addEventListener("click", () => {
      $$(".filter").forEach((x) => x.classList.toggle("active", x === b));
      $$(".project", grid).forEach((card) => {
        card.style.display = b.dataset.cat === "All" || card.dataset.cat === b.dataset.cat ? "" : "none";
      });
    }));
  }

  function renderWritingPage() {
    const slug = new URLSearchParams(location.search).get("p");
    const post = slug && (S.posts || []).find((p) => p.slug === slug);
    if (post) {
      document.title = `${post.title} — ${fullName}`;
      $("#page-head").remove();
      $("#writing-main").innerHTML = `<article class="article">
        <header class="article-head">
          <div class="mono crumbs"><a href="writing.html">← All writing</a></div>
          <span class="mono muted">${fmtDate(post.date)}${post.tags?.length ? " · " + post.tags.join(" · ") : ""}</span>
          <h1 class="article-title">${post.title}</h1>
          ${post.excerpt ? `<p class="muted">${post.excerpt}</p>` : ""}
        </header>
        ${post.cover ? `<img class="article-cover" src="${post.cover}" alt="">` : ""}
        <div class="article-body">${post.body || ""}</div>
      </article>`;
      $("#writing-main").parentElement.style.paddingTop = "140px";
      return;
    }
    const posts = postsSorted();
    const tags = ["All", ...new Set(posts.flatMap((p) => p.tags || []))];
    $("#filters").innerHTML = tags.map((t, i) => `<button type="button" class="filter ${i === 0 ? "active" : ""}" data-tag="${t}">${t}</button>`).join("");
    $("#writing-main").innerHTML = posts.length ? `<ul class="posts">${posts.map(postRow).join("")}</ul>` : `<p class="empty">No posts yet.</p>`;
    $$(".filter").forEach((b) => b.addEventListener("click", () => {
      $$(".filter").forEach((x) => x.classList.toggle("active", x === b));
      $$(".post-row").forEach((row, i) => {
        row.style.display = b.dataset.tag === "All" || (posts[i].tags || []).includes(b.dataset.tag) ? "" : "none";
      });
    }));
  }

  function renderGalleryPage() {
    const G = S.gallery || [];
    $("#gallery-grid").innerHTML = G.length ? galleryFigures(G) : `<p class="empty">No photos yet.</p>`;
  }

  /* ---------------- Interactions ---------------- */
  function typeRoles(el, roles) {
    if (!el || !roles.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = roles.join(" · "); return; }
    let r = 0, c = 0, del = false;
    (function tick() {
      const word = roles[r];
      el.textContent = word.slice(0, c);
      if (!del && c < word.length) c++;
      else if (del && c > 0) c--;
      else if (!del) { del = true; return setTimeout(tick, 1600); }
      else { del = false; r = (r + 1) % roles.length; }
      setTimeout(tick, del ? 45 : 85);
    })();
  }

  function setupQuotes() {
    const qs = $$(".quote"), dots = $$(".quote-dots button");
    if (qs.length < 2) return;
    let i = 0, timer;
    const show = (k) => {
      i = k;
      qs.forEach((q, j) => q.classList.toggle("active", j === k));
      dots.forEach((d, j) => d.classList.toggle("active", j === k));
    };
    const start = () => { clearInterval(timer); timer = setInterval(() => show((i + 1) % qs.length), 7000); };
    dots.forEach((d, k) => d.addEventListener("click", () => { show(k); start(); }));
    start();
  }

  function setupLightbox() {
    const figs = $$(".gallery figure");
    if (!figs.length) return;
    const items = S.gallery || [];
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML = `<button class="icon-btn lb-close" aria-label="Close">${icon("close")}</button>
      <button class="icon-btn lb-prev" aria-label="Previous">${icon("left")}</button>
      <img alt=""><p></p>
      <button class="icon-btn lb-next" aria-label="Next">${icon("right")}</button>`;
    document.body.appendChild(lb);
    let cur = 0;
    const show = (k) => {
      cur = (k + items.length) % items.length;
      const g = items[cur];
      $("img", lb).src = g.src; $("img", lb).alt = g.caption || "";
      $("p", lb).textContent = [g.caption, g.place].filter(Boolean).join(" — ");
    };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    figs.forEach((f) => f.addEventListener("click", () => {
      show(+f.dataset.i); lb.classList.add("open"); document.body.style.overflow = "hidden"; $(".lb-close", lb).focus();
    }));
    $(".lb-close", lb).onclick = close;
    $(".lb-prev", lb).onclick = () => show(cur - 1);
    $(".lb-next", lb).onclick = () => show(cur + 1);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
  }

  function setupReveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      // stagger siblings
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 6) * 80}ms`;
      el.classList.add("in");
      io.unobserve(el);
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
  }

  function setupCounters() {
    const els = $$(".count");
    if (!els.length) return;
    const run = (el) => {
      const to = parseFloat(el.dataset.to);
      if (isNaN(to)) { el.textContent = el.dataset.to; return; }
      const t0 = performance.now(), dur = 1600;
      const step = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  }

  function setupActiveNav() {
    if (!isHome) return;
    const map = { about: "about", experience: "experience", work: "projects", beyond: "beyond", contact: "contact" };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === map[e.target.id]));
    }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Boot ---------------- */
  if (fullName) {
    document.title = isHome ? `${fullName} — ${M.tagline || "Portfolio"}` : `${document.title} — ${fullName}`;
  }
  renderHeader();
  if (isHome) renderHome();
  if (page === "projects") renderProjectsPage();
  if (page === "writing") renderWritingPage();
  if (page === "gallery") renderGalleryPage();
  renderFooter();
  setupLightbox();
  setupReveal();
  setupCounters();
  setupActiveNav();

  // Re-jump to hash after content is rendered (e.g. coming from another page)
  if (location.hash) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => t.scrollIntoView(), 50);
  }
})();
