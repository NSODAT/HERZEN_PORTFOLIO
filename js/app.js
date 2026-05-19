const DATA_URL = "data/portfolio.json";

const LINK_LABELS = {
  pdf: "PDF",
  "google-drive": "Google Drive",
  "google-doc": "Google Документ",
  external: "Ссылка",
};

const CONTACT_LABELS = {
  email: "Email",
  telegram: "Telegram",
  github: "GitHub",
  phone: "Телефон",
};

/** @type {Record<string, unknown> | null} */
let portfolio = null;
let activeFilter = "all";

const viewer = document.getElementById("viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerBody = document.getElementById("viewer-body");
const viewerOpen = document.getElementById("viewer-open");
const viewerDownload = document.getElementById("viewer-download");
const viewerClose = document.getElementById("viewer-close");

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    portfolio = await res.json();
    applyMeta();
    bindProfile();
    renderSkills();
    renderProjects();
    renderContacts();
    setupNav();
    setupFilter();
    setupViewer();
  } catch (err) {
    console.error(err);
    showLoadError();
  }
}

function showLoadError() {
  const root = document.getElementById("projects-root");
  if (root) {
    root.innerHTML =
      '<p class="viewer-error">Не удалось загрузить data/portfolio.json. Откройте сайт через локальный сервер или GitHub Pages.</p>';
  }
}

function applyMeta() {
  const title = portfolio.meta?.siteTitle;
  if (title) {
    document.title = title;
    document.querySelectorAll('[data-bind="siteTitle"]').forEach((el) => {
      el.textContent = title;
    });
  }
}

function bindProfile() {
  const p = portfolio.profile;
  const year = new Date().getFullYear();

  const map = {
    name: p.name,
    role: p.role,
    institute: p.institute,
    course: p.course,
    tagline: p.tagline,
    bio: p.bio,
    year: String(year),
  };

  Object.entries(map).forEach(([key, value]) => {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => {
      el.textContent = value ?? "";
    });
  });

  const photo = document.querySelector("[data-bind-src='photo']");
  if (photo && p.photo) {
    photo.src = p.photo;
    photo.alt = `Фото: ${p.name}`;
  }
}

function renderSkills() {
  const list = document.getElementById("skills-list");
  if (!list) return;
  list.innerHTML = (portfolio.profile.skills ?? [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");
}

function renderContacts() {
  const list = document.getElementById("contacts-list");
  if (!list) return;

  const items = Object.entries(portfolio.contacts ?? {}).filter(([, v]) => v);

  list.innerHTML = items
    .map(([key, value]) => {
      const label = CONTACT_LABELS[key] ?? key;
      const isLink = key !== "phone" && String(value).startsWith("http");
      const href = key === "email" ? `mailto:${value}` : value;
      const inner = isLink || key === "email"
        ? `<a href="${escapeAttr(href)}"${isLink ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(String(value))}</a>`
        : `<span>${escapeHtml(String(value))}</span>`;
      return `<li class="contact-card"><strong>${escapeHtml(label)}</strong>${inner}</li>`;
    })
    .join("");
}

function renderProjects() {
  const root = document.getElementById("projects-root");
  if (!root) return;

  const categories = portfolio.categories ?? [];
  if (!categories.length) {
    root.innerHTML = '<p class="empty-state">Добавьте категории и проекты в data/portfolio.json</p>';
    return;
  }

  root.innerHTML = categories
    .map((cat) => {
      const hidden = activeFilter !== "all" && activeFilter !== cat.id;
      const cards = (cat.projects ?? [])
        .map((proj) => renderProjectCard(proj, cat.id))
        .join("");

      return `
        <section class="category-block${hidden ? " is-hidden" : ""}" data-category="${escapeAttr(cat.id)}" id="cat-${escapeAttr(cat.id)}">
          <header class="category-header">
            <span class="category-icon" aria-hidden="true">${cat.icon ?? "📁"}</span>
            <div>
              <h3>${escapeHtml(cat.title)}</h3>
              ${cat.description ? `<p class="category-desc">${escapeHtml(cat.description)}</p>` : ""}
            </div>
          </header>
          <div class="project-grid">
            ${cards || '<p class="empty-state">Пока нет работ в этой категории.</p>'}
          </div>
        </section>`;
    })
    .join("");

  root.querySelectorAll(".project-open").forEach((btn) => {
    btn.addEventListener("click", () => openProject(btn.dataset));
  });
}

function renderProjectCard(project, categoryId) {
  const link = project.link;
  const type = link?.type ?? "external";
  const label = LINK_LABELS[type] ?? type;

  return `
    <article class="project-card" data-category="${escapeAttr(categoryId)}">
      <h4>${escapeHtml(project.title)}</h4>
      ${project.semester ? `<p class="project-meta">${escapeHtml(project.semester)}</p>` : ""}
      ${project.description ? `<p class="project-desc">${escapeHtml(project.description)}</p>` : ""}
      ${
        project.tags?.length
          ? `<div class="project-tags">${project.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
          : ""
      }
      <div class="project-actions">
        <button
          type="button"
          class="btn btn-primary btn-sm project-open"
          data-title="${escapeAttr(project.title)}"
          data-type="${escapeAttr(type)}"
          data-url="${escapeAttr(link?.url ?? "#")}"
        >Открыть</button>
        <span class="link-type-badge">${escapeHtml(label)}</span>
      </div>
    </article>`;
}

function setupFilter() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeFilter = btn.dataset.filter ?? "all";
      renderProjects();
    });
  });
}

function setupNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  toggle?.addEventListener("click", () => {
    const open = nav?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(Boolean(open)));
  });

  nav?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => nav.classList.remove("is-open"));
  });
}

function setupViewer() {
  viewerClose?.addEventListener("click", closeViewer);
  viewer?.addEventListener("click", (e) => {
    if (e.target === viewer) closeViewer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && viewer?.open) closeViewer();
  });
}

function openProject(dataset) {
  const { title, type, url } = dataset;
  if (!url || url === "#") return;

  if (type === "external" || isDriveFolder(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const embedUrl = resolveEmbedUrl(type, url);
  viewerTitle.textContent = title ?? "Просмотр";
  viewerOpen.href = url;
  viewerOpen.hidden = false;

  if (type === "pdf") {
    viewerDownload.href = url;
    viewerDownload.hidden = false;
  } else {
    viewerDownload.hidden = true;
  }

  viewerBody.innerHTML = `<iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title ?? "Документ")}" allow="fullscreen"></iframe>`;
  viewer.showModal();
}

function closeViewer() {
  viewer.close();
  viewerBody.innerHTML = '<p class="viewer-loading">Загрузка…</p>';
}

function resolveEmbedUrl(type, url) {
  if (type === "pdf") return url;

  if (type === "google-doc") {
    return url.replace(/\/edit.*$/, "/preview");
  }

  if (type === "google-drive") {
    const fileId = extractGoogleId(url);
    if (fileId && url.includes("/file/")) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  }

  return url;
}

function extractGoogleId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

function isDriveFolder(url) {
  return url.includes("drive.google.com") && url.includes("/folders/");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

init();
