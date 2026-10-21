/** Combine literature filters without mutating the canonical catalog. */
export function filterEntries(entries, state = {}) {
  const terms = (state.query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    if (state.category && state.category !== 'All' && !entry.categories.includes(state.category)) return false;
    if (state.year && state.year !== 'all' && entry.date?.slice(0, 4) !== state.year) return false;
    if (state.updateOnly && entry.source !== 'update') return false;
    if (state.focus && state.focus !== 'all' && entry.focus !== state.focus) return false;
    const search = (entry.search_text || [entry.title, entry.name, entry.summary, ...(entry.keywords || [])].filter(Boolean).join(' ')).toLowerCase();
    return terms.every(term => search.includes(term));
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
}

export function safeLink(url) {
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
}
