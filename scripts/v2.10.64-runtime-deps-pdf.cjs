// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.64-runtime-deps-pdf.cjs -- render
// docs/handbook/RUNTIME-DEPENDENCIES.md to a single A4 PDF, using the
// same minimal-markdown + headless-Chrome approach as
// scripts/v2.10.20-readme-combined-pdf.cjs (no npm install, no
// extra dep). Outputs:
//   - .review-extras/pdf-build/RUNTIME-DEPENDENCIES.html
//   - .review-extras/pdf-build/RUNTIME-DEPENDENCIES.pdf
//
// The PDF is intentionally written under .review-extras/ so it does
// not pollute the tracked docs/ tree (it is a build artifact, not a
// source doc). The .md source is the canonical file.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC_MD = path.join(ROOT, 'docs', 'handbook', 'RUNTIME-DEPENDENCIES.md');
const OUT_PDF = path.join(ROOT, '.review-extras', 'pdf-build', 'RUNTIME-DEPENDENCIES.pdf');
const TMP_HTML = path.join(ROOT, '.review-extras', 'pdf-build', 'RUNTIME-DEPENDENCIES.html');

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
  let paragraphLines = [];
  let blockquoteLines = [];
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
      const t = c.trim();
      const left = t.startsWith(':');
      const right = t.endsWith(':');
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
    flushList();
    flushTable();
  }
  function isPipeRow(line) {
    const t = line.trim();
    return t.startsWith('|') && t.endsWith('|');
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
      flushList();
      flushTable();
      if (!inCode) {
        inCode = true;
        out.push('<pre><code>');
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
      flushList();
      continue;
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
      if (listType && listType !== nextType) flushList();
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
    if (listType) flushList();
    paragraphLines.push(line);
  }
  flushAll();
  return out.join('\n');
}

function buildHtml(md) {
  const css = `
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #1f2328;
      background: #ffffff;
      font-family: 'Segoe UI', 'Inter', 'Helvetica Neue', Arial,
                   'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
                   'Noto Sans CJK SC', 'Source Han Sans SC', sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-body { width: 100%; }
    .markdown-body { max-width: 960px; margin: 0 auto; padding: 0; }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.25; margin: 1.35em 0 0.5em; font-weight: 700; color: #0f1720;
    }
    h1 { font-size: 1.8em; border-bottom: 1px solid #d8dee4; padding-bottom: 0.3em; margin-top: 0; }
    h2 { font-size: 1.35em; border-bottom: 1px solid #d8dee4; padding-bottom: 0.2em; }
    h3 { font-size: 1.12em; }
    p { margin: 0.6em 0; }
    ul, ol { margin: 0.6em 0 0.9em 1.4em; padding: 0; }
    li { margin: 0.25em 0; }
    li > p { margin: 0.12em 0; }
    code {
      background: #f6f8fa; padding: 0.1em 0.32em; border-radius: 4px;
      font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f6f8fa; padding: 12px 14px; border-radius: 8px;
      overflow-x: auto; margin: 0.9em 0 1.05em;
      white-space: pre-wrap; word-break: break-word;
    }
    pre code { background: transparent; padding: 0; }
    blockquote {
      color: #57606a; border-left: 4px solid #d0d7de;
      padding: 0 14px; margin: 0.9em 0;
    }
    blockquote p { margin: 0.35em 0; }
    table {
      border-collapse: collapse; width: 100%;
      margin: 0.9em 0 1.1em; table-layout: fixed; font-size: 0.93em;
    }
    th, td {
      border: 1px solid #d0d7de; padding: 6px 8px;
      vertical-align: top; word-break: break-word;
    }
    th { background: #f6f8fa; font-weight: 600; }
    a { color: #0969da; text-decoration: none; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid #d8dee4; margin: 1.7em 0; }
  `;
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
    + '<title>Agent Desktop \u2014 Runtime Dependencies and Integration Surfaces</title>\n'
    + '<style>' + css + '</style>\n</head>\n<body>\n'
    + '<main class="pdf-body"><section class="markdown-body">'
    + mdToHtml(md)
    + '</section></main>\n</body>\n</html>\n';
}

console.log('  reading ' + path.relative(ROOT, SRC_MD) + ' ...');
const md = fs.readFileSync(SRC_MD, 'utf8');
console.log('    md: ' + md.length + ' bytes');

console.log('  building HTML ...');
const html = buildHtml(md);
fs.mkdirSync(path.dirname(TMP_HTML), { recursive: true });
fs.writeFileSync(TMP_HTML, html, 'utf8');
console.log('    html: ' + html.length + ' bytes (written to ' + path.relative(ROOT, TMP_HTML) + ')');

const chrome = findChrome();
if (!chrome) {
  console.error('  Chrome not found; cannot render PDF');
  console.error('  expected: C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
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

const stat = fs.statSync(OUT_PDF);
console.log('  PDF: ' + path.relative(ROOT, OUT_PDF) + ' (' + stat.size + ' bytes)');
console.log('done.');
