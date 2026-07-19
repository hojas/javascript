#!/usr/bin/env python3
"""Build script for converting javascript.info markdown to static HTML site"""

import os
import re
import shutil
from pathlib import Path
import markdown
from markdown.extensions.toc import TocExtension


def convert_smart_blocks(content):
    """Convert smart/warn blocks to HTML details/summary"""
    # Pattern for ```smart header="..." or ```warn header="..."
    pattern = r'(`{2,4})(?:smart|warn)\s+header="([^"]*)"([\s\S]*?)\1'

    def replace_block(match):
        header = match.group(2)
        body = match.group(3).strip()
        # Convert backticks in header to code tags
        header = re.sub(r'`([^`]+)`', r'<code>\1</code>', header)
        return f'<details class="info"><summary>{header}</summary>\n\n{body}\n\n</details>'

    return re.sub(pattern, replace_block, content)


def convert_html_run_blocks(content):
    """Convert html run blocks to static HTML code blocks"""
    pattern = r'```html\s+(?:run\s+)?(?:autorun\s+)?(?:height=\d+\s*)?(?:no-beautify\s*)?\n([\s\S]*?)```'

    def replace_block(match):
        code = match.group(1).strip()
        return f'```html\n{code}\n```'

    return re.sub(pattern, replace_block, content)


def convert_js_run_blocks(content):
    """Convert js run blocks to static JS code blocks"""
    pattern = r'```js\s+run\s*\n([\s\S]*?)```'

    def replace_block(match):
        code = match.group(1).strip()
        return f'```javascript\n{code}\n```'

    return re.sub(pattern, replace_block, content)


def remove_yaml_frontmatter(content):
    """Remove YAML frontmatter from markdown files"""
    pattern = r'^---\n[\s\S]*?\n---\n'
    return re.sub(pattern, '', content, count=1)


