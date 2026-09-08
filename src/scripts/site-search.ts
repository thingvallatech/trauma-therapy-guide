export interface SearchPage { title: string; url: string; description: string; section: string; keywords?: string }
export const normalizeSearch = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Match every word, but allow the words to span the title, summary and synonyms. */
export function searchPages(pages: SearchPage[], query: string): SearchPage[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const words = q.split(/\s+/);
  return pages.map((page, position) => {
    const title = normalizeSearch(page.title);
    const summary = normalizeSearch(`${page.description} ${page.keywords ?? ''}`);
    const all = `${title} ${summary} ${normalizeSearch(page.section)}`;
    if (!words.every(word => all.includes(word))) return { page, score: -1, position };
    const score = (title === q ? 100 : title.includes(q) ? 40 : 0)
      + words.reduce((n, word) => n + (title.includes(word) ? 10 : summary.includes(word) ? 3 : 0), 0);
    return { page, score, position };
  }).filter(item => item.score >= 0).sort((a, b) => b.score - a.score || a.position - b.position).map(item => item.page);
}
