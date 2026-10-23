#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyOf = (manufacturer, fixture, mode) => JSON.stringify([manufacturer, fixture, mode]);
const trimmedKey = key => JSON.stringify(JSON.parse(key).map(value => value.trim()));
const footprint = value => typeof value === 'number' ? value : value?.channels;
const displayName = (value, key) => typeof value === 'object' ? String(value.displayName || value.display_name || key).trim() : key;

// Record JSON value spans so only the changed mode value is rewritten.
// Reject duplicate properties rather than silently choosing the last value.
function jsonTree(text) {
  JSON.parse(text);
  let cursor = 0;
  const space = () => { while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++; };
  function string() {
    const start = cursor++;
    while (cursor < text.length) {
      if (text[cursor++] === '"') break;
      if (text[cursor - 1] === '\\') cursor++;
    }
    return JSON.parse(text.slice(start, cursor));
  }
  function value() {
    space(); const start = cursor, props = new Map(), items = [];
    if (text[cursor] === '{') {
      cursor++; space();
      while (text[cursor] !== '}') {
        const key = string(); space(); cursor++;
        if (props.has(key)) throw new Error(`Duplicate JSON property: ${key}`);
        props.set(key, value()); space();
        if (text[cursor] !== ',') break;
        cursor++; space();
      }
      cursor++;
    } else if (text[cursor] === '[') {
      cursor++; space();
      while (text[cursor] !== ']') {
        items.push(value()); space();
        if (text[cursor] !== ',') break;
        cursor++;
      }
      cursor++;
    } else if (text[cursor] === '"') string();
    else while (cursor < text.length && !/[\s,}\]]/.test(text[cursor])) cursor++;
    return { start, end: cursor, props, items, value: JSON.parse(text.slice(start, cursor)) };
  }
  return value();
}

export function readModeRows(values) {
  const rows = [], seen = new Set();
  let manufacturer = '', columns = null;
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [], next = values[i + 1] || [];
    if (row[0] && next[0] === 'Fixture Type' && next.includes('Internal Mode Name')) {
      manufacturer = String(row[0]); columns = null; continue;
    }
    if (row[0] === 'Fixture Type') {
      if (!manufacturer) throw new Error(`Missing manufacturer at row ${i + 1}`);
      const required = ['Fixture Type', 'Current Display Mode', 'Channel Count', 'Corrected Mode Name', 'Internal Mode Name'];
      if (required.some(name => row.filter(value => value === name).length !== 1)) throw new Error(`Invalid mode review headers at row ${i + 1}`);
      columns = Object.fromEntries(required.map(name => [name, row.indexOf(name)])); continue;
    }
    if (!manufacturer) continue;
    if (row.every(value => value == null || value === '')) continue;
    if (!columns) throw new Error(`Missing mode review headers at row ${i + 1}`);
    const cell = name => row[columns[name]];
    const fixture = cell('Fixture Type'), mode = cell('Internal Mode Name');
    if (typeof fixture !== 'string' || !fixture || typeof mode !== 'string' || !mode) throw new Error(`Missing fixture or internal mode identity at row ${i + 1}`);
    const key = keyOf(manufacturer, fixture, mode);
    if (seen.has(key)) throw new Error(`Duplicate workbook mode at row ${i + 1}: ${manufacturer} / ${fixture} / ${mode}`);
    seen.add(key);
    const correction = cell('Corrected Mode Name');
    if (correction != null && typeof correction !== 'string') throw new Error(`Corrected Mode Name must be text at row ${i + 1}`);
    const name = (correction || '').trim();
    if (/[\r\n\x00-\x1f]/.test(name)) throw new Error(`Corrected Mode Name must be single-line text at row ${i + 1}`);
    rows.push({ key, manufacturer, fixture, mode, channels: cell('Channel Count'), original: cell('Current Display Mode'), name, row: i + 1 });
  }
  if (!rows.length) throw new Error('No mode review rows found.');
  return rows;
}

