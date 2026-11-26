#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptPath), "..");

function usage() {
  return [
    "Usage:",
    "  node scripts/sync-fixture-short-names.mjs export [--root PATH] [--workbook PATH]",
    "  node scripts/sync-fixture-short-names.mjs import [--root PATH] [--workbook PATH] [--dry-run]",
  ].join("\n");
}

function parseArgs(argv) {
  const command = argv[0];
  if (!['export', 'import'].includes(command)) throw new Error(usage());
  const options = { command, root: defaultRoot, workbook: '', dryRun: false };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--root') options.root = path.resolve(argv[++index] || '');
    else if (arg === '--workbook') options.workbook = path.resolve(argv[++index] || '');
    else throw new Error(`Unknown option: ${arg}\n${usage()}`);
  }
  if (!options.workbook) options.workbook = path.join(options.root, 'outputs', 'fixture-short-names', 'Lampy Fixture Short Names.xlsx');
  return options;
}

function canonical(value) {
  return String(value || '').trim().toLocaleLowerCase('en-GB');
}

function fixtureKey(manufacturer, fixture) {
  return `${canonical(manufacturer)}\u0000${canonical(fixture)}`;
}

async function loadArtifactTool() {
  try {
    return await import('@oai/artifact-tool');
  } catch (firstError) {
    const candidates = [
      process.env.OAI_ARTIFACT_TOOL,
      path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', '@oai', 'artifact-tool', 'dist', 'artifact_tool.mjs'),
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return await import(pathToFileURL(candidate).href);
      } catch {}
    }
    throw new Error(`@oai/artifact-tool is required for fixture-name workbook synchronisation.\n${firstError.message}`);
  }
}

async function loadFixtureLibrary(root) {
  const directory = path.join(root, 'json', 'fixtures');
  const files = (await fs.readdir(directory)).filter(name => name.endsWith('.json')).sort();
  const manufacturers = [];
  const byKey = new Map();
  const duplicates = [];
  for (const fileName of files) {
    const filePath = path.join(directory, fileName);
    const text = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(text);
    const manufacturer = String(data.manufacturer || path.basename(fileName, '.json')).trim();
    const fixtures = (Array.isArray(data.fixtures) ? data.fixtures : []).map(item => ({
      name: String(item.fixture || '').trim(),
      shortName: String(item.shortName ?? item.fixture ?? '').trim(),
    })).filter(item => item.name).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }));
    for (const fixture of fixtures) {
      const key = fixtureKey(manufacturer, fixture.name);
      if (byKey.has(key)) duplicates.push(`${manufacturer} / ${fixture.name}`);
      byKey.set(key, { ...fixture, manufacturer, fileName, filePath });
    }
    manufacturers.push({ manufacturer, fixtures, fileName, filePath });
  }
  if (duplicates.length) throw new Error(`Duplicate JSON fixtures:\n- ${duplicates.join('\n- ')}`);
  manufacturers.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer, 'en', { sensitivity: 'base' }));
  return { manufacturers, byKey };
}

async function workbookExists(workbookPath) {
  try { await fs.access(workbookPath); return true; } catch { return false; }
}

async function readWorkbookEntries(workbookPath, artifactTool) {
  if (!await workbookExists(workbookPath)) return { byKey: new Map(), rows: [] };
  const { FileBlob, SpreadsheetFile } = artifactTool;
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
  const sheet = workbook.worksheets.getItem('Fixture Short Names');
  const values = sheet.getUsedRange(true)?.values || [];
  const byKey = new Map();
  const rows = [];
  const duplicates = [];
  let manufacturer = '';
  for (let index = 0; index < values.length; index += 1) {
    const first = String(values[index]?.[0] ?? '').trim();
    const second = String(values[index]?.[1] ?? '').trim();
    const nextFirst = String(values[index + 1]?.[0] ?? '').trim();
    const nextSecond = String(values[index + 1]?.[1] ?? '').trim();
    if (first && !second && nextFirst === 'Fixture Name' && nextSecond === 'Short Name') {
      manufacturer = first;
      continue;
    }
    if (!manufacturer || !first || first === 'Fixture Name') continue;
    const entry = { manufacturer, fixture: first, shortName: second, row: index + 1 };
    const key = fixtureKey(manufacturer, first);
    if (byKey.has(key)) duplicates.push(`${manufacturer} / ${first} (rows ${byKey.get(key).row} and ${entry.row})`);
    byKey.set(key, entry);
    rows.push(entry);
  }
  if (duplicates.length) throw new Error(`Duplicate workbook fixtures:\n- ${duplicates.join('\n- ')}`);
  return { byKey, rows };
}

