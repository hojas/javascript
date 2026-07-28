#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { buildNavigation, flattenPages, buildSidebar } from './lib/navigation.mjs';
import { parseMarkdown, extractTitle } from './lib/markdown.mjs';
import { renderPage } from './lib/template.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT_DIR = path.join(ROOT, 'dist');

// Section slug mapping (matching zh.javascript.info URL structure)
const SECTION_SLUGS = {
  '1-js': 'js',
  '2-ui': 'ui',
  '3-frames-and-windows': 'frames-and-windows',
  '4-binary': 'binary',
  '5-network': 'network',
  '6-data-storage': 'data-storage',
  '7-animation': 'animation',
  '8-web-components': 'web-components',
  '9-regular-expressions': 'regular-expressions',
};

/**
 * Clean output directory
 */
function cleanDist() {
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * Convert a source file path to a slug-based output path
 * e.g., 1-js/02-first-steps/04-variables/image.svg → js/first-steps/variables/image.svg
 */
function sourcePathToSlugPath(filePath) {
  const parts = filePath.split(path.sep);
  const sectionDir = parts[0];
  const sectionSlug = SECTION_SLUGS[sectionDir];
  if (!sectionSlug) return null;

  const rest = parts.slice(1).map(p => {
    // Strip numeric prefix from directory names, but keep file names as-is
    if (p.includes('.')) return p; // It's a file
    return p.replace(/^\d+-/, '');
  });

  return path.join(sectionSlug, ...rest);
}

/**
 * Copy static assets (styles, images, .view directories)
 */
function copyStaticAssets() {
  console.log('📦 Copying static assets...');

  // Copy styles
  const stylesDir = path.join(ROOT, 'styles');
  if (fs.existsSync(stylesDir)) {
    fs.cpSync(stylesDir, path.join(OUT_DIR, 'styles'), { recursive: true });
  }

  // Copy images from content directories (with slug-based paths)
  const imageFiles = glob.sync('**/*.{svg,png,jpg,jpeg,gif}', {
    cwd: ROOT,
    ignore: ['node_modules/**', 'dist/**', 'styles/**', 'script/**', '.git/**', '.github/**'],
  });

  let imgCount = 0;
  for (const img of imageFiles) {
    const src = path.join(ROOT, img);
    const slugPath = sourcePathToSlugPath(img);
    if (!slugPath) continue;
    const dest = path.join(OUT_DIR, slugPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    imgCount++;
  }

  // Copy .view directories (with slug-based paths)
  const viewDirs = glob.sync('**/*.view/**', {
    cwd: ROOT,
    ignore: ['node_modules/**', 'dist/**', 'styles/**', 'script/**', '.git/**', '.github/**'],
  });

  let viewCount = 0;
  for (const viewFile of viewDirs) {
    const src = path.join(ROOT, viewFile);
    if (!fs.statSync(src).isFile()) continue;
    const slugPath = sourcePathToSlugPath(viewFile);
    if (!slugPath) continue;
    const dest = path.join(OUT_DIR, slugPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    viewCount++;
  }

  console.log(`  Copied ${imgCount} images and ${viewCount} view files`);
}

/**
 * Convert a content file path to an output URL path
 * e.g., 1-js/02-first-steps/04-variables/article.md → /js/first-steps/variables/
 */
function contentPathToUrl(filePath) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);

  // Remove section dir prefix and map to slug
  const sectionDir = parts[0];
  const sectionSlug = SECTION_SLUGS[sectionDir];
  if (!sectionSlug) return null;

  // Remove file name
  const dirParts = parts.slice(1, -1);

  // Remove numeric prefixes from directory names
  const urlParts = dirParts.map(p => p.replace(/^\d+-/, ''));

  return `/${sectionSlug}/${urlParts.join('/')}`;
}

/**
 * Find all content pages
 */
function findContentPages() {
  const pages = [];

  // Find all markdown files
  const mdFiles = glob.sync('**/{index,article,task,solution}.md', {
    cwd: ROOT,
    ignore: ['node_modules/**', 'dist/**', 'styles/**', 'script/**', '.git/**', '.github/**'],
  });

  for (const file of mdFiles) {
    const fullPath = path.join(ROOT, file);
    const urlPath = contentPathToUrl(fullPath);
    if (!urlPath) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const title = extractTitle(content);
    const fileName = path.basename(file, '.md');

    // Determine page type
    let type = 'article';
    if (fileName === 'index') type = 'index';
    else if (fileName === 'task') type = 'task';
    else if (fileName === 'solution') type = 'solution';

    // For solution pages, append /solution to URL
    let pageUrl = urlPath;
    if (type === 'solution') {
      pageUrl = urlPath + '/solution';
    } else if (type === 'task') {
      // Tasks are typically in their own subdirectory already
      pageUrl = urlPath;
    }

    pages.push({
      file: fullPath,
      url: pageUrl,
      title,
      type,
      content,
    });
  }

  return pages;
}

/**
 * Build a flat page map for cross-references
 */
function buildPageMap(pages) {
  const map = new Map();
  for (const page of pages) {
    // Map by slug (last part of URL)
    const slug = page.url.split('/').filter(Boolean).pop();
    if (slug && !map.has(slug)) {
      map.set(slug, { title: page.title, slug: page.url });
    }
  }
  return map;
}

/**
 * Build section index pages
 */
function buildSectionIndexPages(navigation) {
  const pages = [];

  for (const section of navigation) {
    const sectionSlug = Object.entries(SECTION_SLUGS).find(([_, v]) => `/${v}` === section.slug)?.[0];
    if (!sectionSlug) continue;

    const lessonsList = section.children.map(chapter =>
      `<li class="lessons-list__lesson"><a class="lessons-list__link" href="${chapter.slug}">${chapter.title}</a></li>`
    ).join('\n');

    const content = `<p>${section.title}</p>\n<div class="lessons-list"><ol class="lessons-list__lessons">\n${lessonsList}\n</ol></div>`;

    // Build sidebar for this section
    const sidebar = section.children.map(ch => ({
      title: ch.title,
      slug: ch.slug,
      children: ch.children.map(topic => ({
        title: topic.title,
        slug: topic.slug,
        children: (topic.children || []).map(ex => ({
          title: ex.title,
          slug: ex.slug,
        })),
      })),
    }));

    pages.push({
      url: section.slug,
      title: section.title,
      html: renderPage({
        title: section.title,
        content,
        slug: section.slug,
        sidebar,
        breadcrumbs: [{ title: '教程', slug: '/' }],
        sectionTitle: section.title,
        isIndex: true,
      }),
    });
  }

  return pages;
}

/**
 * Build homepage
 */
function buildHomePage(navigation) {
  const sectionsHtml = navigation.map(section => {
    const chapters = section.children.map(ch =>
      `<li><a href="${ch.slug}">${ch.title}</a></li>`
    ).join('\n');

    return `
    <div class="home-section">
      <h2><a href="${section.slug}">${section.title}</a></h2>
      <ul>${chapters}</ul>
    </div>`;
  }).join('\n');

  return renderPage({
    title: '现代 JavaScript 教程中文版',
    content: `<p>本教程为 React 官方文档与 MDN 共同推荐的前端教程。</p>${sectionsHtml}`,
    slug: '/',
    isIndex: true,
    description: '现代 JavaScript 教程中文版，React 官方文档与 MDN 共同推荐的前端教程。',
  });
}

/**
 * Main build function
 */
async function build() {
  console.log('🚀 Building zh.javascript.info static site...\n');

  // 1. Clean
  cleanDist();

  // 2. Copy static assets
  copyStaticAssets();

  // Add .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  // 3. Build navigation
  console.log('\n📂 Scanning content...');
  const navigation = buildNavigation(ROOT);
  console.log(`  Found ${navigation.length} sections`);

  // 4. Find all content pages
  const pages = findContentPages();
  console.log(`  Found ${pages.length} content pages`);

  // 5. Build page map for cross-references
  const pageMap = buildPageMap(pages);

  // 6. Flatten navigation for prev/next
  const flatNav = flattenPages(navigation);

  // 7. Build homepage
  console.log('\n🏗️  Building pages...');
  const homepageHtml = buildHomePage(navigation);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), homepageHtml);
  console.log('  Built: / (homepage)');

  // 8. Build section index pages
  const sectionPages = buildSectionIndexPages(navigation);
  for (const page of sectionPages) {
    const outPath = path.join(OUT_DIR, page.url, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, page.html);
    console.log(`  Built: ${page.url}`);
  }

  // 9. Build content pages
  let builtCount = 0;
  for (const page of pages) {
    // Parse markdown to HTML
    const html = parseMarkdown(page.content, { pageMap });

    // Find section for sidebar
    const urlParts = page.url.split('/').filter(Boolean);
    const sectionSlug = urlParts[0];
    const section = navigation.find(s => s.slug === `/${sectionSlug}`);

    // Build sidebar
    const sidebar = section ? section.children.map(ch => ({
      title: ch.title,
      slug: ch.slug,
      children: ch.children.map(topic => ({
        title: topic.title,
        slug: topic.slug,
        active: page.url === topic.slug || page.url.startsWith(topic.slug + '/'),
        children: (topic.children || []).map(ex => ({
          title: ex.title,
          slug: ex.slug,
          active: page.url === ex.slug,
        })),
      })),
    })) : [];

    // Build breadcrumbs
    const breadcrumbs = [{ title: '教程', slug: '/' }];
    if (section) {
      breadcrumbs.push({ title: section.title, slug: section.slug });
    }
    if (urlParts.length >= 2) {
      const chapter = section?.children.find(c => c.slug === `/${sectionSlug}/${urlParts[1]}`);
      if (chapter && page.url !== chapter.slug) {
        breadcrumbs.push({ title: chapter.title, slug: chapter.slug });
      }
    }

    // Find prev/next
    const navIndex = flatNav.findIndex(n => n.slug === page.url || page.url.startsWith(n.slug + '/'));
    let prevPage = null;
    let nextPage = null;

    // For task/solution pages, find prev/next among siblings
    if (page.type === 'task' || page.type === 'solution') {
      const parentUrl = page.url.replace(/\/solution$/, '').replace(/\/[^\/]+$/, '');
      const siblings = flatNav.filter(n => n.slug.startsWith(parentUrl) && n.slug !== page.url);
      // Don't set prev/next for exercises
    } else {
      if (navIndex > 0) prevPage = flatNav[navIndex - 1];
      if (navIndex < flatNav.length - 1) nextPage = flatNav[navIndex + 1];
    }

    // Render page
    const pageHtml = renderPage({
      title: page.title,
      content: html,
      slug: page.url,
      sidebar,
      breadcrumbs,
      prevPage,
      nextPage,
      sectionTitle: section?.title,
      description: page.title ? `${page.title} - 现代 JavaScript 教程` : '',
    });

    // Write output
    const outPath = path.join(OUT_DIR, page.url, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pageHtml);
    builtCount++;
  }

  console.log(`\n✅ Built ${builtCount} content pages + ${sectionPages.length} section pages + 1 homepage`);
  console.log(`📁 Output: ${OUT_DIR}`);
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
