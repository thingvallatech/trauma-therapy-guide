/** Presentation changes keep the existing widget, including unsaved client input, alive. */
export function initSessionControls(): void {
  const rail = document.querySelector<HTMLElement>('[data-session-controls]');
  if (!rail) return;
  const start = rail.querySelector<HTMLButtonElement>('[data-session-start]')!;
  const stop = rail.querySelector<HTMLButtonElement>('[data-session-stop]')!;
  const mute = rail.querySelector<HTMLButtonElement>('[data-session-mute]')!;
  const exit = rail.querySelector<HTMLButtonElement>('[data-client-view-exit]')!;
  const presentation = document.querySelector<HTMLButtonElement>('[data-client-view-toggle]');
  const primary = document.querySelector<HTMLButtonElement>('[data-bls-toggle], [data-breath-toggle], [data-butterfly-widget] [data-toggle], [data-bls-tapping-widget] [data-toggle]');
  const sound = document.querySelector<HTMLInputElement>('[data-setting="soundOn"]');
  const running = () => /^(stop|detener)$/i.test(primary?.textContent?.trim() ?? '');
  const clientView = () => document.body.dataset.clientView === 'true';
  const sync = () => {
    const focused = document.activeElement;
    const ready = !document.querySelector('[data-activity-widget][inert]');
    const active = running();
    if (presentation) presentation.disabled = !ready;
    start.disabled = stop.disabled = mute.disabled = !ready;
    start.hidden = !primary || active;
    stop.hidden = !primary || !active;
    mute.hidden = !sound?.checked;
    exit.hidden = !clientView();
    rail.hidden = start.hidden && stop.hidden && mute.hidden && exit.hidden;
    document.body.classList.toggle('has-session-controls', !rail.hidden);
    if (focused === start && start.hidden && !stop.hidden) stop.focus({ preventScroll: true });
    else if (focused === stop && stop.hidden && !start.hidden) start.focus({ preventScroll: true });
    else if (focused === mute && mute.hidden) {
      const next = [stop, start, exit].find(button => !button.hidden) ?? document.querySelector<HTMLElement>('[data-activity-widget]');
      next?.focus({ preventScroll: true });
    }
  };
  start.addEventListener('click', () => { if (!running()) primary?.click(); sync(); });
  stop.addEventListener('click', () => { if (running()) primary?.click(); sync(); });
  mute.addEventListener('click', () => {
    if (sound?.checked) { sound.checked = false; sound.dispatchEvent(new Event('change', { bubbles: true })); }
    window.speechSynthesis?.cancel();
    sync();
  });
  let guideScroll = 0;
  const setPresentation = (enabled: boolean) => {
    if (enabled) guideScroll = window.scrollY;
    document.body.dataset.clientView = String(enabled);
    presentation?.setAttribute('aria-pressed', String(enabled));
    sync();
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new CustomEvent('tool-presentation-change', { detail: { enabled } }));
    if (enabled) {
      window.scrollTo(0, 0);
      (document.querySelector<HTMLElement>('[data-activity-widget]') ?? exit).focus({ preventScroll: true });
    } else {
      window.scrollTo(0, guideScroll);
      presentation?.focus({ preventScroll: true });
    }
  };
  presentation?.addEventListener('click', () => setPresentation(!clientView()));
  exit.addEventListener('click', () => setPresentation(false));
  // Escape belongs to the focused widget/dialog first. Dedicated activity pages
  // never navigate on Escape: navigation would discard the in-memory scene.
  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]') && clientView()) {
      setPresentation(false);
    }
  });
  if (primary) new MutationObserver(sync).observe(primary, { childList: true, characterData: true, subtree: true });
  document.addEventListener('change', sync);
  document.addEventListener('tool-preferences-changed', sync);
  document.addEventListener('activity-ready', sync);
  new ResizeObserver(() => { document.body.style.setProperty('--session-height', `${rail.getBoundingClientRect().height + 16}px`); }).observe(rail);
  sync();
  if (location.hash === '#activity' && presentation) setPresentation(true);
}
