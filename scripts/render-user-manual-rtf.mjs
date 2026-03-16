import fs from 'node:fs';
import path from 'node:path';

const inputPath = path.resolve('docs/USER_MANUAL.md');
const outputPath = path.resolve('docs/USER_MANUAL.rtf');

function escapeInlineRtf(text) {
  return text.replace(/[\\{}]/g, '\\$&');
}

function stripInlineMarkdown(text) {
  return (
    text
      // inline code
      .replace(/`([^`]+)`/g, '$1')
      // bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
  );
}

function toRtfLine(text) {
  return escapeInlineRtf(stripInlineMarkdown(text));
}

const md = fs.readFileSync(inputPath, 'utf8');
const lines = md.split(/\r?\n/);

const out = [];
out.push('{\\rtf1\\ansi\\deff0');
out.push('{\\fonttbl{\\f0 Calibri;}}');
out.push('\\viewkind4\\uc1');
out.push('\\fs22'); // 11pt default

for (const rawLine of lines) {
  const line = rawLine ?? '';

  if (line.startsWith('# ')) {
    out.push(`\\pard\\sa240\\sb240\\fs40\\b ${toRtfLine(line.slice(2).trim())}\\b0\\fs22\\par`);
    continue;
  }
  if (line.startsWith('## ')) {
    out.push(`\\pard\\sa200\\sb200\\fs32\\b ${toRtfLine(line.slice(3).trim())}\\b0\\fs22\\par`);
    continue;
  }
  if (line.startsWith('### ')) {
    out.push(`\\pard\\sa160\\sb160\\fs26\\b ${toRtfLine(line.slice(4).trim())}\\b0\\fs22\\par`);
    continue;
  }

  if (line.trim() === '') {
    out.push('\\par');
    continue;
  }

  if (line.startsWith('> ')) {
    out.push(`\\pard\\li360\\sa120\\i ${toRtfLine(line.slice(2).trim())}\\i0\\par`);
    continue;
  }

  if (line.startsWith('- ')) {
    out.push(
      `\\pard\\fi-360\\li720\\sa120\\tx720\\bullet ${toRtfLine(line.slice(2).trim())}\\par`
    );
    continue;
  }

  const numbered = line.match(/^(\d+)\.\s+(.*)$/);
  if (numbered) {
    out.push(`\\pard\\fi-360\\li720\\sa120 ${numbered[1]}. ${toRtfLine(numbered[2])}\\par`);
    continue;
  }

  out.push(`\\pard\\sa120 ${toRtfLine(line)}\\par`);
}

out.push('}');

fs.writeFileSync(outputPath, out.join('\n'), 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);

