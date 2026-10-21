import {initTransferLab} from './transfer-lab.js';
import {filterEntries, safeLink} from './catalog-tools.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('.menu-toggle').addEventListener('click', () => {
  const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('#main-nav').classList.toggle('open', open);
});
$$('#main-nav a').forEach(link => link.addEventListener('click', () => {
  $('.menu-toggle').setAttribute('aria-expanded','false'); $('#main-nav').classList.remove('open');
}));
document.addEventListener('keydown', event => { if(event.key === 'Escape') { $('.menu-toggle').setAttribute('aria-expanded','false'); $('#main-nav').classList.remove('open'); } });

initTransferLab($('#transfer-lab'));

let fullCitation = $('#citation-text').textContent;
fetch('data/survey.bib').then(response => { if(!response.ok) throw Error('Citation unavailable'); return response.text(); }).then(text => {
  fullCitation = text.trim(); $('#citation-text').textContent = fullCitation;
}).catch(() => {});
$('#copy-citation').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(fullCitation); $('#copy-status').textContent = 'Citation copied.'; }
  catch { $('#copy-status').textContent = 'Select the citation text to copy, or download the BibTeX file.'; }
});

let catalog = [], shown = 12, debounce;
const state = {category:'All', query:'', year:'all', updateOnly:false, focus:'all'};
function readUrl() {
  const params = new URLSearchParams(location.search);
  state.category = ['All','Dataset','Model','Harness','Benchmark','Survey'].includes(params.get('pillar')) ? params.get('pillar') : 'All';
  state.query = params.get('q') || '';
  state.year = [...$('#year-filter').options].some(option => option.value === params.get('year')) ? params.get('year') : 'all';
  state.updateOnly = params.get('source') === 'update';
  state.focus = ['player','supporting environment','survey'].includes(params.get('focus')) ? params.get('focus') : 'all';
}
function syncControls() {
  $('#paper-search').value = state.query; $('#year-filter').value = state.year;
  $('#update-only').checked = state.updateOnly; $('#focus-filter').value = state.focus;
  $$('.category-filters button').forEach(button => { const active = button.dataset.category === state.category; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
}
function syncUrl() {
  const url = new URL(location.href);
  for(const key of ['pillar','q','year','source','focus']) url.searchParams.delete(key);
  if(state.category !== 'All') url.searchParams.set('pillar',state.category);
  if(state.query.trim()) url.searchParams.set('q',state.query.trim());
  if(state.year !== 'all') url.searchParams.set('year',state.year);
  if(state.updateOnly) url.searchParams.set('source','update');
  if(state.focus !== 'all') url.searchParams.set('focus',state.focus);
  history.replaceState(null,'',url);
}
function renderEntry(entry) {
  const links = entry.links.filter(link => safeLink(link.url));
  const primary = links.find(link => /paper|report|source/i.test(link.label)) || links[0];
  const title = escapeHtml(entry.title);
  const url = primary ? escapeHtml(safeLink(primary.url)) : '';
  const description = entry.summary || entry.keywords.join(' · ');
  const resourceLinks = links.filter(link => link !== primary);
  return `<article class="paper-row"><div class="paper-year">${escapeHtml(entry.date?.slice(0,4) || '—')}</div><div class="paper-body"><div class="paper-heading"><h3>${url ? `<a href="${url}">${title}</a>` : title}</h3>${url ? `<a class="paper-arrow" href="${url}" aria-label="Open ${title}">↗</a>` : ''}</div><p class="paper-summary">${escapeHtml(description)}</p><div class="paper-bottom"><span class="paper-venue">${escapeHtml(entry.venue)}</span>${entry.categories.map(category => `<span class="paper-tag">${escapeHtml(category)}</span>`).join('')}${entry.focus === 'supporting environment' ? '<span class="paper-tag environment">Supporting environment</span>' : ''}${entry.source === 'update' ? '<span class="paper-tag update">October addition</span>' : ''}<span class="paper-links">${resourceLinks.map(link => `<a href="${escapeHtml(safeLink(link.url))}">${escapeHtml(link.label)}</a>`).join('')}</span></div>${entry.release_status ? `<details class="paper-availability"><summary>Resource availability</summary><p>${escapeHtml(entry.release_status)}</p></details>` : ''}</div></article>`;
}
function renderCatalog(updateUrl = true) {
  const filtered = filterEntries(catalog,state);
  $('#paper-list').innerHTML = filtered.length ? filtered.slice(0,shown).map(renderEntry).join('') : '<div class="paper-empty"><h3>No matching works.</h3><p>Try another keyword or reset the filters.</p></div>';
  $('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'work' : 'works'}${filtered.length > shown ? ` · showing ${shown}` : ''}`;
  $('#load-more').hidden = filtered.length <= shown;
  $('#load-more').textContent = `Show ${Math.min(12,filtered.length-shown)} more works ↓`;
  syncControls(); if(updateUrl) syncUrl();
}
function changeFilter(key,value) { state[key] = value; shown = 12; renderCatalog(); }
$$('.category-filters button').forEach(button => button.addEventListener('click',() => changeFilter('category',button.dataset.category)));
$('#paper-search').addEventListener('input',event => { clearTimeout(debounce); state.query = event.target.value; debounce = setTimeout(() => { shown=12; renderCatalog(); },150); });
$('#year-filter').addEventListener('change',event => changeFilter('year',event.target.value));
$('#focus-filter').addEventListener('change',event => changeFilter('focus',event.target.value));
$('#update-only').addEventListener('change',event => changeFilter('updateOnly',event.target.checked));
$('#clear-filters').addEventListener('click',() => { clearTimeout(debounce); Object.assign(state,{category:'All',query:'',year:'all',updateOnly:false,focus:'all'}); shown=12; renderCatalog(); });
$('#load-more').addEventListener('click',() => {
  const previousShown = shown; shown += 12; renderCatalog();
  const firstNew = $$('.paper-row')[previousShown];
  if(firstNew) { const focusTarget=firstNew.querySelector('h3 a') || firstNew; if(focusTarget===firstNew) focusTarget.tabIndex=-1; focusTarget.focus({preventScroll:true}); }
});
$$('[data-library-category]').forEach(link => link.addEventListener('click',event => changeFilter('category',event.currentTarget.dataset.libraryCategory)));
$$('[data-update-link]').forEach(link => link.addEventListener('click',() => { Object.assign(state,{category:'All',query:'',year:'all',updateOnly:true,focus:'all'}); shown=12; renderCatalog(); }));
window.addEventListener('popstate',() => { readUrl(); shown=12; renderCatalog(false); });
fetch('data/catalog.json').then(response => { if(!response.ok) throw Error('Catalog unavailable'); return response.json(); }).then(data => {
  catalog = data.entries;
  $('#catalog-total').textContent = String(catalog.length);
  $$('[data-count]').forEach(element => { const category=element.dataset.count; element.textContent=String(category==='All' ? catalog.length : catalog.filter(entry => entry.categories.includes(category)).length); });
  const years=[...new Set(catalog.map(entry => entry.date?.slice(0,4)).filter(Boolean))].sort().reverse();
  years.forEach(year => $('#year-filter').add(new Option(year,year)));
  readUrl(); renderCatalog(false);
}).catch(error => {
  console.error('Could not load the literature catalog.',error);
  $('#result-count').textContent='The interactive catalog could not load.';
  $('#paper-list').innerHTML='<div class="paper-empty"><h3>The reading list is still available.</h3><p><a class="text-link" href="https://github.com/THUSI-Lab/Awesome-LFMs-Play-Games">Open the complete GitHub collection ↗</a></p></div>';
});