async function buildWorkbook(library, existingEntries, workbookPath, artifactTool) {
  const { SpreadsheetFile, Workbook } = artifactTool;
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add('Fixture Short Names');
  sheet.showGridLines = false;
  sheet.tabColor = '#1F4E78';
  const rows = [
    ['', ''],
    ['Lampy Fixture Short Names', ''],
    ['Edit the yellow Short Name cells. Manufacturer sections match the fixture library JSON files.', ''],
    [`${library.manufacturers.length} manufacturers`, `${library.byKey.size} fixtures`],
    ['', ''],
  ];
  const sections = [];
  let added = 0;
  let preservedEdits = 0;
  for (const item of library.manufacturers) {
    const manufacturerRow = rows.length + 1;
    rows.push([item.manufacturer, '']);
    const headerRow = rows.length + 1;
    rows.push(['Fixture Name', 'Short Name']);
    const dataStartRow = rows.length + 1;
    for (const fixture of item.fixtures) {
      const jsonEntry = library.byKey.get(fixtureKey(item.manufacturer, fixture.name));
      const workbookEntry = existingEntries.byKey.get(fixtureKey(item.manufacturer, fixture.name));
      if (!workbookEntry) added += 1;
      else if (workbookEntry.shortName !== jsonEntry.shortName) preservedEdits += 1;
      rows.push([fixture.name, workbookEntry ? workbookEntry.shortName : jsonEntry.shortName]);
    }
    const dataEndRow = rows.length;
    rows.push(['', '']);
    sections.push({ manufacturerRow, headerRow, dataStartRow, dataEndRow, count: item.fixtures.length });
  }
  sheet.getRangeByIndexes(0, 0, rows.length, 2).values = rows;
  const usedRange = sheet.getRangeByIndexes(0, 0, rows.length, 2);
  usedRange.format.font = { name: 'Arial', size: 10, color: '#111111' };
  usedRange.format.verticalAlignment = 'center';
  usedRange.format.wrapText = false;
  sheet.getRange('A2:B2').format = { font: { name: 'Arial', size: 16, bold: true, color: '#1F1F1F' }, rowHeight: 26 };
  sheet.getRange('A3:B3').format = { font: { name: 'Arial', size: 10, italic: true, color: '#595959' }, rowHeight: 22 };
  sheet.getRange('A4:B4').format = { fill: '#E9EFF7', font: { name: 'Arial', size: 10, bold: true, color: '#1F4E78' }, borders: { preset: 'outside', style: 'thin', color: '#9FBAD0' }, rowHeight: 22 };
  for (const section of sections) {
    sheet.getRange(`A${section.manufacturerRow}:B${section.manufacturerRow}`).format = { fill: '#1F4E78', font: { name: 'Arial', size: 12, bold: true, color: '#FFFFFF' }, borders: { preset: 'outside', style: 'medium', color: '#1F4E78' }, rowHeight: 24 };
    sheet.getRange(`A${section.headerRow}:B${section.headerRow}`).format = { fill: '#7F8C99', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', borders: { preset: 'all', style: 'thin', color: '#FFFFFF' }, rowHeight: 22 };
    if (!section.count) continue;
    sheet.getRange(`A${section.dataStartRow}:A${section.dataEndRow}`).format = { fill: '#FFFFFF', font: { name: 'Arial', size: 10, color: '#111111' }, borders: { insideHorizontal: { style: 'thin', color: '#D9E1E8' }, bottom: { style: 'thin', color: '#9FBAD0' }, left: { style: 'thin', color: '#9FBAD0' } }, rowHeight: 20 };
    sheet.getRange(`B${section.dataStartRow}:B${section.dataEndRow}`).format = { fill: '#FFF2CC', font: { name: 'Arial', size: 10, color: '#111111' }, borders: { insideHorizontal: { style: 'thin', color: '#D9E1E8' }, bottom: { style: 'thin', color: '#9FBAD0' }, right: { style: 'thin', color: '#9FBAD0' } }, rowHeight: 20 };
  }
  sheet.getRange(`A1:A${rows.length}`).format.columnWidth = 48;
  sheet.getRange(`B1:B${rows.length}`).format.columnWidth = 36;
  sheet.freezePanes.freezeRows(5);
  workbook.recalculate();
  await fs.mkdir(path.dirname(workbookPath), { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(workbookPath);
  return { added, preservedEdits, manufacturers: library.manufacturers.length, fixtures: library.byKey.size };
}

function fixtureObjectSpans(text) {
  const match = /"fixtures"\s*:\s*\[/.exec(text);
  if (!match) throw new Error('JSON file has no fixtures array.');
  const arrayStart = text.indexOf('[', match.index);
  const spans = [];
  let inString = false, escaped = false, braceDepth = 0, objectStart = -1;
  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') {
      if (braceDepth === 0) objectStart = index;
      braceDepth += 1;
    } else if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0 && objectStart >= 0) {
        spans.push({ start: objectStart, end: index + 1 });
        objectStart = -1;
      }
    } else if (char === ']' && braceDepth === 0) break;
  }
  return spans;
}

function stringEnd(text, start) {
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) escaped = false;
    else if (char === '\\') escaped = true;
    else if (char === '"') return index + 1;
  }
  throw new Error('Unterminated JSON string.');
}

