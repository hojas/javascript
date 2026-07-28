import { Marked } from 'marked';
import hljs from 'highlight.js';

// Custom block types used in the tutorial
const BLOCK_TYPES = ['smart', 'warn', 'compare', 'online', 'offline', 'sandbox'];

/**
 * Process custom tutorial blocks (smart, warn, compare, etc.)
 * These use fenced code blocks with a type name instead of a language
 */
function preprocessCustomBlocks(markdown) {
  let result = markdown;

  // Handle custom blocks: ```smart header="...", ```warn header="...", etc.
  // These can be nested with ```` (4 backticks) when containing code fences
  for (const type of BLOCK_TYPES) {
    // 4-backtick variant (contains inner code fences)
    const quadRegex = new RegExp(
      '````' + type + '([^`]*)\\n([\\s\\S]*?)````',
      'g'
    );
    result = result.replace(quadRegex, (_, attrs, body) => {
      return renderCustomBlock(type, attrs.trim(), body.trim());
    });

    // 3-backtick variant
    const triRegex = new RegExp(
      '```' + type + '([^`]*)\\n([\\s\\S]*?)```',
      'g'
    );
    result = result.replace(triRegex, (_, attrs, body) => {
      return renderCustomBlock(type, attrs.trim(), body.trim());
    });
  }

  return result;
}

function renderCustomBlock(type, attrs, body) {
  const headerMatch = attrs.match(/header="([^"]*)"/);
  const header = headerMatch ? headerMatch[1] : '';

  switch (type) {
    case 'smart':
      return `<div class="important important_smart"><div class="important__header"><span class="important__type">${header || '提示'}</span></div><div class="important__content">${body}</div></div>`;

    case 'warn':
      return `<div class="important important_warn"><div class="important__header"><span class="important__type">${header || '注意'}</span></div><div class="important__content">${body}</div></div>`;

    case 'compare': {
      const plusMatch = attrs.match(/plus="([^"]*)"/);
      const minusMatch = attrs.match(/minus="([^"]*)"/);
      const plusTitle = plusMatch ? plusMatch[1] : '优点';
      const minusTitle = minusMatch ? minusMatch[1] : '缺点';

      const lines = body.split('\n');
      const plusLines = [];
      const minusLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('+ ')) {
          plusLines.push(trimmed.slice(2));
        } else if (trimmed.startsWith('- ')) {
          minusLines.push(trimmed.slice(2));
        }
      }

      const plusHtml = plusLines.map(l => `<li>${l}</li>`).join('\n');
      const minusHtml = minusLines.map(l => `<li>${l}</li>`).join('\n');

      return `<div class="compare"><div class="compare__column compare__plus"><div class="compare__header">${plusTitle}</div><ul>${plusHtml}</ul></div><div class="compare__column compare__minus"><div class="compare__header">${minusTitle}</div><ul>${minusHtml}</ul></div></div>`;
    }

    case 'online':
    case 'offline':
      return `<div class="code-example">${body}</div>`;

    default:
      return `<div class="code-example">${body}</div>`;
  }
}

/**
 * Preprocess info references: <info:slug> → links
 */
function preprocessInfoRefs(markdown, pageMap) {
  return markdown.replace(/<info:([^>]+)>/g, (_, slug) => {
    const page = pageMap.get(slug);
    if (page) {
      return `[${page.title}](${page.slug})`;
    }
    return `[${slug}](/${slug})`;
  });
}

/**
 * Preprocess keyboard key references: `key:KeyName` → badges
 */
function preprocessKeyRefs(markdown) {
  return markdown.replace(/`key:([^`]+)`/g, (_, key) => {
    return `<kbd>${key}</kbd>`;
  });
}

/**
 * Preprocess highlight markers within code blocks
 * The tutorial uses special markers to highlight code portions
 */
function preprocessHighlightMarkers(markdown) {
  // The markers are handled in the code renderer, not here
  return markdown;
}

/**
 * Preprocess iframe and codetabs references
 */
function preprocessEmbeds(markdown, pageDir) {
  // [iframe src="name" height=N]
  markdown = markdown.replace(
    /\[iframe\s+([^\]]+)\]/g,
    (_, attrs) => {
      const srcMatch = attrs.match(/src="([^"]*)"/);
      const heightMatch = attrs.match(/height=(\d+)/);
      const borderMatch = attrs.match(/border="([^"]*)"/);
      const linkMatch = attrs.match(/\blink\b/);

      if (!srcMatch) return '';

      const src = srcMatch[1];
      const height = heightMatch ? heightMatch[1] : '200';
      const border = borderMatch ? borderMatch[1] : '0';

      return `<div class="code-example"><iframe src="${src}.view/index.html" height="${height}" frameborder="${border}" style="width:100%;border:${border === '1' ? '1px solid #ddd' : 'none'}"></iframe>${linkMatch ? `<a href="${src}.view/index.html" target="_blank">在新窗口中打开</a>` : ''}</div>`;
    }
  );

  // [codetabs src="name" height="N" current="file"]
  markdown = markdown.replace(
    /\[codetabs\s+([^\]]+)\]/g,
    (_, attrs) => {
      const srcMatch = attrs.match(/src="([^"]*)"/);
      const heightMatch = attrs.match(/height="?(\d+)"?/);

      if (!srcMatch) return '';

      const src = srcMatch[1];
      const height = heightMatch ? heightMatch[1] : '200';

      return `<div class="code-example"><iframe src="${src}.view/index.html" height="${height}" frameborder="0" style="width:100%"></iframe></div>`;
    }
  );

  return markdown;
}

/**
 * Preprocess code block modifiers (run, autorun, etc.)
 */
function preprocessCodeModifiers(markdown) {
  // Strip modifiers from code fences: ```js run → ```js
  markdown = markdown.replace(
    /```(\w+)(?:\s+(?:run|autorun|no-beautify|untrusted|refresh|height=\d+)(?:\s+(?:run|autorun|no-beautify|untrusted|refresh|height=\d+))*)\s*\n/g,
    (_, lang) => '```' + lang + '\n'
  );

  // Remove highlight markers from code blocks
  // These markers like *!* and */!* appear inside code fences
  markdown = markdown.replace(
    /(```[\s\S]*?```)/g,
    (match) => {
      return match.replace(/\*!\*/g, '').replace(/\*\/!\*/g, '');
    }
  );

  return markdown;
}

