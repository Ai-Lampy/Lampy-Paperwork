import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { planModeImport, applyModeImport, readModeRows } from '../scripts/sync-fixture-modes.mjs';

const original = {
  manufacturer: 'Maker', fixtures: [{ fixture: 'Fixture', shortName: 'F', watts: 200,
    modes: { 'Raw 1': 12, 'Raw 2': { channels: 24, displayName: 'Old display', parameters: 20, watts: 190 }, 'Raw 3': { channels: 30, parameters: 25 } },
    gdtf: { file: 'original.gdtf', modes: { 'Raw 1': { gdtfMode: 'Native 1', channels: 12 }, 'Raw 2': { gdtfMode: 'Native 2', channels: 24 } } }
  }]
};
const text = JSON.stringify(original, null, 2) + '\n';
const header = ['Fixture Type', 'Current Display Mode', 'Channel Count', 'Corrected Mode Name', 'Internal Mode Name'];
const values = [['Title'], [], ['Maker'], header,
  ['Fixture', 'Raw 1', 12, 'Compact "Mode"', 'Raw 1'],
  ['Fixture', 'Old display', 24, 'Extended', 'Raw 2'],
  ['Fixture', 'Raw 3', 30, '', 'Raw 3']];
const files = () => [{ path: '/test/library.json', text }];
const plan = planModeImport(files(), values);
assert.equal(plan.changes.length, 2);
const after = JSON.parse(plan.outputs[0].text);
assert.deepEqual(after.fixtures[0].modes['Raw 1'], { channels: 12, displayName: 'Compact "Mode"' });
assert.deepEqual(after.fixtures[0].modes['Raw 2'], { ...original.fixtures[0].modes['Raw 2'], displayName: 'Extended' });
assert.deepEqual(after.fixtures[0].gdtf, original.fixtures[0].gdtf);
assert.deepEqual(after.fixtures[0].modes['Raw 3'], original.fixtures[0].modes['Raw 3']);
assert.equal(after.fixtures[0].watts, 200);
assert.equal(plan.outputs[0].text, text.replace('"Raw 1": 12', '"Raw 1": {"channels":12,"displayName":"Compact \\"Mode\\""}').replace('"displayName": "Old display"', '"displayName": "Extended"'));
assert.equal(planModeImport([{path:'/test/library.json',text:plan.outputs[0].text}],values).changes.length,0);
const blank = structuredClone(values); blank[4][3]='  '; blank[5][3]='';
assert.equal(planModeImport(files(),blank).outputs.length,0);
const check = (edit, pattern) => { const input=structuredClone(values); edit(input); assert.throws(()=>planModeImport(files(),input),pattern); };
check(input=>input.push(input[4]), /Duplicate workbook/);
check(input=>input[4][4]='Unknown', /Unmatched workbook/);
check(input=>input[4][2]=13, /Channel count/);
check(input=>input[5][1]='Stale', /Stale display/);
check(input=>input.pop(), /missing from workbook/);
check(input=>input[4][3]=42, /must be text/);
check(input=>input[4][3]='Line\nBreak', /single-line/);
check(input=>input[3][4]='Renamed identity column', /headers|Missing manufacturer/);
assert.throws(()=>readModeRows([]), /No mode review/);
assert.throws(()=>planModeImport([...files(),...files()],values),/Duplicate library/);
assert.throws(()=>planModeImport([{path:'bad',text:text.replace('"Raw 1": 12','"Raw 1": 12, "Raw 1": 13')}],values),/Duplicate JSON/);
const add = structuredClone(values); add[6][3]='New name';
assert.deepEqual(JSON.parse(planModeImport(files(),add).outputs[0].text).fixtures[0].modes['Raw 3'],{channels:30,parameters:25,displayName:'New name'});
// Duplicate displayed labels are safe: identities still use the internal keys.
const same = structuredClone(values); same[4][3]='Same'; same[5][3]='Same';
assert.equal(planModeImport(files(),same).changes.length,2);
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lampy-mode-test-'));
const spaced = structuredClone(original);
spaced.fixtures[0].fixture = ' Fixture ';
spaced.fixtures[0].modes['Raw 1 '] = spaced.fixtures[0].modes['Raw 1'];
delete spaced.fixtures[0].modes['Raw 1'];
const spacedPlan = planModeImport([{path:'/test/spaces.json',text:JSON.stringify(spaced)}],values);
const spacedResult = JSON.parse(spacedPlan.outputs[0].text);
assert.equal(spacedResult.fixtures[0].fixture,' Fixture ');
assert.equal(spacedResult.fixtures[0].modes['Raw 1 '].displayName,'Compact "Mode"');
assert.deepEqual(spacedResult.fixtures[0].gdtf,original.fixtures[0].gdtf);
const duplicateAlias = structuredClone(values); duplicateAlias.push(['Fixture ','Raw 1',12,'','Raw 1 ']);
assert.throws(()=>planModeImport([{path:'/test/spaces.json',text:JSON.stringify(spaced)}],duplicateAlias),/Duplicate resolved/);
spaced.fixtures[0].modes[' Raw 1'] = 12;
assert.throws(()=>planModeImport([{path:'/test/spaces.json',text:JSON.stringify(spaced)}],values),/Ambiguous whitespace/);
try {
  const file=path.join(dir,'fixture.json'); await fs.writeFile(file,text);
  const local=planModeImport([{path:file,text}],values);
  await applyModeImport(local,true); assert.equal(await fs.readFile(file,'utf8'),text);
  await applyModeImport(local); assert.equal(await fs.readFile(file,'utf8'),local.outputs[0].text);
  await assert.rejects(()=>applyModeImport(local),/Source changed/);
} finally { await fs.rm(dir,{recursive:true,force:true}); }
console.log('PASS: mode-name workflow matching, corrections, no-ops, idempotence, dry-run, stale/invalid rejection, channel/GDTF preservation and narrow JSON edits.');
