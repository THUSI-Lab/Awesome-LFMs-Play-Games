import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterEntries,safeLink} from '../docs/catalog-tools.js';
const {entries} = JSON.parse(await readFile(new URL('../docs/data/catalog.json',import.meta.url)));

test('the October filter preserves all 32 uniquely curated additions',()=>{
  const filtered=filterEntries(entries,{updateOnly:true});
  assert.equal(filtered.length,32);
  assert.equal(new Set(filtered.map(entry=>entry.id)).size,32);
});
test('query, category, year, and source filters compose',()=>{
  const filtered=filterEntries(entries,{query:'Odysseus',category:'Model',year:'2026',updateOnly:true,focus:'player'});
  assert.equal(filtered.length,1);
  assert.equal(filtered[0].name,'Odysseus');
  assert.equal(filterEntries(entries,{query:'Odysseus',category:'Dataset'}).length,0);
});
test('supporting worlds remain discoverable without being classified as players',()=>{
  const filtered=filterEntries(entries,{query:'Matrix-Game 4.0',focus:'supporting environment'});
  assert.equal(filtered.length,1);
  assert.equal(filterEntries(entries,{query:'Matrix-Game 4.0',focus:'player'}).length,0);
});
test('filtering is case-insensitive and does not mutate the source',()=>{
  const ids=entries.map(entry=>entry.id);
  assert.deepEqual(filterEntries(entries,{query:'  AGENTICSTS  '}),filterEntries(entries,{query:'agenticsts'}));
  filterEntries(entries,{category:'Benchmark'});
  assert.deepEqual(entries.map(entry=>entry.id),ids);
});
test('untrusted link schemes cannot reach the rendered bibliography',()=>{
  assert.equal(safeLink('javascript:alert(1)'),null);
  assert.equal(safeLink('data:text/html,test'),null);
  assert.equal(safeLink('https://arxiv.org/abs/2605.00347'),'https://arxiv.org/abs/2605.00347');
});
