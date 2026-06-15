const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MD_FILE = path.join(ROOT, 'docs', 'V2.10.57-SURFACE-MESSAGING-MATRIX.md');
const OUT_PDF = path.join(ROOT, 'docs', 'V2.10.57-SURFACE-MESSAGING-MATRIX.pdf');
const TMP_HTML = path.join(ROOT, '.review-extras', 'pdf-build', 'matrix.html');

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
    flushList();
    flushTable();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (line.startsWith('```')) {
      flushAll();
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
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        tableRows.push(parseTableRow(line));
        continue;
      }
      flushTable();
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushAll();
      inTable = true;
      tableRows.push(parseTableRow(line));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushAll();
      out.push('<h1>' + inlineMd(trimmed.slice(2)) + '</h1>');
    } else if (trimmed.startsWith('## ')) {
      flushAll();
      out.push('<h2>' + inlineMd(trimmed.slice(3)) + '</h2>');
    } else if (trimmed.startsWith('### ')) {
      flushAll();
      out.push('<h3>' + inlineMd(trimmed.slice(4)) + '</h3>');
    } else if (trimmed.startsWith('#### ')) {
      flushAll();
      out.push('<h4>' + inlineMd(trimmed.slice(5)) + '</h4>');
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      flushTable();
      const newType = 'ul';
      if (listType && listType !== newType) flushList();
      if (!listType) {
        listType = newType;
        out.push('<' + listType + '>');
      }
      flushListItem();
      listItemLines.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      flushTable();
      const newType = 'ol';
      if (listType && listType !== newType) flushList();
      if (!listType) {
        listType = newType;
        out.push('<' + listType + '>');
      }
      flushListItem();
      listItemLines.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flushAll();
    } else {
      flushList();
      flushTable();
      paragraphLines.push(line);
    }
  }

  flushAll();
  return out.join('\n');
}

function buildHtml(body) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>V2.10.57 Surface Messaging Matrix</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.45; color: #24292f; max-width: 900px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 22px; border-bottom: 2px solid #d0d7de; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #d0d7de; padding-bottom: 6px; }
  h3 { font-size: 13px; margin-top: 20px; }
  h4 { font-size: 12px; margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10px; }
  th, td { border: 1px solid #d0d7de; padding: 5px 7px; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; background: #f6f8fa; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 6px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  ul, ol { padding-left: 22px; }
  li { margin: 3px 0; }
  a { color: #0969da; text-decoration: none; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

const chrome = findChrome();
if (!chrome) {
  console.error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
  process.exit(1);
}

const md = fs.readFileSync(MD_FILE, 'utf8');
const html = buildHtml(mdToHtml(md));
fs.mkdirSync(path.dirname(TMP_HTML), { recursive: true });
fs.writeFileSync(TMP_HTML, html);

execFileSync(chrome, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf-no-header',
  '--run-all-compositor-stages-before-draw',
  '--print-to-pdf=' + OUT_PDF,
  TMP_HTML,
], { stdio: 'inherit' });

console.log('PDF written to:', OUT_PDF);
