const DATA_URL = "data/portfolio.json";

const LINK_LABELS = {
  pdf: "PDF в репозитории",
  github: "Файл на GitHub",
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
      return `
        <section class="category-block${hidden ? " is-hidden" : ""}" data-category="${escapeAttr(cat.id)}" id="cat-${escapeAttr(cat.id)}">
          <header class="category-header">
            <span class="category-icon" aria-hidden="true">${cat.icon ?? "📁"}</span>
            <div>
              <h3>${escapeHtml(cat.title)}</h3>
              ${cat.description ? `<p class="category-desc">${escapeHtml(cat.description)}</p>` : ""}
            </div>
          </header>
          ${renderCategoryBody(cat)}
        </section>`;
    })
    .join("");

  root.querySelectorAll(".project-open").forEach((btn) => {
    btn.addEventListener("click", () => openProject(btn.dataset));
  });
}

function renderCategoryBody(cat) {
  if (cat.subjects?.length) {
    return `<div class="subjects-grid">${cat.subjects.map((s) => renderSubjectBlock(s)).join("")}</div>`;
  }

  const cards = (cat.projects ?? [])
    .map((proj) => renderProjectCard(proj, cat.id))
    .join("");

  return `<div class="project-grid">${cards || '<p class="empty-state">Пока нет работ в этой категории.</p>'}</div>`;
}

function renderSubjectBlock(subject) {
  const meta = formatCourseMeta(subject);
  const linkSource = subject.link ?? subject.labs?.[0];

  if (linkSource) {
    const { type, url, label } = resolveWorkLink(linkSource);
    return `
    <article class="subject-block subject-block--folder">
      <h4 class="subject-title">${escapeHtml(subject.title)}</h4>
      ${meta ? `<p class="subject-meta">${escapeHtml(meta)}</p>` : ""}
      ${subject.description ? `<p class="subject-desc">${escapeHtml(subject.description)}</p>` : ""}
      <div class="project-actions">
        <button
          type="button"
          class="btn btn-primary btn-sm project-open"
          data-title="${escapeAttr(subject.title)}"
          data-type="${escapeAttr(type)}"
          data-url="${escapeAttr(url)}"
        >Открыть папку</button>
        <span class="link-type-badge">${escapeHtml(label)}</span>
      </div>
    </article>`;
  }

  const labs = subject.labs ?? [];
  const labItems = labs.length
    ? labs
        .map((lab) => {
          const { type, url, label } = resolveWorkLink(lab);
          return `
            <li class="lab-item">
              <span class="lab-item-title">${escapeHtml(lab.title)}</span>
              <div class="lab-item-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-sm project-open"
                  data-title="${escapeAttr(lab.title)}"
                  data-type="${escapeAttr(type)}"
                  data-url="${escapeAttr(url)}"
                >Открыть</button>
                <span class="link-type-badge">${escapeHtml(label)}</span>
              </div>
            </li>`;
        })
        .join("")
    : '<li class="lab-item lab-item--empty"><span class="lab-item-title">Нет ссылки на материалы</span></li>';

  return `
    <article class="subject-block">
      <header class="subject-header">
        <h4 class="subject-title">${escapeHtml(subject.title)}</h4>
        ${meta ? `<p class="subject-meta">${escapeHtml(meta)}</p>` : ""}
        ${subject.description ? `<p class="subject-desc">${escapeHtml(subject.description)}</p>` : ""}
      </header>
      <ul class="lab-list" aria-label="Материалы: ${escapeAttr(subject.title)}">
        ${labItems}
      </ul>
    </article>`;
}

function formatCourseMeta(item) {
  const parts = [];
  if (item.course) parts.push(item.course);
  if (item.semester) parts.push(item.semester);
  return parts.join(" · ");
}

function pluralLabs(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "лабораторных";
  if (mod10 === 1) return "лабораторная";
  if (mod10 >= 2 && mod10 <= 4) return "лабораторные";
  return "лабораторных";
}

function renderProjectCard(project, categoryId) {
  const { type, url, label } = resolveWorkLink(project);
  const meta = formatCourseMeta(project);

  return `
    <article class="project-card" data-category="${escapeAttr(categoryId)}">
      <h4>${escapeHtml(project.title)}</h4>
      ${meta ? `<p class="project-meta">${escapeHtml(meta)}</p>` : ""}
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
          data-url="${escapeAttr(url)}"
        >Открыть папку</button>
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
  const { title } = dataset;
  const link = resolveWorkLink({
    link: { type: dataset.type, url: dataset.url },
  });

  if (!link.url || link.url === "#") return;

  if (link.openInNewTab) {
    window.open(link.url, "_blank", "noopener,noreferrer");
    return;
  }

  const embedType = link.previewType;
  const embedUrl = resolveEmbedUrl(embedType, link.previewUrl);
  viewerTitle.textContent = title ?? "Просмотр";
  viewerOpen.href = link.url;
  viewerOpen.hidden = false;

  if (embedType === "pdf") {
    viewerDownload.href = link.previewUrl;
    viewerDownload.hidden = false;
  } else {
    viewerDownload.hidden = true;
  }

  viewerBody.innerHTML = `<iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(title ?? "Документ")}" allow="fullscreen"></iframe>`;
  viewer.showModal();
}

/** @param {{ link?: { type?: string, url?: string }, type?: string, url?: string }} item */
function resolveWorkLink(item) {
  const linkObj = item.link ?? {};
  const url = String(linkObj.url ?? item.url ?? "#").trim();
  let type = linkObj.type ?? item.type;

  if (!type && url !== "#") type = detectLinkType(url);
  if (!type) type = "google-doc";

  const rawUrl = type === "github" ? toGitHubRawUrl(url) : url;
  const isPdf = type === "pdf" || (type === "github" && isPdfUrl(rawUrl));
  const openInNewTab =
    type === "external" || isDriveFolder(url) || (type === "github" && !isPdf);
  const previewType = isPdf ? "pdf" : type;
  const previewUrl = type === "github" && isPdf ? rawUrl : url;
  let label = LINK_LABELS[type] ?? type;
  if (/github\.com\/.*\/tree\//i.test(url)) label = "Папка на GitHub";

  return { type, url, label, previewType, previewUrl, openInNewTab, isPdf };
}

function detectLinkType(url) {
  if (/github\.com\/.*\/tree\//i.test(url)) return "external";
  if (/docs\.google\.com\/document/i.test(url)) return "google-doc";
  if (/drive\.google\.com/i.test(url)) return "google-drive";
  if (/github\.com\/.*\/blob\//i.test(url) || /raw\.githubusercontent\.com/i.test(url)) {
    return "github";
  }
  if (!/^https?:\/\//i.test(url)) return "pdf";
  if (isPdfUrl(url)) return "pdf";
  return "external";
}

function isPdfUrl(url) {
  return /\.pdf(\?|#|$)/i.test(url);
}

function toGitHubRawUrl(url) {
  if (/raw\.githubusercontent\.com/i.test(url)) return url;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:\?.*)?$/i);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
  return url;
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