export function planModeImport(files, values) {
  const rows = readModeRows(values), library = new Map();
  for (const file of files) {
    file.tree = jsonTree(file.text);
    const data = file.tree.value;
    for (const node of file.tree.props.get('fixtures')?.items || []) {
      const fixture = node.value;
      for (const [mode, modeNode] of node.props.get('modes')?.props || []) {
        const key = keyOf(data.manufacturer, fixture.fixture, mode);
        if (library.has(key)) throw new Error(`Duplicate library mode: ${key}`);
        library.set(key, { file, modeNode, value: modeNode.value });
      }
    }
  }
  const trimmed = new Map();
  for (const key of library.keys()) {
    const normalized = trimmedKey(key);
    if (!trimmed.has(normalized)) trimmed.set(normalized, []);
    trimmed.get(normalized).push(key);
  }
  const seen = new Set(), changes = [];
  for (const row of rows) {
    let resolvedKey = row.key;
    if (!library.has(resolvedKey)) {
      const matches = trimmed.get(trimmedKey(row.key)) || [];
      if (matches.length > 1) throw new Error(`Ambiguous whitespace-only identity at row ${row.row}: ${row.key}`);
      if (matches.length === 1) resolvedKey = matches[0];
    }
    const entry = library.get(resolvedKey);
    if (!entry) throw new Error(`Unmatched workbook mode at row ${row.row}: ${row.key}`);
    if (seen.has(resolvedKey)) throw new Error(`Duplicate resolved workbook mode at row ${row.row}: ${resolvedKey}`);
    seen.add(resolvedKey);
    const channels = footprint(entry.value);
    if (!Number.isFinite(channels) || Number(row.channels) !== channels || row.channels === '') throw new Error(`Channel count changed or invalid at row ${row.row}: ${row.key}`);
    if (!row.name) continue;
    const sourceMode = JSON.parse(resolvedKey)[2];
    const current = displayName(entry.value, sourceMode).trim();
    if (row.name === current) continue;
    if (row.original !== current) throw new Error(`Stale display name at row ${row.row}: ${row.key}. Refresh the review before importing.`);
    changes.push({ ...row, ...entry, previous: current });
  }
  const missing = [...library.keys()].filter(key => !seen.has(key));
  if (missing.length) throw new Error(`Library modes missing from workbook (${missing.length}):\n${missing.join('\n')}`);
  const outputs = [];
  for (const file of files) {
    const edits = changes.filter(change => change.file === file).map(change => {
      const { modeNode: node, value, name } = change;
      if (typeof value === 'number') return { start: node.start, end: node.end, text: JSON.stringify({ channels: value, displayName: name }) };
      const display = node.props.get('displayName');
      if (display) return { start: display.start, end: display.end, text: JSON.stringify(name) };
      return { start: node.end - 1, end: node.end - 1, text: `${node.props.size ? ',' : ''} "displayName": ${JSON.stringify(name)}` };
    });
    if (!edits.length) continue;
    let text = file.text;
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    JSON.parse(text);
    outputs.push({ path: file.path, original: file.text, text });
  }
  return { changes, outputs, reviewed: rows.length };
}

export async function applyModeImport(plan, dryRun = false) {
  // Check every source before the first write. Validation failures never partially import.
  for (const file of plan.outputs) if (await fs.readFile(file.path, 'utf8') !== file.original) throw new Error(`Source changed during import: ${file.path}`);
  if (dryRun) return;
  const written = [];
  try {
    for (const file of plan.outputs) {
      written.push(file);
      await fs.writeFile(file.path, file.text);
    }
  } catch (error) {
    for (const file of written.reverse()) await fs.writeFile(file.path, file.original);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.shift() !== 'import') throw new Error('Usage: node scripts/sync-fixture-modes.mjs import [--dry-run] [--root PATH] [--workbook PATH]');
  let root = defaultRoot, workbookPath = '', dryRun = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--dry-run') dryRun = true;
    else if (['--root', '--workbook'].includes(arg)) {
      const value = args.shift(); if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--root') root = path.resolve(value); else workbookPath = path.resolve(value);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  workbookPath ||= path.join(root, 'outputs/mode-name-review/Lampy Fixture Mode Names.xlsx');
  let artifact;
  try { artifact = await import('@oai/artifact-tool'); }
  catch {
    artifact = await import(pathToFileURL(process.env.OAI_ARTIFACT_TOOL || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
  }
  const workbook = await artifact.SpreadsheetFile.importXlsx(await artifact.FileBlob.load(workbookPath));
  const sheet = workbook.worksheets.getItem('Mode Name Review');
  const values = sheet.getUsedRange(true)?.values || [];
  // Cached formula results must not be mistaken for explicitly entered corrections/identities.
  if ((sheet.getUsedRange(true)?.formulas || []).some(row => row.some(Boolean))) throw new Error('Mode review must contain plain values, not formulas.');
  const directory = path.join(root, 'json/fixtures');
  const files = [];
  for (const name of (await fs.readdir(directory)).filter(name => name.endsWith('.json')).sort()) {
    const filePath = path.join(directory, name);
    files.push({ path: filePath, text: await fs.readFile(filePath, 'utf8') });
  }
  const plan = planModeImport(files, values);
  await applyModeImport(plan, dryRun);
  console.log(`Reviewed modes: ${plan.reviewed}. Display-name changes: ${plan.changes.length}.`);
  for (const change of plan.changes) console.log(`- ${change.manufacturer} / ${change.fixture} / ${change.mode}: ${JSON.stringify(change.previous)} -> ${JSON.stringify(change.name)}`);
  console.log(dryRun ? 'JSON files that would be updated:' : 'Updated JSON files:');
  if (!plan.outputs.length) console.log('None');
  for (const file of plan.outputs) console.log(path.relative(root, file.path));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