function replaceTopLevelStringProperty(objectText, property, value) {
  let depth = 0, inString = false, escaped = false;
  for (let index = 0; index < objectText.length; index += 1) {
    const char = objectText[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '{' || char === '[') { depth += 1; continue; }
    if (char === '}' || char === ']') { depth -= 1; continue; }
    if (char !== '"' || depth !== 1) continue;
    const nameEnd = stringEnd(objectText, index);
    const name = JSON.parse(objectText.slice(index, nameEnd));
    let cursor = nameEnd;
    while (/\s/.test(objectText[cursor])) cursor += 1;
    if (objectText[cursor] !== ':') { index = nameEnd - 1; continue; }
    cursor += 1;
    while (/\s/.test(objectText[cursor])) cursor += 1;
    if (name === property) {
      if (objectText[cursor] !== '"') throw new Error(`${property} is not a JSON string.`);
      const valueEnd = stringEnd(objectText, cursor);
      return objectText.slice(0, cursor) + JSON.stringify(value) + objectText.slice(valueEnd);
    }
    index = nameEnd - 1;
  }
  throw new Error(`Fixture object has no top-level ${property} property.`);
}

function patchJsonShortNames(text, manufacturer, updates) {
  const replacements = [];
  for (const span of fixtureObjectSpans(text)) {
    const objectText = text.slice(span.start, span.end);
    const fixture = JSON.parse(objectText);
    const key = fixtureKey(manufacturer, fixture.fixture);
    if (!updates.has(key)) continue;
    replacements.push({ start: span.start, end: span.end, value: replaceTopLevelStringProperty(objectText, 'shortName', updates.get(key)) });
  }
  let output = text;
  replacements.sort((a, b) => b.start - a.start).forEach(item => { output = output.slice(0, item.start) + item.value + output.slice(item.end); });
  return output;
}

async function exportWorkbook(options, artifactTool) {
  const library = await loadFixtureLibrary(options.root);
  const existingEntries = await readWorkbookEntries(options.workbook, artifactTool);
  const result = await buildWorkbook(library, existingEntries, options.workbook, artifactTool);
  console.log(`Updated workbook: ${options.workbook}`);
  console.log(`Manufacturers: ${result.manufacturers}`);
  console.log(`Fixtures: ${result.fixtures}`);
  console.log(`New workbook rows: ${result.added}`);
  console.log(`Preserved edited short names: ${result.preservedEdits}`);
}

async function importWorkbook(options, artifactTool) {
  if (!await workbookExists(options.workbook)) throw new Error(`Workbook not found: ${options.workbook}`);
  const library = await loadFixtureLibrary(options.root);
  const workbookEntries = await readWorkbookEntries(options.workbook, artifactTool);
  const unmatched = workbookEntries.rows.filter(entry => !library.byKey.has(fixtureKey(entry.manufacturer, entry.fixture)));
  const missing = [...library.byKey.entries()].filter(([key]) => !workbookEntries.byKey.has(key)).map(([, entry]) => `${entry.manufacturer} / ${entry.name}`);
  if (unmatched.length || missing.length) {
    const messages = [];
    if (unmatched.length) messages.push(`Workbook rows with no JSON match:\n- ${unmatched.map(item => `${item.manufacturer} / ${item.fixture} (row ${item.row})`).join('\n- ')}`);
    if (missing.length) messages.push(`JSON fixtures missing from workbook:\n- ${missing.join('\n- ')}`);
    throw new Error(`${messages.join('\n\n')}\n\nRun the export command to synchronise the workbook before importing names.`);
  }
  const changes = [];
  for (const [key, entry] of library.byKey) {
    const workbookEntry = workbookEntries.byKey.get(key);
    if (workbookEntry.shortName !== entry.shortName) changes.push({ key, ...entry, newShortName: workbookEntry.shortName, oldShortName: entry.shortName });
  }
  if (!changes.length) {
    console.log('No fixture short-name changes found.');
    console.log('Updated JSON files: none');
    return;
  }
  const byFile = new Map();
  changes.forEach(change => {
    if (!byFile.has(change.filePath)) byFile.set(change.filePath, []);
    byFile.get(change.filePath).push(change);
  });
  console.log(`Fixture short-name changes: ${changes.length}`);
  changes.forEach(change => console.log(`- ${change.manufacturer} / ${change.name}: ${JSON.stringify(change.oldShortName)} -> ${JSON.stringify(change.newShortName)}`));
  if (!options.dryRun) {
    for (const [filePath, fileChanges] of byFile) {
      const text = await fs.readFile(filePath, 'utf8');
      const manufacturer = fileChanges[0].manufacturer;
      const updates = new Map(fileChanges.map(change => [change.key, change.newShortName]));
      const updated = patchJsonShortNames(text, manufacturer, updates);
      JSON.parse(updated);
      await fs.writeFile(filePath, updated);
    }
  }
  console.log(options.dryRun ? 'JSON files that would be updated:' : 'Updated JSON files:');
  [...byFile.keys()].sort().forEach(filePath => console.log(`- ${path.relative(options.root, filePath)}`));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const artifactTool = await loadArtifactTool();
  if (options.command === 'export') await exportWorkbook(options, artifactTool);
  else await importWorkbook(options, artifactTool);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