/**
 * Remove anchor suffixes from headers: ## Title [#anchor] → ## Title
 * But store the anchor as an id
 */
function preprocessAnchors(markdown) {
  return markdown.replace(
    /^(#{1,6})\s+(.+?)\s+\[#([\w-]+)\]\s*$/gm,
    (_, hashes, title, anchor) => `${hashes} ${title} {#${anchor}}`
  );
}

/**
 * Remove YAML frontmatter
 */
function stripFrontmatter(markdown) {
  if (markdown.startsWith('importance:') || markdown.match(/^---\n/)) {
    const end = markdown.indexOf('\n---\n');
    if (end !== -1) {
      return markdown.slice(end + 4);
    }
  }
  return markdown;
}

/**
 * Create configured marked instance
 */
function createMarked() {
  const marked = new Marked();

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  // Track heading IDs for deduplication
  const headingIds = new Map();

  // Custom renderer (marked v12 uses positional arguments)
  const renderer = {
    heading(text, level, raw) {
      // Check for custom id {#anchor}
      const idMatch = text.match(/^(.*?)\s*\{#([\w-]+)\}$/);
      if (idMatch) {
        const id = idMatch[2];
        return `<h${level} id="${id}">${idMatch[1]}</h${level}>\n`;
      }
      // Generate slug from text
      let slug = text
        .toLowerCase()
        .replace(/[^\w一-鿿]+/g, '-')
        .replace(/^-+|-+$/g, '');
      // Deduplicate slugs
      if (headingIds.has(slug)) {
        const count = headingIds.get(slug) + 1;
        headingIds.set(slug, count);
        slug = `${slug}-${count}`;
      } else {
        headingIds.set(slug, 0);
      }
      return `<h${level} id="${slug}">${text}</h${level}>\n`;
    },

    code(text, lang, escaped) {
      // Remove highlight markers from code before highlighting
      let cleanCode = text || '';
      cleanCode = cleanCode.replace(/\*!\*/g, '');
      cleanCode = cleanCode.replace(/\*\/!\*/g, '');

      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(cleanCode, { language: lang }).value;
          return `<div class="code-example"><div class="code-toolbar"><pre><code class="hljs language-${lang}">${highlighted}</code></pre></div></div>`;
        } catch (e) {
          // fall through
        }
      }

      const escapedCode = cleanCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div class="code-example"><div class="code-toolbar"><pre><code>${escapedCode}</code></pre></div></div>`;
    },

    image(href, title, text) {
      // Handle relative image paths
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href}" alt="${text || ''}"${titleAttr} loading="lazy">`;
    },

    link(href, title, text) {
      const titleAttr = title ? ` title="${title}"` : '';

      // External links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },

    table(header, body) {
      return `<div class="table-container"><table>\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table></div>\n`;
    },
  };

  marked.use({ renderer });

  return marked;
}

/**
 * Parse markdown to HTML with all custom extensions
 */
export function parseMarkdown(markdown, { pageMap = new Map(), pageDir = '' } = {}) {
  let processed = stripFrontmatter(markdown);

  // Preprocess custom extensions
  processed = preprocessCustomBlocks(processed);
  processed = preprocessInfoRefs(processed, pageMap);
  processed = preprocessKeyRefs(processed);
  processed = preprocessEmbeds(processed, pageDir);
  processed = preprocessCodeModifiers(processed);
  processed = preprocessAnchors(processed);

  // Parse with marked (create new instance per page to reset heading IDs)
  const marked = createMarked();
  return marked.parse(processed);
}

/**
 * Extract title from markdown
 */
export function extractTitle(markdown) {
  let body = stripFrontmatter(markdown);
  const match = body.match(/^#\s+(.+)/m);
  return match ? match[1].replace(/\[#.*?\]/, '').trim() : '';
}
