/**
 * HTML template matching zh.javascript.info structure
 */

function renderSidebarLinks(items, currentSlug) {
  return items.map(item => {
    const isActive = item.active || currentSlug === item.slug;
    const hasChildren = item.children?.length > 0;

    let html = `<li class="sidebar__navigation-link${isActive ? ' sidebar__navigation-link_active' : ''}">`;
    html += `<a class="sidebar__link" href="${item.slug}">${item.title}</a>`;

    if (hasChildren) {
      html += '<ul class="sidebar__navigation-links">';
      html += renderSidebarLinks(item.children, currentSlug);
      html += '</ul>';
    }

    html += '</li>';
    return html;
  }).join('\n');
}

function renderBreadcrumbs(breadcrumbs) {
  return breadcrumbs.map(bc =>
    `<li class="breadcrumbs__item"><a class="breadcrumbs__link" href="${bc.slug}"><span>${bc.title}</span></a></li>`
  ).join('\n');
}

export function renderPage({
  title,
  content,
  slug,
  sidebar,
  breadcrumbs,
  prevPage,
  nextPage,
  sectionTitle,
  isIndex,
  description,
}) {
  const pageTitle = title ? `${title} — 现代 JavaScript 教程` : '现代 JavaScript 教程中文版';
  const metaDesc = description || '现代 JavaScript 教程中文版，涵盖 JavaScript 语言、浏览器 API、网络请求等前端开发核心知识。';

  const sidebarHtml = sidebar ? `
    <div class="sidebar page__sidebar sidebar sidebar_sticky-footer">
      <button class="sidebar__toggle" data-sidebar-toggle></button>
      <div class="sidebar__inner">
        <div class="sidebar__content">
          <div class="sidebar__section">
            <h4 class="sidebar__section-title">${sectionTitle || ''}</h4>
            <nav class="sidebar__navigation">
              <ul class="sidebar__navigation-links">
                ${renderSidebarLinks(sidebar, slug)}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  const breadcrumbsHtml = breadcrumbs?.length ? `
    <ol class="breadcrumbs">
      <li class="breadcrumbs__item breadcrumbs__item_home">
        <a class="breadcrumbs__link" href="/"><span class="breadcrumbs__hidden-text">教程</span></a>
      </li>
      ${renderBreadcrumbs(breadcrumbs)}
    </ol>
  ` : '';

  const navHtml = (prevPage || nextPage) ? `
    <div class="page__nav-wrap">
      ${prevPage ? `<a class="page__nav page__nav_prev" href="${prevPage.slug}" data-tooltip="${prevPage.title}"><span class="page__nav-text"><span class="page__nav-text-shortcut"></span></span><span class="page__nav-text-alternate">上一节</span></a>` : ''}
      ${nextPage ? `<a class="page__nav page__nav_next" href="${nextPage.slug}" data-tooltip="${nextPage.title}"><span class="page__nav-text"><span class="page__nav-text-shortcut"></span></span><span class="page__nav-text-alternate">下一节</span></a>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes, minimum-scale=1.0">
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="icon" href="/styles/img/favicon/favicon.png">
  <link rel="apple-touch-icon-precomposed" href="/styles/img/favicon/apple-touch-icon-precomposed.png">
  <style>
    /* Supplemental styles for static site */
    :root {
      --color-bg: #fff;
      --color-text: #222;
      --color-text-muted: #666;
      --color-border: #e5e5e5;
      --color-accent: #2b6cb0;
      --color-accent-hover: #2c5282;
      --color-sidebar-bg: #f7f7f7;
      --color-code-bg: #f5f5f5;
      --color-important-smart: #e6f3ff;
      --color-important-warn: #fff3e6;
      --color-important-border-smart: #4a9eff;
      --color-important-border-warn: #ff9800;
    }
    [data-theme="dark"] {
      --color-bg: #1a1a2e;
      --color-text: #e0e0e0;
      --color-text-muted: #aaa;
      --color-border: #333;
      --color-sidebar-bg: #16162a;
      --color-code-bg: #2a2a3e;
      --color-important-smart: #1a2a3e;
      --color-important-warn: #2e2a1a;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.7;
    }
    a { color: var(--color-accent); text-decoration: none; }
    a:hover { color: var(--color-accent-hover); text-decoration: underline; }

    /* Site toolbar */
    .sitetoolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      padding: 0 1.5rem;
      height: 50px;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .sitetoolbar__logo-wrap a { display: flex; align-items: center; }
    .sitetoolbar__logo { height: 28px; width: auto; }
    .sitetoolbar__logo_dark { display: none; }
    [data-theme="dark"] .sitetoolbar__logo_normal:not(.sitetoolbar__logo_dark) { display: none; }
    [data-theme="dark"] .sitetoolbar__logo_dark { display: block; }
    .sitetoolbar__right { margin-left: auto; display: flex; align-items: center; gap: 1rem; }
    .theme-toggle {
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      color: var(--color-text);
      font-size: 14px;
    }

    /* Page layout */
    .page-wrapper {
      display: flex;
      min-height: calc(100vh - 50px);
    }
    .page {
      flex: 1;
      display: flex;
      max-width: 100%;
    }
    .page__inner {
      flex: 1;
      min-width: 0;
    }
    .page__sidebar {
      width: 280px;
      flex-shrink: 0;
    }

    /* Sidebar */
    .sidebar {
      background: var(--color-sidebar-bg);
      border-right: 1px solid var(--color-border);
      padding: 1.5rem 0;
      overflow-y: auto;
      max-height: calc(100vh - 50px);
      position: sticky;
      top: 50px;
    }
    .sidebar__section { padding: 0 1rem; }
    .sidebar__section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem;
      padding: 0 0.5rem;
    }
    .sidebar__navigation { font-size: 14px; }
    .sidebar__navigation-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .sidebar__navigation-link { margin: 0; }
    .sidebar__navigation-link .sidebar__navigation-link { padding-left: 1rem; }
    .sidebar__link {
      display: block;
      padding: 0.35rem 0.5rem;
      color: var(--color-text);
      border-radius: 4px;
      transition: background 0.15s;
    }
    .sidebar__link:hover {
      background: rgba(0,0,0,0.05);
      text-decoration: none;
    }
    [data-theme="dark"] .sidebar__link:hover {
      background: rgba(255,255,255,0.05);
    }
    .sidebar__navigation-link_active > .sidebar__link {
      color: var(--color-accent);
      font-weight: 600;
      background: rgba(43,108,176,0.08);
    }

    /* Main content */
    .main {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem 2.5rem 4rem;
    }
    .main__header { margin-bottom: 2rem; }
    .main__header-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0.5rem 0 0;
      line-height: 1.3;
    }

    /* Breadcrumbs */
    .breadcrumbs {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      font-size: 14px;
      color: var(--color-text-muted);
    }
    .breadcrumbs__item::after { content: '/'; margin-left: 0.25rem; }
    .breadcrumbs__item:last-child::after { content: ''; }
    .breadcrumbs__link { color: var(--color-text-muted); }
    .breadcrumbs__link:hover { color: var(--color-accent); }

    /* Content */
    .content {
      font-size: 16px;
      line-height: 1.75;
    }
    .content h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 2.5rem 0 1rem;
      padding-bottom: 0.3rem;
      border-bottom: 2px solid var(--color-border);
    }
    .content h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 0.75rem;
    }
    .content h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 1.5rem 0 0.5rem;
    }
    .content p { margin: 0.75rem 0; }
    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 1rem 0;
    }
    .content ul, .content ol {
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }
    .content li { margin: 0.35rem 0; }
    .content blockquote {
      margin: 1rem 0;
      padding: 0.5rem 1rem;
      border-left: 4px solid var(--color-accent);
      background: var(--color-sidebar-bg);
      border-radius: 0 4px 4px 0;
    }
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    .content th, .content td {
      border: 1px solid var(--color-border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .content th {
      background: var(--color-sidebar-bg);
      font-weight: 600;
    }
    .table-container { overflow-x: auto; margin: 1rem 0; }

    /* Inline code */
    .content code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      background: var(--color-code-bg);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }

    /* Code blocks */
    .code-example {
      margin: 1rem 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--color-border);
    }
    .code-example pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
      background: var(--color-code-bg);
    }
    .code-example code {
      background: none;
      padding: 0;
      font-size: 14px;
      line-height: 1.6;
    }

    /* Important blocks (smart/warn) */
    .important {
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      border-radius: 6px;
      border-left: 4px solid;
    }
    .important_smart {
      background: var(--color-important-smart);
      border-color: var(--color-important-border-smart);
    }
    .important_warn {
      background: var(--color-important-warn);
      border-color: var(--color-important-border-warn);
    }
    .important__header { margin-bottom: 0.5rem; }
    .important__type {
      font-weight: 700;
      font-size: 0.95rem;
    }

    /* Compare blocks */
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .compare__column {
      padding: 1rem;
      border-radius: 6px;
    }
    .compare__plus {
      background: #e6ffe6;
      border: 1px solid #4caf50;
    }
    .compare__minus {
      background: #ffe6e6;
      border: 1px solid #f44336;
    }
    [data-theme="dark"] .compare__plus { background: #1a2e1a; }
    [data-theme="dark"] .compare__minus { background: #2e1a1a; }
    .compare__header {
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .compare__column ul { padding-left: 1.25rem; margin: 0; }

    /* Kbd */
    kbd {
      display: inline-block;
      padding: 0.1em 0.5em;
      font-family: monospace;
      font-size: 0.85em;
      background: var(--color-code-bg);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.1);
    }

    /* Lessons list */
    .lessons-list__lessons {
      list-style: none;
      padding: 0;
      counter-reset: lesson;
    }
    .lessons-list__lesson {
      counter-increment: lesson;
      margin: 0;
    }
    .lessons-list__link {
      display: block;
      padding: 0.6rem 0.75rem 0.6rem 2.5rem;
      position: relative;
      border-radius: 4px;
      color: var(--color-text);
      transition: background 0.15s;
    }
    .lessons-list__link::before {
      content: counter(lesson) ".";
      position: absolute;
      left: 0.5rem;
      color: var(--color-text-muted);
      font-size: 14px;
    }
    .lessons-list__link:hover {
      background: rgba(0,0,0,0.04);
      text-decoration: none;
    }
    [data-theme="dark"] .lessons-list__link:hover {
      background: rgba(255,255,255,0.04);
    }

    /* Page navigation */
    .page__nav-wrap {
      display: flex;
      justify-content: space-between;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
    }
    .page__nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-accent);
      font-size: 14px;
    }

    /* Footer */
    .page-footer {
      border-top: 1px solid var(--color-border);
      padding: 1.5rem;
      text-align: center;
      font-size: 14px;
      color: var(--color-text-muted);
    }
    .page-footer__list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .page__sidebar { display: none; }
      .main { padding: 1.5rem 1rem 3rem; }
      .compare { grid-template-columns: 1fr; }
    }

    /* Highlight.js overrides */
    .hljs { background: transparent !important; }
  </style>
</head>
<body class="no-icons">
  <div class="page-wrapper page-wrapper_sidebar_on">
    <div class="sitetoolbar sitetoolbar_tutorial">
      <div class="sitetoolbar__logo-wrap">
        <a class="sitetoolbar__link" href="/">
          <img class="sitetoolbar__logo sitetoolbar__logo_normal" src="/styles/img/sitetoolbar__logo_en.svg" width="200" alt="JavaScript.info">
          <img class="sitetoolbar__logo sitetoolbar__logo_normal sitetoolbar__logo_dark" src="/styles/img/sitetoolbar__logo_en-white.svg" width="200" alt="JavaScript.info">
        </a>
      </div>
      <div class="sitetoolbar__right">
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">🌓</button>
      </div>
    </div>

    <div class="page page_sidebar_on">
      <div class="page__inner">
        <main class="main">
          <header class="main__header">
            ${breadcrumbsHtml}
            <h1 class="main__header-title">${title || ''}</h1>
          </header>
          <div class="content">
            ${content}
          </div>
          ${navHtml}
        </main>
      </div>
      ${sidebarHtml}
    </div>
  </div>

  <div class="page-footer">
    <ul class="page-footer__list">
      <li class="page-footer__item">© 2007—2026 Ilya Kantor</li>
      <li class="page-footer__item"><a class="page-footer__link" href="https://javascript.info/about">关于本项目</a></li>
      <li class="page-footer__item"><a class="page-footer__link" href="https://github.com/javascript-tutorial/zh.javascript.info">GitHub</a></li>
    </ul>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    })();
  </script>
</body>
</html>`;
}
