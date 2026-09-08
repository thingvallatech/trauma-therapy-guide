import { describe, it, expect } from 'vitest';
import { searchPages } from '../src/scripts/site-search';
const pages = [
  { title: 'Respiración', description: 'Un ritmo cómodo.', keywords: 'ansiedad respirar', section: 'Actividades', url: '/es/tools/breath' },
  { title: 'Preparation scripts', description: 'Printable reference', section: 'Clinicians', url: '/clinicians/emdr/phase-2-scripts' },
];
describe('search for user language', () => {
  it('ignores accents and case', () => expect(searchPages(pages, ' RESPIRACION ')).toEqual([pages[0]]));
  it('matches task synonyms', () => expect(searchPages(pages, 'ansiedad')).toEqual([pages[0]]));
  it('matches multiple words across fields', () => expect(searchPages(pages, 'preparation printable')).toEqual([pages[1]]));
  it('requires all query words', () => expect(searchPages(pages, 'preparation respirar')).toEqual([]));
  it('does not treat punctuation as a regular expression', () => expect(searchPages(pages, '.*')).toEqual([]));
});
