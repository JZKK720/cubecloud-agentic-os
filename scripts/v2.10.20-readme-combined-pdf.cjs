// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.20-readme-combined-pdf.cjs -- combine README.md and
// README.zh-CN.md into a single PDF (English section + Simplified
// Chinese section, page break between).
//
// Approach: build one HTML file (GitHub-flavored Markdown styling +
// a divider between EN and ZH), render to PDF via headless Chrome
// (`chrome --headless --print-to-pdf`). No npm install needed;
// Chrome is at a known Windows path.
//
// Output: docs/Cubecloud-README-en-zh.pdf (tracked? optional; see
// .gitignore notes below).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const README_EN = path.join(ROOT, 'README.md');
const README_ZH = path.join(ROOT, 'README.zh-CN.md');
const OUT_PDF = path.join(ROOT, 'docs', 'Cubecloud-README-en-zh.pdf');
const TMP_HTML = path.join(ROOT, '.review-extras', 'pdf-build', 'combined.html');

// Find Chrome (try common paths on Windows).
function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + (process.env.USERNAME || 'joeyz') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Minimal markdown -> HTML (we don't need full GFM for the README;
// the heavy lifting is the structured headings, lists, tables, code
// blocks, and inline code). We use a regex-based pre-processor
// because installing `marked` or `markdown-it` would require npm.
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMd(s) {
  const escaped = escapeHtml(s);
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];

  let inCode = false;
  let codeLang = '';
  let paragraphLines = [];
  let blockquoteLines = [];
  let rawHtmlLines = [];
  let listType = null;
  let listItemLines = [];
  let tableRows = [];
  let inTable = false;

  function renderJoinedLines(items) {
    return inlineMd(items.map((s) => s.trim()).join(' '));
  }

  function flushParagraph() {
    if (!paragraphLines.length) return;
    out.push('<p>' + renderJoinedLines(paragraphLines) + '</p>');
    paragraphLines = [];
  }

  function flushBlockquote() {
    if (!blockquoteLines.length) return;
    out.push('<blockquote><p>' + renderJoinedLines(blockquoteLines) + '</p></blockquote>');
    blockquoteLines = [];
  }

  function flushRawHtml() {
    if (!rawHtmlLines.length) return;
    out.push(rawHtmlLines.join('\n'));
    rawHtmlLines = [];
  }

  function flushListItem() {
    if (!listItemLines.length) return;
    out.push('<li>' + renderJoinedLines(listItemLines) + '</li>');
    listItemLines = [];
  }

  function flushList() {
    if (!listType) return;
    flushListItem();
    out.push('</' + listType + '>');
    listType = null;
  }

  function parseTableRow(line) {
    return line.trim().slice(1, -1).split('|').map((c) => c.trim());
  }

  function flushTable() {
    if (!inTable || tableRows.length < 2) {
      tableRows = [];
      inTable = false;
      return;
    }
    const header = tableRows[0];
    const separator = tableRows[1];
    const aligns = separator.map((c) => {
      const trimmed = c.trim();
      const left = trimmed.startsWith(':');
      const right = trimmed.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      if (left) return 'left';
      return '';
    });

    out.push('<table>');
    out.push('<thead><tr>');
    header.forEach((c, i) => {
      const style = aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '';
      out.push('<th' + style + '>' + inlineMd(c) + '</th>');
    });
    out.push('</tr></thead>');
    out.push('<tbody>');
    for (let r = 2; r < tableRows.length; r++) {
      out.push('<tr>');
      tableRows[r].forEach((c, i) => {
        const style = aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '';
        out.push('<td' + style + '>' + inlineMd(c) + '</td>');
      });
      out.push('</tr>');
    }
    out.push('</tbody></table>');
    tableRows = [];
    inTable = false;
  }

  function flushAll() {
    flushParagraph();
    flushBlockquote();
    flushRawHtml();
    flushList();
    flushTable();
  }

  function isPipeRow(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  }

  function isSeparatorRow(line) {
    return /^[\s\-:|]+$/.test(line.trim());
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (line.startsWith('```')) {
      flushParagraph();
      flushBlockquote();
      flushRawHtml();
      flushList();
      flushTable();
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        out.push('<pre><code class="lang-' + codeLang + '">');
      } else {
        inCode = false;
        out.push('</code></pre>');
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    if (inTable) {
      if (isPipeRow(line)) {
        tableRows.push(parseTableRow(line));
        continue;
      }
      flushTable();
    }

    if (trimmed === '') {
      flushParagraph();
      flushBlockquote();
      flushRawHtml();
      flushList();
      continue;
    }

    if (/^\s*</.test(line) && !/^\s*<code/.test(line)) {
      flushParagraph();
      flushBlockquote();
      flushList();
      flushTable();
      rawHtmlLines.push(line);
      continue;
    }

    if (rawHtmlLines.length) {
      flushRawHtml();
    }

    if (isPipeRow(line) && i + 1 < lines.length && isPipeRow(lines[i + 1]) && isSeparatorRow(lines[i + 1])) {
      flushParagraph();
      flushBlockquote();
      flushList();
      tableRows = [parseTableRow(line), parseTableRow(lines[i + 1])];
      inTable = true;
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushBlockquote();
      flushList();
      flushTable();
      const lvl = heading[1].length;
      out.push('<h' + lvl + '>' + inlineMd(heading[2]) + '</h' + lvl + '>');
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blockquoteLines.push(line.slice(2));
      continue;
    }

    if (trimmed === '---') {
      flushAll();
      out.push('<hr>');
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    const unordered = line.match(/^[\-*]\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      flushBlockquote();
      const nextType = ordered ? 'ol' : 'ul';
      const text = ordered ? ordered[2] : unordered[1];
      if (listType && listType !== nextType) {
        flushList();
      }
      if (!listType) {
        listType = nextType;
        out.push('<' + listType + '>');
      }
      flushListItem();
      listItemLines.push(text);
      continue;
    }

    if (listType && /^\s{2,}\S/.test(line)) {
      listItemLines.push(trimmed);
      continue;
    }

    if (listType) {
      flushList();
    }

    paragraphLines.push(line);
  }

  flushAll();
  return out.join('\n');
}

function buildHtml(enMd, zhMd) {
  const css = `
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #1f2328;
      background: #ffffff;
      font-family: 'Segoe UI', 'Inter', 'Helvetica Neue', Arial,
                   'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
                   'Noto Sans CJK SC', 'Source Han Sans SC', sans-serif;
      font-size: 12pt;
      line-height: 1.62;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-body { width: 100%; }
    .markdown-body {
      max-width: 960px;
      margin: 0 auto;
      padding: 0;
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.25;
      margin: 1.45em 0 0.55em;
      font-weight: 700;
      color: #0f1720;
    }
    h1 {
      font-size: 2em;
      border-bottom: 1px solid #d8dee4;
      padding-bottom: 0.3em;
      margin-top: 0;
    }
    h2 {
      font-size: 1.45em;
      border-bottom: 1px solid #d8dee4;
      padding-bottom: 0.2em;
    }
    h3 { font-size: 1.18em; }
    p { margin: 0.68em 0; }
    ul, ol { margin: 0.7em 0 1em 1.4em; padding: 0; }
    li { margin: 0.32em 0; }
    li > p { margin: 0.15em 0; }
    code {
      background: #f6f8fa;
      padding: 0.12em 0.35em;
      border-radius: 4px;
      font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
      font-size: 0.92em;
    }
    pre {
      background: #f6f8fa;
      padding: 14px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0 1.15em;
      white-space: pre-wrap;
      word-break: break-word;
    }
    pre code { background: transparent; padding: 0; }
    blockquote {
      color: #57606a;
      border-left: 4px solid #d0d7de;
      padding: 0 16px;
      margin: 1em 0;
    }
    blockquote p { margin: 0.4em 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0 1.2em;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #d0d7de;
      padding: 8px 10px;
      vertical-align: top;
      word-break: break-word;
    }
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
    a { color: #0969da; text-decoration: none; }
    img { max-width: 100%; height: auto; }
    p[align="center"] { text-align: center; margin: 0.75em 0; }
    hr { border: none; border-top: 1px solid #d8dee4; margin: 2em 0; }
    .lang-divider {
      page-break-before: always;
      text-align: center;
      margin: 0 0 1.5em;
      padding: 24mm 0 0;
    }
    .lang-divider h1 {
      border: none;
      margin: 0.25em 0 0;
      padding: 0;
    }
    .lang-divider p {
      color: #57606a;
      margin-top: 0.5em;
    }
    .lang-tag {
      display: inline-block;
      padding: 4px 12px;
      background: #0969da;
      color: white;
      border-radius: 16px;
      font-size: 0.85em;
      margin-bottom: 8px;
    }
  `;
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
    + '<title>Cubecloud Agentic-OS \u2014 README (English + Simplified Chinese)</title>\n'
    + '<style>' + css + '</style>\n</head>\n<body>\n'
    + '<main class="pdf-body"><section class="markdown-body">'
    + mdToHtml(enMd)
    + '</section>'
    + '\n<div class="lang-divider"><div class="lang-tag">English \u2192 Simplified Chinese</div>'
    + '<h1>\u4e2d\u6587\u7248\u672c \u00b7 Simplified Chinese</h1>'
    + '<p>The same document follows, translated to Simplified Chinese (zh-CN).</p></div>\n'
    + '<section class="markdown-body">'
    + mdToHtml(zhMd)
    + '</section></main>'
    + '\n</body>\n</html>\n';
}

console.log('  reading README.md and README.zh-CN.md ...');
const enMd = fs.readFileSync(README_EN, 'utf8');
const zhMd = fs.readFileSync(README_ZH, 'utf8');
console.log('    en: ' + enMd.length + ' bytes');
console.log('    zh: ' + zhMd.length + ' bytes');

console.log('  building combined HTML ...');
let html = buildHtml(enMd, zhMd);

// Rewrite relative image paths to absolute file:// URLs so headless Chrome
// can resolve them when rendering the PDF. The HTML is written to
// .review-extras/pdf-build/ but images are referenced relative to the
// repo root (e.g. agent-desktop/previews/welcome.png). Without this
// rewrite, Chrome resolves them against the HTML file location and
// every screenshot is broken in the PDF.
const rootUrl = 'file:///' + ROOT.replace(/\\/g, '/');
html = html.replace(
  /src="(?!https?:\/\/|file:\/\/|data:)([^"]+)"/g,
  (match, relPath) => {
    const absPath = path.resolve(ROOT, relPath).replace(/\\/g, '/');
    return 'src="file:///' + absPath + '"';
  },
);

fs.mkdirSync(path.dirname(TMP_HTML), { recursive: true });
fs.writeFileSync(TMP_HTML, html, 'utf8');
console.log('    html: ' + html.length + ' bytes (written to ' + TMP_HTML + ')');

const chrome = findChrome();
if (!chrome) {
  console.error('  Chrome not found; cannot render PDF');
  process.exit(1);
}
console.log('  chrome: ' + chrome);

console.log('  rendering PDF via headless Chrome ...');
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--print-to-pdf=' + OUT_PDF,
  '--no-pdf-header-footer',
  'file:///' + TMP_HTML.replace(/\\/g, '/'),
];
try {
  execFileSync(chrome, args, { stdio: 'inherit' });
} catch (e) {
  console.error('  Chrome exited with error: ' + e.message);
  process.exit(1);
}

const out = fs.statSync(OUT_PDF);
console.log('  wrote ' + OUT_PDF + ' (' + out.size + ' bytes)');
console.log('  done');