def get_html_template(title, content, nav_html=''):
    """Generate HTML template"""
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - 现代 JavaScript 教程</title>
    <style>
        :root {{
            --color-bg: #f8f9fa;
            --color-surface: #ffffff;
            --color-text: #1a1a2e;
            --color-text-secondary: #6c757d;
            --color-accent: #3a86ff;
            --color-accent-hover: #2667cc;
            --color-border: #e0e0e0;
            --radius: 8px;
            --shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            --max-width: 900px;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--color-bg);
            color: var(--color-text);
            line-height: 1.7;
            min-height: 100vh;
        }}

        .container {{
            max-width: var(--max-width);
            margin: 0 auto;
            padding: 2rem 1.5rem;
        }}

        header {{
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow);
        }}

        header .container {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1.5rem;
        }}

        .logo a {{
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--color-accent);
            text-decoration: none;
        }}

        nav {{
            display: flex;
            gap: 1.5rem;
        }}

        nav a {{
            color: var(--color-text-secondary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }}

        nav a:hover,
        nav a.active {{
            color: var(--color-accent);
        }}

        .content {{
            background: var(--color-surface);
            border-radius: var(--radius);
            padding: 2rem;
            margin-top: 2rem;
            box-shadow: var(--shadow);
        }}

        .content h1 {{
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            color: var(--color-text);
            border-bottom: 3px solid var(--color-accent);
            padding-bottom: 0.5rem;
        }}

        .content h2 {{
            font-size: 1.6rem;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: var(--color-text);
        }}

        .content h3 {{
            font-size: 1.3rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
        }}

        .content p {{
            margin-bottom: 1rem;
        }}

        .content a {{
            color: var(--color-accent);
            text-decoration: none;
        }}

        .content a:hover {{
            text-decoration: underline;
        }}

        .content ul, .content ol {{
            margin-bottom: 1rem;
            padding-left: 2rem;
        }}

        .content li {{
            margin-bottom: 0.5rem;
        }}

        .content pre {{
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: var(--radius);
            overflow-x: auto;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            line-height: 1.5;
        }}

        .content code {{
            background: #f0f0f0;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9em;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }}

        .content pre code {{
            background: none;
            padding: 0;
        }}

        .content blockquote {{
            border-left: 4px solid var(--color-accent);
            padding: 1rem;
            margin-bottom: 1rem;
            background: #f8f9fa;
            border-radius: 0 var(--radius) var(--radius) 0;
        }}

        .content img {{
            max-width: 100%;
            height: auto;
            border-radius: var(--radius);
        }}

        .content table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }}

        .content th, .content td {{
            padding: 0.75rem;
            border: 1px solid var(--color-border);
            text-align: left;
        }}

        .content th {{
            background: #f8f9fa;
            font-weight: 600;
        }}

        details.info {{
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            margin-bottom: 1rem;
            padding: 1rem;
        }}

        details.info summary {{
            font-weight: 600;
            cursor: pointer;
            color: var(--color-accent);
        }}

        details.info[open] summary {{
            margin-bottom: 1rem;
        }}

        footer {{
            text-align: center;
            margin-top: 3rem;
            padding: 2rem 0;
            color: var(--color-text-secondary);
            font-size: 0.9rem;
            border-top: 1px solid var(--color-border);
        }}

        footer a {{
            color: var(--color-accent);
            text-decoration: none;
        }}

        @media (max-width: 768px) {{
            .container {{
                padding: 1rem;
            }}

            header .container {{
                flex-direction: column;
                gap: 1rem;
            }}

            nav {{
                flex-wrap: wrap;
                justify-content: center;
            }}

            .content {{
                padding: 1.5rem;
            }}

            .content h1 {{
                font-size: 1.8rem;
            }}
        }}
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="logo"><a href="/javascript/">现代 JavaScript 教程</a></div>
            <nav>
                <a href="/javascript/">首页</a>
                <a href="/javascript/1-js/">JavaScript</a>
                <a href="/javascript/2-ui/">浏览器</a>
                <a href="/javascript/5-network/">网络</a>
            </nav>
        </div>
    </header>
    <main class="container">
        <div class="content">
            {content}
        </div>
    </main>
    <footer>
        <div class="container">
            <p>本教程为 <a href="https://reactjs.org">React 官方文档</a> 与 <a href="https://developer.mozilla.org/zh-CN/">MDN</a> 共同推荐的前端教程</p>
            <p style="margin-top: 0.5rem;">原始内容来自 <a href="https://javascript.info">javascript.info</a></p>
        </div>
    </footer>
</body>
</html>'''


def get_index_template():
    """Generate index.html template"""
    return '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>现代 JavaScript 教程中文版</title>
    <style>
        :root {
            --color-bg: #f8f9fa;
            --color-surface: #ffffff;
            --color-text: #1a1a2e;
            --color-text-secondary: #6c757d;
            --color-accent: #3a86ff;
            --color-accent-hover: #2667cc;
            --radius: 12px;
            --shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--color-bg);
            color: var(--color-text);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
        }

        header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 3rem 0;
        }

        h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 800;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--color-accent), #8338ec);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            font-size: 1.2rem;
            color: var(--color-text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .card {
            background: var(--color-surface);
            border-radius: var(--radius);
            padding: 1.5rem;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .card-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--color-accent), #8338ec);
            color: white;
            border-radius: 50%;
            font-weight: 700;
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }

        .card h2 {
            font-size: 1.3rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }

        .card p {
            color: var(--color-text-secondary);
            font-size: 0.95rem;
        }

        footer {
            text-align: center;
            margin-top: 4rem;
            padding: 2rem 0;
            color: var(--color-text-secondary);
            font-size: 0.9rem;
        }

        footer a {
            color: var(--color-accent);
            text-decoration: none;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }

            header {
                padding: 2rem 0;
            }

            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>现代 JavaScript 教程</h1>
            <p class="subtitle">从入门到进阶的完整 JavaScript 学习指南，持续更新，永久免费</p>
        </header>

        <div class="grid">
            <a href="1-js/" class="card">
                <div class="card-number">1</div>
                <h2>JavaScript 语言</h2>
                <p>JavaScript 核心语言特性，从基础到高级</p>
            </a>

            <a href="2-ui/" class="card">
                <div class="card-number">2</div>
                <h2>浏览器：文档、事件、接口</h2>
                <p>DOM 操作、事件处理、UI 交互</p>
            </a>

            <a href="3-frames-and-windows/" class="card">
                <div class="card-number">3</div>
                <h2>框架与窗口</h2>
                <p>弹窗、跨窗口通信、点击劫持</p>
            </a>

            <a href="4-binary/" class="card">
                <div class="card-number">4</div>
                <h2>二进制数据，文件</h2>
                <p>ArrayBuffer、Blob、File API</p>
            </a>

            <a href="5-network/" class="card">
                <div class="card-number">5</div>
                <h2>网络请求</h2>
                <p>Fetch API、WebSocket、SSE</p>
            </a>

            <a href="6-data-storage/" class="card">
                <div class="card-number">6</div>
                <h2>数据存储</h2>
                <p>Cookie、LocalStorage、IndexedDB</p>
            </a>

            <a href="7-animation/" class="card">
                <div class="card-number">7</div>
                <h2>动画</h2>
                <p>CSS 动画、JavaScript 动画、贝塞尔曲线</p>
            </a>

            <a href="8-web-components/" class="card">
                <div class="card-number">8</div>
                <h2>Web Components</h2>
                <p>自定义元素、Shadow DOM、模板</p>
            </a>

            <a href="9-regular-expressions/" class="card">
                <div class="card-number">9</div>
                <h2>正则表达式</h2>
                <p>正则基础、高级模式、实践应用</p>
            </a>
        </div>

        <footer>
            <p>本教程为 <a href="https://reactjs.org">React 官方文档</a> 与 <a href="https://developer.mozilla.org/zh-CN/">MDN</a> 共同推荐的前端教程</p>
            <p style="margin-top: 0.5rem;">原始内容来自 <a href="https://javascript.info">javascript.info</a></p>
        </footer>
    </div>
</body>
</html>'''


def process_markdown_files(src_dir, dst_dir):
    """Process all markdown files and convert to HTML"""
    src_path = Path(src_dir)
    dst_path = Path(dst_dir)

    # Create destination directory
    if dst_path.exists():
        shutil.rmtree(dst_path)
    dst_path.mkdir(parents=True, exist_ok=True)

    # Copy index.html
    (dst_path / 'index.html').write_text(get_index_template(), encoding='utf-8')

    # Find all markdown files
    count = 0
    for md_file in src_path.rglob('*.md'):
        # Skip certain files
        if md_file.name in ['README.md', 'LICENSE.md', 'AUTHORING.md', 'todo.md', 'css.md']:
            continue
        if '.git' in md_file.parts:
            continue
        if '.github' in md_file.parts:
            continue

        # Read content
        content = md_file.read_text(encoding='utf-8')

        # Remove YAML frontmatter
        content = remove_yaml_frontmatter(content)

        # Convert special blocks
        content = convert_smart_blocks(content)
        content = convert_html_run_blocks(content)
        content = convert_js_run_blocks(content)

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=['toc', 'fenced_code', 'tables', 'attr_list'])
        html_content = md.convert(content)

        # Get title from first h1 or use filename
        title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content)
        title = title_match.group(1) if title_match else md_file.stem

        # Calculate relative path and create HTML file
        rel_path = md_file.relative_to(src_path)
        html_path = dst_path / rel_path.with_suffix('.html')
        html_path.parent.mkdir(parents=True, exist_ok=True)

        # Write HTML file
        html_path.write_text(get_html_template(title, html_content), encoding='utf-8')
        count += 1

    print(f"Processed {count} markdown files from {src_dir} to {dst_dir}")


if __name__ == '__main__':
    process_markdown_files('.', './site')
