/** Expose controls only after their own widget has attached its event handlers. */
export function markActivityReady(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(widget => {
    const surface = widget.closest<HTMLElement>('[data-activity-surface]');
    if (!surface) return;
    const activity = surface.querySelector<HTMLElement>('[data-activity-widget]');
    activity?.removeAttribute('inert');
    const loading = surface.querySelector<HTMLElement>('[data-activity-loading]');
    const restoreFocus = loading?.contains(document.activeElement);
    if (loading) loading.hidden = true;
    if (restoreFocus) requestAnimationFrame(() => {
      // WebKit needs a layout turn after removing inert before it accepts focus.
      // Do not interrupt someone who moved to another control in the meantime.
      if (document.activeElement === document.body || loading?.contains(document.activeElement)) {
        activity?.focus({ preventScroll: true });
      }
    });
    document.dispatchEvent(new Event('activity-ready'));
  });
}
