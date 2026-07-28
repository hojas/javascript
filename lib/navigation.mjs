import fs from 'node:fs';
import path from 'node:path';

// Top-level section metadata
const SECTIONS = [
  { dir: '1-js', title: 'JavaScript 语言', slug: 'js' },
  { dir: '2-ui', title: '浏览器：文档、事件、接口', slug: 'ui' },
  { dir: '3-frames-and-windows', title: '框架和窗口', slug: 'frames-and-windows' },
  { dir: '4-binary', title: '二进制数据', slug: 'binary' },
  { dir: '5-network', title: '网络请求', slug: 'network' },
  { dir: '6-data-storage', title: '数据存储', slug: 'data-storage' },
  { dir: '7-animation', title: '动画', slug: 'animation' },
  { dir: '8-web-components', title: 'Web Components', slug: 'web-components' },
  { dir: '9-regular-expressions', title: '正则表达式', slug: 'regular-expressions' },
];

/**
 * Extract title from first # heading in a markdown file
 */
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Skip YAML frontmatter
    let body = content;
    if (body.startsWith('importance:') || body.match(/^---\n/)) {
      const end = body.indexOf('\n---\n');
      if (end !== -1) body = body.slice(end + 4);
    }
    const match = body.match(/^#\s+(.+)/m);
    return match ? match[1].replace(/\[#.*?\]/, '').trim() : null;
  } catch {
    return null;
  }
}

/**
 * Extract description from content after first heading
 */
function extractDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let body = content;
    if (body.startsWith('importance:') || body.match(/^---\n/)) {
      const end = body.indexOf('\n---\n');
      if (end !== -1) body = body.slice(end + 4);
    }
    // Get text after first heading, skip empty lines
    const lines = body.split('\n');
    let foundHeading = false;
    for (const line of lines) {
      if (!foundHeading) {
        if (line.match(/^#\s+/)) { foundHeading = true; }
        continue;
      }
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('![')) {
        return trimmed.slice(0, 160);
      }
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Build navigation tree from directory structure
 */
export function buildNavigation(rootDir) {
  const tree = [];

  for (const section of SECTIONS) {
    const sectionDir = path.join(rootDir, section.dir);
    if (!fs.existsSync(sectionDir)) continue;

    const sectionNode = {
      title: section.title,
      slug: `/${section.slug}`,
      dir: sectionDir,
      children: [],
    };

    // Read section index
    const sectionIndex = path.join(sectionDir, 'index.md');
    if (fs.existsSync(sectionIndex)) {
      const title = extractTitle(sectionIndex);
      if (title) sectionNode.title = title;
    }

    // Discover chapters (second-level directories)
    const chapterDirs = fs.readdirSync(sectionDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d+-/.test(d.name))
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/^(\d+)/)[1]);
        const numB = parseInt(b.name.match(/^(\d+)/)[1]);
        return numA - numB;
      });

    for (const chapterDir of chapterDirs) {
      const chapterPath = path.join(sectionDir, chapterDir.name);
      const urlSlug = chapterDir.name.replace(/^\d+-/, '');
      const chapterNode = {
        title: urlSlug,
        slug: `/${section.slug}/${urlSlug}`,
        dir: chapterPath,
        children: [],
      };

      // Read chapter index
      const chapterIndex = path.join(chapterPath, 'index.md');
      if (fs.existsSync(chapterIndex)) {
        const title = extractTitle(chapterIndex);
        if (title) chapterNode.title = title;
      }

      // Discover topics (third-level directories)
      const topicDirs = fs.readdirSync(chapterPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && /^\d+-/.test(d.name))
        .sort((a, b) => {
          const numA = parseInt(a.name.match(/^(\d+)/)[1]);
          const numB = parseInt(b.name.match(/^(\d+)/)[1]);
          return numA - numB;
        });

      for (const topicDir of topicDirs) {
        const topicPath = path.join(chapterPath, topicDir.name);
        const topicSlug = topicDir.name.replace(/^\d+-/, '');
        const topicNode = {
          title: topicSlug,
          slug: `/${section.slug}/${urlSlug}/${topicSlug}`,
          dir: topicPath,
          children: [],
        };

        // Read topic index or article
        const topicIndex = path.join(topicPath, 'index.md');
        const topicArticle = path.join(topicPath, 'article.md');
        const contentFile = fs.existsSync(topicIndex) ? topicIndex :
                           fs.existsSync(topicArticle) ? topicArticle : null;
        if (contentFile) {
          const title = extractTitle(contentFile);
          if (title) topicNode.title = title;
        }

        // Discover exercises (fourth-level directories)
        const exerciseDirs = fs.readdirSync(topicPath, { withFileTypes: true })
          .filter(d => d.isDirectory() && /^\d+-/.test(d.name))
          .sort((a, b) => {
            const numA = parseInt(a.name.match(/^(\d+)/)[1]);
            const numB = parseInt(b.name.match(/^(\d+)/)[1]);
            return numA - numB;
          });

        for (const exDir of exerciseDirs) {
          const exPath = path.join(topicPath, exDir.name);
          const exSlug = exDir.name.replace(/^\d+-/, '');
          const exTask = path.join(exPath, 'task.md');
          const exArticle = path.join(exPath, 'article.md');
          const exFile = fs.existsSync(exTask) ? exTask :
                        fs.existsSync(exArticle) ? exArticle : null;
          if (exFile) {
            const title = extractTitle(exFile);
            topicNode.children.push({
              title: title || exSlug,
              slug: `/${section.slug}/${urlSlug}/${topicSlug}/${exSlug}`,
              dir: exPath,
              type: fs.existsSync(exTask) ? 'task' : 'article',
              children: [],
            });
          }
        }

        if (contentFile) {
          chapterNode.children.push(topicNode);
        }
      }

      sectionNode.children.push(chapterNode);
    }

    tree.push(sectionNode);
  }

  return tree;
}

/**
 * Flatten navigation tree into a list of pages
 */
export function flattenPages(tree) {
  const pages = [];

  function walk(nodes, parentSlugs) {
    for (const node of nodes) {
      pages.push({
        title: node.title,
        slug: node.slug,
        dir: node.dir,
        type: node.type || 'article',
        parentSlugs,
      });
      if (node.children?.length) {
        walk(node.children, [...parentSlugs, { title: node.title, slug: node.slug }]);
      }
    }
  }

  walk(tree, []);
  return pages;
}

/**
 * Build sidebar data for a given page
 */
export function buildSidebar(tree, currentSlug) {
  // Find which section the current page belongs to
  for (const section of tree) {
    if (currentSlug.startsWith(section.slug)) {
      return section.children.map(chapter => ({
        title: chapter.title,
        slug: chapter.slug,
        children: chapter.children.map(topic => ({
          title: topic.title,
          slug: topic.slug,
          active: currentSlug === topic.slug || currentSlug.startsWith(topic.slug + '/'),
          children: (topic.children || []).map(ex => ({
            title: ex.title,
            slug: ex.slug,
            active: currentSlug === ex.slug,
          })),
        })),
      }));
    }
  }
  return [];
}
