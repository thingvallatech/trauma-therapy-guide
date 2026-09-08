import { searchPages, type SearchPage } from './site-search';
const dialog = document.querySelector<HTMLDialogElement>('#search-modal');
if (dialog) {
  const pages: SearchPage[] = JSON.parse(dialog.dataset.pages ?? '[]');
  const input = dialog.querySelector<HTMLInputElement>('#search-input')!;
  const list = dialog.querySelector<HTMLUListElement>('#search-results')!;
  const status = dialog.querySelector<HTMLElement>('#search-status')!;
  const es = document.documentElement.lang === 'es';
  const hint = es ? 'Prueba «respiración», «evaluación inicial» o «guion de preparación».' : 'Try “breathing”, “intake” or “preparation script”.';
  const render = () => {
    list.replaceChildren();
    if (!input.value.trim()) { status.textContent = hint; return; }
    const all = searchPages(pages, input.value);
    status.textContent = all.length
      ? (es ? `${all.length} resultados. Mostrando ${Math.min(all.length, 12)}.` : `${all.length} results. Showing ${Math.min(all.length, 12)}.`)
      : (es ? 'No hay resultados. Prueba otra palabra o explora las actividades.' : 'No results. Try another word or browse activities.');
    for (const page of all.slice(0, 12)) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = page.url;
      link.className = 'search-result';
      const title = document.createElement('strong'); title.textContent = page.title;
      const description = document.createElement('span'); description.textContent = page.description;
      const section = document.createElement('small'); section.textContent = page.section;
      link.append(title, description, section); li.append(link); list.append(li);
    }
  };
  let opener: HTMLElement | null = null;
  function openSearch() {
    if (dialog!.open) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.value = ''; render(); dialog!.showModal(); input.focus();
  }
  dialog.addEventListener('close', () => opener?.focus());
  dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  input.addEventListener('input', render);
  dialog.addEventListener('keydown', event => {
    const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a'));
    if (event.key === 'Enter' && event.target === input && links[0]) { event.preventDefault(); links[0].click(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = event.key === 'ArrowDown' ? index + 1 : (index < 0 ? links.length - 1 : index - 1);
      event.preventDefault(); (links[next] ?? input).focus();
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); if (dialog.open) dialog.close(); else openSearch();
    }
  });
  (window as Window & { __openSearch?: () => void }).__openSearch = openSearch;
}
